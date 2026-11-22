# 🐧 PixelClip on Windows with WSL2 — Complete Beginner's Guide

**PixelClip is a self-hosted AI video clipper by PixelDominion.** This guide installs it on a Windows PC from zero: no Linux experience, no server, no account on anyone else's platform. You end up with PixelClip running on your own computer at **<http://localhost:3107>**.

> 🕒 **Time:** about 30–45 minutes of clicking and typing, plus **10–30 minutes** of waiting for the first build.
> 💡 **WSL2** means *Windows Subsystem for Linux* — a real Ubuntu Linux running inside Windows. PixelClip's backend, workers, and ffmpeg render pipeline are Linux software, so WSL2 is the clean way to run them on Windows.

---

## 📋 1. What you need before you start

| Requirement | Minimum | Comfortable |
|---|---|---|
| Windows version | Windows 10 (22H2) or Windows 11, 64-bit | Windows 11 |
| CPU | 4 cores | 6–8 cores |
| RAM | 8 GB | 16 GB |
| Free disk space | 25 GB | 60 GB+ |
| Internet | Needed for install, builds, and downloads | — |
| API key | One transcription key **or** local Whisper | AssemblyAI + one LLM key |

**What you will install:** WSL2 + Ubuntu, Docker Desktop, and PixelClip itself.

**What it costs:** PixelClip is **free**. You only pay the AI providers you choose — AssemblyAI and Google both have free tiers that are plenty for testing. You can also run **100% offline** with Whisper + Ollama (section 11).

---

## 🗺️ 2. The big picture

1. Install **WSL2** and **Ubuntu** 🐧
2. Install **Docker Desktop** and switch on WSL integration 🐳
3. Give WSL enough **RAM and CPU** ⚙️
4. Download **PixelClip** and create your **`.env`** file 📝
5. Run `docker compose up -d --build` 🚀
6. Open **<http://localhost:3107>**, create an account, clip a video ✂️

That's it. Every step below is copy‑paste friendly.

---

## 🐧 3. Install WSL2 and Ubuntu

1. Click **Start**, type **PowerShell**, right-click **Windows PowerShell** → **Run as administrator**.
2. Paste this and press Enter:

   ```powershell
   wsl --install -d Ubuntu
   ```

3. **Restart Windows** when it asks. 🖥️
4. After the restart, **Ubuntu** opens by itself (or launch it from the Start menu). It asks you to create a **UNIX username** and **password**:
   - Use **lowercase letters only** (for example `pixel`).
   - ⚠️ **The password does not show while you type** — no dots, no stars. Type it blind and press Enter.
5. Update the fresh system:

   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

   Type your Ubuntu password when asked (again, invisibly).

**Install the small tools the next steps use:**

```bash
sudo apt install -y git curl ca-certificates openssl
```

✅ **Checkpoint:** in PowerShell, run `wsl -l -v`. You should see `Ubuntu` with **VERSION 2**.

> 🪟 **How to use the Ubuntu terminal:** open **Ubuntu** from the Start menu. Paste with **Ctrl + Shift + V**, copy with **Ctrl + Shift + C**. Your Linux home folder is `~` — everything in this guide happens there.

> ⚠️ **Never keep the project on `C:` (`/mnt/c/...`).** Linux files on a Windows drive are slow and can break file permissions during the Docker build. Use the Ubuntu home folder, as shown below.

---

## 🐳 4. Install Docker Desktop and enable WSL integration

Docker runs the PixelClip containers; WSL2 is where they live.

1. Download **Docker Desktop for Windows** from <https://www.docker.com/products/docker-desktop/> and install it.
2. Launch **Docker Desktop** and accept the licence. You can **skip** the sign-in.
3. Open **Settings** (⚙️ gear, top right):
   - **General** → tick ✅ **Use the WSL 2 based engine**
   - **Resources → WSL Integration** → tick ✅ **Enable integration with my default WSL distro** and ✅ **Ubuntu**
   - Click **Apply & restart**.
4. Leave Docker Desktop **running** whenever you use PixelClip. The whale 🐳 icon in the system tray must be visible and not say "starting".

**Verify from inside Ubuntu** (not PowerShell):

```bash
docker --version
docker compose version
docker run --rm hello-world
```

✅ **Checkpoint:** `hello-world` prints *"Hello from Docker!"*.

> ⚠️ Docker Desktop already gives your Ubuntu user access to Docker. **Do not** put `sudo` in front of `docker` commands — that causes confusing permission errors later.
>
> ℹ️ **Advanced alternative:** you *can* install Docker Engine directly inside Ubuntu instead of Docker Desktop, but then `host.docker.internal` (used for Ollama) needs extra setup. For a first install, Docker Desktop is the smoother path.

---

## ⚙️ 5. Give WSL enough memory (important on 8–16 GB PCs)

