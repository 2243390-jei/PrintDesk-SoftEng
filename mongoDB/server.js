// ========================
// 📄 server.js — Unified backend for Users + Print Requests
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
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

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
  res.send("✅ PrintDesk API running with user authentication + tokens + status")
);

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

    // 🔹 Find user
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // 🔹 Check if user has enough tokens
    if (user.tokenBalance < totalTokensRequest) {
      return res.status(400).json({
        error: "Insufficient tokens",
        currentBalance: user.tokenBalance,
        required: totalTokensRequest,
      });
    }

    // 🔹 Create new print request
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

    // 🔹 Deduct tokens from user's balance
    user.tokenBalance -= totalTokensRequest;
    await user.save();

    // ✅ Respond with success
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
    console.log(`✅ Deleted request: ${req.params.id}`);
    res.json({ message: "Request deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting request:", err);
    res.status(500).json({ error: "Failed to delete request", details: err.message });
  }
});

// ------------------------
// Error handling middleware
// ------------------------
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});


// --- Start Server ---
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));