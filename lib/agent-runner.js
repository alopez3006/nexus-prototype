/**
 * Agent Runner - Executed in child process
 * 
 * Loads agent config from environment and executes task via OpenRouter API.
 */

const OpenAI = require('openai');

async function runAgent() {
  const agentId = process.env.AGENT_ID;
  const agentName = process.env.AGENT_NAME;
  const model = process.env.AGENT_MODEL;
  const provider = process.env.AGENT_PROVIDER;
  const task = JSON.parse(process.env.TASK);
  const context = JSON.parse(process.env.CONTEXT || '{}');

  console.log(`[${agentName}] Starting task...`);
  console.log(`[${agentName}] Model: ${model}`);

  // Validate API key
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('[ERROR] OPENROUTER_API_KEY not set');
    process.exit(1);
  }

  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1'
  });

  try {
    const systemPrompt = getSystemPrompt(agentId, context);
    
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: task
        }
      ],
      temperature: 0.7,
      max_tokens: context.maxTokens || 4096
    });

    const result = response.choices[0].message.content;
    const usage = {
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens
    };

    console.log(`[${agentName}] Task completed`);
    console.log(`[${agentName}] Tokens: ${usage.totalTokens} (in: ${usage.inputTokens}, out: ${usage.outputTokens})`);

    // Send result via IPC
    process.send({
      type: 'result',
      result,
      usage
    });

    process.exit(0);
  } catch (error) {
    console.error(`[${agentName}] Error: ${error.message}`);
    
    if (error.response) {
      console.error(`[${agentName}] API Response:`, error.response.data);
    }
    
    process.exit(1);
  }
}

/**
 * Get system prompt for agent
 */
function getSystemPrompt(agentId, context) {
  const basePrompts = {
    gemini: `You are a helpful AI assistant. Answer questions clearly and concisely.
Focus on being accurate, helpful, and direct. Avoid unnecessary verbosity.`,

    mike: `You are Mike, a senior software engineer and code expert.

**Your specialties:**
- Debugging complex issues
- Writing clean, efficient code
- System architecture and design
- Git workflows and version control
- API design and implementation
- Database optimization

**Your approach:**
- Be direct and practical
- Provide working code examples
- Explain technical concepts clearly
- Suggest best practices
- Point out potential issues

When fixing bugs:
1. Identify root cause
2. Provide the fix
3. Explain why it works
4. Suggest prevention strategies`,

    philip: `You are Philip, a UI/UX designer with deep frontend expertise.

**Your specialties:**
- User interface design
- User experience optimization
- Wireframing and prototyping
- Frontend development (React, CSS, etc.)
- Design systems and component libraries
- Accessibility and responsive design

**Your approach:**
- Think user-first
- Balance aesthetics with functionality
- Provide visual descriptions
- Suggest design patterns
- Consider mobile and accessibility

When designing:
1. Understand user needs
2. Sketch the solution
3. Explain design decisions
4. Provide implementation guidance`
  };

  let prompt = basePrompts[agentId] || basePrompts.gemini;

  // Add context if provided
  if (context.additionalContext) {
    prompt += `\n\n**Additional Context:**\n${context.additionalContext}`;
  }

  return prompt;
}

// Run agent
runAgent().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
