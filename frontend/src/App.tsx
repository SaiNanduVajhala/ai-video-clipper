import { useState, useEffect } from 'react';
import { SourcePanel } from './components/SourcePanel';
import { OptionsPanel } from './components/OptionsPanel';
import { ResultsGrid } from './components/ResultsGrid';
import { videoApi, healthApi } from './services/api';
import { ClipOptions, GeneratedClip, UploadResponse, HealthResponse } from './types';
import { Brain, Settings, Play, RotateCcw, CheckCircle } from 'lucide-react';

// Default options
const defaultOptions: ClipOptions = {
  sourceType: 'file',
  timeStartSec: 0,
  timeEndSec: 300, // 5 minutes default
  clipLengthPreset: 'short',
  clipLengthMinSec: 10,
  clipLengthMaxSec: 25,
  aspectRatio: '9:16',
  template: 'clean',
  memeHook: false,
  gameMode: false,
  hookTitle: false,
  callToAction: false,
  backgroundMusic: false,
  captionsEnabled: true,
  wordsPerCaption: 5,
  highlightKeywords: true,
  autoThumbnail: true
};

function App() {
  // State
  const [options, setOptions] = useState<ClipOptions>(defaultOptions);
  const [selectedSource, setSelectedSource] = useState<{ type: 'file' | 'url'; fileId?: string; url?: string } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadResponse | null>(null);
  const [clips, setClips] = useState<GeneratedClip[]>([]);
  const [jobId, setJobId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Check backend health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await healthApi.checkHealth();
        setHealthStatus(health);
      } catch (error) {
        console.error('Backend health check failed:', error);
        setError('Unable to connect to backend. Please ensure the backend server is running.');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Poll for job status when analyzing
  useEffect(() => {
    if (!jobId || !isAnalyzing) return;

    const pollStatus = async () => {
      try {
        const jobStatus = await videoApi.getJobStatus(jobId);
        
        if (jobStatus.clips && jobStatus.clips.length > 0) {
          setClips(jobStatus.clips);
          setIsAnalyzing(false);
          setSuccess(`Successfully generated ${jobStatus.clips.length} clips!`);
        }
      } catch (error) {
        console.error('Failed to get job status:', error);
        // Don't show error to user during polling, just continue
      }
    };

    const interval = setInterval(pollStatus, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [jobId, isAnalyzing]);

  const handleAnalyze = async () => {
    if (!selectedSource) {
      setError('Please select a video source first');
      return;
    }

    setError('');
    setSuccess('');
    setIsAnalyzing(true);
    setClips([]);

    try {
      // Update options with selected source
      const analysisOptions = {
        ...options,
        sourceType: selectedSource.type,
        sourceFileId: selectedSource.fileId,
        sourceUrl: selectedSource.url
      };

      const response = await videoApi.analyzeVideo(selectedSource, analysisOptions);
      setJobId(response.jobId);
      
      // Set initial video metadata
      if (uploadedFile?.metadata) {
        // Update time range based on video duration
        const duration = uploadedFile.metadata.durationSec;
        setOptions(prev => ({
          ...prev,
          timeEndSec: Math.min(prev.timeEndSec, duration)
        }));
      }

    } catch (error: any) {
      console.error('Analysis failed:', error);
      setIsAnalyzing(false);
      
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to analyze video. Please try again.');
      }
    }
  };

  const handleReset = () => {
    setSelectedSource(null);
    setUploadedFile(null);
    setClips([]);
    setJobId('');
    setOptions(defaultOptions);
    setError('');
    setSuccess('');
    setIsAnalyzing(false);
  };

  const handleClipSelect = (clipId: string, selected: boolean) => {
    setClips(prev => prev.map(clip => 
      clip.id === clipId ? { ...clip, selected } : clip
    ));
  };

  const canAnalyze = selectedSource && !isAnalyzing && !error;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Brain className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl font-bold text-white">ClipPilot Local</h1>
            </div>
            <div className="flex items-center space-x-4">
              {healthStatus && (
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    healthStatus.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-gray-300">
                    Backend: {healthStatus.aiProvider}
                  </span>
                </div>
              )}
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-900 border border-green-700 rounded-lg text-green-200">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Source and Options */}
          <div className="lg:col-span-1 space-y-8">
            {/* Source Panel */}
            <SourcePanel
              onSourceSelected={(source) => {
                setSelectedSource(source);
                setOptions(prev => ({ ...prev, sourceType: source.type }));
              }}
              disabled={isAnalyzing}
            />

            {/* Options Panel */}
            <OptionsPanel
              options={options}
              onOptionsChange={setOptions}
              disabled={isAnalyzing}
              videoDuration={uploadedFile?.metadata?.durationSec}
            />


            {/* Generate Button */}
            <div className="space-y-4">
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  canAnalyze
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Analyzing Video...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Analyze & Generate Clips</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                disabled={isAnalyzing}
                className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            {isAnalyzing && (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <div className="animate-spin w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-white font-medium mb-2">Analyzing your video...</p>
                <p className="text-gray-400 text-sm">
                  This may take a few minutes depending on video length and complexity.
                </p>
                <div className="mt-4 space-y-2 text-left max-w-md mx-auto">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-gray-300 text-sm">Video uploaded</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-300 text-sm">Transcribing audio...</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-gray-600 rounded-full"></div>
                    <span className="text-gray-500 text-sm">Finding highlights...</span>
                  </div>
                </div>
              </div>
            )}

            {!isAnalyzing && (
              <ResultsGrid
                clips={clips}
                jobId={jobId}
                onClipSelect={handleClipSelect}
                disabled={isAnalyzing}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>
              ClipPilot Local - Private AI Video Clipping
            </div>
            <div>
              {healthStatus && (
                <span>
                  Status: {healthStatus.status} • FFmpeg: {healthStatus.ffmpeg}
                </span>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
