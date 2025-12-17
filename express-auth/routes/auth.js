const router = require("express").Router();
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// --- REGISTER ---
router.post("/register", async (req, res) => {
  console.log("Register endpoint hit with body:", req.body); // New log

  try {
    if (!req.body.email || !req.body.password) {
        return res.status(400).json({ message: "Email and password are required." });
    }
    if (req.body.password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    const userExists = await User.findOne({ email: req.body.email });
    if (userExists) {
      return res.status(409).json({ message: "Email already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    const newUser = new User({
      email: req.body.email,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();
    console.log("Successfully registered new user:", savedUser.email);
    res.status(201).json({ message: "User registered successfully." });

  } catch (error) {
    console.error("CRITICAL REGISTRATION ERROR:", error);
    res.status(500).json({ message: "An internal server error occurred." });
  }
});

// --- LOGIN ---
router.post("/login", async (req, res) => {
  console.log("Login endpoint hit with body:", req.body); 

  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'default_secret');
    
    console.log("Successfully logged in user:", user.email);
    res.header("auth-token", token).json({
      token,
      user: { email: user.email, id: user._id },
    });

  } catch (error) {
    console.error("CRITICAL LOGIN ERROR:", error);
    res.status(500).json({ message: "An internal server error occurred." });
  }
});

module.exports = router;