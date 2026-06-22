import { useCallback, useEffect, useState } from 'react'
import { adminClient } from '../api/adminClient'
import RecipeEditModal from './RecipeEditModal'

const th = { textAlign: 'left', padding: '12px 10px', borderBottom: '1px solid #333', color: '#9ca3af', fontSize: '0.8rem' }
const td = { padding: '12px 10px', borderBottom: '1px solid #222', fontSize: '0.9rem' }

export default function RecipeManagePage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminClient.get('/api/v1/admin/recipes', { params: { filter: 'all' } })
      setRows(res.data || [])
    } catch (e) {
      setError('목록을 불러오지 못했습니다. 시크릿 또는 API를 확인하세요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const q = searchQuery.trim().toLowerCase()
  const filteredRows = q
    ? rows.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.youtuberName?.toLowerCase().includes(q),
      )
    : rows

  return (
    <div>
      <h2 style={{ marginTop: 0, color: '#fff' }}>
        레시피 관리
        <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#6b7280', marginLeft: 10 }}>
          ({q ? `${filteredRows.length} / ${rows.length}건` : `${rows.length}건`})
        </span>
      </h2>
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="제목 또는 유튜버명 검색…"
          style={{
            width: '100%',
            maxWidth: 480,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #444',
            backgroundColor: '#1a1a1a',
            color: '#f3f4f6',
            fontSize: '0.9rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {error && <div style={{ color: '#f87171', marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: '#888' }}>불러오는 중…</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #333', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ backgroundColor: '#1a1a1a' }}>
                <th style={th}>ID</th>
                <th style={th}>제목</th>
                <th style={th}>노출</th>
                <th style={th}>파이프라인</th>
                <th style={th}>videoId</th>
                <th style={th}>유튜버</th>
                <th style={{ ...th, textAlign: 'right' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...td, textAlign: 'center', color: '#666' }}>
                    {q ? '검색 결과가 없습니다.' : '행이 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const isHidden = r.displayStatus === 'HIDDEN'
                  return (
                  <tr key={r.id} style={isHidden ? { opacity: 0.55 } : undefined}>
                    <td style={td}>{r.id}</td>
                    <td style={td}>{r.title}</td>
                    <td style={td}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: isHidden ? '#3f1212' : '#064e3b',
                          color: isHidden ? '#fecaca' : '#a7f3d0',
                          border: '1px solid ' + (isHidden ? '#7f1d1d' : '#065f46'),
                        }}
                      >
                        {isHidden ? '숨김' : '노출'}
                      </span>
                    </td>
                    <td style={td}>{r.status ?? '—'}</td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.videoId ?? '—'}</td>
                    <td style={td}>{r.youtuberName ?? '—'}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setEditingId(r.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid #3b82f6',
                          background: '#1e3a5f',
                          color: '#e0f2fe',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingId != null && (
        <RecipeEditModal
          recipeId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => load()}
        />
      )}
    </div>
  )
}
