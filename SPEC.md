# SYSTEM SPECIFICATION DOCUMENT (SPEC.md)
**Project Title:** Personal Nervous System (Life OS)  
**Target Environment:** Android (MacroDroid) + Cloudflare Workers + Google Workspace (Drive, Sheets, Tasks, Calendar) + Gemini 2.0 Flash API + Windows 11 (ThinkPad E14)  
**Execution Paradigm:** Headless, Event-Driven, Edge-Buffered, Local-First Sensory Layer, Zero-Manual Data Entry  
**Revision:** 2.2 (Verified Architecture Baseline — Synchronized with IMPLEMENTATION.md)

---

## 1. ARCHITECTURAL INVARIANTS & SYSTEM PHILOSOPHY

1. **Edge-Buffered Ingestion (Zero Direct GAS Calls):** Android notifications and edge sensors never target Google Apps Script directly. All edge events terminate at an authenticated Cloudflare Worker edge buffer to absorb burst concurrency and eliminate `429 Too Many Simultaneous Invocations` dropped packets.
2. **Strict Idempotency End-to-End:** Every event originating from client sensors carries an immutable client-generated UUID (`epoch_ms + hash`). The ingestion tier validates UUIDs against a KV store (24-hour TTL). Keys resolve to `COMPLETED` on success or unlock to `FAILED` (60s TTL) on failure to ensure dead-letter queue (DLQ) replays are never blocked.
3. **Atomic, Single-Purpose AI Invocations:** No monolithic context windows. Gemini Flash is called statelessly for targeted OCR, metadata parsing, and structured JSON extraction. All generation prompts enforce `responseMimeType: "application/json"` and low temperature (~0.1).
4. **Hard Structural Air-Gap (File-ID Whitelisting):** Sensitive collaboration matrices, personal reflections, and financial ledgers are structurally isolated. Prompts generating academic outputs, resumes, or public correspondence receive explicit Google Drive File IDs only. Folder-level or Drive-wide grounding is strictly prohibited.
5. **Ethical Stakeholder Collaboration (Zero Surveillance):** Replaces personal lore/scoring with an engineering-grade Stakeholder Collaboration Graph (`Stakeholder_Graph.gsheet`) focusing on working styles, active project dependencies, and de-escalation rules. Raw audio/transcripts reside in temporary memory and auto-purge after 48 hours.
6. **Transparent Financial Docketing & Disclosed Barya Sentry:** Replaces stealth money-splitting with an itemized, predictable academic contribution docket (`Ambagan_Queue.gsheet`). Routine transit change is openly acknowledged and tagged in Cashew as an emergency commute float.

---

## 2. SYSTEM TOPOLOGY┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: SENSORY EDGE                            │
│  • Android MacroDroid: Notification listener (android.textLines),      │
│    Quick Settings tiles, volume-hardware triggers, SQLite offline queue│
│  • Google Drive for Desktop: Local VFS mount (G:\My Drive\Life_OS)    │
│  • ThinkPad E14 Background Daemons: Python binder OCR & PowerShell     │
└──────────────────────────────────┬─────────────────────────────────────┘
│ HTTPS POST (Bearer Auth + Client UUID)
▼
┌────────────────────────────────────────────────────────────────────────┐
│                   TIER 2: CLOUDFLARE WORKER BUFFER                     │
│  • Instant 200 OK edge acknowledgment (<40ms latency)                  │
│  • KV-backed 24-hour Deduplication & Idempotency Validator             │
│  • Bearer Token Authentication & Strict Payload Schema Validation      │
│  • Dead-Letter Queue (DLQ_ KV entries) for failed downstream writes    │
│  • OAuth Access Token Caching (3000s TTL) to minimize RSA sign budget   │
│  • Direct Google Sheets REST API invocation via Web Crypto RS256 JWT   │
│  • Server-side Gemini 2.0 Flash classification proxy                   │
└──────────────────────────────────┬─────────────────────────────────────┘
│ Authorized REST API Calls
▼
┌────────────────────────────────────────────────────────────────────────┐
│              TIER 3: DATABASE & WORKSPACE REPOSITORIES                 │
│  • Google Drive: Hot Folders (_INBOX, Ready_to_Print, Pocket_Sheets)   │
│  • Google Sheets: Living state ledgers (Stakeholders, Portfolio, Cash) │
│  • Google Calendar & Tasks: Auto-balanced time blocks & hard deadlines │
│  • Cashew App: Local offline financial tracking via deep-links         │
│  • NotebookLM: Isolated academic study engine grounded in teacher PDFs │
└────────────────────────────────────────────────────────────────────────┘


