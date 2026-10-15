import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryLocation extends Document {
  name: string;
  code: string;
  address?: string;
  isDefault: boolean;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const InventoryLocationSchema = new Schema<IInventoryLocation>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const InventoryLocation =
  mongoose.models.InventoryLocation ||
  mongoose.model<IInventoryLocation>('InventoryLocation', InventoryLocationSchema);

export default InventoryLocation;
