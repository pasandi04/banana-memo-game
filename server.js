/**
 * ============================================
 * BANANA MEMORY GAME - BACKEND SERVER
 * ============================================
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());                    // Allow frontend to call this API
app.use(express.json());            // Parse JSON request bodies
app.use(express.static("public"));  // Serve static files from public folder

// ============================================
// JWT SECRET (used to sign and verify tokens)
// ============================================
const JWT_SECRET = "0123456789";

// ============================================
// MONGODB CONNECTION
// ============================================
mongoose.connect("mongodb+srv://pasandiayodya04_db_user:vJ98bweMo6P4D8cK@banana.y0kxiud.mongodb.net/?appName=banana")
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ============================================
// USER SCHEMA
// ============================================
// Stores: username, email (hashed password), createdAt
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
    // Note: We store the HASHED password, never plain text!
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model("User", userSchema);

// ============================================
// SCORE SCHEMA
// ============================================
// Links scores to users. Stores: userId, score, levelReached, createdAt
const scoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  levelReached: {
    type: Number,
    required: true,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Score = mongoose.model("Score", scoreSchema);

// ============================================
// JWT AUTHENTICATION MIDDLEWARE
// ============================================
// This function runs BEFORE protected routes (like /save-score)
// It checks if the request has a valid JWT in the Authorization header
// If valid: attaches user info to req.user and calls next()
// If invalid: returns 401 Unauthorized
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  // Format: "Bearer <token>"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided. Please log in." });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify the token using our secret. If valid, we get the payload (userId, etc.)
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;  // { userId: "...", username: "..." }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
  }
}

// ============================================
// BANANA API PROXY ROUTE
// ============================================
// Frontend MUST NOT call Banana API directly. It calls THIS route instead.
// I fetch from Banana API and return the data to the frontend.
// This keeps API keys/URLs on the server and follows proper architecture.
app.get("/puzzle", async (req, res) => {
  try {
    const bananaApiUrl = "http://marcconrad.com/uob/banana/api.php?out=json";

    // Add timeout (10 seconds) - Banana API can be slow or unreachable
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(bananaApiUrl, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    clearTimeout(timeoutId);

    const data = await response.json();

    // Banana API returns: { question: "IMAGE_URL", solution: "ANSWER" }
    if (!data.question || data.solution === undefined) {
      return res.status(500).json({ error: "Invalid data from Banana API" });
    }

    res.json({
      question: data.question,  // Image URL to display
      solution: data.solution   // Correct answer (we'll compare on frontend)
    });
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Banana API timeout");
      return res.status(504).json({ error: "Banana API timed out. Please try again." });
    }
    console.error("Banana API proxy error:", error);
    res.status(500).json({
      error: "Could not load puzzle. Check that the server is running and the Banana API is reachable."
    });
  }
});

// ============================================
// POST /signup - REGISTER NEW USER
// ============================================
// 1. Receive username, email, password from body
// 2. Hash password with bcrypt (never store plain passwords!)
// 3. Save user to MongoDB
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: existingUser.email === email
          ? "Email already registered"
          : "Username already taken"
      });
    }

    // PASSWORD HASHING: bcrypt creates a secure one-way hash
    // We can never get the original password back, but we can compare later with bcrypt.compare
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    // Generate JWT so user is logged in immediately after signup
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Signup successful!",
      token,
      user: { id: user._id, username: user.username }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// ============================================
// POST /login - AUTHENTICATE USER
// ============================================
// 1. Find user by email
// 2. Compare submitted password with stored hash using bcrypt.compare
// 3. If match: generate JWT and return it
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // PASSWORD COMPARISON: bcrypt.compare checks if plain password matches hash
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT (JSON Web Token) - the "key" that proves user is logged in
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful!",
      token,
      user: { id: user._id, username: user.username }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ============================================
// POST /save-score - SAVE USER SCORE (PROTECTED)
// ============================================
// Requires valid JWT. Only logged-in users can save scores.
// authMiddleware runs first - if token invalid, we never get here.
app.post("/save-score", authMiddleware, async (req, res) => {
  try {
    const { score, levelReached } = req.body;
    const userId = req.user.userId;  // From JWT (set by authMiddleware)

    if (typeof score !== "number" || typeof levelReached !== "number") {
      return res.status(400).json({ error: "Score and levelReached must be numbers" });
    }

    const scoreEntry = new Score({
      userId,
      score,
      levelReached
    });

    await scoreEntry.save();

    res.status(201).json({
      message: "Score saved successfully!",
      score: { score, levelReached }
    });
  } catch (error) {
    console.error("Save score error:", error);
    res.status(500).json({ error: "Failed to save score" });
  }
});

// ============================================
// GET /leaderboard - TOP 5 HIGHEST SCORES
// ============================================
// Fetches top 5 scores, sorted by score descending
// Populates username from User model for display
app.get("/leaderboard", async (req, res) => {
  try {
    const topScores = await Score.find()
      .sort({ score: -1 })   // Descending order
      .limit(5)
      .populate("userId", "username");  // Get username from User

    // Format for frontend: { username, score, levelReached }
    const leaderboard = topScores.map((s) => ({
      username: s.userId?.username || "Unknown",
      score: s.score,
      levelReached: s.levelReached
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🍌 Banana Memory Game server running at http://localhost:${PORT}`);
});
