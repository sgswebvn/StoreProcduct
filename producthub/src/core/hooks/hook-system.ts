type HookCallback = (payload: any) => Promise<void> | void;

export class HookSystem {
  private static instance: HookSystem;
  private listeners: Map<string, Set<HookCallback>> = new Map();

  private constructor() {}

  static getInstance(): HookSystem {
    if (!HookSystem.instance) {
      HookSystem.instance = new HookSystem();
    }
    return HookSystem.instance;
  }

  /**
   * Đăng ký lắng nghe sự kiện
   */
  subscribe(event: string, callback: HookCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Trả về hàm hủy đăng ký (unsubscribe)
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Phát sự kiện tới tất cả các listener
   */
  async emit(event: string, payload?: any): Promise<void> {
    const callbacks = this.listeners.get(event);
    if (!callbacks || callbacks.size === 0) return;

    for (const cb of Array.from(callbacks)) {
      try {
        await cb(payload);
      } catch (err) {
        console.error(`[HookSystem] Error in listener for event "${event}":`, err);
      }
    }
  }

  /**
   * Xóa toàn bộ listeners (dùng cho testing)
   */
  clear(): void {
    this.listeners.clear();
  }
}

export const hooks = HookSystem.getInstance();
