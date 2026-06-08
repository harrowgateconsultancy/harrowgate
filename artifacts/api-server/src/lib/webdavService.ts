import { createClient } from "webdav";
import { ObjectStorageService } from "./objectStorage";

const WEBDAV_FOLDER = "HARROWGATE";

function getClient() {
  const url = process.env.WEBDAV_URL;
  const username = process.env.WEBDAV_USERNAME;
  const password = process.env.WEBDAV_PASSWORD;
  if (!url) throw new Error("WEBDAV_URL not configured — set the WEBDAV_URL environment secret");
  return createClient(url, { username: username ?? "", password: password ?? "" });
}

async function ensureDir(client: ReturnType<typeof createClient>, path: string): Promise<void> {
  try {
    const exists = await client.exists(path);
    if (!exists) await client.createDirectory(path);
  } catch {
    // ignore race conditions / already-exists errors
  }
}

export async function syncStudentToWebDav(
  submission: {
    id: number; name: string; email: string | null; dateOfBirth: string;
    passportNumber: string; status: string; adminNotes: string | null;
    createdAt: Date | string; immigrationRefNumber?: string | null;
    nationality?: string | null; interviewDateTime?: string | null;
    uniInterviewDateTime?: string | null;
  },
  documents: { fileName: string; fileUrl: string; documentType: string }[]
): Promise<{ synced: number; failed: number }> {
  const client = getClient();

  const safeName = submission.name.replace(/[^a-zA-Z0-9 _-]/g, "_").trim() || "Unknown";
  const subfolderPath = `${WEBDAV_FOLDER}/Student_${submission.id}_${safeName}`;

  await ensureDir(client, WEBDAV_FOLDER);
  await ensureDir(client, subfolderPath);

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

  await client.putFileContents(
    `${subfolderPath}/Student_Profile.txt`,
    profileLines.join("\n"),
    { overwrite: true }
  );

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
      await client.putFileContents(`${subfolderPath}/${uploadName}`, buf, { overwrite: true });
      console.log(`[WebDAV] Synced ${uploadName}`);
      synced++;
    } catch (err) {
      console.error(`[WebDAV] Failed to sync ${doc.fileName}:`, err);
      failed++;
    }
  }

  return { synced, failed };
}

export async function uploadToWebDav({
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
    const client = getClient();
    const safeName = studentName.replace(/[^a-zA-Z0-9 _-]/g, "_").trim() || "Unknown";
    const subfolderPath = `${WEBDAV_FOLDER}/Student_${submissionId}_${safeName}`;

    await ensureDir(client, WEBDAV_FOLDER);
    await ensureDir(client, subfolderPath);

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
    const uploadName = `[${documentType}] ${fileName}`;
    await client.putFileContents(`${subfolderPath}/${uploadName}`, fileBuffer, { overwrite: true });
    console.log(`[WebDAV] Uploaded ${uploadName} → ${subfolderPath}`);
  } catch (err) {
    console.error(`[WebDAV] Upload failed for ${fileName}:`, err);
  }
}
