import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { videoProcessor } from '../services/videoProcessor';
import { createAIProvider } from '../services/aiProvider';
import { createJob, getJob, ClipRow } from '../db';
import { ClipOptions, AnalyzeResponse, ApiError } from '../types';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'temp', 'uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${fileId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// Validation schemas
const AnalyzeRequestSchema = z.object({
  source: z.object({
    type: z.enum(['file', 'url']),
    fileId: z.string().optional(),
    url: z.string().optional()
  }).refine(data => {
    if (data.type === 'file') return !!data.fileId;
    if (data.type === 'url') return !!data.url;
    return false;
  }, 'Source must have either fileId for file type or url for URL type'),
  options: z.object({
    timeStartSec: z.number().min(0),
    timeEndSec: z.number().min(0),
    clipLengthPreset: z.enum(['short', 'medium', 'long', 'custom']),
    clipLengthMinSec: z.number().optional(),
    clipLengthMaxSec: z.number().optional(),
    aspectRatio: z.enum(['9:16', '16:9', '1:1', 'auto']),
    template: z.enum(['clean', 'creator', 'meme']),
    memeHook: z.boolean(),
    gameMode: z.boolean(),
    hookTitle: z.boolean(),
    callToAction: z.boolean(),
    backgroundMusic: z.boolean(),
    captionsEnabled: z.boolean(),
    wordsPerCaption: z.number().min(3).max(10),
    highlightKeywords: z.boolean(),
    autoThumbnail: z.boolean()
  })
});

// POST /api/video/upload - Upload video file
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      const error: ApiError = { errorCode: 'INVALID_SOURCE', message: 'No file uploaded' };
      return res.status(400).json(error);
    }

    const fileId = path.basename(req.file.filename, path.extname(req.file.filename));

    // Get video metadata
    const metadata = await videoProcessor.getVideoMetadata(req.file.path);

    // Validate video duration (max 1 hour)
    if (metadata.durationSec > 3600) {
      // Clean up the uploaded file
      videoProcessor.cleanup(req.file.path);
      const error: ApiError = { errorCode: 'VIDEO_TOO_LONG', message: 'Video duration exceeds 1 hour limit' };
      return res.status(400).json(error);
    }

    res.json({
      fileId,
      size: req.file.size,
      originalName: req.file.originalname,
      metadata: {
        durationSec: metadata.durationSec,
        width: metadata.width,
        height: metadata.height
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    const apiError: ApiError = { errorCode: 'INTERNAL', message: 'Failed to upload video' };
    res.status(500).json(apiError);
  }
});

// POST /api/video/analyze - Analyze video and generate clips
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const validatedData = AnalyzeRequestSchema.parse(req.body);
    const { source, options } = validatedData;

    // Generate job ID
    const jobId = uuidv4();

    // Resolve video file path
    let videoPath: string;
    let sourcePlatform = 'file';

    if (source.type === 'file') {
      const uploadDir = path.join(process.cwd(), 'temp', 'uploads');
      // keep original extension; uploaded filename already includes it
      const possibleFiles = fs.readdirSync(uploadDir).filter(f => f.startsWith(source.fileId as string));
      if (possibleFiles.length === 0) {
        const error: ApiError = { errorCode: 'INVALID_SOURCE', message: 'Uploaded file not found' };
        return res.status(404).json(error);
      }
      videoPath = path.join(uploadDir, possibleFiles[0]);
    } else {
      // Download from URL
      const downloadDir = path.join(process.cwd(), 'temp', 'downloads');
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      const downloadPath = path.join(downloadDir, `${jobId}.mp4`);

      try {
        videoPath = await videoProcessor.downloadFromUrl(source.url!, downloadPath);
        sourcePlatform = new URL(source.url!).hostname;
      } catch (error) {
        console.error('DOWNLOAD_FAILED:', error);
        const apiError: ApiError = { errorCode: 'DOWNLOAD_FAILED', message: 'Failed to download video from URL' };
        return res.status(400).json(apiError);
      }
    }

    // Get video metadata
    const metadata = await videoProcessor.getVideoMetadata(videoPath);

    // Validate time range
    const { timeStartSec, timeEndSec } = options;
    if (timeStartSec >= timeEndSec || timeEndSec > metadata.durationSec) {
      const error: ApiError = { errorCode: 'INVALID_SOURCE', message: 'Invalid time range specified' };
      return res.status(400).json(error);
    }

    // Create job record
    createJob({
      id: jobId,
      sourceType: source.type,
      sourcePath: source.type === 'file' ? videoPath : undefined,
      sourceUrl: source.type === 'url' ? source.url : undefined,
      options: JSON.stringify(options),
      videoDurationSec: metadata.durationSec,
      providerName: process.env.AI_PROVIDER || 'gemini',
      status: 'processing'
    });

    // Process video asynchronously
    processVideoAsync(jobId, videoPath, options, metadata, sourcePlatform);

    // Return immediate response with job ID
    res.json({
      jobId,
      videoMeta: {
        durationSec: metadata.durationSec,
        title: path.basename(videoPath),
        sourcePlatform
      },
      clips: [] // Will be populated asynchronously
    });

  } catch (error) {
    console.error('Analyze error:', error);
    if (error instanceof z.ZodError) {
      const apiError: ApiError = { errorCode: 'INVALID_SOURCE', message: 'Invalid request data' };
      return res.status(400).json(apiError);
    }

    const apiError: ApiError = { errorCode: 'INTERNAL', message: 'Failed to analyze video' };
    res.status(500).json(apiError);
  }
});

