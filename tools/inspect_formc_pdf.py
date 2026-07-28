import pathlib
import sys

sys.path.insert(0, r"C:\Users\User\Documents\Hospitalities software\.python-deps")

import pdfplumber


pdf_path = pathlib.Path(sys.argv[1])
with pdfplumber.open(str(pdf_path)) as pdf:
    print("pages", len(pdf.pages))
    for index, page in enumerate(pdf.pages[:12], 1):
        text = (page.extract_text() or "").replace("\n", " | ")
        print(f"---PAGE {index}---")
        print(text[:3000])
