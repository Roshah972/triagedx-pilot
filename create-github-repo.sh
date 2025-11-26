#!/bin/bash

# Script to create GitHub repository and push TRIAGEDX pilot
# Run this script after creating the repo on GitHub

echo "🚀 TRIAGEDX Pilot - GitHub Setup"
echo ""

# Check if remote already exists
if git remote get-url origin &>/dev/null; then
    echo "⚠️  Remote 'origin' already exists:"
    git remote get-url origin
    echo ""
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 1
    fi
fi

# Get repository name
read -p "Enter your GitHub username: " GITHUB_USERNAME
read -p "Enter repository name (default: triagedx-pilot): " REPO_NAME
REPO_NAME=${REPO_NAME:-triagedx-pilot}

# Set remote URL
GITHUB_URL="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
echo ""
echo "📦 Setting remote to: ${GITHUB_URL}"
git remote add origin "${GITHUB_URL}" 2>/dev/null || git remote set-url origin "${GITHUB_URL}"

echo ""
echo "✅ Remote configured!"
echo ""
echo "📝 Next steps:"
echo "1. Go to https://github.com/new"
echo "2. Repository name: ${REPO_NAME}"
echo "3. Description: TRIAGEDX - ER Triage Accelerator Pilot"
echo "4. Choose Public or Private"
echo "5. DO NOT initialize with README (we already have one)"
echo "6. Click 'Create repository'"
echo ""
read -p "Press Enter after you've created the repository on GitHub..."

# Push to GitHub
echo ""
echo "🚀 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Your repository is now on GitHub:"
    echo "   https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
    echo ""
    echo "🎉 Ready to deploy on Vercel!"
else
    echo ""
    echo "❌ Push failed. Make sure:"
    echo "   1. The repository exists on GitHub"
    echo "   2. You have push access"
    echo "   3. You're authenticated (git credential helper)"
fi

