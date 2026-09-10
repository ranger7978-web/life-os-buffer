# IMPLEMENTATION & EXECUTION RUNBOOK (IMPLEMENTATION.md)
**Target Tool:** Antigravity IDE (Agentic Execution Mode)
**Dependencies:** Node.js + Wrangler CLI (Cloudflare), Google Cloud Platform (Service Account), a Gemini API key (Google AI Studio), Python 3.11+, PowerShell 7+
**Execution Objective:** Bootstrap the Life OS topology — edge ingestion, idempotent state writes, Gemini-based extraction, and local maintenance — with no manual data entry.

---

## PHASE 0: CONFIGURATION & SECRETS MANIFEST

Provision every value below before writing or deploying any code. Nothing in later phases should introduce a new secret or ID that isn't listed here first.

| Target Location | Variable / Secret Name | Description | Example / Format |
|---|---|---|---|
| Cloudflare Worker | `INGESTION_SECRET` | Shared bearer token every inbound request must present | 32+ char random hex string |
| Cloudflare Worker | `GOOGLE_CLIENT_EMAIL` | GCP service account email (Sheets/Drive/Calendar/Tasks scope) | `life-os-worker@life-os-core.iam.gserviceaccount.com` |
| Cloudflare Worker | `GOOGLE_PRIVATE_KEY` | GCP service account RSA private key, PKCS8 PEM | `-----BEGIN PRIVATE KEY-----\n...` |
| Cloudflare Worker | `GEMINI_API_KEY` | Google AI Studio API key for Gemini Flash calls | AI Studio–issued key string |
| Cloudflare Worker | `GEMINI_MODEL` | Model ID to call (not a secret — plain var) | e.g. `gemini-2.0-flash`; verify the current alias in AI Studio before deploying, model IDs change over time |
| Cloudflare Worker | `AMBAGAN_SHEET_ID` | Spreadsheet ID of `Ambagan_Queue.gsheet` | the file ID segment of the sheet's URL |
| Cloudflare Worker | `STAKEHOLDER_SHEET_ID` | Spreadsheet ID of `Stakeholder_Graph.gsheet` | the file ID segment of the sheet's URL |
| Cloudflare Worker | `IDEMPOTENCY_KV` | KV namespace binding — used for dedupe, dead-letter storage, and token caching | bound in `wrangler.toml` |
| MacroDroid | `lv_server_secret` | Local variable holding the same value as `INGESTION_SECRET` | sent as `Authorization: Bearer <value>` |
| ThinkPad (Python env) | `GEMINI_API_KEY` | Same Gemini key, exposed to `binder_compiler.py` | persistent Windows environment variable |
| ThinkPad (Python env) | `GEMINI_MODEL` | Same model ID as the Worker, for consistency | persistent Windows environment variable |
| ThinkPad (filesystem) | Drive mount | Google Drive for Desktop VFS root | `G:\My Drive\Life_OS\` |

---

## PHASE 1: ENVIRONMENT & REPOSITORY INITIALIZATION

### 1.1. Directory Scaffolding (Google Drive Desktop Mount)

```bash
mkdir -p "G:/My Drive/Life_OS/00_INBOX/_INBOX_SCANS"
mkdir -p "G:/My Drive/Life_OS/00_INBOX/_INBOX_ACADEMIC"
mkdir -p "G:/My Drive/Life_OS/00_INBOX/_INBOX_PORTFOLIO"
mkdir -p "G:/My Drive/Life_OS/00_INBOX/_INBOX_AWARDS"
mkdir -p "G:/My Drive/Life_OS/00_INBOX/_INBOX_DESKTOP"
mkdir -p "G:/My Drive/Life_OS/01_ACADEMIC_ENGINE/Ready_to_Print"
mkdir -p "G:/My Drive/Life_OS/01_ACADEMIC_ENGINE/Ready_to_Copy"
mkdir -p "G:/My Drive/Life_OS/01_ACADEMIC_ENGINE/Pocket_Cheat_Sheets"
mkdir -p "G:/My Drive/Life_OS/02_DATA_REGISTRIES"
mkdir -p "G:/My Drive/Life_OS/03_SYSTEM_VAULTS"
mkdir -p "G:/My Drive/Life_OS/04_SYSTEM_CONFIG"
```

### 1.2. Service Account & API Key Setup (GCP + AI Studio)

1. In Google Cloud Console, create project `life-os-core`.
2. Enable APIs: Google Sheets API, Google Drive API, Google Calendar API, Google Tasks API.
3. Create a service account: `life-os-worker@life-os-core.iam.gserviceaccount.com`, and generate a JSON key. This credential is for Sheets/Drive/Calendar/Tasks only — it is **not** used for Gemini.
4. Separately, generate a Gemini API key from Google AI Studio. This is a plain API key, not an OAuth credential, and is passed as a query parameter or header on `generativelanguage.googleapis.com` calls.
5. Share every Google Sheet the Worker will write to with the service account email, with Editor permission.
6. Inject all secrets into the Worker — never commit them to source control and never reference a local file path from Worker code, since the Worker runs on Cloudflare's edge, not on the ThinkPad:

```bash
wrangler secret put INGESTION_SECRET
wrangler secret put GOOGLE_CLIENT_EMAIL
wrangler secret put GOOGLE_PRIVATE_KEY
wrangler secret put GEMINI_API_KEY
```

---

## PHASE 2: CLOUDFLARE WORKER INGESTION BUFFER

### 2.1. Wrangler Project Setup

```bash
npm install -g wrangler
wrangler init life-os-buffer
cd life-os-buffer
wrangler kv:namespace create "IDEMPOTENCY_KV"
```

Take the namespace ID returned by that command and put it in `wrangler.toml`:

```toml
name = "life-os-buffer"
main = "src/index.js"
compatibility_date = "2025-01-01"

