import React, { useState, useRef } from 'react'
import './FrameExtractor.css'

const FRAME_COUNTS = [20, 30, 40]

export default function FrameExtractor({ video, onFramesExtracted, onError, cropSettings }) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const extractFrames = async (frameCount) => {
    setIsExtracting(true)
    setProgress(0)

    try {
      const videoElement = document.createElement('video')
      videoElement.src = URL.createObjectURL(video)
      
      await new Promise((resolve, reject) => {
        videoElement.onloadedmetadata = resolve
        videoElement.onerror = reject
      })

      const duration = videoElement.duration
      const interval = duration / frameCount
      const frames = []
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      // Set canvas to 9:7 ratio if crop is applied
      if (cropSettings) {
        canvas.width = 540
        canvas.height = 420
      } else {
        canvas.width = videoElement.videoWidth
        canvas.height = videoElement.videoHeight
      }

      for (let i = 0; i < frameCount; i++) {
        const time = i * interval
        videoElement.currentTime = time

        await new Promise((resolve) => {
          videoElement.onseeked = () => {
            if (cropSettings) {
              // Fill with selected color
              ctx.fillStyle = cropSettings.fillColor
              ctx.fillRect(0, 0, canvas.width, canvas.height)

              // Draw scaled and offset video
              const scaledWidth = videoElement.videoWidth * cropSettings.scale
              const scaledHeight = videoElement.videoHeight * cropSettings.scale
              const x = (canvas.width - scaledWidth) / 2 + cropSettings.offsetX
              const y = (canvas.height - scaledHeight) / 2 + cropSettings.offsetY

              ctx.drawImage(videoElement, x, y, scaledWidth, scaledHeight)
            } else {
              ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
            }

            canvas.toBlob((blob) => {
              const url = URL.createObjectURL(blob)
              frames.push({
                url,
                timestamp: time.toFixed(2),
                index: i + 1,
                fillColor: cropSettings?.fillColor || null
              })
              setProgress(Math.round(((i + 1) / frameCount) * 100))
              resolve()
            }, 'image/png')
          }
        })
      }

      onFramesExtracted(frames)
      setProgress(100)
    } catch (err) {
      onError('Failed to extract frames: ' + err.message)
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <div className="extractor-container">
      <div className="buttons-group">
        {FRAME_COUNTS.map((count) => (
          <button
            key={count}
            className="extract-btn"
            onClick={() => extractFrames(count)}
            disabled={isExtracting}
          >
            Extract to {count} frames
          </button>
        ))}
      </div>

      {isExtracting && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-text">{progress}%</p>
        </div>
      )}
    </div>
  )
}
