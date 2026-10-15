import mongoose from 'mongoose';
import { connectDB } from '@/core/db/connect';
import { parseCSV, generateCSV } from './csv-helper';
import { ImportLog, IImportRowError } from '../infra/import-log.model';
import Product from '@/modules/products/infra/product.model';
import { ProductService } from '@/modules/products/services/product.service';

export interface CSVProductRow {
  rowNumber: number;
  name: string;
  sku?: string;
  price: number;
  originalPrice?: number;
  shortDescription?: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  tags: string[];
  action: 'create' | 'update';
  isValid: boolean;
  errors: string[];
}

export class ImportExportService {
  /**
   * Phân tích và xem trước file CSV nhập liệu
   */
  static async previewImport(csvText: string): Promise<{
    totalRows: number;
    validCount: number;
    invalidCount: number;
    rows: CSVProductRow[];
  }> {
    await connectDB();
    const rawRows = parseCSV(csvText);

    if (rawRows.length < 2) {
      throw new Error('File CSV không có dữ liệu hoặc thiếu tiêu đề cột.');
    }

    // Tiêu đề dòng 1 (header mapping)
    const headers = rawRows[0].map((h) => h.toLowerCase().trim());
    const nameIdx = headers.findIndex((h) => h === 'name' || h === 'tên' || h === 'tên sản phẩm');
    const skuIdx = headers.findIndex((h) => h === 'sku' || h === 'mã sku');
    const priceIdx = headers.findIndex((h) => h === 'price' || h === 'giá' || h === 'giá bán');
    const origPriceIdx = headers.findIndex((h) => h === 'originalprice' || h === 'giá gốc' || h === 'giá niêm yết');
    const shortDescIdx = headers.findIndex((h) => h === 'shortdescription' || h === 'mô tả ngắn');
    const descIdx = headers.findIndex((h) => h === 'description' || h === 'mô tả chi tiết');
    const statusIdx = headers.findIndex((h) => h === 'status' || h === 'trạng thái');
    const tagsIdx = headers.findIndex((h) => h === 'tags' || h === 'thẻ');

    if (nameIdx === -1) {
      throw new Error('File CSV bắt buộc phải có cột "name" (hoặc "Tên sản phẩm").');
    }

    const dataLines = rawRows.slice(1, 5001); // Giới hạn tối đa 5000 dòng

    // Lấy trước toàn bộ SKU có trong hệ thống để xác định action create vs update
    const allSkusInFile = dataLines
      .map((r) => (skuIdx !== -1 ? r[skuIdx]?.trim().toUpperCase() : ''))
      .filter(Boolean);

    const existingSkus = new Set<string>();
    if (allSkusInFile.length > 0) {
      const existingProducts = await Product.find({ sku: { $in: allSkusInFile } }).select('sku').lean();
      existingProducts.forEach((p) => {
        if (p.sku) existingSkus.add(p.sku.toUpperCase());
      });
    }

    const previewRows: CSVProductRow[] = [];

    dataLines.forEach((row, index) => {
      const rowNumber = index + 2; // Dòng 1 là header
      const name = row[nameIdx]?.trim() || '';
      const sku = skuIdx !== -1 && row[skuIdx] ? row[skuIdx].trim().toUpperCase() : undefined;
      const rawPrice = priceIdx !== -1 ? row[priceIdx]?.replace(/[^\d.-]/g, '') : '0';
      const rawOrigPrice = origPriceIdx !== -1 ? row[origPriceIdx]?.replace(/[^\d.-]/g, '') : '0';
      const price = Number(rawPrice) || 0;
      const originalPrice = Number(rawOrigPrice) || 0;
      const shortDescription = shortDescIdx !== -1 ? row[shortDescIdx]?.trim() : undefined;
      const description = descIdx !== -1 ? row[descIdx]?.trim() : undefined;
      const rawStatus = statusIdx !== -1 ? row[statusIdx]?.trim().toLowerCase() : 'draft';
      const status: 'draft' | 'active' | 'archived' =
        rawStatus === 'active' || rawStatus === 'archived' ? rawStatus : 'draft';
      const tags = tagsIdx !== -1 && row[tagsIdx]
        ? row[tagsIdx].split(/[,;|]/).map((t) => t.trim()).filter(Boolean)
        : [];

      const errors: string[] = [];
      if (!name) errors.push('Tên sản phẩm không được để trống.');
      if (price < 0) errors.push('Giá bán không được âm.');

      const action = sku && existingSkus.has(sku) ? 'update' : 'create';

      previewRows.push({
        rowNumber,
        name,
        sku,
        price,
        originalPrice,
        shortDescription,
        description,
        status,
        tags,
        action,
        isValid: errors.length === 0,
        errors,
      });
    });

    const validCount = previewRows.filter((r) => r.isValid).length;
    const invalidCount = previewRows.filter((r) => !r.isValid).length;

    return {
      totalRows: previewRows.length,
      validCount,
      invalidCount,
      rows: previewRows,
    };
  }

