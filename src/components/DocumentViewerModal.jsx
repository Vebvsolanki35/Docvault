import { useState, useEffect, useRef } from 'react'
import { X, Download, Trash2, FileText } from 'lucide-react'
import { updateRemark, renameDocument, deleteDocument, getDocumentFile } from '../utils/storage'
import { pdfToImages } from '../utils/converters'
import { t } from '../utils/i18n'
import DownloadModal from './DownloadModal'

function formatFileSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function DocumentViewerModal({ doc: initialDoc, onClose, onUpdated, lang = 'en' }) {
  const [doc, setDoc] = useState(initialDoc)
  const [blob, setBlob] = useState(null)
  const [blobUrl, setBlobUrl] = useState(null)
  const [pdfPageUrls, setPdfPageUrls] = useState([])
  const [loadingFile, setLoadingFile] = useState(true)

  // Editable remark
  const [remark, setRemark] = useState(doc.remark ?? '')
  const [savingRemark, setSavingRemark] = useState(false)

  // Inline rename
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(doc.name)

  // OCR
  const [ocrProgress, setOcrProgress] = useState(null) // null | 0-100
  const [ocrRunning, setOcrRunning] = useState(false)

  // Nested download modal
  const [showDownload, setShowDownload] = useState(false)

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const nameInputRef = useRef(null)
  const modalRef = useRef(null)

  // Scroll lock + Escape key + focus trap
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable?.length) focusable[0].focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (showDownload) { setShowDownload(false); return }
        onClose()
        return
      }
      if (e.key !== 'Tab' || !focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, showDownload])

  // ── Load blob ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const createdUrls = []
    setLoadingFile(true)

    getDocumentFile(doc.id).then(async (b) => {
      if (cancelled || !b) { if (!cancelled) setLoadingFile(false); return }
      setBlob(b)

      if (doc.fileType === 'application/pdf') {
        setBlobUrl(null)
        const pages = await pdfToImages(b)
        const urls = pages.map((p) => URL.createObjectURL(p))
        if (cancelled) {
          urls.forEach((u) => URL.revokeObjectURL(u))
          return
        }
        createdUrls.push(...urls)
        setPdfPageUrls(urls)
      } else {
        const url = URL.createObjectURL(b)
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        createdUrls.push(url)
        setBlobUrl(url)
      }
      setLoadingFile(false)
    }).catch(() => { if (!cancelled) setLoadingFile(false) })

    return () => {
      cancelled = true
      createdUrls.forEach((u) => URL.revokeObjectURL(u))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id])

  // Auto-focus rename input
  useEffect(() => {
    if (editing) nameInputRef.current?.focus()
  }, [editing])

  // ── Remark ───────────────────────────────────────────────────
  async function handleSaveRemark() {
    setSavingRemark(true)
    try {
      const updated = await updateRemark(doc.id, remark)
      setDoc(updated)
      if (onUpdated) onUpdated(updated)
    } finally {
      setSavingRemark(false)
    }
  }

  // ── Rename ───────────────────────────────────────────────────
  async function handleRename() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === doc.name) { setEditing(false); return }
    const updated = await renameDocument(doc.id, trimmed)
    setDoc(updated)
    if (onUpdated) onUpdated(updated)
    setEditing(false)
  }

  // ── OCR ──────────────────────────────────────────────────────
  async function handleOcr() {
    if (!blob) return
    setOcrRunning(true)
    setOcrProgress(0)
    let worker = null
    try {
      const { createWorker } = await import('tesseract.js')
      worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100))
          }
        },
      })
      const result = await worker.recognize(blob)
      const extracted = result.data.text.trim()
      setRemark((prev) => (prev ? `${prev}\n\n${extracted}` : extracted))
    } catch (err) {
      alert(`OCR failed: ${err.message}`)
    } finally {
      if (worker) await worker.terminate()
      setOcrRunning(false)
      setOcrProgress(null)
    }
  }

  // ── Delete ───────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteDocument(doc.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const isImage = doc.fileType?.startsWith('image/')
  const isPdf = doc.fileType === 'application/pdf'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        ref={modalRef}
        style={{ maxWidth: '800px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {/* Editable title */}
          <div style={{ flex: 1, minWidth: '180px' }}>
            {editing ? (
              <input
                ref={nameInputRef}
                className="input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename() }}
                style={{ fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 700, fontSize: '1.1rem' }}
              />
            ) : (
              <h3
                title="Click to rename"
                onClick={() => setEditing(true)}
                style={{
                  fontFamily: "'Sora', system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  borderBottom: '1.5px dashed var(--border)',
                  display: 'inline-block',
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                }}
              >
                {doc.name}
              </h3>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
              <span className="badge">{doc.folderName}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(doc.uploadDate)}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatFileSize(doc.fileSize)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '14px' }}
              onClick={() => setShowDownload(true)}
            >
              <Download size={15} /> {t('download', lang)}
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <hr className="divider" />

        {/* ── Document preview ────────────────────────────────── */}
        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: '12px',
            overflow: 'auto',
            maxHeight: '380px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          {loadingFile ? (
            <div className="skeleton" style={{ width: '100%', height: '200px' }} />
          ) : isImage && blobUrl ? (
            <img src={blobUrl} alt={doc.name} style={{ maxWidth: '100%', borderRadius: '8px' }} />
          ) : isPdf ? (
            pdfPageUrls.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Rendering PDF pages…</p>
            ) : (
              pdfPageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Page ${i + 1}`}
                  style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: i < pdfPageUrls.length - 1 ? '12px' : 0 }}
                />
              ))
            )
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
              <FileText size={48} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p style={{ fontSize: '14px' }}>Preview not available for this file type.</p>
            </div>
          )}
        </div>

        {/* ── OCR (images only) ───────────────────────────────── */}
        {isImage && (
          <div style={{ marginBottom: '16px' }}>
            <button
              className="btn-secondary"
              style={{ fontSize: '14px', padding: '8px 16px' }}
              onClick={handleOcr}
              disabled={ocrRunning || !blob}
            >
              {ocrRunning
                ? `${t('extracting', lang)} ${ocrProgress !== null ? `${ocrProgress}%` : ''}`
                : `🔍 Extract Text (OCR)`}
            </button>
          </div>
        )}

        {/* ── Remark ──────────────────────────────────────────── */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: '6px',
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            {t('remark', lang)}
          </label>
          <textarea
            className="input"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={4}
            style={{ resize: 'vertical' }}
            placeholder="Add a note or paste extracted text…"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              className="btn-primary"
              style={{ fontSize: '14px', padding: '8px 18px' }}
              onClick={handleSaveRemark}
              disabled={savingRemark}
            >
              {savingRemark ? 'Saving…' : 'Save Remark'}
            </button>
          </div>
        </div>

        <hr className="divider" />

        {/* ── Delete ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Delete this document?</span>
              <button
                className="btn-danger"
                style={{ fontSize: '14px', padding: '8px 16px' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '14px', padding: '8px 16px' }}
                onClick={() => setConfirmDelete(false)}
              >
                {t('cancel', lang)}
              </button>
            </div>
          ) : (
            <button
              className="btn-danger"
              style={{ fontSize: '14px', padding: '8px 16px' }}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={15} /> {t('delete', lang)}
            </button>
          )}
        </div>

        {/* ── Nested DownloadModal ─────────────────────────────── */}
        {showDownload && blob && (
          <DownloadModal doc={doc} blob={blob} onClose={() => setShowDownload(false)} />
        )}
      </div>
    </div>
  )
}
