import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { saveAs } from 'file-saver'
import { resizeImageForExport, blobToPdfBlob } from '../utils/converters'

const FORMATS = ['JPG', 'PNG', 'PDF']

const PRESETS = [
  { label: 'Original', value: 'original' },
  { label: 'Passport (413×531)', value: 'passport' },
  { label: 'Stamp (150×150)', value: 'stamp' },
  { label: 'A4 (2480×3508)', value: 'a4' },
]

const MIME = { JPG: 'image/jpeg', PNG: 'image/png', PDF: 'application/pdf' }
const EXT  = { JPG: 'jpg', PNG: 'png', PDF: 'pdf' }

const pillBase = {
  padding: '7px 16px',
  fontSize: '13px',
  fontWeight: 600,
  borderRadius: '20px',
  border: '1.5px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  fontFamily: "'DM Sans', system-ui, sans-serif",
}

const pillActive = {
  ...pillBase,
  background: 'var(--primary)',
  borderColor: 'var(--primary)',
  color: '#ffffff',
}

function Pill({ label, active, onClick }) {
  return (
    <button type="button" style={active ? pillActive : pillBase} onClick={onClick}>
      {label}
    </button>
  )
}

export default function DownloadModal({ doc, blob, onClose }) {
  const [format, setFormat] = useState('JPG')
  const [preset, setPreset] = useState('original')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [processing, setProcessing] = useState(false)

  const isImage = blob?.type?.startsWith('image/')

  // Build preview from the current blob
  useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  async function handleDownload() {
    if (!blob) return
    setProcessing(true)
    try {
      let outputBlob

      if (format === 'PDF') {
        // Convert image blob → PDF, or pass through if already PDF
        if (blob.type === 'application/pdf') {
          outputBlob = blob
        } else {
          outputBlob = await blobToPdfBlob(blob)
        }
      } else {
        const mime = MIME[format]
        if (isImage) {
          outputBlob = await resizeImageForExport(blob, mime, preset)
        } else {
          // For PDFs viewed as download, just pass the blob as-is
          outputBlob = blob
        }
      }

      const baseName = (doc.name || 'document').replace(/\.[^.]+$/, '')
      saveAs(outputBlob, `${baseName}.${EXT[format]}`)
    } catch (err) {
      alert(`Download failed: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderRadius: '18px',
      }}
      onClick={onClose}
    >
      <div
        className="modal-box"
        style={{ maxWidth: '420px', width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>
            Download
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Preview thumbnail */}
        {previewUrl && (
          <div
            style={{
              width: '100%',
              height: '120px',
              borderRadius: '10px',
              overflow: 'hidden',
              background: 'var(--surface-2)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={previewUrl}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>
        )}

        {/* Format selector */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Format
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {FORMATS.map((f) => (
              <Pill key={f} label={f} active={format === f} onClick={() => setFormat(f)} />
            ))}
          </div>
        </div>

        {/* Size preset (only for JPG / PNG) */}
        {(format === 'JPG' || format === 'PNG') && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Size
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PRESETS.map((p) => (
                <Pill key={p.value} label={p.label} active={preset === p.value} onClick={() => setPreset(p.value)} />
              ))}
            </div>
          </div>
        )}

        {/* Download button */}
        <button
          className="btn-primary"
          style={{ width: '100%', padding: '11px', fontSize: '15px' }}
          onClick={handleDownload}
          disabled={processing}
        >
          {processing ? (
            <span>
              <span className="animate-spin" style={{ marginRight: '8px' }}>⏳</span>
              Processing…
            </span>
          ) : (
            '⬇ Download'
          )}
        </button>
      </div>
    </div>
  )
}