---

## 3. FILE SYSTEM SCHEMA (GOOGLE DRIVE VFS)

G:\My Drive\Life_OS

├── 00_INBOX

│   ├── _INBOX_SCANS\              <-- Raw loose-leaf A4 note photos
│   ├── _INBOX_ACADEMIC\           <-- Syllabi, handouts, problem set sheets
│   ├── _INBOX_PORTFOLIO\          <-- Graded quizzes & activities returned
│   ├── _INBOX_AWARDS\             <-- Certificates, medals, commendations
│   └── _INBOX_DESKTOP\            <-- Auto-routed files from PC Downloads
├── 01_ACADEMIC_ENGINE

│   ├── Subjects

│   │   └── [Subject_Name]

│   │       ├── Raw_Scans\         <-- Deskewed individual lecture scans
│   │       ├── Compiled_Binder\   <-- Master chronological A5/B5 PDFs
│   │       └── Source_Docs\       <-- Handouts, syllabus, teacher slides
│   ├── Ready_to_Print\            <-- Bucket 1: Solved homework & binder PDFs
│   ├── Ready_to_Copy\             <-- Bucket 2: Handwritten condensed guides
│   └── Pocket_Cheat_Sheets\       <-- Micro-reference formula cards
├── 02_DATA_REGISTRIES

│   ├── Portfolio_Registry.gsheet  <-- Physical artifact tracking
│   ├── Curriculum_Coverage.gsheet <-- Living topic matrices and drift status
│   ├── Stakeholder_Graph.gsheet   <-- Ethical project collaboration matrix
│   ├── Ambagan_Queue.gsheet       <-- Itemized school expense docket
│   └── Master_Credentials.gsheet  <-- Extracted award metadata
├── 03_SYSTEM_VAULTS

│   ├── Curiosity_Vault.md         <-- Captured rabbit holes and deep dives
│   ├── Decision_Journal.md        <-- Tactical choices & counterfactuals
│   ├── Friction_Bug_Bounty.md     <-- Daily micro-annoyances
│   └── Ephemeral_Rants.json       <-- Rolling 48h temporary venting buffer
└── 04_SYSTEM_CONFIG

├── Teacher_Profiles.json      <-- Behavioral quirks & quiz heuristics
├── User_Profile.json          <-- Bio baselines, sizes, schedule rules
└── page_state.json            <-- State ledger for odd/even binder pages


---

## 4. FUNCTIONAL DOMAIN SPECIFICATIONS

### MODULE 1: Academic Engine, Binder Logistics & Teacher Intelligence

* **1.1. Loose A4 to Binder Compilation Pipeline:**
  * Loose A4 handwritten notes dropped into `_INBOX_SCANS` are observed by `binder_compiler.py`.
  * Checks file-write stability (3-second byte delta check) to prevent reading files during Drive Desktop sync.
  * Direct multimodal call to Gemini 2.0 Flash OCR extracts `subject`, `topic`, and `date` directly from image pixels.
  * Auto-deskews, normalizes contrast, and strips uneven background shadows via OpenCV morphological dilation.
  * Reads current page parity from `page_state.json`. Injects a 30mm blank margin on the left for odd pages, and on the right for even pages, preventing binder ring holes from cutting handwriting.
  * Appends the processed page sequentially into `[Subject]_Notebook_Q1.pdf` and archives the raw scan.
* **1.2. Two-Stream Output Engine:**
  * *Stream A (Ready to Print):* Formatted assignments, lab reports, and problem sets typeset with complete solutions ready for printer hand-in.
  * *Stream B (Ready to Copy):* High-density, condensed, bulleted reference layouts designed for quick manual copying into physical notebooks during free periods.
