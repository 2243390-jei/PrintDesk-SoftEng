// ========================
// server.js — Unified backend for Users + Print Requests
// ========================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------
// Upload folder setup
// ------------------------
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));

// ------------------------
// MongoDB Connection
// ------------------------
mongoose
  .connect(
    "mongodb+srv://root:root123360@software-engineering.vw1nyls.mongodb.net/Software-Engineering?retryWrites=true&w=majority"
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ------------------------
// User Schema
// ------------------------
const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, select: false }, // only for manual logins
  role: { type: String, enum: ["student", "admin"], default: "student" },
  authProvider: { type: String, enum: ["manual", "google"], required: true },
  googleId: { type: String },
  picture: String,
  tokenBalance: { type: Number, default: 500 },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
});

const User = mongoose.model("users", userSchema);

// ------------------------
// Print Request Schema
// ------------------------
const documentSchema = new mongoose.Schema(
  {
    documentTitle: String,
    filePath: String,
    numberOfCopies: Number,
    paperSize: String,
    printingSide: String,
    printType: String,
    notes: String,
    pageCount: Number,
    tokensPerPage: Number,
    totalTokens: Number,
    isImagePrint: Boolean,
  },
  { _id: false }
);

const printRequestSchema = new mongoose.Schema({
  fullName: String,
  courseYear: String,
  email: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  pickupDateTime: String,
  documents: [documentSchema],
  totalTokens: Number,
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now },
});

const PrintRequest = mongoose.model("print_requests", printRequestSchema);

// ------------------------
// Token Reset Schema
// ------------------------
const tokenResetSchema = new mongoose.Schema({
  resetDate: { type: Date, required: true },
  scheduledBy: String,
  executed: { type: Boolean, default: false },
  executedAt: Date,
  cancelled: { type: Boolean, default: false },
  cancelledAt: Date,
  createdAt: { type: Date, default: Date.now },
});

const TokenReset = mongoose.model("token_resets", tokenResetSchema);

// ------------------------
// Multer (file upload)
// ------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ------------------------
// Routes
// ------------------------
app.get("/", (req, res) =>
  res.send("PrintDesk API running with user authentication + tokens + status")
);

// --- GET all print requests ---
app.get("/requests", async (req, res) => {
  try {
    console.log("GET /requests - Fetching all print requests");
    const requests = await PrintRequest.find().sort({ createdAt: 1 });
    console.log(`Found ${requests.length} print requests`);
    res.json(requests);
  } catch (err) {
    console.error("Error fetching print requests:", err);
    res.status(500).json({ error: "Failed to fetch print requests", details: err.message });
  }
});

// --- GET single print request by ID ---
app.get("/requests/:id", async (req, res) => {
  try {
    const request = await PrintRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Print request not found" });
    }
    res.json(request);
  } catch (err) {
    console.error("Error fetching print request:", err);
    res.status(500).json({ error: "Failed to fetch print request", details: err.message });
  }
});

// --- UPDATE print request status ---
app.patch("/requests/:id", async (req, res) => {
  try {
    console.log(`PATCH /requests/${req.params.id}`, req.body);
    
    const { status } = req.body;
    const validStatuses = ["Pending", "Accepted", "Completed", "Rejected"];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: "Invalid status", 
        validStatuses 
      });
    }
    
    const updatedRequest = await PrintRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!updatedRequest) {
      return res.status(404).json({ error: "Print request not found" });
    }
    
    console.log(`Updated request ${req.params.id} to status: ${status}`);
    res.json(updatedRequest);
  } catch (err) {
    console.error("Error updating print request:", err);
    res.status(500).json({ error: "Failed to update print request", details: err.message });
  }
});

// --- GET all users ---
app.get("/users", async (req, res) => {
  try {
    console.log("GET /users - Fetching all users");
    const users = await User.find().sort({ createdAt: -1 });
    console.log(`Found ${users.length} users`);
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users", details: err.message });
  }
});

