import { connectDB } from '@/core/db/connect';
import { Project, IProject, IFieldVisibility } from '../infra/project.model';
import { ProductProjectOverride } from '../infra/product-project-override.model';
import Product from '@/modules/products/infra/product.model';
import { slugify } from '@/core/utils/slug';
import { hooks } from '@/core/hooks/hook-system';
import mongoose from 'mongoose';

export interface CreateProjectInput {
  name: string;
  code?: string;
  domain?: string;
  description?: string;
  status?: 'active' | 'inactive';
  assignedCategories?: string[];
  fieldVisibility?: IFieldVisibility;
  settings?: Record<string, unknown>;
}

export interface UpdateProjectInput {
  name?: string;
  code?: string;
  domain?: string;
  description?: string;
  status?: 'active' | 'inactive';
  assignedCategories?: string[];
  fieldVisibility?: IFieldVisibility;
  settings?: Record<string, unknown>;
}

export class ProjectService {
  /**
   * Sinh mã code duy nhất cho Project
   */
  private static async generateUniqueCode(baseName: string, excludeId?: string): Promise<string> {
    const base = slugify(baseName) || 'site';
    let code = base;
    let count = 1;

    while (true) {
      const query: any = { code };
      if (excludeId) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
      }
      const existing = await Project.findOne(query);
      if (!existing) return code;
      count++;
      code = `${base}-${count}`;
    }
  }

  /**
   * Lấy danh sách Projects có phân trang và tìm kiếm
   */
  static async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive';
  }) {
    await connectDB();
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: any = {};
    if (params.status) {
      query.status = params.status;
    }
    if (params.search && params.search.trim()) {
      const regex = new RegExp(params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: regex }, { code: regex }, { domain: regex }];
    }

    const [items, total] = await Promise.all([
      Project.find(query)
        .populate('assignedCategories', '_id name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments(query),
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
   * Lấy chi tiết Project theo ID
   */
  static async getById(id: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    return Project.findById(id)
      .populate('assignedCategories', '_id name slug')
      .lean();
  }

  /**
   * Lấy chi tiết Project theo Code
   */
  static async getByCode(code: string) {
    await connectDB();
    return Project.findOne({ code: code.toLowerCase().trim() })
      .populate('assignedCategories', '_id name slug')
      .lean();
  }

  /**
   * Tạo Project mới
   */
  static async create(input: CreateProjectInput, userId?: string) {
    await connectDB();
    const code = input.code
      ? await this.generateUniqueCode(input.code)
      : await this.generateUniqueCode(input.name);

    const categoryObjIds = (input.assignedCategories || []).map(
      (catId) => new mongoose.Types.ObjectId(catId)
    );

    const project = new Project({
      name: input.name.trim(),
      code,
      domain: input.domain?.trim() || undefined,
      description: input.description?.trim() || undefined,
      status: input.status || 'active',
      assignedCategories: categoryObjIds,
      fieldVisibility: input.fieldVisibility || {
        sku: true,
        originalPrice: true,
        shortDescription: true,
        attributes: true,
        tags: true,
      },
      productCount: 0,
      settings: input.settings || {},
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      updatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await project.save();
    await hooks.emit('project:created', { project, userId });
    return project;
  }

  /**
   * Cập nhật thông tin Project
   */
  static async update(id: string, input: UpdateProjectInput, userId?: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('ID Dự án không hợp lệ.');

    const project = await Project.findById(id);
    if (!project) throw new Error('Không tìm thấy Dự án để cập nhật.');

    if (input.name) project.name = input.name.trim();
    if (input.code && input.code !== project.code) {
      project.code = await this.generateUniqueCode(input.code, id);
    }
    if (input.domain !== undefined) project.domain = input.domain?.trim() || undefined;
    if (input.description !== undefined) project.description = input.description?.trim() || undefined;
    if (input.status) project.status = input.status;
    if (input.assignedCategories) {
      project.assignedCategories = input.assignedCategories.map(
        (catId) => new mongoose.Types.ObjectId(catId)
      );
    }
    if (input.fieldVisibility) {
      project.fieldVisibility = {
        ...project.fieldVisibility,
        ...input.fieldVisibility,
      };
    }
    if (input.settings) {
      project.settings = { ...project.settings, ...input.settings };
    }
    if (userId) {
      project.updatedBy = new mongoose.Types.ObjectId(userId);
    }

    await project.save();
    await hooks.emit('project:updated', { project, userId });
    return project;
  }

  /**
   * Xóa Project và toàn bộ overrides liên quan
   */
  static async delete(id: string, userId?: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('ID Dự án không hợp lệ.');

    const project = await Project.findById(id);
    if (!project) throw new Error('Không tìm thấy Dự án để xóa.');

    const pObjId = new mongoose.Types.ObjectId(id);
    // Xóa toàn bộ liên kết và overrides của project
    await ProductProjectOverride.deleteMany({ projectId: pObjId });
    await Project.findByIdAndDelete(id);

    await hooks.emit('project:deleted', { projectId: id, userId });
    return true;
  }

  /**
   * Gán danh sách sản phẩm vào Project
   */
  static async assignProducts(projectId: string, productIds: string[]) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(projectId)) throw new Error('ID Dự án không hợp lệ.');

    const pObjId = new mongoose.Types.ObjectId(projectId);
    const validProductIds = productIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    for (const prodId of validProductIds) {
      await ProductProjectOverride.findOneAndUpdate(
        { projectId: pObjId, productId: new mongoose.Types.ObjectId(prodId) },
        {
          $setOnInsert: {
            projectId: pObjId,
            productId: new mongoose.Types.ObjectId(prodId),
            siteStatus: 'published',
          },
        },
        { upsert: true }
      );
    }

    // Cập nhật lại số lượng sản phẩm
    const count = await ProductProjectOverride.countDocuments({ projectId: pObjId });
    await Project.findByIdAndUpdate(pObjId, { productCount: count });

    await hooks.emit('product:project_assigned', { projectId, productIds: validProductIds });
    return { assignedCount: validProductIds.length, totalCount: count };
  }

  /**
   * Bỏ gán sản phẩm khỏi Project
   */
  static async unassignProducts(projectId: string, productIds: string[]) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(projectId)) throw new Error('ID Dự án không hợp lệ.');

    const pObjId = new mongoose.Types.ObjectId(projectId);
    const validProductObjIds = productIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    await ProductProjectOverride.deleteMany({
      projectId: pObjId,
      productId: { $in: validProductObjIds },
    });

    // Cập nhật lại số lượng sản phẩm
    const count = await ProductProjectOverride.countDocuments({ projectId: pObjId });
    await Project.findByIdAndUpdate(pObjId, { productCount: count });

    await hooks.emit('product:project_unassigned', { projectId, productIds });
    return { unassignedCount: validProductObjIds.length, totalCount: count };
  }

  /**
   * Thiết lập Override dữ liệu cho sản phẩm thuộc Project
   */
  static async setProductOverride(
    projectId: string,
    productId: string,
    overrides: {
      customName?: string;
      customPrice?: number;
      customOriginalPrice?: number;
      siteStatus?: 'published' | 'hidden';
      customAttributes?: Array<{ key: string; value: any }>;
    }
  ) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('ID không hợp lệ.');
    }

    const pObjId = new mongoose.Types.ObjectId(projectId);
    const prodObjId = new mongoose.Types.ObjectId(productId);

    const updateData: any = {};
    if (overrides.customName !== undefined) updateData.customName = overrides.customName;
    if (overrides.customPrice !== undefined) updateData.customPrice = overrides.customPrice;
    if (overrides.customOriginalPrice !== undefined) updateData.customOriginalPrice = overrides.customOriginalPrice;
    if (overrides.siteStatus) updateData.siteStatus = overrides.siteStatus;
    if (overrides.customAttributes) updateData.customAttributes = overrides.customAttributes;

    const result = await ProductProjectOverride.findOneAndUpdate(
      { projectId: pObjId, productId: prodObjId },
      { $set: updateData },
      { upsert: true, new: true }
    );

    // Đồng bộ lại productCount nếu là bản ghi mới
    const count = await ProductProjectOverride.countDocuments({ projectId: pObjId });
    await Project.findByIdAndUpdate(pObjId, { productCount: count });

    return result;
  }

  /**
   * Lấy danh sách sản phẩm thuộc Project kèm dữ liệu Override và áp dụng Field Visibility
   */
  static async getAssignedProducts(
    projectId: string,
    params?: { page?: number; limit?: number; search?: string }
  ) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(projectId)) throw new Error('ID Dự án không hợp lệ.');

    const project = await Project.findById(projectId).lean();
    if (!project) throw new Error('Không tìm thấy Dự án.');

    const pObjId = new mongoose.Types.ObjectId(projectId);
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 50));
    const skip = (page - 1) * limit;

    const [overrides, total] = await Promise.all([
      ProductProjectOverride.find({ projectId: pObjId })
        .populate({
          path: 'productId',
          populate: [
            { path: 'thumbnail', select: '_id fileName thumbnailUrl driveFileId' },
            { path: 'categories', select: '_id name slug' },
          ],
        })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductProjectOverride.countDocuments({ projectId: pObjId }),
    ]);

    const visibility = project.fieldVisibility || {};

    const items = overrides
      .filter((ov) => ov.productId != null)
      .map((ov) => {
        const prod = ov.productId as any;
        const effectiveName = ov.customName || prod.name;
        const effectivePrice = ov.customPrice !== undefined && ov.customPrice !== null ? ov.customPrice : prod.price;
        const effectiveOriginalPrice = ov.customOriginalPrice !== undefined && ov.customOriginalPrice !== null ? ov.customOriginalPrice : prod.originalPrice;

        return {
          _id: prod._id,
          overrideId: ov._id,
          name: effectiveName,
          originalName: prod.name,
          slug: prod.slug,
          sku: visibility.sku !== false ? prod.sku : undefined,
          price: effectivePrice,
          originalPrice: visibility.originalPrice !== false ? effectiveOriginalPrice : undefined,
          basePrice: prod.price,
          shortDescription: visibility.shortDescription !== false ? prod.shortDescription : undefined,
          siteStatus: ov.siteStatus,
          originalStatus: prod.status,
          thumbnail: prod.thumbnail,
          categories: prod.categories,
          hasOverride: Boolean(
            ov.customName ||
            ov.customPrice !== undefined ||
            ov.customOriginalPrice !== undefined ||
            ov.siteStatus !== 'published'
          ),
        };
      });

    return {
      project: {
        _id: project._id,
        name: project.name,
        code: project.code,
        domain: project.domain,
        fieldVisibility: visibility,
      },
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
