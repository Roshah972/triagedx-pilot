#!/bin/bash

# Script to create GitHub repo and push TRIAGEDX pilot
# GitHub User: Roshah972

echo "🚀 TRIAGEDX Pilot - GitHub Setup"
echo "GitHub User: Roshah972"
echo ""

REPO_NAME="triagedx-pilot"
GITHUB_USER="Roshah972"
GITHUB_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}"

echo "📦 Repository will be created at:"
echo "   ${GITHUB_URL}"
echo ""

# Check if GitHub CLI is available
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI found. Creating repository..."
    
    # Check if authenticated
    if gh auth status &> /dev/null; then
        echo "Creating repository on GitHub..."
        gh repo create ${REPO_NAME} \
            --public \
            --description "TRIAGEDX - ER Triage Accelerator Pilot" \
            --source=. \
            --remote=origin \
            --push
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Success! Repository created and code pushed!"
            echo "   ${GITHUB_URL}"
            exit 0
        else
            echo "❌ Failed to create with GitHub CLI. Trying manual method..."
        fi
    else
        echo "⚠️  Not authenticated with GitHub CLI. Run: gh auth login"
        echo "   Falling back to manual method..."
    fi
fi

# Manual method - open GitHub and provide instructions
echo ""
echo "📝 Manual Setup Required:"
echo ""
echo "1. Open this URL in your browser:"
echo "   https://github.com/new?name=${REPO_NAME}&description=TRIAGEDX+-+ER+Triage+Accelerator+Pilot"
echo ""
echo "   Or go to: https://github.com/new"
echo "   - Repository name: ${REPO_NAME}"
echo "   - Description: TRIAGEDX - ER Triage Accelerator Pilot"
echo "   - Choose Public or Private"
echo "   - ⚠️  DO NOT initialize with README, .gitignore, or license"
echo ""
echo "2. After creating the repository, press Enter here to push your code..."
read -p "Press Enter after creating the repository on GitHub..."

echo ""
echo "🚀 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Your repository is now on GitHub:"
    echo "   ${GITHUB_URL}"
    echo ""
    echo "🎉 Ready to deploy on Vercel!"
    echo "   See DEPLOYMENT.md for next steps"
else
    echo ""
    echo "❌ Push failed. Common issues:"
    echo "   1. Repository doesn't exist yet - make sure you created it"
    echo "   2. Authentication - you may need to use a Personal Access Token"
    echo "   3. Check your GitHub credentials"
    echo ""
    echo "If you need to authenticate, you can:"
    echo "   - Use GitHub Desktop"
    echo "   - Set up SSH keys"
    echo "   - Use a Personal Access Token as password"
fi

