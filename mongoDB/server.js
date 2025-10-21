const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
const PrintRequest = mongoose.model('Print_Request', printRequestSchema);

// Multer storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
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

app.post('/submit', upload.single('file'), async (req, res) => {
  try {
    console.log('Received form data:', req.body);
    console.log('Received file:', req.file);

    const newRequest = new PrintRequest({
      fullName: req.body.fullName,
      courseYear: req.body.courseYear,
      email: req.body.email,
      documentTitle: req.body.documentTitle,
      numberOfCopies: req.body.numberOfCopies,
      printingSide: req.body.printingSide,
      paperSize: req.body.paperSize,
      printType: req.body.printType,
      pickupDateTime: req.body.pickupDateTime,
      notes: req.body.notes,
      filePath: req.file ? '/uploads' + req.file.filename : null
    });

    await newRequest.save();
    res.status(201).json({ message: 'Form submitted successfully' });
  } catch (err) {
    console.error('Error saving form:', err);
    res.status(500).json({ error: 'Failed to save form data' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});