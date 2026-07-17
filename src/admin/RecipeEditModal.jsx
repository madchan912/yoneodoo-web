import { useCallback, useEffect, useState } from 'react'
import { adminClient } from '../api/adminClient'

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  backdropFilter: 'blur(3px)',
}

const card = {
  width: '100%',
  maxWidth: 1100,
  maxHeight: 'min(90vh, 920px)',
  background: '#161616',
  border: '1px solid #333',
  borderRadius: 14,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const header = {
  padding: '16px 20px',
  borderBottom: '1px solid #2a2a2a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
}

const topSection = {
  padding: '16px 20px',
  borderBottom: '1px solid #2a2a2a',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const splitRow = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
}

const leftPanel = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid #2a2a2a',
}

const rightPanel = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
}

const panelHeader = {
  padding: '10px 16px',
  fontSize: '0.82rem',
  color: '#a1a1aa',
  borderBottom: '1px solid #1f1f1f',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const panelScroll = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: 14,
}

const footer = {
  padding: '12px 20px',
  borderTop: '1px solid #2a2a2a',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  flexShrink: 0,
}

const labelStyle = { display: 'block', fontSize: '0.85rem', color: '#a1a1aa', marginBottom: 6 }

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #3f3f46',
  background: '#0f0f0f',
  color: '#fff',
  fontSize: '0.95rem',
}

const ingRow = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto',
  gap: 8,
  alignItems: 'start',
}

const smallBtn = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #444',
  background: '#1f1f1f',
  color: '#e5e5e5',
  cursor: 'pointer',
  fontSize: '0.8rem',
}

