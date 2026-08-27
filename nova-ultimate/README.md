# Nova AI Ultimate

A free, open-source, installable AI workspace built for the browser.

## Included

- AI chat with General, Study, Coding, Research and Writing modes
- Multilingual UI and RTL/LTR support
- Local chat history and project persistence
- Text/code/JSON/CSV/Markdown file context
- PDF text extraction in the browser with PDF.js
- Image understanding through the configured multimodal model
- Image Studio: local filters, crop-ready canvas workflow and export
- Optional AI image generation through a server-side Pollinations key
- Code Studio with live HTML preview and download
- Notes, calculator, JSON formatter, word/character counter and Pomodoro
- Voice input (where Web Speech is supported) and browser text-to-speech
- PWA manifest + service worker for installability and offline shell caching
- No secrets committed to GitHub

## Server configuration

Deploy this folder as a Vercel project root.

Required for cloud AI chat:

- `BAILIAN_TOKEN_PLAN_API_KEY`

Optional:

- `BAILIAN_TOKEN_PLAN_BASE_URL`
- `NOVA_AI_MODEL` to force a specific model
- `POLLINATIONS_API_KEY` for AI image generation

Without `NOVA_AI_MODEL`, the backend tries `qwen3.8-max` first for maximum quality and automatically falls back to `qwen3.8-max-preview` if the existing Token Plan endpoint does not expose the newer model.

The UI remains usable without the optional image key; local image editing and all local tools continue to work.

## Security

API keys stay server-side. The browser never receives the Alibaba or Pollinations secret keys. Uploaded file text is treated as untrusted data rather than higher-priority instructions.

## Run locally

The static UI can be served with any local HTTP server. API routes require a Vercel-compatible runtime or equivalent serverless host.
