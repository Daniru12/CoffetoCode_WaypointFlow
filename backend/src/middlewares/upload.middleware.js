const multer = require('multer');

// Memory storage keeps files in memory as Buffer for Supabase upload
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow common images and documents
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'text/plain'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only images and PDFs are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter
});

module.exports = upload;
