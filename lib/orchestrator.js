const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * NexusOrchestrator - Smart multi-agent task routing and execution
 * 
 * Routes tasks to specialized agents based on keywords, cost, and availability.
 * Executes agents in child processes for isolation and parallel execution.
 */
class NexusOrchestrator {
  constructor(configPath = '~/.vutler/agents.json') {
    this.configPath = configPath.replace('~', os.homedir());
    this.config = this.loadConfig();
    this.sessions = new Map(); // Track active agent sessions
    this.stats = {
      tasksCompleted: 0,
      totalCost: 0,
      agentUsage: {}
    };
  }

  /**
   * Load agent configuration from JSON file
   */
  loadConfig() {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Agent config not found: ${this.configPath}`);
    }
    
    const raw = fs.readFileSync(this.configPath, 'utf8');
    const config = JSON.parse(raw);
    
    // Validate config
    if (!config.agents || config.agents.length === 0) {
      throw new Error('No agents defined in config');
    }
    
    if (!config.routing || !config.routing.default) {
      throw new Error('Routing config missing or invalid');
    }
    
    return config;
  }

  /**
   * Route a task to the most appropriate agent
   * 
   * @param {string} task - The task description
   * @param {object} options - Routing options (forceAgent, preferCheap, etc.)
   * @returns {string} - Agent ID
   */
  routeTask(task, options = {}) {
    // Force specific agent if requested
    if (options.forceAgent) {
      const agent = this.config.agents.find(a => a.id === options.forceAgent);
      if (agent && agent.enabled) {
        return options.forceAgent;
      }
      console.warn(`Forced agent ${options.forceAgent} not available, falling back`);
    }
    
    // Check keywords
    const taskLower = task.toLowerCase();
    
    for (const [keyword, agentIds] of Object.entries(this.config.routing.keywords)) {
      if (taskLower.includes(keyword)) {
        // Pick first enabled agent for this keyword
        for (const agentId of agentIds) {
          const agent = this.config.agents.find(a => a.id === agentId);
          if (agent && agent.enabled) {
            console.log(`🎯 Routing to ${agent.name} (keyword: "${keyword}")`);
            return agentId;
          }
        }
      }
    }
    
    // Default to free agent if preferCheap option set
    if (options.preferCheap) {
      const freeAgent = this.config.agents.find(a => a.cost === 0 && a.enabled);
      if (freeAgent) {
        console.log(`💰 Routing to ${freeAgent.name} (free agent)`);
        return freeAgent.id;
      }
    }
    
    // Fall back to default
    console.log(`📍 Routing to default agent: ${this.config.routing.default}`);
    return this.config.routing.default;
  }

  /**
   * Spawn an agent in a child process
   * 
   * @param {string} agentId - ID of the agent to spawn
   * @param {string} task - Task for the agent to complete
   * @param {object} options - Execution options (timeout, context, etc.)
   * @returns {Promise} - Resolves with agent result
   */
  async spawnAgent(agentId, task, options = {}) {
    const agent = this.config.agents.find(a => a.id === agentId);
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    if (!agent.enabled) {
      console.warn(`Agent ${agentId} is disabled, falling back to default`);
      return this.spawnAgent(this.config.routing.default, task, options);
    }

    console.log(`\n🤖 Spawning ${agent.name}...`);
    console.log(`   Model: ${agent.model}`);
    console.log(`   Cost: ${agent.cost === 0 ? 'FREE' : `$${agent.costPerMillion.input}/M input`}`);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Spawn child process
      const child = spawn('node', [path.join(__dirname, 'agent-runner.js')], {
        env: {
          ...process.env,
          AGENT_ID: agentId,
          AGENT_NAME: agent.name,
          AGENT_MODEL: agent.model,
          AGENT_PROVIDER: agent.provider,
          TASK: JSON.stringify(task),
          CONTEXT: JSON.stringify(options.context || {}),
          OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || ''
        },
        stdio: ['pipe', 'pipe', 'pipe', 'ipc']
      });

      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        if (!options.silent) {
          process.stdout.write(text);
        }
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        error += text;
        if (!options.silent) {
          process.stderr.write(text);
        }
      });

      child.on('message', (msg) => {
        if (msg.type === 'result') {
          const duration = Date.now() - startTime;
          const cost = this.calculateCost(agent, msg.usage);
          
          // Track stats
          this.stats.tasksCompleted++;
          this.stats.totalCost += cost;
          this.stats.agentUsage[agentId] = (this.stats.agentUsage[agentId] || 0) + 1;
          
          resolve({
            agentId,
            agentName: agent.name,
            result: msg.result,
            duration,
            cost,
            usage: msg.usage,
            timestamp: new Date().toISOString()
          });
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Agent spawn failed: ${err.message}`));
      });

      child.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Agent exited with code ${code}\n${error}`));
        }
      });

      // Timeout
      const timeout = options.timeout || this.config.limits.timeoutSeconds * 1000;
      setTimeout(() => {
        child.kill();
        reject(new Error(`Agent timeout (${timeout}ms)`));
      }, timeout);
    });
  }

  /**
   * Calculate cost based on token usage
   */
  calculateCost(agent, usage) {
    if (agent.cost === 0) return 0; // Free model
    
    const inputCost = (usage.inputTokens / 1_000_000) * agent.costPerMillion.input;
    const outputCost = (usage.outputTokens / 1_000_000) * agent.costPerMillion.output;
    
    return inputCost + outputCost;
  }

  /**
   * Execute a task with smart routing
   * 
   * @param {string} task - Task description
   * @param {object} options - Execution options
   * @returns {Promise} - Agent result
   */
  async executeTask(task, options = {}) {
    const agentId = options.agentId || this.routeTask(task, options);
    
    try {
      const result = await this.spawnAgent(agentId, task, options);
      
      // Log to tracking file if enabled
      if (this.config.tracking && this.config.tracking.enabled) {
        this.logTask(task, result);
      }
      
      return result;
    } catch (error) {
      console.error(`\n❌ Agent execution failed: ${error.message}`);
      
      // Fallback to default agent if not already using it
      if (agentId !== this.config.routing.default && !options.noFallback) {
        console.log(`\n🔄 Falling back to ${this.config.routing.default}...`);
        return this.spawnAgent(this.config.routing.default, task, { ...options, noFallback: true });
      }
      
      throw error;
    }
  }

  /**
   * Log task execution to JSONL file
   */
  logTask(task, result) {
    const logPath = this.config.tracking.logPath.replace('~', os.homedir());
    const logDir = path.dirname(logPath);
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const entry = JSON.stringify({
      timestamp: result.timestamp,
      task: task.substring(0, 200), // Truncate long tasks
      agentId: result.agentId,
      agentName: result.agentName,
      duration: result.duration,
      cost: result.cost,
      usage: result.usage
    });
    
    fs.appendFileSync(logPath, entry + '\n');
  }

  /**
   * Get orchestrator stats
   */
  getStats() {
    return {
      ...this.stats,
      averageCost: this.stats.tasksCompleted > 0 
        ? this.stats.totalCost / this.stats.tasksCompleted 
        : 0
    };
  }
}

module.exports = NexusOrchestrator;
