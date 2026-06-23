import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminClient } from '../api/adminClient'
import RecipeEditModal from './RecipeEditModal'

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
  /** @type {[Set<string>, function]} 미분류에서 선택된 rawName 집합 */
  const [selected, setSelected] = useState(() => new Set())
  const [masterName, setMasterName] = useState('')
  const [singleMappingModalOpen, setSingleMappingModalOpen] = useState(false)
  /** @type {[Set<string>, function]} 아코디언 펼쳐진 마스터명 집합 */
  const [expandedMasters, setExpandedMasters] = useState(() => new Set())
  const [mappedSearch, setMappedSearch] = useState('')
  const [previewRawName, setPreviewRawName] = useState('')
  const [previewRecipes, setPreviewRecipes] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [editRecipeId, setEditRecipeId] = useState(null)

  const selectedIngredients = useMemo(() => Array.from(selected), [selected])

  /** mappedRows를 masterName 기준으로 그룹핑 */
  const mappedGroups = useMemo(() => {
    const map = new Map()
    mappedRows.forEach((m) => {
      if (!map.has(m.masterName)) map.set(m.masterName, [])
      map.get(m.masterName).push({ rawName: m.rawName, createdAt: m.createdAt })
    })
    return map
  }, [mappedRows])

  /** 매핑 완료 목록: 검색어로 필터 후 ㄱㄴ순 정렬 */
  const filteredSortedGroups = useMemo(() => {
    const term = mappedSearch.trim().toLowerCase()
    const entries = Array.from(mappedGroups.entries())
    const filtered = term
      ? entries.filter(
          ([master, raws]) =>
            master.toLowerCase().includes(term) ||
            raws.some(({ rawName }) => rawName.toLowerCase().includes(term)),
        )
      : entries
    return filtered.sort(([a], [b]) => a.localeCompare(b, 'ko'))
  }, [mappedGroups, mappedSearch])

  /** 단건 매핑 모달: 마스터명 입력값에 이미 매핑된 raw 미리보기 */
  const existingRawsForMaster = useMemo(() => {
    const key = masterName.trim()
    if (!key) return []
    return mappedGroups.get(key) ?? []
  }, [masterName, mappedGroups])

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

  const selectAll = () => setSelected(new Set(rows.map((r) => r.rawName)))
  const clearSelection = () => setSelected(new Set())

  const handleSingleMappingOpen = () => {
    setMasterName('')
    setSuggestionInfo('')
    setSingleMappingModalOpen(true)
  }

  const toggleMasterExpand = (master) => {
    setExpandedMasters((prev) => {
      const next = new Set(prev)
      if (next.has(master)) next.delete(master)
      else next.add(master)
      return next
    })
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
      setSingleMappingModalOpen(false)
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

  const handleRawNameClick = async (rawName) => {
    setPreviewRawName(rawName)
    setPreviewRecipes([])
    setPreviewLoading(true)
    try {
      const res = await adminClient.get(
        `/api/v1/admin/ingredients/unclassified/${encodeURIComponent(rawName)}/recipes`,
      )
      setPreviewRecipes(res.data || [])
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.statusText || e.message
      setError(typeof msg === 'string' ? msg : '레시피 목록을 불러오지 못했습니다.')
      setPreviewRawName('')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handlePreviewRefetch = useCallback(async () => {
    if (!previewRawName) return
    setPreviewLoading(true)
    try {
      const res = await adminClient.get(
        `/api/v1/admin/ingredients/unclassified/${encodeURIComponent(previewRawName)}/recipes`,
      )
      setPreviewRecipes(res.data || [])
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.statusText || e.message
      setError(typeof msg === 'string' ? msg : '레시피 목록을 새로고침하지 못했습니다.')
    } finally {
      setPreviewLoading(false)
    }
  }, [previewRawName])

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
        왼쪽 <strong style={{ color: '#d4d4d4' }}>미분류 목록</strong>에서 항목을 선택한 뒤{' '}
        <strong style={{ color: '#d4d4d4' }}>[단건 매핑]</strong>으로 마스터명을 지정합니다. 오른쪽{' '}
        <strong style={{ color: '#d4d4d4' }}>매핑 완료 목록</strong>에서 마스터명을 클릭해 raw 목록을 펼치고 개별 매핑을 해제할 수 있습니다.
        (이름은 서버에서 공백 제거 규칙으로 정규화됩니다.)
      </p>

      {/* 상단 버튼 영역 */}
      <div style={{ marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleSingleMappingOpen}
          disabled={loading}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #10b981',
            background: loading ? '#2a2a2a' : '#052e16',
            color: loading ? '#737373' : '#6ee7b7',
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
          }}
        >
          + 단건 매핑
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
          📋 JSON 일괄 등록
        </button>
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
          {bulkAnalyzing ? '분석 중…' : '🚀 AI 그룹핑 분석'}
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

      {/* 2열 그리드 */}
      <div
        className="ingredient-normalize-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        {/* 1) 미분류 목록 */}
        <section style={panelShell} aria-label="미분류 목록">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontWeight: 'bold', color: '#e5e5e5' }}>미분류 목록</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                    <span
                      onClick={(e) => { e.stopPropagation(); handleRawNameClick(r.rawName) }}
                      style={{
                        flex: 1,
                        color: '#f3f4f6',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textDecoration: 'underline dotted',
                        textUnderlineOffset: 3,
                      }}
                    >
                      {r.rawName}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#9ca3af', flexShrink: 0 }}>{r.occurrenceCount}회</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 2) 매핑 완료 목록 — 아코디언 */}
        <section style={panelShell} aria-label="매핑 완료 목록">
          <div style={{ fontWeight: 'bold', color: '#e5e5e5', marginBottom: 10, flexShrink: 0 }}>
            매핑 완료 목록
            {mappedGroups.size > 0 && (
              <span style={{ fontSize: '0.8rem', color: '#737373', fontWeight: 400, marginLeft: 8 }}>
                ({mappedGroups.size}개 마스터 / {mappedRows.length}개 raw)
              </span>
            )}
          </div>
          {mappedGroups.size > 0 && (
            <input
              type="text"
              value={mappedSearch}
              onChange={(e) => setMappedSearch(e.target.value)}
              placeholder="마스터명 또는 재료명 검색…"
              style={{
                flexShrink: 0,
                marginBottom: 10,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #333',
                backgroundColor: '#0f0f0f',
                color: '#f3f4f6',
                fontSize: '0.83rem',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          )}
          <div style={scrollListStyle}>
            {mappedLoading ? (
              <div style={{ color: '#888' }}>불러오는 중…</div>
            ) : mappedGroups.size === 0 ? (
              <div style={{ color: '#666', textAlign: 'center', padding: 24 }}>매핑된 재료가 없습니다.</div>
            ) : filteredSortedGroups.length === 0 ? (
              <div style={{ color: '#666', textAlign: 'center', padding: 24 }}>검색 결과가 없습니다.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {filteredSortedGroups.map(([master, raws]) => {
                  const isOpen = expandedMasters.has(master)
                  return (
                    <li key={master} style={{ borderBottom: '1px solid #2a2a2a' }}>
                      {/* 아코디언 헤더 */}
                      <button
                        type="button"
                        onClick={() => toggleMasterExpand(master)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '11px 8px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ color: '#6b7280', fontSize: '0.8rem', flexShrink: 0, width: 16 }}>
                          {isOpen ? '▼' : '▶'}
                        </span>
                        <span style={{ flex: 1, color: '#f3f4f6', fontWeight: 600 }}>{master}</span>
                        <span style={{ fontSize: '0.78rem', color: '#6b7280', flexShrink: 0 }}>
                          {raws.length}개
                        </span>
                      </button>
                      {/* 아코디언 본문 */}
                      {isOpen && (
                        <ul style={{ listStyle: 'none', margin: 0, padding: '0 0 8px 28px' }}>
                          {raws.map(({ rawName, createdAt }) => (
                            <li
                              key={rawName}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '7px 8px',
                                borderTop: '1px solid #1f1f1f',
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: '#d4d4d4', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                                  {rawName}
                                </div>
                                {createdAt != null && (
                                  <div style={{ fontSize: '0.7rem', color: '#525252', marginTop: 2 }}>
                                    {typeof createdAt === 'string'
                                      ? createdAt
                                      : new Date(createdAt).toLocaleString('ko-KR')}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                disabled={unmapping === rawName || saving}
                                onClick={() => handleUnmap(rawName)}
                                style={{
                                  flexShrink: 0,
                                  padding: '5px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #b91c1c',
                                  backgroundColor: unmapping === rawName ? '#3f1d1d' : '#7f1d1d',
                                  color: '#fecaca',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: unmapping === rawName || saving ? 'not-allowed' : 'pointer',
                                  opacity: unmapping === rawName || saving ? 0.7 : 1,
                                }}
                              >
                                {unmapping === rawName ? '처리 중…' : '매핑 취소'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
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

      {/* 단건 매핑 모달 */}
      {singleMappingModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="single-mapping-modal-title"
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
          onClick={() => !saving && setSingleMappingModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: 'min(88vh, 800px)',
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
            {/* 헤더 */}
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
                <div id="single-mapping-modal-title" style={{ fontWeight: 900, color: '#fff', fontSize: '1.05rem' }}>
                  단건 매핑
                </div>
                <div style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: 4 }}>
                  선택한 <strong style={{ color: '#fafafa' }}>{selected.size}</strong>개 원본을 마스터명으로 매핑합니다.
                </div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setSingleMappingModalOpen(false)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #444',
                  background: '#1f1f1f',
                  color: '#e5e5e5',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                닫기
              </button>
            </div>

            {/* 본문 */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* 선택된 재료 목록 */}
              {selectedIngredients.length > 0 ? (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#0f0f0f',
                    border: '1px solid #333',
                    fontSize: '0.78rem',
                    color: '#a3a3a3',
                  }}
                >
                  <div style={{ color: '#737373', marginBottom: 6 }}>선택된 재료</div>
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                    {selectedIngredients.slice(0, 40).map((name) => (
                      <li key={name} style={{ wordBreak: 'break-all' }}>{name}</li>
                    ))}
                  </ul>
                  {selectedIngredients.length > 40 && (
                    <div style={{ marginTop: 6, color: '#525252' }}>외 {selectedIngredients.length - 40}건…</div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: '#1c1200', border: '1px solid #713f12', color: '#fbbf24', fontSize: '0.82rem' }}>
                  미분류 목록에서 재료를 먼저 선택하세요.
                </div>
              )}

              {/* 마스터명 입력 + AI 추천 */}
              <div>
                <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginBottom: 6 }}>마스터명</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={masterName}
                    onChange={(e) => setMasterName(e.target.value)}
                    placeholder="예: 스팸"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #444',
                      backgroundColor: '#121212',
                      color: '#fff',
                      fontSize: '0.9rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSuggest}
                    disabled={suggesting || selected.size === 0}
                    title={selected.size === 0 ? '재료를 먼저 선택하세요' : 'Gemini 로 마스터명 추천'}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid ' + (suggesting ? '#444' : '#a855f7'),
                      background: suggesting ? '#1a1a1a' : selected.size === 0 ? '#1a1428' : '#2a1a3f',
                      color: suggesting || selected.size === 0 ? '#7c6f99' : '#e9d5ff',
                      cursor: suggesting || selected.size === 0 ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {suggesting ? '추천 중…' : '✨ AI 추천'}
                  </button>
                </div>
              </div>

              {/* AI 추천 정보 배너 */}
              {suggestionInfo && (
                <div
                  style={{
                    padding: '8px 12px',
                    background: '#2a1a3f',
                    border: '1px solid #6b21a8',
                    borderRadius: 8,
                    color: '#e9d5ff',
                    fontSize: '0.78rem',
                    lineHeight: 1.5,
                  }}
                >
                  {suggestionInfo}
                </div>
              )}

              {/* 기존 매핑 미리보기 */}
              {existingRawsForMaster.length > 0 && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#0c1a2e',
                    border: '1px solid #1e3a5f',
                    fontSize: '0.78rem',
                  }}
                >
                  <div style={{ color: '#93c5fd', marginBottom: 6 }}>
                    ↳ &quot;{masterName.trim()}&quot; 에 이미 묶인 raw ({existingRawsForMaster.length}개)
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, color: '#7dd3fc' }}>
                    {existingRawsForMaster.map(({ rawName }) => (
                      <li key={rawName} style={{ wordBreak: 'break-all' }}>{rawName}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 푸터 */}
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
                disabled={saving}
                onClick={() => setSingleMappingModalOpen(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1px solid #444',
                  background: '#1e1e1e',
                  color: '#e5e5e5',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="button"
                disabled={saving || loading}
                onClick={handleSave}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: saving ? '#444' : '#10b981',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: saving || loading ? 'not-allowed' : 'pointer',
                  boxShadow: saving ? 'none' : '0 8px 24px rgba(16,185,129,0.3)',
                }}
              >
                {saving ? '저장 중…' : '매핑 저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON 일괄 등록 모달 */}
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
                  JSON 일괄 등록
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

      {/* AI 그룹핑 승인 모달 */}
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
              {Object.entries(bulkGroups).map(([master, raws]) => {
                const existingRaws = mappedGroups.get(master) ?? []
                return (
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
                    {/* 기존 raw — disabled+checked 체크박스 */}
                    {existingRaws.length > 0 && (
                      <>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: 6 }}>
                          기존 ({existingRaws.length}개)
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                          {existingRaws.map(({ rawName }) => (
                            <label
                              key={rawName}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 12px',
                                borderRadius: 10,
                                border: '1px solid #3f3f46',
                                background: '#1c1917',
                                color: '#f5f5f4',
                                fontSize: '0.85rem',
                                opacity: 0.4,
                                cursor: 'default',
                                pointerEvents: 'none',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked
                                readOnly
                                disabled
                                style={{ width: 16, height: 16, accentColor: '#f97316', cursor: 'default' }}
                              />
                              <span style={{ wordBreak: 'break-all' }}>{rawName}</span>
                            </label>
                          ))}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: 8 }}>새로 추가</div>
                      </>
                    )}
                    {/* 새로 추가될 raw — 체크박스 */}
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
                )
              })}
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
      {/* 레시피 수정 모달 — 미리보기 모달(10000) 위에 쌓이도록 zIndex=11000 */}
      {editRecipeId != null && (
        <RecipeEditModal
          recipeId={editRecipeId}
          zIndex={11000}
          onClose={() => setEditRecipeId(null)}
          onSaved={() => {
            setEditRecipeId(null)
            handlePreviewRefetch()
            load()
          }}
        />
      )}

      {/* 재료명 클릭 — 포함 레시피 미리보기 모달 */}
      {previewRawName && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-modal-title"
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
          onClick={() => !previewLoading && setPreviewRawName('')}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 720,
              maxHeight: 'min(88vh, 920px)',
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
            {/* 헤더 */}
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
                <div id="preview-modal-title" style={{ fontWeight: 900, color: '#fff', fontSize: '1.05rem' }}>
                  [ {previewRawName} ] 포함 레시피
                </div>
                <div style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: 4 }}>
                  {previewLoading
                    ? '불러오는 중…'
                    : `${previewRecipes.length}개의 레시피에서 이 재료가 사용됩니다.`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewRawName('')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #444',
                  background: '#1f1f1f',
                  color: '#e5e5e5',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
              >
                닫기
              </button>
            </div>

            {/* 본문 */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 20px' }}>
              {previewLoading ? (
                <div style={{ color: '#888', textAlign: 'center', padding: 32 }}>불러오는 중…</div>
              ) : previewRecipes.length === 0 ? (
                <div style={{ color: '#666', textAlign: 'center', padding: 32 }}>
                  이 재료가 포함된 레시피가 없습니다.
                </div>
              ) : (
                previewRecipes.map((recipe, idx) => (
                  <div
                    key={recipe.id}
                    style={{
                      paddingBottom: 20,
                      marginBottom: 20,
                      borderBottom: idx < previewRecipes.length - 1 ? '1px solid #2a2a2a' : 'none',
                    }}
                  >
                    {/* 레시피 메타 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#f3f4f6', fontSize: '0.95rem', flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                        {recipe.title}
                      </span>
                      {recipe.status && (
                        <span style={{
                          flexShrink: 0,
                          fontSize: '0.7rem',
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: recipe.status === 'SUCCESS' ? '#14532d' : '#3f1d1d',
                          color: recipe.status === 'SUCCESS' ? '#86efac' : '#fca5a5',
                          fontWeight: 600,
                        }}>
                          {recipe.status}
                        </span>
                      )}
                      {recipe.displayStatus === 'HIDDEN' && (
                        <span style={{
                          flexShrink: 0,
                          fontSize: '0.7rem',
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: '#292524',
                          color: '#a8a29e',
                          fontWeight: 600,
                        }}>
                          HIDDEN
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditRecipeId(recipe.id)}
                        style={{
                          flexShrink: 0,
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: '1px solid #4b5563',
                          background: '#1f2937',
                          color: '#d1d5db',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        ✏️ 수정
                      </button>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 10 }}>
                      {recipe.youtuberName || '—'}
                    </div>
                    {/* 유튜브 임베드 */}
                    {recipe.videoId ? (
                      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${recipe.videoId}`}
                          title={recipe.title}
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            border: 'none',
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#525252', padding: '12px 0' }}>
                        영상 ID가 없어 임베드할 수 없습니다.
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
