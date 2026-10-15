import mongoose, { Document, Model, Schema } from 'mongoose';
import type { Role, Permission } from '@/core/auth/permissions';

// ─── Interface ─────────────────────────────────────────────────
export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  avatar?: string;
  role: Role;
  additionalPermissions: Permission[];
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ────────────────────────────────────────────────────
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // KHÔNG bao giờ trả về trong query mặc định
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must be 100 characters or less'],
    },
    avatar: {
      type: String,
      default: undefined,
    },
    role: {
      type: String,
      enum: ['owner', 'administrator', 'product_manager', 'editor', 'viewer'],
      required: true,
      default: 'viewer',
    },
    additionalPermissions: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    lastLoginAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
    // Không trả về passwordHash trong JSON output
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.passwordHash = undefined;
        return ret;
      },
    },
  }
);

// ─── Model (singleton pattern cho Next.js hot reload) ──────────
const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);

export default User;
