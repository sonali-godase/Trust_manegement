const AudioTrack = require('../models/AudioTrack');
const cloudinary = require('../config/cloudinary');
const youtubedl = require('youtube-dl-exec');
const { generateVTTFromUrl } = require('../utils/transcribe');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Helper to upload a local file to Cloudinary
const uploadToCloudinary = async (filePath, resourceType = 'auto') => {
  try {
    const cloudinaryInstance = await cloudinary.getCloudinary();
    if (cloudinaryInstance) {
      const result = await cloudinaryInstance.uploader.upload(filePath, {
        resource_type: resourceType,
        folder: 'aashram_audio',
      });
      return result.secure_url;
    } else {
      console.log("Cloudinary not configured. Falling back to local static URL.");
    }
  } catch (error) {
    console.error("Cloudinary upload error, falling back to local static URL:", error.message);
  }

  // Return local static path as fallback
  const filename = path.basename(filePath);
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (normalizedPath.includes('/uploads/documents/')) {
    return `/uploads/documents/${filename}`;
  }
  return `/uploads/${filename}`;
};


exports.importFromYoutube = async (req, res) => {
  try {
    const { youtubeUrl, title, language } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ message: 'YouTube URL is required' });
    }

    // Temporary files
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const tempAudioPath = path.join(__dirname, `../uploads/audio_${uniqueId}.mp3`);
    const tempSubDir = path.join(__dirname, `../uploads`);
    const baseSubName = `sub_${uniqueId}`;

    // 1. Download audio and auto-generated subs (vtt) using youtube-dl-exec
    // We request bestaudio, extract audio to mp3, and write auto subs
    try {
      await youtubedl(youtubeUrl, {
        extractAudio: true,
        audioFormat: 'mp3',
        output: tempAudioPath
      });
    } catch (err) {
      console.warn("yt-dlp threw an error (likely subtitles rate limit or missing ffmpeg). Checking if audio was still created...");
    }

    // Find the actual audio file created (could be .webm if ffmpeg is missing)
    const allFiles = fs.readdirSync(tempSubDir);
    const actualAudioFile = allFiles.find(f => f.startsWith(`audio_${uniqueId}`) && !f.endsWith('.vtt'));
    if (!actualAudioFile) {
      throw new Error("Failed to download audio file from YouTube.");
    }
    const actualAudioPath = path.join(tempSubDir, actualAudioFile);

    // 2. Upload Audio to Cloudinary
    const audioUrl = await uploadToCloudinary(actualAudioPath, 'video');

    // 3. Find the downloaded .vtt file
    // youtube-dl saves subs as `outputName.lang.vtt`. Since output is tempAudioPath,
    // it will be something like `audio_xxxx.en.vtt`
    const vttFile = allFiles.find(f => f.startsWith(`audio_${uniqueId}`) && f.endsWith('.vtt'));
    
    let lyricsDataUrl = '';
    if (vttFile) {
      const vttPath = path.join(tempSubDir, vttFile);
      lyricsDataUrl = await uploadToCloudinary(vttPath, 'raw');
      if (lyricsDataUrl.startsWith('http')) {
        try { fs.unlinkSync(vttPath); } catch (e) {}
      }
    } else {
      // Fallback: Generate Lyrics using Deepgram API
      try {
        if (process.env.DEEPGRAM_API_KEY) {
          console.log("No YouTube subtitles found. Falling back to Deepgram...");
          const vttContent = await generateVTTFromUrl(audioUrl, language || 'Marathi');
          const vttPath = path.join(tempSubDir, `deepgram-lyrics-${Date.now()}.vtt`);
          fs.writeFileSync(vttPath, vttContent);
          lyricsDataUrl = await uploadToCloudinary(vttPath, 'raw');
          if (lyricsDataUrl.startsWith('http')) {
            try { fs.unlinkSync(vttPath); } catch (e) {}
          }
        }
      } catch (err) {
        console.error("Deepgram transcription error:", err.message);
      }
    }

    // Clean up audio if uploaded to Cloudinary
    if (audioUrl.startsWith('http') && fs.existsSync(actualAudioPath)) {
      fs.unlinkSync(actualAudioPath);
    }

    const thumbnailFile = req.file;
    let thumbnailUrl = '';
    if (thumbnailFile) {
      thumbnailUrl = await uploadToCloudinary(thumbnailFile.path, 'image');
      if (thumbnailUrl.startsWith('http')) {
        try { fs.unlinkSync(thumbnailFile.path); } catch (e) {}
      }
    }

    // 4. Save to DB
    const audioTrack = await AudioTrack.create({
      title: title || 'YouTube Import',
      audioUrl,
      thumbnailUrl,
      lyricsDataUrl,
      language: language || 'Marathi',
      sourceType: 'youtube',
      originalYoutubeUrl: youtubeUrl,
      uploadedBy: req.user?._id || undefined,
      isActive: false
    });

    res.status(201).json({
      success: true,
      message: lyricsDataUrl ? 'Audio and lyrics imported successfully' : 'Audio imported successfully.',
      data: audioTrack
    });

  } catch (error) {
    console.error("YouTube Import Error:", error);
    res.status(500).json({ success: false, message: 'Failed to import from YouTube', error: error.message });
  }
};

