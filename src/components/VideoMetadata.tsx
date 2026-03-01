import { useEffect, useState } from 'react'
import './VideoMetadata.css'

export interface VideoMetadataProps {
  video: File;
}

export interface MetadataInfo {
  filename: string;
  filesize: string;
  type: string;
  duration: string;
  durationSeconds: number;
  width: number;
  height: number;
  resolution: string;
  aspectRatio: string;
}

export default function VideoMetadata({ video }: VideoMetadataProps) {
  const [metadata, setMetadata] = useState<MetadataInfo | null>(null)

  useEffect(() => {
    const extractMetadata = async () => {
      const videoElement = document.createElement('video')
      videoElement.src = URL.createObjectURL(video)

      await new Promise<void>((resolve) => {
        videoElement.onloadedmetadata = () => {
          const data: MetadataInfo = {
            filename: video.name,
            filesize: formatFileSize(video.size),
            type: video.type || 'Unknown',
            duration: formatDuration(videoElement.duration),
            durationSeconds: videoElement.duration,
            width: videoElement.videoWidth,
            height: videoElement.videoHeight,
            resolution: `${videoElement.videoWidth}x${videoElement.videoHeight}`,
            aspectRatio: (videoElement.videoWidth / videoElement.videoHeight).toFixed(2),
          }
          setMetadata(data)
          resolve()
        }
      })
    }

    extractMetadata()
  }, [video])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    return `${minutes}m ${secs}s`
  }

  if (!metadata) {
    return <div className="metadata-loading">Loading metadata...</div>
  }

  return (
    <div className="metadata-container">
      <h3>Video Metadata</h3>
      <div className="metadata-grid">
        <div className="metadata-item">
          <span className="label">Filename</span>
          <span className="value">{metadata.filename}</span>
        </div>
        <div className="metadata-item">
          <span className="label">File Size</span>
          <span className="value">{metadata.filesize}</span>
        </div>
        <div className="metadata-item">
          <span className="label">Format</span>
          <span className="value">{metadata.type}</span>
        </div>
        <div className="metadata-item">
          <span className="label">Duration</span>
          <span className="value">{metadata.duration}</span>
        </div>
        <div className="metadata-item">
          <span className="label">Resolution</span>
          <span className="value">{metadata.resolution}</span>
        </div>
        <div className="metadata-item">
          <span className="label">Aspect Ratio</span>
          <span className="value">{metadata.aspectRatio}:1</span>
        </div>
      </div>
    </div>
  )
}
