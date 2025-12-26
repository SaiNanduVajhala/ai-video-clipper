# ai-video-clipper
AI‑powered tool that analyzes long videos, finds the best moments, and generates ready‑to‑share short clips with scores, thumbnails, and download options.
# AI Video Clipper 🎬

AI Video Clipper is a full‑stack app that analyzes long videos, finds the most engaging moments, and generates ready‑to‑share short clips with rich metadata, previews, and downloads.

> Upload a video (or give a URL), set your clip options, let the backend process it with FFmpeg + AI, and manage all generated clips in a modern React UI.

---

## Features

- 🔼 **Video upload & URL input**
  - Upload local video files (mp4, avi, mov, wmv, flv).
  - (Optional) Download and process videos from remote URLs using `yt-dlp-exec`.

- 🧠 **AI‑powered analysis**
  - Extracts audio and transcribes it via a pluggable AI provider.
  - Suggests clips automatically based on content and options.
  - Per‑clip scores for **engagement**, **clarity**, and **hook**.

- 🎯 **Flexible clip options**
  - Time range selection (start / end seconds).
  - Preset lengths: `short`, `medium`, `long`, `custom`.
  - Aspect ratios: `9:16`, `16:9`, `1:1`, `auto`.
  - Templates: `clean`, `creator`, `meme`.
  - Extra options: meme hooks, captions, background music, hooks, CTAs, etc.

- 🖼️ **Modern React UI**
  - Source panel, options panel, and results grid.
  - Glassmorphism + gradient‑based cards for clips.
  - Detailed preview modal with custom progress bar and overlay controls.
  - Tag chips for aspect ratio, caption status, template, and meme hooks.
  - Engagement score visualization with colored labels and progress bars.
  - Bulk download of selected clips and per‑clip download buttons.

- 🎧 **Backend processing**
  - Uses FFmpeg / ffprobe via `fluent-ffmpeg` for:
    - Probing metadata (duration, resolution, bitrate).
    - Extracting audio for transcription.
    - Cutting clips on demand. [^ffmpeg]
  - Job system: analyze once, then poll for job and clips.
  - On‑demand clip generation and streaming via Express.

---

## Tech Stack

### Frontend

- **React** (with hooks, function components)
- **TypeScript**
- **Vite** as dev server / bundler
- **Tailwind CSS** (utility classes for styling)
- **lucide-react** for icons
- Custom services for:
  - HTTP API calls (`axios`)
  - Blob download helper for video files

### Backend

- **Node.js** + **TypeScript**
- **Express** HTTP API
- **fluent-ffmpeg** for video/audio processing [^fluent]
- **FFmpeg / ffprobe** (external binaries, installed on the host) [^ffmpeg]
- **multer** for file uploads
- **yt-dlp-exec** (optional) for downloading videos from URLs [^ytdlp]
- **zod** for runtime request validation
- Simple in‑process “DB” (utility functions in `db.ts`) for jobs and clips
- Pluggable AI provider (`aiProvider.ts`) to handle:
  - Transcription (`transcribe`)
  - Clip suggestion (`suggestClips`)

---

## Project Structure

ai-video-clipper/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── video.ts           # /api/video/* routes
│   │   ├── services/
│   │   │   ├── videoProcessor.ts  # FFmpeg, ffprobe, yt-dlp logic
│   │   │   └── aiProvider.ts      # AI provider abstraction
│   │   ├── db.ts                  # in-memory job/clip storage
│   │   ├── types.ts               # shared backend types
│   │   └── server.ts              # Express app bootstrap
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SourcePanel.tsx
│   │   │   ├── OptionsPanel.tsx
│   │   │   └── ResultsGrid.tsx    # clips grid + preview modal
│   │   ├── services/
│   │   │   └── api.ts             # axios API client + helpers
│   │   ├── types.ts               # shared frontend types
│   │   └── App.tsx
│   ├── index.html
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
├── LICENSE
└── README.md


## Prerequisites

Before running the project locally, install:

- **Node.js** (LTS recommended, e.g. 18+).
- **npm** (comes with Node) or your preferred package manager.
- **FFmpeg** (must include `ffmpeg` and `ffprobe` binaries). You can download Windows builds from gyan.dev or BtbN’s GitHub releases. [^ffmpeg]
  - On Windows, an easy way is to use a package manager:

    ```
    choco install ffmpeg
    winget install "FFmpeg (Essentials Build)"
    ```

  - Make sure `ffmpeg` and `ffprobe` are available in your PATH.

- (Optional for URL sources) **yt-dlp** via `yt-dlp-exec`:
  - The Node package wraps `yt-dlp`. You may still need the underlying tool depending on your environment. [^ytdlp]

- **AI provider credentials** (if required by your chosen provider e.g. OpenAI, Gemini, etc.), configured via environment variables in the backend.

---

## Setup

### 1. Clone the repository

git clone https://github.com/<your-username>/ai-video-clipper.git
cd ai-video-clipper

text

### 2. Backend setup

cd backend
npm install

text

#### Backend environment

Create a `.env` file in `backend/` (or use `.env.example` if present) with values like:

PORT=3001
AI_PROVIDER=gemini # or 'openai', etc.
AI_API_KEY=your_api_key_here

text

(Adjust names/keys to match your actual `aiProvider` implementation.)

#### Backend development server

npm run dev

text

This starts the Express server (default port `3001`).

### 3. Frontend setup

In another terminal:

cd frontend
npm install

text

Configure API base URL in `frontend/src/services/api.ts` if needed (e.g. `http://localhost:3001/api`).

