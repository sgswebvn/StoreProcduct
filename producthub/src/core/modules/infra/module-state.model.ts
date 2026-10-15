import mongoose, { Schema, Document } from 'mongoose';

export interface IModuleState extends Document {
  moduleId: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ModuleStateSchema = new Schema<IModuleState>(
  {
    moduleId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const ModuleState =
  mongoose.models.ModuleState ||
  mongoose.model<IModuleState>('ModuleState', ModuleStateSchema);

export default ModuleState;
