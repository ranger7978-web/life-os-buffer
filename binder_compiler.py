from dotenv import load_dotenv
load_dotenv()

import os
import time
import json
import base64
import re
import shutil
import requests
import cv2
import numpy as np
from PIL import Image
from pypdf import PdfWriter, PdfReader
from io import BytesIO

import sys

try:
    import pypdfium2 as pdfium
except ImportError:
    pdfium = None

LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "daemon.log")


class TeeLogger:
    def __init__(self, filename, stream):
        self.filename = filename
        self.stream = stream

    def write(self, message):
        self.stream.write(message)
        stripped = message.strip()
        if stripped:
            try:
                with open(self.filename, "a", encoding="utf-8") as f:
                    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
                    if not stripped.startswith("[20"):
                        f.write(f"[{timestamp}] [COMPILER] {stripped}\n")
                    else:
                        f.write(f"{stripped}\n")
            except Exception:
                pass

    def flush(self):
        self.stream.flush()


sys.stdout = TeeLogger(LOG_FILE, sys.stdout)
sys.stderr = TeeLogger(LOG_FILE, sys.stderr)

from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

INBOX_DIR = r"G:\My Drive\Life_OS\00_INBOX\_INBOX_SCANS"
PROCESSED_DIR = r"G:\My Drive\Life_OS\00_INBOX\Processed"
OUTPUT_DIR = r"G:\My Drive\Life_OS\01_ACADEMIC_ENGINE\Subjects"
READY_TO_PRINT_DIR = r"G:\My Drive\Life_OS\01_ACADEMIC_ENGINE\Ready_to_Print"
STATE_FILE = r"G:\My Drive\Life_OS\04_SYSTEM_CONFIG\page_state.json"

PAGE_WIDTH, PAGE_HEIGHT = A5  # 148 x 210 mm
SUPPORTED_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.pdf')
PUNCH_MARGIN_MM = 30
DPI = 300
MARGIN_PIXELS = int((PUNCH_MARGIN_MM / 25.4) * DPI)
STABILITY_CHECK_SECONDS = 3


def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_state(state):
    try:
        os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
        with open(STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"Warning: Failed to save page_state.json: {e}")


def is_file_stable(filepath, wait_seconds=STABILITY_CHECK_SECONDS):
    """Guards against reading a file mid-sync from Google Drive Desktop."""
    try:
        size_before = os.path.getsize(filepath)
        time.sleep(wait_seconds)
        size_after = os.path.getsize(filepath)
        return size_before == size_after and size_after > 0
    except OSError:
        return False


def sanitize_folder_name(name):
    """Keeps Drive folder names filesystem-safe."""
    cleaned = re.sub(r'[\\/:*?"<>|]', "", name or "").strip()
    return cleaned if cleaned else "General"


def extract_or_render_pdf_pages(pdf_path):
    """
    Extracts or renders each page of a PDF as a PIL Image at DPI (300 DPI).
    Prefers pypdfium2 for rasterization fidelity, with a fallback to pypdf embedded image extraction.
    """
    pages = []
    if pdfium is not None:
        try:
            doc = pdfium.PdfDocument(pdf_path)
            try:
                for page_idx in range(len(doc)):
                    page = doc[page_idx]
                    pil_img = page.render(scale=DPI / 72.0).to_pil()
                    pages.append(pil_img.convert("RGB"))
            finally:
                doc.close()
            if pages:
                return pages
        except Exception as e:
            print(f"Notice: pypdfium2 render failed for {pdf_path}: {e}. Trying fallback.")

    # Fallback: Extract embedded images via pypdf
    try:
        with open(pdf_path, 'rb') as f:
            pdf_bytes = BytesIO(f.read())
        reader = PdfReader(pdf_bytes)
        for page in reader.pages:
            if hasattr(page, 'images') and len(page.images) > 0:
                for img_obj in page.images:
                    pages.append(img_obj.image.convert("RGB"))
    except Exception as e:
        print(f"Notice: pypdf image extraction failed for {pdf_path}: {e}")

    return pages


def load_scan_pages(filepath):
    """Loads all pages from a scan file (PDF or image) as a list of PIL Images."""
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".pdf":
        pages = extract_or_render_pdf_pages(filepath)
        if not pages:
            raise ValueError(f"No readable pages could be extracted or rendered from {filepath}")
        return pages
    elif ext in ('.jpg', '.jpeg', '.png'):
        with Image.open(filepath) as img:
            return [img.convert("RGB")]
    else:
        raise ValueError(f"Unsupported scan format: {ext}")