[[kv_namespaces]]
binding = "IDEMPOTENCY_KV"
id = "REPLACE_WITH_ID_FROM_WRANGLER_OUTPUT"

[vars]
GEMINI_MODEL = "gemini-2.0-flash"
AMBAGAN_SHEET_ID = "REPLACE_WITH_SHEET_ID"
STAKEHOLDER_SHEET_ID = "REPLACE_WITH_SHEET_ID"
```

`GEMINI_MODEL` and the sheet IDs are plain vars, not secrets — they aren't sensitive, and keeping them in `wrangler.toml` makes them visible in source control, which is what you want for IDs (unlike keys).

### 2.2. Edge-Safe Ingestion Worker (`src/index.js`)

This Worker authenticates the request, deduplicates by client UUID, acknowledges immediately, and processes in the background with a dead-letter path on failure. All Google Sheets access uses hand-rolled RS256 JWT signing via Web Crypto — no `googleapis` package, which does not run in the Workers runtime.

```javascript
export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.INGESTION_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
      const payload = await request.json();
      const { uuid, event_type, timestamp, data } = payload;

      if (!uuid || !event_type || !timestamp || typeof data !== 'object' || data === null) {
        return new Response(JSON.stringify({ error: 'Malformed Payload Schema' }), { status: 400 });
      }

      const existing = await env.IDEMPOTENCY_KV.get(uuid);
      if (existing === 'IN_FLIGHT' || existing === 'COMPLETED') {
        return new Response(JSON.stringify({ status: 'DUPLICATE_IGNORED', uuid }), { status: 200 });
      }

      await env.IDEMPOTENCY_KV.put(uuid, 'IN_FLIGHT', { expirationTtl: 86400 });

      ctx.waitUntil(handleEvent(uuid, event_type, timestamp, data, env));

      return new Response(JSON.stringify({ status: 'ACKNOWLEDGED', uuid }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Invalid request', detail: err.message }), { status: 400 });
    }
  }
};

async function handleEvent(uuid, eventType, timestamp, data, env) {
  try {
    await routeEvent(eventType, data, env);
    await env.IDEMPOTENCY_KV.put(uuid, 'COMPLETED', { expirationTtl: 86400 });
  } catch (err) {
    // Unlock quickly (60s) rather than leaving the key IN_FLIGHT for 24h,
    // so a manual or automated DLQ replay with the same UUID is not blocked.
    await env.IDEMPOTENCY_KV.put(uuid, 'FAILED', { expirationTtl: 60 });
    await env.IDEMPOTENCY_KV.put(
      `DLQ_${uuid}`,
      JSON.stringify({
        error: err.message,
        event_type: eventType,
        timestamp,
        failed_at: new Date().toISOString()
      }),
      { expirationTtl: 604800 }
    );
    // Deliberately not logging raw `data` here — it may contain financial
    // amounts or Stakeholder_Graph content. Only metadata is persisted.
  }
}

async function routeEvent(eventType, data, env) {
  if (eventType === 'EXPENSE_OR_AMBAGAN') {
    await appendAmbaganRow(data, env);
  } else if (eventType === 'STAKEHOLDER_UPDATE') {
    await appendStakeholderRow(data, env);
  } else {
    throw new Error(`Unsupported event type: ${eventType}`);
  }
}

