import mongoose, { Schema, Document } from 'mongoose';

export type InventoryAction = 'adjust' | 'set' | 'import' | 'transfer';

export interface IInventoryLog extends Document {
  productId: mongoose.Types.ObjectId;
  locationId: mongoose.Types.ObjectId;
  action: InventoryAction;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  performedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const InventoryLogSchema = new Schema<IInventoryLog>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryLocation',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['adjust', 'set', 'import', 'transfer'],
      required: true,
    },
    quantityChange: {
      type: Number,
      required: true,
    },
    previousQuantity: {
      type: Number,
      required: true,
    },
    newQuantity: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

InventoryLogSchema.index({ productId: 1, createdAt: -1 });

export const InventoryLog =
  mongoose.models.InventoryLog ||
  mongoose.model<IInventoryLog>('InventoryLog', InventoryLogSchema);

export default InventoryLog;
