# PixelClip MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server for
[PixelClip](http://localhost:3107) — turn long-form videos (YouTube links or
direct URLs) into short, vertical, subtitled viral clips from any MCP client
(Claude Desktop, Claude Code, Cursor, etc.).

By default it talks to the **official hosted PixelClip API** at
`http://localhost:8000`. Point it at your own deployment by setting
`PIXELCLIP_API_URL`.

## What it can do

| Tool | Auth | Description |
|------|:----:|-------------|
| `pixelclip_health` | – | API status + how this server is configured |
| `pixelclip_list_caption_templates` | – | Available caption styles (default, hormozi, mrbeast, …; animated ones too when dynamic edits are on) |
| `pixelclip_list_transitions` | – | Available transition effects |
| `pixelclip_broll_status` | – | Whether B-roll overlays are configured |
| `pixelclip_list_fonts` | ✓ | Subtitle fonts available to your account |
| `pixelclip_billing_summary` | ✓ | Plan, usage and remaining quota |
| `pixelclip_list_workflows` | ✓ | What your account can make (highlights, series, topic, recap, trailer) and each one's limits |
| `pixelclip_list_edit_styles` | ✓ | Whether your account has dynamic edits (intensity, sound effects, music, animated captions) and their options |
| `pixelclip_create_clip_task` | ✓ | Start clipping a video → returns a `task_id`; `workflow` picks what to make, `intensity` how hard it's edited |
| `pixelclip_list_tasks` | ✓ | List your tasks |
| `pixelclip_get_task` | ✓ | Task status, progress and clips |
| `pixelclip_wait_for_task` | ✓ | Poll until a task (or a queued clip edit, `clip_job_id`) finishes |
| `pixelclip_list_clips` | ✓ | List a task's generated clips |
| `pixelclip_download_clip` | ✓ | Save a clip's MP4 to disk |
| `pixelclip_export_clip` | ✓ | Re-encode + save with a platform preset (tiktok/reels/shorts) |
| `pixelclip_cancel_task` / `pixelclip_resume_task` / `pixelclip_delete_task` | ✓ | Manage tasks |

Tools marked ✓ require an API key (or self-host credentials, see below).

## Getting an API key

