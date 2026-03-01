# Nexus Cloud Setup

**Nexus v2.0 - Cloud-First Architecture**

Nexus est maintenant un **coordinateur local** qui délègue l'exécution aux **agents Vutler Cloud**.

---

## 🎯 Architecture

```
User
  ↓
Nexus (local Mac) - Analyse + Route
  ↓
Vutler Cloud API
  ↓
Agents Cloud (Mike, Philip, Luna, etc.)
  ↓
Résultat → Nexus → User
```

**Avantages:**
- ✅ Pas besoin d'agents locaux lourds
- ✅ Accès à tous les agents Vutler (10+)
- ✅ Scalable et maintenu côté cloud
- ✅ Nexus reste léger et rapide

---

## 📦 Installation

### 1. Clone le repo

```bash
git clone https://github.com/alopez3006/nexus-prototype.git
cd nexus-prototype
npm install
```

### 2. Configuration

**Copie le fichier config cloud:**

```bash
cp .vutler-agents-cloud.json ~/.vutler/agents.json
```

**Set les API keys:**

```bash
# Vutler API Key (requis pour les agents cloud)
export VUTLER_API_KEY='votre_key_vutler'

# Ajoute à ~/.zshrc pour persistance
echo "export VUTLER_API_KEY='votre_key_vutler'" >> ~/.zshrc
```

### 3. Test de connectivité

```bash
nexus test
```

Expected output:
```
✅ Connected to Vutler Cloud
```

---

## 🚀 Usage

### Exécuter une tâche

```bash
# Smart routing (auto-détecte le bon agent)
nexus task "Fix this JavaScript bug: forEach() not working"
# → Routes vers Mike (keyword: bug)

# Force un agent spécifique
nexus task "Design a login page" --agent philip

# Avec contexte
nexus task "Create user story for feature X" --agent luna
```

### Lister les agents disponibles

```bash
nexus agents
```

Output:
```
☁️  Cloud Agents (Vutler)

✅ Mike (Code Expert)
   Location: Vutler Cloud
   Skills: coding, debugging, architecture, git, api

✅ Philip (UI/UX Designer)
   Location: Vutler Cloud
   Skills: design, ui, ux, wireframes, frontend

✅ Luna (Product Manager)
   Location: Vutler Cloud
   Skills: product, strategy, planning

... (10 agents total)
```

### Voir les stats

```bash
nexus stats
nexus stats --detailed
```

---

## 📋 Agents Cloud Disponibles

| Agent | Rôle | Skills |
|-------|------|--------|
| **Mike** | Code Expert | coding, debugging, architecture, api |
| **Philip** | UI/UX Designer | design, ui, wireframes, frontend |
| **Luna** | Product Manager | product, strategy, planning |
| **Andrea** | Office Manager | admin, legal, compliance |
| **Max** | Marketing | marketing, growth, campaigns |
| **Oscar** | Content Writer | writing, content, copywriting |
| **Nora** | Community Manager | community, discord, social |
| **Victor** | Sales | sales, partnerships, deals |
| **Rex** | QA Engineer | qa, testing, validation |
| **Stephen** | Research | research, analysis |

---

## 🔧 Configuration

**File:** `~/.vutler/agents.json`

```json
{
  "version": "2.0.0",
  "mode": "cloud",
  "vutlerUrl": "https://app.vutler.ai",
  "agents": [
    {
      "id": "mike",
      "name": "Mike (Code Expert)",
      "enabled": true,
      "skills": ["coding", "debugging"]
    }
  ],
  "routing": {
    "default": "mike",
    "keywords": {
      "bug": ["mike"],
      "design": ["philip"]
    }
  }
}
```

**Variables d'environnement:**

```bash
VUTLER_API_KEY=your_key     # Requis
VUTLER_API_URL=https://...  # Optionnel (défaut: app.vutler.ai)
```

---

## 🆚 Local vs Cloud

### Ancien mode (Local)

```
nexus task "Fix bug" 
  → Spawn OpenRouter local process
  → Execute avec Kimi K2.5
  → $0.01 (payé par utilisateur)
```

### Nouveau mode (Cloud)

```
nexus task "Fix bug"
  → Call Vutler API
  → Execute via Mike cloud agent
  → $0.XX (payé par Vutler)
```

**Différences:**

| Aspect | Local | Cloud |
|--------|-------|-------|
| Setup | Complexe (API keys) | Simple (1 key) |
| Agents | 2-3 max | 10+ |
| Coût | Utilisateur | Vutler |
| Scalabilité | Limitée | Illimitée |
| Maintenance | Utilisateur | Vutler |

---

## 🐛 Troubleshooting

### Error: VUTLER_API_KEY not set

```bash
export VUTLER_API_KEY='your_key'
```

### Error: Failed to connect to Vutler Cloud

Vérifier:
1. API key valide
2. Internet connection
3. Vutler Cloud accessible: `curl https://app.vutler.ai/api/v1/health`

### Agent not responding

Vérifier:
1. Agent existe: `nexus agents`
2. Agent enabled dans config
3. Logs: `~/.vutler/logs/agent-tasks.jsonl`

---

## 📝 Roadmap

**Phase 1 (Done):**
- ✅ Cloud orchestrator
- ✅ 10 agents Vutler
- ✅ Smart routing

**Phase 2 (Next):**
- [ ] Streaming responses
- [ ] Agent status (online/busy)
- [ ] Cost tracking par agent
- [ ] Multi-step workflows

**Phase 3 (Future):**
- [ ] Agent chaining
- [ ] Memory persistence
- [ ] Custom agents
- [ ] Web UI

---

**Créé:** 2026-03-01  
**Mode:** Cloud-First  
**Version:** 2.0.0
