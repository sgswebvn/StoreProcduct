import mongoose from 'mongoose';
import ProductVariant, { IProductVariant, IVariantAttribute } from '../infra/product-variant.model';
import Product from '../infra/product.model';
import { CreateProductVariantInput, UpdateProductVariantInput } from '../validation/product-variant.schema';
import { connectDB } from '@/core/db/connect';

export class ProductVariantService {
  /**
   * Tạo chuỗi chữ ký đại diện cho tổ hợp thuộc tính để kiểm tra trùng lặp
   */
  private static getAttributesSignature(attributes: IVariantAttribute[]): string {
    return attributes
      .slice()
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((a) => `${a.key.toLowerCase()}:${String(a.value).trim().toLowerCase()}`)
      .join('|');
  }

  /**
   * Lấy danh sách biến thể của một sản phẩm
   */
  static async listByProduct(productId: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(productId)) return [];

    return ProductVariant.find({ productId: new mongoose.Types.ObjectId(productId) })
      .populate('thumbnail', '_id fileName driveFileId thumbnailUrl driveWebViewLink')
      .sort({ createdAt: 1 })
      .lean();
  }

  /**
   * Lấy chi tiết một biến thể
   */
  static async getById(variantId: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(variantId)) return null;

    return ProductVariant.findById(variantId)
      .populate('thumbnail', '_id fileName driveFileId thumbnailUrl driveWebViewLink');
  }

  /**
   * Tạo mới biến thể sản phẩm (Kiểm tra duy nhất tổ hợp thuộc tính)
   */
  static async create(productId: string, input: CreateProductVariantInput, userId?: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('ID sản phẩm không hợp lệ.');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Không tìm thấy sản phẩm nguồn để tạo biến thể.');
    }

    // 1. Kiểm tra mã SKU duy nhất nếu có
    if (input.sku && input.sku.trim()) {
      const cleanSku = input.sku.trim().toUpperCase();
      const existingSku = await ProductVariant.findOne({ sku: cleanSku });
      if (existingSku) {
        throw new Error(`Mã SKU biến thể "${cleanSku}" đã được sử dụng.`);
      }
    }

    // 2. Kiểm tra trùng lặp tổ hợp thuộc tính với các biến thể khác của sản phẩm
    const newSignature = this.getAttributesSignature(input.attributes);
    const existingVariants = await ProductVariant.find({ productId: product._id });

    for (const v of existingVariants) {
      if (this.getAttributesSignature(v.attributes) === newSignature) {
        throw new Error(
          `Tổ hợp thuộc tính này đã tồn tại ở biến thể "${v.name}". Mỗi biến thể phải có tổ hợp giá trị riêng biệt.`
        );
      }
    }

    const variant = new ProductVariant({
      productId: product._id,
      name: input.name.trim(),
      sku: input.sku?.trim() ? input.sku.trim().toUpperCase() : undefined,
      price: input.price ?? 0,
      originalPrice: input.originalPrice ?? 0,
      thumbnail: input.thumbnail ? new mongoose.Types.ObjectId(input.thumbnail) : null,
      attributes: input.attributes,
      status: input.status || 'active',
      dataVersion: 1,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await variant.save();

    // Cập nhật trạng thái biến thể trên Product cha
    const count = await ProductVariant.countDocuments({ productId: product._id });
    await Product.findByIdAndUpdate(product._id, {
      hasVariants: true,
      variantCount: count,
    });

    return variant;
  }

  /**
   * Cập nhật biến thể sản phẩm (Kiểm soát optimistic locking và tổ hợp thuộc tính)
   */
  static async update(variantId: string, input: UpdateProductVariantInput, userId?: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(variantId)) throw new Error('ID biến thể không hợp lệ.');

    const variant = await ProductVariant.findById(variantId);
    if (!variant) throw new Error('Không tìm thấy biến thể để cập nhật.');

    // Optimistic Concurrency Control
    if (variant.dataVersion !== input.dataVersion) {
      throw new Error(
        `Biến thể đã bị chỉnh sửa bởi phiên làm việc khác (Phiên bản hệ thống: ${variant.dataVersion}, của bạn: ${input.dataVersion}).`
      );
    }

    // Kiểm tra SKU duy nhất
    if (input.sku !== undefined) {
      const cleanSku = input.sku?.trim() ? input.sku.trim().toUpperCase() : undefined;
      if (cleanSku && cleanSku !== variant.sku) {
        const existingSku = await ProductVariant.findOne({
          sku: cleanSku,
          _id: { $ne: variant._id },
        });
        if (existingSku) {
          throw new Error(`Mã SKU biến thể "${cleanSku}" đã được sử dụng.`);
        }
      }
      variant.sku = cleanSku;
    }

    // Kiểm tra trùng lặp tổ hợp thuộc tính nếu thay đổi
    if (input.attributes !== undefined) {
      const newSignature = this.getAttributesSignature(input.attributes);
      const existingVariants = await ProductVariant.find({
        productId: variant.productId,
        _id: { $ne: variant._id },
      });

      for (const v of existingVariants) {
        if (this.getAttributesSignature(v.attributes) === newSignature) {
          throw new Error(
            `Tổ hợp thuộc tính này trùng với biến thể "${v.name}". Mỗi biến thể phải có tổ hợp thuộc tính riêng biệt.`
          );
        }
      }
      variant.attributes = input.attributes;
    }

    if (input.name !== undefined) variant.name = input.name.trim();
    if (input.price !== undefined) variant.price = input.price;
    if (input.originalPrice !== undefined) variant.originalPrice = input.originalPrice;
    if (input.status !== undefined) variant.status = input.status;
    if (input.thumbnail !== undefined) {
      variant.thumbnail = input.thumbnail ? new mongoose.Types.ObjectId(input.thumbnail) : null;
    }

    variant.dataVersion = variant.dataVersion + 1;
    if (userId) variant.updatedBy = new mongoose.Types.ObjectId(userId);

    await variant.save();
    return variant;
  }

  /**
   * Xóa biến thể
   */
  static async delete(variantId: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(variantId)) throw new Error('ID biến thể không hợp lệ.');

    const variant = await ProductVariant.findById(variantId);
    if (!variant) throw new Error('Không tìm thấy biến thể.');

    const productId = variant.productId;
    await ProductVariant.findByIdAndDelete(variantId);

    const remainingCount = await ProductVariant.countDocuments({ productId });
    await Product.findByIdAndUpdate(productId, {
      hasVariants: remainingCount > 0,
      variantCount: remainingCount,
    });

    return true;
  }
}