WSL2 can swallow all your RAM and make Windows crawl. Cap it.

1. In Windows, press **Win + R**, type `%UserProfile%` and press Enter.
2. Create a file named **`.wslconfig`** (exactly that, with the leading dot) and open it in Notepad.
3. Paste this, adjusting the numbers to your PC (roughly half your RAM, half your cores):

   ```ini
   [wsl2]
   memory=8GB
   processors=4
   swap=2GB
   ```

4. Save, then restart WSL from PowerShell:

   ```powershell
   wsl --shutdown
   ```

5. Reopen **Ubuntu** and check:

   ```bash
   free -h     # look at "total" under Mem
   nproc       # number of CPUs
   df -h ~     # free disk space
   ```

✅ **Checkpoint:** memory and CPU match what you configured.

> 💡 **8 GB RAM total?** Set `memory=6GB`, keep `WHISPER_MODEL_SIZE=base`, and process shorter videos (up to ~10 minutes). Rendering is CPU-heavy.

---

## 📥 6. Download PixelClip

In the **Ubuntu** terminal:

```bash
cd ~
git clone https://github.com/pixelcorp-dev/PixelClip.git
cd PixelClip
ls
```

✅ **Checkpoint:** `ls` shows `docker-compose.yml`, `README.md`, `SELF-HOSTING.md`, `backend`, `frontend`, and more.

> 🔁 **Already cloned it once?** Just run `cd ~/PixelClip` — don't clone again.

---

## 📝 7. Create your settings file (`.env`)

PixelClip reads its configuration from a file named **`.env`** in the project folder. You start from the template:

```bash
cp .env.example .env
```

### 7.1 Generate three secrets 🔐

Run this **three times** and keep each result (a 64-character line of letters and numbers):

```bash
openssl rand -hex 32
```

You need three different values for:

- `BETTER_AUTH_SECRET` — signs your login cookies
- `BACKEND_AUTH_SECRET` — signs app → API requests
- `APP_SETTINGS_ENCRYPTION_KEY` — encrypts stored provider credentials

### 7.2 Edit the file

```bash
nano .env
```

`nano` is a text editor: arrow keys move, type normally. Save with **Ctrl + O**, then **Enter**; exit with **Ctrl + X**.

Set at least these values:

```env
# Paste your three generated secrets
BETTER_AUTH_SECRET=paste-first-secret-here
BACKEND_AUTH_SECRET=paste-second-secret-here
APP_SETTINGS_ENCRYPTION_KEY=paste-third-secret-here

# Keep this: self-hosted mode (no subscriptions, no plan limits)
SELF_HOST=true

# Transcription (cloud, easiest)
TRANSCRIPTION_PROVIDER=assemblyai
ASSEMBLY_AI_API_KEY=your-assemblyai-key

# Clip selection brain (pick one provider)
LLM=google-gla:gemini-3-flash-preview
GOOGLE_API_KEY=your-google-ai-studio-key
```

**Where the keys come from:**

| Key | Get it at | Notes |
|---|---|---|
| `ASSEMBLY_AI_API_KEY` | <https://www.assemblyai.com/> | Free tier included; word-level timing |
| `GOOGLE_API_KEY` | <https://aistudio.google.com/apikey> | Free tier included |

**Prefer a different brain?** Pick exactly one:

| Provider | `LLM=` | Key |
|---|---|---|
| Google | `google-gla:gemini-3-flash-preview` | `GOOGLE_API_KEY` |
| OpenAI | `openai:gpt-5.2` | `OPENAI_API_KEY` |
| Anthropic | `anthropic:claude-4-sonnet` | `ANTHROPIC_API_KEY` |
| OpenRouter | `openrouter:anthropic/claude-sonnet-5.5` | `OPENROUTER_API_KEY` |
| Ollama (offline) | `ollama:qwen3.5:7b` | none — see section 11 |

> ⚠️ **Formatting rules:** no spaces around `=`, no quotes, one setting per line. A stray space is the most common cause of "missing key" errors.

✅ **Checkpoint:**

```bash
grep -E '^(LLM|TRANSCRIPTION_PROVIDER)=' .env
```

Both lines print your values. 🔒 **Never share `.env` or paste its contents into a chat, screenshot, or GitHub issue** — it holds your keys.

---

## 🚀 8. Start PixelClip

From `~/PixelClip`:

```bash
docker compose up -d --build
```

**The first build takes 10–30 minutes** — it downloads Python, PyTorch, ffmpeg, and Node.js images. Go make tea ☕. Subsequent starts take seconds.

Watch the progress in a second terminal (or the same one after it finishes):

```bash
docker compose logs -f
```

Press **Ctrl + C** to stop *watching* the logs — this does **not** stop PixelClip.

**Check that everything is healthy:**

```bash
docker compose ps
```

