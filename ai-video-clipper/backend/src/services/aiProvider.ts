import { GeneratedClip, ClipOptions } from '../types';

export interface Transcript {
  segments: Array<{
    startSec: number;
    endSec: number;
    text: string;
  }>;
}

export interface AIProvider {
  transcribe(input: { filePath: string; startSec: number; endSec: number }): Promise<Transcript>;
  suggestClips(input: { transcript: Transcript; options: ClipOptions }): Promise<GeneratedClip[]>;
}

export function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || 'gemini';
  
  switch (provider) {
    case 'gemini':
      return new GeminiProvider();
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
  }
  
  async transcribe(input: { filePath: string; startSec: number; endSec: number }): Promise<Transcript> {
    // For now, return a mock transcript
    // In a real implementation, you would use a speech-to-text service
    // or Gemini's multimodal capabilities with audio
    const duration = input.endSec - input.startSec;
    const mockSegments: Array<{ startSec: number; endSec: number; text: string }> = [];
    
    // Generate mock transcript segments
    const segmentDuration = 5; // 5 seconds per segment
    for (let i = 0; i < duration / segmentDuration; i++) {
      const start = input.startSec + (i * segmentDuration);
      const end = Math.min(start + segmentDuration, input.endSec);
      mockSegments.push({
        startSec: start,
        endSec: end,
        text: `This is a mock transcript segment from ${start.toFixed(1)}s to ${end.toFixed(1)}s. In a real implementation, this would be the actual transcribed audio content.`
      });
    }
    
    return { segments: mockSegments };
  }
  
  async suggestClips(input: { transcript: Transcript; options: ClipOptions }): Promise<GeneratedClip[]> {
    // For now, return mock clips based on the transcript
    // In a real implementation, you would use Gemini to analyze the transcript
    // and identify high-value segments
    const clips: GeneratedClip[] = [];
    const { transcript, options } = input;
    
    // Determine clip length based on preset
    let minDuration = 10;
    let maxDuration = 25;
    
    switch (options.clipLengthPreset) {
      case 'short':
        minDuration = 10;
        maxDuration = 25;
        break;
      case 'medium':
        minDuration = 25;
        maxDuration = 45;
        break;
      case 'long':
        minDuration = 45;
        maxDuration = 90;
        break;
      case 'custom':
        minDuration = options.clipLengthMinSec || 10;
        maxDuration = options.clipLengthMaxSec || 60;
        break;
    }
    
    // Generate clips from transcript segments
    let currentStart = options.timeStartSec;
    let clipIndex = 0;
    
    while (currentStart < options.timeEndSec && clipIndex < 10) {
      const duration = Math.min(
        maxDuration,
        Math.max(minDuration, options.timeEndSec - currentStart)
      );
      const endSec = currentStart + duration;
      
      // Find relevant transcript segments for this clip
      const relevantSegments = transcript.segments.filter(
        seg => seg.startSec < endSec && seg.endSec > currentStart
      );
      
      if (relevantSegments.length > 0) {
        const clipText = relevantSegments.map(seg => seg.text).join(' ').substring(0, 100);
        
        clips.push({
          id: `clip-${clipIndex + 1}`,
          title: `Clip ${clipIndex + 1}: ${clipText.substring(0, 50)}...`,
          startSec: currentStart,
          endSec: endSec,
          durationSec: duration,
          aspectRatio: options.aspectRatio,
          template: options.template,
          hasCaptions: options.captionsEnabled,
          hasMemeHook: options.memeHook,
          scores: {
            engagement: Math.random() * 0.5 + 0.5, // 0.5-1.0
            clarity: Math.random() * 0.3 + 0.7,    // 0.7-1.0
            hook: Math.random() * 0.4 + 0.6        // 0.6-1.0
          },
          captions: options.captionsEnabled ? this.generateCaptions(relevantSegments, options) : [],
          thumbnailCandidates: [
            currentStart + duration * 0.1,
            currentStart + duration * 0.5,
            currentStart + duration * 0.9
          ]
        });
      }
      
      currentStart = endSec + 5; // 5 second gap between clips
      clipIndex++;
    }
    
    return clips;
  }
  
  private generateCaptions(segments: any[], options: ClipOptions) {
    return segments.map(seg => ({
      startSec: seg.startSec,
      endSec: seg.endSec,
      text: seg.text,
      keywords: options.highlightKeywords ? this.extractKeywords(seg.text) : undefined
    }));
  }
  
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - in real implementation, use NLP
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);
    
    return words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 3);
  }
}
