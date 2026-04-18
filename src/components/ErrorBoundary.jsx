import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'var(--bg)',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              maxWidth: '400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <AlertTriangle
              size={56}
              color="var(--danger)"
              strokeWidth={1.5}
              style={{ opacity: 0.8 }}
            />
            <h2
              style={{
                fontFamily: "'Sora', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '1.4rem',
                color: 'var(--text)',
              }}
            >
              Something went wrong.
            </h2>
            <p
              style={{
                fontSize: '15px',
                color: 'var(--text-muted)',
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              An unexpected error occurred. Refresh the page to continue.
            </p>
            <button
              className="btn-primary"
              style={{ padding: '10px 28px', fontSize: '15px', marginTop: '8px' }}
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