async function appendAmbaganRow(data, env) {
  const values = [[
    data.id, data.date, data.description, data.amount, data.due_date, data.category, 'Queued'
  ]];
  await appendToSheet(env.AMBAGAN_SHEET_ID, 'Sheet1!A:G', values, env);
}

async function appendStakeholderRow(data, env) {
  // data = { name, text_lines, date } — raw notification payload from MacroDroid.
  // The actual extraction happens here, server-side, via Gemini Flash.
  const extracted = await classifyStakeholderSignal(data.name, data.text_lines, env);

  const values = [[
    data.name,
    extracted.role_context,
    extracted.work_style_preference,
    extracted.reliability_vector,
    extracted.conflict_deescalation,
    extracted.active_dependencies,
    data.date || new Date().toISOString().slice(0, 10)
  ]];
  await appendToSheet(env.STAKEHOLDER_SHEET_ID, 'Sheet1!A:G', values, env);
}

async function classifyStakeholderSignal(name, textLines, env) {
  const messageText = Array.isArray(textLines) ? textLines.join('\n') : String(textLines || '');
  const model = env.GEMINI_MODEL || 'gemini-2.0-flash';

  const prompt = 'You are a triage classifier for a personal project-collaboration log. ' +
    'Given a short chat excerpt involving "' + name + '", extract structured collaboration signals. ' +
    'Respond ONLY with raw JSON, no markdown, no commentary, matching exactly this schema: ' +
    '{"role_context": string, "work_style_preference": string, "reliability_vector": string, ' +
    '"conflict_deescalation": string, "active_dependencies": string}. ' +
    'If a field cannot be determined from the text, use an empty string for that field.\n\n' +
    'Message excerpt:\n"""\n' + messageText + '\n"""';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${errorText}`);
  }

  const result = await res.json();
  const rawText = result && result.candidates && result.candidates[0] &&
    result.candidates[0].content && result.candidates[0].content.parts &&
    result.candidates[0].content.parts[0] && result.candidates[0].content.parts[0].text;

  if (!rawText) {
    throw new Error('Gemini returned no classification text');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Gemini returned non-JSON output: ${rawText}`);
  }

  return {
    role_context: parsed.role_context || '',
    work_style_preference: parsed.work_style_preference || '',
    reliability_vector: parsed.reliability_vector || '',
    conflict_deescalation: parsed.conflict_deescalation || '',
    active_dependencies: parsed.active_dependencies || ''
  };
}

async function appendToSheet(spreadsheetId, range, values, env) {
  const token = await getGoogleAuthToken(env);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Sheets API error: ${res.status} - ${errorText}`);
  }
}

async function getGoogleAuthToken(env) {
  // Cache the access token in KV so a JWT isn't re-signed on every single
  // event — RSA signing is the most CPU-expensive step in this handler.
  const cached = await env.IDEMPOTENCY_KV.get('GOOGLE_ACCESS_TOKEN_CACHE');
  if (cached) return cached;

  const cleanKey = env.GOOGLE_PRIVATE_KEY
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');

  const binaryDer = Uint8Array.from(atob(cleanKey), c => c.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: env.GOOGLE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaim = base64url(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  );

  const jwt = `${signatureInput}.${base64url(new Uint8Array(signature))}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`OAuth error: ${JSON.stringify(tokenData)}`);
  }

  // Cache slightly under the real 3600s expiry so a stale token is never used.
  await env.IDEMPOTENCY_KV.put('GOOGLE_ACCESS_TOKEN_CACHE', tokenData.access_token, { expirationTtl: 3000 });

  return tokenData.access_token;
}

