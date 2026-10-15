export interface UploadResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  webViewLink?: string;
  thumbnailUrl?: string;
}

export interface StorageProvider {
  name: string;
  isConnected(): Promise<boolean>;
  upload(
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<UploadResult>;
  delete(fileId: string): Promise<boolean>;
  getFileUrl(fileId: string): Promise<string>;
}
