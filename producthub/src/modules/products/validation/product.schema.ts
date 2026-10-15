import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm không được để trống').max(250, 'Tên sản phẩm tối đa 250 ký tự'),
  slug: z.string().min(1, 'Slug không được để trống').max(260).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch nối (-)').optional(),
  sku: z.string().max(50, 'Mã SKU tối đa 50 ký tự').optional().nullable(),
  shortDescription: z.string().max(500, 'Mô tả ngắn tối đa 500 ký tự').optional().nullable(),
  description: z.string().optional().nullable(),
  productTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID loại sản phẩm không hợp lệ').optional().nullable(),
  attributes: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.any(),
      })
    )
    .optional()
    .default([]),
  status: z.enum(['draft', 'active', 'archived']).optional().default('draft'),
  categories: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID danh mục không hợp lệ')).optional().default([]),
  thumbnail: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID hình ảnh không hợp lệ').optional().nullable(),
  images: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID hình ảnh không hợp lệ')).optional().default([]),
  price: z.number().min(0, 'Giá sản phẩm không được âm').optional().default(0),
  originalPrice: z.number().min(0, 'Giá niêm yết không được âm').optional().default(0),
  tags: z.array(z.string().trim()).optional().default([]),
});

export const updateProductSchema = createProductSchema.partial().extend({
  dataVersion: z.number().int().min(1, 'Thiếu phiên bản dữ liệu (dataVersion) để kiểm soát xung đột ghi đè'),
});

export const queryProductSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['all', 'draft', 'active', 'archived']).default('all'),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'price']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateProductInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
export type QueryProductInput = z.infer<typeof queryProductSchema>;
