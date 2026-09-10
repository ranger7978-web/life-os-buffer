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

try:
    import pypdfium2 as pdfium
except ImportError:
    pdfium = None

INBOX_DIR = r"G:\My Drive\Life_OS\00_INBOX\_INBOX_SCANS"
PROCESSED_DIR = r"G:\My Drive\Life_OS\00_INBOX\Processed"
OUTPUT_DIR = r"G:\My Drive\Life_OS\01_ACADEMIC_ENGINE\Subjects"
STATE_FILE = r"G:\My Drive\Life_OS\04_SYSTEM_CONFIG\page_state.json"

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


def inject_margins(processed_img, is_odd_page):
    h, w = processed_img.shape
    new_w = w + MARGIN_PIXELS
    canvas = np.full((h, new_w), 255, dtype=np.uint8)
    if is_odd_page:
        canvas[:, MARGIN_PIXELS:] = processed_img
    else:
        canvas[:, :w] = processed_img
    return Image.fromarray(canvas)


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

        subject_dir = os.path.join(OUTPUT_DIR, subject, "Compiled_Binder")
        os.makedirs(subject_dir, exist_ok=True)
        master_pdf = os.path.join(subject_dir, f"{subject}_Notebook_Q1.pdf")

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

            for page_img in pages:
                is_odd = (current_page % 2) != 0
                cleaned = enhance_and_deskew(page_img)
                final_page = inject_margins(cleaned, is_odd_page=is_odd)

                pdf_bytes = BytesIO()
                final_page.save(pdf_bytes, format='PDF', resolution=DPI)
                pdf_bytes.seek(0)

                writer.add_page(PdfReader(pdf_bytes).pages[0])
                current_page += 1

            with open(master_pdf, 'wb') as f_out:
                writer.write(f_out)

            state[subject] = current_page
            save_state(state)

            dest = move_to_processed(filepath, filename, subject=subject)

            num_pages = len(pages)
            page_desc = f"page {start_page}" if num_pages == 1 else f"pages {start_page}-{current_page - 1}"
            print(
                f"Processed: {filename} ({num_pages} page{'s' if num_pages > 1 else ''}) -> "
                f"{subject} / {clean_title or 'Untitled'} ({page_desc}) -> Moved to {dest}"
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

