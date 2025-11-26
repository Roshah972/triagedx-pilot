#!/bin/bash

# Script to push TRIAGEDX pilot to GitHub
# This will prompt for your GitHub credentials

echo "🚀 Pushing TRIAGEDX Pilot to GitHub"
echo ""
echo "Repository: https://github.com/Roshah972/triagedx-pilot"
echo ""
echo "You'll be prompted for credentials:"
echo "  Username: Roshah972"
echo "  Password: Use your Personal Access Token (not your GitHub password)"
echo ""
echo "Don't have a token? Get one here: https://github.com/settings/tokens"
echo "  - Click 'Generate new token (classic)'"
echo "  - Name: TRIAGEDX Pilot"
echo "  - Check 'repo' scope"
echo "  - Generate and copy the token"
echo ""
read -p "Press Enter to continue with push..."

git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Your code is now on GitHub!"
    echo "   https://github.com/Roshah972/triagedx-pilot"
    echo ""
    echo "🎉 Next step: Deploy on Vercel"
    echo "   See DEPLOYMENT.md for instructions"
else
    echo ""
    echo "❌ Push failed. Try one of these:"
    echo ""
    echo "Option 1: Use Personal Access Token"
    echo "  1. Go to: https://github.com/settings/tokens"
    echo "  2. Generate new token (classic) with 'repo' scope"
    echo "  3. Run: git push -u origin main"
    echo "  4. Username: Roshah972"
    echo "  5. Password: Paste your token"
    echo ""
    echo "Option 2: Use GitHub Desktop"
    echo "  1. Download: https://desktop.github.com/"
    echo "  2. Sign in with GitHub"
    echo "  3. File → Add Local Repository"
    echo "  4. Select this folder"
    echo "  5. Click 'Publish repository'"
fi

