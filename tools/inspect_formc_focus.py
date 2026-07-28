import pathlib
import re
import sys

sys.path.insert(0, r"C:\Users\User\Documents\Hospitalities software\.python-deps")

import pdfplumber


KEYWORDS = [
    "NAMA SYARIKAT",
    "NO. CUKAI",
    "NO. PENDAFTARAN",
    "MAKLUMAT",
    "PENGARAH",
    "PEMEGANG",
    "SYER",
    "TIN",
    "ALAMAT",
    "TELEFON",
    "EMEL",
    "MSIC",
    "AKTIVITI",
    "TEMPOH ASAS",
    "TAHUN TAKSIRAN",
    "CP204",
    "HK-",
    "LAMPIRAN",
    "GAJI",
    "BONUS",
    "KOMISEN",
    "PINJAMAN",
]


def clean(line: str) -> str:
    return re.sub(r"\s+", " ", line.strip())


def main() -> None:
    pdf_path = pathlib.Path(sys.argv[1])
    with pdfplumber.open(str(pdf_path)) as pdf:
        print(f"file={pdf_path.name}")
        print(f"pages={len(pdf.pages)}")
        for page_no, page in enumerate(pdf.pages, 1):
            text = page.extract_text() or ""
            hits = []
            for line in text.splitlines():
                line_clean = clean(line)
                if any(k.lower() in line_clean.lower() for k in KEYWORDS):
                    hits.append(line_clean)
            if hits:
                print(f"--- page {page_no} ---")
                for hit in hits[:30]:
                    print(hit[:260])


if __name__ == "__main__":
    main()
