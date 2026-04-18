import { useState, useEffect, useRef } from 'react'
import { Plus, Users, FileText } from 'lucide-react'
import { getAllDocs, addPerson, deletePerson } from '../utils/storage'
import PersonCard from './PersonCard'

const RELATIONSHIPS = ['Self', 'Spouse', 'Father', 'Mother', 'Child', 'Sibling', 'Other']

const EMPTY_FORM = {
  name: '',
  relationship: 'Self',
  phone: '',
  dob: '',
  bloodGroup: '',
  address: '',
}

/* Animated count-up hook */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      setValue(Math.round(progress * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return value
}

function StatCard({ label, value, icon: Icon }) {
  const animated = useCountUp(value)
  return (
    <div
      className="card"
      style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: '16px', minWidth: '180px' }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'var(--primary-dim)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} />
      </div>
      <div>
        <p
          style={{
            fontFamily: "'Sora', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: '1.8rem',
            color: 'var(--text)',
            lineHeight: 1,
          }}
        >
          {animated}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard({ people, onSelectPerson, onAddPerson, lang }) {
  const [docCounts, setDocCounts] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [localPeople, setLocalPeople] = useState(people)

  /* Sync local copy when parent passes updated people */
  useEffect(() => {
    setLocalPeople(people)
  }, [people])

  /* Load doc counts once on mount */
  useEffect(() => {
    getAllDocs().then((docs) => {
      const counts = {}
      docs.forEach((doc) => {
        counts[doc.personId] = (counts[doc.personId] ?? 0) + 1
      })
      setDocCounts(counts)
    })
  }, [])

  const totalDocs = Object.values(docCounts).reduce((s, n) => s + n, 0)

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleAddPerson(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const person = await addPerson(form.name, form.relationship, {
        phone: form.phone,
        dob: form.dob,
        bloodGroup: form.bloodGroup,
        address: form.address,
      })
      const next = [...localPeople, person].sort((a, b) => a.name.localeCompare(b.name))
      setLocalPeople(next)
      if (onAddPerson) onAddPerson(person)
      setForm(EMPTY_FORM)
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePerson(id) {
    await deletePerson(id)
    setLocalPeople((prev) => prev.filter((p) => p.id !== id))
    setDocCounts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Stat row */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '32px',
        }}
      >
        <StatCard label="Total People" value={localPeople.length} icon={Users} />
        <StatCard label="Total Documents" value={totalDocs} icon={FileText} />
      </div>

      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <h2
          style={{
            fontFamily: "'Sora', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: '1.25rem',
            color: 'var(--text)',
          }}
        >
          People
        </h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Person
        </button>
      </div>

      {/* Person grid or empty state */}
      {localPeople.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            gap: '16px',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          <Users size={56} strokeWidth={1.2} style={{ opacity: 0.35 }} />
          <p style={{ fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 600, fontSize: '1.1rem' }}>
            No people yet
          </p>
          <p style={{ fontSize: '14px' }}>
            Add a person to start organising their documents.
          </p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add your first person
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {localPeople.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              docCount={docCounts[person.id] ?? 0}
              onClick={() => onSelectPerson && onSelectPerson(person)}
              onDelete={handleDeletePerson}
            />
          ))}
        </div>
      )}

      {/* Add Person Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3
              style={{
                fontFamily: "'Sora', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '1.15rem',
                marginBottom: '20px',
                color: 'var(--text)',
              }}
            >
              Add Person
            </h3>
            <form onSubmit={handleAddPerson} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  className="input"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Full name"
                  required
                  autoFocus
                />
              </div>

              {/* Relationship */}
              <div>
                <label style={labelStyle}>Relationship</label>
                <select
                  className="input"
                  name="relationship"
                  value={form.relationship}
                  onChange={handleFormChange}
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div>
                <label style={labelStyle}>Phone</label>
                <input
                  className="input"
                  name="phone"
                  value={form.phone}
                  onChange={handleFormChange}
                  placeholder="Phone number"
                  type="tel"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <input
                  className="input"
                  name="dob"
                  value={form.dob}
                  onChange={handleFormChange}
                  type="date"
                />
              </div>

              {/* Blood Group */}
              <div>
                <label style={labelStyle}>Blood Group</label>
                <input
                  className="input"
                  name="bloodGroup"
                  value={form.bloodGroup}
                  onChange={handleFormChange}
                  placeholder="e.g. A+"
                />
              </div>

              {/* Address */}
              <div>
                <label style={labelStyle}>Address</label>
                <textarea
                  className="input"
                  name="address"
                  value={form.address}
                  onChange={handleFormChange}
                  placeholder="Address"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setShowModal(false); setForm(EMPTY_FORM) }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Add Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '6px',
  fontFamily: "'DM Sans', system-ui, sans-serif",
}
