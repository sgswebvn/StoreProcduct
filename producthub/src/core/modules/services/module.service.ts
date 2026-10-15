import { connectDB } from '@/core/db/connect';
import { ModuleRegistry, REGISTERED_MODULES } from '../module-registry';
import { ModuleDefinition } from '../module.types';
import ModuleState from '../infra/module-state.model';
import { hooks } from '@/core/hooks/hook-system';
import mongoose from 'mongoose';

export interface ModuleWithStatus extends ModuleDefinition {
  enabled: boolean;
  dependentModules?: string[]; // Các module khác đang phụ thuộc vào module này
}

export class ModuleService {
  /**
   * Lấy danh sách toàn bộ modules kèm trạng thái kích hoạt thực tế từ database
   */
  static async getAllWithState(): Promise<ModuleWithStatus[]> {
    await connectDB();
    const states = await ModuleState.find({}).lean();
    const stateMap = new Map<string, boolean>(
      states.map((s) => [s.moduleId, s.enabled])
    );

    const modules = ModuleRegistry.getAll();

    return modules.map((m) => {
      // Core module luôn bật
      const enabled = m.isCore
        ? true
        : stateMap.has(m.id)
        ? Boolean(stateMap.get(m.id))
        : m.defaultEnabled;

      // Tìm các module khác đang phụ thuộc vào module này
      const dependents = modules
        .filter((other) => other.dependencies?.includes(m.id))
        .map((other) => other.id);

      return {
        ...m,
        enabled,
        dependentModules: dependents,
      };
    });
  }

  /**
   * Kiểm tra nhanh trạng thái một module có đang bật hay không
   */
  static async isModuleEnabled(moduleId: string): Promise<boolean> {
    const mod = ModuleRegistry.getById(moduleId);
    if (!mod) return false;
    if (mod.isCore) return true;

    await connectDB();
    const state = await ModuleState.findOne({ moduleId }).lean();
    if (!state) return mod.defaultEnabled;
    return Boolean(state.enabled);
  }

  /**
   * Bật hoặc Tắt module an toàn với quy tắc ràng buộc phụ thuộc
   */
  static async toggleModule(
    moduleId: string,
    enabled: boolean,
    userId?: string
  ): Promise<ModuleWithStatus> {
    await connectDB();
    const mod = ModuleRegistry.getById(moduleId);
    if (!mod) {
      throw new Error(`Không tìm thấy module với mã "${moduleId}".`);
    }

    // 1. Không thể tắt Core Module
    if (mod.isCore && !enabled) {
      throw new Error(`Không thể tắt Module cốt lõi của hệ thống (${mod.name}).`);
    }

    // 2. Nếu muốn tắt module, kiểm tra xem có module nào đang bật mà phụ thuộc vào module này không
    if (!enabled) {
      const allModulesWithStatus = await this.getAllWithState();
      const activeDependents = allModulesWithStatus.filter(
        (m) => m.enabled && m.dependencies?.includes(moduleId)
      );

      if (activeDependents.length > 0) {
        const dependentNames = activeDependents.map((d) => `"${d.name}"`).join(', ');
        throw new Error(
          `Không thể tắt module "${mod.name}" vì các module đang hoạt động sau phụ thuộc vào nó: ${dependentNames}. Hãy tắt các module đó trước.`
        );
      }
    }

    // 3. Nếu muốn bật module, kiểm tra xem các module mà nó phụ thuộc đã bật chưa
    if (enabled && mod.dependencies && mod.dependencies.length > 0) {
      for (const depId of mod.dependencies) {
        const isDepEnabled = await this.isModuleEnabled(depId);
        if (!isDepEnabled) {
          const depMod = ModuleRegistry.getById(depId);
          throw new Error(
            `Không thể bật module "${mod.name}" vì module phụ thuộc "${depMod?.name || depId}" chưa được kích hoạt.`
          );
        }
      }
    }

    // 4. Lưu trạng thái vào Database
    const updatedByObjId = userId && mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : undefined;

    await ModuleState.findOneAndUpdate(
      { moduleId },
      {
        moduleId,
        enabled,
        updatedBy: updatedByObjId,
      },
      { upsert: true, new: true }
    );

    // 5. Phát sự kiện lifecycle
    await hooks.emit('module:toggled', { moduleId, enabled, userId });

    return {
      ...mod,
      enabled,
    };
  }
}
