import mongoose from 'mongoose';
import ProductType, { IProductType, IFieldDefinition } from '../infra/product-type.model';
import Product from '../infra/product.model';
import { CreateProductTypeInput, UpdateProductTypeInput } from '../validation/product-type.schema';
import { slugify } from '@/core/utils/slug';
import { connectDB } from '@/core/db/connect';

export class ProductTypeService {
  /**
   * Tạo slug duy nhất cho loại sản phẩm
   */
  private static async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(name) || 'loai-san-pham';
    let slug = baseSlug;
    let count = 1;

    while (true) {
      const query: any = { slug };
      if (excludeId) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
      }
      const existing = await ProductType.findOne(query).select('_id');
      if (!existing) {
        return slug;
      }
      slug = `${baseSlug}-${count}`;
      count++;
    }
  }

  /**
   * Lấy danh sách loại sản phẩm
   */
  static async list(status?: 'active' | 'archived' | 'all') {
    await connectDB();
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    return ProductType.find(query).sort({ createdAt: -1 }).lean();
  }

  /**
   * Lấy chi tiết loại sản phẩm theo ID
   */
  static async getById(id: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return ProductType.findById(id);
  }

  /**
   * Lấy chi tiết loại sản phẩm theo Slug
   */
  static async getBySlug(slug: string) {
    await connectDB();
    return ProductType.findOne({ slug });
  }

  /**
   * Tạo mới loại sản phẩm
   */
  static async create(input: CreateProductTypeInput, userId?: string) {
    await connectDB();

    // 1. Kiểm tra tính duy nhất của keys trong danh sách fields
    const keys = (input.fields || []).map((f) => f.key.toLowerCase());
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      throw new Error('Các khóa trường (field keys) trong một loại sản phẩm không được trùng lặp.');
    }

    // 2. Kiểm tra variantAttributes phải nằm trong fields
    for (const vKey of input.variantAttributes || []) {
      if (!keys.includes(vKey.toLowerCase())) {
        throw new Error(`Thuộc tính biến thể "${vKey}" phải được định nghĩa trong danh sách trường.`);
      }
    }

    const slug = input.slug
      ? await this.generateUniqueSlug(input.slug)
      : await this.generateUniqueSlug(input.name);

    const productType = new ProductType({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || '',
      fields: (input.fields || []).map((f, idx) => ({
        ...f,
        key: f.key.trim().toLowerCase(),
        order: f.order ?? idx,
      })),
      variantAttributes: (input.variantAttributes || []).map((k) => k.trim().toLowerCase()),
      status: input.status || 'active',
      productCount: 0,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await productType.save();
    return productType;
  }

  /**
   * Cập nhật loại sản phẩm (Bảo vệ tính toàn vẹn của field keys)
   */
  static async update(id: string, input: UpdateProductTypeInput, userId?: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('ID không hợp lệ.');

    const productType = await ProductType.findById(id);
    if (!productType) throw new Error('Không tìm thấy loại sản phẩm.');

    // Kiểm tra slug
    if (input.slug && input.slug !== productType.slug) {
      productType.slug = await this.generateUniqueSlug(input.slug, id);
    } else if (input.name && input.name !== productType.name && !productType.slug) {
      productType.slug = await this.generateUniqueSlug(input.name, id);
    }

    if (input.name !== undefined) productType.name = input.name.trim();
    if (input.description !== undefined) productType.description = input.description?.trim() || '';
    if (input.status !== undefined) productType.status = input.status;

    // Cập nhật fields nếu có
    if (input.fields !== undefined) {
      const newKeys = input.fields.map((f) => f.key.toLowerCase());
      const uniqueKeys = new Set(newKeys);
      if (uniqueKeys.size !== newKeys.length) {
        throw new Error('Các khóa trường (field keys) không được trùng lặp.');
      }

      // Kiểm tra bất biến: Cảnh báo nếu xóa trường đang có sản phẩm sử dụng
      const oldKeys = productType.fields.map((f: IFieldDefinition) => f.key);
      const removedKeys = oldKeys.filter((k: string) => !newKeys.includes(k));

      if (removedKeys.length > 0) {
        const usageCount = await Product.countDocuments({
          productTypeId: productType._id,
          'attributes.key': { $in: removedKeys },
        });

        if (usageCount > 0) {
          throw new Error(
            `Không thể xóa các trường [${removedKeys.join(', ')}] vì đang có ${usageCount} sản phẩm chứa dữ liệu thuộc tính này.`
          );
        }
      }

      productType.fields = input.fields.map((f, idx) => ({
        ...f,
        key: f.key.trim().toLowerCase(),
        order: f.order ?? idx,
      }));
    }

    if (input.variantAttributes !== undefined) {
      const availableKeys = productType.fields.map((f: IFieldDefinition) => f.key);
      for (const vKey of input.variantAttributes) {
        if (!availableKeys.includes(vKey.toLowerCase())) {
          throw new Error(`Thuộc tính biến thể "${vKey}" không tồn tại trong danh sách trường.`);
        }
      }
      productType.variantAttributes = input.variantAttributes.map((k) => k.trim().toLowerCase());
    }

    if (userId) productType.updatedBy = new mongoose.Types.ObjectId(userId);
    await productType.save();
    return productType;
  }

  /**
   * Xóa loại sản phẩm (Bảo vệ: Chặn xóa nếu có sản phẩm đang dùng)
   */
  static async delete(id: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('ID không hợp lệ.');

    const count = await Product.countDocuments({ productTypeId: new mongoose.Types.ObjectId(id) });
    if (count > 0) {
      throw new Error(`Không thể xóa loại sản phẩm vì đang có ${count} sản phẩm thuộc loại này.`);
    }

    await ProductType.findByIdAndDelete(id);
    return true;
  }

  /**
   * Xác thực thuộc tính động của sản phẩm theo định nghĩa trường
   */
  static validateAttributes(productType: IProductType, attributes: Array<{ key: string; value: any }>) {
    const attrMap = new Map<string, any>();
    for (const a of attributes) {
      attrMap.set(a.key.toLowerCase(), a.value);
    }

    for (const field of productType.fields) {
      const val = attrMap.get(field.key.toLowerCase());

      // Kiểm tra trường bắt buộc
      if (field.required && (val === undefined || val === null || val === '')) {
        throw new Error(`Trường "${field.label}" là bắt buộc.`);
      }

      if (val !== undefined && val !== null && val !== '') {
        // Kiểm tra kiểu số
        if (field.type === 'number') {
          const num = Number(val);
          if (isNaN(num)) {
            throw new Error(`Trường "${field.label}" phải là một chữ số hợp lệ.`);
          }
          if (field.validation?.min !== undefined && num < field.validation.min) {
            throw new Error(`Trường "${field.label}" không được nhỏ hơn ${field.validation.min}.`);
          }
          if (field.validation?.max !== undefined && num > field.validation.max) {
            throw new Error(`Trường "${field.label}" không được lớn hơn ${field.validation.max}.`);
          }
        }

        // Kiểm tra tùy chọn select
        if (field.type === 'single_select' && field.options && field.options.length > 0) {
          if (!field.options.includes(String(val))) {
            throw new Error(`Giá trị của "${field.label}" phải nằm trong các tùy chọn: [${field.options.join(', ')}].`);
          }
        }

        // Kiểm tra tùy chọn multi_select
        if (field.type === 'multi_select' && field.options && field.options.length > 0) {
          const arr = Array.isArray(val) ? val : [val];
          for (const item of arr) {
            if (!field.options.includes(String(item))) {
              throw new Error(`Giá trị "${item}" không hợp lệ cho trường "${field.label}".`);
            }
          }
        }
      }
    }
    return true;
  }
}