function base64url(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
```

**Deployment note:** RSA signing plus two outbound `fetch` calls (OAuth exchange + Sheets/Gemini) will exceed the Workers **free-tier 10ms CPU budget**. This requires the **Workers Paid plan** ($5/mo, 30s CPU ceiling) — deploying to the free tier will produce intermittent CPU-limit errors that look like random failures.

**Known limitation:** KV is eventually consistent across edge locations (up to ~60s propagation). If duplicate-send storms from the same UUID become a real problem in practice, replace the KV-based idempotency check with a Durable Object, which gives true atomic compare-and-swap. Not implemented here to keep the MVP scope tight — flagged for follow-up.

---

## PHASE 3: SENSORY EDGE CONFIGURATION (MACRODROID)

### 3.1. Notification Listener Setup

- **Trigger:** Notification Received → Applications: Messenger.
- **Configuration:** Action: Intercept. Enable "Ignore Ongoing Notifications." Read the `android.textLines` bundle extra to capture stacked/grouped message lines rather than relying on the summary notification body text.
- **Metadata Filter (pre-send, on-device):** If notification text contains "sent an attachment" OR length < 3 characters → Cancel Macro. This is a type/length filter only — no content regex. All semantic classification happens server-side in the Worker via Gemini, not on-device.
- **Verify empirically** that `android.textLines` is actually populated under real grouped-notification conditions on the target device/OS version before relying on it — Android's notification-grouping behavior varies by OEM skin and app version.

### 3.2. Payload Packaging (MacroDroid JavaScript)

```javascript
var uuid = Date.now() + "_" + Math.random().toString(36).substring(2, 7);
var payload = {
  uuid: uuid,
  event_type: "STAKEHOLDER_UPDATE",
  timestamp: new Date().toISOString(),
  data: {
    name: lv_sender_name,
    text_lines: lv_extracted_lines,
    date: new Date().toISOString().slice(0, 10)
  }
};
```

### 3.3. HTTP Action

- **Method:** POST
- **URL:** `https://life-os-buffer.[your-subdomain].workers.dev/`
- **Header:** `Authorization: Bearer [lv_server_secret]`
- **Body:** `[lv_payload]`
- **Timeout:** 5 seconds.
- **On failure:** insert the payload into the local SQLite table `offline_queue.db`, keyed by the same client-generated `uuid`.

### 3.4. Offline Queue Flush

- **Trigger:** Connectivity Change → Connected to Wi-Fi OR Mobile Data.
- **Actions:** Query `offline_queue.db` for un-synced rows → loop each row, re-POST to the Worker with its original `uuid` intact → on HTTP 200, delete the row. Because the `uuid` is preserved across retries, the Worker's idempotency check absorbs duplicate sends safely, including the case where a prior POST actually succeeded but the phone never saw the response.

---

## PHASE 4: ACADEMIC BINDER COMPILER (PYTHON CORE)

`binder_compiler.py` watches `_INBOX_SCANS`, waits for each file to finish syncing from Google Drive Desktop, calls Gemini Flash to OCR the Subject/Topic/Date directly from the image (not from the filename), then deskews, adds the punch-hole margin, and appends the page to the subject's binder PDF.

**Dependencies:** `pip install opencv-python-headless pillow pypdf requests numpy`

```python
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

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)

PUNCH_MARGIN_MM = 30
DPI = 300
MARGIN_PIXELS = int((PUNCH_MARGIN_MM / 25.4) * DPI)
STABILITY_CHECK_SECONDS = 3


def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    return {}


def save_state(state):
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)


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
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set in the environment.")

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

    resp = requests.post(GEMINI_URL, json=body, timeout=30)
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
```

**Deliberate additions beyond your original spec of this file:** a file-stability check before reading (avoids misreading a scan that Google Drive Desktop is still writing to disk, which previously would have been misclassified as "corrupt"), and a top-level `try/except` around the watcher's main loop (a transient `G:\` disconnect during a Drive Desktop restart would otherwise kill the whole process until manually restarted).

Register this as a persistent process (Task Scheduler "At log on" trigger, or a Windows service via NSSM) rather than a one-shot script — nothing in this phase restarts it automatically if it crashes outside the loop's own `try/except`.

---

## PHASE 5: THINKPAD MAINTENANCE & EPHEMERAL PURGE

### 5.1. Auto-Cleanup PowerShell Script (`maintenance_daemon.ps1`)

```powershell
$DownloadsPath = "C:\Users\Gian\Downloads"
$DriveInboxDesktop = "G:\My Drive\Life_OS\00_INBOX\_INBOX_DESKTOP"
$RantBufferPath = "G:\My Drive\Life_OS\03_SYSTEM_VAULTS\Ephemeral_Rants.json"

Write-Host "Starting Weekly Life OS Maintenance..." -ForegroundColor Cyan

# 1. Delete installer binaries older than 14 days
$Binaries = Get-ChildItem -Path $DownloadsPath -Include *.exe, *.msi, *.iso -Recurse |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) }

foreach ($file in $Binaries) {
    Remove-Item $file.FullName -Force
    Write-Host "Deleted binary: $($file.Name)" -ForegroundColor Yellow
}

# 2. Move documents older than 3 days to the Drive inbox
$Docs = Get-ChildItem -Path $DownloadsPath -Include *.pdf, *.docx, *.xlsx, *.pptx -Recurse |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-3) }

foreach ($doc in $Docs) {
    Move-Item -Path $doc.FullName -Destination $DriveInboxDesktop -Force
    Write-Host "Moved to Drive Inbox: $($doc.Name)" -ForegroundColor Green
}

# 3. Purge ephemeral voice rants older than 48 hours
if (Test-Path $RantBufferPath) {
    try {
        $rants = @(Get-Content $RantBufferPath -Raw | ConvertFrom-Json)
        $cutoff = (Get-Date).AddHours(-48)
        $retained = @($rants | Where-Object { [DateTime]$_.timestamp -gt $cutoff })
        $retained | ConvertTo-Json -Depth 5 | Set-Content $RantBufferPath
        Write-Host "Ephemeral rants purged. Retained entries: $($retained.Count)" -ForegroundColor Cyan
    } catch {
        Write-Host "Warning: Could not process Ephemeral_Rants.json - $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 4. Clean Windows temp buffers
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Clear-RecycleBin -Force -Confirm:$false -ErrorAction SilentlyContinue

Write-Host "Maintenance Run Complete." -ForegroundColor Green
```

Note the `@( ... )` array-cast around the rants read and the filtered result — without it, PowerShell silently unwraps a single-element JSON array into a bare object, which breaks `.Count` and downstream iteration the day your rant buffer happens to hold exactly one entry.

### 5.2. Task Scheduler Registration

```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File C:\Users\Gian\Scripts\maintenance_daemon.ps1"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 11:00PM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "LifeOS_ThinkPad_Janitor" -Description "Maintains downloads directory hygiene, purges ephemeral rants, and cleans temporary files."
```

---

## PHASE 6: ANTIGRAVITY AGENT DIRECTIVES

```
[ANTIGRAVITY AGENT DIRECTIVE]
1. You are implementing the Life OS as specified in SPEC.md and IMPLEMENTATION.md.
2. The Cloudflare Worker (src/index.js) owns every write to Google Sheets. Google Sheets
   is a passive state store — never write to a Sheet directly from Python or PowerShell.
3. Reference G:\My Drive\Life_OS as the only Drive mount point. Never hardcode any other
   personal directory path.
4. Every Gemini API call (Worker and Python) must set generationConfig.responseMimeType
   to "application/json" and use a low temperature (~0.1) for extraction tasks. Always
   parse the response defensively (try/catch) — never assume the model's output is
   pre-validated JSON.
5. Never log raw message text, financial amounts, or Stakeholder_Graph field content to
   console/stdout in the Worker or the Python script. Log event_type, uuid, and status
   only.
6. Every idempotency key in IDEMPOTENCY_KV must resolve to COMPLETED or FAILED. Never
   leave a key permanently stuck at IN_FLIGHT — this blocks legitimate replays.
7. Treat network connectivity as intermittent everywhere. Every client-originated write
   needs a client-generated UUID and must be safe to send more than once.
```

---

## PHASE 7: KNOWN LIMITATIONS & NEXT-PHASE ITEMS

This runbook implements the ingestion buffer, idempotency/dead-letter handling, Gemini-based extraction for `STAKEHOLDER_UPDATE`, the binder compiler with real OCR, and ThinkPad maintenance. It does **not** yet implement:

- **TOC sheet sync from the binder compiler.** Spec 1.1 calls for an automated Table of Contents update per subject. The clean way to add this is a new `TOC_UPDATE` event type posted from `binder_compiler.py` to the same Worker endpoint (reusing its auth, idempotency, and dead-letter handling), rather than giving the Python script its own separate Google credential path. Not built here to avoid shipping an untested new code path in the same pass as the fixes you asked for.
- **The other registries** — `Portfolio_Registry.gsheet`, `Cashew_Sync.gsheet`, `Curriculum_Coverage.gsheet`, `Master_Credentials.gsheet` — have no event type wired into `routeEvent` yet. Only `EXPENSE_OR_AMBAGAN` and `STAKEHOLDER_UPDATE` exist.
- **Gemini rate-limit/backoff handling.** Neither the Worker nor the Python script retries on a 429 from Gemini; a failure just lands in the DLQ (Worker) or gets skipped and retried on the next 15s poll (Python). Fine at low volume, worth hardening before heavy use.
- **Durable Object–based idempotency**, if KV's eventual consistency ever proves insufficient in practice (see the note in Phase 2).
