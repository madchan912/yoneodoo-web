import { useEffect, useState } from 'react'
import { adminClient } from '../api/adminClient'

const th = { textAlign: 'left', padding: '12px 10px', borderBottom: '1px solid #333', color: '#9ca3af', fontSize: '0.8rem' }
const td = { padding: '12px 10px', borderBottom: '1px solid #222', fontSize: '0.9rem' }

export default function RecipeManagePage() {
  const [filter, setFilter] = useState('all')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await adminClient.get('/api/v1/admin/recipes', { params: { filter } })
        if (!cancelled) setRows(res.data || [])
      } catch (e) {
        if (!cancelled) setError('목록을 불러오지 못했습니다. 시크릿 또는 API를 확인하세요.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [filter])

  const btn = (key, label) => (
    <button
      type="button"
      onClick={() => setFilter(key)}
      style={{
        marginRight: 8,
        marginBottom: 8,
        padding: '8px 14px',
        borderRadius: 8,
        border: filter === key ? '2px solid #3b82f6' : '1px solid #444',
        backgroundColor: filter === key ? '#1e3a5f' : '#1e1e1e',
        color: '#e5e5e5',
        cursor: 'pointer',
        fontWeight: filter === key ? 'bold' : 'normal',
      }}
    >
      {label}
    </button>
  )

  return (
    <div>
      <h2 style={{ marginTop: 0, color: '#fff' }}>레시피 관리</h2>
      <p style={{ color: '#888', fontSize: '0.9rem' }}>상태 필터(껍데기). 실제 상태 값은 API와 파이프라인 기준에 맞춰 조정 예정입니다.</p>
      <div style={{ marginBottom: 20 }}>
        {btn('all', '전체')}
        {btn('pending', '대기')}
        {btn('no_subtitles', '자막 없음')}
      </div>
      {error && <div style={{ color: '#f87171', marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: '#888' }}>불러오는 중…</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #333', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ backgroundColor: '#1a1a1a' }}>
                <th style={th}>ID</th>
                <th style={th}>제목</th>
                <th style={th}>상태</th>
                <th style={th}>videoId</th>
                <th style={th}>유튜버</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...td, textAlign: 'center', color: '#666' }}>행이 없습니다.</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{r.id}</td>
                    <td style={td}>{r.title}</td>
                    <td style={td}>{r.status ?? '—'}</td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.videoId ?? '—'}</td>
                    <td style={td}>{r.youtuberName ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
