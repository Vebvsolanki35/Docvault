import { useState } from 'react'
import { X } from 'lucide-react'

const RELATIONSHIP_COLORS = {
  Self:    'hsl(168, 70%, 42%)',
  Spouse:  'hsl(330, 70%, 55%)',
  Father:  'hsl(220, 70%, 55%)',
  Mother:  'hsl(345, 65%, 58%)',
  Child:   'hsl(45,  85%, 50%)',
  Sibling: 'hsl(260, 60%, 60%)',
  Other:   'hsl(200, 60%, 50%)',
}

export default function PersonCard({ person, onClick, onDelete, docCount }) {
  const [hovered, setHovered] = useState(false)
  const avatarColor = RELATIONSHIP_COLORS[person.relationship] ?? RELATIONSHIP_COLORS.Other

  function handleDelete(e) {
    e.stopPropagation()
    if (window.confirm(`Delete ${person.name}? This will remove all their documents too.`)) {
      onDelete(person.id)
    }
  }

  return (
    <div
      className="card"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        padding: '20px',
        position: 'relative',
        outline: hovered ? '2px solid var(--primary)' : '2px solid transparent',
        outlineOffset: '2px',
        transition: 'var(--transition)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        textAlign: 'center',
        userSelect: 'none',
      }}
    >
      {/* Delete button — visible only on hover */}
      <button
        onClick={handleDelete}
        title="Remove person"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: 'none',
          background: 'var(--danger)',
          color: '#fff',
          cursor: 'pointer',
          padding: 0,
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      >
        <X size={13} strokeWidth={2.5} />
      </button>

      {/* Avatar */}
      <div
        className="avatar"
        style={{
          width: '56px',
          height: '56px',
          fontSize: '18px',
          backgroundColor: avatarColor,
        }}
      >
        {person.initials}
      </div>

      {/* Name */}
      <p
        style={{
          fontFamily: "'Sora', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: '15px',
          color: 'var(--text)',
          lineHeight: 1.3,
        }}
      >
        {person.name}
      </p>

      {/* Relationship badge */}
      <span className="badge">{person.relationship}</span>

      {/* Doc count */}
      {docCount !== undefined && (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          {docCount} {docCount === 1 ? 'document' : 'documents'}
        </p>
      )}
    </div>
  )
}