* **1.3. Curriculum Drift & Syllabus Auditor:**
  * Uses DepEd 3-term calendars and online syllabi stored in `Curriculum_Coverage.gsheet` as baseline.
  * 1-Tap quick-triage actions: `[ Skipped ]`, `[ Resequenced ]`, `[ Need Notes ]`.
  * `[ Classmate Diff ]`: Compares a classmate's Table of Contents scan against your own binder index to highlight missing dates or skipped derivations.
* **1.4. Teacher Behavioral Profiler & Quiz Predictor:**
  * Evaluates teacher pacing, syllabus adherence, and historical patterns stored in `Teacher_Profiles.json`.
  * Computes unannounced quiz risk:
    $$P(\text{Quiz}) = f(\text{Days since chapter completion}, \text{Day of week}, \text{Lab routine})$$
  * Issues a warning alert in the Morning Briefing 24 hours in advance.
* **1.5. Pocket Cheat Sheet & Reviewer Suite:**
  * Automatically compiles modular formula sheets, concept comparison matrices, and credit-card-sized reference cards formatted to fit inside an ID sleeve for quick pre-bell reviews.

### MODULE 2: Physical Artifacts & Portfolio Sentry

* **2.1. Physical Artifact State Machine (`Portfolio_Registry.gsheet`):**
  * Tracks physical paper outputs across states:
    $$\text{Assigned} \longrightarrow \text{Pending Submission} \longrightarrow \text{With Teacher} \longrightarrow \text{Returned (Loose)} \longrightarrow \text{Scanned \& In Binder}$$
  * Omni-Capture voice trigger (*"Logged returned quiz: Physics Lab 1, score 29/30"*) marks the entry `Returned (Loose)`.
  * Dropping the graded sheet scan into `_INBOX_PORTFOLIO` matches the assignment title, attaches the Drive URL, and updates state to `Scanned & In Binder`.
* **2.2. End-of-Term Portfolio Audit:**
  * Triggers 14 days and 7 days prior to quarterly grading closure.
  * Lists papers remaining in `With Teacher` state to prompt retrieval from instructors before portfolio binding deadlines.

### MODULE 3: Omnipresent Sensory Layer & Local Bridges

* **3.1. Two-Way Audio/Text Query ("Whisper Back"):**
  * Earphone long-press or Android Quick Settings tile captures audio query.
  * Queries local state (Google Calendar, Tasks, Sheets).
  * Returns a concise 1-sentence TTS whisper response through earphones and drops a rich notification card on screen.
* **3.2. Offline Fallback Queue (Zero-Signal Safe):**
  * In zero-connectivity zones, MacroDroid intercepts voice dumps, quick notes, and expense triggers, writing them to a local SQLite database (`offline_queue.db`) stamped with a client UUID.
  * Flushes automatically through the Cloudflare Worker buffer upon network reconnection.
* **3.3. Conversational In-Chat Dispatcher:**
  * Recognized dispatch keywords in casual Gemini chat sessions:
    * `"Put that into my inbox"` $\rightarrow$ Saves formatted file to `_INBOX_DESKTOP/`.
    * `"Make that into a list and add to Tasks"` $\rightarrow$ Injects sub-tasks into Google Tasks API.
    * `"Log this to my curiosity vault"` $\rightarrow$ Appends note to `Curiosity_Vault.md`.
* **3.4. Telco Prepaid Load & Data Sentry:**
  * Ingests incoming telco SMS alerts (Globe/Smart/DITO).
  * Tracks data balance and promo expiration; issues alerts if balance is $< 500\text{MB}$ or expiry is $< 24\text{ hours}$.
* **3.5. ThinkPad E14 Auto-Maintenance Daemon:**
  * Scheduled PowerShell script (`maintenance_daemon.ps1`) running every Sunday at 11:00 PM.
  * Purges installer files (`.exe`, `.msi`, `.iso`) from `Downloads` older than 14 days.
  * Moves documents (`.pdf`, `.docx`, `.xlsx`, `.pptx`) older than 3 days to `Drive/_INBOX_DESKTOP/`.
  * Cleans temp files, prefetch cache, and runs the 48-hour ephemeral rant purge.

### MODULE 4: Financial Autopilot & Family Cash Logistics

