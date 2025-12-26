import React, { useState } from 'react';
import { Play, Download, Eye, Edit3, Check, X, Star, Share2, Trash2 } from 'lucide-react';
import { GeneratedClip } from '../types';
import { videoApi, formatTime, downloadBlob } from '../services/api';

interface ResultsGridProps {
  clips: GeneratedClip[];
  jobId: string;
  onClipSelect?: (clipId: string, selected: boolean) => void;
  onEditClip?: (clip: GeneratedClip) => void;
  onFavoriteClip?: (clipId: string) => void;
  onDeleteClip?: (clipId: string) => void;
  disabled?: boolean;
}

const getScoreColor = (score: number) => {
  if (score >= 0.8) return 'text-green-400';
  if (score >= 0.6) return 'text-yellow-400';
  return 'text-red-400';
};

const getScoreLabel = (score: number) => {
  if (score >= 0.8) return 'High';
  if (score >= 0.6) return 'Medium';
  return 'Low';
};

const getAspectRatioLabel = (ratio: string) => {
  switch (ratio) {
    case '9:16': return 'Vertical';
    case '16:9': return 'Horizontal';
    case '1:1': return 'Square';
    default: return 'Auto';
  }
};

export const ResultsGrid: React.FC<ResultsGridProps> = ({
  clips,
  jobId,
  onClipSelect,
  onEditClip,
  onFavoriteClip,
  onDeleteClip,
  disabled = false
}) => {
  const [previewingClip, setPreviewingClip] = useState<GeneratedClip | null>(null);
  const [downloadingClips, setDownloadingClips] = useState<Set<string>>(new Set());
  const [hoveredClip, setHoveredClip] = useState<string | null>(null);

  const handleDownloadClip = async (clip: GeneratedClip) => {
    if (downloadingClips.has(clip.id)) return;

    setDownloadingClips(prev => new Set(prev).add(clip.id));

    try {
      const blob = await videoApi.downloadClip(jobId, clip.id);
      const filename = `${clip.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
      downloadBlob(blob, filename);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingClips(prev => {
        const newSet = new Set(prev);
        newSet.delete(clip.id);
        return newSet;
      });
    }
  };

  const handleDownloadSelected = async () => {
    const selectedClips = clips.filter(clip => clip.selected);
    if (selectedClips.length === 0) return;

    for (const clip of selectedClips) {
      await handleDownloadClip(clip);
    }
  };

  if (clips.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-12 text-center border border-gray-700">
        <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
          <Play className="w-12 h-12 text-gray-500" />
        </div>
        <p className="text-gray-400 text-lg mb-2">No clips generated yet.</p>
        <p className="text-gray-500 text-sm">Upload a video and click "Analyze & Generate Clips" to get started.</p>
      </div>
    );
  }

  const selectedCount = clips.filter(clip => clip.selected).length;

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
            Generated Clips ({clips.length})
          </h2>
          <p className="text-gray-400 text-sm mt-1">AI-powered highlights from your video</p>
        </div>
        
        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full font-medium">
              {selectedCount} selected
            </span>
            <button
              onClick={handleDownloadSelected}
              disabled={disabled}
              className="btn-primary flex items-center space-x-2 px-4 py-2 text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download All</span>
            </button>
          </div>
        )}
      </div>

      {/* Sort & Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Sort by:</span>
          <button className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-all">
            Engagement
          </button>
          <button className="px-3 py-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all">
            Newest
          </button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span>14 favorites</span>
        </div>
      </div>

      {/* Enhanced Clips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {clips.map((clip) => (
          <div
            key={clip.id}
            className={`group relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden border border-gray-700 hover:border-gray-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 ${
              clip.selected ? 'ring-4 ring-blue-500/30 border-blue-500' : ''
            } ${hoveredClip === clip.id ? 'scale-[1.02]' : ''}`}
            onMouseEnter={() => setHoveredClip(clip.id)}
            onMouseLeave={() => setHoveredClip(null)}
          >
            {/* Enhanced Thumbnail */}
            <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-gray-800 to-black">
              {/* Thumbnail Image/Video */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Play Button */}
              <button
                onClick={() => setPreviewingClip(clip)}
                disabled={disabled}
                className="absolute inset-0 flex items-center justify-center z-20 group-hover:scale-110 transition-all duration-200"
              >
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center hover:bg-white/30 transition-all duration-200 group-hover:scale-110">
                  <Play className="w-8 h-8 ml-1 text-white drop-shadow-lg" />
                </div>
              </button>

              {/* Duration Badge */}
              <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-xl text-white text-xs font-medium border border-white/20">
                {formatTime(clip.durationSec)}
              </div>

              {/* Selection Checkbox */}
              {onClipSelect && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClipSelect(clip.id, !clip.selected);
                  }}
                  disabled={disabled}
                  className={`absolute top-3 left-3 p-2 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/20 ${
                    clip.selected
                      ? 'bg-blue-500/90 text-white shadow-lg shadow-blue-500/25 scale-110'
                      : 'bg-white/10 hover:bg-white/20 group-hover:bg-white/30'
                  }`}
                >
                  {clip.selected ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-white/50 rounded-sm" />
                  )}
                </button>
              )}

              {/* Favorite Button */}
              {onFavoriteClip && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFavoriteClip(clip.id);
                  }}
                  className="absolute top-3 right-3 p-2 rounded-xl transition-all duration-200 bg-white/10 hover:bg-yellow-400/20 hover:border-yellow-400/50 border border-white/20 group-hover:scale-110"
                >
                  <Star className="w-4 h-4 fill-yellow-400/0 group-hover:fill-yellow-400 text-yellow-400/0 group-hover:text-yellow-400 transition-all" />
                </button>
              )}
            </div>

            {/* Enhanced Clip Info */}
            <div className="p-6 space-y-4">
              {/* Title */}
              <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 group-hover:text-blue-400 transition-colors">
                {clip.title}
              </h3>

              {/* Metadata Row */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{formatTime(clip.startSec)} - {formatTime(clip.endSec)}</span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  HD Ready
                </span>
              </div>

              {/* Enhanced Tags */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 text-xs font-medium rounded-xl border border-blue-500/30 backdrop-blur-sm">
                  {getAspectRatioLabel(clip.aspectRatio)}
                </span>
                {clip.hasCaptions && (
                  <span className="px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 text-xs font-medium rounded-xl border border-green-500/30">
                    Captions
                  </span>
                )}
                {clip.hasMemeHook && (
                  <span className="px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 text-xs font-medium rounded-xl border border-purple-500/30">
                    Meme Hook
                  </span>
                )}
                <span className="px-3 py-1.5 bg-gray-700/50 text-gray-300 text-xs font-medium rounded-xl border border-gray-500/30">
                  {clip.template}
                </span>
              </div>

              {/* Modern Scores */}
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-600/50">
                  <span className="text-gray-400 font-medium text-sm">Engagement Score</span>
                  <span className={`font-bold text-sm ${getScoreColor(clip.scores.engagement)}`}>
                    {getScoreLabel(clip.scores.engagement)}
                    <span className="ml-1 text-gray-400 font-normal">({Math.round(clip.scores.engagement * 100)}%)</span>
                  </span>
                </div>
                <div className="w-full bg-gray-800/50 rounded-full h-1.5 border border-gray-700/50">
                  <div 
                    className={`bg-gradient-to-r h-1.5 rounded-full transition-all duration-500 ${getScoreColor(clip.scores.engagement)}`}
                    style={{ width: `${Math.round(clip.scores.engagement * 100)}%` }}
                  />
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="flex gap-2 pt-2">
                {onEditClip && (
                  <button
                    onClick={() => onEditClip(clip)}
                    disabled={disabled}
                    className="flex-1 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white py-3 px-4 rounded-xl font-medium text-sm transition-all border border-gray-500/50 hover:shadow-lg hover:shadow-gray-500/25 flex items-center justify-center space-x-2 group/edit"
                    title="Edit Clip"
                  >
                    <Edit3 className="w-4 h-4 group-hover/edit:rotate-12 transition-transform" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={() => setPreviewingClip(clip)}
                  disabled={disabled}
                  className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white py-3 px-4 rounded-xl font-medium text-sm transition-all hover:shadow-lg hover:shadow-white/10 flex items-center justify-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => handleDownloadClip(clip)}
                  disabled={disabled || downloadingClips.has(clip.id)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:shadow-blue-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloadingClips.has(clip.id) ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>DL</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </>
                  )}
                </button>

                {/* NEW: delete button using Trash2 */}
                {onDeleteClip && (
                  <button
                    onClick={() => onDeleteClip(clip.id)}
                    disabled={disabled}
                    className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/30 flex items-center justify-center"
                    title="Delete clip"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal - Enhanced */}
      {previewingClip && (
        <PreviewModal
          clip={previewingClip}
          jobId={jobId}
          onClose={() => setPreviewingClip(null)}
        />
      )}
    </div>
  );
};

// Enhanced Preview Modal
interface PreviewModalProps {
  clip: GeneratedClip;
  jobId: string;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ clip, jobId, onClose }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = clip.startSec;
    }
  }, [clip.startSec]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.currentTime >= clip.endSec) {
        videoRef.current.pause();
        videoRef.current.currentTime = clip.startSec;
        setIsPlaying(false);
      }
    }
  };

  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const progress = ((currentTime - clip.startSec) / (clip.endSec - clip.startSec)) * 100;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl max-w-6xl w-full max-h-[95vh] overflow-hidden border-4 border-gray-700/50 shadow-2xl shadow-black/50">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-900/90 to-transparent backdrop-blur-lg border-b border-gray-700/50">
          <div className="space-y-1">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-400 to-purple-400 bg-clip-text text-transparent">
              {clip.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>{formatTime(clip.startSec)} - {formatTime(clip.endSec)}</span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                HD Preview
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Enhanced Video Player */}
        <div className="relative bg-gradient-to-b from-black to-gray-900">
          <video
            ref={videoRef}
            src={videoApi.getClipDownloadUrl(jobId, clip.id)}
            className="w-full h-[60vh] object-contain"
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          
          {/* Enhanced Controls Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <button
              onClick={handlePlay}
              className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-gradient-to-t from-black/70 via-black/0 hover:from-black/80 transition-all duration-200"
            >
              <div className="p-6 backdrop-blur-sm rounded-2xl bg-white/20 hover:bg-white/30 transition-all duration-200 hover:scale-110">
                {isPlaying ? (
                  <X className="w-12 h-12 text-white drop-shadow-2xl" />
                ) : (
                  <Play className="w-12 h-12 ml-2 text-white drop-shadow-2xl" />
                )}
              </div>
            </button>

            {/* Enhanced Progress Bar */}
            <div className="absolute bottom-8 left-6 right-6 bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
              <div className="flex items-center space-x-4">
                <span className="text-white text-sm font-medium min-w-[80px]">
                  {formatTime(currentTime - clip.startSec)} / {formatTime(clip.durationSec)}
                </span>
                <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-full h-2 border border-white/20 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full shadow-inner transition-all duration-300 relative overflow-hidden"
                    style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                  >
                    <div className="absolute -right-1 top-0 w-2 h-2 bg-white rounded-full shadow-lg shadow-white/50" />
                  </div>
                </div>
                <span className="text-white text-sm font-mono">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="p-6 bg-gray-900/50 backdrop-blur-sm border-t border-gray-700/50">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 rounded-xl border border-blue-500/30 text-xs font-medium">
                {clip.aspectRatio}
              </span>
              {clip.hasCaptions && (
                <span className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-xl border border-green-500/30 text-xs font-medium">
                  Auto Captions
                </span>
              )}
              <span className="px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-xl border border-gray-500/30 text-xs font-medium">
                {clip.template}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Engagement: {Math.round(clip.scores.engagement * 100)}%</span>
              <div className="w-20 bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getScoreColor(clip.scores.engagement)}`}
                  style={{ width: `${Math.round(clip.scores.engagement * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
