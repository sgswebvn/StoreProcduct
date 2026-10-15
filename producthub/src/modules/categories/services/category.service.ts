import mongoose from 'mongoose';
import Category, { ICategory } from '../infra/category.model';
import { CreateCategoryInput, UpdateCategoryInput } from '../validation/category.schema';
import { slugify } from '@/core/utils/slug';
import { connectDB } from '@/core/db/connect';
import Product from '@/modules/products/infra/product.model';

export interface CategoryTreeNode {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  order: number;
  status: 'active' | 'inactive';
  image?: any;
  productCount: number;
  children: CategoryTreeNode[];
  createdAt: Date;
  updatedAt: Date;
}

export class CategoryService {
  /**
   * Tạo slug duy nhất cho danh mục
   */
  private static async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(name) || 'danh-muc';
    let slug = baseSlug;
    let count = 1;

    while (true) {
      const query: any = { slug };
      if (excludeId) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
      }
      const existing = await Category.findOne(query).select('_id');
      if (!existing) {
        return slug;
      }
      slug = `${baseSlug}-${count}`;
      count++;
    }
  }

  /**
   * Lấy cây danh mục phân cấp
   */
  static async getTree(statusFilter?: 'active' | 'inactive'): Promise<CategoryTreeNode[]> {
    await connectDB();
    const query: any = {};
    if (statusFilter) {
      query.status = statusFilter;
    }

    const categories = await Category.find(query)
      .populate('image', '_id fileName driveFileId thumbnailUrl')
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const categoryMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    // Khởi tạo map
    for (const cat of categories) {
      const node: CategoryTreeNode = {
        _id: cat._id.toString(),
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        parentId: cat.parentId ? cat.parentId.toString() : null,
        order: cat.order || 0,
        status: cat.status,
        image: cat.image,
        productCount: cat.productCount || 0,
        children: [],
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      };
      categoryMap.set(node._id, node);
    }

    // Xây dựng cây
    for (const cat of categories) {
      const catId = cat._id.toString();
      const node = categoryMap.get(catId)!;
      if (cat.parentId) {
        const parentId = cat.parentId.toString();
        const parent = categoryMap.get(parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * Lấy danh sách danh mục phẳng kèm độ sâu cấp bậc (level)
   */
  static async listFlat(statusFilter?: 'active' | 'inactive'): Promise<Array<any>> {
    const tree = await this.getTree(statusFilter);
    const result: Array<any> = [];

    function traverse(nodes: CategoryTreeNode[], level: number, prefix: string = '') {
      for (const node of nodes) {
        result.push({
          ...node,
          level,
          displayName: `${'— '.repeat(level)}${node.name}`,
        });
        if (node.children && node.children.length > 0) {
          traverse(node.children, level + 1, `${prefix}${node.name} > `);
        }
      }
    }

    traverse(tree, 0);
    return result;
  }

  /**
   * Lấy chi tiết danh mục theo ID
   */
  static async getById(id: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    return Category.findById(id)
      .populate('image', '_id fileName driveFileId thumbnailUrl')
      .populate('parentId', '_id name slug');
  }

  /**
   * Tạo danh mục mới
   */
  static async create(input: CreateCategoryInput, userId?: string) {
    await connectDB();

    const slug = input.slug
      ? await this.generateUniqueSlug(input.slug)
      : await this.generateUniqueSlug(input.name);

    let ancestors: mongoose.Types.ObjectId[] = [];

    if (input.parentId) {
      if (!mongoose.Types.ObjectId.isValid(input.parentId)) {
        throw new Error('ID danh mục cha không hợp lệ.');
      }
      const parent = await Category.findById(input.parentId);
      if (!parent) {
        throw new Error('Danh mục cha không tồn tại.');
      }
      ancestors = [...parent.ancestors, parent._id];
    }

    const category = new Category({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || '',
      parentId: input.parentId ? new mongoose.Types.ObjectId(input.parentId) : null,
      ancestors,
      order: input.order ?? 0,
      status: input.status || 'active',
      image: input.image ? new mongoose.Types.ObjectId(input.image) : null,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await category.save();
    return category;
  }

  /**
   * Cập nhật danh mục (chống vòng lặp & cập nhật cây con)
   */
  static async update(id: string, input: UpdateCategoryInput, userId?: string) {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('ID danh mục không hợp lệ.');
    }

    const category = await Category.findById(id);
    if (!category) {
      throw new Error('Không tìm thấy danh mục để cập nhật.');
    }

    // 1. Kiểm tra vòng lặp nếu thay đổi parentId
    if (input.parentId !== undefined) {
      if (input.parentId === id) {
        throw new Error('Danh mục không thể làm cha của chính nó.');
      }

      if (input.parentId) {
        // Kiểm tra xem parentId mới có phải là hậu duệ (con/cháu) của danh mục hiện tại không
        const isDescendant = await Category.findOne({
          _id: new mongoose.Types.ObjectId(input.parentId),
          ancestors: category._id,
        });

        if (isDescendant) {
          throw new Error('Không thể chuyển danh mục vào làm con của một nhánh con cháu bên dưới (tránh tạo vòng lặp).');
        }
      }
    }

    // 2. Cập nhật slug nếu name hoặc slug thay đổi
    if (input.slug && input.slug !== category.slug) {
      category.slug = await this.generateUniqueSlug(input.slug, id);
    } else if (input.name && input.name !== category.name && !category.slug) {
      category.slug = await this.generateUniqueSlug(input.name, id);
    }

    // 3. Nếu thay đổi parentId -> tính lại ancestors và cập nhật toàn bộ subtree
    const oldParentId = category.parentId ? category.parentId.toString() : null;
    const newParentId = input.parentId !== undefined ? (input.parentId || null) : oldParentId;

    if (newParentId !== oldParentId) {
      let newAncestors: mongoose.Types.ObjectId[] = [];
      if (newParentId) {
        const parentDoc = await Category.findById(newParentId);
        if (!parentDoc) {
          throw new Error('Danh mục cha mới không tồn tại.');
        }
        newAncestors = [...parentDoc.ancestors, parentDoc._id];
      }

      const oldAncestors = [...category.ancestors, category._id];
      category.parentId = newParentId ? new mongoose.Types.ObjectId(newParentId) : null;
      category.ancestors = newAncestors;

      // Tìm và cập nhật tất cả các con cháu bên dưới
      const descendants = await Category.find({ ancestors: category._id });
      for (const desc of descendants) {
        // Thay thế tiền tố ancestors cũ bằng tiền tố ancestors mới
        const descAncestorsStr = desc.ancestors.map((a: any) => a.toString());
        const cutIndex = descAncestorsStr.indexOf(category._id.toString());
        if (cutIndex !== -1) {
          const remainingPath = desc.ancestors.slice(cutIndex + 1);
          desc.ancestors = [...newAncestors, category._id, ...remainingPath];
          await desc.save();
        }
      }
    }

    if (input.name !== undefined) category.name = input.name.trim();
    if (input.description !== undefined) category.description = input.description?.trim() || '';
    if (input.order !== undefined) category.order = input.order;
    if (input.status !== undefined) category.status = input.status;
    if (input.image !== undefined) {
      category.image = input.image ? new mongoose.Types.ObjectId(input.image) : null;
    }
    if (userId) category.updatedBy = new mongoose.Types.ObjectId(userId);

    await category.save();
    return category;
  }

  /**
   * Xóa danh mục (kiểm tra an toàn: con cháu và sản phẩm đang gắn)
   */
  static async delete(id: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('ID danh mục không hợp lệ.');
    }

    const categoryId = new mongoose.Types.ObjectId(id);

    // 1. Kiểm tra xem có danh mục con trực tiếp không
    const childCount = await Category.countDocuments({ parentId: categoryId });
    if (childCount > 0) {
      throw new Error(`Không thể xóa vì còn ${childCount} danh mục con trực thuộc. Vui lòng di chuyển hoặc xóa các danh mục con trước.`);
    }

    // 2. Kiểm tra xem có sản phẩm nào thuộc danh mục này không
    const productCount = await Product.countDocuments({ categories: categoryId });
    if (productCount > 0) {
      throw new Error(`Không thể xóa vì có ${productCount} sản phẩm đang thuộc danh mục này. Hãy chuyển sản phẩm sang danh mục khác trước khi xóa.`);
    }

    await Category.findByIdAndDelete(categoryId);
    return true;
  }

  /**
   * Cập nhật thứ tự hiển thị nhiều danh mục
   */
  static async reorder(items: Array<{ id: string; order: number }>) {
    await connectDB();
    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(item.id) },
        update: { $set: { order: item.order } },
      },
    }));

    if (bulkOps.length > 0) {
      await Category.bulkWrite(bulkOps);
    }
    return true;
  }
}
