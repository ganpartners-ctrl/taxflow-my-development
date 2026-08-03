"""
Coordinate-based Hire Purchase Creditors Schedule extractor.

Reads the per-asset "HIRE PURCHASE CREDITORS SCHEDULE" pages (one asset
per page: Finance terms block + "Payment information" year-by-year
table), verified against the same two reference documents as
ca_extractor.py. Also reads the "SUMMARY OF HIRE PURCHASE CREDITORS"
page for cross-check totals.
"""
import re
import sys
import json
from collections import defaultdict
import pdfplumber


def to_num(tok):
    if tok is None:
        return 0.0
    tok = str(tok).strip()
    if tok in ('', '-'):
        return 0.0
    neg = tok.startswith('(') and tok.endswith(')')
    tok = tok.strip('()').replace(',', '')
    try:
        v = float(tok)
    except ValueError:
        return 0.0
    return -v if neg else v


def group_lines(words, y_tol=3):
    lines = defaultdict(list)
    for w in words:
        key = round(w['top'] / y_tol) * y_tol
        lines[key].append(w)
    return [(y, sorted(lines[y], key=lambda w: w['x0'])) for y in sorted(lines)]


def parse_hp_asset_page(page):
    words = page.extract_words(x_tolerance=2, y_tolerance=3)
    lines = group_lines(words)
    text = page.extract_text() or ''
    if 'HIRE PURCHASE CREDITORS SCHEDULE' not in text.upper() or 'Finance' not in text:
        return None

    asset = {
        'description': '', 'originalCost': 0.0, 'dateOfPurchase': '',
        'depositAmount': 0.0, 'totalInstalments': 0, 'interestAmount': 0.0,
        'monthlyInstalment': 0.0, 'finalInstalment': 0.0, 'principalAmount': 0.0,
        'vehicleType': 'none', 'qualifyAmount': 0.0, 'yearlyPayments': [],
    }
    line_map = {y: ' '.join(w['text'] for w in ws) for y, ws in lines}

    for y, ltext in line_map.items():
        if ltext.strip().startswith('Asset '):
            asset['description'] = ltext.split('Asset', 1)[1].strip()
        m = re.search(r'Original cost\s+([\d,]+\.?\d*)', ltext)
        if m:
            asset['originalCost'] = to_num(m.group(1))
        m = re.search(r'Date of purchase\s+([\d/]+)', ltext)
        if m:
            asset['dateOfPurchase'] = m.group(1)
        m = re.search(r'Qualify Amount\s+([\d,]+\.?\d*)', ltext)
        if m:
            asset['qualifyAmount'] = to_num(m.group(1))
        m = re.search(r'Deposit amount\s+([\d,]+\.?\d*)', ltext)
        if m:
            asset['depositAmount'] = to_num(m.group(1))
        m = re.search(r'Monthly\s*instalment\s+([\d,]+\.?\d*)', ltext)
        if m:
            asset['monthlyInstalment'] = to_num(m.group(1))
        m = re.search(r'Total instalment\s+(\d+)', ltext)
        if m:
            asset['totalInstalments'] = int(m.group(1))
        m = re.search(r'Interest amount\s+([\d,]+\.?\d*)', ltext)
        if m:
            asset['interestAmount'] = to_num(m.group(1))
        m = re.search(r'Final\s*instalment\s+([\d,]+\.?\d*)', ltext)
        if m:
            asset['finalInstalment'] = to_num(m.group(1))
        m = re.search(r'Principal amount\s+([\d,]+\.?\d*)', ltext)
        if m:
            asset['principalAmount'] = to_num(m.group(1))
        if 'Private' in ltext and 'New' in ltext:
            asset['vehicleType'] = 'private-new'
        elif 'Private' in ltext and 'Used' in ltext:
            asset['vehicleType'] = 'private-used'
        elif 'Commercial' in ltext:
            asset['vehicleType'] = 'commercial'

    # Payment information table: rows starting with a 4-digit year OR
    # 'Adj' in the leftmost (Year of payment) column (~x0 60-100),
    # followed by (No of Inst) Principal Interest Total [QE] [Remark].
    year_col_x = (55, 100)
    for y, ws in lines:
        if not ws:
            continue
        first = ws[0]
        if not (year_col_x[0] <= first['x0'] <= year_col_x[1]):
            continue
        label = first['text']
        if not (re.match(r'^(19|20)\d{2}$', label) or label == 'Adj'):
            continue
        rest = ws[1:]
        vals = [w['text'] for w in rest]
        nums = [to_num(v) for v in vals if re.match(r'^\(?-?[\d,]+(?:\.\d+)?\)?$|^-$', v)]
        if label == 'Adj':
            # Adj  -   756.00   756.00   -> noOfInst blank, principal, interest, total
            payment = {'year': 'Adj', 'noOfInst': 0}
            nonzero = [n for n in nums]
            if len(nonzero) >= 2:
                payment['principal'] = nonzero[0] if len(nonzero) >= 3 else 0
                payment['interest'] = nonzero[-2] if len(nonzero) >= 2 else 0
                payment['total'] = nonzero[-1]
            asset['yearlyPayments'].append(payment)
            continue
        # e.g. "(6)" for No of Inst, then Principal, Interest, Total, [Remark '-']
        noinst_tok = next((v for v in vals if re.match(r'^\(\d+\)$', v)), None)
        no_of_inst = int(noinst_tok.strip('()')) if noinst_tok else 0
        amt_tokens = [w for w in rest if re.match(r'^[\d,]+\.\d{2}$', w['text'])]
        amts = [to_num(w['text']) for w in amt_tokens]
        payment = {'year': label, 'noOfInst': no_of_inst}
        if len(amts) >= 3:
            payment['principal'], payment['interest'], payment['total'] = amts[0], amts[1], amts[2]
        elif len(amts) == 2:
            payment['principal'], payment['interest'] = amts[0], amts[1]
            payment['total'] = amts[0] + amts[1]
        asset['yearlyPayments'].append(payment)

    return asset


