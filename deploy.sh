#!/bin/bash

# HACCP Traceability System - Deployment Script
# This script helps prepare and deploy the application to Render.com

echo "🚀 HACCP Traceability System - Deployment Script"
echo "================================================"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Error: Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if we have a remote repository
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ Error: No remote repository configured. Please add your GitHub repository:"
    echo "   git remote add origin <your-github-repo-url>"
    exit 1
fi

echo "✅ Git repository check passed"

# Check if all required files exist
echo "📋 Checking required files..."

required_files=(
    "render.yaml"
    "backend/render.yaml"
    "frontend/render.yaml"
    "backend/database/adapter.js"
    "backend/database/postgres.js"
    "frontend/src/config/api.js"
    "DEPLOYMENT.md"
)

missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo "❌ Missing required files:"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

echo "✅ All required files present"

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes. Please commit them first:"
    echo "   git add ."
    echo "   git commit -m 'Prepare for deployment'"
    exit 1
fi

echo "✅ No uncommitted changes"

# Push to GitHub
echo "📤 Pushing to GitHub..."
if git push origin main; then
    echo "✅ Successfully pushed to GitHub"
else
    echo "❌ Failed to push to GitHub"
    exit 1
fi

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Go to https://render.com"
echo "2. Click 'New +' → 'Blueprint'"
echo "3. Connect your GitHub repository"
echo "4. Select this repository"
echo "5. Click 'Apply' to deploy"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT.md"
echo ""
echo "🔗 Your application will be available at:"
echo "   Frontend: https://haccp-trace-frontend.onrender.com"
echo "   Backend:  https://haccp-trace-backend.onrender.com"
echo ""
echo "💡 URLs are automatically configured using Render's service reference feature"
echo "   - No hardcoded URLs needed"
echo "   - Services automatically communicate with correct endpoints" 