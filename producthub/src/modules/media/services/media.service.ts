import mongoose from 'mongoose';
import { connectDB } from '@/core/db/connect';
import Media, { IMedia } from '../infra/media.model';
import Product from '@/modules/products/infra/product.model';
import Category from '@/modules/categories/infra/category.model';
import { GoogleDriveService } from '@/modules/integrations/services/google-drive.service';
import { validateImageMagicBytes } from '@/core/utils/magic-bytes';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export class MediaService {
  private driveStorage = new GoogleDriveService();

  /**
   * Tải ảnh lên Google Drive và lưu metadata vào MongoDB Atlas.
   */
  async uploadMedia(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    uploadedById?: string
  ): Promise<IMedia> {
    const normalizedMime = mimeType.toLowerCase();

    // 1. Validate loại file MIME
    if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
      throw new Error(
        `Loại file không được hỗ trợ (${mimeType}). Chỉ chấp nhận: JPG, PNG, WEBP, GIF, SVG.`
      );
    }

    // 2. Validate dung lượng
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error('Dung lượng file vượt quá giới hạn cho phép (tối đa 15MB).');
    }

    // 3. Validate Magic Bytes (Chữ ký nội dung nhị phân thực tế của file)
    if (!validateImageMagicBytes(buffer, normalizedMime)) {
      throw new Error(`Nội dung tệp không khớp với chữ ký định dạng ${mimeType} (Magic bytes mismatch).`);
    }

    // 4. Chuẩn hóa tên file an toàn
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_');

    // 5. Tải lên Google Drive
    const uploadResult = await this.driveStorage.upload(
      buffer,
      sanitizedFileName,
      normalizedMime
    );

    // 6. Lưu metadata vào MongoDB
    await connectDB();
    const mediaDoc = await Media.create({
      fileName: sanitizedFileName,
      mimeType: normalizedMime,
      size: buffer.length,
      driveFileId: uploadResult.fileId,
      driveWebViewLink: uploadResult.webViewLink,
      thumbnailUrl: uploadResult.thumbnailUrl,
      storageProvider: 'google_drive',
      uploadedBy: uploadedById ? new mongoose.Types.ObjectId(uploadedById) : undefined,
      status: 'active',
      alt: sanitizedFileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
      title: sanitizedFileName,
      productCount: 0,
    });

    return mediaDoc;
  }

  /**
   * Lấy chi tiết một media theo ID
   */
  async getById(id: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Media.findById(id).lean();
  }

  /**
   * Cập nhật thông tin mô tả metadata của ảnh (alt text, tiêu đề, tên file)
   */
  async updateMedia(
    id: string,
    data: { alt?: string; title?: string; fileName?: string }
  ) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('ID ảnh không hợp lệ.');

    const mediaDoc = await Media.findById(id);
    if (!mediaDoc) throw new Error('Không tìm thấy ảnh.');

    if (data.alt !== undefined) mediaDoc.alt = data.alt.trim();
    if (data.title !== undefined) mediaDoc.title = data.title.trim();
    if (data.fileName !== undefined && data.fileName.trim()) {
      mediaDoc.fileName = data.fileName.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    await mediaDoc.save();
    return mediaDoc;
  }

  /**
   * Lấy danh sách sản phẩm và danh mục đang sử dụng ảnh này
   */
  async getMediaUsage(id: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { products: [], categories: [] };
    }

    const mediaObjId = new mongoose.Types.ObjectId(id);

    const [products, categories] = await Promise.all([
      Product.find({
        $or: [{ thumbnail: mediaObjId }, { images: mediaObjId }],
      })
        .select('_id name slug sku price thumbnail')
        .lean(),
      Category.find({ image: mediaObjId })
        .select('_id name slug')
        .lean(),
    ]);

    return {
      products,
      categories,
      productCount: products.length,
      categoryCount: categories.length,
      inUse: products.length > 0 || categories.length > 0,
    };
  }

  /**
   * Lấy danh sách media có phân trang, tìm kiếm và bộ lọc tệp mồ côi (orphaned)
   */
  async listMedia(params: {
    page?: number;
    limit?: number;
    search?: string;
    usage?: 'all' | 'used' | 'orphaned';
  }) {
    await connectDB();
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: any = { status: 'active' };

    // Lọc theo mục đích sử dụng
    if (params.usage === 'used') {
      filter.productCount = { $gt: 0 };
    } else if (params.usage === 'orphaned') {
      filter.productCount = 0;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      filter.$or = [
        { fileName: { $regex: q, $options: 'i' } },
        { title: { $regex: q, $options: 'i' } },
        { alt: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Media.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Media.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Xóa ảnh với tùy chọn xóa trên Drive hay chỉ gỡ khỏi StoreProduct.
   */
  async deleteMedia(id: string, deleteFromDrive: boolean = false) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('ID ảnh không hợp lệ.');

    const mediaDoc = await Media.findById(id);
    if (!mediaDoc) {
      throw new Error('Ảnh không tồn tại hoặc đã bị xóa.');
    }

    // Kiểm tra trực tiếp nơi sử dụng trong CSDL để đảm bảo an toàn tuyệt đối
    const usage = await this.getMediaUsage(id);
    if (usage.inUse) {
      throw new Error(
        `Không thể xóa vì ảnh này đang được liên kết với ${usage.productCount} sản phẩm và ${usage.categoryCount} danh mục. Hãy gỡ ảnh khỏi các đối tượng trước.`
      );
    }

    let driveDeleted = false;
    if (deleteFromDrive && mediaDoc.driveFileId) {
      try {
        await this.driveStorage.delete(mediaDoc.driveFileId);
        driveDeleted = true;
      } catch (err) {
        console.error('[MediaService] Delete from Drive warning:', err);
      }
    }

    await Media.findByIdAndDelete(id);

    return {
      success: true,
      deletedFromDrive: driveDeleted,
    };
  }

  /**
   * Xóa hàng loạt tệp media mồ côi (chưa sử dụng)
   */
  async bulkDeleteOrphaned(ids: string[], deleteFromDrive: boolean = false) {
    await connectDB();
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) return { deletedCount: 0 };

    let deletedCount = 0;
    for (const idStr of validIds) {
      const usage = await this.getMediaUsage(idStr);
      // Chỉ xóa nếu thực sự không có sản phẩm hoặc danh mục nào sử dụng
      if (!usage.inUse) {
        const doc = await Media.findById(idStr);
        if (doc) {
          if (deleteFromDrive && doc.driveFileId) {
            try {
              await this.driveStorage.delete(doc.driveFileId);
            } catch (err) {
              console.error(`[MediaService] Error deleting file ${doc.driveFileId} from Drive:`, err);
            }
          }
          await Media.findByIdAndDelete(doc._id);
          deletedCount++;
        }
      }
    }

    return { deletedCount };
  }
}
