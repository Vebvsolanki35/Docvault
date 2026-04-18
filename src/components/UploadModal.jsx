import { useState, useRef, useCallback } from 'react'
import { X, UploadCloud, Camera } from 'lucide-react'
import { FOLDERS, saveDocument, checkDuplicate } from '../utils/storage'
import { t } from '../utils/i18n'

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '6px',
  fontFamily: "'DM Sans', system-ui, sans-serif",
}

export default function UploadModal({ person, onClose, onUploaded, lang = 'en' }) {
  const [file, setFile] = useState(null)
  const [docName, setDocName] = useState('')
  const [folder, setFolder] = useState(FOLDERS[0])
  const [remark, setRemark] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const applyFile = useCallback((f) => {
    setFile(f)
    if (!docName) setDocName(f.name)
  }, [docName])

  // ── Drag-and-drop ─────────────────────────────────────────────
  function handleDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) applyFile(dropped)
  }

  function handleFileChange(e) {
    const picked = e.target.files[0]
    if (picked) applyFile(picked)
  }

  // ── Upload flow ───────────────────────────────────────────────
  async function startUpload() {
    setUploading(true)
    setProgress(0)

    // Fake progress 0 → 100 % over 1.2 s
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) { clearInterval(interval); return p }
        return p + Math.random() * 12
      })
    }, 80)

    try {
      await saveDocument(file, docName.trim() || file.name, folder, person.id, remark.trim())
      clearInterval(interval)
      setProgress(100)
      await new Promise((res) => setTimeout(res, 300))
      onUploaded()
    } catch (err) {
      clearInterval(interval)
      setUploading(false)
      setProgress(0)
      alert(`Upload failed: ${err.message}`)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return

    const isDuplicate = await checkDuplicate(person.id, file.name, file.size)
    if (isDuplicate && !duplicateWarning) {
      setDuplicateWarning(true)
      return
    }

    setDuplicateWarning(false)
    await startUpload()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 700, fontSize: '1.15rem', color: 'var(--text)' }}>
            Upload Document
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Drag-and-drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: '12px',
              padding: '28px 20px',
              textAlign: 'center',
              background: dragOver ? 'var(--primary-dim)' : 'var(--surface-2)',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={32} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
            {file ? (
              <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>{file.name}</p>
            ) : (
              <>
                <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>Drag &amp; drop a file here</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>or click to browse</p>
              </>
            )}
          </div>

          {/* Hidden file inputs */}
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* File action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={() => fileInputRef.current?.click()}
            >
              Browse File
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera size={16} /> Take Photo
            </button>
          </div>

          {/* Duplicate warning */}
          {duplicateWarning && (
            <div
              style={{
                background: '#FEF9C3',
                border: '1.5px solid #EAB308',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#92400E',
                fontSize: '14px',
                lineHeight: 1.5,
              }}
            >
              ⚠️ A similar document already exists. Upload anyway?
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '7px 18px', fontSize: '14px' }}
                >
                  Yes, Upload
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '7px 18px', fontSize: '14px' }}
                  onClick={() => setDuplicateWarning(false)}
                >
                  {t('cancel', lang)}
                </button>
              </div>
            </div>
          )}

          {/* Document Name */}
          <div>
            <label style={labelStyle}>Document Name</label>
            <input
              className="input"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="e.g. Passport front page"
            />
          </div>

          {/* Folder */}
          <div>
            <label style={labelStyle}>Folder</label>
            <select className="input" value={folder} onChange={(e) => setFolder(e.target.value)}>
              {FOLDERS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Remark */}
          <div>
            <label style={labelStyle}>Remark <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <textarea
              className="input"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Add a note…"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Progress bar */}
          {uploading && (
            <div style={{ borderRadius: '8px', overflow: 'hidden', height: '8px', background: 'var(--border)' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(progress, 100)}%`,
                  background: 'var(--primary)',
                  transition: 'width 0.08s ease',
                  borderRadius: '8px',
                }}
              />
            </div>
          )}

          {/* Actions */}
          {!duplicateWarning && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button type="button" className="btn-secondary" onClick={onClose} disabled={uploading}>
                {t('cancel', lang)}
              </button>
              <button type="submit" className="btn-primary" disabled={!file || uploading}>
                {uploading ? `Uploading… ${Math.round(Math.min(progress, 100))}%` : t('save', lang)}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
