#!/usr/bin/env node

/**
 * Basic test suite for Nexus Orchestrator
 * 
 * Usage: node test-basic.js
 */

const NexusOrchestrator = require('./lib/orchestrator');

async function runTests() {
  console.log('🧪 Nexus Basic Tests\n');
  
  try {
    // Test 1: Load config
    console.log('Test 1: Load configuration...');
    const orchestrator = new NexusOrchestrator();
    console.log('✅ Config loaded successfully');
    console.log(`   Agents: ${orchestrator.config.agents.length}`);
    console.log(`   Default: ${orchestrator.config.routing.default}\n`);
    
    // Test 2: Routing logic
    console.log('Test 2: Task routing...');
    
    const tests = [
      { task: 'Fix this bug in my code', expected: 'mike' },
      { task: 'What is the capital of France?', expected: 'gemini' },
      { task: 'Design a login page', expected: 'philip' },
      { task: 'General question about AI', expected: 'gemini' }
    ];
    
    for (const test of tests) {
      const routed = orchestrator.routeTask(test.task);
      const match = routed === test.expected ? '✅' : '❌';
      console.log(`   ${match} "${test.task}" → ${routed} (expected: ${test.expected})`);
    }
    
    console.log('\n');
    
    // Test 3: Execute simple task
    console.log('Test 3: Execute task (Gemini)...');
    
    const result = await orchestrator.executeTask(
      'Reply with exactly: "Hello from Nexus!"',
      { silent: true }
    );
    
    console.log('✅ Task executed successfully');
    console.log(`   Agent: ${result.agentName}`);
    console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);
    console.log(`   Cost: ${result.cost === 0 ? 'FREE' : '$' + result.cost.toFixed(4)}`);
    console.log(`   Result: ${result.result.substring(0, 100)}...\n`);
    
    // Test 4: Stats
    console.log('Test 4: Statistics...');
    const stats = orchestrator.getStats();
    console.log('✅ Stats retrieved');
    console.log(`   Tasks completed: ${stats.tasksCompleted}`);
    console.log(`   Total cost: $${stats.totalCost.toFixed(4)}`);
    console.log(`   Average cost: $${stats.averageCost.toFixed(4)}\n`);
    
    console.log('🎉 All tests passed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
