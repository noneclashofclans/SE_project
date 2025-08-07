const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173', 
  'https://se-project-rishi.vercel.app' 
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
};

// Use the new, more secure CORS options
app.use(cors(corsOptions));
// --- END OF CORRECTION ---

app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
    res.send("Hello from the Auth Server!");
});

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.error("Error connecting to MongoDB:", err);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});