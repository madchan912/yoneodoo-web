import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminClient } from '../api/adminClient'
import { clearAdminSecret, setAdminSecret } from './adminSession'

const card = {
  maxWidth: 420,
  margin: '80px auto',
  padding: 32,
  backgroundColor: '#1e1e1e',
  borderRadius: 16,
  border: '1px solid #333',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
}

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      setAdminSecret(password)
      await adminClient.get('/api/v1/admin/dashboard/stats')
      navigate('/admin/recipes', { replace: true })
    } catch (err) {
      clearAdminSecret()
      setError('비밀번호가 올바르지 않거나 서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#e0e0e0', fontFamily: 'sans-serif' }}>
      <div style={card}>
        <h1 style={{ marginTop: 0, color: '#fff', fontSize: '1.5rem' }}>요너두 Admin</h1>
        <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.5 }}>
          관리자 비밀번호(API의 <code style={{ color: '#93c5fd' }}>ADMIN_SECRET</code>과 동일)를 입력하세요.
          브라우저 <strong>sessionStorage</strong>에만 저장되며, 어드민 API 호출 시{' '}
          <code style={{ color: '#93c5fd' }}>X-Admin-Secret</code> 헤더로 전송됩니다.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin secret"
            autoComplete="off"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '14px 16px',
              marginBottom: 16,
              borderRadius: 10,
              border: '1px solid #444',
              backgroundColor: '#121212',
              color: '#fff',
              fontSize: '1rem',
            }}
          />
          {error && <div style={{ color: '#f87171', marginBottom: 12, fontSize: '0.9rem' }}>{error}</div>}
          <button
            type="submit"
            disabled={loading || !password.trim()}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: loading ? '#444' : '#3b82f6',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '확인 중…' : '로그인'}
          </button>
        </form>
        <p style={{ marginBottom: 0, marginTop: 20, fontSize: '0.8rem', color: '#666' }}>
          <a href="/" style={{ color: '#60a5fa' }}>← 서비스 홈으로</a>
        </p>
      </div>
    </div>
  )
}
