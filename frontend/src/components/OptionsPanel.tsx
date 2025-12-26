import React from 'react';
import { ClipOptions } from '../types';

interface OptionsPanelProps {
  options: ClipOptions;
  onOptionsChange: (options: ClipOptions) => void;
  disabled?: boolean;
  videoDuration?: number;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({
  options,
  onOptionsChange,
  disabled = false,
  videoDuration
}) => {
  const updateOption = <K extends keyof ClipOptions>(
    key: K,
    value: ClipOptions[K]
  ) => {
    onOptionsChange({ ...options, [key]: value });
  };

  const getTimeRangeValidation = () => {
    if (!videoDuration) return { valid: true, message: '' };
    
    const { timeStartSec, timeEndSec } = options;
    if (timeStartSec >= timeEndSec) {
      return { valid: false, message: 'Start time must be less than end time' };
    }
    if (timeEndSec > videoDuration) {
      return { valid: false, message: `End time exceeds video duration (${Math.floor(videoDuration / 60)}:${(videoDuration % 60).toString().padStart(2, '0')})` };
    }
    return { valid: true, message: '' };
  };

  const timeValidation = getTimeRangeValidation();

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <h2 className="text-xl font-semibold text-white mb-4">Processing Options</h2>

      {/* Time Range */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Time Range</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Start Time (seconds)
            </label>
            <input
              type="number"
              min="0"
              max={videoDuration || 9999}
              step="1"
              value={options.timeStartSec}
              onChange={(e) => updateOption('timeStartSec', Math.max(0, parseInt(e.target.value) || 0))}
              disabled={disabled}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              End Time (seconds)
            </label>
            <input
              type="number"
              min="0"
              max={videoDuration || 9999}
              step="1"
              value={options.timeEndSec}
              onChange={(e) => updateOption('timeEndSec', Math.max(0, parseInt(e.target.value) || 0))}
              disabled={disabled}
              className="input-field"
            />
          </div>
        </div>
        {videoDuration && (
          <button
            onClick={() => updateOption('timeEndSec', videoDuration)}
            disabled={disabled}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Use full video duration ({Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')})
          </button>
        )}
        {!timeValidation.valid && (
          <p className="text-red-400 text-sm">{timeValidation.message}</p>
        )}
      </div>

      {/* Clip Length */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Clip Length</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { value: 'short', label: 'Short', desc: '10-25s' },
            { value: 'medium', label: 'Medium', desc: '25-45s' },
            { value: 'long', label: 'Long', desc: '45-90s' },
            { value: 'custom', label: 'Custom', desc: 'Custom' }
          ].map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => updateOption('clipLengthPreset', value as any)}
              disabled={disabled}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                options.clipLengthPreset === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {label}
              <span className="block text-xs opacity-75">{desc}</span>
            </button>
          ))}
        </div>
        
        {options.clipLengthPreset === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Min Duration (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={options.clipLengthMinSec || 10}
                onChange={(e) => updateOption('clipLengthMinSec', parseInt(e.target.value) || 10)}
                disabled={disabled}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Max Duration (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={options.clipLengthMaxSec || 60}
                onChange={(e) => updateOption('clipLengthMaxSec', parseInt(e.target.value) || 60)}
                disabled={disabled}
                className="input-field"
              />
            </div>
          </div>
        )}
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Aspect Ratio</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { value: '9:16', label: '9:16', desc: 'Vertical' },
            { value: '16:9', label: '16:9', desc: 'Horizontal' },
            { value: '1:1', label: '1:1', desc: 'Square' },
            { value: 'auto', label: 'Auto', desc: 'Original' }
          ].map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => updateOption('aspectRatio', value as any)}
              disabled={disabled}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                options.aspectRatio === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {label}
              <span className="block text-xs opacity-75">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Template */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Template</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'clean', label: 'Clean', desc: 'Simple' },
            { value: 'creator', label: 'Creator', desc: 'Social' },
            { value: 'meme', label: 'Meme', desc: 'Fun' }
          ].map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => updateOption('template', value as any)}
              disabled={disabled}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                options.template === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {label}
              <span className="block text-xs opacity-75">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Advanced Options</h3>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={options.memeHook}
              onChange={(e) => updateOption('memeHook', e.target.checked)}
              disabled={disabled}
              className="checkbox-field"
            />
            <span className="text-gray-300">Meme Hook</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={options.gameMode}
              onChange={(e) => updateOption('gameMode', e.target.checked)}
              disabled={disabled}
              className="checkbox-field"
            />
            <span className="text-gray-300">Game Mode</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={options.hookTitle}
              onChange={(e) => updateOption('hookTitle', e.target.checked)}
              disabled={disabled}
              className="checkbox-field"
            />
            <span className="text-gray-300">Hook Title</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={options.callToAction}
              onChange={(e) => updateOption('callToAction', e.target.checked)}
              disabled={disabled}
              className="checkbox-field"
            />
            <span className="text-gray-300">Call to Action Overlay</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={options.backgroundMusic}
              onChange={(e) => updateOption('backgroundMusic', e.target.checked)}
              disabled={disabled}
              className="checkbox-field"
            />
            <span className="text-gray-300">Background Music</span>
          </label>
        </div>
      </div>

      {/* Captions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Captions</h3>
        
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={options.captionsEnabled}
            onChange={(e) => updateOption('captionsEnabled', e.target.checked)}
            disabled={disabled}
            className="checkbox-field"
          />
          <span className="text-gray-300">Auto Captions</span>
        </label>
        
        {options.captionsEnabled && (
          <div className="space-y-3 pl-6">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Words per Caption
              </label>
              <input
                type="number"
                min="3"
                max="10"
                value={options.wordsPerCaption}
                onChange={(e) => updateOption('wordsPerCaption', parseInt(e.target.value) || 5)}
                disabled={disabled}
                className="input-field w-32"
              />
            </div>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={options.highlightKeywords}
                onChange={(e) => updateOption('highlightKeywords', e.target.checked)}
                disabled={disabled}
                className="checkbox-field"
              />
              <span className="text-gray-300">Highlight Keywords</span>
            </label>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Thumbnails</h3>
        
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={options.autoThumbnail}
            onChange={(e) => updateOption('autoThumbnail', e.target.checked)}
            disabled={disabled}
            className="checkbox-field"
          />
          <span className="text-gray-300">Auto Thumbnail</span>
        </label>
      </div>
    </div>
  );
};
