import React, { useState, useRef } from 'react'
import VideoUploader from './components/VideoUploader'
import VideoMetadata from './components/VideoMetadata'
import CropTool from './components/CropTool'
import FrameExtractor from './components/FrameExtractor'
import FrameGallery from './components/FrameGallery'
import './App.css'

export default function App() {
  const [video, setVideo] = useState(null)
  const [frames, setFrames] = useState([])
  const [error, setError] = useState('')
  const [showCropTool, setShowCropTool] = useState(false)
  const [cropSettings, setCropSettings] = useState(null)

  const handleVideoUpload = (videoFile) => {
    setVideo(videoFile)
    setFrames([])
    setError('')
    setCropSettings(null)
  }

  const handleError = (errorMsg) => {
    setError(errorMsg)
  }

  const handleFramesExtracted = (extractedFrames) => {
    setFrames(extractedFrames)
  }

  const handleCropApply = (settings) => {
    setCropSettings(settings)
    setShowCropTool(false)
  }

  return (
    <div className="app-container">
      <div className="app-card">
        <h1>Video Frame Extractor</h1>
        
        {!video ? (
          <VideoUploader onUpload={handleVideoUpload} onError={handleError} />
        ) : (
          <>
            <div className="video-info">
              <p>Video: <strong>{video.name}</strong></p>
              <button 
                className="btn-reset"
                onClick={() => {
                  setVideo(null)
                  setFrames([])
                  setError('')
                  setCropSettings(null)
                }}
              >
                Upload Different Video
              </button>
            </div>
            
            <VideoMetadata video={video} />
            
            <div className="crop-section">
              <button 
                className="btn-crop"
                onClick={() => setShowCropTool(true)}
              >
                ✂ Crop to 4:3 Ratio
              </button>
              {cropSettings && (
                <div className="crop-status">
                  ✓ Crop applied (Fill: {cropSettings.fillColor}, Scale: {cropSettings.scale.toFixed(2)}x)
                </div>
              )}
            </div>
            
            <FrameExtractor 
              video={video} 
              onFramesExtracted={handleFramesExtracted}
              onError={handleError}
              cropSettings={cropSettings}
            />
            
            {frames.length > 0 && (
              <FrameGallery frames={frames} />
            )}
          </>
        )}
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>

      {showCropTool && (
        <CropTool 
          video={video}
          onCropApply={handleCropApply}
          onCancel={() => setShowCropTool(false)}
        />
      )}
    </div>
  )
}
