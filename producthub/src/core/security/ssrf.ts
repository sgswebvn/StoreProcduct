import { URL } from 'url';

/**
 * Kiểm tra xem URL có an toàn và không trỏ tới mạng nội bộ / private IP (SSRF Protection)
 */
export function isSafeExternalUrl(inputUrl: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(inputUrl);

    // Chỉ cho phép giao thức http hoặc https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Chỉ chấp nhận giao thức HTTP hoặc HTTPS.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Chặn localhost và local loopback
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    ) {
      return { safe: false, reason: 'Không được phép trỏ tới máy chủ nội bộ hoặc localhost.' };
    }

    // Chặn các dải IP Private (RFC 1918 & Link-Local)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const p1 = parseInt(match[1], 10);
      const p2 = parseInt(match[2], 10);

      // 10.0.0.0/8
      if (p1 === 10) return { safe: false, reason: 'Không được phép trỏ tới dải IP 10.x.x.x (Private IP).' };

      // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
      if (p1 === 172 && p2 >= 16 && p2 <= 31) {
        return { safe: false, reason: 'Không được phép trỏ tới dải IP 172.16.x.x - 172.31.x.x (Private IP).' };
      }

      // 192.168.0.0/16
      if (p1 === 192 && p2 === 168) {
        return { safe: false, reason: 'Không được phép trỏ tới dải IP 192.168.x.x (Private IP).' };
      }

      // 169.254.0.0/16 (Link Local / Cloud Metadata như 169.254.169.254)
      if (p1 === 169 && p2 === 254) {
        return { safe: false, reason: 'Không được phép trỏ tới dải IP 169.254.x.x (Cloud Metadata).' };
      }

      // 0.0.0.0
      if (p1 === 0) return { safe: false, reason: 'Địa chỉ IP không hợp lệ.' };
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'Định dạng URL không hợp lệ.' };
  }
}
