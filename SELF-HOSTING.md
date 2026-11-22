# Self-hosting PixelClip

This guide takes you from a clean machine to a working PixelClip install that runs entirely on your own hardware. It covers the Docker setup, the API keys (or local models) you need, every setting worth touching, backups, updates, and the problems people actually hit.

PixelClip has no hosted service and no subscription. You run the stack, you own the data.

---

## 1. What runs

`docker compose up` starts these services:

| Service | Port | Purpose |
|---|---|---|
| `frontend` | 3107 | Next.js web app (the UI) |
| `backend` | 8000 | FastAPI REST API, `/docs` for interactive API docs |
| `worker` | — | Video pipeline: download, transcribe, select, render |
| `ai-worker` | — | Dynamic edit rendering (separate queue) |
| `mcp` | 9100 | MCP server for Claude/Cursor (optional) |
| `postgres` | 5432 (internal) | Database |
| `redis` | 6379 (internal) | Job queue and progress events |

The frontend, API, workers, and database are all local. Nothing is sent anywhere except the providers you configure (AssemblyAI, your LLM, YouTube/Twitch/Kick for downloads, Pexels for B-roll, Amazon SES for email). Set those to local alternatives (Whisper + Ollama) and the pipeline runs fully offline.

`cron-worker` and `vector` are optional profiles and are not started by default.

---

## 2. Requirements

- **Docker Engine 24+** with Compose v2. On Windows use WSL2 and run the commands from inside WSL — see the [Windows + WSL2 tutorial](docs/wsl-windows-setup.md) for a beginner walkthrough.
- **CPU:** 4 cores minimum, 8+ preferred. Rendering ffmpeg jobs are CPU-bound.
- **RAM:** 8 GB minimum, 16 GB comfortable. Whisper `medium` needs roughly 4 GB on its own.
- **Disk:** 20 GB free. Long videos and rendered clips are the big consumers; 1080p renders are several MB per clip.
- **GPU (optional):** an NVIDIA GPU with the container toolkit speeds up rendering, and Whisper large models need it to be practical.
- Apple Silicon: keep `BACKEND_CPU_ONLY=true` and `BACKEND_PLATFORM=linux/amd64` (Docker emulates it), or set `linux/arm64` and stay CPU-only.

---

## 3. Get the code

```bash
git clone https://github.com/pixelcorp-dev/PixelClip.git
cd PixelClip
```

Everything below runs from the repository root.

---

## 4. Create your `.env`

```bash
cp .env.example .env
```

`.env.example` is fully commented. The minimum useful configuration is:

```env
# .env
# Sign-in cookie secret — generate a fresh one, do not ship the default
BETTER_AUTH_SECRET=replace-with-a-long-random-string
BACKEND_AUTH_SECRET=replace-with-another-long-random-string
APP_SETTINGS_ENCRYPTION_KEY=replace-with-another-long-random-string

# Transcription (cloud)
TRANSCRIPTION_PROVIDER=assemblyai
ASSEMBLY_AI_API_KEY=your_assemblyai_key

# Clip selection (pick one provider)
LLM=google-gla:gemini-3-flash-preview
GOOGLE_API_KEY=your_google_key
```

Generate secrets with `openssl rand -hex 32` (run it three times, once per value).

Leaving `SELF_HOST=true` (the default) keeps the install free of subscriptions, trials, and plan limits. Do not set it to `false` unless you are deliberately wiring Stripe and a paid plan.

### Which LLM?

| Provider | `LLM=` | Key |
|---|---|---|
| Google | `google-gla:gemini-3-flash-preview` | `GOOGLE_API_KEY` |
| OpenAI | `openai:gpt-5.2` | `OPENAI_API_KEY` |
| Anthropic | `anthropic:claude-4-sonnet` | `ANTHROPIC_API_KEY` |
| OpenRouter | `openrouter:anthropic/claude-sonnet-5.5` | `OPENROUTER_API_KEY` |
| Ollama (local) | `ollama:qwen3.5:7b` | none; set `OLLAMA_BASE_URL` |

