# Nexus Multi-Agent Prototype

**Smart task routing to specialized AI agents**

Nexus routes tasks to the best agent based on keywords, cost, and availability. Agents run in isolated child processes for parallel execution and cost optimization.

---

## 🎯 Features

- **Smart Routing:** Auto-detect task type (code, design, general)
- **Cost Optimization:** Routes 60%+ tasks to free agents (Gemini)
- **Parallel Execution:** Process-based isolation
- **Usage Tracking:** JSONL logs with cost/duration stats
- **Fallback Support:** Auto-fallback if agent fails

---

## 📦 Installation

```bash
cd nexus-prototype
npm install
chmod +x bin/nexus-cli.js
npm link  # Makes 'nexus' command available globally
```

**Environment:**

Set your OpenRouter API key:

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
```

---

## 🚀 Usage

### Execute a Task

```bash
# Smart routing (auto-detects best agent)
nexus task "Fix this JavaScript bug: const x = [1,2,3]; x.foreach(i => console.log(i));"

# Force specific agent
nexus task "What is the capital of France?" --agent gemini

# Prefer cheapest agent
nexus task "Explain quantum computing" --cheap
```

### List Agents

```bash
nexus agents
```

Output:
```
🤖 Configured Agents

✅ Gemini Agent (General) (gemini)
   Model: google/gemini-2.0-flash-thinking-exp:free
   Cost: FREE
   Skills: general, research, writing, qa

✅ Mike (Code Expert) (mike)
   Model: moonshotai/kimi-k2.5
   Cost: $0.6/M
   Skills: coding, debugging, architecture, git, api

❌ Philip (UI/UX Designer) (philip)
   Model: anthropic/claude-sonnet-4-5-20250929
   Cost: $3.0/M
   Skills: design, ui, ux, wireframes, frontend, css

Default agent: gemini
```

### View Stats

```bash
# Summary
nexus stats

# Detailed per-agent breakdown
nexus stats --detailed
```

### Test Connectivity

```bash
# Test all enabled agents
nexus test

# Test specific agent
nexus test --agent mike
```

---

## 🛠️ Configuration

Edit `~/.vutler/agents.json` to configure agents:

```json
{
  "version": "1.0.0",
  "agents": [
    {
      "id": "gemini",
      "name": "Gemini Agent (General)",
      "model": "google/gemini-2.0-flash-thinking-exp:free",
      "provider": "openrouter",
      "skills": ["general", "research", "writing"],
      "cost": 0,
      "enabled": true
    }
  ],
  "routing": {
    "default": "gemini",
    "keywords": {
      "code": ["mike"],
      "bug": ["mike"],
      "design": ["philip"]
    }
  }
}
```

**Add new agent:**

1. Add entry to `agents` array
2. Add routing keywords
3. Set `enabled: true`

---

## 📊 Architecture

```
User: "Fix this bug"
  ↓
Nexus CLI
  ↓
NexusOrchestrator.executeTask()
  ↓
routeTask() → Keyword matching
  ↓
spawnAgent() → Child process
  ↓
agent-runner.js → OpenRouter API
  ↓
Result → IPC message
  ↓
Display + Log
```

**Files:**

- `lib/orchestrator.js` - Main orchestrator class
- `lib/agent-runner.js` - Child process runner
- `bin/nexus-cli.js` - CLI interface
- `~/.vutler/agents.json` - Agent configuration
- `~/.vutler/logs/agent-tasks.jsonl` - Usage logs

---

## 🧪 Testing

### Test 1: Code Bug Fix

```bash
nexus task "Fix this bug: const arr = [1,2,3]; arr.foreach(x => console.log(x));"
```

**Expected:**
- Routes to Mike (keyword: "bug")
- Suggests: `forEach` (not `foreach`)
- Cost: ~$0.01 (Kimi K2.5)

### Test 2: General Question

```bash
nexus task "What is the capital of Switzerland?"
```

**Expected:**
- Routes to Gemini (default)
- Answer: "Bern"
- Cost: $0.00 (FREE)

### Test 3: Design Task

```bash
nexus task "Design a modern login page wireframe" --agent philip
```

**Expected:**
- Routes to Philip (forced)
- If disabled → fallback to Gemini
- Cost: varies

---

## 💰 Cost Optimization

**Goal:** 60% tasks free, 35% cheap, 5% expensive

**Strategy:**

1. **Free tier (Gemini):** General questions, research, QA
2. **Cheap tier (Kimi K2.5):** Code, debugging, APIs
3. **Premium tier (Sonnet):** Complex design, architecture

**Routing Keywords:**

| Keyword | Agent | Cost |
|---------|-------|------|
| code, bug, fix, debug | Mike | $0.6/M |
| design, ui, wireframe | Philip | $3.0/M |
| (default) | Gemini | FREE |

---

## 🔧 Troubleshooting

**Error: Agent config not found**

Create config file:
```bash
mkdir -p ~/.vutler
# Copy default config from repo
```

**Error: OPENROUTER_API_KEY not set**

Set environment variable:
```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
# Add to ~/.zshrc for persistence
```

**Error: Agent timeout**

Increase timeout:
```bash
nexus task "long task..." --timeout 600000  # 10 minutes
```

**Error: npm link failed**

Try manual symlink:
```bash
ln -s $(pwd)/bin/nexus-cli.js /usr/local/bin/nexus
```

---

## 📈 Roadmap

**Phase 2 (After Prototype):**

- [ ] Tool execution (file ops, git, etc.)
- [ ] Memory persistence (Snipara integration)
- [ ] WebSocket support (live updates)
- [ ] Agent chaining (multi-step tasks)
- [ ] Cost budgets and limits
- [ ] Web UI dashboard

**Phase 3 (Full Nexus):**

- [ ] 10+ specialized agents
- [ ] BMAD workflow automation
- [ ] Vutler cloud integration
- [ ] Deploy-to-client capability
- [ ] Enterprise features

---

## 📝 License

MIT - Starbox Group © 2026

---

**Created:** 2026-03-01  
**Status:** Prototype (Phase 1)  
**Author:** Jarvis + Mike