* **4.1. Cashew Bridge & SMS Financial Parser:**
  * Intercepts mobile wallet notifications (GCash/Maya), extracting amount, reference number, and counterparty.
  * Logs transaction to `Cashew_Sync.gsheet` and triggers Cashew URL scheme for instant offline ledgering.
  * Voice trigger (*"Lent ₱50 to Dave for lunch"*) logs a receivable entry in Cashew's lending tracker.
* **4.2. Cross-System Expense Sync:**
  * When an academic cost is announced (e.g., *"₱150 contribution for science lab materials by Friday"*):
    * Creates a Google Task with due date.
    * Registers an Upcoming Payable in Cashew.
    * Appends an entry to `Ambagan_Queue.gsheet`.
* **4.3. Transparent Ambagan Docket (`Ambagan_Queue.gsheet`):**
  * Aggregates micro-expenses and creates an itemized summary for routine asking times (Friday/Sunday).
  * High-cost items ($> ₱300$) are split into verifiable operational milestones.
* **4.4. Verbal Paalam & Cash Request Briefer:**
  * Generates an on-device reference card before speaking with parents in person.
  * **Time-of-Day Rules:**
    * *Morning Departure (Pre-Lunch):* Prompts for estimated transit fare + lunch allowance (₱150–₱200).
    * *Afternoon Departure (Post-Lunch):* Suppresses lunch allowance; calculates exact transit barya only (₱40–₱80).
  * **Pre-Departure Wallet Reality Check:** Compares route fare against Cashew physical cash balance; alerts user if cash is insufficient.
  * **Disclosed Barya Sentry:** Transit change is acknowledged openly and tagged in Cashew as an emergency commute float.

### MODULE 5: Bio-Rhythms & Adaptive Executive Logistics

* **5.1. Two-Button Bio-Pulse Interface:**
  * Lock screen buttons: `[ Sleep Now ]` and `[ I'm Awake ]`.
  * Tracks sleep duration and calculates sleep debt relative to a 7.5-hour baseline.
  * Models afternoon caffeine half-life decay curves to evaluate sleep onset latency.
* **5.2. Dynamic Calendar & Task Rebalancer:**
  * High sleep debt ($> 1.5\text{ hours}$) shifts deep-work blocks to later dates and schedules an earlier evening bedtime.
  * Assignments solved overnight trigger automatic cancellation of study blocks in Google Calendar, replaced with 10-minute printing slots.
* **5.3. Dual Briefing Lifecycle:**
  * **Dynamic Morning Briefing (On Wake):** Energy status, 48-hour deadlines, print queue readiness, local weather and transit flags, and unreturned portfolio items.
  * **Nightly Packing Briefing (30 Mins Before Sleep):** Interactive checklist covering printed binder leaves, calculator, uniform readiness, and laptop charging.

### MODULE 6: Stakeholder Dynamics, Family Boundaries & Diplomatic Sentry

* **6.1. Stakeholder Collaboration Graph & Ephemeral Vents:**
  * Android Notification Listener extracts `android.textLines` from chat notifications.
  * Metadata filter: Discards media notices, stickers, and reactions $< 3$ characters before passing payload to the Cloudflare Worker.
  * Worker invokes Gemini 2.0 Flash to extract structured collaboration signals (`role_context`, `work_style_preference`, `reliability_vector`, `conflict_deescalation`, `active_dependencies`), saving strictly to `Stakeholder_Graph.gsheet`.
  * Raw voice vents are stored in `Ephemeral_Rants.json` for immediate tactical de-escalation advice and auto-purged after 48 hours by the maintenance daemon.
* **6.2. Family Boundaries & Meetup Gatekeeper:**
  * Hard-locks Sunday family/church hours and Saturday chore windows.
  * Generates diplomatic decline messages in respectful Taglish for non-critical meetups, offering asynchronous contributions instead.
* **6.3. Social Battery Escape Hatch:**
  * Quadruple-pressing Volume Down triggers a simulated incoming phone call with realistic audio to provide an immediate, polite exit.
