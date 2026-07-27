const AudioTrack = require('../models/AudioTrack');
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../utils/cloudinaryHelper');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const extractYoutubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

exports.importFromYoutube = async (req, res) => {
  try {
    const { youtubeUrl, title, language } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ message: 'YouTube URL is required' });
    }

    const videoId = extractYoutubeId(youtubeUrl);
    let audioUrl = '';
    let thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
    let lyricsDataUrl = null;

    // Process uploaded thumbnail file if provided
    const thumbnailFile = req.file || (req.files && req.files['thumbnail'] ? req.files['thumbnail'][0] : null);
    if (thumbnailFile) {
      const thumbRes = await uploadToCloudinary(thumbnailFile, 'aashram_audio', { resourceType: 'image' });
      if (thumbRes) thumbnailUrl = thumbRes.url;
    }

    // Try downloading audio via yt-dlp if available
    let downloadedAudio = false;
    try {
      const uniqueId = crypto.randomBytes(8).toString('hex');
      const tempAudioPath = path.join(__dirname, `../uploads/audio_${uniqueId}.mp3`);
      const tempSubDir = path.join(__dirname, `../uploads`);
      
      await youtubedl(youtubeUrl, {
        extractAudio: true,
        audioFormat: 'mp3',
        output: tempAudioPath
      });

      const allFiles = fs.readdirSync(tempSubDir);
      const actualAudioFile = allFiles.find(f => f.startsWith(`audio_${uniqueId}`) && !f.endsWith('.vtt'));
      if (actualAudioFile) {
        const actualAudioPath = path.join(tempSubDir, actualAudioFile);
        const uploadRes = await uploadToCloudinary(actualAudioPath, 'aashram_audio', { resourceType: 'video' });
        if (uploadRes) {
          audioUrl = uploadRes.url;
          downloadedAudio = true;
        }
      }
    } catch (err) {
      console.warn("yt-dlp download failed on server. Falling back to YouTube direct URL:", err.message);
    }

    // Fallback if yt-dlp download was not possible (e.g. Render server environment without yt-dlp)
    if (!downloadedAudio) {
      if (videoId) {
        audioUrl = `https://www.youtube.com/watch?v=${videoId}`;
      } else {
        audioUrl = youtubeUrl;
      }
    }

    const audioTrack = await AudioTrack.create({
      title: title || (videoId ? `YouTube Track (${videoId})` : 'YouTube Import'),
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
      message: 'Audio imported successfully.',
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

    const uploadRes = await uploadToCloudinary(audioFile, 'aashram_audio', { resourceType: 'video' });
    let audioUrl = uploadRes ? uploadRes.url : '';
    if (audioUrl && audioUrl.startsWith('http://')) {
      audioUrl = audioUrl.replace('http://', 'https://');
    }
    let thumbnailUrl = '';
    if (thumbnailFile) {
      const thumbRes = await uploadToCloudinary(thumbnailFile, 'aashram_audio', { resourceType: 'image' });
      if (thumbRes) {
        thumbnailUrl = thumbRes.url.replace(/^http:\/\//, 'https://');
      }
    }

    const audioTrack = await AudioTrack.create({
      title: title || 'Direct Upload',
      audioUrl,
      thumbnailUrl,
      lyricsDataUrl: null,
      language: language || 'Marathi',
      sourceType: 'direct_upload',
      uploadedBy: req.user?._id || undefined,
      isActive: false
    });

    res.status(201).json({
      success: true,
      message: 'Audio uploaded successfully.',
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
    await track.save();

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

    if (req.file || (req.files && req.files['thumbnail'])) {
      const thumbFile = req.file || req.files['thumbnail'][0];
      const thumbRes = await uploadToCloudinary(thumbFile, 'aashram_audio', { resourceType: 'image' });
      if (thumbRes) track.thumbnailUrl = thumbRes.url;
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
    const track = await AudioTrack.findById(req.params.id);
    if (!track) return res.status(404).json({ message: 'Track not found' });
    
    const { deleteFromCloudinary, extractPublicId } = require('../utils/cloudinaryHelper');
    const audioPid = track.audioPublicId || extractPublicId(track.audioUrl);
    if (audioPid) await deleteFromCloudinary(audioPid, 'video');

    const thumbPid = track.thumbnailPublicId || extractPublicId(track.thumbnailUrl);
    if (thumbPid) await deleteFromCloudinary(thumbPid, 'image');

    await AudioTrack.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ success: true, message: 'Track deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete track' });
  }
};
