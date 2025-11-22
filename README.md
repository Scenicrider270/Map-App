# Interactive Map Application

A professional interactive map application built with Mapbox, MongoDB, and Express.js.

## Features

- 🗺️ Interactive map with clustering
- 📍 Multiple layer support (Landmarks & Tracks)
- 🎨 Professional UI with modern design
- ⚡ Optimized batch loading for fast performance
- 📱 Responsive design
- 🔄 Real-time data updates

## Prerequisites

- Node.js 18+ 
- MongoDB database (local or cloud)
- Mapbox access token

## Environment Variables

Create a `.env` file in the root directory:

```
MONGO_URI=your_mongodb_connection_string
PORT=4000
NODE_ENV=production
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env` file

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:4000
```

## Deployment on Render

### Step 1: Prepare Your Repository

1. Make sure all files are committed to Git
2. Push to GitHub, GitLab, or Bitbucket

### Step 2: Deploy on Render

1. **Sign up/Login to Render**: Go to [render.com](https://render.com)

2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your repository
   - Select the repository containing this app

3. **Configure Service**:
   - **Name**: `mapbox-mongo-app` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Choose Free or Starter plan

4. **Set Environment Variables**:
   - Click on "Environment" tab
   - Add the following:
     - `MONGO_URI`: Your MongoDB connection string
     - `NODE_ENV`: `production`
     - `PORT`: (Leave empty, Render auto-assigns)

5. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically build and deploy your app
   - Wait for deployment to complete (usually 2-5 minutes)

6. **Get Your App URL**:
   - Once deployed, you'll get a URL like: `https://your-app-name.onrender.com`
   - Test it by visiting: `https://your-app-name.onrender.com/health`

### Step 3: Using render.yaml (Alternative Method)

If you prefer using the `render.yaml` file:

1. Make sure `render.yaml` is in your repository root
2. In Render dashboard, select "New +" → "Blueprint"
3. Connect your repository
4. Render will automatically detect and use `render.yaml`

## Embedding in WordPress

### Method 1: Using iframe (Recommended)

1. **Get your Render URL**: `https://your-app-name.onrender.com`

2. **Add to WordPress**:
   - Go to your WordPress post/page editor
   - Add a "Custom HTML" block
   - Paste this code:

```html
<iframe 
    src="https://your-app-name.onrender.com" 
    width="100%" 
    height="800px" 
    frameborder="0"
    style="border: none; min-height: 800px;"
    allow="geolocation"
    title="Interactive Map">
</iframe>
```

3. **Adjust height** as needed (800px is recommended minimum)

### Method 2: Using WordPress Shortcode

1. Add this to your theme's `functions.php`:

```php
function embed_map_shortcode($atts) {
    $url = 'https://your-app-name.onrender.com';
    $height = isset($atts['height']) ? $atts['height'] : '800px';
    
    return '<iframe 
        src="' . esc_url($url) . '" 
        width="100%" 
        height="' . esc_attr($height) . '" 
        frameborder="0"
        style="border: none; min-height: ' . esc_attr($height) . ';"
        allow="geolocation"
        title="Interactive Map">
    </iframe>';
}
add_shortcode('map', 'embed_map_shortcode');
```

2. Use in your posts/pages:
```
[map height="800px"]
```

### Method 3: Responsive Embed Plugin

1. Install a plugin like "Advanced iFrame" or "EmbedPress"
2. Use the plugin's interface to embed your Render URL
3. Configure responsive settings

## Troubleshooting

### MongoDB Connection Issues

- Verify your `MONGO_URI` is correct in Render environment variables
- Check MongoDB Atlas network access (if using Atlas)
- Ensure MongoDB allows connections from Render's IPs (0.0.0.0/0 for Atlas)

### App Not Loading in WordPress

- Check browser console for errors
- Verify CORS settings (already configured for all origins)
- Ensure iframe is not blocked by WordPress security plugins
- Test the Render URL directly first

### Performance Issues

- The app uses batch loading for optimal performance
- First load may take a few seconds (normal)
- Subsequent loads are cached and faster

## API Endpoints

- `GET /` - Main application
- `GET /health` - Health check endpoint
- `GET /api/features/count` - Get total feature count
- `GET /api/features/batch?page=0&limit=1000` - Get features in batches
- `GET /api/features` - Get all features (legacy)

## Support

For issues or questions:
1. Check Render logs in the dashboard
2. Verify environment variables are set correctly
3. Test the `/health` endpoint to verify database connection

## License

ISC