* **6.4. Hyper-Local Weather & Suspension Radar:**
  * Ingests local weather forecast APIs for Ligao City / Albay.
  * Monitors local disaster risk reduction notices for class suspension cues, dispatching umbrella and commute alerts before afternoon dismissal.

### MODULE 7: Reflection, Decision Training & Friction Log

* **7.1. Daily Debrief & Multi-Pass Journaling:**
  * 3-Metric evening pulse: Energy (1–5), Execution Efficacy (1–5), Friction Level (1–5).
  * Voice-to-journal capture with optional late-night text additions, building longitudinal patterns of academic stress vs. sleep debt.
* **7.2. Decision Journal & Socratic Counterfactuals:**
  * Logs dilemma analysis (Assumptions $\rightarrow$ Options $\rightarrow$ Expected Outcomes) in `Decision_Journal.md` with scheduled 30-day and 90-day review audits.
* **7.3. Personal Bug Bounty & Sunday Friction Log:**
  * Omni-Capture voice logging of daily micro-annoyances.
  * Sunday Friction Audit aggregates recurring issues and suggests physical layout optimizations.

### MODULE 8: Long-Term Horizon, Wardrobe & Credential Vault

* **8.1. Academic & Career Sentry:**
  * Tracks application timelines for undergraduate scholarships (DOST), university entrance exams (UPCAT), and science competitions (RSTF/NSTF), nudging early documentation prep.
* **8.2. Living Master Achievement Registry:**
  * Certificates dropped into `_INBOX_AWARDS` undergo automated OCR extraction for event title, organizer, role, date, and award level, saving to `Master_Credentials.gsheet`.
  * Omni-Capture 3-second brag log records qualitative achievements.
  * Generates tailored resumes and bundled PDF portfolios on demand.
* **8.3. Wardrobe & Hardware Maintenance Sentry:**
  * Tracks uniform rotation between washing, drying, and ironing handoffs.
  * Logs maintenance intervals for ThinkPad cache cleanup, printer head maintenance, and scientific calculator battery replacement.

---

## 5. COMPLETE DATA SCHEMAS

### 5.1. `Portfolio_Registry.gsheet`
| Column | Header | Type | Constraints / Description |
|---|---|---|---|
| A | `UID` | String | Client-generated UUID (`epoch_ms + hash`) |
| B | `Date_Assigned` | Date | YYYY-MM-DD |
| C | `Subject` | String | Dropdown: Physics, Chem, Math, Research, etc. |
| D | `Item_Name` | String | e.g., "Lab Activity 1: Vector Sums" |
| E | `Quarter` | String | Q1, Q2, Q3, Q4 |
| F | `Status` | String | `Pending`, `With Teacher`, `Returned`, `Archived in Binder` |
| G | `Score` | String | e.g., "29/30" or "Pending" |
| H | `Drive_Scan_URL`| String | Direct URL to file in Drive |
| I | `Last_Updated` | Timestamp | ISO 8601 |

### 5.2. `Stakeholder_Graph.gsheet` (Ethical Collaboration Matrix)
| Column | Header | Type | Description |
|---|---|---|---|
| A | `Person_Name` | String | Name or team role |
| B | `Role_Context` | String | Project or committee context (extracted via Gemini) |
| C | `Work_Style_Preference`| String | Communication and workflow habits |
| D | `Reliability_Vector` | String | Core execution strengths |
| E | `Conflict_Deescalation`| String | Tactical de-escalation rules |
| F | `Active_Dependencies` | String | Deliverables owed to/from this person |
| G | `Last_Interaction` | Date | YYYY-MM-DD |

### 5.3. `Ambagan_Queue.gsheet` (Transparent Contribution Ledger)
| Column | Header | Type | Description |
|---|---|---|---|
| A | `Item_ID` | String | Client UUID |
| B | `Date_Logged` | Date | YYYY-MM-DD |
| C | `Item_Description` | String | Official school purpose (e.g., "Chem Lab Manual Photocopy") |
| D | `Amount` | Number | Cost in PHP |
| E | `Due_Date` | Date | Hard deadline |
| F | `Category` | String | `Manual/Photocopy`, `Lab Materials`, `Org Dues`, `Project Build` |
| G | `Status` | String | `Queued`, `Requested`, `Cleared` |
