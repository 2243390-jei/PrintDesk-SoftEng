// ========================
// 📄 server.js — PrintDesk Backend API
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
// Upload folder
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
// Schema
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
  pickupDateTime: String,
  documents: [documentSchema],
  totalTokens: Number,
  status: { type: String, default: "Pending" }, // Added status field with default
  createdAt: { type: Date, default: Date.now },
});

const PrintRequest = mongoose.model("print_requests", printRequestSchema);

// ------------------------
// Multer setup
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
  res.send("✅ PrintDesk API running (tokens read from frontend)")
);

// GET all print requests (sorted by createdAt for queue order)
app.get("/requests", async (req, res) => {
  try {
    const requests = await PrintRequest.find().sort({ createdAt: 1 }); // Sort by creation date (oldest first)
    console.log(`✅ Fetched ${requests.length} print requests`);
    res.json(requests);
  } catch (err) {
    console.error("❌ Error fetching requests:", err);
    res.status(500).json({ error: "Failed to fetch requests", details: err.message });
  }
});

// GET single print request by ID
app.get("/requests/:id", async (req, res) => {
  try {
    const request = await PrintRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    res.json(request);
  } catch (err) {
    console.error("❌ Error fetching request:", err);
    res.status(500).json({ error: "Failed to fetch request", details: err.message });
  }
});

// PATCH update print request status
app.patch("/requests/:id", async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ["Pending", "Accepted", "Rejected", "Completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const updatedRequest = await PrintRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!updatedRequest) {
      return res.status(404).json({ error: "Request not found" });
    }
    
    console.log(`✅ Updated request ${req.params.id} status to: ${status}`);
    res.json(updatedRequest);
  } catch (err) {
    console.error("❌ Error updating request:", err);
    res.status(500).json({ error: "Failed to update request", details: err.message });
  }
});

// POST submit new print request
app.post("/submit", upload.array("documents", 20), async (req, res) => {
  try {
    console.log("📩 Received form data:", req.body);
    console.log("📁 Received files:", req.files?.length || 0);

    // Parse JSON data from frontend
    const printJobs = JSON.parse(req.body.printJobs || "[]");

    const documents = [];
    let totalTokensRequest = 0;

    printJobs.forEach((job, i) => {
      const file = req.files[i];
      const copies = parseInt(job.copies) || 1;
      const pageCount = parseInt(job.pageCount) || 1;
      const totalTokens = parseInt(job.totalTokens) || 0; // ✅ taken directly from frontend
      const tokensPerPage = parseInt(job.tokensPerPage) || 0;
      const isImagePrint = job.isImagePrint === true || job.isImagePrint === "true";

      totalTokensRequest += totalTokens;

      documents.push({
        documentTitle: file ? file.originalname : "Untitled",
        filePath: file ? "/uploads/" + file.filename : null,
        numberOfCopies: copies,
        paperSize: job.paperSize || "",
        printingSide: job.paperSide || "",
        printType: job.paperType || "",
        notes: job.notes || "",
        pageCount,
        tokensPerPage,
        totalTokens,
        isImagePrint,
      });
    });

    // Create main print request
    const newRequest = new PrintRequest({
      fullName: req.body.full_name,
      courseYear: req.body.course_year,
      email: req.body.email,
      pickupDateTime: req.body.pickup_datetime,
      documents,
      totalTokens: totalTokensRequest,
      status: "Pending", // Default status for new requests
    });

    await newRequest.save();

    console.log("✅ Request saved:", newRequest._id);
    res.status(201).json({
      message: "Print request submitted successfully",
      requestId: newRequest._id,
      totalTokens: totalTokensRequest,
    });
  } catch (err) {
    console.error("❌ Error saving request:", err);
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

// ------------------------
// Start server
// ------------------------
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);