// GET /api/video/job/:jobId - Get job status and results
router.get('/job/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = getJob(jobId);

    if (!job) {
      const error: ApiError = { errorCode: 'NOT_FOUND', message: 'Job not found' };
      return res.status(404).json(error);
    }

    // Get clips for this job
    const clips = require('../db').getClipsByJobId(jobId);

    res.json({
      jobId,
      status: job.status,
      videoMeta: {
        durationSec: job.videoDurationSec,
        title: job.sourcePath ? path.basename(job.sourcePath) : 'Uploaded Video',
        sourcePlatform: job.sourceUrl ? new URL(job.sourceUrl).hostname : 'file'
      },
      clips: clips.map((clip: ClipRow) => ({
        ...clip,
        hasCaptions: Boolean(clip.hasCaptions),
        hasMemeHook: Boolean(clip.hasMemeHook),
        scores: JSON.parse(clip.scores) as {
          engagement: number;
          clarity: number;
          hook: number;
        },
        captions: clip.captionData ? JSON.parse(clip.captionData) : [],
        thumbnailCandidates: clip.thumbnailTimestamps ? JSON.parse(clip.thumbnailTimestamps) : []
      }))
    });

  } catch (error) {
    console.error('Get job error:', error);
    const apiError: ApiError = { errorCode: 'INTERNAL', message: 'Failed to get job status' };
    res.status(500).json(apiError);
  }
});

// GET /api/video/clip/:jobId/:clipId/download - Download generated clip
router.get('/clip/:jobId/:clipId/download', async (req: Request, res: Response) => {
  try {
    const { jobId, clipId } = req.params;

    // Get clip from database
    const clips = require('../db').getClipsByJobId(jobId);
    const clip = clips.find((c: any) => c.id === clipId);

    if (!clip) {
      const error: ApiError = { errorCode: 'NOT_FOUND', message: 'Clip not found' };
      return res.status(404).json(error);
    }

    // If clip file doesn't exist, generate it on-demand
    if (!clip.clipFilePath || !fs.existsSync(clip.clipFilePath)) {
      const job = getJob(jobId);
      if (!job) {
        const error: ApiError = { errorCode: 'NOT_FOUND', message: 'Job not found' };
        return res.status(404).json(error);
      }

      const videoPath = job.sourcePath || job.sourceUrl;
      if (!videoPath) {
        const error: ApiError = { errorCode: 'INVALID_SOURCE', message: 'Source video not found' };
        return res.status(404).json(error);
      }

      // Generate clip on-demand
      const outputDir = path.join(process.cwd(), 'temp', 'clips');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const outputPath = path.join(outputDir, `${clipId}.mp4`);

      await videoProcessor.createClip({
        inputPath: videoPath,
        outputPath,
        startSec: clip.startSec,
        endSec: clip.endSec,
        aspectRatio: clip.aspectRatio as any
      });

      clip.clipFilePath = outputPath;
    }

    // Stream the file
    res.sendFile(clip.clipFilePath, err => {
      if (err) {
        console.error('sendFile error:', err);
      }
    });

  } catch (error) {
    console.error('Download clip error:', error);
    const apiError: ApiError = { errorCode: 'INTERNAL', message: 'Failed to download clip' };
    res.status(500).json(apiError);
  }
});

// Async function to process video
async function processVideoAsync(
  jobId: string,
  videoPath: string,
  options: ClipOptions,
  metadata: any,
  sourcePlatform: string
) {
  try {
    console.log(`Starting video processing for job ${jobId}`);

    // Extract audio for transcription
    const audioDir = path.join(process.cwd(), 'temp', 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    const audioPath = path.join(audioDir, `${jobId}.mp3`);
    await videoProcessor.extractAudio(videoPath, audioPath);

    // Get AI provider
    const aiProvider = createAIProvider();

    // Transcribe audio
    console.log('Transcribing audio...');
    const transcript = await aiProvider.transcribe({
      filePath: audioPath,
      startSec: options.timeStartSec,
      endSec: options.timeEndSec
    });

    // Suggest clips
    console.log('Analyzing transcript and suggesting clips...');
    const clips = await aiProvider.suggestClips({
      transcript,
      options
    });

    // Save clips to database
    for (const clip of clips) {
      require('../db').createClip({
        id: clip.id,
        jobId,
        title: clip.title,
        startSec: clip.startSec,
        endSec: clip.endSec,
        durationSec: clip.durationSec,
        aspectRatio: clip.aspectRatio,
        template: clip.template,
        hasCaptions: clip.hasCaptions,
        hasMemeHook: clip.hasMemeHook,
        scores: JSON.stringify(clip.scores),
        captionData: JSON.stringify(clip.captions),
        thumbnailTimestamps: JSON.stringify(clip.thumbnailCandidates),
        clipFilePath: null // Generate on-demand
      });
    }

    // Clean up temporary audio file
    videoProcessor.cleanup(audioPath);

    console.log(`Video processing completed for job ${jobId}`);

  } catch (error) {
    console.error(`Video processing failed for job ${jobId}:`, error);
    // TODO: update job status to failed
  }
}

export { router as videoRoutes };
