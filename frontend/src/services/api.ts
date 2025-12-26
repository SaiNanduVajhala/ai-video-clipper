import axios from 'axios';
import { ClipOptions, AnalyzeResponse, UploadResponse, HealthResponse, JobStatusResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for long operations
});

// Request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const videoApi = {
  // Upload video file
  async uploadVideo(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<UploadResponse>('/video/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  // Analyze video and generate clips
  async analyzeVideo(source: { type: 'file' | 'url'; fileId?: string; url?: string }, options: ClipOptions): Promise<AnalyzeResponse> {
    const response = await api.post<AnalyzeResponse>('/video/analyze', {
      source,
      options,
    });
    
    return response.data;
  },

  // Get job status and results
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await api.get<JobStatusResponse>(`/video/job/${jobId}`);
    return response.data;
  },

  // Download clip
  async downloadClip(jobId: string, clipId: string): Promise<Blob> {
    const response = await api.get(`/video/clip/${jobId}/${clipId}/download`, {
      responseType: 'blob',
    });
    
    return response.data;
  },

  // Get download URL for clip (for direct download)
  getClipDownloadUrl(jobId: string, clipId: string): string {
    return `${API_BASE_URL}/video/clip/${jobId}/${clipId}/download`;
  },
};

export const healthApi = {
  // Check backend health
  async checkHealth(): Promise<HealthResponse> {
    const response = await api.get<HealthResponse>('/health');
    return response.data;
  },
};

// Utility function to format time in seconds to MM:SS format
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Utility function to download a blob as file
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Utility function to validate URL
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Utility function to get file size in human readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