#### Frontend dev server

npm run dev

text

Vite will show a local URL (usually `http://localhost:3000/`).

Now open the frontend URL in your browser; the app will talk to the backend on port 3001.

---

## Usage

1. **Start both servers**
   - Backend: `npm run dev` inside `backend`.
   - Frontend: `npm run dev` inside `frontend`.

2. **Upload or specify a video**
   - In the Source panel:
     - Choose *Upload* and pick a file from your machine, **or**
     - Choose *URL* (if enabled) and paste a video link.
   - Wait for the upload/URL validation and metadata (duration) to appear.

3. **Configure clip options**
   - Choose time range (start / end).
   - Pick a length preset (short / medium / long / custom).
   - Select aspect ratio and template.
   - Toggle options: meme hook, captions, hook title, call to action, background music, etc.

4. **Analyze & generate**
   - Click **Analyze & Generate Clips**.
   - The backend:
     - Probes the video with ffprobe.
     - Extracts audio with FFmpeg.
     - Sends audio to the AI provider for transcription.
     - Requests clip suggestions from the AI.
     - Saves clips in the in‑memory DB.
   - The frontend polls the job endpoint until clips are ready.

5. **Review generated clips**
   - Clips appear in the **Results** grid:
     - Card for each clip with title, time range, aspect ratio, template, tags.
     - Engagement score (High / Medium / Low) and percent.
   - Click **Preview** for in‑modal playback with a custom overlay player and progress bar.
   - Click **Download** to download a single clip.
   - Select multiple clips and click **Download All** for bulk download.

---

## API Overview

Base URL (backend):

/api/video

text

Key routes:

- `POST /api/video/upload`
  - Multipart upload with `file` field.
  - Returns `fileId` and basic metadata.

- `POST /api/video/analyze`
  - Body:

    ```
    {
      "source": { "type": "file" | "url", "fileId": "...", "url": "..." },
      "options": { /* clip options */ }
    }
    ```

  - Validated with `zod`; returns `jobId` and initial `videoMeta`.

- `GET /api/video/job/:jobId`
  - Returns job status and an array of clip definitions (with scores, captions, thumbnails).

- `GET /api/video/clip/:jobId/:clipId/download`
  - Streams the generated clip.
  - Generates the clip on demand using FFmpeg if not already present.

---

## Dependencies (Key Packages)

### Backend

- `express` – HTTP server / routing
- `multer` – multipart form‑data parsing for file uploads
- `fluent-ffmpeg` – Node wrapper for FFmpeg / ffprobe [^fluent]
- `yt-dlp-exec` – wrapper for `yt-dlp` for URL downloads [^ytdlp]
- `zod` – runtime validation of request payloads
- `dotenv` – environment variable loading
- `uuid` – generation of job and file IDs
- `typescript`, `ts-node` / `tsx` – TypeScript tooling

### Frontend

- `react`, `react-dom`
- `typescript`
- `vite`
- `axios` – HTTP client
- `lucide-react` – icon set
- `tailwindcss`, `postcss`, `autoprefixer` – styling pipeline

---

## Development Notes

- **FFmpeg / ffprobe**
  - Must be installed and either:
    - Available on `PATH`, or
    - Explicitly configured in `videoProcessor.ts` via `ffmpeg.setFfmpegPath` / `setFfprobePath`. [^fluent]
- **Temporary folders**
  - The backend uses subfolders under `temp/`:
    - `temp/uploads` – raw uploaded videos
    - `temp/downloads` – URL‑downloaded videos
    - `temp/audio` – extracted audio for transcription
    - `temp/clips` – generated clips
  - These paths are relative to `process.cwd()`; ensure the directories are writable.

- **Database**
  - Current implementation uses an in‑memory store for jobs and clips (via helper functions in `db.ts`).
  - For production: replace with a proper database (PostgreSQL, MongoDB, etc.).

- **AI Provider**
  - `aiProvider.ts` acts as a thin abstraction.
  - Plug in your favorite provider by implementing:
    - `transcribe({ filePath, startSec, endSec })`
    - `suggestClips({ transcript, options })`

---

## Scripts

### Backend (`backend/package.json`)

- `npm run dev` – start backend in watch mode (TypeScript).
- `npm run build` – build backend TypeScript to JavaScript.
- `npm start` – run built backend.

### Frontend (`frontend/package.json`)

- `npm run dev` – start Vite dev server.
- `npm run build` – production build.
- `npm run preview` – preview production build locally.

---

## Roadmap / Ideas

- Persist jobs and clips in a real database.
- Add authentication and user accounts.
- Support more source platforms via URL (Twitch, Facebook, etc.).
- Advanced clip editing in the browser (trim, reorder, overlay text).
- Export directly to platforms (YouTube Shorts, Reels, TikTok).

---

## License

This project is licensed under the **MIT License**.  
See the `LICENSE` file for details. [^mit]

---

[^ffmpeg]: FFmpeg & ffprobe documentation – <https://ffmpeg.org/ffprobe.html> and Windows builds from gyan.dev/BtbN.  
[^fluent]: `fluent-ffmpeg` – Node wrapper for FFmpeg: <https://www.npmjs.com/package/fluent-ffmpeg>.  
[^ytdlp]: `yt-dlp-exec` – Node wrapper for yt-dlp: <https://www.npmjs.com/package/@borodutch-labs/yt-dlp-exec>.  
[^mit]: MIT License overview – <https://choosealicense.com/licenses/mit/>.