exports.uploadDirect = async (req, res) => {
  try {
    const { title, language } = req.body;
    
    if (!req.files || !req.files['audioFile']) {
      return res.status(400).json({ message: 'Please upload an MP3 file' });
    }

    const audioFile = req.files['audioFile'][0];
    const thumbnailFile = req.files['thumbnail'] ? req.files['thumbnail'][0] : null;

    const audioUrl = await uploadToCloudinary(audioFile.path, 'auto');
    let thumbnailUrl = '';
    if (thumbnailFile) {
      thumbnailUrl = await uploadToCloudinary(thumbnailFile.path, 'image');
    }
    
    // Clean up local files safely if they were uploaded to Cloudinary
    try {
      if (audioUrl.startsWith('http') && fs.existsSync(audioFile.path)) fs.unlinkSync(audioFile.path);
      if (thumbnailFile && thumbnailUrl.startsWith('http') && fs.existsSync(thumbnailFile.path)) fs.unlinkSync(thumbnailFile.path);
    } catch (err) {
      console.warn("Failed to clean up local files:", err.message);
    }

    // Generate Lyrics using Deepgram API
    let lyricsDataUrl = null;
    try {
      if (process.env.DEEPGRAM_API_KEY) {
        const vttContent = await generateVTTFromUrl(audioUrl, language || 'Marathi');
        if (vttContent) {
            const vttPath = path.join(__dirname, '../uploads', `lyrics-${Date.now()}.vtt`);
            fs.writeFileSync(vttPath, vttContent);
            lyricsDataUrl = await uploadToCloudinary(vttPath, 'raw');
            if (lyricsDataUrl.startsWith('http')) {
                try { fs.unlinkSync(vttPath); } catch (e) {}
            }
        }
      } else {
        console.warn("DEEPGRAM_API_KEY missing, skipping transcription.");
      }
    } catch (err) {
      console.error("Deepgram transcription error:", err.message);
    }

    const audioTrack = await AudioTrack.create({
      title: title || 'Direct Upload',
      audioUrl,
      thumbnailUrl,
      lyricsDataUrl,
      language: language || 'Marathi',
      sourceType: 'direct_upload',
      uploadedBy: req.user?._id || undefined,
      isActive: false
    });

    res.status(201).json({
      success: true,
      message: lyricsDataUrl ? 'Audio and lyrics uploaded successfully!' : 'Audio uploaded successfully.',
      data: audioTrack
    });
  } catch (error) {
    console.error("Upload Direct Error:", error);
    res.status(500).json({ success: false, message: 'Failed to upload audio', error: error.message });
  }
};

exports.getAllTracks = async (req, res) => {
  try {
    const tracks = await AudioTrack.find().sort({ createdAt: -1 }).populate('uploadedBy', 'name email');
    res.status(200).json({ success: true, data: tracks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch tracks' });
  }
};

exports.getActiveTrack = async (req, res) => {
  try {
    const track = await AudioTrack.findOne({ isActive: true });
    res.status(200).json({ success: true, data: track });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch active track' });
  }
};

exports.setActiveTrack = async (req, res) => {
  try {
    const track = await AudioTrack.findById(req.params.id);
    if (!track) return res.status(404).json({ message: 'Track not found' });

    track.isActive = !track.isActive;
    await track.save(); // pre-save hook handles deactivating others

    res.status(200).json({ 
        success: true, 
        message: track.isActive ? 'Track set as active on home page' : 'Track deactivated', 
        data: track 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update track status' });
  }
};

exports.updateTrack = async (req, res) => {
  try {
    const { title, language } = req.body;
    const track = await AudioTrack.findById(req.params.id);
    
    if (!track) return res.status(404).json({ message: 'Track not found' });

    if (title) track.title = title;
    if (language) track.language = language;

    if (req.file) {
      const thumbnailUrl = await uploadToCloudinary(req.file.path, 'image');
      track.thumbnailUrl = thumbnailUrl;
      if (thumbnailUrl.startsWith('http')) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
    }

    await track.save();
    
    res.status(200).json({ success: true, message: 'Track updated successfully', data: track });
  } catch (error) {
    console.error("Update Track Error:", error);
    res.status(500).json({ success: false, message: 'Failed to update track', error: error.message });
  }
};

exports.deleteTrack = async (req, res) => {
  try {
    const track = await AudioTrack.findByIdAndDelete(req.params.id);
    if (!track) return res.status(404).json({ message: 'Track not found' });
    
    // Note: Should also delete from cloudinary, but skipping for brevity unless requested
    
    res.status(200).json({ success: true, message: 'Track deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete track' });
  }
};
