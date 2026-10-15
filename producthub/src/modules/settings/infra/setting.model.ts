import mongoose, { Document, Model, Schema } from 'mongoose';

export type SettingGroup =
  | 'general'
  | 'branding'
  | 'database'
  | 'storage'
  | 'scripts'
  | 'security'
  | 'notifications'
  | 'logs'
  | 'advanced';

export type SettingDataType = 'string' | 'number' | 'boolean' | 'json';

export interface ISystemSetting extends Document {
  key: string;
  value: any;
  dataType: SettingDataType;
  group: SettingGroup;
  label: string;
  description: string;
  defaultValue: any;
  isSecret: boolean;
  version: number;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    dataType: {
      type: String,
      enum: ['string', 'number', 'boolean', 'json'],
      required: true,
      default: 'string',
    },
    group: {
      type: String,
      enum: [
        'general',
        'branding',
        'database',
        'storage',
        'scripts',
        'security',
        'notifications',
        'logs',
        'advanced',
      ],
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    defaultValue: {
      type: Schema.Types.Mixed,
      required: true,
    },
    isSecret: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Number,
      default: 1,
    },
    updatedBy: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

const SystemSetting: Model<ISystemSetting> =
  mongoose.models.SystemSetting ??
  mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);

export default SystemSetting;
