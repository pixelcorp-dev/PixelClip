# PixelClip

**PixelClip is a self-hosted AI video clipper by PixelDominion.** Give it a long video — a podcast, a talk, a stream VOD, or your own upload — and it finds the strongest moments, scores them, and renders vertical 9:16 clips with face-centered cropping, word-synced subtitles, hook titles, and optional B-roll.

Everything runs on your own machine or your own server through Docker Compose. There is no hosted service, no account on someone else's platform, and no paid plan: you bring the model keys (or run the models locally) and keep the output.

**New here? Start with the [detailed self-hosting guide](SELF-HOSTING.md). On Windows, follow the [WSL2 step-by-step tutorial](docs/wsl-windows-setup.md).**

## What it does

- **YouTube, Twitch, Kick & uploads** — paste a YouTube link, a Twitch VOD or clip, a Kick VOD or clip, or upload a file
- **AI clip selection** — an LLM picks the 3–7 most clip-worthy segments from the transcript (Gemini, GPT, Claude, OpenRouter, or a local Ollama model)
- **Virality scoring** — every clip gets hook, engagement, value, and shareability scores
- **Smart vertical cropping** — face detection keeps the speaker centered in the 9:16 frame
- **Word-synced subtitles** — word-level timestamps, custom fonts, caption templates with animated styles
- **Hook titles** — an AI-written headline burned into the top of each clip's opening seconds
- **Dynamic edits** — Subtle, Bold, and Max edit intensities with captions, punch-ins, sound effects, and music beds
- **B-roll & transitions** — optional stock footage overlays and transition effects
- **Built-in editor** — trim, split, merge, and export with TikTok, Reels, and Shorts presets
- **Workflows** — series, topic, recap, and trailer runs from one source
- **Real-time progress** — live pipeline updates while your video processes

## Requirements

- Docker Engine 24+ with Compose v2, on Linux, macOS, or Windows (WSL2)
- 4 CPU cores and 8 GB RAM as a working minimum (16 GB is comfortable); 20 GB+ of free disk
- An [AssemblyAI](https://www.assemblyai.com/) key for cloud transcription **or** Whisper for fully local transcription
- One LLM provider key (Google, OpenAI, Anthropic, OpenRouter) **or** a local Ollama model

## Quick start

```bash
git clone https://github.com/pixelcorp-dev/PixelClip.git
cd PixelClip
cp .env.example .env        # then add your API keys
docker compose up -d --build
```

Open <http://localhost:3107>, create the first account, and start clipping. The API is at <http://localhost:8000> with interactive docs at `/docs`.

First build takes a few minutes (PyTorch and ffmpeg are large). Watch progress with `docker compose logs -f`.

Fully offline instead of cloud APIs:

```env
TRANSCRIPTION_PROVIDER=whisper
WHISPER_MODEL_SIZE=medium
LLM=ollama:qwen3.5:7b
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
```

See the [self-hosting guide](SELF-HOSTING.md) for the full walkthrough, every setting, GPU rendering, backups, and troubleshooting.

## Documentation

| Guide | What it covers |
|---|---|
| [Self-hosting guide](SELF-HOSTING.md) | Complete offline install: requirements, keys, configuration, local models, backups, updates |
| [Windows + WSL2 setup](docs/wsl-windows-setup.md) | Beginner walkthrough for Windows: WSL2, Docker Desktop, first clip |
| [Setup](docs/setup.md) | Docker-first install, local development, first-run checklist |
| [Configuration](docs/configuration.md) | Every environment variable, operating modes, provider options |
| [App Guide](docs/app-guide.md) | Screens and workflows |
| [Architecture](docs/architecture.md) | How the frontend, API, worker, queue, and pipeline fit together |
| [API Reference](docs/api-reference.md) | Backend endpoints and API keys |
| [Development](docs/development.md) | Running without Docker, testing, contributing |
| [Render worker](docs/render-worker.md) | Running the video worker on a second machine |
| [Troubleshooting](docs/troubleshooting.md) | Fixes for the common failure modes |

## MCP server

`mcp/` is a Python MCP server that exposes PixelClip to Claude, Cursor, and other MCP clients. Point it at your instance with `PIXELCLIP_API_URL` and an API key from **Settings → Agents & API**. See [mcp/README.md](mcp/README.md).

## Project layout

```
backend/    FastAPI API, ARQ workers, and media pipeline (Python)
frontend/   Next.js app and Prisma schema
mcp/        MCP server
docs/       Technical documentation
deploy/     Optional deployment helpers (render worker, serving, autoscaler)
```

## Contributing

Issues and pull requests are welcome. Run `make check` for frontend lint and types, `make test` for the unit and integration suites, and `make test-e2e` for the browser smoke tests.
