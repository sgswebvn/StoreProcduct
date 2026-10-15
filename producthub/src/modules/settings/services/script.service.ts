import { connectDB } from '@/core/db/connect';
import ScriptIntegration, {
  IScriptIntegration,
  ScriptType,
  ScriptLocation,
  ScriptScope,
} from '../infra/script.model';

export interface CreateScriptInput {
  name: string;
  type: ScriptType;
  location: ScriptLocation;
  config: {
    trackingId?: string;
    code?: string;
  };
  scope?: ScriptScope;
  isActive?: boolean;
}

export class ScriptService {
  /**
   * Lấy danh sách toàn bộ các script đã cấu hình
   */
  static async listScripts() {
    await connectDB();
    return ScriptIntegration.find().sort({ createdAt: -1 }).lean();
  }

  /**
   * Tạo script mới
   */
  static async createScript(data: CreateScriptInput, userId: string) {
    await connectDB();

    if (!data.name || !data.name.trim()) {
      throw new Error('Tên tích hợp script là bắt buộc');
    }

    if (data.type === 'ga4' && !data.config?.trackingId) {
      throw new Error('Google Analytics 4 yêu cầu Measurement ID (ví dụ: G-XXXXXXXXXX)');
    }

    if (data.type === 'gtm' && !data.config?.trackingId) {
      throw new Error('Google Tag Manager yêu cầu Container ID (ví dụ: GTM-XXXXXXX)');
    }

    if (data.type === 'custom' && !data.config?.code) {
      throw new Error('Script tùy biến yêu cầu nội dung mã JavaScript hoặc HTML');
    }

    const script = await ScriptIntegration.create({
      name: data.name.trim(),
      type: data.type,
      location: data.location || 'head',
      config: data.config,
      scope: data.scope || 'all',
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdBy: userId,
      updatedBy: userId,
      version: 1,
    });

    return script.toObject();
  }

  /**
   * Cập nhật script
   */
  static async updateScript(
    id: string,
    data: Partial<CreateScriptInput>,
    userId: string
  ) {
    await connectDB();
    const script = await ScriptIntegration.findById(id);
    if (!script) {
      throw new Error('Không tìm thấy script tích hợp');
    }

    if (data.name !== undefined) script.name = data.name.trim();
    if (data.type !== undefined) script.type = data.type;
    if (data.location !== undefined) script.location = data.location;
    if (data.config !== undefined) script.config = data.config;
    if (data.scope !== undefined) script.scope = data.scope;
    if (data.isActive !== undefined) script.isActive = data.isActive;

    script.version += 1;
    script.updatedBy = userId;
    await script.save();

    return script.toObject();
  }

  /**
   * Bật/tắt trạng thái hoạt động của script
   */
  static async toggleScript(id: string, isActive: boolean, userId: string) {
    await connectDB();
    const script = await ScriptIntegration.findById(id);
    if (!script) {
      throw new Error('Không tìm thấy script tích hợp');
    }

    script.isActive = isActive;
    script.updatedBy = userId;
    await script.save();

    return script.toObject();
  }

  /**
   * Xóa script
   */
  static async deleteScript(id: string) {
    await connectDB();
    const result = await ScriptIntegration.findByIdAndDelete(id);
    if (!result) {
      throw new Error('Không tìm thấy script để xóa');
    }
    return { success: true };
  }

  /**
   * Lấy các script đang hoạt động để chèn vào layout
   */
  static async getActiveScripts(scope: 'storefront' | 'admin' = 'admin') {
    await connectDB();
    return ScriptIntegration.find({
      isActive: true,
      scope: { $in: ['all', scope] },
    }).lean();
  }
}