You want `frontend`, `backend`, `worker`, `ai-worker`, `postgres`, and `redis` in **running** (healthy) state. `mcp` is optional.

**Confirm the app answers:**

```bash
curl -s http://localhost:8000/health
curl -sI http://localhost:3107 | head -1
```

✅ **Checkpoint:** the first shows `"status":"ok"` and the second shows `HTTP/1.1 200 OK`.

---

## 🎬 9. Create your account and clip the first video

1. Open your **normal Windows browser** and go to **<http://localhost:3107>** 🌐
   (Docker Desktop forwards WSL ports to Windows, so `localhost` just works. Use `localhost`, not `127.0.0.1`, consistently.)
2. Click **Sign up** and create an account. This account only exists in your own database.
3. *(Optional)* Make yourself an admin to see the admin screens:

   ```bash
   docker compose exec postgres psql -U pixelclip -d pixelclip \
     -c "update \"user\" set is_admin = true where email = 'you@example.com';"
   ```

4. Close sign-ups once your accounts exist — edit `.env`, set `DISABLE_SIGN_UP=true`, then run `docker compose up -d`.
5. **First clip:** paste a YouTube link or upload a video **2–5 minutes long**, then press **Generate clips**.
6. Stay on the task page and watch the live pipeline: download → transcribe → select → render ✂️
7. Rendered clips appear in the library. Download them or open the built-in editor.

⏱️ **Expect roughly 5–15 minutes** for a 5-minute source on CPU-only hardware.

> 📧 **No verification email?** Password-reset and verification mail need Amazon SES, which is optional. The first account works without it; clipping does not need email at all.

---

## 📂 10. Where your data lives

Everything important is in **Docker volumes**, not loose files in the project folder:

| Volume | Holds |
|---|---|
| `pixelclip_postgres_data` | Accounts, tasks, clip metadata, settings |
| `pixelclip_uploads` | Original source videos |
| `pixelclip_clips` | Rendered clips and exports |
| `pixelclip_redis_data` | Queue state (safe to lose) |

**Browse the project from Windows Explorer:** paste `\\wsl$\Ubuntu\home\<your-linux-username>\PixelClip` into the address bar.

**Back up the database** (do this before every update):

```bash
mkdir -p ~/pixelclip-backups
docker compose exec -T postgres pg_dump -U pixelclip pixelclip \
  | gzip > ~/pixelclip-backups/pixelclip-$(date +%F).sql.gz
```

**Restore it:**

```bash
gunzip -c ~/pixelclip-backups/pixelclip-2026-01-01.sql.gz \
  | docker compose exec -T postgres psql -U pixelclip -d pixelclip
```

> 🗂️ Keep backups in `~/pixelclip-backups`, **outside** the repository, so `git` never sees your data.

---

## 🔁 11. Everyday commands cheat sheet

Run all of these from `~/PixelClip` in the **Ubuntu** terminal.

| I want to… | Command |
|---|---|
| Start PixelClip | `docker compose up -d` |
| Stop PixelClip (data is kept) | `docker compose down` |
| Restart one service | `docker compose restart worker` |
| See what is running | `docker compose ps` |
| Watch live logs | `docker compose logs -f` |
| Watch only the video worker | `docker compose logs -f worker` |
| Update to the newest version | `git pull && docker compose up -d --build` |
| Free disk space | `docker system prune -a` |
| Shut down Linux entirely | `wsl --shutdown` (PowerShell) |

> 💤 **Sleep and restarts:** after a Windows restart, open **Docker Desktop** first, wait for the 🐳 icon, then run `docker compose up -d`. Your clips and accounts are safe.

---

## 🔌 12. Fully offline mode (optional — no cloud APIs)

For total privacy, use **Whisper** for transcription and **Ollama** for the AI, both free and local.

### 12.1 Ollama on Windows

1. Install from <https://ollama.com/download> and launch it.
2. Download a model (PowerShell):

   ```powershell
   ollama pull qwen3.5:7b
   ```

3. Let Docker reach Ollama: set a **Windows environment variable** `OLLAMA_HOST` to `0.0.0.0` (Settings → System → Advanced → Environment variables), then restart Ollama. Allow it through the Windows firewall when prompted.

### 12.2 Point PixelClip at the local models

Edit `.env`:

```env
TRANSCRIPTION_PROVIDER=whisper
WHISPER_MODEL_SIZE=base          # tiny | base | small | medium | large-v3
LLM=ollama:qwen3.5:7b
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
```

Apply it:

```bash
docker compose up -d
docker compose exec backend curl -s http://host.docker.internal:11434/api/tags
```

✅ **Checkpoint:** the `curl` prints a JSON list of your models. If it says *connection refused*, Ollama is not running or `OLLAMA_HOST` was not applied.

