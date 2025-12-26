export interface ClipOptions {
  timeStartSec: number;
  timeEndSec: number;
  clipLengthPreset: 'short' | 'medium' | 'long' | 'custom';
  clipLengthMinSec?: number;
  clipLengthMaxSec?: number;
  aspectRatio: '9:16' | '16:9' | '1:1' | 'auto';
  template: 'clean' | 'creator' | 'meme';
  memeHook: boolean;
  gameMode: boolean;
  hookTitle: boolean;
  callToAction: boolean;
  backgroundMusic: boolean;
  captionsEnabled: boolean;
  wordsPerCaption: number;
  highlightKeywords: boolean;
  autoThumbnail: boolean;
}

export interface GeneratedClip {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  aspectRatio: '9:16' | '16:9' | '1:1' | 'auto';
  template: string;
  hasCaptions: boolean;
  hasMemeHook: boolean;
  scores: {
    engagement: number;
    clarity: number;
    hook: number;
  };
  captions: Array<{
    startSec: number;
    endSec: number;
    text: string;
    keywords?: string[];
  }>;
  thumbnailCandidates: number[];
  selected?: boolean;
}

export interface VideoMeta {
  durationSec: number;
  title: string;
  sourcePlatform: string;
}

export interface AnalyzeResponse {
  jobId: string;
  videoMeta: VideoMeta;
  clips: GeneratedClip[];
}

export interface UploadResponse {
  fileId: string;
  size: number;
  originalName: string;
}

export interface HealthResponse {
  status: string;
  aiProvider: string;
  ffmpeg: string;
}

export interface ApiError {
  errorCode: 'INVALID_SOURCE' | 'DOWNLOAD_FAILED' | 'VIDEO_TOO_LONG' | 'AI_ERROR' | 'INTERNAL' | 'NOT_FOUND';
  message: string;
}
