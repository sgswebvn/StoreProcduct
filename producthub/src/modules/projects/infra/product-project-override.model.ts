import mongoose, { Schema, Document } from 'mongoose';

export interface IProductProjectOverride extends Document {
  productId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  customName?: string;
  customPrice?: number;
  customOriginalPrice?: number;
  siteStatus: 'published' | 'hidden';
  customAttributes?: Array<{ key: string; value: any }>;
  createdAt: Date;
  updatedAt: Date;
}

const ProductProjectOverrideSchema = new Schema<IProductProjectOverride>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    customName: {
      type: String,
      trim: true,
    },
    customPrice: {
      type: Number,
      min: 0,
    },
    customOriginalPrice: {
      type: Number,
      min: 0,
    },
    siteStatus: {
      type: String,
      enum: ['published', 'hidden'],
      default: 'published',
      index: true,
    },
    customAttributes: [
      {
        key: { type: String, required: true },
        value: { type: Schema.Types.Mixed },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Ràng buộc duy nhất: Mỗi sản phẩm chỉ có tối đa 1 bản ghi override trên mỗi project
ProductProjectOverrideSchema.index({ projectId: 1, productId: 1 }, { unique: true });

export const ProductProjectOverride =
  mongoose.models.ProductProjectOverride ||
  mongoose.model<IProductProjectOverride>(
    'ProductProjectOverride',
    ProductProjectOverrideSchema
  );

export default ProductProjectOverride;