> 🐢 Whisper on CPU is slow: `base` is a good starting point, `medium` is more accurate but several times slower. The model downloads once and is cached, so the first transcription takes longer.
>
> 🎮 **NVIDIA GPU?** Docker Desktop on WSL2 can pass the GPU through. Set `BACKEND_CPU_ONLY=false` in `.env`, add the GPU reservation block from [SELF-HOSTING.md §7](../SELF-HOSTING.md#7-fully-offline--local-only-mode), and rebuild with `docker compose up -d --build`.

---

## 🧯 13. Troubleshooting (WSL / Windows edition)

| 😖 Symptom | ✅ Fix |
|---|---|
| `docker: command not found` | WSL integration is off: Docker Desktop → Settings → Resources → WSL Integration → enable **Ubuntu** → Apply & restart. Close and reopen the Ubuntu terminal. |
| `permission denied ... /var/run/docker.sock` | Same cause as above. Do **not** use `sudo docker`. |
| `Cannot connect to the Docker daemon` | Docker Desktop isn't running. Start it and wait for the tray icon to settle. |
| Page won't load at `localhost:3107` | Run `docker compose ps` and `docker compose logs --tail=100 frontend`. First start can take a couple of minutes after the build. |
| Everything was fine, now nothing loads | Windows restarted or slept. Start Docker Desktop, then `docker compose up -d`. |
| `port is already allocated` | Another app uses 3107. Change `FRONTEND_PORT=3108` in `.env`, then `docker compose up -d`, and open that port. |
| Build dies with `exit code 137` / `Killed` | Out of memory. Raise `memory=10GB` in `.wslconfig`, run `wsl --shutdown`, retry. |
| Build errors about permissions, or it's painfully slow | The project is on `/mnt/c`. Move it: `mv /mnt/c/Users/<you>/PixelClip ~/PixelClip`. |
| `No space left on device` | `docker system prune -a`, delete old tasks in the library, check `df -h` and `docker system df`. |
| Clipboard paste does nothing | Use **Ctrl + Shift + V** (not Ctrl + V) in the Ubuntu terminal. |
| Time is wrong and builds fail oddly | After long sleep, restart WSL: `wsl --shutdown` in PowerShell, reopen Ubuntu. |
| Sign-in bounces back to sign-in | Open the app as `http://localhost:3107` only — don't mix `127.0.0.1` and `localhost`. |
| Task stuck at "queued" | The worker isn't running: `docker compose ps`, then `docker compose logs worker`. |
| "Transcription failed" | Wrong/missing `ASSEMBLY_AI_API_KEY`, or the video has no speech. Try `TRANSCRIPTION_PROVIDER=whisper` to isolate it. |
| Ollama unreachable from containers | Use `http://host.docker.internal:11434/v1`, never `localhost`, inside a container. |

More patterns: [troubleshooting](troubleshooting.md) and [SELF-HOSTING.md §14](../SELF-HOSTING.md#14-troubleshooting).

---

## 🔐 14. Keep it safe

- **`.env` stays private.** It is git-ignored; never commit it or paste it into issues.
- **Don't expose the stack to the internet.** Docker Desktop publishes ports on `127.0.0.1` only — leave it that way. For remote access, put a TLS reverse proxy in front (see [SELF-HOSTING.md §11](../SELF-HOSTING.md#11-reaching-it-from-other-devices)).
- **Set `DISABLE_SIGN_UP=true`** after creating your accounts.
- **Back up before updating** (section 10) — database migrations are forward-only.
- **Rotate keys** if you ever shared a screenshot of `.env`.

---

## ✅ 15. Final checklist

- [ ] `wsl -l -v` shows Ubuntu on **version 2**
- [ ] `docker run --rm hello-world` succeeds inside Ubuntu
- [ ] Project lives in `~/PixelClip` (not `/mnt/c`)
- [ ] `.env` has three fresh secrets and at least one LLM + transcription key
- [ ] `docker compose ps` shows all services running
- [ ] <http://localhost:3107> loads and you can sign in
- [ ] Your first task produced at least one rendered clip 🎉
- [ ] You know how to stop (`docker compose down`) and update (`git pull && docker compose up -d --build`)

---

## 📚 Next steps

| Guide | What it covers |
|---|---|
| [Self-hosting guide](../SELF-HOSTING.md) | Every setting, GPU rendering, backups, reverse proxy |
| [Configuration](configuration.md) | Complete environment variable reference |
| [App guide](app-guide.md) | Screens and workflows |
| [API reference](api-reference.md) | Automate PixelClip with API keys |
| [MCP server](../mcp/README.md) | Use PixelClip from Claude, Cursor, and other MCP clients |
| [Troubleshooting](troubleshooting.md) | Deeper fixes for stuck pipelines |

**Welcome to PixelClip.** 🎉 You now own the whole pipeline — your machine, your models, your clips.
