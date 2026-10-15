import mongoose, { Document, Model, Schema } from 'mongoose';

export type ScriptType = 'ga4' | 'gtm' | 'meta_pixel' | 'custom';
export type ScriptLocation = 'head' | 'body_start' | 'footer';
export type ScriptScope = 'all' | 'storefront' | 'admin';

export interface IScriptIntegration extends Document {
  name: string;
  type: ScriptType;
  location: ScriptLocation;
  config: {
    trackingId?: string; // G-XXXXX hoặc GTM-XXXXX hoặc Pixel ID
    code?: string;       // Custom HTML/JS script
  };
  isActive: boolean;
  scope: ScriptScope;
  version: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScriptIntegrationSchema = new Schema<IScriptIntegration>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['ga4', 'gtm', 'meta_pixel', 'custom'],
      required: true,
      default: 'custom',
    },
    location: {
      type: String,
      enum: ['head', 'body_start', 'footer'],
      required: true,
      default: 'head',
    },
    config: {
      trackingId: { type: String, trim: true },
      code: { type: String, default: '' },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    scope: {
      type: String,
      enum: ['all', 'storefront', 'admin'],
      default: 'all',
    },
    version: {
      type: Number,
      default: 1,
    },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  {
    timestamps: true,
  }
);

const ScriptIntegration: Model<IScriptIntegration> =
  mongoose.models.ScriptIntegration ??
  mongoose.model<IScriptIntegration>('ScriptIntegration', ScriptIntegrationSchema);

export default ScriptIntegration;
