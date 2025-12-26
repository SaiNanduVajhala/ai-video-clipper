import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../../data/clippilot.json');

// Types
export interface JobRow {
  id: string;
  createdAt: string;
  sourceType: string;
  sourcePath?: string;
  sourceUrl?: string;
  options: string;
  videoDurationSec: number;
  providerName: string;
  status: string;
}

export interface ClipRow {
  id: string;
  jobId: string;
  title: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  aspectRatio: string;
  template: string;
  hasCaptions: number;
  hasMemeHook: number;
  scores: string;
  captionData?: string;
  thumbnailTimestamps?: string;
  clipFilePath?: string;
}

// Internal in-memory DB
interface JsonDbShape {
  jobs: JobRow[];
  clips: ClipRow[];
}

let dbData: JsonDbShape = { jobs: [], clips: [] };

// Load from disk if file exists
if (fs.existsSync(DB_PATH)) {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    dbData = JSON.parse(raw) as JsonDbShape;
  } catch (e) {
    console.error('Failed to read DB file, starting fresh:', e);
    dbData = { jobs: [], clips: [] };
  }
} else {
  // Ensure directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Persist helper
function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
}

// Initialize database schema (no-op for JSON store)
export function initializeDatabase() {
  console.log('JSON database initialized at', DB_PATH);
}

// Job operations
export function createJob(job: Omit<JobRow, 'createdAt'>): void {
  const newJob: JobRow = {
    ...job,
    createdAt: new Date().toISOString(),
  };
  dbData.jobs.push(newJob);
  save();
}

export function getJob(id: string): JobRow | undefined {
  return dbData.jobs.find(j => j.id === id);
}

// Clip operations
export function createClip(clip: Omit<ClipRow, 'hasCaptions' | 'hasMemeHook'> & {
  hasCaptions?: boolean;
  hasMemeHook?: boolean;
}): void {
  const newClip: ClipRow = {
    ...clip,
    hasCaptions: clip.hasCaptions ? 1 : 0,
    hasMemeHook: clip.hasMemeHook ? 1 : 0,
  };
  dbData.clips.push(newClip);
  save();
}

export function getClipsByJobId(jobId: string): ClipRow[] {
  return dbData.clips
    .filter(c => c.jobId === jobId)
    .sort((a, b) => a.startSec - b.startSec);
}
