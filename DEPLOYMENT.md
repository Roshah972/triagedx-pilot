# TRIAGEDX Pilot Deployment Guide

**Status:** Ready for fake-data usability pilot  
**Target:** Nurse usability testing with password-gated access

---

## 🎯 What This Pilot Is (And Isn't)

### ✅ This Pilot:
- **Goal:** Let nurses click through the flow and provide feedback
- **Data:** Fake/demo patients only - NO real patient data
- **Purpose:** Validate UX, identify confusing parts, measure time savings
- **Security:** Basic password gate (NOT HIPAA-compliant)

### ❌ This Pilot Is NOT:
- A production-ready clinical system
- HIPAA-compliant or ready for real patient data
- Connected to EPIC or any real EMR
- An official ESI calculator or clinical decision support tool

**Think of this as:** "Clickable demo that logs feedback" - not "live in the ER"

---

## 🚀 Quick Deploy to Vercel (Recommended)

### Step 1: Push Code to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial TRIAGEDX pilot with password gate"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/<your-username>/triagedx-pilot.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"New Project"** → **"Import Git Repository"**
3. Select your `triagedx-pilot` repository
4. Vercel will auto-detect Next.js settings:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
5. **Add Environment Variable:**
   - Key: `NEXT_PUBLIC_PILOT_PASSWORD`
   - Value: `your-shared-password-here` (e.g., `nurse-pilot-2024`)
6. Click **"Deploy"**

After deployment, you'll get a URL like: `https://triagedx-pilot.vercel.app`

**Every time you push to GitHub, Vercel will automatically redeploy.**

---

## 🔐 Password Gate Setup

### How It Works:
1. Users visit the URL → redirected to `/login`
2. Enter the shared password → stored in `localStorage`
3. Can access all routes (session lasts 24 hours)
4. If password is wrong → stay on login page

### Setting the Password:

**Option 1: Environment Variable (Recommended)**
- Set `NEXT_PUBLIC_PILOT_PASSWORD` in Vercel dashboard
- Default fallback: `pilot2024` (change this!)

**Option 2: Edit Code Directly**
- Edit `app/login/page.tsx`
- Change the `CORRECT_PASSWORD` constant

---

## 📋 Pre-Pilot Checklist

Before sending the URL to nurses:

- [ ] Password is set and shared securely (not in email!)
- [ ] Test the login flow yourself
- [ ] Verify all routes are protected (try accessing `/staff/dashboard` without logging in)
- [ ] Test on mobile device (nurses may use phones/tablets)
- [ ] Create a simple "Pilot Instructions" document (see below)

---

## 📝 Pilot Instructions Template

Send this to nurses along with the URL and password:

```
TRIAGEDX Pilot - Nurse Usability Test

URL: https://your-app.vercel.app
Password: [share via secure channel]

WHAT TO DO:
1. Open the URL on your phone/tablet/computer
2. Enter the password when prompted
3. Pretend a patient has come in with [specific scenario, e.g., "chest pain"]
4. Go through the check-in flow as if you were the patient
5. Then switch to the Nurse Dashboard and complete triage
6. Answer the 3 quick feedback questions at the end

TIME: Should take 5-10 minutes total

FEEDBACK:
- Did this feel faster than your current process? (1-5)
- What was the most annoying part?
- What would you change first?

This is a DEMO with fake data only. No real patient information is used.
```

---

## 📊 Collecting Feedback

### Automatic Collection:
- Feedback is stored in browser `localStorage` under key `triagedx_pilot_feedback`
- Also logged to browser console (check DevTools)
- Each submission includes:
  - Speed rating (1-5)
  - Most annoying part (text)
  - What to change first (text)
  - Additional comments (text)
  - Context (check-in, triage, etc.)
  - Timestamp
  - User agent

### Manual Collection:
1. Ask nurses to open browser DevTools (F12)
2. Go to Console tab
3. Look for `[PILOT FEEDBACK]` logs
4. Or check `localStorage` in Application tab

### Future Enhancement:
Create an API endpoint (`/api/pilot/feedback`) to send feedback to a database/analytics service.

---

## 🔄 Updating the Pilot

### To Make Changes:
1. Edit code locally
2. Test with `npm run dev`
3. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
4. Vercel automatically redeploys (usually takes 1-2 minutes)

### To Change Password:
1. Go to Vercel dashboard → Your Project → Settings → Environment Variables
2. Update `NEXT_PUBLIC_PILOT_PASSWORD`
3. Redeploy (or wait for next push)

---

## 🐛 Troubleshooting

### Login Not Working:
- Check that `NEXT_PUBLIC_PILOT_PASSWORD` is set in Vercel
- Clear browser `localStorage` and try again
- Check browser console for errors

### Routes Not Protected:
- Verify `AuthGuard` is in `app/layout.tsx`
- Check that login page exists at `app/login/page.tsx`

### Build Fails:
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18+ by default)

---

## 🚨 Important Security Notes

### Current Security Level: **DEMO ONLY**

This password gate is:
- ✅ Good enough for: Fake-data usability testing
- ❌ NOT good enough for: Real patient data, production use

### For Real Clinical Use (Future):
- Server-side authentication (NextAuth.js, Auth0, etc.)
- HIPAA-compliant hosting (AWS with BAA, Azure, etc.)
- Hospital IT security review
- Formal pilot agreement and oversight
- Encrypted data transmission (HTTPS - Vercel provides this)
- Audit logging
- Role-based access control

**Right now:** Focus on proving nurses want this tool. Security comes later.

---

## 📞 Support

For issues during pilot:
- Check Vercel deployment logs
- Review browser console errors
- Test locally with `npm run dev`

---

## ✅ Post-Pilot Next Steps

After collecting feedback:

1. **Analyze Results:**
   - Average speed rating
   - Common pain points
   - Most requested changes

2. **Iterate:**
   - Fix top 3 issues
   - Re-deploy
   - Run second pilot if needed

3. **Prepare for Real Pilot:**
   - Security review
   - HIPAA compliance planning
   - Hospital IT integration
   - Formal agreements

---

**Last Updated:** [Current Date]  
**Pilot Status:** Ready for deployment

