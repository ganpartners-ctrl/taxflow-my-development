"""
Flask wrapper for CA / HP schedule coordinate extraction.

Drop this alongside your existing OCR server (same host, same style as
the GL /convert endpoint) and mount these two routes. The client
(taxflow_v5_3.html -> ncFetchCoordinateCASchedule / a new
ncFetchCoordinateHPSchedule) POSTs the raw PDF bytes and reads JSON back.

Run standalone for testing:
    pip install flask flask-cors pdfplumber
    python3 ca_hp_server.py            # listens on :5051 (separate from
                                        # the existing GL/OCR proxy on :5050)
Or import `ca_bp` / the two view functions into your existing app and
register them on your existing Flask app instead of running this file
directly.

GET /health -> {"ok": true, "service": "ca-hp-schedule-extractor"}
   Used by the app's Settings panel "Test Connection" button.

--------------------------------------------------------------------
POST /api/ca-schedule?filename=whatever.pdf
  body: raw PDF bytes
  200 -> {
    "ok": true,
    "schedules": [                      // one per asset category
      {
        "code": "CA",
        "title": "Computer equipment",
        "pages": [7, 8],
        "rows": [                       // ONE ROW PER INDIVIDUAL ASSET
          {
            "assetType": "1 unit Notebook Asus A542U-FDM125T i5- 8250U Grey (S/N: ...) ...",
            "yearAcquired": "2018", "iaRate": 20, "aaRate": 10,
            "originalCost": 2735, "qeBF": 2735, "qeAdd": 0, "qeDisp": 0, "qeCF": 2735,
            "reBF": 0, "reAdd": 0, "reDisp": 0,
            "ia": 0, "aa": 0, "allowable": 0, "reCF": 0
          }, ...
        ],
        "totalRow": {"originalCost":..., "qeBF":..., ..., "reCF":...}   // category subtotal, if printed
      }, ...
    ],
    "grandTotal": {"originalCost":..., "qeBF":..., "qeAdd":..., "qeDisp":..., "qeCF":...,
                   "reBF":..., "reAdd":..., "reDisp":..., "initial":..., "annual":...,
                   "allowable":..., "reCF":...},          // from the PDF's own GRAND TOTAL row
    "computedTotal": {...same keys...},                    // sum of every row this endpoint extracted
    "reconciled": true,                                     // computedTotal == grandTotal, all columns
    "mismatches": []                                        // [{column, expected, computed, diff}, ...]
  }

POST /api/hp-schedule?filename=whatever.pdf
  body: raw PDF bytes
  200 -> {
    "ok": true,
    "assets": [
      {
        "description": "1 unit Used Volvo XC90 - RAE930",
        "originalCost": 230606, "dateOfPurchase": "1/1/2020",
        "depositAmount": 29606, "totalInstalments": 48, "interestAmount": 24683,
        "monthlyInstalment": 4702.0, "finalInstalment": 4688.8, "principalAmount": 201000,
        "vehicleType": "private-used", "qualifyAmount": 50000,
        "yearlyPayments": [
          {"year": "2020", "noOfInst": 6, "principal": 3695, "interest": 5730, "total": 9425},
          ...
        ],
        "reconciled": true,       // sum(yearlyPayments) == principalAmount/interestAmount
        "sumPrincipal": 201000, "sumInterest": 24683
      }, ...
    ]
  }
--------------------------------------------------------------------
"""
import io
import tempfile

from flask import Flask, request, jsonify

from ca_extractor import parse_ca_schedule, CA_COLS
from hp_extractor import parse_hp_schedule, validate_hp_asset

app = Flask(__name__)

try:
    from flask_cors import CORS
    CORS(app)  # browser fetch() from taxflow_v5_4.html is cross-origin -- needs CORS headers
except ImportError:
    @app.after_request
    def _add_cors_headers(resp):
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return resp


@app.route('/health', methods=['GET'])
def health():
    return jsonify(ok=True, service='ca-hp-schedule-extractor')


def _save_upload_to_tmp():
    data = request.get_data()
    if not data:
        return None
    tmp = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
    tmp.write(data)
    tmp.close()
    return tmp.name


@app.route('/api/ca-schedule', methods=['POST'])
def ca_schedule():
    path = _save_upload_to_tmp()
    if not path:
        return jsonify(ok=False, error='no file body received'), 400
    try:
        result = parse_ca_schedule(path)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 500

    rows = result['rows']
    gt = result['grand_total']

    # Group extracted rows into per-category schedules, preserving every
    # individual asset row (not collapsed) -- this is the piece the old
    # coordinate-extractor contract was missing.
    by_cat = {}
    for r in rows:
        cat = r.get('category') or 'Uncategorised'
        by_cat.setdefault(cat, []).append({
            'assetType': r['assetType'],
            'yearAcquired': r['yearAcquired'],
            'iaRate': r['iaRate'], 'aaRate': r['aaRate'],
            'originalCost': r['originalCost'], 'qeBF': r['qeBF'], 'qeAdd': r['qeAdd'],
            'qeDisp': r['qeDisp'], 'qeCF': r['qeCF'],
            'reBF': r['reBF'], 'reAdd': r['reAdd'], 'reDisp': r['reDisp'],
            'ia': r['initial'], 'aa': r['annual'], 'allowable': r['allowable'],
            'reCF': r['reCF'],
        })

    def cat_total(cat_rows):
        t = {}
        for c in ['originalCost', 'qeBF', 'qeAdd', 'qeDisp', 'qeCF', 'reBF', 'reAdd',
                  'reDisp', 'ia', 'aa', 'allowable', 'reCF']:
            t[c] = round(sum(r.get(c, 0) for r in cat_rows), 2)
        return t

    schedules = [
        {'code': 'CA', 'title': cat, 'pages': [], 'rows': cat_rows, 'totalRow': cat_total(cat_rows)}
        for cat, cat_rows in by_cat.items()
    ]

    computed = {c: round(sum(r.get(c, 0) for r in rows), 2) for c in CA_COLS}
    grand_total_named = dict(zip(CA_COLS, gt[-len(CA_COLS):])) if gt and len(gt) >= len(CA_COLS) else None
    mismatches = []
    if grand_total_named:
        for c in CA_COLS:
            diff = round(computed[c] - grand_total_named[c], 2)
            if abs(diff) > 1:
                mismatches.append({'column': c, 'expected': grand_total_named[c],
                                    'computed': computed[c], 'diff': diff})

    return jsonify(
        ok=True,
        schedules=schedules,
        grandTotal=grand_total_named,
        computedTotal=computed,
        reconciled=(grand_total_named is not None and not mismatches),
        mismatches=mismatches,
    )


@app.route('/api/hp-schedule', methods=['POST'])
def hp_schedule():
    path = _save_upload_to_tmp()
    if not path:
        return jsonify(ok=False, error='no file body received'), 400
    try:
        assets = parse_hp_schedule(path)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 500

    out = []
    for a in assets:
        v = validate_hp_asset(a)
        out.append({
            **a,
            'reconciled': v['principal_match'] and v['interest_match'],
            'sumPrincipal': v['sum_principal'],
            'sumInterest': v['sum_interest'],
        })
    return jsonify(ok=True, assets=out)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5051)
