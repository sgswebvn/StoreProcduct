import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectDB } from '@/core/db/connect';
import { Webhook, IWebhook, WebhookEvent } from '../infra/webhook.model';
import { WebhookDeliveryLog } from '../infra/webhook-delivery-log.model';
import { isSafeExternalUrl } from '@/core/security/ssrf';
import { hooks } from '@/core/hooks/hook-system';

export class WebhookService {
  private static isInitialized = false;

  /**
   * Khởi tạo lắng nghe các hooks hệ thống để kích hoạt webhook tương ứng
   */
  static initListeners() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Lắng nghe sự kiện từ HookSystem
    hooks.subscribe('product:created', async (payload) => {
      await WebhookService.dispatch('product.created', payload);
    });

    hooks.subscribe('product:updated', async (payload) => {
      await WebhookService.dispatch('product.updated', payload);
    });

    hooks.subscribe('product:deleted', async (payload) => {
      await WebhookService.dispatch('product.deleted', payload);
    });
  }

  /**
   * Tạo Webhook subscription mới có kiểm tra bảo mật SSRF
   */
  static async createWebhook(params: {
    name: string;
    url: string;
    events: WebhookEvent[];
    secret?: string;
    userId?: string;
  }): Promise<IWebhook> {
    await connectDB();

    // 1. Kiểm tra an toàn SSRF
    const ssrfCheck = isSafeExternalUrl(params.url);
    if (!ssrfCheck.safe) {
      throw new Error(`URL Webhook không an toàn: ${ssrfCheck.reason}`);
    }

    // 2. Tạo secret ngẫu nhiên nếu không cung cấp
    const secret = params.secret || crypto.randomBytes(32).toString('hex');

    const userObjId = params.userId && mongoose.Types.ObjectId.isValid(params.userId)
      ? new mongoose.Types.ObjectId(params.userId)
      : undefined;

    const webhook = new Webhook({
      name: params.name.trim(),
      url: params.url.trim(),
      secret,
      events: params.events && params.events.length > 0 ? params.events : ['product.created', 'product.updated'],
      status: 'active',
      failureCount: 0,
      createdBy: userObjId,
    });

    await webhook.save();
    return webhook;
  }

  /**
   * Ký payload JSON bằng HMAC-SHA256
   */
  static signPayload(secret: string, payload: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Bắn sự kiện Webhook tới các subscribers đã đăng ký
   */
  static async dispatch(event: WebhookEvent, data: any) {
    try {
      await connectDB();
      const webhooks = await Webhook.find({
        status: 'active',
        events: event,
      });

      if (webhooks.length === 0) return;

      const payloadString = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data,
      });

      // Bắn bất đồng bộ tới từng webhook (không block luồng chính)
      for (const wh of webhooks) {
        this.deliver(wh, event, payloadString).catch((err) => {
          console.error(`[WebhookService] Delivery error for ${wh.url}:`, err);
        });
      }
    } catch (err) {
      console.error('[WebhookService] Dispatch error:', err);
    }
  }

  /**
   * Gửi gói tin Webhook kèm chữ ký và timeout
   */
  private static async deliver(
    webhook: IWebhook,
    event: string,
    payloadString: string,
    retryCount: number = 0
  ) {
    const startTime = Date.now();
    const signature = this.signPayload(webhook.secret, payloadString);

    let success = false;
    let statusCode: number | undefined;
    let responseBody: string | undefined;
    let errorMessage: string | undefined;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'StoreProduct-Webhook-Dispatcher/1.0',
          'X-StoreProduct-Event': event,
          'X-StoreProduct-Signature': `sha256=${signature}`,
          'X-StoreProduct-Delivery': new mongoose.Types.ObjectId().toString(),
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      statusCode = res.status;
      const text = await res.text();
      responseBody = text.slice(0, 1000); // Giới hạn 1000 ký tự log

      if (res.ok) {
        success = true;
      } else {
        errorMessage = `Máy chủ đích trả về mã lỗi: ${res.status}`;
      }
    } catch (err: any) {
      errorMessage = err.message || 'Lỗi kết nối / timeout';
    }

    const durationMs = Date.now() - startTime;

    // Ghi log kết quả delivery
    await WebhookDeliveryLog.create({
      webhookId: webhook._id,
      event,
      url: webhook.url,
      statusCode,
      responseBody,
      durationMs,
      success,
      error: errorMessage,
    });

    if (success) {
      await Webhook.findByIdAndUpdate(webhook._id, {
        failureCount: 0,
        lastDeliveredAt: new Date(),
      });
    } else {
      // Retry tối đa 2 lần nữa nếu thất bại
      if (retryCount < 2) {
        setTimeout(() => {
          this.deliver(webhook, event, payloadString, retryCount + 1);
        }, (retryCount + 1) * 2000);
      } else {
        // Tăng failure count
        await Webhook.findByIdAndUpdate(webhook._id, {
          $inc: { failureCount: 1 },
        });
      }
    }
  }

  /**
   * Lấy danh sách Webhooks
   */
  static async listWebhooks() {
    await connectDB();
    return Webhook.find({}).sort({ createdAt: -1 }).lean();
  }

  /**
   * Lấy logs giao vận của một webhook
   */
  static async getDeliveryLogs(webhookId: string, limit: number = 20) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(webhookId)) return [];
    return WebhookDeliveryLog.find({ webhookId: new mongoose.Types.ObjectId(webhookId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Xóa Webhook
   */
  static async deleteWebhook(id: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('ID không hợp lệ.');
    await WebhookDeliveryLog.deleteMany({ webhookId: new mongoose.Types.ObjectId(id) });
    await Webhook.findByIdAndDelete(id);
    return true;
  }
}

// Khởi tạo listeners
WebhookService.initListeners();
