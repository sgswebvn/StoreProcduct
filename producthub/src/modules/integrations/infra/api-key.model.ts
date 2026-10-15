import mongoose, { Schema, Document } from 'mongoose';

export type ApiKeyScope =
  | 'products.read'
  | 'products.write'
  | 'categories.read'
  | 'product_types.read'
  | 'media.read';

export interface IApiKey extends Document {
  name: string;
  keyPrefix: string; // 8 ký tự đầu để nhận diện
  keyHash: string; // SHA-256 hash của API key bí mật
  projectId?: mongoose.Types.ObjectId; // Giới hạn phạm vi theo dự án (Project-scoped)
  scopes: ApiKeyScope[];
  status: 'active' | 'revoked';
  rateLimit: number; // số requests / phút
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    keyPrefix: {
      type: String,
      required: true,
      index: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    scopes: [
      {
        type: String,
        enum: [
          'products.read',
          'products.write',
          'categories.read',
          'product_types.read',
          'media.read',
        ],
      },
    ],
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
      index: true,
    },
    rateLimit: {
      type: Number,
      default: 60,
    },
    lastUsedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const ApiKey =
  mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema);

export default ApiKey;
