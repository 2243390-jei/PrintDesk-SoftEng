// ========================
// 📄 server.js — stores tokens & request status
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
  status: { type: String, default: "Pending" }, 
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
  res.send("✅ PrintDesk API running (tokens + status supported)")
);

app.post("/submit", upload.array("documents", 20), async (req, res) => {
  try {
    console.log("📩 Received form data:", req.body);
    console.log("📁 Received files:", req.files?.length || 0);

    const printJobs = JSON.parse(req.body.printJobs || "[]");

    const documents = [];
    let totalTokensRequest = 0;

    printJobs.forEach((job, i) => {
      const file = req.files[i];
      const copies = parseInt(job.copies) || 1;
      const pageCount = parseInt(job.pageCount) || 1;
      const totalTokens = parseInt(job.totalTokens) || 0;
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

    // ✅ Include status (defaults to "Pending")
    const newRequest = new PrintRequest({
      fullName: req.body.full_name,
      courseYear: req.body.course_year,
      email: req.body.email,
      pickupDateTime: req.body.pickup_datetime,
      documents,
      totalTokens: totalTokensRequest,
      status: "Pending", // default explicitly
    });

    await newRequest.save();

    console.log("✅ Request saved:", newRequest._id);
    res.status(201).json({
      message: "Print request submitted successfully",
      requestId: newRequest._id,
      totalTokens: totalTokensRequest,
      status: newRequest.status, // return status in response
    });
  } catch (err) {
    console.error("❌ Error saving request:", err);
    res
      .status(500)
      .json({ error: "Failed to submit print request", details: err.message });
  }
});

// ------------------------
// Start server
// ------------------------
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
