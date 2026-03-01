import { useState } from 'react'
import './FrameExtractor.css'
import { FrameData, EditSettings } from '../App'

const FRAME_COUNTS = [20, 30, 40]

export interface FrameExtractorProps {
  video: File;
  onFramesExtracted: (frames: FrameData[]) => void;
  onError: (msg: string) => void;
  editSettings: EditSettings | null;
}

export default function FrameExtractor({ video, onFramesExtracted, onError, editSettings }: FrameExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [progress, setProgress] = useState(0)

  const extractFrames = async (frameCount: number) => {
    setIsExtracting(true)
    setProgress(0)

    try {
      const videoElement = document.createElement('video')
      videoElement.src = URL.createObjectURL(video)
      
      await new Promise((resolve, reject) => {
        videoElement.onloadedmetadata = resolve
        videoElement.onerror = reject
      })

      const duration = editSettings ? (editSettings.trimEnd - editSettings.trimStart) : videoElement.duration
      const interval = duration / frameCount
      const startTime = editSettings ? editSettings.trimStart : 0

      const frames: FrameData[] = []
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) throw new Error('Could not get canvas context')

      // Set canvas to 4:3 ratio if crop is applied
      if (editSettings) {
        canvas.width = 640
        canvas.height = 480
      } else {
        canvas.width = videoElement.videoWidth
        canvas.height = videoElement.videoHeight
      }

      for (let i = 0; i < frameCount; i++) {
        const time = startTime + i * interval
        videoElement.currentTime = time

        await new Promise<void>((resolve) => {
          videoElement.onseeked = () => {
            if (editSettings) {
              // Fill with selected color
              ctx.fillStyle = editSettings.fillColor
              ctx.fillRect(0, 0, canvas.width, canvas.height)

              // Draw scaled and offset video
              const scaledWidth = videoElement.videoWidth * editSettings.scale
              const scaledHeight = videoElement.videoHeight * editSettings.scale
              const x = (canvas.width - scaledWidth) / 2 + editSettings.offsetX
              const y = (canvas.height - scaledHeight) / 2 + editSettings.offsetY

              ctx.drawImage(videoElement, x, y, scaledWidth, scaledHeight)
            } else {
              ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
            }

            canvas.toBlob((blob) => {
              if (!blob) return
              const url = URL.createObjectURL(blob)
              frames.push({
                url,
                timestamp: time.toFixed(2),
                index: i + 1,
                fillColor: editSettings?.fillColor || null
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
      const msg = err instanceof Error ? err.message : String(err)
      onError('Failed to extract frames: ' + msg)
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
