from PIL import Image, ImageDraw, ImageFont

OUT = r"C:\Users\User\Documents\Hospitalities software\medicore-ui-preview.png"


def font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass
    return ImageFont.load_default()


def rounded(draw, box, fill, outline=None, width=1, radius=10):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, value, size=18, fill="#1d2733", bold=False):
    draw.text(xy, value, font=font(size, bold), fill=fill)


img = Image.new("RGB", (1440, 1040), "#f4f7f9")
d = ImageDraw.Draw(img)

# Sidebar
d.rectangle([0, 0, 280, 1040], fill="#102029")
rounded(d, [20, 20, 62, 62], "#24a47f", radius=8)
text(d, (36, 25), "+", 28, "white", True)
text(d, (76, 22), "MediCore HMS", 18, "#eaf1f4", True)
text(d, (76, 46), "Department Harness", 12, "#9fb4bd")

items = [
    "Command", "Doctor Clinic", "Nurse Ward", "Pediatric", "ICU", "Bed Board",
    "Medication", "Inventory", "Assets", "Reports", "Audit"
]
y = 92
for i, item in enumerate(items, start=1):
    active = i == 1
    rounded(d, [16, y, 264, y + 38], "#1a333d" if active else "#102029", radius=7)
    if active:
        d.rectangle([16, y, 19, y + 38], fill="#3cc19a")
    rounded(d, [28, y + 8, 50, y + 30], "#2fb38e" if active else "#203d48", radius=6)
    text(d, (32, y + 11), str(i).zfill(2), 9, "white" if active else "#bfe7dd", True)
    text(d, (62, y + 9), item, 14, "#ffffff" if active else "#d8e5e9", True)
    y += 43

rounded(d, [16, 890, 264, 1006], "#142c36", "#284754", radius=8)
text(d, (32, 906), "Access Harness", 15, "#eaf1f4", True)
text(d, (32, 929), "RBAC + department + patient assignment", 11, "#9fb4bd")
for x, label in zip([32, 105, 178], ["Role", "Dept", "Patient"]):
    rounded(d, [x, 964, x + 58, 990], "#203d48", radius=6)
    text(d, (x + 10, 970), label, 10, "#bfe7dd", True)

# Header
text(d, (310, 24), "Private Hospital Operations", 12, "#59707c", True)
text(d, (310, 46), "Command Center", 34, "#1d2733", True)
rounded(d, [900, 34, 1220, 76], "white", "#d8e1e6", radius=8)
text(d, (918, 48), "Search patient, MRN, ward, doctor", 14, "#7b8c96")
rounded(d, [1234, 34, 1276, 76], "white", "#d8e1e6", radius=8)
text(d, (1250, 45), "!", 18, "#21313d", True)
rounded(d, [1290, 34, 1402, 76], "white", "#d8e1e6", radius=8)
text(d, (1310, 48), "ICU Nurse", 14, "#21313d", True)

# Main panel
rounded(d, [310, 104, 1082, 1000], "white", "#dce5ea", radius=8)
metric_boxes = [
    ("Beds occupied", "74 / 112", "#2476a8"),
    ("Critical alerts", "6", "#bd3d3d"),
    ("Medication checks", "18", "#b0781e"),
    ("Audit events", "1,284", "#1d8d6d"),
]
mx = 330
for label, value, color in metric_boxes:
    rounded(d, [mx, 126, mx + 170, 236], "#f8fafb", "#dce5ea", radius=8)
    text(d, (mx + 16, 148), label, 13, "#60727c")
    text(d, (mx + 16, 180), value, 28, color, True)
    mx += 180

text(d, (330, 270), "Live Department Harness", 22, "#1d2733", True)
text(d, (330, 302), "Shared patient record, shared access control, shared audit trail.", 14, "#63737d")
rounded(d, [905, 270, 1042, 312], "#117e67", "#117e67", radius=8)
text(d, (928, 283), "Open analytics", 14, "white", True)