def extract_scan_metadata(image_input):
    """Calls Gemini Flash to OCR the scan and extract Subject, clean_title, and Date."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set in the environment.")

    model = "gemini-3.6-flash"
    gemini_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": os.getenv("GEMINI_API_KEY"),
    }

    if isinstance(image_input, Image.Image):
        buf = BytesIO()
        image_input.convert("RGB").save(buf, format="JPEG", quality=85)
        image_bytes = buf.getvalue()
        mime_type = "image/jpeg"
    elif isinstance(image_input, (str, os.PathLike)):
        filepath = str(image_input)
        if filepath.lower().endswith(".pdf"):
            pages = extract_or_render_pdf_pages(filepath)
            if not pages:
                raise ValueError(f"No pages found in PDF: {filepath}")
            buf = BytesIO()
            pages[0].convert("RGB").save(buf, format="JPEG", quality=85)
            image_bytes = buf.getvalue()
            mime_type = "image/jpeg"
        else:
            with open(filepath, "rb") as f:
                image_bytes = f.read()
            mime_type = "image/png" if filepath.lower().endswith(".png") else "image/jpeg"
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    prompt = (
        "This is a photo of a handwritten or printed lecture note page. "
        "Extract the Subject (e.g. Physics, Chemistry, Math), the Topic or Lecture "
        "Title as clean_title, and the Date if visible (format YYYY-MM-DD, or empty string if not "
        "found). Respond ONLY with raw JSON, no markdown, matching exactly this "
        'schema: {"subject": string, "clean_title": string, "date": string}'
    )

    body = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime_type, "data": image_b64}}
            ]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
        }
    }

    try:
        resp = requests.post(gemini_url, headers=headers, json=body, timeout=30)
        resp.raise_for_status()
        result = resp.json()
    except requests.exceptions.RequestException as e:
        if getattr(e, "response", None) is not None:
            print(f"Status Code: {e.response.status_code}\nResponse Text: {e.response.text}")
            raise RuntimeError(f"Gemini API request failed (Status {e.response.status_code}).")
        else:
            print(f"Request failed: {type(e).__name__}")
            raise RuntimeError(f"Gemini API request failed ({type(e).__name__}).")

    try:
        raw_text = result["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(raw_text)
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        raise RuntimeError(f"Gemini OCR returned unparsable output: {result}") from e

    subject = sanitize_folder_name(parsed.get("subject") or "General")
    clean_title = sanitize_folder_name(parsed.get("clean_title") or parsed.get("topic") or "Untitled")
    date = parsed.get("date", "")
    return {
        "subject": subject,
        "clean_title": clean_title,
        "date": date,
    }


def enhance_and_deskew(image_input):
    if isinstance(image_input, Image.Image):
        if image_input.mode not in ('RGB', 'L'):
            image_input = image_input.convert('RGB')
        img_np = np.array(image_input)
        if len(img_np.shape) == 2:
            gray = img_np
        elif img_np.shape[2] == 4:
            gray = cv2.cvtColor(img_np, cv2.COLOR_RGBA2GRAY)
        else:
            gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    elif isinstance(image_input, np.ndarray):
        if len(image_input.shape) == 2:
            gray = image_input
        elif image_input.shape[2] == 4:
            gray = cv2.cvtColor(image_input, cv2.COLOR_BGRA2GRAY)
        else:
            gray = cv2.cvtColor(image_input, cv2.COLOR_BGR2GRAY)
    elif isinstance(image_input, (str, os.PathLike)):
        img = cv2.imread(str(image_input))
        if img is None:
            raise ValueError(f"Corrupt image: {image_input}")
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    norm_img = np.zeros((gray.shape[0], gray.shape[1]))
    final_img = cv2.normalize(gray, norm_img, 0, 255, cv2.NORM_MINMAX)
    dilated_img = cv2.dilate(final_img, np.ones((7, 7), np.uint8))
    bg_img = cv2.medianBlur(dilated_img, 21)
    return 255 - cv2.absdiff(final_img, bg_img)


def compile_a5_binder_document(pages, subject, clean_title, date, output_path):
    """
    Compiles scan pages into a standard A5 PDF with strict binder rules:
    - Target Canvas: Standard A5 (148 x 210 mm)
    - Alternating Gutter:
        * Odd pages (Recto): 15mm left inner margin, 8mm right margin
        * Even pages (Verso): 8mm left margin, 15mm right inner margin
    - Top margin: 12mm (includes running header space and 0.5pt rule)
    - Bottom margin: 10mm (includes running footer space)
    - Header: Document title, detected subject, and ISO date with 0.5pt rule underneath
    - Footer: Dynamic 'Page X of Y' on outer margin
    - Image Scaling: Proportionally scaled to maximum bounds of printable box, preserving aspect ratio
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    c = canvas.Canvas(output_path, pagesize=A5)
    total_pages = len(pages)
    iso_date = str(date).strip() if (date and str(date).strip()) else time.strftime("%Y-%m-%d")

    for idx, page_input in enumerate(pages, start=1):
        is_odd = (idx % 2 != 0)
        x_left = 15 * mm if is_odd else 8 * mm
        x_right = PAGE_WIDTH - (8 * mm if is_odd else 15 * mm)
        box_w = x_right - x_left  # 125 mm
        box_bottom = 10 * mm + 1.5 * mm
        box_top = PAGE_HEIGHT - 12 * mm - 1.5 * mm
        box_h = box_top - box_bottom

        # 1. Clean & enhance scan
        enhanced_np = enhance_and_deskew(page_input)
        enhanced_pil = Image.fromarray(enhanced_np).convert("RGB")
        img_w, img_h = enhanced_pil.size

        # 2. Proportionally scale scan to printable box bounds
        scale = min(box_w / img_w, box_h / img_h)
        draw_w = img_w * scale
        draw_h = img_h * scale
        draw_x = x_left + (box_w - draw_w) / 2.0
        draw_y = box_bottom + (box_h - draw_h) / 2.0

        c.drawImage(ImageReader(enhanced_pil), draw_x, draw_y, width=draw_w, height=draw_h)

        # 3. Running Header: Document title, detected subject, and ISO date
        c.setFont("Helvetica-Bold", 8)
        c.setFillColorRGB(0.1, 0.1, 0.1)
        header_title = f"{subject} - {clean_title}"
        max_title_w = box_w - 60 * mm
        if c.stringWidth(header_title, "Helvetica-Bold", 8) > max_title_w:
            while len(header_title) > 5 and c.stringWidth(header_title + "...", "Helvetica-Bold", 8) > max_title_w:
                header_title = header_title[:-1]
            header_title += "..."

        header_y = PAGE_HEIGHT - 8.5 * mm
        c.drawString(x_left, header_y, header_title)

        c.setFont("Helvetica", 8)
        c.setFillColorRGB(0.2, 0.2, 0.2)
        c.drawRightString(x_right, header_y, iso_date)

        # 0.5pt rule underneath header
        c.setLineWidth(0.5)
        c.setStrokeColorRGB(0.2, 0.2, 0.2)
        rule_y = PAGE_HEIGHT - 12 * mm
        c.line(x_left, rule_y, x_right, rule_y)

        # 4. Running Footer: dynamic 'Page X of Y' on outer margin
        c.setFont("Helvetica", 8)
        c.setFillColorRGB(0.2, 0.2, 0.2)
        page_str = f"Page {idx} of {total_pages}"
        footer_y = 4.5 * mm
        if is_odd:
            # Odd pages (Recto): outer margin is the right margin
            c.drawRightString(x_right, footer_y, page_str)
        else:
            # Even pages (Verso): outer margin is the left margin
            c.drawString(x_left, footer_y, page_str)

        c.showPage()

    c.save()
    return output_path


