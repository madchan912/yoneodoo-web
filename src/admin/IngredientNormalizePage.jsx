import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminClient } from '../api/adminClient'

const PANEL_MAX_H = 'min(72vh, 880px)'

export default function IngredientNormalizePage() {
  const [rows, setRows] = useState([])
  const [mappedRows, setMappedRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [mappedLoading, setMappedLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [unmapping, setUnmapping] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  /** @type {[Set<string>, function]} 미분류에서 선택된 rawName 집합 (기존 selected와 동일 역할) */
  const [selected, setSelected] = useState(() => new Set())
  const [masterName, setMasterName] = useState('')

  const selectedIngredients = useMemo(() => Array.from(selected), [selected])

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
        rawNames: selectedIngredients,
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

  const panelShell = {
    border: '1px solid #333',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#1a1a1a',
    maxHeight: PANEL_MAX_H,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  }

  const scrollListStyle = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    marginLeft: -4,
    marginRight: -4,
    paddingLeft: 4,
    paddingRight: 4,
  }

  return (
    <div>
      <h2 style={{ marginTop: 0, color: '#fff' }}>재료 정규화 매핑</h2>
      <p style={{ color: '#888', fontSize: '0.9rem', maxWidth: 960 }}>
        왼쪽 <strong style={{ color: '#d4d4d4' }}>미분류 목록</strong>에서 항목을 선택한 뒤, 가운데{' '}
        <strong style={{ color: '#d4d4d4' }}>마스터명 입력·매핑 저장</strong>으로 묶습니다. 오른쪽{' '}
        <strong style={{ color: '#d4d4d4' }}>매핑 완료 목록</strong>에서 개별 매핑을 해제할 수 있습니다. (이름은 서버에서 공백
        제거 규칙으로 정규화됩니다.)
      </p>

      {error && (
        <div style={{ color: '#f87171', marginBottom: 12, padding: 12, background: '#2a1515', borderRadius: 8 }}>{error}</div>
      )}
      {success && (
        <div style={{ color: '#6ee7b7', marginBottom: 12, padding: 12, background: '#14261f', borderRadius: 8 }}>{success}</div>
      )}

      <div
        className="ingredient-normalize-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 280px) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        {/* 1) 미분류 목록만 스크롤 */}
        <section style={panelShell} aria-label="미분류 목록">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
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

          <div style={scrollListStyle}>
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
                    <span style={{ fontSize: '0.8rem', color: '#9ca3af', flexShrink: 0 }}>{r.occurrenceCount}회</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 2) 마스터명 + 저장 — 항상 한 열에 고정, 목록 스크롤과 분리 */}
        <section
          style={{
            ...panelShell,
            maxHeight: PANEL_MAX_H,
            backgroundColor: '#161616',
            borderColor: '#3f3f46',
          }}
          aria-label="마스터명 입력 및 매핑 저장"
        >
          <div style={{ fontWeight: 'bold', color: '#e5e5e5', marginBottom: 10 }}>마스터명 입력 · 저장</div>
          <p style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: 0, marginBottom: 12, lineHeight: 1.45 }}>
            선택한 <strong style={{ color: '#fafafa' }}>{selected.size}</strong>개 원본을 아래 마스터명으로 매핑합니다.
          </p>

          {selectedIngredients.length > 0 && (
            <div
              style={{
                maxHeight: 120,
                overflowY: 'auto',
                marginBottom: 12,
                padding: '8px 10px',
                borderRadius: 8,
                background: '#0f0f0f',
                border: '1px solid #333',
                fontSize: '0.75rem',
                color: '#a3a3a3',
              }}
            >
              <div style={{ color: '#737373', marginBottom: 6 }}>선택된 재료</div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                {selectedIngredients.slice(0, 40).map((name) => (
                  <li key={name} style={{ wordBreak: 'break-all' }}>
                    {name}
                  </li>
                ))}
              </ul>
              {selectedIngredients.length > 40 && (
                <div style={{ marginTop: 6, color: '#525252' }}>외 {selectedIngredients.length - 40}건…</div>
              )}
            </div>
          )}

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
              marginBottom: 12,
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
        </section>

        {/* 3) 매핑 완료 목록만 스크롤 */}
        <section style={panelShell} aria-label="매핑 완료 목록">
          <div style={{ fontWeight: 'bold', color: '#e5e5e5', marginBottom: 12, flexShrink: 0 }}>매핑 완료 목록</div>
          <div style={scrollListStyle}>
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
        </section>
      </div>

      {/* 좁은 화면: 한 열로 쌓이도록 */}
      <style>
        {`
          @media (max-width: 960px) {
            .ingredient-normalize-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </div>
  )
}
