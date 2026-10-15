import mongoose, { Schema, Document } from 'mongoose';

export interface IGoogleDriveToken extends Document {
  provider: 'google_drive';
  encryptedRefreshToken: string;
  accessToken?: string;
  accessTokenExpiresAt?: Date;
  accountEmail?: string;
  accountName?: string;
  scope?: string;
  connectedBy?: mongoose.Types.ObjectId;
  status: 'active' | 'expired' | 'revoked' | 'error';
  errorMessage?: string;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GoogleDriveTokenSchema = new Schema<IGoogleDriveToken>(
  {
    provider: {
      type: String,
      required: true,
      default: 'google_drive',
      unique: true,
    },
    encryptedRefreshToken: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
    },
    accessTokenExpiresAt: {
      type: Date,
    },
    accountEmail: {
      type: String,
    },
    accountName: {
      type: String,
    },
    scope: {
      type: String,
    },
    connectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked', 'error'],
      default: 'active',
      index: true,
    },
    errorMessage: {
      type: String,
    },
    lastSyncAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.GoogleDriveToken ||
  mongoose.model<IGoogleDriveToken>('GoogleDriveToken', GoogleDriveTokenSchema);
