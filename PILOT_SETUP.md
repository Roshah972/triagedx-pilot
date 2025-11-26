# TRIAGEDX Pilot Setup - Quick Start

This guide will help you get the TRIAGEDX pilot deployed and ready for nurse usability testing.

## ✅ What's Been Set Up

1. **Password Gate** - Login page at `/login` protects all routes
2. **Auth Guard** - All pages require authentication (except login)
3. **Feedback Form** - Collects nurse feedback after completing flows
4. **Success Page** - Shows after check-in completion with feedback option
5. **Deployment Config** - Ready for Vercel deployment

## 🚀 Deploy in 3 Steps

### 1. Push to GitHub

```bash
# If you haven't initialized git yet:
git init
git add .
git commit -m "TRIAGEDX pilot with password gate"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/triagedx-pilot.git
git branch -M main
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. Click **"New Project"** → Import your `triagedx-pilot` repo
3. Vercel auto-detects Next.js - click **"Deploy"**
4. After deployment, go to **Settings → Environment Variables**
5. Add: `NEXT_PUBLIC_PILOT_PASSWORD` = `your-password-here`
6. Redeploy (or it will auto-redeploy on next push)

### 3. Test It

1. Visit your Vercel URL (e.g., `https://triagedx-pilot.vercel.app`)
2. You should be redirected to `/login`
3. Enter the password you set
4. You should now have access to all routes

## 🔐 Setting the Password

**Option 1: Environment Variable (Recommended)**
- Set `NEXT_PUBLIC_PILOT_PASSWORD` in Vercel dashboard
- Default fallback in code: `pilot2024` (change this!)

**Option 2: Edit Code**
- Edit `app/login/page.tsx`
- Change line: `const CORRECT_PASSWORD = process.env.NEXT_PUBLIC_PILOT_PASSWORD || 'pilot2024'`

## 📝 Environment Variables

Create a `.env.local` file for local development:

```bash
NEXT_PUBLIC_PILOT_PASSWORD=your-local-password
```

**Note:** `.env.local` is gitignored - don't commit passwords!

## 🧪 Testing Locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` - you'll be redirected to login.

## 📊 Feedback Collection

Feedback is automatically collected:
- Stored in browser `localStorage` (key: `triagedx_pilot_feedback`)
- Logged to browser console
- Shows after check-in completion

To view collected feedback:
1. Open browser DevTools (F12)
2. Go to **Application** tab → **Local Storage**
3. Look for `triagedx_pilot_feedback` key

## 🎯 Next Steps

1. **Test the flow yourself** - Make sure everything works
2. **Create pilot instructions** - Simple doc for nurses (see DEPLOYMENT.md)
3. **Share URL + password** - Via secure channel (not email!)
4. **Collect feedback** - Check localStorage or console logs

## 📚 More Details

See `DEPLOYMENT.md` for:
- Detailed deployment instructions
- Troubleshooting guide
- Security notes
- Post-pilot next steps

---

**Ready to deploy?** Follow the 3 steps above and you'll be live in ~5 minutes!

