# AGENTS.md — Life OS Agent Directive & Environment Context

## Project Overview
Life OS is an automated, headless, event-driven personal operating system running across:
- Android (MacroDroid sensory edge)
- Cloudflare Workers (Edge ingestion, idempotency, Web Crypto JWT)
- Google Workspace (Drive VFS, Sheets, Tasks, Calendar)
- ThinkPad E14 (Python 3.11+ binder compiler & PowerShell janitor)

## Primary Reference Documents
Before modifying or running any code, always read and enforce:
1. `SPEC.md` — The architectural baseline and functional requirements.
2. `IMPLEMENTATION.md` — The phased execution runbook.

## Core Directives & Hard Rules
- **No Direct GAS Webhooks:** All edge events MUST terminate at the Cloudflare Worker buffer (`src/index.js`). Never wire client devices directly to Google Apps Script `doPost`.
- **Stateless & Edge-Safe:** Never import `googleapis` or Node-only crypto in Cloudflare Workers. Always use native `crypto.subtle` (Web Crypto API) and direct Google REST `fetch()` calls.
- **Drive VFS Mount Point:** All local desktop paths must target `G:\My Drive\Life_OS\`. Never hardcode random personal paths.
- **Defensive Error Handling:** Every client-generated request requires an immutable UUID. Idempotency keys must resolve to `COMPLETED` or `FAILED` (never remain stuck `IN_FLIGHT`).
- **Phase-by-Phase Execution:** Only execute the phase explicitly requested by the user. Do not jump ahead or scaffold unapproved files.

## Environment & Commands
- **Cloudflare Worker CLI:** Wrangler (`npm install -g wrangler`, `wrangler deploy`, `wrangler secret put <KEY>`)
- **Python Runtime:** Python 3.11+ (`pip install opencv-python-headless pillow pypdf requests numpy`)
- **Windows Shell:** PowerShell 7 / Windows PowerShell (`powershell -ExecutionPolicy Bypass -File ...`)