def parse_hp_schedule(pdf_path):
    pdf = pdfplumber.open(pdf_path)
    assets = []
    for page in pdf.pages:
        a = parse_hp_asset_page(page)
        if a and (a['description'] or a['originalCost']):
            assets.append(a)
    pdf.close()
    return assets


def validate_hp_asset(asset):
    """An asset's own printed grand-total row = sum of principal/interest
    across all its yearly-payment rows (including any 'Adj' row)."""
    sum_principal = sum(p.get('principal', 0) for p in asset['yearlyPayments'])
    sum_interest = sum(p.get('interest', 0) for p in asset['yearlyPayments'])
    ok_principal = abs(sum_principal - asset['principalAmount']) < 1
    ok_interest = abs(sum_interest - asset['interestAmount']) < 1
    return {
        'description': asset['description'],
        'sum_principal': round(sum_principal, 2), 'principalAmount': asset['principalAmount'],
        'sum_interest': round(sum_interest, 2), 'interestAmount': asset['interestAmount'],
        'principal_match': ok_principal, 'interest_match': ok_interest,
    }


if __name__ == '__main__':
    path = sys.argv[1]
    assets = parse_hp_schedule(path)
    print(f'{len(assets)} HP asset(s) found\n')
    for a in assets:
        v = validate_hp_asset(a)
        status = 'OK' if v['principal_match'] and v['interest_match'] else 'MISMATCH'
        print(f"[{status}] {a['description']}")
        print(f"   principal: sum={v['sum_principal']} vs stated={v['principalAmount']}")
        print(f"   interest : sum={v['sum_interest']} vs stated={v['interestAmount']}")
        print(f"   years: {[(p['year'], p.get('principal'), p.get('interest')) for p in a['yearlyPayments']]}")
        print()
