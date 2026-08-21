# Axiom Cut

A code-driven video editing Agent with a mathematical-animation visual language. Describe a scene in natural language, inspect the Agent's plan, and follow every execution step from intent to a deterministic timeline.

![Axiom Cut UI](docs/preview.png)

## Why this project

The assignment asks for basic editing, a usable human-in-the-loop interface, and an Agent that can perform editing work. Axiom Cut focuses its advanced module on **plan observability**: the user always knows what the Agent plans to do, what tool is running, and what has completed.

This first open-source version is an interactive product demo. It includes a responsive editor, animated mathematical preview, editable prompt, generated six-step plan, progress simulation, timeline, DeepSeek integration, and a zero-config demo fallback. A production renderer such as Remotion or Manim is the next implementation layer.

## Run locally

Requirements: Node.js 20+

```bash
npm install
cp .env.example .env
npm run dev
```

Open <http://127.0.0.1:4173>. Without an API key the full UI runs in local demo mode.

## DeepSeek setup

Put the API key in `.env` on the server:

```bash
DEEPSEEK_API_KEY=your_key
DEEPSEEK_MODEL=deepseek-v4-flash
```

The browser only calls `/api/plan`; the key is never sent to the client. The server uses DeepSeek's OpenAI-compatible `POST /chat/completions` endpoint with JSON Output.

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
- [x] Visible Agent plan and current step
- [x] DeepSeek structured-plan API
- [x] Demo mode without credentials
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
