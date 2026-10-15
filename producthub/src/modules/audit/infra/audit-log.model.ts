import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  actorUserId?: string;
  actorEmailSnapshot?: string;
  actorNameSnapshot?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  timestamp: Date;
  result: 'success' | 'failure';
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  summary: string;
  changes?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorUserId: { type: String, index: true },
    actorEmailSnapshot: { type: String },
    actorNameSnapshot: { type: String },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    result: { type: String, enum: ['success', 'failure'], default: 'success' },
    requestId: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    summary: { type: String, required: true },
    changes: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Audit log không bao giờ cập nhật
  }
);

// Indexes phục vụ tìm kiếm & sắp xếp tối ưu
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ resourceType: 1, action: 1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ??
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
