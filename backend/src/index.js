import dotenv from "dotenv";
dotenv.config(); // ✅ Load env variables FIRST

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import fileUpload from "express-fileupload";
import cors from "cors";
import fs from "fs";
import cron from "node-cron";
import { clerkMiddleware } from "@clerk/express";

import { connectDB } from "./lib/db.js";
import userRoutes from "./routes/user.route.js";
import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import songRoutes from "./routes/song.route.js";
import albumRoutes from "./routes/album.route.js";
import statRoutes from "./routes/stat.route.js";

// Path setup
const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

// Express App
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(clerkMiddleware());
app.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: path.join(__dirname, "tmp"),
        createParentPath: true,
        limits: { fileSize: 10 * 1024 * 1024 },
    })
);

// Cron job to clean up temp folder
const tempDir = path.join(process.cwd(), "tmp");
cron.schedule("0 * * * *", () => {
    if (fs.existsSync(tempDir)) {
        fs.readdir(tempDir, (err, files) => {
            if (err) return console.log("Temp cleanup error:", err);
            files.forEach(file => {
                fs.unlink(path.join(tempDir, file), () => {});
            });
        });
    }
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/stats", statRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));
    app.get("*", (req, res) =>
        res.sendFile(path.join(__dirname, "../frontend/dist/index.html"))
    );
}

// Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
        message: process.env.NODE_ENV === "production" ?
            "Internal server error" :
            err.message,
    });
});

// Start server
httpServer.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    connectDB(); // Connect MongoDB
});