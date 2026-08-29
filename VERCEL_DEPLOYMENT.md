# Vercel Deployment Guide

This project is configured for deployment on Vercel. Follow these steps to deploy:

## Prerequisites

- [Vercel CLI](https://vercel.com/download) installed locally
- Vercel account
- Firebase project configured

## Deployment Steps

### 1. Link to Vercel (First Time)

```bash
vercel link
```

This will prompt you to create or select a Vercel project.

### 2. Set Environment Variables

Add these environment variables in Vercel Project Settings → Environment Variables:

**Required:**
- `VITE_FIREBASE_STORAGE_BUCKET` - Your Firebase storage bucket (e.g., `audio-68d1f.firebasestorage.app`)
- `VITE_ENABLE_UPLOAD_API_FALLBACK` - Set to `true` for CORS-protected environments

**Firebase Config** (if using server-side authentication):
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`

### 3. Deploy

```bash
vercel deploy --prod
```

Or simply push to your git repository if connected:
```bash
git push origin main
```

## Project Configuration

### vercel.json
- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **API Routes:** 
  - `/api/upload` - File upload (60s timeout, 1GB memory)
  - `/api/podcast-rss` - Podcast RSS generation
  - `/api/analytics` - Analytics endpoints

### Rewrites & Headers
- SPA routing: All requests → `/index.html`
- API routes: `/api/*` → Serverless functions
- Static assets: 1-year cache for versioned files

## Key Features

✅ **Firebase Integration**
- Firebase Authentication (sign-up modal)
- Firestore for user profiles & submissions
- Firebase Storage for audio files

✅ **API Fallback**
- Server-side upload via `/api/upload` when Firebase Storage is blocked (CORS)

✅ **Optimized Builds**
- TypeScript compilation
- Vite bundle optimization
- Tailwind CSS purging
- React 19 with concurrent rendering

## Troubleshooting

### CORS Issues
If Firebase Storage uploads fail, set `VITE_ENABLE_UPLOAD_API_FALLBACK=true` to use the server-side upload fallback.

### Build Failures
1. Check TypeScript errors: `npm run lint`
2. Clear cache: `rm -rf .next && npm run build`
3. Check Node version matches Vercel's (v20+)

### Environment Variables Not Loading
Ensure variables are set in Vercel dashboard and redeploy after adding/modifying them.

## Local Development

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5173` with HMR enabled.

## Production Features

- ✅ Server-side audio uploads via Vercel Functions
- ✅ Real-time Firebase data with IndexedDB caching
- ✅ User authentication with Firebase Auth
- ✅ Admin approval workflow for submissions
- ✅ Analytics tracking
- ✅ Podcast RSS generation

## Support

For deployment issues, check:
- [Vercel Docs](https://vercel.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)
- [Firebase Docs](https://firebase.google.com/docs)
