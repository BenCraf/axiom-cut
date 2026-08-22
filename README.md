# Axiom Cut

A complete, code-directed video editing Agent. Import real footage, describe the result in natural language, keep every operation editable on a timeline, and render a real downloadable MP4 with FFmpeg.

![Code-generated derivative film](docs/preview.png)

## What v1.0 includes

- Persistent local media library with FFprobe metadata
- Multi-video timeline with trim, split, duplicate, move, speed, volume, and deletion
- 16:9, 9:16, 1:1, 4:3, and 4:5 output
- Live brightness, contrast, saturation, temperature, and vignette preview
- Editable title and timed subtitle tracks
- FFmpeg shot-change, silence, and suggested-cut analysis
- DeepSeek structured planning from a natural-language brief
- Project-scoped self-evolution: critique, three mutations, selection, memory, and rollback
- Undo/redo, autosave, project JSON import/export, and version snapshots
- Real queued FFmpeg rendering with progress, cancellation, and MP4 download
- H.264 video, AAC audio, Chinese title/subtitle burn-in, and multi-clip concatenation
- Built-in NEON SYNC media pack with nine full-duration 720p source proxies and one Agent result
- A separate presentation mode with two 100% React/SVG code films and one licensed real-footage before/after film

## Run locally

Requirements:

- Node.js 20 or newer
- FFmpeg and FFprobe available on `PATH`

On macOS, FFmpeg can be installed with `brew install ffmpeg`.

```bash
npm install
cp .env.example .env
npm run dev
```

Open <http://127.0.0.1:4173>.

## How to use it

1. Click **导入真实视频** and choose one or more video files.
2. Click **分析当前素材** to detect shots, silence, and possible cut points.
3. In **Agent**, describe the target, such as “做成 9:16 高密度口播，前两秒先给结论，去掉停顿并加入字幕”.
4. Click **执行剪辑**. The plan and every active step remain visible while executable changes are written to the timeline.
5. Fine-tune clips in **调整**: trim, speed, volume, aspect, color, title, and captions.
6. Use the timeline toolbar to split, duplicate, move, or delete a selected clip. Undo and redo are always available.
7. Open **导出**, click **开始真实渲染**, wait for 100%, and download the MP4.
8. Use **版本** or project JSON export whenever a reversible checkpoint is needed.

The media store lives in the operating system's temporary Axiom Cut directory and is recovered after a server restart. Project structure is autosaved in the browser. A downloaded project JSON contains references and editing data, not the media bytes or API key.

## DeepSeek setup

Put the key in the server-side `.env` file:

```bash
DEEPSEEK_API_KEY=your_key
DEEPSEEK_MODEL=deepseek-v4-flash
```

The browser calls `/api/plan` and `/api/evolve`; the key is never sent to the client bundle. When the key is absent or the provider is unavailable, the editor keeps working with a deterministic local planning fallback. Media pixels are never sent to DeepSeek; only the written brief and non-visual technical metadata are used for planning.

## Real rendering pipeline

```text
Persistent source videos + editable project timeline
        ↓
FFprobe metadata + FFmpeg shot/silence analysis
        ↓
DeepSeek plan + deterministic, reversible project actions
        ↓
FFmpeg scale/crop → trim → speed → grade → audio → concat
        ↓
ASS title/subtitle burn-in → H.264/AAC MP4 → download
```

Run the real renderer smoke test with:

```bash
npm run test:render
```

The test creates two temporary videos, uploads and analyzes them, renders an intentionally out-of-order timeline with real black/silent gaps, applies color and ASS overlays, verifies title placement and subtitle fallback at pixel level, then confirms H.264/AAC with FFprobe. Temporary test artifacts are removed afterward.

## Demo mode

Click **展示 Demo** to open the presentation-oriented films:

- **Derivative / local linearity** — an 18-second, four-chapter mathematical story with a code-drawn car, exact Bézier curve, secant, tangent, shrinking delta, and limit formula.
- **Flux Note product launch** — a 12-second product film with staged typography, device UI, feature cards, and CTA motion.
- **Neon Sync performance cut** — a synchronized 14-second before/after comparison built from real dance footage: a continuous wide take on the left and a seven-shot, dual-angle, color-graded, titled, beat-driven Agent edit on the right. Use the draggable split to compare both versions at the same output timecode.

The first two demos are built from React/SVG frame logic. Neon Sync uses licensed Pexels footage and a fully reproducible FFmpeg build; no generated image is used.

The editor's built-in **NEON SYNC** library contains nine full-duration, silent 1280×720 source proxies from one verified shoot, plus the 14-second Agent result:

- **Neon indoor set · 4:** [13648582](https://www.pexels.com/video/x-13648582/), [13648584](https://www.pexels.com/video/performance-with-synchronic-dancing-13648584/), [13648585](https://www.pexels.com/video/dancers-practising-dance-routine-13648585/), and [13648588](https://www.pexels.com/video/women-dancing-in-studio-13648588/)
- **Rooftop set · 5:** [13648581](https://www.pexels.com/video/women-practising-synchronic-dance-13648581/), [13648583](https://www.pexels.com/video/group-of-young-women-dancing-13648583/), [13648586](https://www.pexels.com/video/x-13648586/), [13648587](https://www.pexels.com/video/x-13648587/), and [13648589](https://www.pexels.com/video/dancers-in-black-costumes-13648589/)

These assets appear in the media library but are never added to the timeline automatically; select one and use **加入时间线** when needed. Rebuild missing assets with:

```bash
npm run demo:neon
```

Force regeneration of every proxy, poster, and comparison output with:

```bash
AXIOM_DEMO_FORCE=1 npm run demo:neon
```

All nine source clips are by [khanhhoangminh on Pexels](https://www.pexels.com/@khanhhoangminh/) and are used under the [Pexels License](https://www.pexels.com/license/). Attribution is included even though it is not required. The depicted dancers and creator do not endorse, sponsor, or represent Axiom Cut. See [`public/demo/neon-sync/CREDITS.md`](public/demo/neon-sync/CREDITS.md) for the exact asset record.

## API overview

- `GET /api/status`
- `GET /api/media`
- `POST /api/media`
- `GET /api/media/:id`
- `GET /api/media/:id/file`
- `POST /api/media/:id/analyze`
- `DELETE /api/media/:id`
- `POST /api/plan`
- `POST /api/evolve`
- `GET /api/render`
- `POST /api/render`
- `GET /api/render/:id`
- `DELETE /api/render/:id`
- `GET /api/render/:id/download`

## Boundaries

- The subtitle track is fully editable and rendered into the MP4. v1.0 does not bundle a speech-to-text model; Agent-created caption text is a draft, not a claimed transcription.
- The included queue is deliberately local and single-worker. A hosted multi-user deployment should move media and jobs to isolated persistent workers.
- The server accepts videos up to 500 MB and renders up to 12 clips / 60 minutes per job.

## Open-source notes

- License: MIT
- Bundled Neon Sync footage remains subject to the Pexels license described in its credits file; the application source code remains MIT.
- See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for the repository-level media notice.
- No 3Blue1Brown artwork, logo, or source material is included. The mathematical demo uses an original code-native visual system.
- Never commit `.env` or API keys.

## Tech stack

React 19, TypeScript, Vite, Express, HTML5 Video, SVG/CSS, DeepSeek API, FFmpeg, FFprobe, and ASS/libass.
