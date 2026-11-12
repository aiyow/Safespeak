import { useRef, useState } from 'react'
import { Download, FileText, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'

const zoomLevels = [
  { percent: 50, size: 'h-1/2 w-1/2' },
  { percent: 75, size: 'h-3/4 w-3/4' },
  { percent: 100, size: 'h-full w-full' },
  { percent: 150, size: 'h-[150%] w-[150%]' },
  { percent: 200, size: 'h-[200%] w-[200%]' },
  { percent: 300, size: 'h-[300%] w-[300%]' },
  { percent: 400, size: 'h-[400%] w-[400%]' },
]
const controlClass = 'inline-flex size-9 shrink-0 items-center justify-center rounded-md text-[#831f37] hover:bg-[#f8edef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#831f37] disabled:opacity-35'

export function ConcernAttachment({ file }) {
  const viewport = useRef(null)
  const drag = useRef(null)
  const [level, setLevel] = useState(2)
  const [state, setState] = useState('loading')
  const [attempt, setAttempt] = useState(0)
  const url = `/api/v1/concerns/attachments/${file.id}`
  const image = ['image/png', 'image/jpeg'].includes(file.mimeType)
  const zoom = zoomLevels[level]

  function changeZoom(next) {
    const area = viewport.current
    const centerX = (area.scrollLeft + area.clientWidth / 2) / area.scrollWidth
    const centerY = (area.scrollTop + area.clientHeight / 2) / area.scrollHeight
    setLevel(next)
    requestAnimationFrame(() => {
      const current = viewport.current
      if (current) current.scrollTo(centerX * current.scrollWidth - current.clientWidth / 2, centerY * current.scrollHeight - current.clientHeight / 2)
    })
  }

  function reset() {
    setLevel(2)
    viewport.current?.scrollTo(0, 0)
  }

  function startDrag(event) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || level <= 2) return
    event.preventDefault()
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }
  }

  function moveDrag(event) {
    if (!drag.current) return
    event.currentTarget.scrollLeft = drag.current.left + drag.current.x - event.clientX
    event.currentTarget.scrollTop = drag.current.top + drag.current.y - event.clientY
  }

  function stopDrag(event) {
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  if (!image) return <a href={url} className="inline-flex max-w-full items-start gap-2 text-xs leading-6 text-[#831f37] underline underline-offset-4"><FileText size={15} className="mt-1 shrink-0" aria-hidden="true"/><span className="min-w-0 [overflow-wrap:anywhere]">{file.originalName}</span><Download size={14} className="mt-1 shrink-0" aria-hidden="true"/><span className="sr-only">Download attachment</span></a>

  return <figure className="min-w-0 overflow-hidden rounded-lg border border-[#e7dcde]">
    <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[#e7dcde] bg-white px-3 py-2">
      <span className="min-w-0 flex-1 text-xs leading-6 text-[#68595d] [overflow-wrap:anywhere]">{file.originalName}</span>
      <div className="flex items-center gap-1" role="group" aria-label={`Image controls for ${file.originalName}`}>
        <button type="button" className={controlClass} aria-label="Zoom out" title="Zoom out" disabled={state !== 'ready' || level === 0} onClick={() => changeZoom(level - 1)}><ZoomOut size={17} aria-hidden="true"/></button>
        <output className="w-11 text-center text-[.65rem] tabular-nums text-[#80616c]" aria-label="Image zoom" aria-live="polite">{zoom.percent}%</output>
        <button type="button" className={controlClass} aria-label="Zoom in" title="Zoom in" disabled={state !== 'ready' || level === zoomLevels.length - 1} onClick={() => changeZoom(level + 1)}><ZoomIn size={17} aria-hidden="true"/></button>
        <button type="button" className={controlClass} aria-label="Reset image view" title="Reset view" disabled={state !== 'ready'} onClick={reset}><RotateCcw size={16} aria-hidden="true"/></button>
        <a href={url} className={controlClass} aria-label={`Download ${file.originalName}`} title="Download image"><Download size={16} aria-hidden="true"/></a>
      </div>
    </figcaption>
    {state === 'loading' && <p role="status" className="px-4 py-3 text-xs text-[#80616c]">Loading image…</p>}
    {state === 'error' && <p role="alert" className="px-4 py-4 text-xs leading-6 text-[#831f37]">Image preview could not be loaded. <button type="button" className="underline underline-offset-4" onClick={() => { setState('loading'); setAttempt(value => value + 1); reset() }}>Try again</button></p>}
    <div ref={viewport} role="region" aria-label={`Image preview: ${file.originalName}`} tabIndex={state === 'ready' ? 0 : -1} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={() => { drag.current = null }} className={`h-72 overflow-auto overscroll-contain bg-[#f6f2f3] outline-offset-[-3px] focus-visible:outline-2 focus-visible:outline-[#831f37] sm:h-80 ${level > 2 ? 'cursor-grab active:cursor-grabbing' : ''} ${state === 'error' ? 'hidden' : ''}`}>
      <div className={`mx-auto flex items-center justify-center ${zoom.size}`}>
        <img key={attempt} src={`${url}?preview=1`} alt={file.originalName} loading="lazy" draggable={false} onLoad={() => setState('ready')} onError={() => setState('error')} className="block h-full w-full max-w-none select-none object-contain"/>
      </div>
    </div>
    {state === 'ready' && <p className="border-t border-[#e7dcde] bg-white px-3 py-2 text-[.62rem] leading-5 text-[#80616c]">Zoom with the controls. Scroll, swipe, or drag to move around an enlarged image.</p>}
  </figure>
}
