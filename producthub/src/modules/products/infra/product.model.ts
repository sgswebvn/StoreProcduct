import mongoose, { Schema, Document } from 'mongoose';

export interface IProductAttribute {
  key: string;
  value: any;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  sku?: string;
  shortDescription?: string;
  description?: string;
  productTypeId?: mongoose.Types.ObjectId | null;
  attributes: IProductAttribute[];
  hasVariants: boolean;
  variantCount: number;
  status: 'draft' | 'active' | 'archived';
  categories: mongoose.Types.ObjectId[];
  thumbnail?: mongoose.Types.ObjectId | null;
  images: mongoose.Types.ObjectId[];
  price?: number;
  originalPrice?: number;
  tags: string[];
  dataVersion: number;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductAttributeSchema = new Schema<IProductAttribute>(
  {
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      index: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
      index: true,
    },
    productTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductType',
      default: null,
      index: true,
    },
    attributes: [ProductAttributeSchema],
    hasVariants: {
      type: Boolean,
      default: false,
    },
    variantCount: {
      type: Number,
      default: 0,
    },
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        index: true,
      },
    ],
    thumbnail: {
      type: Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
      index: true,
    },
    images: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    dataVersion: {
      type: Number,
      default: 1,
      required: true,
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

// Indexes
ProductSchema.index({ name: 'text', sku: 'text', tags: 'text' });
ProductSchema.index({ status: 1, createdAt: -1 });

export const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
export default Product;
