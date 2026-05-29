import { google } from "googleapis";
import { ObjectStorageService } from "./objectStorage";

const objectStorageService = new ObjectStorageService();

const SHEET_NAME = "Students";
const SHEET_HEADERS = [
  "ID", "Name", "Email", "Passport Number", "Date of Birth",
  "Nationality", "Phone", "Current Address", "Status",
  "Immigration Ref #", "Drive Folder URL", "Created At", "Updated At",
];

function parseServiceAccountJson(raw: string): Record<string, any> | null {
  // Try direct parse first
  try { return JSON.parse(raw); } catch {}
  // Try unescaping once (double-stringified)
  try { return JSON.parse(JSON.parse(raw)); } catch {}
  // Try trimming surrounding quotes
  try { return JSON.parse(raw.trim().replace(/^"|"$/g, "")); } catch {}
  // Try replacing escaped newlines in private_key (common Replit quirk)
  try { return JSON.parse(raw.replace(/\\n/g, "\n")); } catch {}
  return null;
}

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const credentials = parseServiceAccountJson(raw);
  if (!credentials) {
    console.error("[Google] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON — check the secret value is the raw JSON file contents");
    return null;
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
}

function extractId(raw: string): string {
  // Strip full Drive/Sheets URLs down to bare ID
  // Drive: https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
  const driveMatch = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return driveMatch[1];
  // Sheets: https://docs.google.com/spreadsheets/d/SHEET_ID/edit
  const sheetsMatch = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch) return sheetsMatch[1];
  // Already a bare ID
  return raw.trim();
}

function getDriveFolderId(): string | null {
  const v = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  return v ? extractId(v) : null;
}

function getSheetsId(): string | null {
  const v = process.env.GOOGLE_SHEETS_ID;
  return v ? extractId(v) : null;
}

function isConfigured(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !!getDriveFolderId();
}

// ── Drive helpers ──────────────────────────────────────────────────────────────

async function getOrCreateFolder(drive: any, name: string, parentId: string): Promise<string> {
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  const existing = await drive.files.list({
    q, fields: "files(id,name)", spaces: "drive",
    supportsAllDrives: true, includeItemsFromAllDrives: true,
  });
  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id as string;
  }
  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
    supportsAllDrives: true,
  });
  return created.data.id as string;
}

export async function ensureStudentFolder(submissionId: number, studentName: string): Promise<string | null> {
  if (!isConfigured()) return null;
  const auth = getAuth();
  if (!auth) return null;
  try {
    const drive = google.drive({ version: "v3", auth });
    const rootId = getDriveFolderId()!;
    const folderName = `[${submissionId}] ${studentName}`;
    const folderId = await getOrCreateFolder(drive, folderName, rootId);
    return `https://drive.google.com/drive/folders/${folderId}`;
  } catch (err) {
    console.error("[Google Drive] ensureStudentFolder failed:", err);
    return null;
  }
}

export async function uploadDocumentToDrive(opts: {
  submissionId: number;
  studentName: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
}): Promise<void> {
  if (!isConfigured()) return;
  const auth = getAuth();
  if (!auth) return;
  try {
    const drive = google.drive({ version: "v3", auth });
    const rootId = getDriveFolderId()!;
    const folderName = `[${opts.submissionId}] ${opts.studentName}`;
    const folderId = await getOrCreateFolder(drive, folderName, rootId);

    // Download from object storage
    const objectFile = await objectStorageService.getObjectEntityFile(opts.fileUrl);
    const response = await objectStorageService.downloadObject(objectFile, 0);
    const arrayBuf = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const { Readable } = await import("stream");
    const stream = Readable.from(buffer);

    // Use docType as prefix so files are self-describing
    const uploadName = `${opts.documentType}__${opts.fileName}`;

    // Check if a file with this docType prefix already exists (replace on re-upload)
    const q = `name contains '${opts.documentType}__' and '${folderId}' in parents and trashed=false`;
    const existing = await drive.files.list({
      q, fields: "files(id)", spaces: "drive",
      supportsAllDrives: true, includeItemsFromAllDrives: true,
    });
    if (existing.data.files && existing.data.files.length > 0) {
      for (const f of existing.data.files) {
        await drive.files.delete({ fileId: f.id as string, supportsAllDrives: true }).catch(() => {});
      }
    }

    await drive.files.create({
      requestBody: { name: uploadName, parents: [folderId] },
      media: { mimeType: opts.mimeType || "application/octet-stream", body: stream },
      fields: "id",
      supportsAllDrives: true,
    });
  } catch (err) {
    console.error("[Google Drive] uploadDocumentToDrive failed:", err);
  }
}

// ── Sheets helpers ─────────────────────────────────────────────────────────────

async function getOrCreateSheet(sheets: any, spreadsheetId: string): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetExists = meta.data.sheets?.some((s: any) => s.properties?.title === SHEET_NAME);
  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [SHEET_HEADERS] },
    });
  }
}

async function findRowById(sheets: any, spreadsheetId: string, submissionId: number): Promise<number | null> {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAME}!A:A` });
  const rows: string[][] = res.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === String(submissionId)) return i + 1; // 1-indexed sheet row
  }
  return null;
}

export async function upsertStudentRow(opts: {
  submissionId: number;
  name: string;
  email?: string | null;
  passportNumber?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  phone?: string | null;
  currentAddress?: string | null;
  status: string;
  immigrationRefNumber?: string | null;
  driveFolderUrl?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}): Promise<void> {
  if (!isConfigured()) return;
  const spreadsheetId = getSheetsId();
  if (!spreadsheetId) return;
  const auth = getAuth();
  if (!auth) return;
  try {
    const sheets = google.sheets({ version: "v4", auth });
    await getOrCreateSheet(sheets, spreadsheetId);

    const row = [
      String(opts.submissionId),
      opts.name || "",
      opts.email || "",
      opts.passportNumber || "",
      opts.dateOfBirth || "",
      opts.nationality || "",
      opts.phone || "",
      opts.currentAddress || "",
      opts.status || "",
      opts.immigrationRefNumber || "",
      opts.driveFolderUrl || "",
      opts.createdAt ? new Date(opts.createdAt).toISOString() : "",
      opts.updatedAt ? new Date(opts.updatedAt).toISOString() : new Date().toISOString(),
    ];

    const existingRow = await findRowById(sheets, spreadsheetId, opts.submissionId);
    if (existingRow) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A${existingRow}`,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [row] },
      });
    }
  } catch (err) {
    console.error("[Google Sheets] upsertStudentRow failed:", err);
  }
}

export async function deleteStudentRow(submissionId: number): Promise<void> {
  if (!isConfigured()) return;
  const spreadsheetId = getSheetsId();
  if (!spreadsheetId) return;
  const auth = getAuth();
  if (!auth) return;
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const rowIndex = await findRowById(sheets, spreadsheetId, submissionId);
    if (!rowIndex) return;

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = meta.data.sheets?.find((s: any) => s.properties?.title === SHEET_NAME);
    const sheetId = sheet?.properties?.sheetId ?? 0;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: rowIndex - 1, endIndex: rowIndex },
          },
        }],
      },
    });
  } catch (err) {
    console.error("[Google Sheets] deleteStudentRow failed:", err);
  }
}