modules = [
    "Core Data", "Access Control", "Patient Workflow", "Doctor Clinic",
    "Nurse Ward", "Pediatric", "ICU", "Medication",
    "Inventory", "Assets", "Audit", "AI Assist"
]
x0, y0 = 330, 340
for idx, name in enumerate(modules):
    col = idx % 4
    row = idx // 4
    x = x0 + col * 180
    y = y0 + row * 86
    fill = "#edf8f5" if idx < 3 else "#f8fafb"
    outline = "#b9dcd2" if idx < 3 else "#dce5ea"
    rounded(d, [x, y, x + 165, y + 72], fill, outline, radius=8)
    rounded(d, [x + 12, y + 12, x + 38, y + 38], "#e1ece9", radius=6)
    text(d, (x + 18, y + 18), str(idx + 1), 11, "#117e67", True)
    text(d, (x + 12, y + 46), name, 13, "#21313d", True)

rounded(d, [330, 630, 690, 950], "white", "#dce5ea", radius=8)
text(d, (350, 650), "Alert Feed", 18, "#1d2733", True)
alerts = [
    ("Critical oxygen", "ICU-03"),
    ("Pediatric fever", "P2-14"),
    ("Medication blocked", "allergy / weight check"),
    ("Calibration due", "ventilator review"),
]
yy = 690
for title, detail in alerts:
    text(d, (350, yy), title, 14, "#21313d", True)
    text(d, (350, yy + 22), detail, 12, "#657781")
    d.line([350, yy + 50, 670, yy + 50], fill="#edf1f3")
    yy += 62

rounded(d, [712, 630, 1042, 950], "white", "#dce5ea", radius=8)
text(d, (732, 650), "Department Load", 18, "#1d2733", True)
loads = [("Doctor Clinic", "18 queued", 54), ("Nurse Ward", "42 tasks", 72), ("Pediatric Ward", "4 alerts", 46), ("ICU Ward", "6 critical", 88)]
yy = 695
for label, value, pct in loads:
    text(d, (732, yy), label, 13, "#40525d")
    text(d, (958, yy), value, 13, "#1d2733", True)
    rounded(d, [732, yy + 24, 1022, yy + 34], "#e8eef1", radius=6)
    rounded(d, [732, yy + 24, 732 + int(290 * pct / 100), yy + 34], "#27a987", radius=6)
    yy += 58

# Right rail
rounded(d, [1102, 104, 1410, 520], "white", "#dce5ea", radius=8)
text(d, (1122, 126), "Selected Patient", 17, "#1d2733", True)
text(d, (1122, 166), "Mr. K. Raman", 24, "#1d2733", True)
text(d, (1122, 198), "MRN-09331 · 62 yrs", 13, "#687982")
details = [
    ("Department", "ICU Ward"), ("Bed / Queue", "ICU-03"), ("Doctor", "Dr. Sarah"),
    ("Nurse", "Nurse Amir"), ("Diagnosis", "Sepsis monitoring")
]
yy = 238
for label, value in details:
    text(d, (1122, yy), label, 12, "#687982")
    text(d, (1300, yy), value, 12, "#1d2733", True)
    d.line([1122, yy + 26, 1390, yy + 26], fill="#edf1f3")
    yy += 42
rounded(d, [1122, 452, 1258, 482], "#fff0d9", radius=15)
text(d, (1138, 459), "Critical oxygen", 12, "#8a5d16", True)

rounded(d, [1102, 540, 1410, 834], "white", "#dce5ea", radius=8)
text(d, (1122, 562), "Harness Gates", 17, "#1d2733", True)
checks = [
    ("Core data", "patient_id, department_id, encounter_id"),
    ("Access", "role + department + assignment"),
    ("Validation", "clinical limits and workflow state"),
    ("Audit", "viewed, edited, denied, transferred"),
    ("AI assist", "human-reviewed output only"),
]
yy = 606
for title, detail in checks:
    text(d, (1122, yy), title, 13, "#1d2733", True)
    text(d, (1122, yy + 20), detail, 11, "#657781")
    yy += 44

img.save(OUT)
print(OUT)
