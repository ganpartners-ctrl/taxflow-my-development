"""
Coordinate-based Capital Allowance Schedule extractor.

Reads the "CAPITAL ALLOWANCE SCHEDULE" detail pages of a Malaysian tax
computation PDF (LHDN Schedule 3 format) using pdfplumber WORD POSITIONS
(x0/top), not line-regex -- because the source PDF wraps multi-line asset
descriptions BELOW the numeric row, and pure text-line regex has no way to
know a wrapped continuation line belongs to the row above it, not below.

Verified against two different tax agents' output (AILS SDN BHD / LIM TANG
TAX SERVICES, and HARVARD STANDARD BUILDERS SDN BHD / WONG CHAU HWA & CO)
-- both use the identical column template, confirming this is a standard
tax-computation software layout, not firm-specific.
"""
import re
import sys
import json
from collections import defaultdict
import pdfplumber

NUM_RE = re.compile(r'^-$|^\(?[\d,]+(?:\.\d+)?\)?$')


def to_num(tok):
    if tok is None:
        return 0.0
    tok = tok.strip()
    if tok in ('', '-'):
        return 0.0
    neg = tok.startswith('(') and tok.endswith(')')
    tok = tok.strip('()').replace(',', '')
    try:
        v = float(tok)
    except ValueError:
        return 0.0
    return -v if neg else v


CATEGORY_WORDS = [
    'computer equipment', 'computer', 'signboard', 'motor vehicle', 'motor vehicles',
    'office equipment', 'furniture and fittings', 'furniture', 'renovation',
    'electrical installation', 'plant and machinery', 'machinery', 'small value assets',
    'freehold land and building', 'leasehold land and building', 'building',
    'air conditioner', 'software', 'equipment', 'signboards',
]


def is_category_header(text):
    t = text.strip().lower()
    if not t or len(t) > 40:
        return False
    return any(t == w or t.startswith(w) for w in CATEGORY_WORDS)


def group_lines(words, y_tol=3):
    lines = defaultdict(list)
    for w in words:
        key = round(w['top'] / y_tol) * y_tol
        lines[key].append(w)
    out = []
    for y in sorted(lines):
        ws = sorted(lines[y], key=lambda w: w['x0'])
        out.append((y, ws))
    return out


# Column bins as (field_name, x0_lower_bound, x0_upper_bound) -- derived
# from the header ruler row ('%','RM' labels) plus observed value
# positions across both reference documents. A token is assigned to a
# field by which bin its x0 falls in, NOT by left-to-right order --
# because continuation-year rows for the same asset can OMIT a column
# entirely (no '-' placeholder), which would silently shift every later
# value one slot left/right under naive positional parsing.
COLUMN_BINS = [
    ('yearAcquired', 0, 213),
    ('iaRate', 213, 240),
    ('originalCost', 240, 290),
    ('qeBF', 290, 330),
    ('qeAdd', 330, 375),
    ('qeDisp', 375, 420),
    ('qeCF', 420, 467),
    ('aaRate', 467, 495),
    ('reBF', 495, 536),
    ('reAdd', 536, 582),
    ('reDisp', 582, 630),
    ('initial', 630, 675),
    ('annual', 675, 720),
    ('allowable', 720, 765),
    ('reCF', 765, 900),
]


def assign_column(x0):
    for name, lo, hi in COLUMN_BINS:
        if lo <= x0 < hi:
            return name
    return None


