# agent-brain-duplicator

Clone a [NanoClaw](https://nanoclaw.com) AI agent's brain — memory, skills, scripts, config, and settings — into a portable `.tar.gz` file. Deploy it to a new agent in minutes, with a beautiful interactive setup wizard.

```
                                                   0
                                                  0
                                                 00  00
                                                00   0
                                               00   00
                              00000000000000 00    0           000
                           0000           00000   00        000 00 0000
                         000              00 000000        00  00   0 00
                       000              000    000        00   00 000 00
                      000                       000       0  700007   0
                     000                         000     00000       00
                    00     000000            00  000     00         00
                   00     0000  0           0000 0000    00       000
                  000      000000           000000000   00000   000
                  00         00   000    00   000  00 000   00000
                 000              0000000000       0000    000
                 00                2000000         000   000
                 00                                00  000
                 000                              200000
                  00                             000
                 00000      000                0000
                 0000000   00 00       0000000000
                00   00000000  000   0000       0000
                 06     00000   000000             000
                 00        0000000000000            000
                  00        00         7000       7  00
                  000000000000            00      2  00
                   00    006000      20000000        00
                   60        0007    000            000
                    0000  000000000    000         00000
                       000       0000000000       000000000
                        0000    000            000000    000
                           00000000000000000000000     60000
                       00000000000000000000000000000000000

  agent-brain-duplicator  —  Clone NanoClaw agent brains
```

---

## What's in a brain?

| Layer | What gets packed |
|---|---|
| **Workspace** | Scripts, tools, notes, config files |
| **Memory** | Claude memory files, CLAUDE.local.md preferences |
| **Skills** | Custom skill definitions |
| **Settings** | Claude settings, hooks, MCP config |

Secrets (API keys) are **never** included by default — the tool detects them, lists them in a checklist, or strips them entirely in `--template` mode.

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

### `snapshot` — Pack the brain (run inside the agent)

```bash
agent-brain-duplicator snapshot
```

Creates `brain-YYYYMMDD-agentname.tar.gz` in the agent's workspace.

**Template mode** — strip all secrets so the brain is safe to share:

```bash
agent-brain-duplicator snapshot --template
```

All API key values in `config.js` are replaced with `YOUR_KEY_NAME` placeholders.

---

### `list` — See all brain archives

```bash
agent-brain-duplicator list
agent-brain-duplicator list /path/to/directory
```

```
  Brain archives in: /workspace/agent

  ────────────────────────────────────────────────────────────
  File                                        Size    Date
  ────────────────────────────────────────────────────────────
  brain-20260516-nano-template.tar.gz         241M    5/16/2026 [template]
  brain-20260516-nano.tar.gz                  241M    5/16/2026
  ────────────────────────────────────────────────────────────

  2 archives found
```

---

### `inspect` — Peek inside before deploying

```bash
agent-brain-duplicator inspect brain-20260516-nano.tar.gz
```

```
  Brain Manifest

  Agent:    Nano
  Group:    dm-with-ido-navarro
  Created:  5/16/2026, 2:35:52 AM
  Mode:     Template — secrets are placeholders

  Contents
  Skills:  inspiration-report, llmagnet-brand
  Memory:  4 files
  Scripts: 58 files

  config.js secrets
    → YouTube API Key (YOUTUBE_API_KEY)
    → HeyGen API Key (HEYGEN_API_KEY)

  Vault secrets
    → Buffer API credentials
    → LinkedIn credentials
```

---

### `deploy` — Unpack to a new agent (run on your Mac)

```bash
agent-brain-duplicator deploy brain-20260516-nano.tar.gz --group my-new-agent
```

The tool:
1. Auto-detects your NanoClaw installation
2. Creates the new group directory
3. Restores workspace, memory, and settings
4. Launches an **interactive setup wizard** — API keys are hidden as you type

```
╔════════════════════════════════════════════════════════════╗
║  🧠  Agent Setup Wizard                                    ║
╚════════════════════════════════════════════════════════════╝

  Configure your new agent's secrets.
  API keys are hidden as you type. Press Enter to skip.

  ────────────────────────────────────────────────────────────

  [1/3]  YouTube API Key
    console.cloud.google.com → APIs & Services → Credentials

  › Enter value (hidden):
  ✓ Saved

  [2/3]  HeyGen API Key
    app.heygen.com → Account → API

  › Enter value (hidden):
  ↷ Skipped

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
─────────────              ──────────────────────────────────────
snapshot ──────────────►  brain-DATE-name.tar.gz
                          list               (see all archives)
                          inspect            (peek inside)
                          deploy --group my-clone
                            └─ wizard prompts for secrets (hidden input)
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
- Run `snapshot` **inside** a NanoClaw agent container
- Run `inspect`, `list`, and `deploy` **on the host Mac**

---

## License

MIT
