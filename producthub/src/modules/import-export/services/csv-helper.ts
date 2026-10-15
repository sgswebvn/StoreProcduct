/**
 * Bộ phân tích và tạo dữ liệu CSV tuân thủ RFC 4180
 * Hỗ trợ tiếng Việt UTF-8 BOM, ngắt dòng trong dấu ngoặc kép, ký tự escape.
 */

export function parseCSV(text: string): string[][] {
  // Loại bỏ BOM nếu có
  const cleanText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // Bỏ qua ký tự quote kế tiếp
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',' || char === ';') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        // Bỏ qua carriage return
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        // Chỉ thêm dòng nếu có ít nhất 1 trường không rỗng
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function generateCSV(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const escapeCell = (val: any) => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCell).join(',')).join('\r\n');

  // Thêm UTF-8 BOM (\uFEFF) để Excel hiển thị đúng dấu tiếng Việt
  return '\uFEFF' + headerLine + '\r\n' + rowLines;
}
