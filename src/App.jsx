import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
  Shield,
  Moon,
  Sun,
  Archive,
  House,
  Search,
  Plus,
  FileText,
} from 'lucide-react'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import UploadModal from './components/UploadModal'
import DocumentViewerModal from './components/DocumentViewerModal'
import PersonVaultView from './components/PersonVaultView'
import { getPeople, getAllDocs, exportVaultAsZip } from './utils/storage'
import { t } from './utils/i18n'

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [isUnlocked, setIsUnlocked] = useState(
    () => sessionStorage.getItem('dv_auth') === 'true',
  )
  const [theme, setTheme] = useState(
    () => localStorage.getItem('dv_theme') ?? 'light',
  )
  const [lang, setLang] = useState(
    () => localStorage.getItem('dv_lang') ?? 'en',
  )
  const [viewState, setViewState] = useState({ view: 'home', person: null })
  const [people, setPeople] = useState([])
  const [showUpload, setShowUpload] = useState(false)
  const [showViewer, setShowViewer] = useState(null) // null | docMetadata object
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [exporting, setExporting] = useState(false)
  // Incrementing this key forces PersonVaultView to remount and reload after upload
  const [uploadRefreshKey, setUploadRefreshKey] = useState(0)

  // ── Effects ────────────────────────────────────────────────────────────────

  // Apply theme to DOM + persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('dv_theme', theme)
  }, [theme])

  // Persist lang
  useEffect(() => {
    localStorage.setItem('dv_lang', lang)
  }, [lang])

  // Load people once vault is unlocked
  useEffect(() => {
    if (isUnlocked) {
      getPeople().then(setPeople).catch(console.error)
    }
  }, [isUnlocked])

  // Debounced search (300 ms)
  const searchTimerRef = useRef(null)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const docs = await getAllDocs()
        const q = searchQuery.toLowerCase()
        setSearchResults(docs.filter((d) => d.name.toLowerCase().includes(q)))
      } catch (err) {
        console.error(err)
      }
    }, 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchQuery])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleUnlock() {
    // LoginScreen already sets this, but also set it here defensively so any
    // future caller of handleUnlock keeps the session flag consistent.
    sessionStorage.setItem('dv_auth', 'true')
    setIsUnlocked(true)
  }

  function handleSelectPerson(person) {
    setViewState({ view: 'person', person })
  }

  function handleAddPerson(person) {
    setPeople((prev) =>
      [...prev, person].sort((a, b) => a.name.localeCompare(b.name)),
    )
  }

  async function handleRefreshPeople() {
    try {
      const updated = await getPeople()
      setPeople(updated)
    } catch (err) {
      console.error(err)
    }
  }

  function handleUploadComplete() {
    setShowUpload(false)
    setUploadRefreshKey((k) => k + 1)
    handleRefreshPeople()
  }

  async function handleExport() {
    setExporting(true)
    try {
      await exportVaultAsZip()
    } catch (err) {
      alert(`Export failed: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  function handleSearchChange(value) {
    setSearchQuery(value)
    if (value.trim()) {
      setViewState({ view: 'search', person: null })
    }
  }

  // ── Locked screen ──────────────────────────────────────────────────────────
  if (!isUnlocked) {
    return <LoginScreen onUnlock={handleUnlock} />
  }

  const activeView = viewState.view

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* ── Desktop Navbar ─────────────────────────────────────────────────── */}
      <nav
        className="desktop-only"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: '16px',
          zIndex: 200,
          boxShadow: 'var(--shadow)',
        }}
      >
        {/* Left: logo */}
        <button
          onClick={() => setViewState({ view: 'home', person: null })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
          title="Go home"
        >
          <Shield size={22} color="var(--primary)" />
          <span
            style={{
              fontFamily: "'Sora', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: '1.1rem',
              color: 'var(--text)',
            }}
          >
            DocVault
          </span>
        </button>

        {/* Center: search bar */}
        <div style={{ flex: 1, maxWidth: '520px', margin: '0 auto' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              className="input"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('search_placeholder', lang)}
              style={{ paddingLeft: '36px', height: '38px', fontSize: '14px' }}
            />
          </div>
        </div>

        {/* Right: controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          {/* Language toggle */}
          <button
            className="btn-secondary"
            style={{ padding: '7px 14px', fontSize: '13px', fontWeight: 700 }}
            onClick={() => setLang((prev) => (prev === 'en' ? 'hi' : 'en'))}
            title="Toggle language"
          >
            {lang === 'en' ? 'हि' : 'EN'}
          </button>

          {/* Theme toggle */}
          <button
            className="btn-secondary"
            style={{ padding: '8px 12px' }}
            onClick={() =>
              setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
            }
            title={
              theme === 'light'
                ? t('dark_mode', lang)
                : t('light_mode', lang)
            }
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Export ZIP */}
          <button
            className="btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              gap: '6px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            onClick={handleExport}
            disabled={exporting}
            title={t('save_vault', lang)}
          >
            <Archive size={15} />
            {exporting ? '…' : t('save_vault', lang)}
          </button>
        </div>
      </nav>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="app-main">
        {activeView === 'home' && (
          <Dashboard
            people={people}
            onSelectPerson={handleSelectPerson}
            onAddPerson={handleAddPerson}
            lang={lang}
          />
        )}

        {activeView === 'person' && viewState.person && (
          <PersonVaultView
            key={`${viewState.person.id}-${uploadRefreshKey}`}
            person={viewState.person}
            lang={lang}
            onBack={() => setViewState({ view: 'home', person: null })}
            onOpenDoc={(doc) => setShowViewer(doc)}
            onUpload={() => setShowUpload(true)}
          />
        )}

        {activeView === 'search' && (
          <SearchResultsView
            query={searchQuery}
            onQueryChange={handleSearchChange}
            results={searchResults}
            people={people}
            lang={lang}
            onOpenDoc={(doc) => setShowViewer(doc)}
          />
        )}
      </main>

      {/* ── Mobile bottom nav ──────────────────────────────────────────────── */}
      <MobileBottomNav
        activeView={activeView}
        onHome={() => setViewState({ view: 'home', person: null })}
        onSearch={() => setViewState({ view: 'search', person: null })}
        onUpload={() => {
          if (viewState.view === 'person' && viewState.person) {
            setShowUpload(true)
          } else {
            // Navigate home so user can pick a person first
            setViewState({ view: 'home', person: null })
          }
        }}
        onSave={handleExport}
        exporting={exporting}
        lang={lang}
      />

      {/* ── Portal: Upload Modal ────────────────────────────────────────────── */}
      {showUpload &&
        viewState.person &&
        ReactDOM.createPortal(
          <UploadModal
            person={viewState.person}
            onClose={() => setShowUpload(false)}
            onUploaded={handleUploadComplete}
            lang={lang}
          />,
          document.body,
        )}

      {/* ── Portal: Document Viewer Modal ───────────────────────────────────── */}
      {showViewer &&
        ReactDOM.createPortal(
          <DocumentViewerModal
            doc={showViewer}
            onClose={() => setShowViewer(null)}
            onUpdated={(updated) => setShowViewer(updated)}
            lang={lang}
          />,
          document.body,
        )}
    </div>
  )
}

// ── SearchResultsView ──────────────────────────────────────────────────────────
function SearchResultsView({ query, onQueryChange, results, people, lang, onOpenDoc }) {
  const peopleMap = Object.fromEntries(people.map((p) => [p.id, p]))

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Search input — shown only on mobile (desktop uses navbar bar) */}
      <div className="mobile-search-bar" style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            className="input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('search_placeholder', lang)}
            style={{ paddingLeft: '36px' }}
            autoFocus
          />
        </div>
      </div>

      {/* Empty / prompt state */}
      {!query.trim() && (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <Search
            size={52}
            strokeWidth={1.2}
            style={{ opacity: 0.35, margin: '0 auto 16px' }}
          />
          <p
            style={{
              fontFamily: "'Sora', system-ui, sans-serif",
              fontWeight: 600,
              fontSize: '1rem',
            }}
          >
            Start typing to search documents
          </p>
        </div>
      )}

      {/* No results */}
      {query.trim() && results.length === 0 && (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <FileText
            size={52}
            strokeWidth={1.2}
            style={{ opacity: 0.35, margin: '0 auto 16px' }}
          />
          <p>{t('no_docs', lang)}</p>
        </div>
      )}

      {/* Results list */}
      {query.trim() && results.length > 0 && (
        <>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-muted)',
              marginBottom: '16px',
            }}
          >
            {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {results.map((doc) => {
              const person = peopleMap[doc.personId]
              return (
                <div
                  key={doc.id}
                  className="card"
                  onClick={() => onOpenDoc(doc)}
                  style={{
                    padding: '16px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <FileText
                    size={28}
                    color="var(--primary)"
                    strokeWidth={1.5}
                    style={{ flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontWeight: 600,
                        color: 'var(--text)',
                        fontSize: '15px',
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
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      {person && (
                        <span
                          style={{ fontSize: '13px', color: 'var(--text-muted)' }}
                        >
                          {person.name}
                        </span>
                      )}
                      <span className="badge">{doc.folderName}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── MobileBottomNav ────────────────────────────────────────────────────────────
function MobileBottomNav({
  activeView,
  onHome,
  onSearch,
  onUpload,
  onSave,
  exporting,
  lang,
}) {
  return (
    <nav
      className="mobile-only"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        zIndex: 200,
        boxShadow: '0 -2px 16px rgba(0,0,0,0.07)',
        alignItems: 'center',
        justifyContent: 'space-around',
      }}
    >
      {/* Home */}
      <NavTab
        icon={<House size={22} />}
        label="Home"
        active={activeView === 'home'}
        onClick={onHome}
      />

      {/* Search */}
      <NavTab
        icon={<Search size={22} />}
        label={t('search_placeholder', lang).replace('…', '')}
        active={activeView === 'search'}
        onClick={onSearch}
      />

      {/* Upload — circular accent button */}
      <button
        onClick={onUpload}
        aria-label="Upload document"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          flex: 1,
          paddingBottom: '6px',
          gap: '2px',
        }}
      >
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2px',
            boxShadow: '0 4px 16px rgba(0,200,150,0.4)',
          }}
        >
          <Plus size={22} color="#fff" />
        </div>
      </button>

      {/* Save / Export */}
      <NavTab
        icon={<Archive size={22} />}
        label={t('save_vault', lang)}
        active={false}
        onClick={onSave}
        disabled={exporting}
      />
    </nav>
  )
}

// ── NavTab ─────────────────────────────────────────────────────────────────────
function NavTab({ icon, label, active, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        flex: 1,
        padding: '8px 0',
        gap: '3px',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        opacity: disabled ? 0.5 : 1,
        transition: 'color 0.15s ease',
      }}
    >
      {icon}
      <span
        style={{
          fontSize: '10px',
          fontWeight: 600,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          maxWidth: '60px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </button>
  )
}
