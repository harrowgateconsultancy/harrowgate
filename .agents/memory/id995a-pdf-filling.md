---
name: IMMD ID995A PDF filling
description: How the official HK Immigration ID995A PDF form is filled programmatically in this project.
---

## The Problem
The official IMMD ID995A PDF (`https://www.immd.gov.hk/pdforms/ID995A.pdf`) is:
- PDF 1.7, AES-encrypted (owner-password encrypted, zero user password)
- Has 341 real AcroForm fields but all in compressed cross-reference streams
- pdf-lib 1.17.1 CANNOT parse it — crashes on getPages(), gets 0 fields
- pypdf alone fails too — requires `cryptography>=3.1` for AES decryption

## The Solution
Use **Python `pypdf` + `cryptography`** packages to fill the PDF:
1. `pip install pypdf cryptography` — both must be installed
2. Script: `artifacts/api-server/src/assets/fill_id995a.py`
3. Route calls it via Node.js `child_process.spawn("python3", [scriptPath])`
4. Data passed as JSON on stdin; filled PDF bytes returned on stdout

## Critical Path Resolution Bug
- API server builds to `dist/index.mjs`; `__dirname` = `artifacts/api-server/dist/`
- `join(__dirname, "../assets/")` resolves to `artifacts/api-server/assets/` (wrong)
- **Fix**: use `join(process.cwd(), "src/assets/fill_id995a.py")` — CWD is always `artifacts/api-server/` regardless of where the built file lives

## Key Field Names (PDF AcroForm)
Text fields: `engSurname`, `engName`, `chnName`, `maidSurname`, `alias`, `dobDay/Mth/Yr`, `birthPlace`, `national`, `hkidAlpha/Digit/ChkD`, `mainlandID`, `travelDocType`, `travelDocNo`, `issuePlace`, `doiDay/Mth/Yr`, `doeDay/Mth/Yr`, `appEmail`, `appTel`, `faxNo`, `domCountry`, `resYear`, `resMonth`, `appOccupation`, `curEmployer`, `curEmpAddr`, `perDay/Mth/Yr`, `presentAddr1/2/3`, `permanAddr1/2/3`, `entryDate`, `stayDuration`, `schNameAddr`, `classAttend`

Button/checkbox fields (set to `"Yes"` to check, `"Off"` to uncheck):
- Sex: `toggle_3` (Male), `toggle_4` (Female)
- Marital: `toggle_5` (Bachelor/Spinster), `toggle_6` (Married), `toggle_7` (Divorced), `toggle_8` (Separated), `toggle_9` (Widowed), `toggle_10` (Others)
- Permanent residence: `toggle_11` (Yes), `toggle_12` (No)

**Why:** pdf-lib is insufficient for government PDFs with AES encryption and compressed xref streams. pypdf with cryptography is the only reliable solution in this stack.
