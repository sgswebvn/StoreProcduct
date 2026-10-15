import mongoose, { Document, Model, Schema } from 'mongoose';

export type ErrorSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type ErrorStatus = 'new' | 'investigating' | 'resolved' | 'ignored';
export type ErrorCategory =
  | 'server'
  | 'client'
  | 'database'
  | 'storage'
  | 'auth'
  | 'network';

export interface ISystemError extends Document {
  errorId: string;
  fingerprint: string;
  title: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  status: ErrorStatus;
  occurrenceCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  route?: string;
  requestId?: string;
  stackTrace?: string;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SystemErrorSchema = new Schema<ISystemError>(
  {
    errorId: { type: String, required: true, unique: true },
    fingerprint: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    category: {
      type: String,
      enum: ['server', 'client', 'database', 'storage', 'auth', 'network'],
      default: 'server',
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['new', 'investigating', 'resolved', 'ignored'],
      default: 'new',
      index: true,
    },
    occurrenceCount: { type: Number, default: 1 },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now, index: true },
    route: { type: String },
    requestId: { type: String },
    stackTrace: { type: String },
    resolutionNote: { type: String },
    resolvedBy: { type: String },
    resolvedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

SystemErrorSchema.index({ status: 1, severity: 1 });
SystemErrorSchema.index({ lastSeenAt: -1 });

const SystemError: Model<ISystemError> =
  mongoose.models.SystemError ??
  mongoose.model<ISystemError>('SystemError', SystemErrorSchema);

export default SystemError;