export default function RecipeEditModal({ recipeId, onClose, onSaved, zIndex: zIndexProp }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [title, setTitle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [ingredients, setIngredients] = useState([])
  const [displayStatus, setDisplayStatus] = useState('ACTIVE')
  const [status, setStatus] = useState('')
  const [originalStatus, setOriginalStatus] = useState('')
  const [copyState, setCopyState] = useState('idle')
  /** 매핑 완료된 raw_name 집합 — 미매핑 재료 강조 표시용 */
  const [mappedNames, setMappedNames] = useState(null)

  const load = useCallback(async () => {
    if (recipeId == null) return
    setLoading(true)
    setError('')
    try {
      const [recipeRes, mappedRes] = await Promise.all([
        adminClient.get(`/api/v1/admin/recipes/${recipeId}`),
        adminClient.get('/api/v1/admin/ingredients/mapped-names'),
      ])
      const d = recipeRes.data || {}
      setDetail(d)
      setTitle(d.title ?? '')
      setYoutubeUrl(d.youtubeUrl ?? '')
      setIngredients(Array.isArray(d.ingredients) ? d.ingredients.map((it) => ({ name: it?.name ?? '', amount: it?.amount ?? '' })) : [])
      setDisplayStatus(d.displayStatus === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE')
      const initialStatus = d.status ?? ''
      setStatus(initialStatus)
      setOriginalStatus(initialStatus)
      setMappedNames(new Set(mappedRes.data || []))
    } catch (e) {
      setError('레시피 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [recipeId])

  useEffect(() => {
    load()
  }, [load])

  const updateIng = (idx, field, value) => {
    setIngredients((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  const removeIng = (idx) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx))
  }

  const addIng = () => {
    setIngredients((prev) => [...prev, { name: '', amount: '' }])
  }

  const handleOpenYoutube = () => {
    const url = (youtubeUrl || '').trim()
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleCopyYoutube = async () => {
    const url = (youtubeUrl || '').trim()
    if (!url) return
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1500)
    } catch {
      setCopyState('error')
      setTimeout(() => setCopyState('idle'), 1800)
    }
  }

  const handleSave = async () => {
    setError('')
    if (!title.trim()) {
      setError('요리명은 비울 수 없습니다.')
      return
    }

    setSaving(true)
    try {
      const cleaned = ingredients
        .map((it) => ({ name: (it.name || '').trim(), amount: (it.amount || '').trim() }))
        .filter((it) => it.name.length > 0)
      const res = await adminClient.put(`/api/v1/admin/recipes/${recipeId}`, {
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim(),
        ingredients: cleaned,
        displayStatus: displayStatus,
        status: status === '' ? null : status,
      })
      if (typeof onSaved === 'function') onSaved(res.data)
      onClose?.()
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.statusText || e.message
      setError(typeof msg === 'string' ? msg : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  /** 재료명이 매핑 목록에 없으면 true */
  const isUnmapped = (name) => {
    const trimmed = (name || '').replace(/\s/g, '')
    if (!trimmed || mappedNames == null) return false
    return !mappedNames.has(trimmed)
  }

  const unmappedCount = mappedNames == null
    ? 0
    : ingredients.filter((it) => isUnmapped(it.name)).length

  return (
    <div style={{ ...overlay, zIndex: zIndexProp ?? 9999 }} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>

        {/* ── 헤더 ── */}
        <div style={header}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>레시피 수정 (ID #{recipeId})</div>
            <div style={{ fontWeight: 'bold', color: '#fff', marginTop: 2 }}>
              {detail?.videoId ? `videoId: ${detail.videoId}` : ' '}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ ...smallBtn, padding: '6px 12px' }}>
            ×
          </button>
        </div>

        {/* ── 상단 고정 필드 ── */}
        <div style={topSection}>
          {error && (
            <div style={{ color: '#f87171', padding: 10, background: '#2a1515', borderRadius: 8 }}>
              {error}
            </div>
          )}

          {/* 요리명 */}
          <div>
            <label style={labelStyle}>요리명 (title)</label>
            <input
              type="text"
              style={inputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 스팸 김치볶음밥"
            />
          </div>

          {/* 노출 상태 + 파이프라인 상태 */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 auto' }}>
              <label style={labelStyle}>노출 상태 (displayStatus)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setDisplayStatus('ACTIVE')}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: '1px solid ' + (displayStatus === 'ACTIVE' ? '#10b981' : '#3f3f46'),
                    background: displayStatus === 'ACTIVE' ? '#064e3b' : '#1a1a1a',
                    color: displayStatus === 'ACTIVE' ? '#a7f3d0' : '#a1a1aa',
                    fontWeight: displayStatus === 'ACTIVE' ? 'bold' : 'normal',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {displayStatus === 'ACTIVE' ? '● ' : '○ '}노출
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayStatus('HIDDEN')}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: '1px solid ' + (displayStatus === 'HIDDEN' ? '#dc2626' : '#3f3f46'),
                    background: displayStatus === 'HIDDEN' ? '#3f1212' : '#1a1a1a',
                    color: displayStatus === 'HIDDEN' ? '#fecaca' : '#a1a1aa',
                    fontWeight: displayStatus === 'HIDDEN' ? 'bold' : 'normal',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {displayStatus === 'HIDDEN' ? '● ' : '○ '}숨김
                </button>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={labelStyle}>
                파이프라인 상태 (status){' '}
                {originalStatus && (
                  <span
                    style={{
                      marginLeft: 6,
                      display: 'inline-block',
                      padding: '1px 7px',
                      borderRadius: 999,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: originalStatus === 'SUCCESS' ? '#064e3b' : originalStatus === 'NO_SUBTITLES' ? '#3f1212' : '#1f1f1f',
                      color: originalStatus === 'SUCCESS' ? '#a7f3d0' : originalStatus === 'NO_SUBTITLES' ? '#fecaca' : '#a1a1aa',
                      border: '1px solid ' + (originalStatus === 'SUCCESS' ? '#065f46' : originalStatus === 'NO_SUBTITLES' ? '#7f1d1d' : '#3f3f46'),
                    }}
                  >
                    현재: {originalStatus}
                  </span>
                )}
              </label>
              <select
                value={status ?? ''}
                onChange={(e) => {
                  const newStatus = e.target.value
                  setStatus(newStatus)
                  if (newStatus === 'NO_SUBTITLES' || newStatus === 'FAILED') {
                    setDisplayStatus('HIDDEN')
                  }
                }}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">(변경 없음 — 기존 값 유지)</option>
                <option value="SUCCESS">SUCCESS — 완료</option>
                <option value="INCOMPLETE">INCOMPLETE — 수량 입력 필요</option>
                <option value="UNMATCHED">UNMATCHED — 정규화 필요</option>
                <option value="NO_SUBTITLES">NO_SUBTITLES — 자막 없음</option>
                <option value="FAILED">FAILED — 실패</option>
                <option value="SKIP">SKIP — 요리 아님</option>
              </select>
              {status && status !== originalStatus && (
                <div style={{ marginTop: 4, fontSize: '0.73rem', color: '#fcd34d' }}>
                  저장 시 <strong>{originalStatus || '(없음)'}</strong> → <strong>{status}</strong> 로 변경됩니다.
                </div>
              )}
            </div>
          </div>

          {/* 유튜브 링크 */}
          <div>
            <label style={labelStyle}>유튜브 링크 (youtubeUrl) — 읽기 전용</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
              <input
                type="text"
                readOnly
                style={{ ...inputStyle, flex: 1, minWidth: 0, background: '#0a0a0a', color: '#9ca3af', cursor: 'not-allowed', borderColor: '#2a2a2a' }}
                value={youtubeUrl}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <button
                type="button"
                onClick={handleOpenYoutube}
                disabled={!youtubeUrl}
                style={{
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid #3f3f46',
                  background: youtubeUrl ? '#1e1e1e' : '#141414',
                  color: youtubeUrl ? '#e5e5e5' : '#555',
                  cursor: youtubeUrl ? 'pointer' : 'not-allowed',
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span aria-hidden>🔗</span> 새창
              </button>
              <button
                type="button"
                onClick={handleCopyYoutube}
                disabled={!youtubeUrl}
                style={{
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid ' + (copyState === 'copied' ? '#10b981' : copyState === 'error' ? '#dc2626' : '#3f3f46'),
                  background: copyState === 'copied' ? '#064e3b' : copyState === 'error' ? '#3f1212' : youtubeUrl ? '#1e1e1e' : '#141414',
                  color: copyState === 'copied' ? '#a7f3d0' : copyState === 'error' ? '#fecaca' : youtubeUrl ? '#e5e5e5' : '#555',
                  cursor: youtubeUrl ? 'pointer' : 'not-allowed',
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                  fontWeight: copyState === 'copied' ? 700 : 400,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                }}
              >
                {copyState === 'copied' ? <>✓ 복사됨</> : copyState === 'error' ? <>⚠ 실패</> : <><span aria-hidden>📋</span> 복사</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── 좌우 분할 영역 ── */}
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
            불러오는 중…
          </div>
        ) : (
          <div style={splitRow}>

            {/* 왼쪽: 자막 */}
            <div style={leftPanel}>
              <div style={panelHeader}>
                <span>자막 (transcript) — 읽기 전용</span>
              </div>
              <div style={panelScroll}>
                {detail?.transcript ? (
                  <pre style={{
                    margin: 0,
                    fontFamily: 'monospace',
                    fontSize: '0.78rem',
                    lineHeight: 1.7,
                    color: '#9ca3af',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {detail.transcript}
                  </pre>
                ) : (
                  <div style={{ color: '#4b5563', fontSize: '0.85rem', paddingTop: 8 }}>자막 없음</div>
                )}
              </div>
            </div>

            {/* 오른쪽: 재료 목록 */}
            <div style={rightPanel}>
              <div style={panelHeader}>
                <span>
                  재료 ({ingredients.length})
                  {unmappedCount > 0 && (
                    <span style={{
                      marginLeft: 8,
                      padding: '1px 7px',
                      borderRadius: 999,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: '#3f1d1d',
                      color: '#fca5a5',
                      border: '1px solid #7f1d1d',
                    }}>
                      ⚠ 미매핑 {unmappedCount}개
                    </span>
                  )}
                </span>
                <button type="button" onClick={addIng} style={{ ...smallBtn, fontSize: '0.75rem', padding: '3px 9px' }}>
                  + 재료 추가
                </button>
              </div>
              <div style={panelScroll}>
                {ingredients.length === 0 ? (
                  <div style={{ color: '#4b5563', textAlign: 'center', paddingTop: 24, fontSize: '0.85rem' }}>
                    재료가 없습니다. [+ 재료 추가]를 눌러 추가하세요.
                  </div>
                ) : (
                  ingredients.map((it, idx) => {
                    const unmapped = isUnmapped(it.name)
                    return (
                      <div key={idx} style={{ marginBottom: 10 }}>
                        <div style={ingRow}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <input
                              type="text"
                              value={it.name}
                              onChange={(e) => updateIng(idx, 'name', e.target.value)}
                              placeholder="재료 이름 (예: 스팸)"
                              style={{
                                ...inputStyle,
                                borderColor: unmapped ? '#b91c1c' : '#3f3f46',
                              }}
                            />
                            {unmapped && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: '#f87171' }}>
                                <span>⚠</span>
                                <span>ingredient_mapping에 없는 재료</span>
                              </div>
                            )}
                          </div>
                          <input
                            type="text"
                            value={it.amount}
                            onChange={(e) => updateIng(idx, 'amount', e.target.value)}
                            placeholder="분량 (예: 1캔)"
                            style={inputStyle}
                          />
                          <button
                            type="button"
                            onClick={() => removeIng(idx)}
                            style={{
                              ...smallBtn,
                              borderColor: '#7f1d1d',
                              color: '#fecaca',
                              background: '#1a0e0e',
                              alignSelf: 'flex-start',
                              paddingTop: 9,
                              paddingBottom: 9,
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
                <div style={{ marginTop: 12, fontSize: '0.73rem', color: '#4b5563' }}>
                  저장 시 서버에서 재료 이름의 공백을 제거합니다.
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── 하단 버튼 ── */}
        <div style={footer}>
          <button type="button" onClick={onClose} disabled={saving} style={smallBtn}>
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: saving ? '#444' : '#10b981',
              color: '#fff',
              fontWeight: 'bold',
              cursor: loading || saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>

      </div>
    </div>
  )
}
