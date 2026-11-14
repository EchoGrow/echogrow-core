# EchoGrow — Backup Demo Video Kit

> **File:** [`docs/assets/echogrow-demo-720p.mp4`](assets/echogrow-demo-720p.mp4)
> **Duration:** 2:24 · **Resolution:** 1280×800 · **Frame rate:** 30 fps · **Audio:** narrated (AAC)
> **Purpose:** a deterministic fallback for demo day, plus a ready-to-record script if the team wants to replace the synthetic voice.

---

## How to use it on demo day

1. Download the MP4 before the session and keep it **open in a second tab** (or on the desktop).
2. Test the audio at the start of the room check — do not rely on system volume alone.
3. If the live app fails, say: *“Let me show you the recorded run,”* switch tabs, and keep narrating from the matching timestamp.
4. Do **not** restart the video from the beginning if the live demo already covered the upload. Jump to the relevant beat below.

| Beat | Start | Use it when… |
| --- | --- | --- |
| Upload & sample | 0:00 | The upload page is broken or slow |
| Overview | 0:33 | The scorecard is stuck processing |
| Evaluation evidence | 1:01 | The evidence panel fails to open |
| Claim verification | 1:19 | The discrepancy list is empty |
| Growth plan | 1:35 | The roadmap endpoint fails |
| Analytics | 1:53 | The charts are empty |
| Closing | 2:14 | You need a clean ending |

---

## Full narration transcript

| Time | Narration |
| --- | --- |
| **0:00** | Meet EchoGrow: an interview verification and evidence-based upskilling pipeline. It turns a raw interview transcript and a resume into a defensible hiring decision, in seconds. |
| **0:13** | Start by pasting a transcript and a resume, or load one of the built-in sample interviews. EchoGrow validates the input, queues the analysis, and takes you straight to the report. |
| **0:33** | This is the overview. Every score is backed by a verbatim quote from the interview, so reviewers can see exactly why each dimension was rated the way it was. |
| **0:45** | Candidates are scored across four dimensions: technical depth, communication clarity, domain experience, and problem solving. EchoGrow also surfaces confidence, time saved, and a portable candidate profile. |
| **1:01** | Open the Evaluation tab to inspect each dimension. Choose View evidence, and EchoGrow highlights the exact quote inside the surrounding conversation, with speaker labels and timestamps. No more hunting through a long transcript. |
| **1:19** | Claim verification compares what the candidate said with what the resume claims. Contradictions are ranked by severity and confidence, and a reviewer can confirm or dismiss each flag with a note for the audit trail. |
| **1:35** | The growth plan converts verified skill gaps into a week-by-week roadmap, with priorities and learning resources. Export it as PDF, Markdown, or JSON for the candidate or the hiring manager. |
| **1:53** | Analytics shows completion rates, average scores, top missing skills, and time saved across every interview. The compare view then ranks candidates side by side for a specific target role. |
| **2:14** | EchoGrow makes hiring faster, fairer, and evidence-based. From transcript to decision, in one workflow. |

---

## Shot list

| Time | Screen | Action shown |
| --- | --- | --- |
| 0:00–0:13 | `/upload` | Landing page, hero, input form |
| 0:13–0:31 | `/upload` | Load sample → Full interview · Backend → scroll → Analyze interview |
| 0:33–0:45 | `/dashboard/:id/overview` | Scorecard header, confidence, four dimensions |
| 0:45–1:01 | Overview | Scroll through dimensions, time saved, candidate profile |
| 1:01–1:19 | `/evaluation` | Open **View evidence** on Technical Depth; transcript context + highlighted quote |
| 1:19–1:35 | `/discrepancies` | Severity/confidence badges, **Show reasoning** on the leadership contradiction |
| 1:35–1:53 | `/roadmap` | Priority gaps + week-by-week roadmap |
| 1:53–2:11 | `/analytics` | KPI cards, charts, recent interviews |
| 2:14–2:24 | Overview | Closing shot |

---

## How this version was recorded

The video was captured deterministically so the team always has a working fallback:

1. **Mock API** with realistic fixtures (scorecard, discrepancies, roadmap, analytics) on port `3000`.
2. **Vite dev server** on port `5173` (proxy `/api` → `3000`).
3. **Headless Chrome** via `puppeteer-core`, driving the real UI: load sample → analyze → open tabs → expand evidence → show reasoning → scroll.
4. **Screencast frames** captured over the Chrome DevTools Protocol, then encoded with `ffmpeg`.
5. **Narration** generated with the Windows SAPI voice *Microsoft Zira* and padded to each beat so audio and video stay in sync.

This means the backup video is **independent of Gemini, Redis, and PostgreSQL** — it will always play, even if the live stack is down.

---

## Re-record with a human voice (recommended for the final cut)

The synthetic voice is clear but robotic. If you have 15 minutes, record the same script in your own voice.

### Option A — replace the audio only (fastest)

1. Record each line from the transcript above as a separate WAV/MP3 file, named `beat1` … `beat9`.
2. Drop them into a folder and run:

   ```bash
   ffmpeg -i beat1.wav -af apad -t 13.1 -ar 44100 -ac 1 pad-beat1.wav
   # …repeat for each beat using the durations in the shot list…
   ffmpeg -f concat -safe 0 -i audio.txt -c copy narration.wav
   ffmpeg -i video-silent.mp4 -i narration.wav -c:v copy -c:a aac -b:a 160k -shortest echogrow-demo-human.mp4
   ```

   The `video-silent.mp4` master is kept with the project owner.

### Option B — record the screen live

1. Start the stack (see the [README](../README.md#quick-start)).
2. Open `http://localhost:5173/upload` at 1440×900, 100% zoom, light theme.
3. Record the screen + microphone (OBS, Loom, or Windows Game Bar).
4. Follow [`docs/demo-script.md`](demo-script.md) click by click.
5. Trim to 2–4 minutes, export 1080p MP4, and replace the file in `docs/assets/`.

---

## Google Drive upload checklist (Issue #44 acceptance criteria)

- [ ] Create a folder: **EchoGrow — Demo Day**.
- [ ] Upload `echogrow-demo-720p.mp4`.
- [ ] Rename it: **EchoGrow — Backup Demo (2:24)**.
- [ ] Set sharing to **Anyone in the team can view** (or the team Google Group).
- [ ] Copy the share link into:
  - [ ] the Sprint 5 issue **#44** as a comment,
  - [ ] the root [`README.md`](../README.md) under **Demo & presentation**,
  - [ ] the team chat / pinned message.
- [ ] Play the Drive preview once on a phone and once on a laptop to confirm audio.
- [ ] Ask one teammate to open the link and confirm access.

---

## Known limitations

- **Synthetic narration.** Clear and consistent, but not a human voice. Replace it for the final public cut.
- **Mock data.** The video uses the seeded demo fixtures so it is reproducible; the UI, interactions, and layout are the real application.
- **English only.** Arabic narration/UI is on the roadmap.
- **No live deployment.** The video runs locally against the dev server; the deployed URL will be added in Sprint 5.

---

## Files

| File | Purpose |
| --- | --- |
| `docs/assets/echogrow-demo-720p.mp4` | The backup video (committed, 5.9 MB) |
| `docs/demo-script.md` | 3-minute live demo run sheet |
| `docs/pitch-outline.md` | Pitch deck outline, architecture, metrics, Q&A |
| `docs/assets/screenshots/` | Still screenshots used in the README |
