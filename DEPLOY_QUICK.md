# Quick Deploy to Render.com

## 5-Minute Setup

### 1. Push to GitHub

```bash
cd manifesto_app
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/manifesto_app.git
git push -u origin main
```

### 2. Set Up Backend on Render

1. Go to [render.com/dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Fill in:
   - **Name:** `manifesto-backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** `Free`
5. Add Environment Variables:
   ```
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=yourpassword123
   FRONTEND_URL=https://manifesto-frontend.onrender.com
   ```
6. Click **Create Web Service** and wait ~10 minutes

### 3. Set Up Frontend on Render

1. Click **New +** → **Web Service**
2. Select the same repository
3. Fill in:
   - **Name:** `manifesto-frontend`
   - **Runtime:** `Node`
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Start Command:** `cd frontend && npm run preview -- --host 0.0.0.0 --port $PORT`
   - **Plan:** `Free`
4. Add Environment Variables:
   ```
   VITE_API_URL=https://manifesto-backend.onrender.com/api
   ```
5. Click **Create Web Service** and wait ~10 minutes

### 4. Access Your App

- Frontend: `https://manifesto-frontend.onrender.com`
- Login with: `admin` / `yourpassword123`

## What You Get

✅ Free hosting for both frontend and backend  
✅ HTTPS secured  
✅ Accessible from any device  
✅ Authentication for pipeline execution  
✅ Auto-deploys when you push to GitHub

## Upgrade from Free (Optional)

- **Paid plans:** $7+/month for persistent services
- **Custom domains:** Add your own domain
- **More resources:** Faster processing, no spin-down

## Troubleshooting

**Services won't start?**

- Check build logs in Render dashboard
- Ensure `.env` file exists locally
- Verify all dependencies in requirements.txt

**Can't authenticate?**

- Use credentials from your .env file
- Default: admin / manifesto123

**API connection error?**

- Check `VITE_API_URL` is correct
- Wait 60 seconds after deployment
- Check backend is running

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide.
