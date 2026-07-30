"""
ca_schedule_extractor.py

Coordinate-aware extractor for Malaysian corporate tax computation "Capital
Allowances" schedules (CA, CA1, CA2, ... CA9 style sections produced by
common tax-computation software).

Why coordinate-based, not text-flattened regex:
Naive text extraction (pdf.js getTextContent() joined with spaces, or
pdftotext without -layout) collapses each table row into a single run of
tokens with NO reliable column delimiters. Worse, when a cell is genuinely
blank (not "0" or "-", just visually empty), NO token is emitted for it at
all, which silently shifts every subsequent token one column to the left
for that row. Regex-based positional parsing therefore misreads real
documents (verified against 4 real customer PDFs).

This script instead uses pdfplumber's per-word (x0, top) coordinates to:
  1. Locate each CA-style schedule's column header row and capture the
     x-position of each column (Description / Rate IA / Rate AA / ACA /
     YA acquired / QE Brought-Add-Disposal-Carried / RE Brought-Add-
     Disposal-Total / Initial / Annual / RE Carried forward).
  2. For every subsequent data row, assign each number/dash token to the
     NEAREST column x-anchor -- so a blank cell is simply absent, and
     every other value still lands in its correct column regardless.

Usage:
    python ca_schedule_extractor.py <pdf_path> [out_json_path]

Output JSON shape:
{
  "ok": true,
  "schedules": [
    {
      "code": "CA1",
      "title": "Business 1 - Industrial building allowances",
      "page": 29,
      "rows": [ {yearAcquired, iaRate, aaRate, aca, qeBF, qeAdd, qeDisp, qeCF,
                 reBF, reAdd, reDisp, reTotal, ia, aa, reCF, sourcePage} ... ],
      "totalRow": {..same fields.., "label":"Total"} | null
    }, ...
  ],
  "grandTotal": { "qeCF":.., "reCF":.., "ia":.., "aa":.. } | null
}
"""
import json
import re
import sys
from collections import defaultdict

try:
    import pdfplumber
except ImportError:
    print(json.dumps({"ok": False, "error": "pdfplumber not installed"}))
    sys.exit(1)

try:
    import pypdf
except ImportError:
    pypdf = None

TITLE_SCAN_RE = re.compile(r'^(CA)\/?\d*\s*:', re.M)


def find_candidate_pages(pdf_path):
    """
    pdfplumber's per-word coordinate extraction (used for the real column
    parsing) is expensive -- roughly 20s for a 189-page document, almost all
    of it spent on pages that have nothing to do with capital allowances.
    pypdf's plain text extraction is ~5x faster for a first pass, so use it
    to find which page numbers actually start a CA-style schedule (or are a
    same-schedule continuation page), and only run pdfplumber on those plus
    a couple of pages after each one (continuation schedules always follow
    immediately). Falls back to "scan every page" if pypdf isn't installed.
    """
    if pypdf is None:
        return None
    try:
        reader = pypdf.PdfReader(pdf_path)
    except Exception:
        return None
    candidates = set()
    for i, page in enumerate(reader.pages, 1):
        try:
            text = page.extract_text() or ''
        except Exception:
            continue
        for line in text.split('\n')[:6]:
            if TITLE_SCAN_RE.match(line.strip()):
                candidates.add(i)
                # Grab a couple of trailing pages too: a schedule's own
                # column-header/total-row data can spill past its title page
                # for large tables, and continuation pages are picked up by
                # their own "(Continuation)" title anyway via this same scan.
                candidates.add(i + 1)
                break
    return sorted(candidates)

SCHEDULE_TITLE_RE = re.compile(r'^(CA)\/?(\d*)\s*:\s*(.+?)\s*(\(Continuation\))?\s*$')
FOOTNOTE_RE = re.compile(r'^§\d')
NUM_TOKEN_RE = re.compile(r'^\(?-?[\d,]+(?:\.\d+)?\)?$|^-$')
FOOTNOTE_SUFFIX_RE = re.compile(r'§\d+$')
RATE_TOKEN_RE = re.compile(r'^\d{1,3}%$')
YEAR_TOKEN_RE = re.compile(r'^<?20\d{2}[PC]?$')

# Column keys in header order (as they appear left-to-right on real documents)
COLUMN_KEYS = ['qeBF', 'qeAdd', 'qeDisp', 'qeCF', 'reBF', 'reAdd', 'reDisp', 'reTotal', 'ia', 'aa', 'reCF']


def parse_num(tok):
    if tok is None or tok == '-':
        return 0.0
    neg = tok.startswith('(') and tok.endswith(')')
    s = tok.strip('()').replace(',', '')
    try:
        n = float(s)
    except ValueError:
        return 0.0
    return -n if neg else n


def group_lines(words, y_bucket=3):
    lines = defaultdict(list)
    for w in words:
        lines[round(w['top'] / y_bucket) * y_bucket].append(w)
    return lines


