// express-auth/server.js (Final, Simplified Version)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");

dotenv.config();

const app = express();

// --- ✅ FINAL, SIMPLIFIED CORS CONFIGURATION ---
// This tells the server to allow requests from ANY origin.
// It's the most reliable way to fix deployment CORS issues.
app.use(cors());
// --- END OF CORRECTION ---

app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
    res.send("Hello from the Auth Server!");
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});