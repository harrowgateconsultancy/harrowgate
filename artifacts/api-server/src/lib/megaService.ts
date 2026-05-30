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

export async function syncStudentToMega(submission: {
  id: number; name: string; email: string | null; dateOfBirth: string;
  passportNumber: string; status: string; adminNotes: string | null;
  createdAt: Date | string; immigrationRefNumber?: string | null;
  nationality?: string | null; interviewDateTime?: string | null;
  uniInterviewDateTime?: string | null;
}, documents: { fileName: string; fileUrl: string; documentType: string }[]): Promise<{ synced: number; failed: number }> {
  const storage = await getMegaStorage();
  const rootFolder = await getOrCreateFolder(storage, MEGA_FOLDER);
  const safeName = submission.name.replace(/[^a-zA-Z0-9 _-]/g, "_").trim() || "Unknown";
  const subfolderName = `Student_${submission.id}_${safeName}`;
  const subfolder = await getOrCreateSubfolder(rootFolder, subfolderName);

  const profileLines = [
    "HARROWGATE Consultancy — Student Profile",
    "========================================",
    `Name:              ${submission.name}`,
    `Passport No:       ${submission.passportNumber}`,
    `Date of Birth:     ${submission.dateOfBirth}`,
    `Nationality:       ${submission.nationality || "—"}`,
    `Email:             ${submission.email || "—"}`,
    `Status:            ${submission.status}`,
    `Immigration Ref:   ${submission.immigrationRefNumber || "—"}`,
    `Mock Interview:    ${submission.interviewDateTime || "—"}`,
    `Uni Interview:     ${submission.uniInterviewDateTime || "—"}`,
    `Submitted:         ${new Date(submission.createdAt).toISOString()}`,
    `Admin Notes:       ${submission.adminNotes || "—"}`,
    "",
    `Documents (${documents.length} total):`,
    ...documents.map((d, i) => `  ${i + 1}. [${d.documentType}] ${d.fileName}`),
  ];
  const profileBuffer = Buffer.from(profileLines.join("\n"), "utf-8");
  await subfolder.upload({ name: "Student_Profile.txt", size: profileBuffer.length }, profileBuffer).complete;

  let synced = 0;
  let failed = 0;
  const objectStorageService = new ObjectStorageService();
  for (const doc of documents) {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(doc.fileUrl);
      const response = await objectStorageService.downloadObject(objectFile, 0);
      if (!response.body) throw new Error("Empty body");
      const chunks: Buffer[] = [];
      const reader = (response.body as ReadableStream<Uint8Array>).getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
      }
      const buf = Buffer.concat(chunks);
      const uploadName = `[${doc.documentType}] ${doc.fileName}`;
      await subfolder.upload({ name: uploadName, size: buf.length }, buf).complete;
      console.log(`[MEGA] Synced ${uploadName}`);
      synced++;
    } catch (err) {
      console.error(`[MEGA] Failed to sync ${doc.fileName}:`, err);
      failed++;
    }
  }
  return { synced, failed };
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
