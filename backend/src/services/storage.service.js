const supabase = require('../config/supabase');
const config = require('../config/env');
const path = require('path');
const crypto = require('crypto');

class StorageService {
  /**
   * Upload file buffer to Supabase Storage
   * @param {Buffer} buffer 
   * @param {string} originalName 
   * @param {string} mimeType 
   * @param {string} folder e.g. 'proof-of-delivery', 'signatures', etc.
   * @returns {Promise<string>} Public or reachable URL of uploaded file
   */
  async uploadFile(buffer, originalName, mimeType, folder = 'general') {
    const ext = path.extname(originalName) || '.png';
    const uniqueId = crypto.randomUUID();
    const filePath = `${folder}/${uniqueId}${ext}`;
    const bucketName = config.supabase.bucket || 'uploads';

    if (supabase) {
      try {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, buffer, {
            contentType: mimeType,
            upsert: true
          });

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

          if (publicUrlData && publicUrlData.publicUrl) {
            return publicUrlData.publicUrl;
          }
        } else if (error) {
          console.warn('Supabase upload returned error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase upload exception:', err.message);
      }
    }

    // Graceful fallback for offline / mock testing: Base64 data URI or predictable mock link
    const base64 = buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }
}

module.exports = new StorageService();
