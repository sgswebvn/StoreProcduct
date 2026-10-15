import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống').max(120, 'Tên danh mục tối đa 120 ký tự'),
  slug: z.string().min(1, 'Slug không được để trống').max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch nối (-)').optional(),
  description: z.string().max(500, 'Mô tả tối đa 500 ký tự').optional().nullable(),
  parentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID danh mục cha không hợp lệ').optional().nullable(),
  order: z.number().int().default(0),
  status: z.enum(['active', 'inactive']).default('active'),
  image: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID hình ảnh không hợp lệ').optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const queryCategorySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
  tree: z.enum(['true', 'false']).optional().default('false'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type QueryCategoryInput = z.infer<typeof queryCategorySchema>;
