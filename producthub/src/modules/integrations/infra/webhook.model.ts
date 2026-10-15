import mongoose, { Schema, Document } from 'mongoose';

export type WebhookEvent =
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'category.created'
  | 'category.updated'
  | 'category.deleted';

export interface IWebhook extends Document {
  name: string;
  url: string;
  secret: string; // Khóa bí mật ký HMAC-SHA256
  events: WebhookEvent[];
  status: 'active' | 'inactive';
  failureCount: number;
  lastDeliveredAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSchema = new Schema<IWebhook>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    secret: {
      type: String,
      required: true,
    },
    events: [
      {
        type: String,
        enum: [
          'product.created',
          'product.updated',
          'product.deleted',
          'category.created',
          'category.updated',
          'category.deleted',
        ],
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastDeliveredAt: {
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

export const Webhook =
  mongoose.models.Webhook || mongoose.model<IWebhook>('Webhook', WebhookSchema);

export default Webhook;
