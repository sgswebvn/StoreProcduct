import { z } from 'zod';

export const fieldTypeEnum = z.enum([
  'text',
  'textarea',
  'number',
  'boolean',
  'date',
  'single_select',
  'multi_select',
  'url',
  'image_ref',
]);

export const fieldDefinitionSchema = z.object({
  key: z
    .string()
    .min(1, 'Khóa trường (key) không được để trống')
    .max(50, 'Khóa trường tối đa 50 ký tự')
    .regex(/^[a-z][a-z0-9_]*$/, 'Khóa trường phải bắt đầu bằng chữ cái thường và chỉ chứa chữ cái thường, số hoặc dấu gạch dưới (_)'),
  label: z.string().min(1, 'Tên hiển thị không được để trống').max(100),
  type: fieldTypeEnum,
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),
  options: z.array(z.string().trim()).default([]),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
  searchable: z.boolean().default(false),
  filterable: z.boolean().default(false),
  order: z.number().int().default(0),
});

export const createProductTypeSchema = z.object({
  name: z.string().min(1, 'Tên loại sản phẩm không được để trống').max(120),
  slug: z.string().min(1).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(500).optional().nullable(),
  fields: z.array(fieldDefinitionSchema).default([]),
  variantAttributes: z.array(z.string().trim()).default([]),
  status: z.enum(['active', 'archived']).default('active'),
});

export const updateProductTypeSchema = createProductTypeSchema.partial();

export const queryProductTypeSchema = z.object({
  status: z.enum(['all', 'active', 'archived']).default('all'),
  search: z.string().optional(),
});

export type CreateProductTypeInput = z.infer<typeof createProductTypeSchema>;
export type UpdateProductTypeInput = z.infer<typeof updateProductTypeSchema>;
export type QueryProductTypeInput = z.infer<typeof queryProductTypeSchema>;
