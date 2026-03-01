#!/bin/bash

# Nexus Prototype Installation Script

set -e

echo "🚀 Installing Nexus Prototype..."
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
  echo "❌ Node.js >= 16 required (current: $(node -v))"
  exit 1
fi

echo "✅ Node.js version OK ($(node -v))"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Make CLI executable
chmod +x bin/nexus-cli.js

# Link globally (optional)
read -p "Install 'nexus' command globally? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  npm link
  echo "✅ 'nexus' command installed globally"
else
  echo "ℹ️  Skipped global install. Use: node bin/nexus-cli.js"
fi

# Check for OpenRouter API key
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo ""
  echo "⚠️  OPENROUTER_API_KEY not set"
  echo "   Get your key at: https://openrouter.ai/keys"
  echo "   Then run: export OPENROUTER_API_KEY='sk-or-v1-...'"
  echo ""
else
  echo "✅ OPENROUTER_API_KEY found"
fi

# Check config file
CONFIG_PATH="$HOME/.vutler/agents.json"
if [ ! -f "$CONFIG_PATH" ]; then
  echo "ℹ️  Agent config not found at $CONFIG_PATH"
  echo "   Default config already created during setup"
else
  echo "✅ Agent config found at $CONFIG_PATH"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Quick start:"
echo "  nexus agents                    # List available agents"
echo "  nexus task 'What is 2+2?'       # Execute a task"
echo "  nexus test                      # Test connectivity"
echo ""
echo "For more info: cat README.md"
