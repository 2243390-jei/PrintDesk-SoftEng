const mongoose = require('mongoose')

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
  { _id: false },
)

const printRequestSchema = new mongoose.Schema({
  fullName: String,
  courseYear: String,
  email: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  semester: {
    type: String,
    enum: ['1st Semester', '2nd Semester', 'Short Term'],
  },
  academicYear: String,

  pickupDateTime: String,
  documents: [documentSchema],
  totalTokens: Number,
  status: { type: String, enum: ['Pending', 'Accepted', 'Completed', 'Rejected', 'Cancelled'], default: 'Pending' },
  acceptedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('print_requests', printRequestSchema)
