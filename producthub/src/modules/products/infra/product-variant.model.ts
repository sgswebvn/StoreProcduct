import mongoose, { Schema, Document } from 'mongoose';

export interface IVariantAttribute {
  key: string;
  value: string | number;
}

export interface IProductVariant extends Document {
  productId: mongoose.Types.ObjectId;
  name: string;
  sku?: string;
  price?: number;
  originalPrice?: number;
  thumbnail?: mongoose.Types.ObjectId | null;
  attributes: IVariantAttribute[];
  status: 'active' | 'inactive';
  dataVersion: number;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VariantAttributeSchema = new Schema<IVariantAttribute>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false }
);

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      index: true,
    },
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
    thumbnail: {
      type: Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    attributes: [VariantAttributeSchema],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
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

// Compound index
ProductVariantSchema.index({ productId: 1, createdAt: -1 });

export default mongoose.models.ProductVariant ||
  mongoose.model<IProductVariant>('ProductVariant', ProductVariantSchema);
