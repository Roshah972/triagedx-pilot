# GitHub Repository Setup

Your local git repository is ready! Follow these steps to create the GitHub repo and push your code.

## Option 1: Using the Script (Easiest)

Run the provided script:

```bash
./create-github-repo.sh
```

The script will guide you through:
1. Entering your GitHub username
2. Setting the repository name
3. Creating the repo on GitHub (you'll do this manually)
4. Pushing your code

## Option 2: Manual Setup

### Step 1: Create Repository on GitHub

1. Go to [https://github.com/new](https://github.com/new)
2. **Repository name:** `triagedx-pilot` (or your preferred name)
3. **Description:** `TRIAGEDX - ER Triage Accelerator Pilot`
4. **Visibility:** Choose Public or Private
5. **⚠️ IMPORTANT:** Do NOT check "Add a README file" (we already have one)
6. **⚠️ IMPORTANT:** Do NOT add .gitignore or license (we already have them)
7. Click **"Create repository"**

### Step 2: Connect and Push

After creating the repo, GitHub will show you commands. Use these:

```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/triagedx-pilot.git
git branch -M main
git push -u origin main
```

### Step 3: Verify

Visit your repository URL:
```
https://github.com/YOUR_USERNAME/triagedx-pilot
```

You should see all your files!

## Option 3: Using GitHub CLI (If Installed)

If you have GitHub CLI (`gh`) installed:

```bash
gh repo create triagedx-pilot --public --source=. --remote=origin --push
```

## Troubleshooting

### Authentication Issues

If you get authentication errors:

**For HTTPS:**
```bash
# Use GitHub Personal Access Token as password
# Or set up credential helper:
git config --global credential.helper osxkeychain  # macOS
```

**For SSH:**
```bash
# Use SSH URL instead:
git remote set-url origin git@github.com:YOUR_USERNAME/triagedx-pilot.git
```

### Remote Already Exists

If you see "remote origin already exists":

```bash
# Update the remote URL:
git remote set-url origin https://github.com/YOUR_USERNAME/triagedx-pilot.git
```

## Next Steps After GitHub Setup

Once your code is on GitHub:

1. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variable: `NEXT_PUBLIC_PILOT_PASSWORD`
   - Deploy!

2. **See `DEPLOYMENT.md`** for full deployment instructions

---

**Current Status:**
- ✅ Git initialized
- ✅ Initial commit created
- ✅ Branch set to `main`
- ⏳ Waiting for GitHub repo creation

