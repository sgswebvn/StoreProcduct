import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookDeliveryLog extends Document {
  webhookId: mongoose.Types.ObjectId;
  event: string;
  url: string;
  statusCode?: number;
  responseBody?: string;
  durationMs: number;
  success: boolean;
  error?: string;
  createdAt: Date;
}

const WebhookDeliveryLogSchema = new Schema<IWebhookDeliveryLog>(
  {
    webhookId: {
      type: Schema.Types.ObjectId,
      ref: 'Webhook',
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
    },
    responseBody: {
      type: String,
    },
    durationMs: {
      type: Number,
      required: true,
    },
    success: {
      type: Boolean,
      required: true,
      index: true,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Tự động hết hạn sau 30 ngày để tối ưu dung lượng DB
WebhookDeliveryLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

export const WebhookDeliveryLog =
  mongoose.models.WebhookDeliveryLog ||
  mongoose.model<IWebhookDeliveryLog>('WebhookDeliveryLog', WebhookDeliveryLogSchema);

export default WebhookDeliveryLog;
