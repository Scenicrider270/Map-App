require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const Feature = require("./models/Feature");

const app = express();

// CORS configuration for WordPress embedding
const corsOptions = {
    origin: '*', // Allow all origins for WordPress embedding (you can restrict this later)
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
};
app.use(cors(corsOptions));

// Security headers for iframe embedding
app.use((req, res, next) => {
    // Allow embedding in iframes (for WordPress)
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *;");
    next();
});

app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// Serve user.html and icon.png directly (explicit routes)
app.get("/user.html", (req, res) => {
    console.log("📄 Serving user.html");
    res.sendFile(path.join(__dirname, "user.html"));
});

app.get("/icon.png", (req, res) => {
    console.log("🖼️ Serving icon.png");
    res.sendFile(path.join(__dirname, "icon.png"));
});

// Root route also serves user.html
app.get("/", (req, res) => {
    console.log("📄 Serving user.html from root route");
    res.sendFile(path.join(__dirname, "user.html"));
});

// MongoDB connection with optimized settings
const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI environment variable is not set");
        }
        
        await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log("✅ User connected to MongoDB");
        console.log("MongoDB ready state:", mongoose.connection.readyState);
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        console.error("Make sure MONGO_URI is set in environment variables");
        // Don't exit in production, let the app continue (it will handle errors gracefully)
        if (process.env.NODE_ENV === 'development') {
            process.exit(1);
        }
    }
};

connectDB();

// Cache for count to avoid repeated expensive queries
let cachedCount = null;
let countCacheTime = 0;
const COUNT_CACHE_TTL = 30000; // 30 seconds cache

// Get total count for progress tracking (optimized)
app.get("/api/features/count", async (req, res) => {
    try {
        if(mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: "Database not connected" });
        }
        
        // Use cached count if available and fresh
        const now = Date.now();
        if(cachedCount !== null && (now - countCacheTime) < COUNT_CACHE_TTL) {
            console.log("📊 Using cached count:", cachedCount);
            return res.json({ count: cachedCount, cached: true });
        }
        
        // Use estimatedDocumentCount for much faster count (approximate but fast)
        // Falls back to countDocuments if collection is small
        const startTime = Date.now();
        let count;
        
        try {
            // Try estimated count first (much faster for large collections)
            count = await Feature.estimatedDocumentCount();
            console.log(`📊 Estimated count: ${count} (took ${Date.now() - startTime}ms)`);
        } catch (err) {
            // Fallback to exact count if estimated fails
            console.log("⚠️ Estimated count failed, using exact count...");
            count = await Feature.countDocuments({});
            console.log(`📊 Exact count: ${count} (took ${Date.now() - startTime}ms)`);
        }
        
        // Cache the result
        cachedCount = count;
        countCacheTime = now;
        
        res.json({ count, cached: false });
    } catch (err) {
        console.error("❌ Error counting features:", err);
        res.status(500).json({ error: "Failed to count features", message: err.message });
    }
});

// Batch API endpoint - returns features in chunks (optimized)
app.get("/api/features/batch", async (req, res) => {
    try {
        if(mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: "Database not connected" });
        }

        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 1000; // 1000 features per batch
        const skip = page * limit;

        const startTime = Date.now();
        console.log(`📡 Fetching batch ${page + 1} (skip: ${skip}, limit: ${limit})...`);
        
        // Optimized query with hint to use _id index for faster sorting
        const query = Feature.find({})
            .lean()
            .sort({ _id: 1 }) // Sort by _id (indexed) for consistent pagination
            .skip(skip)
            .limit(limit)
            .hint({ _id: 1 }); // Force use of _id index
        
        const features = await query;
        
        // Transform to GeoJSON format (optimized with single map)
        const geojsonFeatures = features.map(f => ({
            type: "Feature",
            geometry: f.geometry || { type: "Point", coordinates: [0, 0] },
            properties: f.properties || {},
            file: f.file || "default",
            _id: f._id
        }));
        
        const hasMore = features.length === limit;
        const queryTime = Date.now() - startTime;
        console.log(`✅ Batch ${page + 1}: ${geojsonFeatures.length} features (hasMore: ${hasMore}) - ${queryTime}ms`);
        
        res.json({ 
            features: geojsonFeatures,
            page,
            limit,
            hasMore,
            count: geojsonFeatures.length
        });
    } catch (err) {
        console.error("❌ Error fetching batch:", err);
        res.status(500).json({ 
            error: "Failed to fetch batch", 
            message: err.message
        });
    }
});

// Legacy endpoint - kept for backward compatibility but uses streaming
app.get("/api/features", async (req, res) => {
    try {
        if(mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: "Database not connected" });
        }

        console.log("📡 Fetching all features (legacy endpoint)...");
        
        // Use streaming cursor for large datasets
        const cursor = Feature.find({}).lean().cursor({ batchSize: 1000 });
        const features = [];
        
        for await (const doc of cursor) {
            features.push({
                type: "Feature",
                geometry: doc.geometry || { type: "Point", coordinates: [0, 0] },
                properties: doc.properties || {},
                file: doc.file || "default",
                _id: doc._id
            });
        }
        
        console.log(`✅ Found ${features.length} features in database`);
        res.json({ type: "FeatureCollection", features });
    } catch (err) {
        console.error("❌ Error fetching features:", err);
        res.status(500).json({ 
            error: "Failed to fetch features", 
            message: err.message
        });
    }
});

// Health check endpoint for Render
app.get("/health", (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    res.json({ 
        status: "ok", 
        database: dbStatus,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(500).json({ 
        error: "Internal server error",
        message: process.env.NODE_ENV === 'development' ? err.message : "Something went wrong"
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Access at: http://localhost:${PORT}`);
});
