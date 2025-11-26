require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const Feature = require("./models/Feature");

const app = express();

// CORS configuration for WordPress embedding
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
};
app.use(cors(corsOptions));

// Security headers for iframe embedding
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *;");
    next();
});

app.use(express.json());
app.use(express.static(__dirname));

// Serve user.html and icon.png directly
app.get("/user.html", (req, res) => {
    console.log("📄 Serving user.html");
    res.sendFile(path.join(__dirname, "user.html"));
});

app.get("/icon.png", (req, res) => {
    console.log("🖼️ Serving icon.png");
    res.sendFile(path.join(__dirname, "icon.png"));
});

app.get("/", (req, res) => {
    console.log("📄 Serving user.html from root route");
    res.sendFile(path.join(__dirname, "user.html"));
});

// MongoDB connection with optimized and increased timeout settings
const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI environment variable is not set");
        }
        
        await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 30000,  // Increased timeout
            socketTimeoutMS: 60000,            // Increased timeout
            connectTimeoutMS: 30000,           // Added connection timeout
        });
        
        console.log("✅ User connected to MongoDB");
        console.log("MongoDB ready state:", mongoose.connection.readyState);
        
        // Setup indexes for better performance
        await setupIndexes();
        
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        console.error("Make sure MONGO_URI is set in environment variables");
        if (process.env.NODE_ENV === 'development') {
            process.exit(1);
        }
    }
};

// Setup database indexes
const setupIndexes = async () => {
    try {
        await Feature.collection.createIndex({ _id: 1 });
        await Feature.collection.createIndex({ file: 1 });
        console.log('✅ Database indexes created/verified');
    } catch (err) {
        console.error('⚠️ Error creating indexes:', err.message);
    }
};

connectDB();

// Cache for count
let cachedCount = null;
let countCacheTime = 0;
const COUNT_CACHE_TTL = 30000;

// Get total count (with retry logic)
app.get("/api/features/count", async (req, res) => {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
        try {
            if(mongoose.connection.readyState !== 1) {
                return res.status(503).json({ error: "Database not connected" });
            }
            
            // Use cached count if available
            const now = Date.now();
            if(cachedCount !== null && (now - countCacheTime) < COUNT_CACHE_TTL) {
                console.log("📊 Using cached count:", cachedCount);
                return res.json({ count: cachedCount, cached: true });
            }
            
            const startTime = Date.now();
            let count;
            
            try {
                count = await Feature.estimatedDocumentCount().maxTimeMS(10000);
                console.log(`📊 Estimated count: ${count} (took ${Date.now() - startTime}ms)`);
            } catch (err) {
                console.log("⚠️ Estimated count failed, using exact count...");
                count = await Feature.countDocuments({}).maxTimeMS(10000);
                console.log(`📊 Exact count: ${count} (took ${Date.now() - startTime}ms)`);
            }
            
            cachedCount = count;
            countCacheTime = now;
            
            return res.json({ count, cached: false });
            
        } catch (err) {
            attempt++;
            console.error(`❌ Error counting features (attempt ${attempt}/${maxRetries}):`, err.message);
            
            if (attempt >= maxRetries) {
                return res.status(500).json({ 
                    error: "Failed to count features", 
                    message: err.message 
                });
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
});

// Batch API endpoint with retry logic and better error handling
app.get("/api/features/batch", async (req, res) => {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
        try {
            if(mongoose.connection.readyState !== 1) {
                return res.status(503).json({ error: "Database not connected" });
            }

            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 500; // Reduced default batch size
            const skip = page * limit;

            const startTime = Date.now();
            console.log(`📡 Fetching batch ${page + 1} (skip: ${skip}, limit: ${limit})... [Attempt ${attempt + 1}/${maxRetries}]`);
            
            // Optimized query with timeout
            const query = Feature.find({})
                .lean()
                .sort({ _id: 1 })
                .skip(skip)
                .limit(limit)
                .hint({ _id: 1 })
                .maxTimeMS(50000); // 50 second query timeout
            
            const features = await query;
            
            // Transform to GeoJSON format
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
            
            return res.json({ 
                features: geojsonFeatures,
                page,
                limit,
                hasMore,
                count: geojsonFeatures.length
            });
            
        } catch (err) {
            attempt++;
            console.error(`❌ Error fetching batch (attempt ${attempt}/${maxRetries}):`, err.message);
            
            if (attempt >= maxRetries) {
                return res.status(500).json({ 
                    error: "Failed to fetch batch after retries", 
                    message: err.message,
                    attempts: maxRetries
                });
            }
            
            // Exponential backoff
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`⏳ Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
});

// Legacy endpoint with streaming
app.get("/api/features", async (req, res) => {
    try {
        if(mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: "Database not connected" });
        }

        console.log("📡 Fetching all features (legacy endpoint)...");
        
        const cursor = Feature.find({})
            .lean()
            .cursor({ batchSize: 500 })
            .maxTimeMS(60000);
            
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

// Health check endpoint
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