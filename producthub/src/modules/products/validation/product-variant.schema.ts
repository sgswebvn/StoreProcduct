import { z } from 'zod';

export const variantAttributeSchema = z.object({
  key: z.string().min(1, 'Khóa thuộc tính không được để trống'),
  value: z.union([z.string(), z.number()]),
});

export const createProductVariantSchema = z.object({
  name: z.string().min(1, 'Tên biến thể không được để trống').max(150),
  sku: z.string().max(60).optional().nullable(),
  price: z.number().min(0, 'Giá không được âm').default(0),
  originalPrice: z.number().min(0).default(0),
  thumbnail: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID hình ảnh không hợp lệ').optional().nullable(),
  attributes: z.array(variantAttributeSchema).min(1, 'Biến thể phải có ít nhất một thuộc tính'),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateProductVariantSchema = createProductVariantSchema.partial().extend({
  dataVersion: z.number().int().min(1, 'Thiếu dataVersion để kiểm soát xung đột'),
});

export type CreateProductVariantInput = z.infer<typeof createProductVariantSchema>;
export type UpdateProductVariantInput = z.infer<typeof updateProductVariantSchema>;
