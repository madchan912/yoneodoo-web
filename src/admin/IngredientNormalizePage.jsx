import { useCallback, useEffect, useState } from 'react'
import { adminClient } from '../api/adminClient'

export default function IngredientNormalizePage() {
  const [rows, setRows] = useState([])
  const [mappedRows, setMappedRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [mappedLoading, setMappedLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [unmapping, setUnmapping] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [masterName, setMasterName] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setMappedLoading(true)
    setError('')
    setSuccess('')
    try {
      const [unclassifiedRes, mappedRes] = await Promise.all([
        adminClient.get('/api/v1/admin/ingredients/unclassified'),
        adminClient.get('/api/v1/admin/ingredients/mapped'),
      ])
      setRows(unclassifiedRes.data || [])
      setMappedRows(mappedRes.data || [])
      setSelected(new Set())
    } catch (e) {
      setError('목록을 불러오지 못했습니다.')
      setRows([])
      setMappedRows([])
    } finally {
      setLoading(false)
      setMappedLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (rawName) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(rawName)) next.delete(rawName)
      else next.add(rawName)
      return next
    })
  }

  const selectAll = () => {
    setSelected(new Set(rows.map((r) => r.rawName)))
  }

  const clearSelection = () => {
    setSelected(new Set())
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    if (selected.size === 0) {
      setError('매핑할 원본 재료를 하나 이상 선택하세요.')
      return
    }
    const m = masterName.trim()
    if (!m) {
      setError('마스터 재료명을 입력하세요.')
      return
    }
    setSaving(true)
    try {
      await adminClient.post('/api/v1/admin/ingredients/mapping', {
        masterName: m,
        rawNames: Array.from(selected),
      })
      setSuccess(`저장 완료 (${selected.size}건). 목록을 새로고침합니다.`)
      setMasterName('')
      await load()
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.statusText || e.message
      setError(typeof msg === 'string' ? msg : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleUnmap = async (rawName) => {
    setError('')
    setSuccess('')
    setUnmapping(rawName)
    try {
      await adminClient.delete(`/api/v1/admin/ingredients/mapping/${encodeURIComponent(rawName)}`)
      setSuccess('매핑을 해제했습니다.')
      await load()
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.statusText || e.message
      setError(typeof msg === 'string' ? msg : '매핑 해제에 실패했습니다.')
    } finally {
      setUnmapping('')
    }
  }

  const panelStyle = {
    flex: '1 1 360px',
    minWidth: 300,
    maxHeight: '72vh',
    overflowY: 'auto',
    border: '1px solid #333',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#1a1a1a',
  }

  return (
    <div>
      <h2 style={{ marginTop: 0, color: '#fff' }}>재료 정규화 매핑</h2>
      <p style={{ color: '#888', fontSize: '0.9rem', maxWidth: 900 }}>
        레시피 JSON에만 있는 원본 재료명 중, 아직 <code style={{ color: '#93c5fd' }}>ingredient_mapping</code>에 없는 항목은
        왼쪽 [미분류 목록]에 표시됩니다. (이름은 서버에서 공백 제거 규칙으로 정규화됩니다.) 오른쪽 [매핑 완료 목록]에서 개별
        매핑을 해제할 수 있습니다.
      </p>

      {error && (
        <div style={{ color: '#f87171', marginBottom: 12, padding: 12, background: '#2a1515', borderRadius: 8 }}>{error}</div>
      )}
      {success && (
        <div style={{ color: '#6ee7b7', marginBottom: 12, padding: 12, background: '#14261f', borderRadius: 8 }}>{success}</div>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          alignItems: 'stretch',
        }}
      >
        {/* 좌: 미분류 */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 'bold', color: '#e5e5e5' }}>미분류 목록</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={selectAll}
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #555',
                  background: '#2d2d2d',
                  color: '#ddd',
                  cursor: 'pointer',
                }}
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={clearSelection}
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #555',
                  background: '#2d2d2d',
                  color: '#ddd',
                  cursor: 'pointer',
                }}
              >
                선택 해제
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ color: '#888' }}>불러오는 중…</div>
          ) : rows.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', padding: 24 }}>
              미분류 재료가 없습니다. (전부 매핑됨 또는 데이터 없음)
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {rows.map((r) => (
                <li
                  key={r.rawName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 8px',
                    borderBottom: '1px solid #2a2a2a',
                    cursor: 'pointer',
                    backgroundColor: selected.has(r.rawName) ? '#1e3a5f' : 'transparent',
                  }}
                  onClick={() => toggle(r.rawName)}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(r.rawName)}
                    onChange={() => toggle(r.rawName)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: 18, height: 18, accentColor: '#3b82f6' }}
                  />
                  <span style={{ flex: 1, color: '#f3f4f6', fontWeight: 500 }}>{r.rawName}</span>
                  <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{r.occurrenceCount}회</span>
                </li>
              ))}
            </ul>
          )}

          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid #2a2a2a',
            }}
          >
            <div style={{ fontWeight: 'bold', color: '#e5e5e5', marginBottom: 8 }}>마스터 재료명으로 묶기</div>
            <p style={{ fontSize: '0.8rem', color: '#888', marginTop: 0, marginBottom: 12 }}>
              선택한 {selected.size}개 원본을 아래 이름으로 매핑합니다.
            </p>
            <input
              type="text"
              value={masterName}
              onChange={(e) => setMasterName(e.target.value)}
              placeholder="예: 스팸"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid #444',
                backgroundColor: '#121212',
                color: '#fff',
                marginBottom: 14,
              }}
            />
            <button
              type="button"
              disabled={saving || loading}
              onClick={handleSave}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: saving ? '#444' : '#10b981',
                color: '#fff',
                fontWeight: 'bold',
                cursor: saving || loading ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? '저장 중…' : '매핑 저장'}
            </button>
          </div>
        </div>

        {/* 우: 매핑 완료 */}
        <div style={panelStyle}>
          <div style={{ fontWeight: 'bold', color: '#e5e5e5', marginBottom: 12 }}>매핑 완료 목록</div>
          {mappedLoading ? (
            <div style={{ color: '#888' }}>불러오는 중…</div>
          ) : mappedRows.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', padding: 24 }}>매핑된 재료가 없습니다.</div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {mappedRows.map((m) => (
                <li
                  key={m.rawName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 8px',
                    borderBottom: '1px solid #2a2a2a',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <div style={{ color: '#f3f4f6', fontWeight: 500, wordBreak: 'break-all' }}>{m.rawName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#93c5fd', marginTop: 4 }}>→ {m.masterName}</div>
                    {m.createdAt != null && (
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 4 }}>
                        {typeof m.createdAt === 'string'
                          ? m.createdAt
                          : new Date(m.createdAt).toLocaleString('ko-KR')}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={unmapping === m.rawName || saving}
                    onClick={() => handleUnmap(m.rawName)}
                    style={{
                      flexShrink: 0,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #b91c1c',
                      backgroundColor: unmapping === m.rawName ? '#3f1d1d' : '#7f1d1d',
                      color: '#fecaca',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: unmapping === m.rawName || saving ? 'not-allowed' : 'pointer',
                      opacity: unmapping === m.rawName || saving ? 0.7 : 1,
                    }}
                  >
                    {unmapping === m.rawName ? '처리 중…' : '매핑 취소'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
