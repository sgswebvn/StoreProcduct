import mongoose, { Schema, Document } from 'mongoose';

export interface IMedia extends Document {
  fileName: string;
  mimeType: string;
  size: number;
  driveFileId: string;
  driveWebViewLink?: string;
  thumbnailUrl?: string;
  storageProvider: 'google_drive';
  uploadedBy?: mongoose.Types.ObjectId;
  status: 'active' | 'pending' | 'deleted';
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    mimeType: {
      type: String,
      required: true,
      index: true,
    },
    size: {
      type: Number,
      required: true,
    },
    driveFileId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    driveWebViewLink: {
      type: String,
    },
    thumbnailUrl: {
      type: String,
    },
    storageProvider: {
      type: String,
      default: 'google_drive',
      enum: ['google_drive'],
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'deleted'],
      default: 'active',
      index: true,
    },
    alt: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: '',
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    productCount: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Media = mongoose.models.Media || mongoose.model<IMedia>('Media', MediaSchema);
export default Media;