def move_to_processed(filepath, filename, subject=None):
    """
    Moves the original scan from 00_INBOX\\_INBOX_SCANS into 00_INBOX\\Processed.
    Also creates an archival copy in Subjects/{subject}/Raw_Scans when subject is known.
    """
    if subject:
        try:
            archive_dir = os.path.join(OUTPUT_DIR, subject, "Raw_Scans")
            os.makedirs(archive_dir, exist_ok=True)
            shutil.copy2(filepath, os.path.join(archive_dir, filename))
        except Exception as e:
            print(f"Notice: Could not copy to subject Raw_Scans: {e}")

    os.makedirs(PROCESSED_DIR, exist_ok=True)
    dest_path = os.path.join(PROCESSED_DIR, filename)
    if os.path.exists(dest_path):
        base, ext = os.path.splitext(filename)
        dest_path = os.path.join(PROCESSED_DIR, f"{base}_{int(time.time())}{ext}")

    shutil.move(filepath, dest_path)
    return dest_path


def process_scans():
    state = load_state()
    if not os.path.exists(INBOX_DIR):
        return

    files = [f for f in os.listdir(INBOX_DIR) if f.lower().endswith(SUPPORTED_EXTENSIONS)]

    for filename in sorted(files):
        filepath = os.path.join(INBOX_DIR, filename)

        if not os.path.exists(filepath):
            continue

        if not is_file_stable(filepath):
            print(f"Skipping (still syncing): {filename}")
            continue

        try:
            pages = load_scan_pages(filepath)
            if not pages:
                print(f"Warning: No pages extracted from {filename}. Skipping.")
                continue
        except Exception as e:
            print(f"Error reading/rendering {filename}: {e}")
            continue

        try:
            meta = extract_scan_metadata(pages[0])
            if isinstance(meta, dict):
                subject = sanitize_folder_name(meta.get("subject") or "General")
                clean_title = sanitize_folder_name(meta.get("clean_title") or meta.get("topic") or "Untitled")
                date = meta.get("date", "")
            else:
                subject, clean_title, date = meta
        except Exception as e:
            print(f"Warning: OCR metadata extraction failed for {filename} ({e}). Falling back to 'General'.")
            clean_base = sanitize_folder_name(os.path.splitext(filename)[0])
            subject, clean_title, date = "General", clean_base, ""

        # 1. Output Routing: Save final compiled A5 PDF to Ready_to_Print
        os.makedirs(READY_TO_PRINT_DIR, exist_ok=True)
        ready_pdf_filename = f"{subject} - {clean_title}.pdf"
        ready_pdf_path = os.path.join(READY_TO_PRINT_DIR, ready_pdf_filename)

        try:
            compile_a5_binder_document(pages, subject, clean_title, date, ready_pdf_path)

            # 2. Subject Archive Routing: Keep subject archives organized in 01_ACADEMIC_ENGINE\\Subjects\\<Subject>\\
            subject_dir = os.path.join(OUTPUT_DIR, subject)
            os.makedirs(subject_dir, exist_ok=True)
            subject_archive_pdf = os.path.join(subject_dir, ready_pdf_filename)
            shutil.copy2(ready_pdf_path, subject_archive_pdf)

            # Also maintain master cumulative notebook in Subjects/<Subject>/Compiled_Binder/<Subject>_Notebook_Q1.pdf
            binder_dir = os.path.join(subject_dir, "Compiled_Binder")
            os.makedirs(binder_dir, exist_ok=True)
            master_pdf = os.path.join(binder_dir, f"{subject}_Notebook_Q1.pdf")

            start_page = state.get(subject, 1)
            current_page = start_page

            try:
                writer = PdfWriter()
                if os.path.exists(master_pdf):
                    with open(master_pdf, 'rb') as f_in:
                        existing_bytes = BytesIO(f_in.read())
                    reader = PdfReader(existing_bytes)
                    for p in reader.pages:
                        writer.add_page(p)

                with open(ready_pdf_path, 'rb') as f_ready:
                    ready_reader = PdfReader(BytesIO(f_ready.read()))
                    for p in ready_reader.pages:
                        writer.add_page(p)
                        current_page += 1

                with open(master_pdf, 'wb') as f_out:
                    writer.write(f_out)

                state[subject] = current_page
                save_state(state)
            except Exception as e:
                print(f"Notice: Failed updating cumulative binder {master_pdf}: {e}")

            # 3. Archive raw scan and move from INBOX to Processed
            dest = move_to_processed(filepath, filename, subject=subject)

            num_pages = len(pages)
            page_desc = f"page {start_page}" if num_pages == 1 else f"pages {start_page}-{current_page - 1}"
            print(
                f"Processed: {filename} ({num_pages} page{'s' if num_pages > 1 else ''}) -> "
                f"Ready_to_Print: {ready_pdf_filename} & Subject Archive ({page_desc}) -> Moved to {dest}"
            )
        except Exception as e:
            print(f"Error compiling {filename}: {e}")


if __name__ == "__main__":
    print("Starting Life OS Binder Watcher...")
    while True:
        try:
            process_scans()
        except Exception as e:
            print(f"Watcher loop error (will retry): {e}")
        time.sleep(15)

