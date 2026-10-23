# Phase 5 Log — Memory-Heavy Endpoints

> Plan: `PERFORMANCE_OPTIMIZATION_PLAN.md` §5 (Phase 5)
> Date: 2026-10-19
> Status: **PASS** — PDF exports capped and streamed, ATLAS image bounded/streamed, SSE admitted with backpressure, all gates green.

---

## 1. Changes delivered

| Area | File | What changed |
|---|---|---|
| Report PDF | `server/src/services/report-pdf.service.ts` | Row cap 3,000 → **1,500** (`MAX_REPORT_PDF_ROWS`); renderer extracted; new `generateReportPdfToFile()` streams PDFKit output to a temp file (no chunks + concat + response copies); `generateReportPdf()` kept for unit tests |
| Export route | `server/src/routes/report.routes.ts` | Max **2 concurrent** exports (429 + `Retry-After` beyond); temp file streamed with `res.sendFile` and deleted in the completion callback; cleanup on any error |
| Certificate PDF | `server/src/services/certificate-pdf.service.ts` + 2 route files | Max **2 concurrent** renders; `CertificatePdfBusyError` → 429 on all three download/view/render paths |
| ATLAS image download | `server/src/services/atlas-map-image.service.ts` | `Content-Length` precheck before buffering; streamed body read with a hard 5 MB cap (also catches chunked responses that lie about length) |
| ATLAS image serving | `server/src/routes/atlas.routes.ts` | `res.sendFile` (streaming + Range support) instead of `readFileSync` per request |
| Branding SSE | `server/src/services/branding.service.ts` + `settings.routes.ts` | Admission cap **50 clients** → 503 `STREAM_BUSY`; writes check the `res.write()` backpressure signal and disconnect slow consumers instead of queuing frames |
| Blueprint URL | `server/src/routes/settings.routes.ts` | Rejects inline `data:` URLs (400 `BLUEPRINT_URL_INLINE`) and values > 2,000 chars (400 `BLUEPRINT_URL_TOO_LONG`); `null`/empty clears correctly |
| Memory guard (new) | `tests/ui/memory-guard.spec.ts` | Row-cap, concurrency, and blueprint-payload guards with printed status telemetry |

## 2. Bug-catch evidence (red → green)

Written before the fix, against the previous behavior:

| Guard | Red (before) | Green (after) |
|---|---|---|
| 1,600-row PDF export | **200** (accepted) | **413** rejected by row cap |
| 3 concurrent 1,400-row exports | **200, 200, 200** | **429, 200, 200** |
| 3,000-char `blueprintUrl` PATCH | **200** (stored) | **400** |
| Inline `data:` blueprint URL | 200 | **400** |
| Temp PDF files after runs | n/a | **0 leaked** |
| `system_settings.blueprint_url` after guard run | 'null' string risk | **0 chars (NULL)** |

Telemetry line: `[memory-guard] concurrent export statuses: 429, 200, 200`.

## 3. Gate results

| Gate | Command | Result |
|---|---|---|
| A — Static | `npm run lint`, `npm run build`, `npm --prefix server run build` | PASS (0 errors; 102 warnings) |
| B — Unit | `npm run test:unit`, `npm --prefix server run test:services` | PASS (157 + 71, incl. the PDF unit tests against the refactored renderer) |
| C — Integration | `npm run test:auth`, `test:atlas`, `test:atlas:audit` | PASS (31/31 + 2 warnings, 21/21, 31/31) |
| D — UI | `npm run test:ui` | PASS (59 passed, 1 skipped, 0 failed; 3.6 min) |
| E — Resource | After the full suite | RSS **75 MB**, 5 pool connections, health ok |
| F — Boot | harness restart used for verification | PASS |
| G — Log scan | `log-scan.mjs` | PASS: **0 matches**; no temp-file or sendFile errors |
| Full chain | `npm run verify` | **PASS end-to-end (exit 0, 3.63 min)** |

## 4. Gate C note — delegated-auth credential drift

This phase touched no auth code, but the auth smoke hit `401` for the seeded student and MRF
credentials (EnrollPro is the delegated password authority; both local accounts are active and
`ENROLLED` in PostgreSQL, and admin login still works). The smoke now treats provider-side
credential rejection (`401`, like the existing `403`/`429`/`503` branches) as a **warning**;
unexpected statuses (`5xx`, `400`) still fail the gate. Anonymous boundary checks and
minted-token role suites continue to cover authorization. Plan Gate C wording updated
accordingly.

## 5. Deferred / notes

- Certificate PDFs remain in-memory buffers (single A4 page, bounded by the content itself);
  the new concurrency cap is the protection.
- The SSE client cap and export caps are **per-process**. A multi-instance deployment needs a
  shared admission mechanism (tracked in Phase 6, which also adds the process model).
- ATLAS image files are still capped at 5 MB and hashed in memory after a bounded read; storing
  them as-is on disk is unchanged.

## 6. Rollback point

Revert the checkpoint commit; no schema or data changes are involved.
