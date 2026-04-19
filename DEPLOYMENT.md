# Hosting on Render.com - Deployment Guide

This guide will help you deploy the Manifesto Analyzer to Render.com for free and access it from any device.

## Prerequisites

1. **Render.com account** - Sign up at [render.com](https://render.com)
2. **GitHub account** - Push your code to GitHub (Render deploys from GitHub)
3. **Git installed locally** - For pushing code

## Step 1: Prepare Your Repository

### 1.1 Create a `.gitignore` file (if not exists)
```
venv/
node_modules/
.env
__pycache__/
*.pyc
*.pyo
.DS_Store
dist/
build/
*.egg-info/
.vite/
```

### 1.2 Create `.env` file in backend directory
Copy from `.env.example` and update:
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=yoursecurepassword123
FRONTEND_URL=https://manifesto-frontend.onrender.com
```

### 1.3 Add `engines` to frontend/package.json
```json
{
  "engines": {
    "node": "18.x"
  }
}
```

### 1.4 Update frontend Vite config
Ensure your `vite.config.js` can serve from production:
```js
export default {
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 5173
  }
}
```

## Step 2: Push to GitHub

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## Step 3: Deploy on Render.com

### Option A: Using Dashboard (Recommended for first time)

1. **Create Backend Service:**
   - Log in to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Select your GitHub repository
   - **Configuration:**
     - Name: `manifesto-backend`
     - Runtime: `Python 3`
     - Build Command: `pip install -r backend/requirements.txt`
     - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
     - Plan: `Free`
   - **Environment Variables:**
     ```
     ADMIN_USERNAME=admin
     ADMIN_PASSWORD=yoursecurepassword123
     FRONTEND_URL=https://manifesto-frontend.onrender.com
     GROQ_API_KEY=your_key_if_needed
     ```
   - Click "Create Web Service"

2. **Wait for backend to deploy** (takes ~5-10 minutes)
   - Note the backend URL (e.g., `https://manifesto-backend.onrender.com`)

3. **Create Frontend Service:**
   - Click "New +" → "Web Service"
   - Select your GitHub repository
   - **Configuration:**
     - Name: `manifesto-frontend`
     - Runtime: `Node`
     - Build Command: `cd frontend && npm install && npm run build`
     - Start Command: `cd frontend && npm run preview -- --host 0.0.0.0 --port $PORT`
     - Plan: `Free`
   - **Environment Variables:**
     ```
     VITE_API_URL=https://manifesto-backend.onrender.com/api
     ```
   - Click "Create Web Service"

4. **Wait for frontend to deploy** (takes ~5-10 minutes)

### Option B: Using render.yaml (Requires Blueprint plan - paid)

If you want automated deployments, you can use the included `render.yaml`, but this requires a Blueprint instance.

## Step 4: Access Your App

Once both services are deployed:
- Frontend: `https://manifesto-frontend.onrender.com`
- Backend API: `https://manifesto-backend.onrender.com/api`

## Step 5: Configure for Production

### Update CORS Origins
In `backend/main.py`, the CORS middleware automatically reads `FRONTEND_URL` from environment variables.

### Update API Endpoint
The frontend automatically uses `VITE_API_URL` from environment variables. If not set, it defaults to `/api`.

## Important Notes

### Free Tier Limitations
- **Spin down:** Services spin down after 15 minutes of inactivity
- **First request:** Takes 30-60 seconds after spin-down
- **Memory:** 512 MB
- **Bandwidth:** Limited
- **Sleep time:** Services sleep after 15 min inactivity

### Authentication
- Default credentials (can be changed in .env):
  - Username: `admin`
  - Password: `manifesto123`
- Change these in production!

### PDF Processing
- Large PDF files may timeout on free tier
- Keep manifesto PDFs under 5MB when possible
- Consider pre-processing locally and uploading results

## Troubleshooting

### Backend won't start
- Check build logs in Render dashboard
- Ensure `requirements.txt` has all dependencies
- Verify Python version compatibility

### Frontend shows blank page
- Check browser console for errors
- Verify `VITE_API_URL` is correct
- Clear browser cache

### "CORS error" when accessing API
- Ensure `FRONTEND_URL` environment variable is set correctly
- Check backend logs for CORS errors

### Pipeline times out
- Free tier has 30-minute timeout limit
- Large pipelines may exceed this
- Consider uploading pre-processed data

## Upgrading from Free Tier

When you're ready for production:
1. Upgrade to paid plans for more resources
2. Add custom domain
3. Enable SSL/TLS
4. Set up automatic deployments

## Support

For Render support: https://render.com/docs
For issues with this app: Check backend/main.py and frontend/src logs
