import { useState, useEffect } from 'react'
import { ArrowLeft, ChevronDown, ChevronRight, Plus, FileText } from 'lucide-react'
import { getDocsByPerson, getDocumentFile } from '../utils/storage'
import { t } from '../utils/i18n'

const RELATIONSHIP_COLORS = {
  Self:    'hsl(168, 70%, 42%)',
  Spouse:  'hsl(330, 70%, 55%)',
  Father:  'hsl(220, 70%, 55%)',
  Mother:  'hsl(345, 65%, 58%)',
  Child:   'hsl(45,  85%, 50%)',
  Sibling: 'hsl(260, 60%, 60%)',
  Other:   'hsl(200, 60%, 50%)',
}

function formatFileSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ── DocCard ────────────────────────────────────────────────────────────────────
// Displays a single document: thumbnail (lazy-loaded for images) + metadata.
function DocCard({ doc, onClick }) {
  const [thumbUrl, setThumbUrl] = useState(null)
  const isImage = doc.fileType?.startsWith('image/')

  useEffect(() => {
    if (!isImage) return
    let url = null
    getDocumentFile(doc.id)
      .then((blob) => {
        if (blob) {
          url = URL.createObjectURL(blob)
          setThumbUrl(url)
        }
      })
      .catch(() => {})
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [doc.id, isImage])

  return (
    <div
      className="card"
      onClick={() => onClick(doc)}
      style={{
        cursor: 'pointer',
        padding: '12px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '8px',
          overflow: 'hidden',
          background: 'var(--surface-2)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isImage && thumbUrl ? (
          <img
            src={thumbUrl}
            alt={doc.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <FileText size={24} color="var(--primary)" strokeWidth={1.5} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 600,
            fontSize: '14px',
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {doc.name}
        </p>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '4px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {formatDate(doc.uploadDate)}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {formatFileSize(doc.fileSize)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── PersonVaultView ────────────────────────────────────────────────────────────
export default function PersonVaultView({ person, lang, onBack, onOpenDoc, onUpload }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [openFolders, setOpenFolders] = useState(new Set())

  useEffect(() => {
    setLoading(true)
    getDocsByPerson(person.id)
      .then((d) => {
        setDocs(d)
        // Open all non-empty folders by default
        const folders = [...new Set(d.map((doc) => doc.folderName))]
        setOpenFolders(new Set(folders))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [person.id])

  function toggleFolder(folder) {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folder)) {
        next.delete(folder)
      } else {
        next.add(folder)
      }
      return next
    })
  }

  // Group docs by folder, preserving insertion order
  const grouped = {}
  docs.forEach((doc) => {
    if (!grouped[doc.folderName]) grouped[doc.folderName] = []
    grouped[doc.folderName].push(doc)
  })

  const avatarColor = RELATIONSHIP_COLORS[person.relationship] ?? RELATIONSHIP_COLORS.Other

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      {/* Back button */}
      <button
        className="btn-secondary"
        onClick={onBack}
        style={{ marginBottom: '20px', padding: '8px 14px', fontSize: '14px' }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Person header card */}
      <div
        className="card"
        style={{
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          gap: '20px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        {/* Avatar */}
        <div
          className="avatar"
          style={{
            width: '64px',
            height: '64px',
            fontSize: '22px',
            backgroundColor: avatarColor,
            flexShrink: 0,
          }}
        >
          {person.initials}
        </div>

        {/* Name + relationship + profile details */}
        <div style={{ flex: 1, minWidth: '180px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              marginBottom: '8px',
            }}
          >
            <h2
              style={{
                fontFamily: "'Sora', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '1.35rem',
                color: 'var(--text)',
              }}
            >
              {person.name}
            </h2>
            <span className="badge">{person.relationship}</span>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {person.profile?.phone && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                📞 {person.profile.phone}
              </span>
            )}
            {person.profile?.dob && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                🎂 {person.profile.dob}
              </span>
            )}
            {person.profile?.bloodGroup && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                🩸 {person.profile.bloodGroup}
              </span>
            )}
          </div>
        </div>

        {/* Upload button */}
        <button
          className="btn-primary"
          onClick={onUpload}
          style={{ flexShrink: 0, alignSelf: 'flex-start' }}
        >
          <Plus size={16} /> {t('upload_doc', lang)}
        </button>
      </div>

      {/* Document sections */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '14px' }} />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '56px 24px',
            color: 'var(--text-muted)',
          }}
        >
          <FileText
            size={52}
            strokeWidth={1.2}
            style={{ opacity: 0.35, margin: '0 auto 16px' }}
          />
          <p
            style={{
              fontFamily: "'Sora', system-ui, sans-serif",
              fontWeight: 600,
              fontSize: '1.05rem',
            }}
          >
            No documents yet
          </p>
          <p style={{ fontSize: '14px', marginTop: '6px' }}>
            Upload a document to get started.
          </p>
          <button
            className="btn-primary"
            onClick={onUpload}
            style={{ marginTop: '20px' }}
          >
            <Plus size={16} /> {t('upload_doc', lang)}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(grouped).map(([folder, folderDocs]) => {
            const isOpen = openFolders.has(folder)
            return (
              <div
                key={folder}
                className="card"
                style={{ overflow: 'hidden', padding: 0 }}
              >
                {/* Folder header / toggle */}
                <button
                  onClick={() => toggleFolder(folder)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text)',
                    borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontFamily: "'Sora', system-ui, sans-serif",
                        fontWeight: 600,
                        fontSize: '15px',
                      }}
                    >
                      {folder}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        background: 'var(--primary-dim)',
                        color: 'var(--primary)',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontWeight: 600,
                      }}
                    >
                      {folderDocs.length}
                    </span>
                  </div>
                  {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                {/* Doc grid */}
                {isOpen && (
                  <div
                    style={{
                      padding: '12px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {folderDocs.map((doc) => (
                      <DocCard key={doc.id} doc={doc} onClick={onOpenDoc} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
