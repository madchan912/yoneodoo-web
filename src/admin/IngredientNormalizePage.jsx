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
  const [suggesting, setSuggesting] = useState(false)
  const [suggestionInfo, setSuggestionInfo] = useState('')
  /** 전체 미분류 AI 그룹핑 승인 모달 */
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  /** @type {Record<string, string[]> | null} */
  const [bulkGroups, setBulkGroups] = useState(null)
  /** @type {Record<string, boolean>} key = `${master}|||${raw}` */
  const [bulkChecked, setBulkChecked] = useState({})
  const [bulkSaving, setBulkSaving] = useState(false)
  const [jsonPasteModalOpen, setJsonPasteModalOpen] = useState(false)
  const [jsonPasteText, setJsonPasteText] = useState('')
  const [jsonPasteError, setJsonPasteError] = useState('')
  /** @type {[Set<string>, function]} 미분류에서 선택된 rawName 집합 (기존 selected와 동일 역할) */
  const [selected, setSelected] = useState(() => new Set())
  const [masterName, setMasterName] = useState('')

  const selectedIngredients = useMemo(() => Array.from(selected), [selected])

  useEffect(() => {
    if (!bulkModalOpen || !bulkGroups) return
    const next = {}
    Object.entries(bulkGroups).forEach(([master, raws]) => {
      ;(raws || []).forEach((raw) => {
        next[`${master}|||${raw}`] = true
      })
    })
    setBulkChecked(next)
  }, [bulkModalOpen, bulkGroups])

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

  const handleSuggest = async () => {
    setError('')
    setSuccess('')
    setSuggestionInfo('')
    if (selected.size === 0) {
      setError('AI 추천을 받을 원본 재료를 하나 이상 선택하세요.')
      return
    }
    setSuggesting(true)
    try {
      const res = await adminClient.post('/api/v1/admin/ingredients/suggest', {
        rawNames: selectedIngredients,
      })
      const suggestion = (res.data?.suggestion || '').trim()
      if (!suggestion) {
        setError('AI 가 추천값을 만들지 못했습니다. 다시 시도하거나 직접 입력해 주세요.')
        return
      }
      setMasterName(suggestion)
      setSuggestionInfo(
        `✨ AI 추천: "${suggestion}" (${res.data?.model || 'gemini'}). 확인 후 [매핑 저장] 을 눌러주세요.`,
      )
    } catch (e) {
      const status = e.response?.status
      let msg
      if (status === 503) msg = 'Gemini API 키가 서버에 설정되어 있지 않습니다. (application-local.yaml 또는 GEMINI_API_KEY 확인)'
      else if (status === 504) msg = 'Gemini 호출이 시간 초과되었습니다. 잠시 후 다시 시도해 주세요.'
      else if (status === 502) msg = 'Gemini 응답을 해석하지 못했습니다. 잠시 후 다시 시도해 주세요.'
      else msg = e.response?.data?.message || e.response?.statusText || e.message || 'AI 추천에 실패했습니다.'
      setError(typeof msg === 'string' ? msg : 'AI 추천에 실패했습니다.')
    } finally {
      setSuggesting(false)
    }
  }

  const bulkCheckKey = (master, raw) => `${master}|||${raw}`

  const handleBulkAnalyze = async () => {
    setError('')
    setSuccess('')
    setBulkAnalyzing(true)
    try {
      const res = await adminClient.post('/api/v1/admin/ingredients/bulk-suggest')
      const data = res.data
      if (data == null || typeof data !== 'object' || Array.isArray(data)) {
        setError('그룹 결과 형식이 올바르지 않습니다.')
        return
      }
      const keys = Object.keys(data)
      if (keys.length === 0) {
        setSuccess('미분류 재료가 없거나 AI 가 빈 그룹을 반환했습니다.')
        return
      }
      setBulkGroups(data)
      setBulkModalOpen(true)
    } catch (e) {
      const status = e.response?.status
      let msg
      if (status === 503) msg = 'Gemini API 키가 서버에 설정되어 있지 않습니다.'
      else if (status === 504) msg = 'Gemini 호출이 시간 초과되었습니다. 재료가 많으면 나중에 다시 시도해 주세요.'
      else if (status === 502) msg = e.response?.data?.message || 'Gemini 응답을 해석하지 못했습니다.'
      else msg = e.response?.data?.message || e.response?.statusText || e.message || '일괄 그룹핑 분석에 실패했습니다.'
      setError(typeof msg === 'string' ? msg : '일괄 그룹핑 분석에 실패했습니다.')
    } finally {
      setBulkAnalyzing(false)
    }
  }

  const handleJsonPasteOpen = () => {
    setJsonPasteText('')
    setJsonPasteError('')
    setJsonPasteModalOpen(true)
  }

  const handleJsonPasteApply = () => {
    setJsonPasteError('')
    let parsed
    try {
      parsed = JSON.parse(jsonPasteText)
    } catch {
      setJsonPasteError('유효한 JSON 형식이 아닙니다.')
      return
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setJsonPasteError('최상위 값은 객체({ })여야 합니다.')
      return
    }
    const entries = Object.entries(parsed)
    if (entries.length === 0) {
      setJsonPasteError('최소 한 개의 마스터명 항목이 필요합니다.')
      return
    }
    for (const [master, raws] of entries) {
      if (typeof master !== 'string' || master.trim() === '') {
        setJsonPasteError('마스터명(키)은 비어 있지 않은 문자열이어야 합니다.')
        return
      }
      if (!Array.isArray(raws) || raws.length === 0) {
        setJsonPasteError(`"${master}"의 값은 비어 있지 않은 배열이어야 합니다.`)
        return
      }
      for (const raw of raws) {
        if (typeof raw !== 'string' || raw.trim() === '') {
          setJsonPasteError(`"${master}" 배열 안에 비어 있는 문자열이 있습니다.`)
          return
        }
      }
    }
    setBulkGroups(parsed)
    setBulkModalOpen(true)
    setJsonPasteModalOpen(false)
  }

  const toggleBulkItem = (master, raw) => {
    const k = bulkCheckKey(master, raw)
    setBulkChecked((prev) => {
      const wasChecked = prev[k] !== false
      return { ...prev, [k]: !wasChecked }
    })
  }

  const handleBulkApproveSave = async () => {
    if (!bulkGroups) return
    const items = []
    Object.entries(bulkGroups).forEach(([master, raws]) => {
      ;(raws || []).forEach((raw) => {
        const k = bulkCheckKey(master, raw)
        if (bulkChecked[k] !== false) items.push({ rawName: raw, masterName: master })
      })
    })
    if (items.length === 0) {
      setError('저장할 항목이 없습니다. 최소 한 건 이상 체크되어 있어야 합니다.')
      return
    }
    setError('')
    setSuccess('')
    setBulkSaving(true)
    try {
      const res = await adminClient.post('/api/v1/admin/ingredients/bulk-map', { items })
      const n = res.data?.updated ?? items.length
      setSuccess(`일괄 승인 저장 완료 (${n}건). 목록을 새로고침합니다.`)
      setBulkModalOpen(false)
      setBulkGroups(null)
      await load()
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.statusText || e.message
      setError(typeof msg === 'string' ? msg : '일괄 저장에 실패했습니다.')
    } finally {
      setBulkSaving(false)
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

      <div style={{ marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleBulkAnalyze}
          disabled={bulkAnalyzing || loading}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #f97316',
            background: bulkAnalyzing || loading ? '#2a2a2a' : '#431407',
            color: bulkAnalyzing || loading ? '#737373' : '#ffedd5',
            fontWeight: 800,
            cursor: bulkAnalyzing || loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
          }}
        >
          {bulkAnalyzing ? '분석 중…' : '🚀 전체 미분류 AI 그룹핑 분석'}
        </button>
        <button
          type="button"
          onClick={handleJsonPasteOpen}
          disabled={loading}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #3b82f6',
            background: loading ? '#2a2a2a' : '#172554',
            color: loading ? '#737373' : '#bfdbfe',
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
          }}
        >
          📋 JSON 그룹핑 붙여넣기
        </button>
        <span style={{ fontSize: '0.8rem', color: '#737373', maxWidth: 520, lineHeight: 1.45 }}>
          미분류 재료 전체를 Gemini 에게 보내 마스터별 그룹을 받습니다. 결과는 승인 모달에서 검토한 뒤 일괄 저장됩니다 (자동 DB 저장 없음).
        </span>
      </div>

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontWeight: 'bold', color: '#e5e5e5' }}>미분류 목록</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSuggest}
                disabled={suggesting || selected.size === 0}
                title={selected.size === 0 ? '재료를 먼저 선택하세요' : 'Gemini 로 마스터명 추천'}
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid ' + (suggesting ? '#444' : '#a855f7'),
                  background: suggesting ? '#1a1a1a' : selected.size === 0 ? '#1a1428' : '#2a1a3f',
                  color: suggesting || selected.size === 0 ? '#7c6f99' : '#e9d5ff',
                  cursor: suggesting || selected.size === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {suggesting ? '추천 중…' : '✨ AI 매핑 추천'}
              </button>
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
            placeholder="예: 스팸 (또는 [✨ AI 매핑 추천] 버튼으로 자동 입력)"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid #444',
              backgroundColor: '#121212',
              color: '#fff',
              marginBottom: suggestionInfo ? 6 : 12,
            }}
          />
          {suggestionInfo && (
            <div
              style={{
                marginBottom: 12,
                padding: '8px 10px',
                background: '#2a1a3f',
                border: '1px solid #6b21a8',
                borderRadius: 8,
                color: '#e9d5ff',
                fontSize: '0.75rem',
                lineHeight: 1.5,
              }}
            >
              {suggestionInfo}
            </div>
          )}
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

      {jsonPasteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="json-paste-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setJsonPasteModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 640,
              background: '#141414',
              border: '1px solid #3f3f46',
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #2a2a2a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div>
                <div id="json-paste-modal-title" style={{ fontWeight: 900, color: '#fff', fontSize: '1.05rem' }}>
                  JSON 그룹핑 붙여넣기
                </div>
                <div style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: 4 }}>
                  형식: {`{ "마스터명": ["raw1", "raw2", ...], ... }`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setJsonPasteModalOpen(false)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #444',
                  background: '#1f1f1f',
                  color: '#e5e5e5',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                닫기
              </button>
            </div>

            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea
                value={jsonPasteText}
                onChange={(e) => { setJsonPasteText(e.target.value); setJsonPasteError('') }}
                placeholder={'{\n  "참치": ["참치1캔", "캔참치"],\n  "계란": ["달걀", "계란2개"]\n}'}
                spellCheck={false}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  height: 240,
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid ' + (jsonPasteError ? '#ef4444' : '#444'),
                  backgroundColor: '#0f0f0f',
                  color: '#f3f4f6',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  lineHeight: 1.6,
                }}
              />
              {jsonPasteError && (
                <div style={{ color: '#f87171', fontSize: '0.82rem', padding: '8px 12px', background: '#2a1515', borderRadius: 8 }}>
                  {jsonPasteError}
                </div>
              )}
            </div>

            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #2a2a2a',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                flexShrink: 0,
                background: '#111',
              }}
            >
              <button
                type="button"
                onClick={() => setJsonPasteModalOpen(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1px solid #444',
                  background: '#1e1e1e',
                  color: '#e5e5e5',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleJsonPasteApply}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
                }}
              >
                검토 모달로 열기 →
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkModalOpen && bulkGroups && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => !bulkSaving && setBulkModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 920,
              maxHeight: 'min(88vh, 960px)',
              background: '#141414',
              border: '1px solid #3f3f46',
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #2a2a2a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div>
                <div id="bulk-modal-title" style={{ fontWeight: 900, color: '#fff', fontSize: '1.05rem' }}>
                  AI 그룹핑 결과 — 승인 후 저장
                </div>
                <div style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: 4 }}>
                  각 마스터 아래 원본은 기본 체크됨. 잘못 묶인 항목만 체크 해제한 뒤 [일괄 승인 및 저장]을 누르세요.
                </div>
              </div>
              <button
                type="button"
                disabled={bulkSaving}
                onClick={() => setBulkModalOpen(false)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #444',
                  background: '#1f1f1f',
                  color: '#e5e5e5',
                  cursor: bulkSaving ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                닫기
              </button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 20px' }}>
              {Object.entries(bulkGroups).map(([master, raws]) => (
                <section key={master} style={{ marginBottom: 22 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      color: '#fdba74',
                      marginBottom: 10,
                      fontSize: '0.95rem',
                      letterSpacing: '0.02em',
                    }}
                  >
                    [ {master} ]
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {(raws || []).map((raw) => {
                      const k = bulkCheckKey(master, raw)
                      const checked = bulkChecked[k] !== false
                      return (
                        <label
                          key={k}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            borderRadius: 10,
                            border: '1px solid ' + (checked ? '#3f3f46' : '#525252'),
                            background: checked ? '#1c1917' : '#0c0a09',
                            color: checked ? '#f5f5f4' : '#78716c',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleBulkItem(master, raw)}
                            style={{
                              width: 16,
                              height: 16,
                              accentColor: '#f97316',
                              cursor: 'pointer',
                            }}
                          />
                          <span style={{ wordBreak: 'break-all' }}>{raw}</span>
                        </label>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #2a2a2a',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                flexShrink: 0,
                background: '#111',
              }}
            >
              <button
                type="button"
                disabled={bulkSaving}
                onClick={() => setBulkModalOpen(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1px solid #444',
                  background: '#1e1e1e',
                  color: '#e5e5e5',
                  cursor: bulkSaving ? 'not-allowed' : 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="button"
                disabled={bulkSaving}
                onClick={handleBulkApproveSave}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: bulkSaving ? '#444' : '#ea580c',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: bulkSaving ? 'not-allowed' : 'pointer',
                  boxShadow: bulkSaving ? 'none' : '0 8px 24px rgba(234,88,12,0.35)',
                }}
              >
                {bulkSaving ? '저장 중…' : '일괄 승인 및 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