// --- CREATE new user ---
app.post("/users", async (req, res) => {
  try {
    console.log("POST /users - Creating new user", req.body);
    
    const { email, fullName, role, password } = req.body; // Added password

    // Validation
    if (!email || !fullName || !role || !password) { // Added password validation
      return res.status(400).json({ 
        error: "Missing required fields", 
        required: ["email", "fullName", "role", "password"] 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        error: "User already exists",
        existingEmail: email 
      });
    }

    // Validate role
    const validRoles = ["student", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: "Invalid role", 
        validRoles 
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long"
      });
    }

    // Create new user with password
    const newUser = new User({
      email,
      fullName,
      password, // Store the password
      role,
      authProvider: "manual",
      tokenBalance: 500, // Default token balance
      createdAt: new Date(),
      lastLogin: new Date()
    });

    const savedUser = await newUser.save();
    console.log(`User created successfully: ${savedUser.email}`);

    // Return user without sensitive data
    const userResponse = {
      _id: savedUser._id,
      fullName: savedUser.fullName,
      email: savedUser.email,
      role: savedUser.role,
      tokenBalance: savedUser.tokenBalance,
      authProvider: savedUser.authProvider,
      createdAt: savedUser.createdAt,
      lastLogin: savedUser.lastLogin
    };

    res.status(201).json(userResponse);

  } catch (err) {
    console.error("Error creating user:", err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        error: "Validation error", 
        details: err.message 
      });
    }
    
    if (err.code === 11000) {
      return res.status(409).json({ 
        error: "Email already exists" 
      });
    }
    
    res.status(500).json({ 
      error: "Failed to create user", 
      details: err.message 
    });
  }
});

// --- UPDATE user ---
app.patch("/users/:id", async (req, res) => {
  try {
    console.log(`PATCH /users/${req.params.id}`, req.body);
    
    const { fullName, courseYear, role } = req.body;
    const updates = {};
    
    if (fullName) updates.fullName = fullName;
    if (courseYear) updates.courseYear = courseYear;
    if (role) updates.role = role;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log(`Updated user ${req.params.id}`);
    res.json(updatedUser);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Failed to update user", details: err.message });
  }
});

// --- DELETE user ---
app.delete("/users/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log(`Deleted user: ${req.params.id}`);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Failed to delete user", details: err.message });
  }
});

// --- SCHEDULE TOKEN RESET ---
app.post("/reset-tokens", async (req, res) => {
  try {
    const { resetDate } = req.body;
    
    if (!resetDate) {
      return res.status(400).json({ error: "Reset date is required" });
    }
    
    // Check if there's already a scheduled reset that's not executed or cancelled
    const existingReset = await TokenReset.findOne({
      executed: false,
      cancelled: false,
      resetDate: { $gte: new Date() }
    });
    
    if (existingReset) {
      return res.status(400).json({ 
        error: "A token reset is already scheduled",
        existingReset: {
          _id: existingReset._id,
          resetDate: existingReset.resetDate
        }
      });
    }
    
    // Create new token reset schedule
    const tokenReset = new TokenReset({
      resetDate: new Date(resetDate),
      scheduledBy: "admin", // You can get this from auth later
    });
    
    await tokenReset.save();
    
    console.log(`Token reset scheduled for: ${resetDate}`);
    res.json({ 
      message: "Token reset scheduled successfully", 
      resetId: tokenReset._id,
      resetDate: tokenReset.resetDate 
    });
    
  } catch (err) {
    console.error("Error scheduling token reset:", err);
    res.status(500).json({ error: "Failed to schedule token reset", details: err.message });
  }
});

// --- CANCEL TOKEN RESET ---
app.post("/cancel-reset", async (req, res) => {
  try {
    // Find the active scheduled reset (not executed, not cancelled, future date)
    const scheduledReset = await TokenReset.findOne({
      executed: false,
      cancelled: false,
      resetDate: { $gte: new Date() }
    });
    
    if (!scheduledReset) {
      return res.status(404).json({ error: "No active token reset scheduled" });
    }
    
    // Mark as cancelled
    scheduledReset.cancelled = true;
    scheduledReset.cancelledAt = new Date();
    await scheduledReset.save();
    
    console.log(`Token reset cancelled: ${scheduledReset._id}`);
    res.json({ 
      message: "Token reset cancelled successfully",
      cancelledReset: {
        _id: scheduledReset._id,
        resetDate: scheduledReset.resetDate
      }
    });
    
  } catch (err) {
    console.error("Error cancelling token reset:", err);
    res.status(500).json({ error: "Failed to cancel token reset", details: err.message });
  }
});

// --- GET SCHEDULED RESET ---
app.get("/reset-tokens/scheduled", async (req, res) => {
  try {
    // Find the active scheduled reset (not executed, not cancelled, future date)
    const scheduledReset = await TokenReset.findOne({
      executed: false,
      cancelled: false,
      resetDate: { $gte: new Date() }
    }).sort({ resetDate: 1 }); // Get the earliest scheduled reset
    
    if (!scheduledReset) {
      return res.status(404).json({ error: "No token reset scheduled" });
    }
    
    res.json({
      _id: scheduledReset._id,
      resetDate: scheduledReset.resetDate,
      scheduledBy: scheduledReset.scheduledBy,
      createdAt: scheduledReset.createdAt
    });
    
  } catch (err) {
    console.error("Error getting scheduled reset:", err);
    res.status(500).json({ error: "Failed to get scheduled reset", details: err.message });
  }
});

