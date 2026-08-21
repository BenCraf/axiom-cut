# Axiom Cut

A code-driven, self-evolving video editing Agent with a mathematical-animation visual language. Describe a scene in natural language, inspect every execution step, and watch the Agent critique and improve its own result.

![Axiom Cut UI](docs/preview.png)

## Why this project

The assignment asks for basic editing, a usable human-in-the-loop interface, and an Agent that can perform editing work. Axiom Cut focuses its advanced module on **observable self-evolution**: the user always knows what the Agent plans to do, what tool is running, how the result scores, what mutations were explored, and why one version won.

Version 0.2 is a complete interactive product demo. It includes a responsive editor, animated mathematical preview, editable prompt, generated six-step plan, live pipeline state, visual critic, candidate mutations, version history, project memory, export manifest, DeepSeek integration, and a zero-config demo fallback. A production renderer such as Remotion or Manim is the next implementation layer.

## Run locally

Requirements: Node.js 20+

```bash
npm install
cp .env.example .env
npm run dev
```

Open <http://127.0.0.1:4173>. Without an API key the full UI runs in local demo mode.

To use the fully static demo, run `npm run build` and open `dist/index.html`. The app automatically falls back to its deterministic local Agent when no API server is available.

## DeepSeek setup

Put the API key in `.env` on the server:

```bash
DEEPSEEK_API_KEY=your_key
DEEPSEEK_MODEL=deepseek-v4-flash
```

The browser calls `/api/plan` and `/api/evolve`; the key is never sent to the client. The server uses DeepSeek's OpenAI-compatible `POST /chat/completions` endpoint with JSON Output.

## One-click demo

Click **完整演示** in the top bar. The demo runs this observable loop:

```text
Brief → Plan → Execute 6 tools → Visual critique
      → Generate 3 mutations → Select winner
      → Store project memory → Render ready
```

Open **进化实验室** to inspect the quality score, four evaluation metrics, candidates, selection rationale, and accumulated preferences. Click **再进化一轮** to produce the next version with diminishing gains instead of endlessly claiming improvement.

See [docs/EVOLUTION.md](docs/EVOLUTION.md) for the data contract and safety boundaries.

## Product flow

```text
Natural-language brief
        ↓
DeepSeek structured plan
        ↓
Scene composition → animation → visual inspection
        ↓
Deterministic timeline → renderer (next milestone)
```

## Roadmap

- [x] Mathematical editor UI and animated preview
- [x] Visible Agent plan, pipeline, and current step
- [x] DeepSeek structured planning and evolution APIs
- [x] Demo mode without credentials
- [x] Visual critic, mutation selection, version history, and project memory
- [x] Static-file demo and reproducible project JSON export
- [ ] Remotion composition generation
- [ ] Asset upload and media inspection tools
- [ ] FFmpeg/Remotion render queue and MP4 export
- [ ] Human approval gates and iterative revision

## Open-source notes

- License: MIT
- No 3Blue1Brown artwork, logo, or source material is included. The interface uses an original, code-native mathematical-animation aesthetic.
- Do not commit `.env` or API keys.

## Tech stack

React, TypeScript, Vite, Express, SVG/CSS animation, and DeepSeek API.
