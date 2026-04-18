import { useState, useEffect, useRef } from 'react'
import { Shield } from 'lucide-react'

const HARDCODED_PASSWORD = 'vault2025'

const styles = `
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.7; transform: scale(1.08); }
}

@keyframes shake {
  0%   { transform: translateX(0); }
  15%  { transform: translateX(-8px); }
  30%  { transform: translateX(8px); }
  45%  { transform: translateX(-8px); }
  60%  { transform: translateX(8px); }
  75%  { transform: translateX(-4px); }
  90%  { transform: translateX(4px); }
  100% { transform: translateX(0); }
}

.ls-shake {
  animation: shake 0.4s ease-in-out;
}
`

export default function LoginScreen({ onUnlock }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (sessionStorage.getItem('dv_auth') === 'true') {
      onUnlock()
    }
  }, [onUnlock])

  function handleUnlock(e) {
    e.preventDefault()
    if (password === HARDCODED_PASSWORD) {
      sessionStorage.setItem('dv_auth', 'true')
      onUnlock()
    } else {
      setError('Incorrect password')
      setShaking(true)
      inputRef.current?.focus()
    }
  }

  function handleAnimationEnd() {
    setShaking(false)
  }

  return (
    <>
      <style>{styles}</style>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(ellipse at 50% 40%, #1a2a3a 0%, #0D1117 70%)',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            width: '100%',
            maxWidth: '400px',
          }}
        >
          {/* Shield icon */}
          <div
            style={{
              animation: 'pulse 2.4s ease-in-out infinite',
              color: '#00C896',
              display: 'flex',
            }}
          >
            <Shield size={72} strokeWidth={1.5} />
          </div>

          {/* App name */}
          <h1
            style={{
              fontFamily: "'Sora', system-ui, sans-serif",
              fontSize: '2.6rem',
              fontWeight: 700,
              color: '#F0F6FC',
              letterSpacing: '-0.5px',
              textAlign: 'center',
            }}
          >
            DocVault
          </h1>

          {/* Tagline */}
          <p
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: '1rem',
              color: '#8B949E',
              textAlign: 'center',
              marginTop: '-12px',
            }}
          >
            Your documents. Private. Always.
          </p>

          {/* Form */}
          <form
            onSubmit={handleUnlock}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div
              className={shaking ? 'ls-shake' : ''}
              onAnimationEnd={handleAnimationEnd}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <input
                ref={inputRef}
                type="password"
                className="input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                placeholder="Enter password"
                autoFocus
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: error ? '1.5px solid #EF4444' : '1.5px solid rgba(255,255,255,0.12)',
                  color: '#F0F6FC',
                  fontSize: '15px',
                  padding: '12px 16px',
                }}
              />
              {error && (
                <p
                  style={{
                    color: '#EF4444',
                    fontSize: '13px',
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}
                >
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '16px' }}
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
