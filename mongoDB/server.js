const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // ✅ Added for folder check

const app = express();

// ✅ Define upload directory outside this folder
const uploadDir = path.join(__dirname, '..', 'uploads');

// ✅ Create the folder automatically if it doesn’t exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Created uploads folder at:', uploadDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir)); // ✅ Serve from external uploads folder

// MongoDB connection
mongoose.connect("mongodb+srv://root:root123360@software-engineering.vw1nyls.mongodb.net/Software-Engineering?retryWrites=true&w=majority&appName=Software-Engineering")
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schema
const printRequestSchema = new mongoose.Schema({
  fullName: String,
  courseYear: String,
  email: String,
  documentTitle: String,
  numberOfCopies: Number,
  printingSide: String,
  paperSize: String,
  printType: String,
  pickupDateTime: String,
  notes: String,
  filePath: String
});

// Model
const PrintRequest = mongoose.model('print_requests', printRequestSchema);

// Multer storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // ✅ store files outside /mongoDB
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Routes
app.get('/', (req, res) => {
  res.send('Server is running');
});

// ✅ Match HTML field names to schema fields
app.post('/submit', upload.single('document'), async (req, res) => {
  try {
    console.log('📩 Received form data:', req.body);
    console.log('📁 Received file:', req.file);

    const newRequest = new PrintRequest({
      fullName: req.body.full_name,            // from HTML
      courseYear: req.body.course_year,        // from HTML
      email: req.body.email,
      documentTitle: req.file ? req.file.originalname : 'Untitled',
      numberOfCopies: req.body.copies,
      printingSide: req.body.paper_side,
      paperSize: req.body.paper_size,
      printType: req.body.paper_type,
      pickupDateTime: req.body.pickup_datetime,
      notes: req.body.notes,
      filePath: req.file ? '/uploads/' + req.file.filename : null
    });

    await newRequest.save();
    console.log('✅ Data saved to MongoDB:', newRequest);
    res.status(201).json({ message: 'Form submitted successfully' });

  } catch (err) {
    console.error('❌ Error saving form:', err);
    res.status(500).json({ error: 'Failed to save form data' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
