const VutlerClient = require('./vutler-client');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Nexus Cloud Orchestrator
 * 
 * Routes tasks to Vutler cloud agents instead of local execution
 */
class NexusCloudOrchestrator {
  constructor(configPath = '~/.vutler/agents.json') {
    this.configPath = configPath.replace('~', os.homedir());
    this.config = this.loadConfig();
    this.client = new VutlerClient({
      baseUrl: this.config.vutlerUrl,
      apiKey: process.env.VUTLER_API_KEY
    });
    this.stats = {
      tasksCompleted: 0,
      totalCost: 0,
      agentUsage: {}
    };
  }

  /**
   * Load agent configuration
   */
  loadConfig() {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Agent config not found: ${this.configPath}`);
    }
    
    const raw = fs.readFileSync(this.configPath, 'utf8');
    const config = JSON.parse(raw);
    
    // Validate
    if (!config.agents || config.agents.length === 0) {
      throw new Error('No agents defined in config');
    }
    
    if (!config.routing || !config.routing.default) {
      throw new Error('Routing config missing');
    }
    
    return config;
  }

  /**
   * Route a task to the best cloud agent
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
    
    for (const [keyword, agentIds] of Object.entries(this.config.routing.keywords || {})) {
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
    
    // Default agent
    console.log(`📍 Routing to default agent: ${this.config.routing.default}`);
    return this.config.routing.default;
  }

  /**
   * Execute a task via cloud agent
   */
  async executeTask(task, options = {}) {
    const agentId = options.agentId || this.routeTask(task, options);
    const agent = this.config.agents.find(a => a.id === agentId);
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    if (!agent.enabled) {
      console.warn(`Agent ${agentId} disabled, falling back to default`);
      return this.executeTask(task, { ...options, agentId: this.config.routing.default, noFallback: true });
    }

    console.log(`\n☁️  ${agent.name} (cloud)`);
    console.log(`   Location: ${agent.location || 'Vutler Cloud'}`);
    
    try {
      const result = await this.client.executeTask(agentId, task, {
        context: options.context,
        timeout: options.timeout || this.config.limits?.timeoutSeconds * 1000,
        userId: options.userId
      });
      
      // Track stats
      this.stats.tasksCompleted++;
      this.stats.totalCost += result.cost;
      this.stats.agentUsage[agentId] = (this.stats.agentUsage[agentId] || 0) + 1;
      
      // Log to tracking file if enabled
      if (this.config.tracking?.enabled) {
        this.logTask(task, result);
      }
      
      return result;
      
    } catch (error) {
      console.error(`\n❌ Cloud execution failed: ${error.message}`);
      
      // Fallback to default agent if not already using it
      if (agentId !== this.config.routing.default && !options.noFallback) {
        console.log(`\n🔄 Falling back to ${this.config.routing.default}...`);
        return this.executeTask(task, { ...options, agentId: this.config.routing.default, noFallback: true });
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
      task: task.substring(0, 200),
      agentId: result.agentId,
      agentName: result.agentName,
      source: result.source,
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

  /**
   * Test cloud connectivity
   */
  async testConnection() {
    try {
      const ok = await this.client.ping();
      if (ok) {
        console.log('✅ Connected to Vutler Cloud');
        return true;
      } else {
        console.log('❌ Vutler Cloud unreachable');
        return false;
      }
    } catch (error) {
      console.log(`❌ Connection failed: ${error.message}`);
      return false;
    }
  }

  /**
   * List available cloud agents
   */
  async listCloudAgents() {
    try {
      return await this.client.listAgents();
    } catch (error) {
      console.error(`Failed to list cloud agents: ${error.message}`);
      return [];
    }
  }
}

module.exports = NexusCloudOrchestrator;