// --- EXECUTE TOKEN RESET (for cron job) ---
app.post("/execute-token-reset", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find scheduled resets for today that haven't been executed or cancelled
    const scheduledResets = await TokenReset.find({
      resetDate: { $lte: today },
      executed: false,
      cancelled: false
    });
    
    if (scheduledResets.length === 0) {
      return res.json({ message: "No token resets scheduled for today" });
    }
    
    // Reset all users' tokens to 500
    const result = await User.updateMany(
      {},
      { $set: { tokenBalance: 500 } }
    );
    
    // Mark resets as executed
    await TokenReset.updateMany(
      { _id: { $in: scheduledResets.map(r => r._id) } },
      { 
        executed: true,
        executedAt: new Date()
      }
    );
    
    console.log(`Token reset executed: ${result.modifiedCount} users updated`);
    res.json({ 
      message: "Token reset executed successfully", 
      usersUpdated: result.modifiedCount 
    });
    
  } catch (err) {
    console.error("Error executing token reset:", err);
    res.status(500).json({ error: "Failed to execute token reset", details: err.message });
  }
});

// --- Manual Login ---
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, authProvider: "manual" }).select("+password");

    if (!user || user.password !== password)
      return res.status(401).json({ error: "Invalid email or password" });

    user.lastLogin = new Date();
    await user.save();

    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      tokenBalance: user.tokenBalance,
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// --- Google Login ---
app.post("/google-login", async (req, res) => {
  try {
    const { email, fullName, googleId, picture } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        fullName,
        googleId,
        picture,
        authProvider: "google",
        role: email.startsWith("admin@") ? "admin" : "student",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      picture: user.picture,
      tokenBalance: user.tokenBalance,
    });
  } catch (err) {
    res.status(500).json({ error: "Google login failed", details: err.message });
  }
});

app.get("/users/:email", async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user data", details: err.message });
  }
});

// --- Submit Print Request ---
app.post("/submit", upload.array("documents", 20), async (req, res) => {
  try {
    const printJobs = JSON.parse(req.body.printJobs || "[]");
    const documents = [];
    let totalTokensRequest = 0;

    printJobs.forEach((job, i) => {
      const file = req.files[i];
      const totalTokens = parseInt(job.totalTokens) || 0;
      const tokensPerPage = parseInt(job.tokensPerPage) || 0;
      const isImagePrint = job.isImagePrint === true || job.isImagePrint === "true";
      totalTokensRequest += totalTokens;

      documents.push({
        documentTitle: file ? file.originalname : "Untitled",
        filePath: file ? "/uploads/" + file.filename : null,
        numberOfCopies: job.copies || 1,
        paperSize: job.paperSize || "",
        printingSide: job.paperSide || "",
        printType: job.paperType || "",
        notes: job.notes || "",
        pageCount: job.pageCount || 1,
        tokensPerPage,
        totalTokens,
        isImagePrint,
      });
    });

    // Find user
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if user has enough tokens
    if (user.tokenBalance < totalTokensRequest) {
      return res.status(400).json({
        error: "Insufficient tokens",
        currentBalance: user.tokenBalance,
        required: totalTokensRequest,
      });
    }

    // Create new print request
    const newRequest = new PrintRequest({
      fullName: req.body.full_name,
      courseYear: req.body.course_year,
      email: req.body.email,
      userId: user._id,
      pickupDateTime: req.body.pickup_datetime,
      documents,
      totalTokens: totalTokensRequest,
      status: "Pending",
    });

    await newRequest.save();

    // Deduct tokens from user's balance
    user.tokenBalance -= totalTokensRequest;
    await user.save();

    // Respond with success
    res.status(201).json({
      message: "Print request submitted successfully",
      requestId: newRequest._id,
      totalTokens: totalTokensRequest,
      remainingTokens: user.tokenBalance,
      status: newRequest.status,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to submit print request", details: err.message });
  }
});

// DELETE a print request
app.delete("/requests/:id", async (req, res) => {
  try {
    const deletedRequest = await PrintRequest.findByIdAndDelete(req.params.id);
    if (!deletedRequest) {
      return res.status(404).json({ error: "Request not found" });
    }
    console.log(`Deleted request: ${req.params.id}`);
    res.json({ message: "Request deleted successfully" });
  } catch (err) {
    console.error("Error deleting request:", err);
    res.status(500).json({ error: "Failed to delete request", details: err.message });
  }
});

// ------------------------
// Error handling middleware
// ------------------------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// --- Start Server ---
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));