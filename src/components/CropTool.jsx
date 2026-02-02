import React, { useState, useRef, useEffect } from 'react'
import './CropTool.css'

export default function CropTool({ video, onCropApply, onCancel }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const videoElementRef = useRef(null)
  const [fillColor, setFillColor] = useState('black')
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [videoWidth, setVideoWidth] = useState(0)
  const [videoHeight, setVideoHeight] = useState(0)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const CANVAS_WIDTH = 480
  const CANVAS_HEIGHT = 360
  const RATIO = 4 / 3
  const HANDLE_SIZE = 12
  const SNAP_DISTANCE = 15 // 스냅 거리
  const MIN_OPACITY = 0.15 // 최소 투명도

  useEffect(() => {
    const videoElement = document.createElement('video')
    videoElement.src = URL.createObjectURL(video)
    
    videoElement.onloadedmetadata = () => {
      setVideoWidth(videoElement.videoWidth)
      setVideoHeight(videoElement.videoHeight)
      videoElementRef.current = videoElement
      drawPreview(videoElement, 1, 0, 0, false)
    }
  }, [video])

  const drawPreview = (videoElement, scaleVal, offsetXVal, offsetYVal, isMoving = false) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
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
    drawGuidelines(ctx, x, y, scaledWidth, scaledHeight, offsetXVal, offsetYVal, isMoving)
  }

  const drawRoundedRect = (ctx, x, y, width, height, radius, strokeColor, lineWidth) => {
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

  const drawGuidelines = (ctx, videoX, videoY, videoWidth, videoHeight, offsetXVal, offsetYVal, isMoving) => {
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

  const drawOffsetInfo = (ctx, videoX, videoY, videoCenterX, videoCenterY) => {
    // Removed - keeping canvas clean
  }

  const drawHandles = (ctx) => {
    const handles = [
      { x: 0, y: 0 },
      { x: CANVAS_WIDTH / 2, y: 0 },
      { x: CANVAS_WIDTH, y: 0 },
      { x: CANVAS_WIDTH, y: CANVAS_HEIGHT / 2 },
      { x: CANVAS_WIDTH, y: CANVAS_HEIGHT },
      { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT },
      { x: 0, y: CANVAS_HEIGHT },
      { x: 0, y: CANVAS_HEIGHT / 2 }
    ]

    handles.forEach((handle) => {
      ctx.fillStyle = '#667eea'
      ctx.fillRect(
        handle.x - HANDLE_SIZE / 2,
        handle.y - HANDLE_SIZE / 2,
        HANDLE_SIZE,
        HANDLE_SIZE
      )
    })
  }

  const updatePreview = (newScale, newOffsetX, newOffsetY) => {
    if (videoElementRef.current) {
      drawPreview(videoElementRef.current, newScale, newOffsetX, newOffsetY, isDraggingImage)
    }
  }

  const handleCanvasWheel = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    const newScale = Math.max(0.1, Math.min(3, scale + delta))
    setScale(newScale)
    updatePreview(newScale, offsetX, offsetY)
  }

  const getCanvasCoordinates = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY
    return { x, y }
  }

  const handleCanvasMouseDown = (e) => {
    e.preventDefault()
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY)
    setIsDraggingImage(true)
    setDragStart({ x, y })
  }

  const handleCanvasMouseMove = (e) => {
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

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
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

  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
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

  const handleFillColorChange = (color) => {
    setFillColor(color)
    updatePreview(scale, offsetX, offsetY)
  }

  const handleApply = () => {
    onCropApply({
      scale,
      offsetX,
      offsetY,
      fillColor,
      ratio: RATIO
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
                className={`color-btn ${fillColor === 'black' ? 'active' : ''}`}
                style={{ backgroundColor: 'black' }}
                onClick={() => handleFillColorChange('black')}
              >
                Black
              </button>
              <button
                className={`color-btn ${fillColor === 'white' ? 'active' : ''}`}
                style={{ backgroundColor: 'white', color:'black', border: '2px solid #ccc' }}
                onClick={() => handleFillColorChange('white')}
              >
                White
              </button>
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
