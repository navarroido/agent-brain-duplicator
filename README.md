# agent-brain-duplicator

Clone a [NanoClaw](https://nanoclaw.com) AI agent's brain — memory, skills, scripts, config, and settings — into a portable `.tar.gz` file. Deploy it to a new agent in minutes.

```
╔════════════════════════════════════════════════════════════╗
║  🧠  agent-brain-duplicator  —  Deploy                     ║
╚════════════════════════════════════════════════════════════╝

  [1/3]  YouTube API Key
    console.cloud.google.com → APIs & Services → Credentials

  › Enter value: ████████████████
  ✓ Saved
```

---

## What's in a brain?

| Layer | What gets packed |
|---|---|
| **Workspace** | Scripts, tools, notes, config files |
| **Memory** | Claude memory files, CLAUDE.local.md preferences |
| **Skills** | Custom skill definitions (e.g. `inspiration-report`) |
| **Settings** | Claude settings, hooks, MCP config |

Secrets (API keys) are **never** included — the tool detects them and either keeps them in a checklist or strips them entirely in `--template` mode.

---

## Install

```bash
npm install -g agent-brain-duplicator
```

Or use without installing:

```bash
npx agent-brain-duplicator snapshot
```

---

## Usage

### Step 1 — Snapshot (run inside the agent)

Pack the brain into a portable archive:

```bash
agent-brain-duplicator snapshot
```

Creates `brain-YYYYMMDD-agentname.tar.gz` in the agent's workspace.

**Template mode** — strip all secrets so the brain is safe to share:

```bash
agent-brain-duplicator snapshot --template
```

All API key values in `config.js` are replaced with `YOUR_KEY_NAME` placeholders. Safe to publish or share publicly.

---

### Step 2 — Inspect (optional, run on your Mac)

See what's inside before deploying:

```bash
agent-brain-duplicator inspect brain-20260516-nano.tar.gz
```

Output:
```
╔════════════════════════════════════════════════════════════╗
║  🧠  Brain Manifest                                        ║
╚════════════════════════════════════════════════════════════╝

  Agent:    Nano
  Group:    dm-with-ido-navarro
  Created:  5/16/2026, 2:35:52 AM
  Mode:     Template — secrets are placeholders

  Contents:
    Skills:  inspiration-report, llmagnet-brand
    Memory:  4 files
    Scripts: 58 files

  config.js secrets:
    → YouTube API Key (YOUTUBE_API_KEY)
    → HeyGen API Key (HEYGEN_API_KEY)

  Vault secrets:
    → Buffer API credentials
    → LinkedIn credentials
```

---

### Step 3 — Deploy (run on your Mac)

Unpack the brain into a new NanoClaw agent group:

```bash
agent-brain-duplicator deploy brain-20260516-nano.tar.gz --group my-new-agent
```

The tool:
1. Auto-detects your NanoClaw installation
2. Creates the new group directory
3. Restores workspace, memory, and settings
4. Launches an **interactive setup wizard** for all secrets

```
╔════════════════════════════════════════════════════════════╗
║  🧠  Agent Setup Wizard                                    ║
╚════════════════════════════════════════════════════════════╝

  Configure your new agent's secrets.
  Press Enter to keep the current value, or type a new one.

  ────────────────────────────────────────────────────────────

  [1/3]  YouTube API Key
    console.cloud.google.com → APIs & Services → Credentials

  › Enter value: _
  ✓ Saved

  [2/3]  HeyGen API Key
    app.heygen.com → Account → API

  › Enter value: _
  ↷ Skipped — edit config.js later

  ────────────────────────────────────────────────────────────

  ⚠  Also add these in the NanoClaw vault:
     → Buffer API credentials
     → LinkedIn credentials
        (NanoClaw UI → Agent Settings → Secrets)
```

Then in NanoClaw UI: **New Agent → group: my-new-agent** → the agent wakes up with the full brain.

---

### NanoClaw root auto-detection

The tool looks for your NanoClaw installation at:
- `~/Desktop/nano/nanoclaw-v2`
- `~/nano/nanoclaw-v2`
- `~/nanoclaw-v2`

Or pass it explicitly:

```bash
agent-brain-duplicator deploy brain.tar.gz --group my-clone --nanoclaw-root ~/path/to/nanoclaw-v2
```

---

## Full flow

```
Inside agent               Your Mac
─────────────              ─────────────────────────────
snapshot ──────────────►  brain-DATE-name.tar.gz
                          inspect (optional peek)
                          deploy --group my-clone
                            └─ wizard prompts for secrets
                          NanoClaw: New Agent → my-clone
                          Agent wakes up with full brain ✓
```

---

## Template flow (share with others)

```bash
# On your agent: pack without real secrets
agent-brain-duplicator snapshot --template

# Share brain-DATE-name-template.tar.gz with anyone

# They deploy and enter their own keys
agent-brain-duplicator deploy brain-DATE-name-template.tar.gz --group their-agent
```

---

## Requirements

- Node.js 18+
- NanoClaw v2 (for deploy)
- Runs `snapshot` **inside** a NanoClaw agent container
- Runs `inspect` and `deploy` **on the host Mac**

---

## License

MIT
