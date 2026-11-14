# EchoGrow — 3-Minute Live Demo Script

> **Goal:** show the complete journey — upload → evidence-backed scorecard → contradiction detection → personalized growth plan — in under three minutes, with a clean fallback if the network or AI provider misbehaves.

**Demo URL:** `http://localhost:5173/upload` (local) · deployed URL: see [README](../README.md#deployment-status)
**Backup video:** [`docs/assets/echogrow-demo-720p.mp4`](assets/echogrow-demo-720p.mp4) · full script in [`docs/demo-video.md`](demo-video.md)
**Sample data:** “Full interview · Backend” (built into the upload page)

---

## Before you start (2 minutes before)

- [ ] Open Chrome at **100% zoom**, light theme, and close unrelated tabs.
- [ ] Open `http://localhost:5173/upload` and confirm the page loads.
- [ ] Open the backup video in a second tab and pause it at **0:00**.
- [ ] Turn off notifications / Do Not Disturb.
- [ ] Have the API and Redis running (`npm run dev:api`, `npm run dev:web`).
- [ ] Say the opening line **before** touching the keyboard — it buys the page time to settle.

> If the live app fails at any point: smile, say “Let me show you the recorded run,” switch to the backup video, and continue narrating from the same timestamp. Do not debug on stage.

---

## The 3-minute run sheet

| Time | On screen | Do this | Say this |
| --- | --- | --- | --- |
| **0:00–0:18** | Upload page | Stand still. Let the hero and form breathe. | “Hiring teams collect hours of interview audio, then reduce it to a gut feeling and a few notes. EchoGrow turns that raw conversation into an evidence-backed decision — in seconds.” |
| **0:18–0:38** | Upload page | Click **Load sample** → **Full interview · Backend**. The form fills with a transcript and a CV. | “We start with two inputs: the interview transcript and the candidate’s resume. You can paste them, drop a text or PDF file, or load a sample. Let’s use a realistic backend interview.” |
| **0:38–0:50** | Upload page | Scroll to the bottom, then click **Analyze interview**. | “One click queues the analysis. EchoGrow scores four dimensions, verifies claims against the resume, and drafts a growth plan — while the recruiter does something else.” |
| **0:50–1:12** | Overview tab | Point at the scorecard header, overall confidence, and the four dimension cards. | “This is the overview. Every score is tied to a verbatim quote from the interview. The confidence score tells you how much evidence the model actually had.” |
| **1:12–1:30** | Overview tab | Scroll to **Time saved** and the candidate profile / SPK card. | “EchoGrow also shows the time saved versus a manual review, and produces a portable candidate profile that downstream tools can consume.” |
| **1:30–1:52** | Evaluation tab | Click **Evaluation**, then click **View evidence** on the first dimension. The transcript context opens with the quote highlighted. | “Open any dimension and choose View evidence. EchoGrow highlights the exact quote inside the surrounding conversation — speaker labels, timestamps, and two turns of context. No more hunting through a transcript.” |
| **1:52–2:12** | Claim verification tab | Click **Claim verification**. Point at the severity badges and confidence. Click **Show reasoning** on the first flag. | “Claim verification compares what the candidate said with what the resume claims. Contradictions are ranked by severity and confidence, with the reasoning and both quotes side by side.” |
| **2:12–2:30** | Claim verification tab | Point at **Confirm** / **Dismiss**. If time allows, click **Confirm** and show the note field. | “A human stays in the loop: confirm or dismiss each flag and leave a note. That decision is written to the audit trail, so the final report is explainable.” |
| **2:30–2:48** | Growth plan tab | Click **Growth plan**. Scroll through the priority gaps and the week-by-week roadmap. | “The growth plan turns verified gaps into a week-by-week roadmap with priorities and learning resources. Export it as PDF, Markdown, or JSON for the candidate or the hiring manager.” |
| **2:48–3:00** | Growth plan / Overview | Stop scrolling. Look at the audience. | “EchoGrow makes hiring faster, fairer, and evidence-based — from transcript to decision, in one workflow. Thank you.” |

---

## Click map (exact labels)

| Step | Element | Text / selector |
| --- | --- | --- |
| 1 | Sample menu | `Load sample` |
| 2 | Sample option | `Full interview · Backend` |
| 3 | Submit | `Analyze interview` |
| 4 | Dashboard tab | `Overview` |
| 5 | Dashboard tab | `Evaluation` |
| 6 | Evidence toggle | `View evidence` (first dimension card) |
| 7 | Dashboard tab | `Claim verification` |
| 8 | Reasoning toggle | `Show reasoning` (first discrepancy card) |
| 9 | Review action | `Confirm` (optional) |
| 10 | Dashboard tab | `Growth plan` |
| 11 | Export (optional) | `Export` / `PDF` / `Markdown` / `JSON` |

> The sample fills **Ahmed Al-Mansour** / `ahmed@example.com` and a backend transcript with one clear leadership contradiction. That contradiction is the story beat — do not skip it.

---

## If you have 5 minutes (Q&A / extended demo)

Use the extra time for:

1. **Analytics** — completion rate, average score, top missing skills, time saved. “This is the hiring manager’s view across every interview.”
2. **Compare** — select three candidates and generate a role-aware comparison. “Same rubric, side by side, with a recommendation and confidence.”
3. **Bulk upload** — drop several transcript/resume pairs and show per-row status. “Agency teams can process a whole shortlist in one pass.”
4. **Dark mode** — toggle the theme. “The same evidence-first workflow, day or night.”

---

## Recovery lines

| Failure | Say this | Do this |
| --- | --- | --- |
| API is slow / stuck on processing | “The analysis runs asynchronously in a queue — while it finishes, let me show you the same flow in the recorded run.” | Switch to the backup video at the matching timestamp. |
| Gemini rate limit / provider error | “We designed for provider hiccups: the job retries, and the UI tells you exactly what happened.” | Show the retry/error state, then switch to the video if needed. |
| Page looks empty after refresh | “Let me reload the report — the data is already persisted.” | Reload once. If it still fails, switch to the video. |
| Wrong sample loaded | “Let me pick the backend sample — it has the clearest contradiction.” | Reload `/upload` and choose **Full interview · Backend**. |

---

## Rehearsal checklist

- [ ] Run the full script twice end-to-end with a timer.
- [ ] Confirm the sample produces the leadership contradiction.
- [ ] Confirm **View evidence** opens the transcript context (Issue #82).
- [ ] Confirm **Show reasoning** expands on the first discrepancy.
- [ ] Confirm the growth plan renders at least three weeks.
- [ ] Confirm the backup video plays locally with audio.
- [ ] Rehearse the opening and closing lines without looking at the screen.

**Target:** 2:45–3:00. If you run over, cut the optional **Confirm** action and the **SPK** explanation — never cut the contradiction or the roadmap.
