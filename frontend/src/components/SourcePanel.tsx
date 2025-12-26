import React, { useState } from 'react';
import { Upload, Link, FileVideo, X } from 'lucide-react';
import { videoApi, formatFileSize, isValidUrl } from '../services/api';
import { UploadResponse } from '../types';

interface SourcePanelProps {
  onSourceSelected: (source: { type: 'file' | 'url'; fileId?: string; url?: string }) => void;
  disabled?: boolean;
}

export const SourcePanel: React.FC<SourcePanelProps> = ({ onSourceSelected, disabled = false }) => {
  const [sourceType, setSourceType] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadResponse | null>(null);
  const [urlError, setUrlError] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUrlError('');

    try {
      const response = await videoApi.uploadVideo(file);
      setUploadedFile(response);
      onSourceSelected({ type: 'file', fileId: response.fileId });
    } catch (error) {
      console.error('Upload failed:', error);
      setUrlError('Failed to upload file. Please try again.');
      setUploadedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    setUrlError('');

    if (!url.trim()) {
      setUrlError('Please enter a video URL');
      return;
    }

    if (!isValidUrl(url)) {
      setUrlError('Please enter a valid URL');
      return;
    }

    onSourceSelected({ type: 'url', url });
  };

  const clearUpload = () => {
    setUploadedFile(null);
    onSourceSelected({ type: 'file' }); // Reset to empty file selection
  };

  const clearUrl = () => {
    setUrl('');
    setUrlError('');
    onSourceSelected({ type: 'url' }); // Reset to empty URL selection
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <h2 className="text-xl font-semibold text-white mb-4">Video Source</h2>
      
      {/* Source Type Selection */}
      <div className="flex space-x-4">
        <button
          onClick={() => setSourceType('file')}
          disabled={disabled}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            sourceType === 'file'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Upload className="inline-block w-4 h-4 mr-2" />
          Upload File
        </button>
        <button
          onClick={() => setSourceType('url')}
          disabled={disabled}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            sourceType === 'url'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Link className="inline-block w-4 h-4 mr-2" />
          Video URL
        </button>
      </div>

      {/* File Upload Section */}
      {sourceType === 'file' && (
        <div className="space-y-4">
          {!uploadedFile ? (
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
              <FileVideo className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-4">
                Drag and drop a video file here, or click to select
              </p>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                disabled={disabled || uploading}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`btn-primary inline-block cursor-pointer ${
                  disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                    Uploading...
                  </>
                ) : (
                  'Select Video File'
                )}
              </label>
              <p className="text-gray-500 text-sm mt-2">
                Supported formats: MP4, AVI, MOV, WMV, FLV (Max: 500MB)
              </p>
            </div>
          ) : (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileVideo className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-white font-medium">{uploadedFile.originalName}</p>
                    <p className="text-gray-400 text-sm">
                      {formatFileSize(uploadedFile.size)}
                      {uploadedFile.metadata && (
                        <span className="ml-2">
                          • {Math.floor(uploadedFile.metadata.durationSec / 60)}:{(uploadedFile.metadata.durationSec % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearUpload}
                  disabled={disabled}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* URL Input Section */}
      {sourceType === 'url' && (
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Video URL
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={disabled}
                className="input-field flex-1"
              />
              {url && (
                <button
                  onClick={clearUrl}
                  disabled={disabled}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            {urlError && (
              <p className="text-red-400 text-sm mt-1">{urlError}</p>
            )}
          </div>
          <button
            onClick={handleUrlSubmit}
            disabled={disabled || !url.trim()}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Link className="inline-block w-4 h-4 mr-2" />
            Use This URL
          </button>
          <p className="text-gray-500 text-sm">
            Supports: YouTube, TikTok, and other video platforms
          </p>
        </div>
      )}
    </div>
  );
};
