const mongoose = require("mongoose");

const FeatureSchema = new mongoose.Schema({
    type: {
        type: String,
        default: "Feature"
    },

    geometry: {
        type: {
            type: String,
            enum: ["Point", "LineString", "Polygon"],
            required: true
        },
        coordinates: {
            type: Array,
            required: true
        }
    },

    properties: {
        type: Object,
        default: {}
    },

    file: {
        type: String,
        default: "default",
        index: true // Index for faster filtering by file
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
FeatureSchema.index({ file: 1, _id: 1 }); // Compound index for pagination
FeatureSchema.index({ "geometry.type": 1 }); // Index for geometry type filtering
FeatureSchema.index({ createdAt: -1 }); // Index for sorting by creation date

module.exports = mongoose.model("Feature", FeatureSchema);
