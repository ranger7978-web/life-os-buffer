import os
import time
import json
import base64
import re
import requests
import cv2
import numpy as np
from PIL import Image
from pypdf import PdfWriter, PdfReader
from io import BytesIO

INBOX_DIR = r"G:\My Drive\Life_OS\00_INBOX\_INBOX_SCANS"
OUTPUT_DIR = r"G:\My Drive\Life_OS\01_ACADEMIC_ENGINE\Subjects"
STATE_FILE = r"G:\My Drive\Life_OS\04_SYSTEM_CONFIG\page_state.json"

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


def extract_scan_metadata(image_path):
    """Calls Gemini Flash to OCR the scan and extract Subject, Topic, and Date."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set in the environment.")

    model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
    gemini_url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )

    with open(image_path, "rb") as f:
        image_bytes = f.read()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    mime_type = "image/png" if image_path.lower().endswith(".png") else "image/jpeg"

    prompt = (
        "This is a photo of a handwritten or printed lecture note page. "
        "Extract the Subject (e.g. Physics, Chemistry, Math), the Topic or Lecture "
        "Title, and the Date if visible (format YYYY-MM-DD, or empty string if not "
        "found). Respond ONLY with raw JSON, no markdown, matching exactly this "
        'schema: {"subject": string, "topic": string, "date": string}'
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

    resp = requests.post(gemini_url, json=body, timeout=30)
    resp.raise_for_status()
    result = resp.json()

    try:
        raw_text = result["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(raw_text)
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        raise RuntimeError(f"Gemini OCR returned unparsable output: {result}") from e

    subject = sanitize_folder_name(parsed.get("subject") or "General")
    topic = parsed.get("topic", "")
    date = parsed.get("date", "")
    return subject, topic, date


def enhance_and_deskew(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Corrupt image: {image_path}")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
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


def process_scans():
    state = load_state()
    if not os.path.exists(INBOX_DIR):
        return
    files = [f for f in os.listdir(INBOX_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

    for filename in sorted(files):
        filepath = os.path.join(INBOX_DIR, filename)

        if not is_file_stable(filepath):
            print(f"Skipping (still syncing): {filename}")
            continue

        try:
            subject, topic, date = extract_scan_metadata(filepath)
        except Exception as e:
            print(f"OCR failed for {filename}: {e}")
            continue

        subject_dir = os.path.join(OUTPUT_DIR, subject, "Compiled_Binder")
        os.makedirs(subject_dir, exist_ok=True)
        master_pdf = os.path.join(subject_dir, f"{subject}_Notebook_Q1.pdf")

        current_page = state.get(subject, 1)
        is_odd = (current_page % 2) != 0

        try:
            cleaned = enhance_and_deskew(filepath)
            final_page = inject_margins(cleaned, is_odd_page=is_odd)

            pdf_bytes = BytesIO()
            final_page.save(pdf_bytes, format='PDF', resolution=DPI)
            pdf_bytes.seek(0)

            writer = PdfWriter()
            if os.path.exists(master_pdf):
                reader = PdfReader(master_pdf)
                for p in reader.pages:
                    writer.add_page(p)

            writer.add_page(PdfReader(pdf_bytes).pages[0])
            with open(master_pdf, 'wb') as f_out:
                writer.write(f_out)

            state[subject] = current_page + 1
            save_state(state)

            archive_dir = os.path.join(OUTPUT_DIR, subject, "Raw_Scans")
            os.makedirs(archive_dir, exist_ok=True)
            os.rename(filepath, os.path.join(archive_dir, filename))

            print(f"Processed: {filename} -> {subject} / {topic or 'Untitled'} (page {current_page})")
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
