import mongoose, { Schema, Document } from 'mongoose';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'single_select'
  | 'multi_select'
  | 'url'
  | 'image_ref';

export interface IFieldDefinition {
  key: string;             // Khóa nội bộ (duy nhất trong loại sản phẩm, slug-safe, bất biến)
  label: string;           // Nhãn hiển thị cho người dùng
  type: FieldType;         // Kiểu dữ liệu
  required: boolean;       // Bắt buộc nhập hay không
  defaultValue?: any;      // Giá trị mặc định
  options?: string[];      // Các tùy chọn nếu là single_select hoặc multi_select
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;      // Regex kiểm tra chuỗi
    message?: string;      // Thông báo lỗi tùy biến
  };
  searchable?: boolean;
  filterable?: boolean;
  order: number;
}

export interface IProductType extends Document {
  name: string;
  slug: string;
  description?: string;
  fields: IFieldDefinition[];
  variantAttributes: string[];  // Danh sách các field keys dùng để tạo biến thể
  status: 'active' | 'archived';
  productCount: number;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FieldDefinitionSchema = new Schema<IFieldDefinition>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'text',
        'textarea',
        'number',
        'boolean',
        'date',
        'single_select',
        'multi_select',
        'url',
        'image_ref',
      ],
    },
    required: {
      type: Boolean,
      default: false,
    },
    defaultValue: {
      type: Schema.Types.Mixed,
    },
    options: [
      {
        type: String,
        trim: true,
      },
    ],
    validation: {
      min: Number,
      max: Number,
      pattern: String,
      message: String,
    },
    searchable: {
      type: Boolean,
      default: false,
    },
    filterable: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const ProductTypeSchema = new Schema<IProductType>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    fields: [FieldDefinitionSchema],
    variantAttributes: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    productCount: {
      type: Number,
      default: 0,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

ProductTypeSchema.index({ name: 'text', description: 'text' });

export default mongoose.models.ProductType ||
  mongoose.model<IProductType>('ProductType', ProductTypeSchema);
