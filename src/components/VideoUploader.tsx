import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import './VideoUploader.css'

const MAX_DURATION = 120 // 2 minutes in seconds

export interface VideoUploaderProps {
  onUpload: (file: File) => void;
  onError: (msg: string) => void;
}

export default function VideoUploader({ onUpload, onError }: VideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const validateVideo = (file: File) => {
    // Check file type
    if (!file.type.startsWith('video/')) {
      onError('Please upload a valid video file')
      return false
    }

    // Check file size (optional, e.g., max 500MB)
    const maxSize = 500 * 1024 * 1024
    if (file.size > maxSize) {
      onError('Video file is too large (max 500MB)')
      return false
    }

    return true
  }

  const checkVideoDuration = (file: File) => {
    return new Promise<boolean>((resolve) => {
      const video = document.createElement('video')
      video.onloadedmetadata = () => {
        if (video.duration > MAX_DURATION) {
          onError(`Video duration exceeds 2 minutes (${Math.round(video.duration)}s)`)
          resolve(false)
        } else {
          resolve(true)
        }
      }
      video.onerror = () => {
        onError('Failed to load video metadata')
        resolve(false)
      }
      video.src = URL.createObjectURL(file)
    })
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!validateVideo(file)) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const isValid = await checkVideoDuration(file)
    if (isValid) {
      onUpload(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    const file = files?.[0]
    if (!file) return

    if (!validateVideo(file)) {
      return
    }

    const isValid = await checkVideoDuration(file)
    if (isValid) {
      onUpload(file)
    }
  }

  return (
    <div className="uploader-container">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="file-input"
        id="video-input"
      />
      <label
        htmlFor="video-input"
        className={`upload-label ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-icon">📹</div>
        <p>Click to upload or drag and drop</p>
        <span className="upload-hint">Max 2 minutes duration</span>
      </label>
    </div>
  )
}