  /**
   * Thực thi nhập dữ liệu vào CSDL
   */
  static async executeImport(
    rows: CSVProductRow[],
    fileName: string,
    userId?: string
  ) {
    await connectDB();

    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: IImportRowError[] = [];

    for (const row of rows) {
      if (!row.isValid) {
        errorCount++;
        errors.push({
          row: row.rowNumber,
          sku: row.sku,
          name: row.name,
          error: row.errors.join(', '),
        });
        continue;
      }

      try {
        if (row.action === 'update' && row.sku) {
          const existing = await Product.findOne({ sku: row.sku });
          if (existing) {
            await ProductService.update(
              existing._id.toString(),
              {
                name: row.name,
                price: row.price,
                originalPrice: row.originalPrice,
                shortDescription: row.shortDescription,
                description: row.description,
                status: row.status,
                tags: row.tags,
                dataVersion: existing.dataVersion,
              },
              userId
            );
            updatedCount++;
          } else {
            // Nếu không tìm thấy thì tạo mới
            await ProductService.create(
              {
                name: row.name,
                sku: row.sku,
                price: row.price,
                originalPrice: row.originalPrice,
                shortDescription: row.shortDescription,
                description: row.description,
                status: row.status,
                tags: row.tags,
                categories: [],
              },
              userId
            );
            createdCount++;
          }
        } else {
          // Tạo mới
          await ProductService.create(
            {
              name: row.name,
              sku: row.sku,
              price: row.price,
              originalPrice: row.originalPrice,
              shortDescription: row.shortDescription,
              description: row.description,
              status: row.status,
              tags: row.tags,
              categories: [],
            },
            userId
          );
          createdCount++;
        }
      } catch (err: any) {
        errorCount++;
        errors.push({
          row: row.rowNumber,
          sku: row.sku,
          name: row.name,
          error: err.message || 'Lỗi lưu sản phẩm vào CSDL.',
        });
      }
    }

    const successCount = createdCount + updatedCount;

    // Lưu Log vào CSDL
    const log = await ImportLog.create({
      fileName,
      totalRows: rows.length,
      successCount,
      createdCount,
      updatedCount,
      errorCount,
      rowErrors: errors,
      importedBy: userId && mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : undefined,
    });

    return {
      logId: log._id,
      totalRows: rows.length,
      successCount,
      createdCount,
      updatedCount,
      errorCount,
      errors,
    };
  }

  /**
   * Xuất danh sách sản phẩm ra định dạng CSV chuẩn UTF-8
   */
  static async exportProducts(params?: {
    status?: 'active' | 'draft' | 'archived';
    category?: string;
  }): Promise<string> {
    await connectDB();
    const query: any = {};
    if (params?.status) query.status = params.status;
    if (params?.category && mongoose.Types.ObjectId.isValid(params.category)) {
      query.categories = new mongoose.Types.ObjectId(params.category);
    }

    const products = await Product.find(query)
      .populate('categories', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Tên sản phẩm',
      'Mã SKU',
      'Giá bán',
      'Giá gốc (Niêm yết)',
      'Trạng thái',
      'Danh mục',
      'Thẻ (Tags)',
      'Mô tả ngắn',
      'Ngày tạo',
    ];

    const rows = products.map((p) => [
      p.name,
      p.sku || '',
      p.price || 0,
      p.originalPrice || 0,
      p.status,
      (p.categories || []).map((c: any) => c.name).join('; '),
      (p.tags || []).join('; '),
      p.shortDescription || '',
      p.createdAt ? new Date(p.createdAt).toISOString() : '',
    ]);

    return generateCSV(headers, rows);
  }

  /**
   * Lấy lịch sử các lần Import
   */
  static async listImportLogs(limit: number = 20) {
    await connectDB();
    return ImportLog.find({})
      .populate('importedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}
