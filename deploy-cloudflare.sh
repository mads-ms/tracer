#!/bin/bash

echo "🚀 Deploying HACCP Traceability System to Cloudflare"
echo "=================================================="

# Check if Wrangler CLI is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare. Please run: wrangler login"
    exit 1
fi

echo "✅ Wrangler CLI ready"

# Deploy Backend to Cloudflare Workers
echo ""
echo "🔧 Deploying Backend to Cloudflare Workers..."
echo "   Production URL: https://api.sabor.farm"
echo "   Development URL: https://haccp-trace-backend-dev.m-d65.workers.dev"
cd backend
npm run build
npm run deploy:prod
cd ..

# Deploy Frontend to Cloudflare Pages
echo ""
echo "🌐 Deploying Frontend to Cloudflare Pages..."
echo "   Production URL: https://sabor.farm"
echo "   Development URL: https://haccp-trace-frontend-dev.pages.dev"
cd frontend
npm run build
npx wrangler pages deploy build --project-name haccp-trace-frontend --branch main
cd ..

echo ""
echo "🎉 Deployment Complete!"
echo "=================================================="
echo "🌐 Frontend: https://sabor.farm"
echo "🔧 Backend API: https://api.sabor.farm"
echo "📊 D1 Database: Connected via Workers"
echo ""
echo "💡 Next steps:"
echo "   1. Test your application at https://sabor.farm"
echo "   2. Verify API endpoints at https://api.sabor.farm/health"
echo "   3. Check Cloudflare dashboard for monitoring"
