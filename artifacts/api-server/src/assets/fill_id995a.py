#!/usr/bin/env python3
"""
Fill the official HK Immigration ID995A PDF form with student data.
Reads JSON from stdin, writes filled PDF bytes to stdout.
"""
import sys, json, os, re, io
from pypdf import PdfReader, PdfWriter

def split_date(val):
    """Split a date string dd/mm/yyyy into (day, month, year)."""
    if not val:
        return '', '', ''
    parts = re.split(r'[/\-\.]', str(val).strip())
    if len(parts) == 3:
        return parts[0].zfill(2), parts[1].zfill(2), parts[2]
    return str(val), '', ''

def main():
    raw = sys.stdin.buffer.read()
    data = json.loads(raw)
    template_path = os.path.join(os.path.dirname(__file__), 'id995a_template.pdf')

    r = PdfReader(template_path)
    r.decrypt('')
    w = PdfWriter()
    w.append(r)

    # ── Date splitting ────────────────────────────────────────────────────────
    dob_d, dob_m, dob_y = split_date(data.get('dateOfBirth', ''))
    doi_d, doi_m, doi_y = split_date(data.get('dateOfIssue', ''))
    doe_d, doe_m, doe_y = split_date(data.get('dateOfExpiry', ''))
    per_d, per_m, per_y = split_date(data.get('permittedToRemainUntil', ''))

    # ── HK ID splitting  e.g. "A123456(7)" → alpha, digits, check digit ──────
    hkid_raw = data.get('hkIdNumber', '')
    hkid_alpha, hkid_digit, hkid_chkd = '', '', ''
    m = re.match(r'^([A-Za-z]{1,2})(\d+)\(?(\d)\)?$', hkid_raw.strip())
    if m:
        hkid_alpha = m.group(1).upper()
        hkid_digit = m.group(2)
        hkid_chkd  = m.group(3)
    elif hkid_raw:
        # store raw if format doesn't match
        hkid_alpha = hkid_raw

    # ── Build the universal field map (applies to every page) ─────────────────
    sex     = data.get('sex', '')
    marital = data.get('maritalStatus', '')
    has_pr  = data.get('hasPermanentResidence', '')
    hk_stat = data.get('statusInHK', '')

    fields = {
        # Personal particulars
        'chnName':       data.get('nameChineseApplicant', ''),
        'maidSurname':   data.get('maidenSurname', ''),
        'engSurname':    data.get('surnameEnglish', ''),
        'engName':       data.get('givenNamesEnglish', ''),
        'alias':         data.get('alias', ''),
        'dobDay':        dob_d,
        'dobMth':        dob_m,
        'dobYr':         dob_y,
        'birthPlace':    data.get('placeOfBirth', ''),
        'national':      data.get('nationality', ''),
        'otherMarital':  data.get('maritalStatusOther', ''),
        'hkidAlpha':     hkid_alpha,
        'hkidDigit':     hkid_digit,
        'hkidChkD':      hkid_chkd,
        'mainlandID':    data.get('mainlandIdNumber', ''),
        'travelDocType': data.get('travelDocType', ''),
        'travelDocNo':   data.get('travelDocNumber', ''),
        'issuePlace':    data.get('placeOfIssue', ''),
        'doiDay':        doi_d,
        'doiMth':        doi_m,
        'doiYr':         doi_y,
        'doeDay':        doe_d,
        'doeMth':        doe_m,
        'doeYr':         doe_y,
        'appEmail':      data.get('emailAddress', ''),
        'appTel':        data.get('contactPhone', ''),
        'faxNo':         data.get('faxNumber', ''),
        'domCountry':    data.get('countryOfDomicile', ''),
        'resYear':       str(data.get('lengthOfResidenceYears', '')),
        'resMonth':      str(data.get('lengthOfResidenceMonths', '')),
        'appOccupation': data.get('occupation', ''),
        'curEmployer':   data.get('currentEmployerName', ''),
        'curEmpAddr':    data.get('currentEmployerAddress', ''),
        'perDay':        per_d,
        'perMth':        per_m,
        'perYr':         per_y,
        'others':        data.get('statusInHKOther', ''),
        'presentAddr1':  data.get('presentAddress1', ''),
        'presentAddr2':  data.get('presentAddress2', ''),
        'presentAddr3':  data.get('presentAddress3', ''),
        'permanAddr1':   data.get('permanentAddress1', ''),
        'permanAddr2':   data.get('permanentAddress2', ''),
        'permanAddr3':   data.get('permanentAddress3', ''),

        # Page 2 – proposed study
        'entryDate':     data.get('proposedDateOfEntry', ''),
        'stayDuration':  data.get('proposedDurationOfStay', ''),
        'schNameAddr':   data.get('schoolNameAddress', ''),
        'classAttend':   data.get('classToAttend', ''),

        # Education history rows (up to 5)
        'schName1':    data.get('edu1SchoolName', ''),
        'majorSubj1':  data.get('edu1MajorSubject', ''),
        'degree1':     data.get('edu1Degree', ''),
        'fromPeriod1': data.get('edu1From', ''),
        'toPeriod1':   data.get('edu1To', ''),
        'schName2':    data.get('edu2SchoolName', ''),
        'majorSubj2':  data.get('edu2MajorSubject', ''),
        'degree2':     data.get('edu2Degree', ''),
        'fromPeriod2': data.get('edu2From', ''),
        'toPeriod2':   data.get('edu2To', ''),
        'schName3':    data.get('edu3SchoolName', ''),
        'majorSubj3':  data.get('edu3MajorSubject', ''),
        'degree3':     data.get('edu3Degree', ''),
        'fromPeriod3': data.get('edu3From', ''),
        'toPeriod3':   data.get('edu3To', ''),

        # Financial fields
        'schFeeCost':  data.get('schoolFeeCost', ''),
        'accomCost':   data.get('accommodationCost', ''),
        'totalCost':   data.get('totalCost', ''),

        # Sex checkboxes
        'toggle_3': 'Yes' if sex == 'Male'   else 'Off',
        'toggle_4': 'Yes' if sex == 'Female' else 'Off',

        # Marital status checkboxes
        'toggle_5':  'Yes' if marital == 'Bachelor/Spinster' else 'Off',
        'toggle_6':  'Yes' if marital == 'Married'           else 'Off',
        'toggle_7':  'Yes' if marital == 'Divorced'          else 'Off',
        'toggle_8':  'Yes' if marital == 'Separated'         else 'Off',
        'toggle_9':  'Yes' if marital == 'Widowed'           else 'Off',
        'toggle_10': 'Yes' if marital == 'Others'            else 'Off',

        # Permanent residence
        'toggle_11': 'Yes' if has_pr == 'Yes' else 'Off',
        'toggle_12': 'Yes' if has_pr == 'No'  else 'Off',

        # HK status text markers
        'fill_2': 'Yes' if hk_stat == 'Employment'           else '',
        'fill_3': 'Yes' if hk_stat == 'Residence/Dependant'  else '',
        'fill_4': 'Yes' if hk_stat == 'Visitor'              else '',
        'fill_5': 'Yes' if hk_stat == 'Others'               else '',
    }

    # ── Apply fields to every page (form fields can be on any page) ───────────
    for i, page in enumerate(w.pages):
        try:
            w.update_page_form_field_values(page, fields, auto_regenerate=True)
        except Exception as e:
            sys.stderr.write(f'Page {i} fill warning: {e}\n')

    buf = io.BytesIO()
    w.write(buf)
    sys.stdout.buffer.write(buf.getvalue())

if __name__ == '__main__':
    main()
