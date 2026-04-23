import { useEffect, useState } from 'react'
import { adminClient } from '../api/adminClient'

export default function IngredientNormalizePage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await adminClient.get('/api/v1/admin/ingredients/unclassified')
        if (!cancelled) setRows(res.data || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div>
      <h2 style={{ marginTop: 0, color: '#fff' }}>재료 정규화 매핑</h2>
      <p style={{ color: '#888', fontSize: '0.9rem' }}>
        크롤링된 미분류 재료를 마스터 이름으로 묶는 UI 껍데기입니다. (API 연동·저장은 추후)
      </p>
      {loading ? (
        <div style={{ color: '#888' }}>불러오는 중…</div>
      ) : (
        <div style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
          {rows.length === 0 ? (
            <div style={{ padding: 24, border: '1px dashed #444', borderRadius: 12, color: '#666', textAlign: 'center' }}>
              미분류 재료가 없습니다. (현재 API는 빈 목록을 반환합니다.)
            </div>
          ) : (
            rows.map((r, i) => (
              <div key={i} style={{ padding: 16, border: '1px solid #333', borderRadius: 12, backgroundColor: '#1e1e1e' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{r.rawName}</div>
                <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: 12 }}>출현 {r.occurrenceCount}회</div>
                <label style={{ fontSize: '0.85rem', color: '#aaa' }}>
                  마스터 이름으로 묶기
                  <input
                    type="text"
                    placeholder="예: 스팸"
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: 6,
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #444',
                      backgroundColor: '#121212',
                      color: '#fff',
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled
                  style={{
                    marginTop: 12,
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#374151',
                    color: '#9ca3af',
                    cursor: 'not-allowed',
                    fontSize: '0.85rem',
                  }}
                >
                  저장 (준비 중)
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
