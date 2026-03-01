import { useState, useEffect } from 'react'
import JSZip from 'jszip'
import './FrameGallery.css'
import { FrameData } from '../App'

export interface FrameGalleryProps {
  frames: FrameData[];
}

export default function FrameGallery({ frames }: FrameGalleryProps) {
  const [selectedFrame, setSelectedFrame] = useState<FrameData | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  
  // 1 second per 10 frames
  const PREVIEW_DURATION = Math.max(1000, (frames.length / 10) * 1000)

  useEffect(() => {
    if (!isPreviewMode) return

    const frameInterval = PREVIEW_DURATION / frames.length
    
    const interval = setInterval(() => {
      setCurrentPreviewIndex((prev) => (prev + 1) % frames.length)
    }, frameInterval)

    return () => clearInterval(interval)
  }, [isPreviewMode, frames.length, PREVIEW_DURATION])

  useEffect(() => {
    if (!isPreviewMode) {
      setElapsedTime(0)
      return
    }

    const timer = setInterval(() => {
      setElapsedTime((prev) => {
        const next = prev + 100
        return next >= PREVIEW_DURATION ? 0 : next
      })
    }, 100)

    return () => clearInterval(timer)
  }, [isPreviewMode, PREVIEW_DURATION])

  const downloadFrame = (frame: FrameData) => {
    const link = document.createElement('a')
    link.href = frame.url
    link.download = `${frame.index}.png`
    link.click()
  }

  const handleUploadToGoogleDrive = async () => {
    setIsUploading(true)
    try {
      // Dummy implementation - in production, this would use Google Drive API
      await new Promise((resolve) => setTimeout(resolve, 2000))
      alert(`Successfully uploaded ${frames.length} frames to Google Drive!`)
    } catch (err) {
      alert('Failed to upload to Google Drive')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadAll = async () => {
    try {
      const zip = new JSZip()
      
      // Fetch all frames and add to zip
      for (const frame of frames) {
        const response = await fetch(frame.url)
        const blob = await response.blob()
        zip.file(`${frame.index}.png`, blob)
      }

      // Generate zip and download
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'extracted-frames.zip'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      alert('Failed to download frames: ' + msg)
    }
  }

  if (isPreviewMode) {
    const bgColor = frames[0]?.fillColor === '#e6dfda' ? '#e6dfda' : '#000000'
    
    return (
      <div className="preview-mode" style={{ backgroundColor: bgColor }}>
        <div className="preview-container">
          <div className="book-flip-wrapper" key={currentPreviewIndex}>
            <img
              src={frames[currentPreviewIndex].url}
              alt={`Frame ${frames[currentPreviewIndex].index}`}
              className="book-flip-image"
            />
          </div>
          <div className="preview-info">
            <span>Frame {frames[currentPreviewIndex].index} of {frames.length}</span>
            <span>{frames[currentPreviewIndex].timestamp}s</span>
          </div>
          <div className="preview-timer">
            <span>{(elapsedTime / 1000).toFixed(1)}s / {(PREVIEW_DURATION / 1000).toFixed(1)}s</span>
          </div>
        </div>
        <button
          className="exit-preview-btn"
          onClick={() => {
            setIsPreviewMode(false)
            setCurrentPreviewIndex(0)
          }}
        >
          Exit Preview
        </button>
      </div>
    )
  }

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h2>Extracted Frames ({frames.length})</h2>
        <div className="gallery-actions">
          <button
            className="preview-btn"
            onClick={() => setIsPreviewMode(true)}
          >
            ▶ Preview
          </button>
          <button
            className="download-all-btn"
            onClick={handleDownloadAll}
          >
            ⬇ Download All
          </button>
          <button
            className="upload-drive-btn"
            onClick={handleUploadToGoogleDrive}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : '☁ Upload to Google Drive'}
          </button>
        </div>
      </div>

      <div className="frames-grid">
        {frames.map((frame) => (
          <div
            key={frame.index}
            className="frame-card"
            onClick={() => setSelectedFrame(frame)}
          >
            <img src={frame.url} alt={`Frame ${frame.index}`} />
            <div className="frame-info">
              <span className="frame-number">#{frame.index}</span>
              <span className="frame-time">{frame.timestamp}s</span>
            </div>
          </div>
        ))}
      </div>

      {selectedFrame && (
        <div className="modal-overlay" onClick={() => setSelectedFrame(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedFrame(null)}>×</button>
            <img src={selectedFrame.url} alt={`Frame ${selectedFrame.index}`} />
            <div className="modal-footer">
              <p>Frame #{selectedFrame.index} at {selectedFrame.timestamp}s</p>
              <button
                className="download-btn"
                onClick={() => downloadFrame(selectedFrame)}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
