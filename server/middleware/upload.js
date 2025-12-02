const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Format date as YYYY-MM-DD-HH-mm-ss
function getFormattedTimestamp() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}-${hour}-${min}-${sec}`;
}

// Clean the filename
function formatFileName(originalName) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);

  const cleanBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // replace spaces & symbols with "-"
    .replace(/^-+|-+$/g, '');      // trim "-"

  return `${cleanBase}-${getFormattedTimestamp()}${ext.toLowerCase()}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const formatted = formatFileName(file.originalname);
    cb(null, formatted);
  },
});

const upload = multer({ storage });

module.exports = { upload, uploadDir };