Any one of these is enough. `RERANK_LLM` optionally picks a second model for re-ranking candidates on very long videos.

---

## 5. Start the stack

```bash
docker compose up -d --build
```

The first build is slow because it downloads PyTorch and ffmpeg. Follow it with:

```bash
docker compose logs -f
```

Wait until `backend` reports the API is listening and `frontend` shows `Ready`. Then check:

```bash
curl -s http://localhost:8000/health      # {"status":"ok",...}
curl -sI http://localhost:3107 | head -1  # HTTP/1.1 200 OK
```

All services: `docker compose ps`.

---

## 6. First run

1. Open <http://localhost:3107>.
2. Create an account on the sign-up page. The first account is a normal user; promote it to admin if you want the admin screens:
   ```bash
   docker compose exec postgres psql -U pixelclip -d pixelclip \
     -c "update \"user\" set is_admin = true where email = 'you@example.com';"
   ```
   (Table and column names come from the Prisma schema; quote them as shown.)
3. Paste a YouTube link or upload a short video (2–5 minutes is a good first test) and press **Generate clips**.
4. Watch progress live on the task page. A rendered clip appears in the library when the pipeline finishes.

If sign-up is closed, check `DISABLE_SIGN_UP` in `.env`.

**Email:** verification, password reset, and API-key emails need Amazon SES (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL`). Without SES those specific flows cannot send mail; clipping itself works normally.

---

## 7. Fully offline / local-only mode

No cloud transcription and no cloud LLM:

```env
TRANSCRIPTION_PROVIDER=whisper
WHISPER_MODEL_SIZE=medium          # tiny | base | small | medium | large-v3
TRANSCRIPTION_LANGUAGE=            # empty = detect per video

LLM=ollama:qwen3.5:7b
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
```

Run Ollama on the host (`ollama serve`), then pull the model you named: `ollama pull qwen3.5:7b`.

`host.docker.internal` is mapped automatically by the compose file on Linux, macOS, and Windows. If you run the backend outside Docker, use `http://localhost:11434/v1` instead.

Whisper models download on first use and are cached in the backend container volume, so the first transcription is slower. Larger models are more accurate and much slower on CPU; start with `base`, move to `medium` once the pipeline works.

Everything else stays local by default: `MEDIA_STORAGE=local` keeps uploads and clips on disk, and no analytics or error reporting is active unless you set the PostHog/Axiom/DataFast variables.

### GPU rendering

With the NVIDIA container toolkit installed:

```env
BACKEND_CPU_ONLY=false
BACKEND_PLATFORM=linux/amd64
```

and give the `backend`, `worker`, and `ai-worker` services a GPU reservation in a `docker-compose.override.yml`:

```yaml
services:
  worker:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

Repeat for `backend` and `ai-worker`. Verify with `docker compose exec worker nvidia-smi`.

---

## 8. Settings that matter

All of these live in `.env`; restart with `docker compose up -d` after changing them.

### Core

| Variable | Default | Notes |
|---|---|---|
| `SELF_HOST` | `true` | Keep `true`: no subscriptions, trials, or plan gates |
| `FRONTEND_PORT` | `3107` | Host port for the UI |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3107` | Must match how you open the app; used for links, OAuth callbacks, and email URLs |
| `BETTER_AUTH_URL` | `http://localhost:3107` | Same origin as above |
| `BETTER_AUTH_SECRET` | — | **Change it.** Signs session cookies |
| `BACKEND_AUTH_SECRET` | — | **Change it.** Signs frontend→API requests |
| `APP_SETTINGS_ENCRYPTION_KEY` | — | **Change it.** Encrypts stored provider credentials |
| `CORS_ORIGINS` | `http://localhost:3107,...` | Add your LAN hostname if you open the app from another machine |
| `DISABLE_SIGN_UP` | `false` | Set `true` after creating your accounts to close registration |

### Video and processing

| Variable | Default | Notes |
|---|---|---|
| `DEFAULT_PROCESSING_MODE` | `fast` | `fast` / balanced / quality |
| `MAX_CLIPS` | `10` | Upper bound per video |
| `MAX_VIDEO_UPLOAD_BYTES` | `4000000000` | Raise for long 1080p uploads; mirror it in `NEXT_PUBLIC_MAX_VIDEO_UPLOAD_BYTES` |
| `VIDEO_JOB_USER_CONCURRENCY` | `1` | Videos rendered at once per account |
| `SPEAKER_FRAMING` | `true` | Cut to the active speaker on wide shots |
| `GAMING_LAYOUT` | `off` | `auto` detects gameplay + facecam |
| `PEXELS_API_KEY` | empty | Enables AI B-roll |

### Downloads

| Variable | Default | Notes |
|---|---|---|
| `YOUTUBE_DOWNLOAD_PROVIDER` | `yt_dlp` | Free default; `apify`/`rapidapi` need keys |
| `YOUTUBE_MAX_HEIGHT` | `1080` | Cap on downloaded resolution |
| `YOUTUBE_SOURCE_CACHE` | `on` | Reuse the source between edits |
| `STREAM_DOWNLOAD_MAX_SECONDS` | `2400` | Longest single Twitch/Kick download |
| `APIFY_API_TOKEN` | empty | Optional fallback for difficult YouTube downloads |

### Storage

`MEDIA_STORAGE=local` writes to the `uploads` and `clips` Docker volumes. To use S3-compatible storage instead, set `MEDIA_STORAGE=s3` plus the `MEDIA_S3_*` variables; see [docs/media-storage.md](docs/media-storage.md).

### Email (optional)

`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL` (for example `PixelClip <clip@pixelclip.local>`).

### Social publishing (optional)

YouTube, TikTok, and Instagram publishing uses your own OAuth apps: `YOUTUBE_OAUTH_CLIENT_ID`/`SECRET`, `TIKTOK_CLIENT_KEY`/`SECRET`, `INSTAGRAM_APP_ID`/`SECRET`, with `SOCIAL_PUBLISHING_ACCESS=all`. Register `${NEXT_PUBLIC_APP_URL}/api/social/callback/<provider>` as the redirect URI. Details in [docs/configuration.md](docs/configuration.md).

---

## 9. Data, storage, and backups

Docker volumes hold everything that matters:

| Volume | Holds |
|---|---|
| `postgres_data` | Accounts, tasks, clips metadata, settings |
| `uploads` | Original uploaded source videos |
| `clips` | Rendered clips and exported edits |
| `redis_data` | Queue state (safe to lose; jobs in flight are lost) |
| `mcp_downloads` | Files the MCP server fetches |

Back up the database:

```bash
docker compose exec -T postgres pg_dump -U pixelclip pixelclip | gzip > pixelclip-$(date +%F).sql.gz
```

Restore:

```bash
gunzip -c pixelclip-2026-01-01.sql.gz | docker compose exec -T postgres psql -U pixelclip -d pixelclip
```

Back up media by archiving the volumes:

```bash
docker run --rm -v pixelclip_clips:/data -v "$PWD":/backup alpine \
  tar czf /backup/clips-$(date +%F).tar.gz -C /data .
```

(Volume names are prefixed with the compose project name, `pixelclip` by default.)

To free disk space, delete old tasks from the library; deleting a task removes its clips. `TEMP_DIR` content is scratch and can be cleared after workers restart.

---

## 10. Updating

```bash
git pull
docker compose up -d --build
```

Database migrations run automatically when the backend starts. Read `CHANGELOG.md` before upgrading across several releases, and take a database dump first (section 9) — migrations are forward-only.

To pin a version, check out a tag before building: `git checkout <tag> && docker compose up -d --build`.

---

## 11. Reaching it from other devices

**On your LAN:** open `http://<host-ip>:3107`. Add that origin to `CORS_ORIGINS` and set `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` to it, then recreate the frontend container. In Docker Desktop the port is already published on all interfaces.

**Behind a reverse proxy:** terminate TLS at nginx/Caddy and proxy to `127.0.0.1:3107` (and `/api` to `127.0.0.1:8000` if you expose the API). Set `NEXT_PUBLIC_APP_URL=https://clips.example.com`, `BETTER_AUTH_URL` to the same value, and add the origin to `CORS_ORIGINS`. Keep the API and Postgres off the public internet.

Do not expose this stack publicly without TLS and a firewall: it holds your account credentials and media.

---

## 12. API and MCP access

Create an API key in **Settings → Agents & API**. Then:

```bash
curl -H "Authorization: Bearer $PIXELCLIP_API_KEY" http://localhost:8000/api/v1/tasks
```

The MCP server connects to the local API by default:

```bash
docker compose -f mcp/docker-compose.yml up -d   # or run it with uv, see mcp/README.md
```

Set `PIXELCLIP_API_URL=http://localhost:8000` and `PIXELCLIP_API_KEY=...` for a host-side MCP client. Full endpoint list: [docs/api-reference.md](docs/api-reference.md).

---

## 13. Running without Docker (development)

```bash
# API
cd backend && uv sync
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# workers (separate terminal)
cd backend && .venv/bin/python -m src.workers.run_workers

# frontend
cd frontend && pnpm install --frozen-lockfile && pnpm run dev
```

You need PostgreSQL and Redis reachable (the compose services work fine: `docker compose up -d postgres redis`) and `DATABASE_URL`/`REDIS_HOST`/`REDIS_PORT` set. See [docs/development.md](docs/development.md).

---

## 14. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `docker compose up` fails on `backend` build | Not enough disk, or an architecture mismatch. Check `docker system df`; on ARM set `BACKEND_PLATFORM=linux/arm64` and `BACKEND_CPU_ONLY=true`. |
| Page loads but every API call fails | `NEXT_PUBLIC_APP_URL` / `CORS_ORIGINS` do not match the origin in the address bar, or `BACKEND_AUTH_SECRET` differs between services. Recreate: `docker compose up -d --force-recreate frontend backend`. |
| Sign-in redirects back to sign-in | Cookies need a consistent origin. Use `localhost` consistently, not a mix of `127.0.0.1` and `localhost`. |
| Task sits at "queued" | No worker running: `docker compose ps` should show `worker`; check `docker compose logs worker`. |
| "Transcription failed" | Bad or missing `ASSEMBLY_AI_API_KEY`, or the video has no speech. Try `TRANSCRIPTION_PROVIDER=whisper` to isolate the provider. |
| LLM errors on analysis | Wrong `LLM` provider for the key you set, or the model name is misspelled. Test the key directly with the provider first. |
| Ollama unreachable from containers | Use `http://host.docker.internal:11434/v1`, not `localhost` (inside a container that is the container itself). |
| YouTube downloads fail | YouTube rate-limits datacenter IPs. Set `YOUTUBE_PROXY_URL`, or `APIFY_API_TOKEN` as a fallback provider. |
| Renders are extremely slow | CPU-only ffmpeg. Lower `YOUTUBE_MAX_HEIGHT`, reduce `MAX_CLIPS`, or add a GPU (section 7). |
| "No space left on device" | Old clips and source caches. Delete old tasks, then `docker system prune`. |
| Uploads hang | The browser uploads directly to `NEXT_PUBLIC_APP_URL`; make sure that origin reaches the backend. |

More in [docs/troubleshooting.md](docs/troubleshooting.md). For backend logs: `docker compose logs -f backend worker`.

---

## 15. Security checklist

- Replace all three secrets in `.env` (`BETTER_AUTH_SECRET`, `BACKEND_AUTH_SECRET`, `APP_SETTINGS_ENCRYPTION_KEY`) before first use.
- Set `DISABLE_SIGN_UP=true` once your accounts exist.
- Keep `.env` out of version control; it holds your provider keys.
- Do not publish ports 5432 and 6379.
- Terminate TLS at a reverse proxy before exposing the app beyond your network.
- Take a database dump before each upgrade.
