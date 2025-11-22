# Quick Deployment Guide

## 🚀 Deploy to Render (5 Minutes)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-github-repo-url
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `mapbox-mongo-app`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   - `MONGO_URI`: Your MongoDB connection string
   - `NODE_ENV`: `production`
6. Click **"Create Web Service"**
7. Wait 2-5 minutes for deployment
8. Copy your app URL (e.g., `https://your-app.onrender.com`)

### Step 3: Test Deployment

Visit: `https://your-app.onrender.com/health`

Should return: `{"status":"ok","database":"connected",...}`

## 📝 Embed in WordPress

### Quick Method (Copy & Paste)

1. In WordPress editor, add **"Custom HTML"** block
2. Paste this code (replace URL with your Render URL):

```html
<iframe 
    src="https://your-app.onrender.com" 
    width="100%" 
    height="800px" 
    frameborder="0"
    style="border: none; min-height: 800px;"
    allow="geolocation"
    title="Interactive Map">
</iframe>
```

3. Publish!

### Responsive Version

For better mobile support:

```html
<div style="position: relative; padding-bottom: 75%; height: 0; overflow: hidden;">
    <iframe 
        src="https://your-app.onrender.com" 
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
        allow="geolocation"
        title="Interactive Map">
    </iframe>
</div>
```

## ✅ Checklist

- [ ] Code pushed to GitHub
- [ ] Render account created
- [ ] Web service deployed on Render
- [ ] Environment variables set (MONGO_URI)
- [ ] Health check endpoint working
- [ ] App URL tested in browser
- [ ] WordPress iframe code added
- [ ] Map loads in WordPress

## 🔧 Troubleshooting

**App won't start:**
- Check Render logs
- Verify MONGO_URI is set correctly
- Ensure MongoDB allows connections from Render

**Map doesn't load in WordPress:**
- Test Render URL directly first
- Check browser console for errors
- Disable WordPress security plugins temporarily
- Verify iframe is not blocked

**Database connection fails:**
- Check MongoDB Atlas network access (allow 0.0.0.0/0)
- Verify connection string format
- Check Render logs for specific error

## 📞 Need Help?

1. Check Render dashboard logs
2. Test `/health` endpoint
3. Verify all environment variables
4. Check MongoDB connection from Render

