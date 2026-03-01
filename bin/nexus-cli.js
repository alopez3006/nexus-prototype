#!/usr/bin/env node

/**
 * Nexus CLI - Multi-Agent Task Execution
 * 
 * Usage:
 *   nexus task "Fix this bug in the code"
 *   nexus task "Design a login page" --agent philip
 *   nexus stats
 *   nexus agents
 */

const { program } = require('commander');
const NexusOrchestrator = require('../lib/orchestrator-cloud');
const fs = require('fs');
const os = require('os');

program
  .name('nexus')
  .description('Nexus multi-agent task orchestrator')
  .version('1.0.0');

/**
 * Execute a task with smart routing
 */
program
  .command('task <message>')
  .description('Execute task with smart agent routing')
  .option('-a, --agent <id>', 'Force specific agent (gemini, mike, philip)')
  .option('-c, --cheap', 'Prefer cheapest agent (default: smart routing)')
  .option('-t, --timeout <ms>', 'Task timeout in milliseconds', '300000')
  .option('-s, --silent', 'Suppress agent output (only show result)')
  .option('--context <json>', 'Additional context as JSON string')
  .action(async (message, options) => {
    try {
      const orchestrator = new NexusOrchestrator();
      
      const execOptions = {
        agentId: options.agent,
        preferCheap: options.cheap,
        timeout: parseInt(options.timeout),
        silent: options.silent
      };
      
      if (options.context) {
        execOptions.context = JSON.parse(options.context);
      }
      
      console.log('🎯 Nexus Orchestrator\n');
      console.log(`Task: ${message}\n`);
      
      const startTime = Date.now();
      const result = await orchestrator.executeTask(message, execOptions);
      const totalTime = Date.now() - startTime;
      
      // Print results
      console.log('\n' + '═'.repeat(60));
      console.log(`Agent: ${result.agentName}`);
      console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
      console.log(`Cost: ${result.cost === 0 ? 'FREE' : '$' + result.cost.toFixed(4)}`);
      console.log(`Tokens: ${result.usage.totalTokens} (in: ${result.usage.inputTokens}, out: ${result.usage.outputTokens})`);
      console.log('═'.repeat(60) + '\n');
      console.log(result.result);
      console.log('\n');
      
      // Print stats
      const stats = orchestrator.getStats();
      console.log(`📊 Session Stats: ${stats.tasksCompleted} tasks, $${stats.totalCost.toFixed(4)} total`);
      
    } catch (error) {
      console.error('\n❌ Task failed:', error.message);
      process.exit(1);
    }
  });

/**
 * List available agents
 */
program
  .command('agents')
  .description('List all configured agents')
  .action(() => {
    try {
      const orchestrator = new NexusOrchestrator();
      const config = orchestrator.config;
      
      console.log('🤖 Configured Agents\n');
      
      config.agents.forEach(agent => {
        const status = agent.enabled ? '✅' : '❌';
        const cost = agent.cost === 0 ? 'FREE' : `$${agent.costPerMillion.input}/M`;
        
        console.log(`${status} ${agent.name} (${agent.id})`);
        console.log(`   Model: ${agent.model}`);
        console.log(`   Cost: ${cost}`);
        console.log(`   Skills: ${agent.skills.join(', ')}`);
        console.log('');
      });
      
      console.log(`Default agent: ${config.routing.default}`);
      
    } catch (error) {
      console.error('❌ Failed to load agents:', error.message);
      process.exit(1);
    }
  });

/**
 * Show orchestrator stats
 */
program
  .command('stats')
  .description('Show usage statistics')
  .option('-d, --detailed', 'Show detailed per-agent breakdown')
  .action((options) => {
    try {
      const logPath = '~/.vutler/logs/agent-tasks.jsonl'.replace('~', os.homedir());
      
      if (!fs.existsSync(logPath)) {
        console.log('📊 No stats available yet (no tasks executed)');
        return;
      }
      
      const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
      const tasks = lines.map(line => JSON.parse(line));
      
      const totalTasks = tasks.length;
      const totalCost = tasks.reduce((sum, t) => sum + t.cost, 0);
      const totalDuration = tasks.reduce((sum, t) => sum + t.duration, 0);
      const avgCost = totalCost / totalTasks;
      const avgDuration = totalDuration / totalTasks;
      
      console.log('📊 Nexus Usage Statistics\n');
      console.log(`Total Tasks: ${totalTasks}`);
      console.log(`Total Cost: $${totalCost.toFixed(4)}`);
      console.log(`Average Cost: $${avgCost.toFixed(4)} per task`);
      console.log(`Average Duration: ${(avgDuration / 1000).toFixed(1)}s per task`);
      
      if (options.detailed) {
        console.log('\n📈 Per-Agent Breakdown:\n');
        
        const byAgent = {};
        tasks.forEach(task => {
          if (!byAgent[task.agentId]) {
            byAgent[task.agentId] = {
              name: task.agentName,
              count: 0,
              cost: 0,
              duration: 0
            };
          }
          byAgent[task.agentId].count++;
          byAgent[task.agentId].cost += task.cost;
          byAgent[task.agentId].duration += task.duration;
        });
        
        Object.entries(byAgent).forEach(([id, stats]) => {
          console.log(`${stats.name} (${id}):`);
          console.log(`  Tasks: ${stats.count}`);
          console.log(`  Cost: $${stats.cost.toFixed(4)} (avg: $${(stats.cost / stats.count).toFixed(4)})`);
          console.log(`  Duration: ${(stats.duration / 1000).toFixed(1)}s (avg: ${(stats.duration / stats.count / 1000).toFixed(1)}s)`);
          console.log('');
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to load stats:', error.message);
      process.exit(1);
    }
  });

/**
 * Test agent connectivity
 */
program
  .command('test')
  .description('Test agent connectivity and API access')
  .option('-a, --agent <id>', 'Test specific agent (default: all enabled)')
  .action(async (options) => {
    try {
      const orchestrator = new NexusOrchestrator();
      const config = orchestrator.config;
      
      const agentsToTest = options.agent 
        ? [config.agents.find(a => a.id === options.agent)]
        : config.agents.filter(a => a.enabled);
      
      console.log('🧪 Testing Agent Connectivity\n');
      
      for (const agent of agentsToTest) {
        if (!agent) {
          console.error(`❌ Agent ${options.agent} not found`);
          continue;
        }
        
        console.log(`Testing ${agent.name}...`);
        
        try {
          const result = await orchestrator.spawnAgent(
            agent.id, 
            'Reply with exactly: "OK"',
            { silent: true, timeout: 30000 }
          );
          
          if (result.result.includes('OK')) {
            console.log(`✅ ${agent.name} - Working (${(result.duration / 1000).toFixed(1)}s)`);
          } else {
            console.log(`⚠️  ${agent.name} - Response unexpected: ${result.result.substring(0, 50)}`);
          }
        } catch (error) {
          console.log(`❌ ${agent.name} - Failed: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  });

program.parse();
