import pathlib
import sys

sys.path.insert(0, r"C:\Users\User\Documents\Hospitalities software\.python-deps")

import pdfplumber


pdf_path = pathlib.Path(sys.argv[1])
page_no = int(sys.argv[2])

with pdfplumber.open(str(pdf_path)) as pdf:
    page = pdf.pages[page_no - 1]
    print(page.extract_text(x_tolerance=1, y_tolerance=3) or "")
