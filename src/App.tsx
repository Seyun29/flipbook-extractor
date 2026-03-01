import { useState } from 'react'
import VideoUploader from './components/VideoUploader'
import VideoMetadata from './components/VideoMetadata'
import VideoEditor from './components/VideoEditor'
import FrameExtractor from './components/FrameExtractor'
import FrameGallery from './components/FrameGallery'
import './App.css'

export interface FrameData {
  url: string;
  timestamp: string;
  index: number;
  fillColor: string | null;
}

export interface EditSettings {
  scale: number;
  offsetX: number;
  offsetY: number;
  fillColor: string;
  ratio: number;
  trimStart: number;
  trimEnd: number;
}

export default function App() {
  const [video, setVideo] = useState<File | null>(null)
  const [frames, setFrames] = useState<FrameData[]>([])
  const [error, setError] = useState<string>('')
  const [showVideoEditor, setShowVideoEditor] = useState<boolean>(false)
  const [editSettings, setEditSettings] = useState<EditSettings | null>(null)

  const handleVideoUpload = (videoFile: File) => {
    setVideo(videoFile)
    setFrames([])
    setError('')
    setEditSettings(null)
  }

  const handleError = (errorMsg: string) => {
    setError(errorMsg)
  }

  const handleFramesExtracted = (extractedFrames: FrameData[]) => {
    setFrames(extractedFrames)
  }

  const handleEditApply = (settings: EditSettings) => {
    setEditSettings(settings)
    setShowVideoEditor(false)
    setFrames([]) // reset frames on edit update
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
                  setEditSettings(null)
                }}
              >
                Upload Different Video
              </button>
            </div>
            
            <VideoMetadata video={video} />
            
            <div className="crop-section">
              <button 
                className="btn-crop"
                onClick={() => setShowVideoEditor(true)}
              >
                ✂ Edit & Crop Video
              </button>
              {editSettings && (
                <div className="crop-status">
                  ✓ Edits applied (Trim: {editSettings.trimStart.toFixed(1)}s - {editSettings.trimEnd.toFixed(1)}s, Scale: {editSettings.scale.toFixed(2)}x)
                </div>
              )}
            </div>
            
            <FrameExtractor 
              video={video} 
              onFramesExtracted={handleFramesExtracted}
              onError={handleError}
              editSettings={editSettings}
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

      {showVideoEditor && video && (
        <VideoEditor 
          video={video}
          initialSettings={editSettings}
          onEditApply={handleEditApply}
          onCancel={() => setShowVideoEditor(false)}
        />
      )}
    </div>
  )
}
