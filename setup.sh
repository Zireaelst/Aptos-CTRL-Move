#!/bin/bash

# Aptos Predict - Quick Setup Script
# This script helps you get the project running quickly

echo "🚀 Setting up Aptos Predict..."

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if Aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo "❌ Aptos CLI not found. Please install it first:"
    echo "   brew install aptos"
    echo "   or download from: https://github.com/aptos-labs/aptos-core/releases"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install it first:"
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Setup contracts
echo "📦 Setting up smart contracts..."
cd contracts

# Initialize Aptos if not already done
if [ ! -f ".aptos/config.yaml" ]; then
    echo "🔧 Initializing Aptos CLI..."
    aptos init --assume-yes --network devnet
fi

# Compile contracts
echo "🔨 Compiling contracts..."
aptos move compile

# Run tests
echo "🧪 Running contract tests..."
aptos move test

echo "✅ Smart contracts are ready!"
echo ""
echo "📝 To deploy contracts:"
echo "   cd contracts"
echo "   aptos move publish --assume-yes"
echo ""
echo "⚠️  Remember to update PREDICTION_MARKET_ADDRESS in frontend/src/lib/aptos.ts with the deployed address"

# Setup frontend
echo "🌐 Setting up frontend..."
cd ../frontend

# Install dependencies
echo "📦 Installing frontend dependencies..."
npm install

echo "✅ Frontend is ready!"
echo ""
echo "🚀 To start the development server:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "🎉 Setup complete! Visit http://localhost:3000 after starting the dev server"