def find_column_anchors(lines_sorted_y, lines):
    """
    Scan the first ~6 grouped lines of a page for the two-row column header
    ('...Brought Addition Disposal (-) Carried Brought Addition Disposal (-)
    Total Initial Annual Carried' followed by 'of IA of AA acquired forward
    forward forward allowances (-) allowances (-) forward') and return a
    dict of column-key -> x0 anchor position. Returns None if not found on
    this page (i.e. this page is not a CA-schedule table page).
    """
    header_y = None
    for y in lines_sorted_y[:10]:
        ws = sorted(lines[y], key=lambda w: w['x0'])
        txts = [w['text'] for w in ws]
        if 'Brought' in txts and 'Carried' in txts and txts.count('Brought') >= 2:
            header_y = y
            break
    if header_y is None:
        return None

    ws = sorted(lines[header_y], key=lambda w: w['x0'])
    brought_positions = [w['x0'] for w in ws if w['text'] == 'Brought']
    addition_positions = [w['x0'] for w in ws if w['text'] == 'Addition']
    disposal_positions = [w['x0'] for w in ws if w['text'] == 'Disposal']
    carried_positions = [w['x0'] for w in ws if w['text'] == 'Carried']
    total_positions = [w['x0'] for w in ws if w['text'] == 'Total']
    initial_positions = [w['x0'] for w in ws if w['text'] == 'Initial']
    annual_positions = [w['x0'] for w in ws if w['text'] == 'Annual']

    if len(brought_positions) < 2 or len(carried_positions) < 2:
        return None

    anchors = {
        'qeBF': brought_positions[0],
        'qeAdd': addition_positions[0] if addition_positions else None,
        'qeDisp': disposal_positions[0] if disposal_positions else None,
        'qeCF': carried_positions[0],
        'reBF': brought_positions[1],
        'reAdd': addition_positions[1] if len(addition_positions) > 1 else None,
        'reDisp': disposal_positions[1] if len(disposal_positions) > 1 else None,
        'reTotal': total_positions[0] if total_positions else None,
        'ia': initial_positions[0] if initial_positions else None,
        'aa': annual_positions[0] if annual_positions else None,
        'reCF': carried_positions[-1],
    }
    # Rate/ACA/YA columns (left side, before the QE block)
    rate_ia_ws = [w for w in ws if w['text'] == 'Rate']
    aca_ws = [w for w in ws if w['text'] == 'ACA']
    ya_ws = [w for w in ws if w['text'] == 'YA']
    anchors['rateIA'] = rate_ia_ws[0]['x0'] if rate_ia_ws else None
    anchors['rateAA'] = rate_ia_ws[1]['x0'] if len(rate_ia_ws) > 1 else None
    anchors['aca'] = aca_ws[0]['x0'] if aca_ws else None
    anchors['ya'] = ya_ws[0]['x0'] if ya_ws else None

    # Fill any missing (blank-header) anchor by interpolating between known
    # neighbours, since a genuinely-unused column (e.g. no Addition ever
    # occurs anywhere on this page) can be legitimately absent.
    known = [(k, v) for k, v in anchors.items() if v is not None and k in COLUMN_KEYS]
    known.sort(key=lambda kv: kv[1])
    for k in COLUMN_KEYS:
        if anchors.get(k) is None:
            idx = COLUMN_KEYS.index(k)
            prev_v = next((v for kk, v in reversed(known) if COLUMN_KEYS.index(kk) < idx), None)
            next_v = next((v for kk, v in known if COLUMN_KEYS.index(kk) > idx), None)
            if prev_v is not None and next_v is not None:
                anchors[k] = (prev_v + next_v) / 2
            elif prev_v is not None:
                anchors[k] = prev_v + 50
            elif next_v is not None:
                anchors[k] = next_v - 50

    return anchors, header_y


def nearest_column(x, anchors):
    best_key, best_dist = None, None
    for k in COLUMN_KEYS:
        ax = anchors.get(k)
        if ax is None:
            continue
        d = abs(x - ax)
        if best_dist is None or d < best_dist:
            best_key, best_dist = k, d
    return best_key


