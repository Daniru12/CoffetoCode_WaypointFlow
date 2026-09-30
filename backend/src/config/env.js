const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Search for .env.local first, then .env across working directories
const candidateDirs = [
  process.cwd(),
  path.resolve(__dirname, '../../'),
  path.resolve(__dirname, '../../../')
];

let loaded = false;
for (const dir of candidateDirs) {
  const envLocal = path.join(dir, '.env.local');
  if (fs.existsSync(envLocal)) {
    dotenv.config({ path: envLocal });
    loaded = true;
    break;
  }
}

if (!loaded) {
  for (const dir of candidateDirs) {
    const envFile = path.join(dir, '.env');
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile });
      loaded = true;
      break;
    }
  }
}

if (!loaded) {
  dotenv.config();
}

// Fail-fast guard for mandatory security secrets in non-test mode
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  console.error('FATAL CONFIG ERROR: JWT_SECRET environment variable is missing.');
  console.error('Define JWT_SECRET in .env.local or .env. Refusing to run with insecure fallback.');
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
  clientUrl: process.env.CLIENT_URL,
  dataPath: process.env.DATA_PATH,
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    bucket: process.env.SUPABASE_BUCKET || 'uploads',
  }
};