def parse_ca_schedule(pdf_path, debug=False):
    pdf = pdfplumber.open(pdf_path)
    all_rows = []
    category_subtotals = []   # (category, {col: val}) rows with no description
    grand_total = None
    current_category = None
    pending_row = None        # last data row, to receive continuation desc lines

    for page in pdf.pages:
        text = page.extract_text() or ''
        if 'CAPITAL ALLOWANCE SCHEDULE' not in text.upper():
            continue
        words = page.extract_words(x_tolerance=2, y_tolerance=3)
        if not words:
            continue
        lines = group_lines(words)
        # description column ends ~ x=180; numeric block starts ~ x=185
        DESC_X_MAX = 182
        YEAR_X0, YEAR_X1 = 185, 213

        for y, ws in lines:
            desc_tokens = [w for w in ws if w['x0'] < DESC_X_MAX]
            num_tokens = [w for w in ws if w['x0'] >= DESC_X_MAX]
            line_text = ' '.join(w['text'] for w in ws)

            if not num_tokens:
                # Pure description line (category header or continuation)
                dtext = ' '.join(w['text'] for w in desc_tokens).strip()
                if not dtext:
                    continue
                if is_category_header(dtext):
                    current_category = dtext.title() if dtext.isupper() or dtext.islower() else dtext
                    pending_row = None
                    continue
                if 'GRAND TOTAL' in dtext.upper():
                    continue
                if pending_row is not None:
                    pending_row['assetType'] = (pending_row['assetType'] + ' ' + dtext).strip()
                continue

            has_year = any(YEAR_X0 <= w['x0'] <= YEAR_X1 and re.match(r'^(19|20)\d{2}$', w['text']) for w in num_tokens)
            desc_text = ' '.join(w['text'] for w in desc_tokens).strip().strip('*').strip()

            if has_year:
                # A data row: description (may be blank/'*' -- old assets
                # sometimes have no free-text description) + up to 14
                # numeric/rate columns, assigned by x-position bin so a
                # column that's entirely omitted (not even a '-') doesn't
                # shift the rest of the row.
                yr_tok = next(w['text'] for w in num_tokens if YEAR_X0 <= w['x0'] <= YEAR_X1)
                row = {'category': current_category, 'assetType': desc_text,
                       'yearAcquired': yr_tok}
                for w in num_tokens:
                    if w['text'] == yr_tok and w['x0'] <= YEAR_X1:
                        continue
                    col = assign_column(w['x0'])
                    if col and col != 'yearAcquired':
                        row[col] = to_num(w['text'])
                for c in ['iaRate', 'originalCost', 'qeBF', 'qeAdd', 'qeDisp', 'qeCF',
                          'aaRate', 'reBF', 'reAdd', 'reDisp', 'initial', 'annual',
                          'allowable', 'reCF']:
                    row.setdefault(c, 0.0)
                all_rows.append(row)
                pending_row = row
            else:
                # Numbers present but no year -> subtotal / GRAND TOTAL row
                joined = desc_text.upper()
                vals = [to_num(w['text']) for w in num_tokens]
                if 'GRAND TOTAL' in line_text.upper() or (not desc_text and len(vals) >= 11 and grand_total is None and page == pdf.pages[-1] if False else False):
                    pass
                if 'GRAND TOTAL' in line_text.upper():
                    grand_total = vals
                elif not desc_text and len(vals) >= 10:
                    category_subtotals.append((current_category, vals))
                pending_row = None

        # Check literal "GRAND TOTAL" text on this page (words split it up)
        gt_idx = None
        flat_words = [(w['text'], w['x0']) for w in words]
        for i, (t, x) in enumerate(flat_words):
            if t == 'GRAND' and i + 1 < len(flat_words) and flat_words[i + 1][0] == 'TOTAL':
                gt_idx = i
        if gt_idx is not None:
            gt_line_y = None
            for w in words:
                if w['text'] == 'GRAND':
                    gt_line_y = round(w['top'] / 3) * 3
                    break
            for y, ws in lines:
                if y == gt_line_y:
                    nums = [to_num(w['text']) for w in ws if w['text'] not in ('GRAND', 'TOTAL')]
                    if nums:
                        grand_total = nums

    pdf.close()
    return {
        'rows': all_rows,
        'category_subtotals': category_subtotals,
        'grand_total': grand_total,
    }


CA_COLS = ['originalCost', 'qeBF', 'qeAdd', 'qeDisp', 'qeCF', 'reBF', 'reAdd',
           'reDisp', 'initial', 'annual', 'allowable', 'reCF']


def validate(result):
    rows = result['rows']
    gt = result['grand_total']
    sums = {c: round(sum(r.get(c, 0) for r in rows), 2) for c in CA_COLS}
    report = {'row_count': len(rows), 'computed_totals': sums}
    if gt and len(gt) >= len(CA_COLS):
        gt_vals = gt[-len(CA_COLS):]
        mismatches = []
        for c, expected in zip(CA_COLS, gt_vals):
            got = sums[c]
            if abs(got - expected) > 1:
                mismatches.append({'column': c, 'expected': expected, 'computed': got, 'diff': round(got - expected, 2)})
        report['pdf_grand_total'] = dict(zip(CA_COLS, gt_vals))
        report['mismatches'] = mismatches
        report['all_match'] = len(mismatches) == 0
    else:
        report['pdf_grand_total'] = None
        report['mismatches'] = None
        report['all_match'] = None
    return report


if __name__ == '__main__':
    path = sys.argv[1]
    result = parse_ca_schedule(path)
    report = validate(result)
    print(json.dumps(report, indent=2, default=str))
    print('\nrows:', len(result['rows']))
    for r in result['rows'][:3]:
        print(r)
