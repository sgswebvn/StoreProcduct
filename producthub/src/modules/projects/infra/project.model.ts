import mongoose, { Schema, Document } from 'mongoose';

export interface IFieldVisibility {
  sku?: boolean;
  originalPrice?: boolean;
  shortDescription?: boolean;
  attributes?: boolean;
  tags?: boolean;
}

export interface IProject extends Document {
  name: string;
  code: string;
  domain?: string;
  description?: string;
  status: 'active' | 'inactive';
  assignedCategories: mongoose.Types.ObjectId[];
  fieldVisibility: IFieldVisibility;
  productCount: number;
  settings?: Record<string, unknown>;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    domain: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    assignedCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    fieldVisibility: {
      sku: { type: Boolean, default: true },
      originalPrice: { type: Boolean, default: true },
      shortDescription: { type: Boolean, default: true },
      attributes: { type: Boolean, default: true },
      tags: { type: Boolean, default: true },
    },
    productCount: {
      type: Number,
      default: 0,
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
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

export const Project =
  mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
