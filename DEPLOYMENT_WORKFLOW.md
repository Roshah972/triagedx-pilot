# Deployment Workflow - Quick Reference

## 🚀 How to Push Updates to Deployment

### Simple 3-Step Process

```bash
# 1. Stage all changes
git add .

# 2. Commit with a descriptive message
git commit -m "Description of your changes"

# 3. Push to GitHub
git push origin main
```

**That's it!** Vercel automatically detects the push and deploys within 1-2 minutes.

---

## 📋 Step-by-Step Guide

### 1. Check What Changed

```bash
git status
```

Shows which files were modified, added, or deleted.

### 2. Stage Changes

**Option A: Stage everything**
```bash
git add .
```

**Option B: Stage specific files**
```bash
git add app/check-in/page.tsx
git add components/NewComponent.tsx
```

### 3. Commit Changes

```bash
git commit -m "Your descriptive commit message"
```

**Good commit messages:**
- `"Add guided demo tour system"`
- `"Fix TypeScript error in dashboard"`
- `"Update login page styling"`
- `"Add feedback form component"`

**Avoid:**
- `"fix"` or `"update"` (too vague)
- `"asdf"` or `"test"` (not helpful)

### 4. Push to GitHub

```bash
git push origin main
```

If you get authentication errors, you may need to use your GitHub token (see below).

---

## 🔄 What Happens After Push

1. **GitHub receives your code** (takes ~5 seconds)
2. **Vercel detects the push** (automatic webhook)
3. **Vercel starts building** (check dashboard)
4. **Build completes** (~1-2 minutes)
5. **Site updates** (new deployment goes live)

---

## 🔍 Check Deployment Status

### Option 1: Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your project
3. Check "Deployments" tab
4. See build status: Building → Ready (or Error)

### Option 2: GitHub
1. Go to your repository: `https://github.com/Roshah972/triagedx-pilot`
2. Check recent commits
3. See if Vercel status check passed

---

## 🐛 Troubleshooting

### Authentication Error

If `git push` fails with authentication:

**Option 1: Use Personal Access Token**
```bash
# When prompted for password, paste your token (not GitHub password)
git push origin main
```

**Option 2: Update Remote URL with Token**
```bash
git remote set-url origin https://Roshah972:YOUR_TOKEN@github.com/Roshah972/triagedx-pilot.git
git push origin main
# Then remove token from URL:
git remote set-url origin https://github.com/Roshah972/triagedx-pilot.git
```

### Build Fails on Vercel

1. Check build logs in Vercel dashboard
2. Look for error messages
3. Fix errors locally:
   ```bash
   npm run build
   ```
4. Commit and push again

### Changes Not Showing

1. **Hard refresh browser**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. **Check deployment**: Make sure latest deployment is "Ready"
3. **Check branch**: Ensure you pushed to `main` branch
4. **Wait**: Sometimes takes 1-2 minutes for changes to propagate

---

## 📝 Quick Commands Reference

```bash
# See what changed
git status

# See detailed changes
git diff

# Stage all changes
git add .

# Commit changes
git commit -m "Your message"

# Push to GitHub
git push origin main

# Check recent commits
git log --oneline -5

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard local changes (careful!)
git restore .
```

---

## 🎯 Best Practices

1. **Commit often** - Small, focused commits are better than huge ones
2. **Test locally first** - Run `npm run build` before pushing
3. **Write clear messages** - Future you will thank you
4. **Check Vercel after push** - Make sure deployment succeeded
5. **Use branches** (optional) - For major features, create a branch first

---

## 🚨 Emergency: Rollback Deployment

If something breaks:

1. Go to Vercel dashboard
2. Find the last working deployment
3. Click "..." menu → "Promote to Production"
4. Or revert the commit:
   ```bash
   git revert HEAD
   git push origin main
   ```

---

**Current Setup:**
- ✅ GitHub: `https://github.com/Roshah972/triagedx-pilot`
- ✅ Vercel: Auto-deploys on push to `main` branch
- ✅ Branch: `main`

**Your workflow:** Make changes → `git add .` → `git commit -m "message"` → `git push origin main` → Wait 1-2 min → Done!

