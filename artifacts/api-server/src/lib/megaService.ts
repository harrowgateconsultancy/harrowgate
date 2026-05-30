import { Storage } from "megajs";
import { ObjectStorageService } from "./objectStorage";

const MEGA_EMAIL = "harrowgateconsultancy@gmail.com";
const MEGA_FOLDER = "HARROWGATE Documents";

let storageInstance: Storage | null = null;

async function getMegaStorage(): Promise<Storage> {
  if (storageInstance) return storageInstance;

  const password = process.env.MEGA_PASSWORD;
  if (!password) throw new Error("MEGA_PASSWORD not set");

  const storage = new Storage({ email: MEGA_EMAIL, password });
  await new Promise<void>((resolve, reject) => {
    storage.on("ready", () => resolve());
    storage.on("error", (err: any) => reject(err));
  });

  storageInstance = storage;
  return storage;
}

async function getOrCreateFolder(storage: Storage, folderName: string): Promise<any> {
  const root = storage.root;
  const children = root.children ?? [];
  const existing = children.find((n: any) => n.name === folderName && n.directory);
  if (existing) return existing;
  return await root.mkdir(folderName);
}

async function getOrCreateSubfolder(parent: any, name: string): Promise<any> {
  const children = parent.children ?? [];
  const existing = children.find((n: any) => n.name === name && n.directory);
  if (existing) return existing;
  return await parent.mkdir(name);
}

export async function uploadToMega({
  submissionId,
  studentName,
  fileName,
  fileUrl,
  documentType,
}: {
  submissionId: number;
  studentName: string;
  fileName: string;
  fileUrl: string;
  documentType: string;
}): Promise<void> {
  try {
    const objectStorageService = new ObjectStorageService();
    const objectFile = await objectStorageService.getObjectEntityFile(fileUrl);
    const response = await objectStorageService.downloadObject(objectFile, 0);
    if (!response.body) throw new Error("Empty file body from object storage");

    const chunks: Buffer[] = [];
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
    const fileBuffer = Buffer.concat(chunks);

    const storage = await getMegaStorage();
    const rootFolder = await getOrCreateFolder(storage, MEGA_FOLDER);

    const safeName = studentName.replace(/[^a-zA-Z0-9 _-]/g, "_").trim() || "Unknown";
    const subfolderName = `Student_${submissionId}_${safeName}`;
    const subfolder = await getOrCreateSubfolder(rootFolder, subfolderName);

    await subfolder.upload({ name: fileName, size: fileBuffer.length }, fileBuffer).complete;

    console.log(`[MEGA] Uploaded ${fileName} → ${MEGA_FOLDER}/${subfolderName}/${fileName}`);
  } catch (err) {
    console.error(`[MEGA] Upload failed for ${fileName}:`, err);
  }
}