1. Sign in at [pixelclip.com](http://localhost:3107).
2. Go to [**Settings → API Keys**](http://localhost:3107/settings/api-keys).
3. Create a key and copy it (it's shown only once). It looks like `sk_…`.

Making clips needs a paid plan (Pro or Creator). On a free account the
discovery tools work, and creating a task returns a message with the upgrade
link instead of a clip.

## Connect to the hosted server

The hosted server is at `http://localhost:9100/mcp` (Streamable HTTP). Send
your key in the `Authorization` header. In every example below, replace
`sk_...` with your own key, and put **only the URL** in a client's URL field.

### Claude, ChatGPT, Grok and other apps with custom connectors

Add `http://localhost:9100/mcp` as a custom connector. The app sends you to
pixelclip.com to sign in and allow access; no key to copy. Allowing creates an
API key named after the app (for example "Claude connector"), listed at
[Settings → API Keys](http://localhost:3107/settings/api-keys); revoke it
there to disconnect. The connection uses your plan's minutes like any key.
The same page has these steps under "Connect Claude, ChatGPT or Grok". None of
these apps can prefill a server URL from a link, so paste it yourself.

- **Claude** ([guide](https://claude.com/docs/connectors/custom/add-unlisted)):
  [Customize → Connectors](https://claude.ai/customize/connectors) → Add → Add
  custom connector, paste the URL, keep the settings marked Detected (if asked
  how Claude identifies itself, choose Register automatically), Add, Connect.
  Free (one custom connector), Pro, Max, Ultra, Team and Enterprise; on Team and
  Enterprise an Owner adds it under Organization settings → Connectors first.
- **ChatGPT** ([guide](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)):
  on the web, [Plugins](https://chatgpt.com/plugins) → + → Add custom MCP
  server, paste the URL under Connection, OAuth, Create as a plugin, then
  install it. OpenAI offers this on Business, Enterprise and Edu; Pro accounts
  get read-only tools only, so they can't create tasks.
- **Grok** ([guide](https://docs.x.ai/grok/connectors)):
  [grok.com/connectors](https://grok.com/connectors) → New Connector → Custom,
  paste the URL and sign in. xAI doesn't document which sign-in methods custom
  connectors support, so this one is not confirmed end to end.
- **Claude Code** can use the same sign-in instead of a pasted key:
  `claude mcp add --transport http pixelclip http://localhost:9100/mcp`, then
  `claude mcp login pixelclip` (or `/mcp` inside Claude Code).

### Claude Code

```bash
claude mcp add --transport http pixelclip http://localhost:9100/mcp --header "Authorization: Bearer sk_..."
```

### Cursor, Windsurf and other clients with remote URL support

```json
{
  "mcpServers": {
    "pixelclip": {
      "url": "http://localhost:9100/mcp",
      "headers": {
        "Authorization": "Bearer sk_..."
      }
    }
  }
}
```

Cursor reads this from `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project).

### Claude Desktop

Claude Desktop's config file starts local servers, so bridge to the hosted
server with [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) (needs
Node.js). Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "pixelclip": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:9100/mcp",
        "--header",
        "Authorization:${PIXELCLIP_AUTH}"
      ],
      "env": {
        "PIXELCLIP_AUTH": "Bearer sk_..."
      }
    }
  }
}
```

On the hosted server, `pixelclip_download_clip` and `pixelclip_export_clip` save
files on the server, not on your computer. To get the MP4s locally, run the
server locally (below) or download clips from the task page.

### Older clients that only speak SSE

Use `http://localhost:9100/mcp/sse` as the URL, with the same
`Authorization: Bearer sk_...` header. Clients already configured with the
`/sse` URL keep working; Streamable HTTP requests sent there are answered too.

### If it doesn't connect

The server answers errors in plain words. `401` with "Missing PixelClip API
key" means the header didn't arrive; "placeholder" means `sk_...` (or
`sk_your_pixelclip_api_key`) was not replaced with a real key; "invalid or was
revoked" means the key was deleted, so create a new one. Opening
`http://localhost:9100/mcp/` in a browser shows the endpoints and setup.

## Run it locally (stdio)

Requires Python 3.10+ and [uv](https://docs.astral.sh/uv/). Clips you
download are saved on your machine (`PIXELCLIP_DOWNLOAD_DIR`).

```bash
claude mcp add pixelclip -e PIXELCLIP_API_KEY=sk_... \
  -- uvx --from "git+https://github.com/pixelcorp-dev/PixelClip#subdirectory=mcp" pixelclip-mcp
```

Or in a client's JSON config:

```json
{
  "mcpServers": {
    "pixelclip": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/pixelcorp-dev/PixelClip#subdirectory=mcp", "pixelclip-mcp"],
      "env": {
        "PIXELCLIP_API_KEY": "sk_..."
      }
    }
  }
}
```

From a checkout, use `"command": "uv", "args": ["--directory", "/absolute/path/to/pixelclip/mcp", "run", "pixelclip-mcp"]`
instead. For a self-hosted backend, add `"PIXELCLIP_API_URL": "http://localhost:8000"` to `env`.

## Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PIXELCLIP_API_KEY` | – | Your API key (stdio; recommended auth). |
| `PIXELCLIP_API_URL` | `http://localhost:8000` | Backend base URL. Set for self-hosting. |
| `PIXELCLIP_APP_URL` | `http://localhost:3107` | Web app, used in links to create keys and pick a plan. |
| `PIXELCLIP_DOWNLOAD_DIR` | `./pixelclip-downloads` | Where downloaded/exported clips are written. |
| `PIXELCLIP_TIMEOUT` | `60` | HTTP timeout (seconds) for non-download requests. |
| `PIXELCLIP_USER_ID` | – | Self-host only: authenticate by user id (see below). |
| `PIXELCLIP_AUTH_SECRET` | – | Self-host only: backend `BACKEND_AUTH_SECRET` for HMAC signing. |
| `PIXELCLIP_MCP_TRANSPORT` | `stdio` | `stdio`, or `http` to serve Streamable HTTP and SSE (`sse` and `streamable-http` mean the same as `http`). |
| `PIXELCLIP_MCP_HOST` / `PIXELCLIP_MCP_PORT` | `127.0.0.1` / `9100` | Listen address for `http`. |
| `PIXELCLIP_MCP_PUBLIC_URL` | `http://HOST:PORT` | Public base URL (including any mount path), shown in setup help and errors. |
| `PIXELCLIP_MCP_REQUIRE_BEARER_AUTH` | `false` | Require each client's own API key as a Bearer token. |
| `PIXELCLIP_MCP_MOUNT_PATH` | `/` | Serve every route under this prefix (OAuth discovery assumes `/`). |
| `MCP_OAUTH_SECRET` | – | Shared with the backend. With bearer auth on, turns on OAuth sign-in for connectors. |

### Self-hosting auth

If you run your own backend you have three options:

- **API key** (same as hosted): create a key and set `PIXELCLIP_API_KEY`.
- **Signed headers**: set `PIXELCLIP_USER_ID` + `PIXELCLIP_AUTH_SECRET` (your
  backend's `BACKEND_AUTH_SECRET`).
- **Unsigned**: if the backend runs with `ALLOW_UNSIGNED_BACKEND_AUTH=true`,
  just set `PIXELCLIP_USER_ID`.

Auth precedence is: API key → signed headers → unsigned user id.

## Hosting the HTTP server

`PIXELCLIP_MCP_TRANSPORT=http` serves both transports from one process:

| Path | What |
|------|------|
| `/mcp` | Streamable HTTP (current MCP spec) |
| `/sse` + `/messages/` | Legacy HTTP+SSE. POST/DELETE, or a GET with `Mcp-Session-Id`, go to Streamable HTTP |
| `/` | Same routing as `/sse`; a plain GET returns setup help as JSON |
| `/health` | Liveness |
| `/.well-known/oauth-protected-resource` (also `/mcp`, `/sse` suffixes), `/.well-known/oauth-authorization-server`, `/register`, `/authorize`, `/token` | OAuth for connectors, when `MCP_OAUTH_SECRET` is set (see [docs/mcp-oauth.md](../docs/mcp-oauth.md)) |

```bash
PIXELCLIP_API_URL=http://localhost:8000 \
PIXELCLIP_MCP_TRANSPORT=http \
PIXELCLIP_MCP_HOST=0.0.0.0 \
PIXELCLIP_MCP_PORT=9100 \
PIXELCLIP_MCP_PUBLIC_URL=http://localhost:9100/mcp \
PIXELCLIP_MCP_REQUIRE_BEARER_AUTH=true \
pixelclip-mcp
```

With `PIXELCLIP_MCP_REQUIRE_BEARER_AUTH=true` every path except `/`, `/health`
and the help pages needs a PixelClip API key (`Authorization: Bearer sk_...`,
or `x-api-key`), checked against the backend the same way on both transports.
Behind a reverse proxy, pass the `Authorization` header through and turn off
response buffering (`proxy_buffering off` in nginx) so streams flush.

With Docker Compose, the `mcp` service runs this mode by default and binds to
`127.0.0.1:9100` for a reverse proxy.

## Workflows

`pixelclip_create_clip_task` makes highlights by default. Pass `workflow` for
something else:

| `workflow` | Makes | `clip_length` sets |
|---|---|---|
| `highlights` | The best standalone clips | Each clip |
| `series` | One story as ordered, numbered parts (Part 1..N) that share exact cuts. `part_count`: 0 = auto, or 2–10 | Each part |
| `topic` | Every strong standalone moment about `topic` (required, 2–120 characters with a letter or digit; one Chinese, Japanese or Korean character is enough) | Each clip |
| `recap` | One short video covering the main points in order | Total length |
| `trailer` | One short teaser that never reveals the payoff | Total length |

`instructions` (up to 500 characters) steers any workflow, highlights included:
"skip the sponsor read", "focus on the hiring story". Topic and instructions
are normalized like the API does (invisible characters removed, spaces
collapsed) before the length checks.

Series need a video of at least 2 minutes, recaps and trailers 3 minutes, and
topic search 1 minute. Bad arguments fail locally before anything is created,
with the same rules as the API; `topic` with a workflow other than `topic`, or
`part_count` with a workflow other than `series`, is an error rather than
silently ignored.

Workflows may be gated per account: call `pixelclip_list_workflows` first. When
it reports `enabled: false`, only plain highlights without instructions work
(otherwise the API answers 403 `WORKFLOW_NOT_AVAILABLE`).

A workflow that cannot deliver fails the task instead of padding it, and the
minutes are refunded. `pixelclip_get_task` then shows `status: "error"` and an
`error_code`: `topic_not_found` (with `workflow_plan.error.details.suggested_topics`
to try instead), `source_too_short`, `no_story`, `recap_unsupported`,
`trailer_unbuildable`, `transcript_untimed`, or the retryable
`analysis_incomplete`, `plan_failed` and `render_incomplete`
(use `pixelclip_resume_task`). Series clips carry `part_number`; every workflow
clip carries `workflow_role` and `workflow_meta`.

## Dynamic edits

`intensity` on `pixelclip_create_clip_task` edits the clips like a short-form
editor would: the AI tags the moments that matter (hooks, punchlines, numbers,
swears) and the intensity decides how hard each one hits.

| `intensity` | Adds |
|---|---|
| `off` (default) | Nothing: the request is exactly what it was before dynamic edits |
| `subtle` | Outlined subtitles, a reframe now and then, a steady music bed, almost no sound effects |
| `bold` | Hormozi-style captions on a dark pill, punch-ins that hold, hits on some reframes, a quiet music bed |
| `max` | Heavy outlined caps, reframes on almost every line, louder hits, a louder bed, the odd flash at a cut |

Zooms are reframes that hold, transitions happen only at real cuts, sound
effects only on visual events, and every clip ends at −14 LUFS. Camera shake,
speed ramps and freeze frames are never placed automatically. With `censor` on,
swear words are bleeped and the captions show them as `f***`.

`edit_style` fine-tunes them with the API's keys, passed through as given:
`sfx`, `music`, `zooms`, `shake`, `transitions`, `speed`, `grain`,
`progress_bar`, `loop_ending`, `wait_for_it`, `reactions` (true/false),
`music_mood` (`auto` lets the AI pick, or `hype`, `chill`, `dramatic`,
`funny`, `inspiring`, `dark`, `aggressive`; 53 built-in beds across them), `censor` (`off`, `bleep`, `bleep_bar`, `bleep_pixelate`) and `grade`
(`auto`, `none`, `punchy`, `warm`, `teal_orange`, `noir`, `vhs`, `dream`).
`intensity` can go inside `edit_style` too; the argument wins when it isn't
`off`. The request carries `edit_style` only when the intensity isn't `off`,
and bad keys or values fail locally before anything is created.

Animated caption templates (`highlighter_swipe`, `emoji_drop`,
`behind_head`) go in `caption_template` and work with intensity `off` too.
Words appear as they're spoken; the intensity sets the look (Subtle: podcast
subtitles, Bold: Hormozi-style with the key word in a box, Max: big outlined
caps). `behind_head` looks best with a face on camera. Older animated ids
(`slam`, `stat_counter`, …) are no longer listed but still render on tasks
that already use them.

Dynamic edits may be gated per account: call `pixelclip_list_edit_styles` first.
`pixelclip_list_caption_templates` lists the animated templates only when it
says `enabled: true`. Otherwise turning edits on, or picking an animated
template, is refused with 403 `DYNAMIC_EDITS_NOT_AVAILABLE` before anything is
charged.

Changing a task's look re-renders clips that have dynamic edits on the video
worker: the API answers 202 with `{"status": "queued", "job_id", "kind"}`.
Pass the `job_id` to `pixelclip_wait_for_task` as `clip_job_id` to wait for it.

## Example prompts

- "Use pixelclip to make clips from https://youtu.be/… with the hormozi caption template, then wait for it and download the top clip."
- "Turn https://youtu.be/… into a 5-part series and download the parts in order."
- "Find every moment about pricing in https://youtu.be/…; if the topic isn't covered, try the first suggested topic."
- "Make a one-minute recap of https://youtu.be/… focused on the money advice."
- "Clip https://youtu.be/… with bold edits and the highlighter captions, no music."
- "List my recent pixelclip tasks and show the virality scores of the latest one's clips."
- "Export clip <id> from task <id> as a TikTok preset."

## Tests

```bash
cd mcp && uv run --with pytest pytest tests -q
```