def extract_schedule_page(page, page_no):
    words = page.extract_words(x_tolerance=2, y_tolerance=3)
    if not words:
        return None
    lines = group_lines(words)
    ys = sorted(lines)

    # Page title / schedule code (first non-address line matching "CAn: ..." or "CA/n: ... (Continuation)")
    title_line = None
    is_continuation = False
    for y in ys[:6]:
        ws = sorted(lines[y], key=lambda w: w['x0'])
        joined = ' '.join(w['text'] for w in ws)
        m = SCHEDULE_TITLE_RE.match(joined)
        if m:
            code = m.group(1) + (m.group(2) or '')
            title_line = (code, m.group(3))
            is_continuation = bool(m.group(4))
            break
    if title_line is None:
        return None

    anchor_result = find_column_anchors(ys, lines)
    if anchor_result is None:
        return None
    anchors, header_y = anchor_result

    rows = []
    total_row_candidates = []
    for y in ys:
        if y <= header_y + 6:
            continue
        ws = sorted(lines[y], key=lambda w: w['x0'])
        txts = [w['text'] for w in ws]
        if not txts:
            continue
        if FOOTNOTE_RE.match(txts[0]):
            continue
        joined = ' '.join(txts)
        if joined.startswith('§'):
            continue

        is_total_row_candidate = txts[0] == 'Total' or (
            txts[0] in ('Brought', 'Current') and ('forward' in txts or 'year' in txts or len(txts) < 6)
        )

        row = {k: 0.0 for k in COLUMN_KEYS}
        seen = set()
        row['iaRate'] = None
        row['aaRate'] = None
        row['aca'] = None
        row['yearAcquired'] = None
        found_any_number = False

        rate_toks = [w for w in ws if RATE_TOKEN_RE.match(w['text'])]
        if len(rate_toks) >= 2:
            row['iaRate'] = int(rate_toks[0]['text'].rstrip('%'))
            row['aaRate'] = int(rate_toks[-1]['text'].rstrip('%'))
        elif len(rate_toks) == 1:
            row['aaRate'] = int(rate_toks[0]['text'].rstrip('%'))

        for w in ws:
            wtext = FOOTNOTE_SUFFIX_RE.sub('', w['text'])
            if wtext in ('Yes', 'No'):
                row['aca'] = wtext
            elif YEAR_TOKEN_RE.match(wtext):
                row['yearAcquired'] = wtext.lstrip('<').rstrip('PC')
            elif wtext == 'RM':
                continue
            elif NUM_TOKEN_RE.match(wtext):
                col = nearest_column(w['x0'], anchors)
                if col:
                    row[col] = parse_num(wtext)
                    seen.add(col)
                    found_any_number = True

        # Recover a footnote-obscured disposal figure via the schedule's own
        # required arithmetic identity (Brought forward + Addition - Disposal
        # = Carried forward), only when the other three legs were actually
        # observed as real tokens -- never applied to a chain of defaults.
        if 'qeDisp' not in seen and {'qeBF', 'qeCF'} <= seen:
            implied = row['qeBF'] + row['qeAdd'] - row['qeCF']
            if abs(implied) > 0.005:
                row['qeDisp'] = -implied
        if 'reDisp' not in seen and {'reBF', 'reTotal'} <= seen:
            implied = row['reBF'] + row['reAdd'] - row['reTotal']
            if abs(implied) > 0.005:
                row['reDisp'] = -implied

        if not found_any_number:
            continue

        populated_cols = sum(1 for k in COLUMN_KEYS if row[k] != 0.0)
        is_total_row = is_total_row_candidate and populated_cols >= 4

        if is_total_row and row['yearAcquired'] is None:
            row['label'] = txts[0]
            total_row_candidates.append(row)
            continue

        if row['yearAcquired'] is None:
            # Continuation / non-data row (e.g. mid-table narrative) -- skip.
            continue

        rows.append(row)

    total_row = None
    for label in ('Total', 'Brought', 'Current'):
        matches = [r for r in total_row_candidates if r['label'] == label]
        if matches:
            total_row = matches[-1]
            break

    return {
        'code': title_line[0],
        'title': title_line[1],
        'page': page_no,
        'rows': rows,
        'totalRow': total_row,
        'isContinuation': is_continuation,
    }


def run(pdf_path, out_path=None):
    schedules = []
    candidate_pages = find_candidate_pages(pdf_path)
    with pdfplumber.open(pdf_path) as pdf:
        page_numbers = candidate_pages if candidate_pages is not None else range(1, len(pdf.pages) + 1)
        for i in page_numbers:
            if i < 1 or i > len(pdf.pages):
                continue
            page = pdf.pages[i - 1]
            try:
                sched = extract_schedule_page(page, i)
            except Exception:
                sched = None
            if not sched or not (sched['rows'] or sched['totalRow']):
                continue
            if sched.get('isContinuation') and schedules:
                # Merge into the immediately preceding schedule rather than
                # creating a separate (and mislabeled) entry.
                prev = schedules[-1]
                prev['rows'].extend(sched['rows'])
                if sched['totalRow'] is not None:
                    prev['totalRow'] = sched['totalRow']
                prev['pages'] = prev.get('pages', [prev['page']]) + [i]
            else:
                sched.pop('isContinuation', None)
                schedules.append(sched)

    grand_total = None
    if schedules:
        gt = {k: 0.0 for k in ('qeCF', 'reCF', 'ia', 'aa')}
        for s in schedules:
            tr = s.get('totalRow')
            src = tr if tr else None
            if src:
                for k in gt:
                    gt[k] += src.get(k, 0.0)
            else:
                for r in s['rows']:
                    for k in gt:
                        gt[k] += r.get(k, 0.0)
        grand_total = gt

    result = {'ok': True, 'schedules': schedules, 'grandTotal': grand_total}
    out = json.dumps(result, indent=2)
    if out_path:
        with open(out_path, 'w') as f:
            f.write(out)
    else:
        print(out)
    return result


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'ok': False, 'error': 'usage: ca_schedule_extractor.py <pdf> [out.json]'}))
        sys.exit(1)
    run(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
