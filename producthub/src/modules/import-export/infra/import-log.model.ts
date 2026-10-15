import mongoose, { Schema, Document } from 'mongoose';

export interface IImportRowError {
  row: number;
  sku?: string;
  name?: string;
  error: string;
}

export interface IImportLog extends Document {
  fileName: string;
  totalRows: number;
  successCount: number;
  updatedCount: number;
  createdCount: number;
  errorCount: number;
  rowErrors: IImportRowError[];
  importedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ImportLogSchema = new Schema<IImportLog>(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    totalRows: {
      type: Number,
      required: true,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    updatedCount: {
      type: Number,
      default: 0,
    },
    createdCount: {
      type: Number,
      default: 0,
    },
    errorCount: {
      type: Number,
      default: 0,
    },
    rowErrors: [
      {
        row: { type: Number, required: true },
        sku: { type: String },
        name: { type: String },
        error: { type: String, required: true },
      },
    ],
    importedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  }
);

export const ImportLog =
  mongoose.models.ImportLog || mongoose.model<IImportLog>('ImportLog', ImportLogSchema);

export default ImportLog;
