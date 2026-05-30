import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Readable } from "stream";

export const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || "/data/uploads";

export class LocalStorageFile {
  constructor(
    public readonly localPath: string,
    public readonly mimeType: string = "application/octet-stream"
  ) {}

  async getMetadata(): Promise<[{ size: number; contentType: string }]> {
    const stat = await fs.promises.stat(this.localPath);
    return [{ size: stat.size, contentType: this.mimeType }];
  }

  createReadStream(): NodeJS.ReadableStream {
    return fs.createReadStream(this.localPath);
  }
}

export class LocalStorageService {
  async ensureDir(): Promise<void> {
    await fs.promises.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  }

  async getUploadInfo(host: string): Promise<{ uploadURL: string; objectPath: string }> {
    await this.ensureDir();
    const id = randomUUID();
    const objectPath = `/objects/uploads/${id}`;
    const scheme = host.includes("localhost") ? "http" : "https";
    const uploadURL = `${scheme}://${host}/api/storage/uploads/direct/${id}`;
    return { uploadURL, objectPath };
  }

  async saveFile(id: string, data: Buffer): Promise<void> {
    await this.ensureDir();
    const filePath = path.join(LOCAL_UPLOAD_DIR, id);
    await fs.promises.writeFile(filePath, data);
  }

  async getFile(objectPath: string): Promise<LocalStorageFile> {
    const id = objectPath.replace(/^\/objects\/uploads\//, "");
    const filePath = path.join(LOCAL_UPLOAD_DIR, id);
    try {
      await fs.promises.access(filePath);
    } catch {
      throw new Error("Local file not found: " + filePath);
    }
    return new LocalStorageFile(filePath);
  }

  downloadFile(file: LocalStorageFile, cacheTtlSec = 3600): Response {
    const nodeStream = file.createReadStream() as Readable;
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    return new Response(webStream, {
      headers: {
        "Content-Type": file.mimeType,
        "Cache-Control": `private, max-age=${cacheTtlSec}`,
      },
    });
  }
}

export function isLocalStorageMode(): boolean {
  return !process.env.PRIVATE_OBJECT_DIR;
}
