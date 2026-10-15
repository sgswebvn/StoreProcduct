import mongoose from 'mongoose';
import { connectDB } from '@/core/db/connect';
import { InventoryLocation, IInventoryLocation } from '../infra/inventory-location.model';
import { InventoryItem, IInventoryItem } from '../infra/inventory-item.model';
import { InventoryLog } from '../infra/inventory-log.model';
import { ModuleService } from '@/core/modules/services/module.service';

export class InventoryService {
  /**
   * Kiểm tra xem module Inventory có đang bật hay không
   */
  private static async assertModuleEnabled() {
    const isEnabled = await ModuleService.isModuleEnabled('inventory');
    if (!isEnabled) {
      throw new Error('Module Quản lý Tồn Kho (Inventory) hiện đang bị tắt.');
    }
  }

  /**
   * Đảm bảo luôn có ít nhất một kho mặc định
   */
  static async ensureDefaultLocation(): Promise<IInventoryLocation> {
    await connectDB();
    let location = await InventoryLocation.findOne({ isDefault: true });
    if (!location) {
      location = await InventoryLocation.findOne({});
    }

    if (!location) {
      location = await InventoryLocation.create({
        name: 'Kho Tổng Trung Tâm',
        code: 'KHO-CHINH',
        address: 'Trung tâm phân phối chính',
        isDefault: true,
        status: 'active',
      });
    }

    return location;
  }

  /**
   * Điều chỉnh số lượng tồn kho với Optimistic Concurrency Control và ghi Log bắt buộc
   */
  static async adjustInventory(params: {
    productId: string;
    locationId?: string;
    changeAmount: number; // Có thể dương (nhập) hoặc âm (xuất)
    reason?: string;
    expectedVersion?: number;
    userId?: string;
  }): Promise<{ item: IInventoryItem; log: any }> {
    await this.assertModuleEnabled();
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.productId)) {
      throw new Error('ID Sản phẩm không hợp lệ.');
    }

    const prodObjId = new mongoose.Types.ObjectId(params.productId);
    let locObjId: mongoose.Types.ObjectId;

    if (params.locationId && mongoose.Types.ObjectId.isValid(params.locationId)) {
      locObjId = new mongoose.Types.ObjectId(params.locationId);
    } else {
      const defaultLoc = await this.ensureDefaultLocation();
      locObjId = defaultLoc._id as mongoose.Types.ObjectId;
    }

    // Tìm hoặc khởi tạo bản ghi tồn kho
    let item = await InventoryItem.findOne({ productId: prodObjId, locationId: locObjId });
    if (!item) {
      item = new InventoryItem({
        productId: prodObjId,
        locationId: locObjId,
        quantity: 0,
        reservedQuantity: 0,
        dataVersion: 1,
      });
    }

    // 1. Kiểm tra Optimistic Concurrency Control
    if (params.expectedVersion !== undefined && item.dataVersion !== params.expectedVersion) {
      throw new Error(
        `Xung đột tồn kho (Optimistic Lock Conflict): Dữ liệu tồn kho vừa được cập nhật bởi một phiên khác (Hệ thống: v${item.dataVersion}, Hiện tại của bạn: v${params.expectedVersion}). Vui lòng tải lại!`
      );
    }

    const prevQty = item.quantity;
    const newQty = prevQty + params.changeAmount;

    if (newQty < 0) {
      throw new Error(`Số lượng tồn kho không đủ (Hiện có: ${prevQty}, Yêu cầu xuất: ${Math.abs(params.changeAmount)}).`);
    }

    item.quantity = newQty;
    item.dataVersion = item.dataVersion + 1;
    await item.save();

    // 2. Bắt buộc tạo bản ghi lịch sử thay đổi tồn kho (Audit Log)
    const log = await InventoryLog.create({
      productId: prodObjId,
      locationId: locObjId,
      action: 'adjust',
      quantityChange: params.changeAmount,
      previousQuantity: prevQty,
      newQuantity: newQty,
      reason: params.reason || (params.changeAmount > 0 ? 'Nhập kho thủ công' : 'Xuất kho thủ công'),
      performedBy: params.userId && mongoose.Types.ObjectId.isValid(params.userId)
        ? new mongoose.Types.ObjectId(params.userId)
        : undefined,
    });

    return { item, log };
  }

  /**
   * Thiết lập số lượng tồn kho trực tiếp
   */
  static async setInventory(params: {
    productId: string;
    locationId?: string;
    targetQuantity: number;
    reason?: string;
    expectedVersion?: number;
    userId?: string;
  }) {
    await this.assertModuleEnabled();
    await connectDB();

    if (params.targetQuantity < 0) {
      throw new Error('Số lượng tồn kho không được âm.');
    }

    const prodObjId = new mongoose.Types.ObjectId(params.productId);
    let locObjId: mongoose.Types.ObjectId;

    if (params.locationId && mongoose.Types.ObjectId.isValid(params.locationId)) {
      locObjId = new mongoose.Types.ObjectId(params.locationId);
    } else {
      const defaultLoc = await this.ensureDefaultLocation();
      locObjId = defaultLoc._id as mongoose.Types.ObjectId;
    }

    let item = await InventoryItem.findOne({ productId: prodObjId, locationId: locObjId });
    if (!item) {
      item = new InventoryItem({
        productId: prodObjId,
        locationId: locObjId,
        quantity: 0,
        reservedQuantity: 0,
        dataVersion: 1,
      });
    }

    if (params.expectedVersion !== undefined && item.dataVersion !== params.expectedVersion) {
      throw new Error(
        `Xung đột tồn kho (Optimistic Lock Conflict): Dữ liệu tồn kho vừa được cập nhật bởi một phiên khác.`
      );
    }

    const prevQty = item.quantity;
    const diff = params.targetQuantity - prevQty;

    item.quantity = params.targetQuantity;
    item.dataVersion = item.dataVersion + 1;
    await item.save();

    const log = await InventoryLog.create({
      productId: prodObjId,
      locationId: locObjId,
      action: 'set',
      quantityChange: diff,
      previousQuantity: prevQty,
      newQuantity: params.targetQuantity,
      reason: params.reason || 'Kiểm kê điều chỉnh số lượng thực tế',
      performedBy: params.userId && mongoose.Types.ObjectId.isValid(params.userId)
        ? new mongoose.Types.ObjectId(params.userId)
        : undefined,
    });

    return { item, log };
  }

  /**
   * Lấy chi tiết tồn kho theo sản phẩm
   */
  static async getInventoryByProduct(productId: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(productId)) return [];

    return InventoryItem.find({ productId: new mongoose.Types.ObjectId(productId) })
      .populate('locationId', 'name code address isDefault')
      .lean();
  }

  /**
   * Lấy lịch sử biến động kho của sản phẩm
   */
  static async getProductInventoryLogs(productId: string, limit: number = 20) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(productId)) return [];

    return InventoryLog.find({ productId: new mongoose.Types.ObjectId(productId) })
      .populate('locationId', 'name code')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Báo cáo tồn kho toàn hệ thống
   */
  static async listInventory(params?: { page?: number; limit?: number }) {
    await this.assertModuleEnabled();
    await connectDB();
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryItem.find({})
        .populate({
          path: 'productId',
          select: '_id name sku price status thumbnail',
          populate: { path: 'thumbnail', select: '_id fileName thumbnailUrl' },
        })
        .populate('locationId', 'name code address isDefault')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryItem.countDocuments({}),
    ]);

    return {
      items: items.filter((it) => it.productId != null),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
