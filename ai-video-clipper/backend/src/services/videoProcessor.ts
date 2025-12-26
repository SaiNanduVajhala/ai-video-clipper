import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

export interface VideoMetadata {
  durationSec: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  format: string;
}

export interface ClipParams {
  inputPath: string;
  outputPath: string;
  startSec: number;
  endSec: number;
  aspectRatio?: '9:16' | '16:9' | '1:1' | 'auto';
  quality?: 'low' | 'medium' | 'high';
}

export class VideoProcessor {
  private tempDir: string;
  
  constructor(tempDir?: string) {
    this.tempDir = tempDir || path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }
  
  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  
  /**
   * Get video metadata including duration, resolution, etc.
   */
  async getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to probe video: ${err.message}`));
          return;
        }
        
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found in file'));
          return;
        }
        
        const duration = metadata.format.duration || 0;
        const width = videoStream.width || 0;
        const height = videoStream.height || 0;
        const fps = this.parseFps(videoStream.r_frame_rate);
        const bitrate = parseInt(metadata.format.bit_rate || '0');
        const format = metadata.format.format_name || 'unknown';
        
        resolve({
          durationSec: duration,
          width,
          height,
          fps,
          bitrate,
          format
        });
      });
    });
  }
  
  /**
   * Create a video clip from the source video
   */
  async createClip(params: ClipParams): Promise<void> {
    const { inputPath, outputPath, startSec, endSec, aspectRatio = 'auto', quality = 'medium' } = params;
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .seekInput(startSec)
        .duration(endSec - startSec);
      
      // Apply aspect ratio if specified
      if (aspectRatio !== 'auto') {
        command = this.applyAspectRatio(command, aspectRatio);
      }
      
      // Apply quality settings
      command = this.applyQualitySettings(command, quality);
      
      command
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(`Processing: ${Math.round(progress.percent || 0)}% done`);
        })
        .on('end', () => {
          console.log(`Clip created successfully: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('Error creating clip:', err);
          reject(new Error(`Failed to create clip: ${err.message}`));
        });
      
      command.run();
    });
  }
  
  /**
   * Extract audio from video for transcription
   */
  async extractAudio(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .audioCodec('mp3')
        .audioBitrate('128k')
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('Extracting audio:', commandLine);
        })
        .on('end', () => {
          console.log(`Audio extracted: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('Error extracting audio:', err);
          reject(new Error(`Failed to extract audio: ${err.message}`));
        })
        .run();
    });
  }
  
  /**
   * Generate thumbnail at specific timestamp
   */
  async generateThumbnail(inputPath: string, outputPath: string, timestampSec: number): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(timestampSec)
        .frames(1)
        .output(outputPath)
        .on('end', () => {
          console.log(`Thumbnail generated: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('Error generating thumbnail:', err);
          reject(new Error(`Failed to generate thumbnail: ${err.message}`));
        })
        .run();
    });
  }
  
  /**
   * Download video from URL using yt-dlp
   */
  async downloadFromUrl(url: string, outputPath: string): Promise<string> {
    const ytdlp = require('yt-dlp-exec');
    
    try {
      const info = await ytdlp(url, {
        output: outputPath,
        format: 'best[height<=720]', // Limit to 720p for processing efficiency
        noPlaylist: true
      });
      
      return info.filename || outputPath;
    } catch (error) {
      throw new Error(`Failed to download video: ${error}`);
    }
  }
  
  /**
   * Clean up temporary files
   */
  cleanup(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up: ${filePath}`);
      }
    } catch (error) {
      console.error(`Failed to cleanup ${filePath}:`, error);
    }
  }
  
  private parseFps(rFrameRate: string): number {
    if (!rFrameRate) return 30;
    
    const [num, den] = rFrameRate.split('/');
    const numerator = parseInt(num) || 30;
    const denominator = parseInt(den) || 1;
    
    return numerator / denominator;
  }
  
  private applyAspectRatio(command: ffmpeg.FfmpegCommand, aspectRatio: string): ffmpeg.FfmpegCommand {
    switch (aspectRatio) {
      case '9:16':
        // Vertical video (9:16)
        return command
          .videoFilters('scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920')
          .size('1080x1920');
      
      case '16:9':
        // Horizontal video (16:9)
        return command
          .videoFilters('scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080')
          .size('1920x1080');
      
      case '1:1':
        // Square video (1:1)
        return command
          .videoFilters('scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080')
          .size('1080x1080');
      
      default:
        return command;
    }
  }
  
  private applyQualitySettings(command: ffmpeg.FfmpegCommand, quality: string): ffmpeg.FfmpegCommand {
    switch (quality) {
      case 'low':
        return command
          .videoBitrate('1M')
          .videoCodec('libx264')
          .audioBitrate('64k')
          .audioCodec('aac');
      
      case 'medium':
        return command
          .videoBitrate('2.5M')
          .videoCodec('libx264')
          .audioBitrate('128k')
          .audioCodec('aac');
      
      case 'high':
        return command
          .videoBitrate('5M')
          .videoCodec('libx264')
          .audioBitrate('192k')
          .audioCodec('aac');
      
      default:
        return command
          .videoBitrate('2.5M')
          .videoCodec('libx264')
          .audioBitrate('128k')
          .audioCodec('aac');
    }
  }
}

// Export singleton instance
export const videoProcessor = new VideoProcessor();
