import mongoose from 'mongoose';
import Product, { IProduct } from '../infra/product.model';
import Category from '@/modules/categories/infra/category.model';
import Media from '@/modules/media/infra/media.model';
import ProductType from '../infra/product-type.model';
import ProductVariant from '../infra/product-variant.model';
import { ProductTypeService } from './product-type.service';
import { CreateProductInput, UpdateProductInput, QueryProductInput } from '../validation/product.schema';
import { slugify } from '@/core/utils/slug';
import { connectDB } from '@/core/db/connect';

export class ProductService {
  /**
   * Tạo slug duy nhất cho sản phẩm
   */
  private static async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(name) || 'san-pham';
    let slug = baseSlug;
    let count = 1;

    while (true) {
      const query: any = { slug };
      if (excludeId) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
      }
      const existing = await Product.findOne(query).select('_id');
      if (!existing) {
        return slug;
      }
      slug = `${baseSlug}-${count}`;
      count++;
    }
  }

  /**
   * Cập nhật đếm số lượng sản phẩm trên các danh mục liên quan
   */
  private static async recalculateCategoryCounts(categoryIds: mongoose.Types.ObjectId[]) {
    if (!categoryIds || categoryIds.length === 0) return;
    for (const catId of categoryIds) {
      const count = await Product.countDocuments({ categories: catId, status: { $ne: 'archived' } });
      await Category.findByIdAndUpdate(catId, { productCount: count });
    }
  }

  /**
   * Cập nhật đếm số lượng sử dụng của các tệp media
   */
  private static async recalculateMediaCounts(mediaIds: mongoose.Types.ObjectId[]) {
    if (!mediaIds || mediaIds.length === 0) return;
    for (const mId of mediaIds) {
      const count = await Product.countDocuments({
        $or: [{ thumbnail: mId }, { images: mId }],
      });
      await Media.findByIdAndUpdate(mId, { productCount: count });
    }
  }

  /**
   * Lấy danh sách sản phẩm có tìm kiếm, bộ lọc, sắp xếp và phân trang
   */
  static async list(params: QueryProductInput) {
    await connectDB();
    const { page, limit, search, category, status, sortBy, sortOrder } = params;

    const query: any = {};

    // Bộ lọc trạng thái
    if (status && status !== 'all') {
      query.status = status;
    }

    // Bộ lọc danh mục
    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        const catObjId = new mongoose.Types.ObjectId(category);
        // Lấy cả danh mục con của danh mục này
        const childCats = await Category.find({ ancestors: catObjId }).select('_id');
        const allCatIds = [catObjId, ...childCats.map((c) => c._id)];
        query.categories = { $in: allCatIds };
      }
    }

    // Tìm kiếm từ khóa (tên, mã SKU, tags)
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const regex = new RegExp(cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { name: regex },
        { sku: regex },
        { tags: regex },
      ];
    }

    const sortOption: any = {};
    sortOption[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Product.find(query)
        .populate('thumbnail', '_id fileName driveFileId thumbnailUrl driveWebViewLink')
        .populate('categories', '_id name slug')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
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
   * Lấy chi tiết sản phẩm theo ID
   */
  static async getById(id: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    return Product.findById(id)
      .populate('thumbnail', '_id fileName driveFileId thumbnailUrl driveWebViewLink')
      .populate('images', '_id fileName driveFileId thumbnailUrl driveWebViewLink')
      .populate('categories', '_id name slug')
      .populate('productTypeId');
  }

  /**
   * Lấy chi tiết sản phẩm theo Slug
   */
  static async getBySlug(slug: string) {
    await connectDB();
    return Product.findOne({ slug })
      .populate('thumbnail', '_id fileName driveFileId thumbnailUrl driveWebViewLink')
      .populate('images', '_id fileName driveFileId thumbnailUrl driveWebViewLink')
      .populate('categories', '_id name slug')
      .populate('productTypeId');
  }

  /**
   * Tạo sản phẩm mới
   */
  static async create(input: CreateProductInput, userId?: string) {
    await connectDB();

    const slug = input.slug
      ? await this.generateUniqueSlug(input.slug)
      : await this.generateUniqueSlug(input.name);

    // Kiểm tra SKU duy nhất nếu có
    if (input.sku && input.sku.trim()) {
      const existingSku = await Product.findOne({ sku: input.sku.trim().toUpperCase() });
      if (existingSku) {
        throw new Error(`Mã SKU "${input.sku.toUpperCase()}" đã được sử dụng bởi sản phẩm khác.`);
      }
    }

    // Xác thực thuộc tính động theo ProductType nếu có
    let productTypeDoc = null;
    if (input.productTypeId) {
      productTypeDoc = await ProductType.findById(input.productTypeId);
      if (!productTypeDoc) {
        throw new Error('Loại sản phẩm không tồn tại.');
      }
      ProductTypeService.validateAttributes(productTypeDoc, input.attributes || []);
    }

    const categoryObjIds = (input.categories || []).map((id) => new mongoose.Types.ObjectId(id));
    const thumbnailObjId = input.thumbnail ? new mongoose.Types.ObjectId(input.thumbnail) : null;
    const imagesObjIds = (input.images || []).map((id) => new mongoose.Types.ObjectId(id));
    const pTypeObjId = input.productTypeId ? new mongoose.Types.ObjectId(input.productTypeId) : null;

    const product = new Product({
      name: input.name.trim(),
      slug,
      sku: input.sku?.trim() ? input.sku.trim().toUpperCase() : undefined,
      shortDescription: input.shortDescription?.trim() || '',
      description: input.description?.trim() || '',
      productTypeId: pTypeObjId,
      attributes: input.attributes || [],
      hasVariants: false,
      variantCount: 0,
      status: input.status || 'draft',
      categories: categoryObjIds,
      thumbnail: thumbnailObjId,
      images: imagesObjIds,
      price: input.price ?? 0,
      originalPrice: input.originalPrice ?? 0,
      tags: input.tags || [],
      dataVersion: 1,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await product.save();

    // Cập nhật thống kê
    if (pTypeObjId) {
      await ProductType.findByIdAndUpdate(pTypeObjId, { $inc: { productCount: 1 } });
    }

    await Promise.all([
      this.recalculateCategoryCounts(categoryObjIds),
      this.recalculateMediaCounts([thumbnailObjId, ...imagesObjIds].filter(Boolean) as mongoose.Types.ObjectId[]),
    ]);

    return product;
  }

  /**
   * Cập nhật sản phẩm với Optimistic Concurrency Control (dataVersion)
   */
  static async update(id: string, input: UpdateProductInput, userId?: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('ID sản phẩm không hợp lệ.');
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new Error('Không tìm thấy sản phẩm để cập nhật.');
    }

    // 1. Kiểm tra Optimistic Concurrency Control
    if (product.dataVersion !== input.dataVersion) {
      throw new Error(
        `Xung đột dữ liệu: Sản phẩm đã được chỉnh sửa bởi phiên làm việc khác (Phiên bản hệ thống: ${product.dataVersion}, phiên bản hiện tại của bạn: ${input.dataVersion}). Vui lòng tải lại dữ liệu trước khi lưu tiếp.`
      );
    }

    // 2. Slug
    if (input.slug && input.slug !== product.slug) {
      product.slug = await this.generateUniqueSlug(input.slug, id);
    } else if (input.name && input.name !== product.name && !product.slug) {
      product.slug = await this.generateUniqueSlug(input.name, id);
    }

    // 3. SKU
    if (input.sku !== undefined) {
      const cleanSku = input.sku?.trim() ? input.sku.trim().toUpperCase() : undefined;
      if (cleanSku && cleanSku !== product.sku) {
        const existingSku = await Product.findOne({ sku: cleanSku, _id: { $ne: product._id } });
        if (existingSku) {
          throw new Error(`Mã SKU "${cleanSku}" đã được sử dụng bởi sản phẩm khác.`);
        }
      }
      product.sku = cleanSku;
    }

    const oldCategories = [...product.categories];
    const oldMedia = [product.thumbnail, ...product.images].filter(Boolean) as mongoose.Types.ObjectId[];

    // 4. Cập nhật các trường
    if (input.name !== undefined) product.name = input.name.trim();
    if (input.shortDescription !== undefined) product.shortDescription = input.shortDescription?.trim() || '';
    if (input.description !== undefined) product.description = input.description?.trim() || '';
    if (input.status !== undefined) product.status = input.status;
    if (input.price !== undefined) product.price = input.price;
    if (input.originalPrice !== undefined) product.originalPrice = input.originalPrice;
    if (input.tags !== undefined) product.tags = input.tags;

    // Cập nhật ProductType & Dynamic Attributes
    const oldPTypeId = product.productTypeId ? product.productTypeId.toString() : null;
    const newPTypeId = input.productTypeId !== undefined ? (input.productTypeId || null) : oldPTypeId;

    if (newPTypeId) {
      const pTypeDoc = await ProductType.findById(newPTypeId);
      if (!pTypeDoc) throw new Error('Loại sản phẩm không tồn tại.');
      const attrsToValidate = input.attributes !== undefined ? input.attributes : product.attributes;
      ProductTypeService.validateAttributes(pTypeDoc, attrsToValidate || []);
    }

    if (input.productTypeId !== undefined) {
      product.productTypeId = input.productTypeId ? new mongoose.Types.ObjectId(input.productTypeId) : null;
    }
    if (input.attributes !== undefined) {
      product.attributes = input.attributes;
    }

    if (newPTypeId !== oldPTypeId) {
      if (oldPTypeId) await ProductType.findByIdAndUpdate(oldPTypeId, { $inc: { productCount: -1 } });
      if (newPTypeId) await ProductType.findByIdAndUpdate(newPTypeId, { $inc: { productCount: 1 } });
    }

    if (input.categories !== undefined) {
      product.categories = input.categories.map((c) => new mongoose.Types.ObjectId(c));
    }
    if (input.thumbnail !== undefined) {
      product.thumbnail = input.thumbnail ? new mongoose.Types.ObjectId(input.thumbnail) : null;
    }
    if (input.images !== undefined) {
      product.images = input.images.map((img) => new mongoose.Types.ObjectId(img));
    }

    // Tăng phiên bản dữ liệu
    product.dataVersion = product.dataVersion + 1;
    if (userId) product.updatedBy = new mongoose.Types.ObjectId(userId);

    await product.save();

    // Cập nhật thống kê
    const allCategories = Array.from(new Set([...oldCategories, ...product.categories]));
    const newMedia = [product.thumbnail, ...product.images].filter(Boolean) as mongoose.Types.ObjectId[];
    const allMedia = Array.from(new Set([...oldMedia, ...newMedia]));

    await Promise.all([
      this.recalculateCategoryCounts(allCategories),
      this.recalculateMediaCounts(allMedia),
    ]);

    return product;
  }

  /**
   * Lưu trữ (Archive) sản phẩm
   */
  static async archive(id: string, userId?: string) {
    await connectDB();
    const product = await Product.findById(id);
    if (!product) throw new Error('Không tìm thấy sản phẩm.');

    product.status = 'archived';
    product.dataVersion = product.dataVersion + 1;
    if (userId) product.updatedBy = new mongoose.Types.ObjectId(userId);
    await product.save();

    await this.recalculateCategoryCounts(product.categories);
    return product;
  }

  /**
   * Khôi phục (Restore) sản phẩm từ trạng thái lưu trữ
   */
  static async restore(id: string, userId?: string) {
    await connectDB();
    const product = await Product.findById(id);
    if (!product) throw new Error('Không tìm thấy sản phẩm.');

    product.status = 'draft';
    product.dataVersion = product.dataVersion + 1;
    if (userId) product.updatedBy = new mongoose.Types.ObjectId(userId);
    await product.save();

    await this.recalculateCategoryCounts(product.categories);
    return product;
  }

  /**
   * Xóa vĩnh viễn sản phẩm và các biến thể liên quan
   */
  static async delete(id: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('ID không hợp lệ.');

    const product = await Product.findById(id);
    if (!product) throw new Error('Không tìm thấy sản phẩm để xóa.');

    const categories = [...product.categories];
    const media = [product.thumbnail, ...product.images].filter(Boolean) as mongoose.Types.ObjectId[];
    const pTypeId = product.productTypeId;

    // Xóa tất cả biến thể của sản phẩm này
    await ProductVariant.deleteMany({ productId: product._id });
    await Product.findByIdAndDelete(id);

    if (pTypeId) {
      await ProductType.findByIdAndUpdate(pTypeId, { $inc: { productCount: -1 } });
    }

    await Promise.all([
      this.recalculateCategoryCounts(categories),
      this.recalculateMediaCounts(media),
    ]);

    return true;
  }

  /**
   * Nhân bản (Duplicate) sản phẩm và các biến thể của nó
   */
  static async duplicate(id: string, userId?: string) {
    await connectDB();
    const original = await Product.findById(id);
    if (!original) throw new Error('Không tìm thấy sản phẩm nguồn để nhân bản.');

    const newName = `${original.name} (Bản sao)`;
    const newSlug = await this.generateUniqueSlug(newName);
    const newSku = original.sku ? `${original.sku}-COPY-${Date.now().toString().slice(-4)}` : undefined;

    const copy = new Product({
      name: newName,
      slug: newSlug,
      sku: newSku,
      shortDescription: original.shortDescription,
      description: original.description,
      productTypeId: original.productTypeId,
      attributes: original.attributes,
      hasVariants: original.hasVariants,
      variantCount: original.variantCount,
      status: 'draft',
      categories: original.categories,
      thumbnail: original.thumbnail,
      images: original.images,
      price: original.price,
      originalPrice: original.originalPrice,
      tags: original.tags,
      dataVersion: 1,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await copy.save();

    if (original.productTypeId) {
      await ProductType.findByIdAndUpdate(original.productTypeId, { $inc: { productCount: 1 } });
    }

    // Nhân bản các biến thể nếu có
    const originalVariants = await ProductVariant.find({ productId: original._id });
    for (const v of originalVariants) {
      const vCopy = new ProductVariant({
        productId: copy._id,
        name: `${v.name}`,
        sku: v.sku ? `${v.sku}-COPY-${Date.now().toString().slice(-4)}` : undefined,
        price: v.price,
        originalPrice: v.originalPrice,
        thumbnail: v.thumbnail,
        attributes: v.attributes,
        status: v.status,
        dataVersion: 1,
        createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      });
      await vCopy.save();
    }

    await Promise.all([
      this.recalculateCategoryCounts(copy.categories),
      this.recalculateMediaCounts([copy.thumbnail, ...copy.images].filter(Boolean) as mongoose.Types.ObjectId[]),
    ]);

    return copy;
  }
}
