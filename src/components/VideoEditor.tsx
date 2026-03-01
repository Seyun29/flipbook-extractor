import { useState, useRef, useEffect, MouseEvent, TouchEvent, WheelEvent } from 'react'
import './VideoEditor.css'
import { EditSettings } from '../App'

export interface VideoEditorProps {
  video: File;
  initialSettings: EditSettings | null;
  onEditApply: (settings: EditSettings) => void;
  onCancel: () => void;
}

export default function VideoEditor({ video, initialSettings, onEditApply, onCancel }: VideoEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const [fillColor, setFillColor] = useState(initialSettings?.fillColor ?? '#ffffff')
  const [scale, setScale] = useState(initialSettings?.scale ?? 1)
  const [offsetX, setOffsetX] = useState(initialSettings?.offsetX ?? 0)
  const [offsetY, setOffsetY] = useState(initialSettings?.offsetY ?? 0)
  const [trimStart, setTrimStart] = useState(initialSettings?.trimStart ?? 0)
  const [trimEnd, setTrimEnd] = useState(initialSettings?.trimEnd ?? 0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoWidth, setVideoWidth] = useState(0)
  const [videoHeight, setVideoHeight] = useState(0)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const trackRef = useRef<HTMLDivElement>(null)
  const isDraggingTrim = useRef<'start' | 'end' | null>(null)

  const CANVAS_WIDTH = 640
  const CANVAS_HEIGHT = 480
  const RATIO = 4 / 3
  const MIN_OPACITY = 0.15 // 최소 투명도

  useEffect(() => {
    const videoElement = document.createElement('video')
    videoElement.src = URL.createObjectURL(video)
    
    videoElement.onloadedmetadata = () => {
      const dur = videoElement.duration
      setVideoDuration(dur)
      if (!initialSettings && trimEnd === 0) {
        setTrimEnd(dur)
      }
      setVideoWidth(videoElement.videoWidth)
      setVideoHeight(videoElement.videoHeight)
      videoElementRef.current = videoElement
      // Seek to a small offset to reliably trigger frame decoding if start is 0
      videoElement.currentTime = initialSettings?.trimStart ?? 0.1

      generateThumbnails(dur, videoElement)
    }

    videoElement.onseeked = () => {
        drawPreview(videoElement, 1, 0, 0, false)
    }

    const generateThumbnails = async (dur: number, sourceVideo: HTMLVideoElement) => {
      const count = 8
      const interval = dur / count
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      // small canvas for thumbnails
      canvas.width = sourceVideo.videoWidth / 4
      canvas.height = sourceVideo.videoHeight / 4

      // Create a separate video element for extracting to not mess with the preview seeked
      const tempVideo = document.createElement('video')
      tempVideo.src = sourceVideo.src
      await new Promise(r => { tempVideo.onloadedmetadata = r })

      const urls: string[] = []
      for (let i = 0; i < count; i++) {
        tempVideo.currentTime = i * interval
        await new Promise<void>((resolve) => {
          tempVideo.onseeked = () => {
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height)
            urls.push(canvas.toDataURL('image/jpeg', 0.5))
            resolve()
          }
        })
      }
      setThumbnails(urls)
    }
  }, [video])

  const drawPreview = (videoElement: HTMLVideoElement, scaleVal: number, offsetXVal: number, offsetYVal: number, isMoving = false) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = fillColor
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const scaledWidth = videoWidth * scaleVal
    const scaledHeight = videoHeight * scaleVal
    const x = (CANVAS_WIDTH - scaledWidth) / 2 + offsetXVal
    const y = (CANVAS_HEIGHT - scaledHeight) / 2 + offsetYVal

    ctx.drawImage(videoElement, x, y, scaledWidth, scaledHeight)

    // Draw crop frame with border radius
    drawRoundedRect(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 12, '#667eea', 2)

    // Draw center guidelines
    drawGuidelines(ctx, x, y, scaledWidth, scaledHeight, isMoving)
  }

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, strokeColor: string, lineWidth: number) => {
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    
    if (typeof ctx.roundRect === 'function') {
      // Use native roundRect if available
      ctx.beginPath()
      ctx.roundRect(x, y, width, height, radius)
      ctx.stroke()
    } else {
      // Fallback: manual implementation
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + width - radius, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
      ctx.lineTo(x + width, y + height - radius)
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
      ctx.lineTo(x + radius, y + height)
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
      ctx.stroke()
    }
  }

  const drawGuidelines = (ctx: CanvasRenderingContext2D, videoX: number, videoY: number, videoWidth: number, videoHeight: number, isMoving: boolean) => {
    const centerX = CANVAS_WIDTH / 2
    const centerY = CANVAS_HEIGHT / 2
    const videoCenterX = videoX + videoWidth / 2
    const videoCenterY = videoY + videoHeight / 2

    const distX = Math.abs(videoCenterX - centerX)
    const distY = Math.abs(videoCenterY - centerY)

    // Calculate opacity based on distance
    const opacityX = isMoving ? Math.max(MIN_OPACITY, 1 - distX / 100) : MIN_OPACITY
    const opacityY = isMoving ? Math.max(MIN_OPACITY, 1 - distY / 100) : MIN_OPACITY

    // Draw vertical center guide
    ctx.strokeStyle = `rgba(255, 68, 68, ${opacityX})`
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(centerX, 0)
    ctx.lineTo(centerX, CANVAS_HEIGHT)
    ctx.stroke()

    // Draw horizontal center guide
    ctx.strokeStyle = `rgba(255, 68, 68, ${opacityY})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    ctx.lineTo(CANVAS_WIDTH, centerY)
    ctx.stroke()

    // Draw video bounds guides (subtle)
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.strokeRect(videoX, videoY, videoWidth, videoHeight)
    ctx.setLineDash([])
  }



  const updatePreview = (newScale: number, newOffsetX: number, newOffsetY: number) => {
    if (videoElementRef.current) {
      drawPreview(videoElementRef.current, newScale, newOffsetX, newOffsetY, isDraggingImage)
    }
  }

  const handleCanvasWheel = (e: WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    const newScale = Math.max(0.1, Math.min(3, scale + delta))
    setScale(newScale)
    updatePreview(newScale, offsetX, offsetY)
  }

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY
    return { x, y }
  }

  const handleCanvasMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY)
    setIsDraggingImage(true)
    setDragStart({ x, y })
  }

  const handleCanvasMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isDraggingImage) return

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY)
    const deltaX = x - dragStart.x
    const deltaY = y - dragStart.y

    let newOffsetX = offsetX + deltaX
    let newOffsetY = offsetY + deltaY

    // Calculate video center position
    const scaledWidth = videoWidth * scale
    const scaledHeight = videoHeight * scale
    const videoCenterX = (CANVAS_WIDTH - scaledWidth) / 2 + newOffsetX + scaledWidth / 2
    const videoCenterY = (CANVAS_HEIGHT - scaledHeight) / 2 + newOffsetY + scaledHeight / 2

    const centerX = CANVAS_WIDTH / 2
    const centerY = CANVAS_HEIGHT / 2

    const distX = Math.abs(videoCenterX - centerX)
    const distY = Math.abs(videoCenterY - centerY)

    // Only snap if very close to center (within 8px) AND user hasn't moved much
    // This allows user to continue dragging even after snapping
    const minSnapDistance = 8
    
    if (distX < minSnapDistance && Math.abs(deltaX) < 3) {
      newOffsetX = centerX - (CANVAS_WIDTH - scaledWidth) / 2 - scaledWidth / 2
    }

    if (distY < minSnapDistance && Math.abs(deltaY) < 3) {
      newOffsetY = centerY - (CANVAS_HEIGHT - scaledHeight) / 2 - scaledHeight / 2
    }

    setOffsetX(newOffsetX)
    setOffsetY(newOffsetY)
    setDragStart({ x, y })
    updatePreview(scale, newOffsetX, newOffsetY)
  }

  const handleCanvasMouseUp = () => {
    setIsDraggingImage(false)
  }

  const handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && canvasRef.current) {
      const touch = e.touches[0]
      const rect = canvasRef.current.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top

      setIsDraggingImage(true)
      setDragStart({ x, y })
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const dist = Math.sqrt(
        (touch1.clientX - touch2.clientX) ** 2 +
        (touch1.clientY - touch2.clientY) ** 2
      )
      setDragStart({ x: dist, y: 0 })
    }
  }

  const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && canvasRef.current) {
      const touch = e.touches[0]
      const rect = canvasRef.current.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top

      if (isDraggingImage) {
        const deltaX = x - dragStart.x
        const deltaY = y - dragStart.y

        const newOffsetX = offsetX + deltaX
        const newOffsetY = offsetY + deltaY

        setOffsetX(newOffsetX)
        setOffsetY(newOffsetY)
        setDragStart({ x, y })
        updatePreview(scale, newOffsetX, newOffsetY)
      }
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const dist = Math.sqrt(
        (touch1.clientX - touch2.clientX) ** 2 +
        (touch1.clientY - touch2.clientY) ** 2
      )

      const delta = (dist - dragStart.x) * 0.01
      const newScale = Math.max(0.1, Math.min(3, scale + delta))
      setScale(newScale)
      setDragStart({ x: dist, y: 0 })
      updatePreview(newScale, offsetX, offsetY)
    }
  }

  const handleTouchEnd = () => {
    setIsDraggingImage(false)
  }

  const handleFillColorChange = (color: string) => {
    setFillColor(color)
    updatePreview(scale, offsetX, offsetY)
  }

  const handleTrimPointerDown = (type: 'start' | 'end') => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    isDraggingTrim.current = type
    if (trackRef.current) {
      trackRef.current.setPointerCapture(e.pointerId)
    }
  }

  const handleTrimPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingTrim.current || !trackRef.current || videoDuration === 0) return
    const rect = trackRef.current.getBoundingClientRect()
    let percentage = (e.clientX - rect.left) / rect.width
    percentage = Math.max(0, Math.min(1, percentage))
    const time = percentage * videoDuration

    if (isDraggingTrim.current === 'start') {
      const newVal = Math.min(time, trimEnd - 0.1)
      setTrimStart(newVal)
      if (videoElementRef.current) videoElementRef.current.currentTime = newVal
    } else {
      const newVal = Math.max(time, trimStart + 0.1)
      setTrimEnd(newVal)
      if (videoElementRef.current) videoElementRef.current.currentTime = newVal
    }
  }

  const handleTrimPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingTrim.current && trackRef.current) {
      trackRef.current.releasePointerCapture(e.pointerId)
    }
    isDraggingTrim.current = null
  }

  const handleApply = () => {
    onEditApply({
      scale,
      offsetX,
      offsetY,
      fillColor,
      ratio: RATIO,
      trimStart,
      trimEnd
    })
  }

  return (
    <div className="crop-tool-overlay">
      <div className="crop-tool-container">
        <h2>Crop Video to 4:3 Ratio</h2>
        
        <div className="crop-preview-section">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="crop-canvas"
            onWheel={handleCanvasWheel}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          <p className="crop-hint">Scroll to zoom • Drag to move</p>
        </div>

        <div className="crop-controls">
          <div className="control-group">
            <label>Fill Color</label>
            <div className="color-options">
              <button
                className={`color-btn ${fillColor === '#ffffff' ? 'active' : ''}`}
                style={{ backgroundColor: '#ffffff', color: '#333', border: '1px solid #ccc' }}
                onClick={() => handleFillColorChange('#ffffff')}
              >
                White
              </button>
            </div>
          </div>

          <div className="control-group">
            <label>Trim Video ({trimStart.toFixed(1)}s - {trimEnd.toFixed(1)}s)</label>
            <div 
              className="trim-track-container" 
              ref={trackRef}
              onPointerMove={handleTrimPointerMove}
              onPointerUp={handleTrimPointerUp}
              onPointerCancel={handleTrimPointerUp}
            >
              <div className="trim-thumbnails">
                {thumbnails.length > 0 ? (
                  thumbnails.map((url, i) => (
                    <div key={i} className="trim-thumbnail" style={{ backgroundImage: `url(${url})` }} />
                  ))
                ) : (
                  <div className="trim-loading">Generating preview...</div>
                )}
              </div>
              
              {/* Unselected areas dark overlays */}
              <div className="trim-overlay left" style={{ width: `${(trimStart / videoDuration) * 100}%` }} />
              <div className="trim-overlay right" style={{ width: `${(1 - trimEnd / videoDuration) * 100}%` }} />
              
              {/* Active selection border */}
              <div 
                className="trim-selection" 
                style={{ 
                  left: `${(trimStart / videoDuration) * 100}%`,
                  right: `${(1 - trimEnd / videoDuration) * 100}%` 
                }}
              >
                <div 
                  className="trim-handle start" 
                  onPointerDown={handleTrimPointerDown('start')} 
                />
                <div 
                  className="trim-handle end" 
                  onPointerDown={handleTrimPointerDown('end')} 
                />
              </div>
            </div>
          </div>

          <div className="control-group">
            <label>Scale: {scale.toFixed(2)}x | Offset: ({offsetX.toFixed(0)}, {offsetY.toFixed(0)})</label>
          </div>
        </div>

        <div className="crop-actions">
          <button className="btn-apply" onClick={handleApply}>
            Apply Crop
          </button>
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
