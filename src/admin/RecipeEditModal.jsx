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
  maxWidth: 760,
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
}

const body = {
  padding: 20,
  overflowY: 'auto',
  flex: 1,
  minHeight: 0,
}

const footer = {
  padding: '12px 20px',
  borderTop: '1px solid #2a2a2a',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
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
  marginBottom: 8,
  alignItems: 'center',
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
  const [copyState, setCopyState] = useState('idle') // 'idle' | 'copied' | 'error'

  const load = useCallback(async () => {
    if (recipeId == null) return
    setLoading(true)
    setError('')
    try {
      const res = await adminClient.get(`/api/v1/admin/recipes/${recipeId}`)
      const d = res.data || {}
      setDetail(d)
      setTitle(d.title ?? '')
      setYoutubeUrl(d.youtubeUrl ?? '')
      setIngredients(Array.isArray(d.ingredients) ? d.ingredients.map((it) => ({ name: it?.name ?? '', amount: it?.amount ?? '' })) : [])
      setDisplayStatus(d.displayStatus === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE')
      const initialStatus = d.status ?? ''
      setStatus(initialStatus)
      setOriginalStatus(initialStatus)
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

    let effectiveDisplayStatus = displayStatus
    if (status === 'SUCCESS' && displayStatus === 'HIDDEN') {
      const confirmed = window.confirm(
        'status를 SUCCESS로 변경했습니다. 노출 상태도 ACTIVE로 변경할까요?',
      )
      if (confirmed) {
        effectiveDisplayStatus = 'ACTIVE'
        setDisplayStatus('ACTIVE')
      }
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
        displayStatus: effectiveDisplayStatus,
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

  return (
    <div style={{ ...overlay, zIndex: zIndexProp ?? 9999 }} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>레시피 수정 (ID #{recipeId})</div>
            <div style={{ fontWeight: 'bold', color: '#fff', marginTop: 2 }}>
              {detail?.videoId ? `videoId: ${detail.videoId}` : '\u00A0'}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ ...smallBtn, padding: '6px 12px' }}>
            ×
          </button>
        </div>

        <div style={body}>
          {error && (
            <div style={{ color: '#f87171', marginBottom: 12, padding: 10, background: '#2a1515', borderRadius: 8 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ color: '#888' }}>불러오는 중…</div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>요리명 (title)</label>
                <input type="text" style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 스팸 김치볶음밥" />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>노출 상태 (displayStatus)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setDisplayStatus('ACTIVE')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid ' + (displayStatus === 'ACTIVE' ? '#10b981' : '#3f3f46'),
                      background: displayStatus === 'ACTIVE' ? '#064e3b' : '#1a1a1a',
                      color: displayStatus === 'ACTIVE' ? '#a7f3d0' : '#a1a1aa',
                      fontWeight: displayStatus === 'ACTIVE' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {displayStatus === 'ACTIVE' ? '● ' : '○ '}노출 (ACTIVE)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayStatus('HIDDEN')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid ' + (displayStatus === 'HIDDEN' ? '#dc2626' : '#3f3f46'),
                      background: displayStatus === 'HIDDEN' ? '#3f1212' : '#1a1a1a',
                      color: displayStatus === 'HIDDEN' ? '#fecaca' : '#a1a1aa',
                      fontWeight: displayStatus === 'HIDDEN' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {displayStatus === 'HIDDEN' ? '● ' : '○ '}숨김 (HIDDEN)
                  </button>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    HIDDEN 으로 저장하면 사용자 검색·목록에서 즉시 제외됩니다 (Soft Delete).
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>
                  크롤러 파이프라인 상태 (status){' '}
                  {originalStatus && (
                    <span
                      style={{
                        marginLeft: 6,
                        display: 'inline-block',
                        padding: '1px 7px',
                        borderRadius: 999,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background:
                          originalStatus === 'SUCCESS' ? '#064e3b' : originalStatus === 'NO_SUBTITLES' ? '#3f1212' : '#1f1f1f',
                        color:
                          originalStatus === 'SUCCESS' ? '#a7f3d0' : originalStatus === 'NO_SUBTITLES' ? '#fecaca' : '#a1a1aa',
                        border:
                          '1px solid ' +
                          (originalStatus === 'SUCCESS'
                            ? '#065f46'
                            : originalStatus === 'NO_SUBTITLES'
                            ? '#7f1d1d'
                            : '#3f3f46'),
                      }}
                    >
                      현재: {originalStatus}
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={status ?? ''}
                    onChange={(e) => {
                      const newStatus = e.target.value
                      setStatus(newStatus)
                      if (newStatus === 'NO_SUBTITLES' || newStatus === 'FAILED') {
                        setDisplayStatus('HIDDEN')
                      }
                    }}
                    style={{
                      ...inputStyle,
                      flex: '0 0 auto',
                      minWidth: 220,
                      width: 'auto',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">(변경 없음 — 기존 값 유지)</option>
                    <option value="SUCCESS">SUCCESS — 정상 처리, 사용자 노출 허용</option>
                    <option value="NO_SUBTITLES">NO_SUBTITLES — 자막 없음(사용자 비노출)</option>
                    <option value="PENDING">PENDING — 처리 대기</option>
                    <option value="FAILED">FAILED — 처리 실패</option>
                  </select>
                </div>
                {status && status !== originalStatus && (
                  <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#fcd34d' }}>
                    저장 시 status 가 <strong>{originalStatus || '(없음)'}</strong> → <strong>{status}</strong> 로 변경됩니다.
                    SUCCESS + ACTIVE 가 모두 만족되면 사용자 화면에 즉시 노출됩니다.
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>유튜브 링크 (youtubeUrl) — 읽기 전용</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                  <input
                    type="text"
                    readOnly
                    style={{
                      ...inputStyle,
                      flex: 1,
                      minWidth: 0,
                      background: '#0a0a0a',
                      color: '#9ca3af',
                      cursor: 'not-allowed',
                      borderColor: '#2a2a2a',
                    }}
                    value={youtubeUrl}
                    placeholder="https://www.youtube.com/watch?v=..."
                    title="유튜브 링크는 원본 데이터 보존을 위해 수정할 수 없습니다."
                  />
                  <button
                    type="button"
                    onClick={handleOpenYoutube}
                    disabled={!youtubeUrl}
                    title="새 탭에서 유튜브 영상 열기"
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
                    title="유튜브 링크 클립보드에 복사"
                    style={{
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid ' + (copyState === 'copied' ? '#10b981' : copyState === 'error' ? '#dc2626' : '#3f3f46'),
                      background:
                        copyState === 'copied'
                          ? '#064e3b'
                          : copyState === 'error'
                          ? '#3f1212'
                          : youtubeUrl
                          ? '#1e1e1e'
                          : '#141414',
                      color:
                        copyState === 'copied'
                          ? '#a7f3d0'
                          : copyState === 'error'
                          ? '#fecaca'
                          : youtubeUrl
                          ? '#e5e5e5'
                          : '#555',
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
                    {copyState === 'copied' ? (
                      <>✓ 복사됨</>
                    ) : copyState === 'error' ? (
                      <>⚠ 실패</>
                    ) : (
                      <>
                        <span aria-hidden>📋</span> 복사
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ ...labelStyle, margin: 0 }}>재료 ({ingredients.length})</label>
                <button type="button" onClick={addIng} style={smallBtn}>+ 재료 추가</button>
              </div>

              <div style={{ padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8 }}>
                {ingredients.length === 0 ? (
                  <div style={{ color: '#666', textAlign: 'center', padding: 20, fontSize: '0.9rem' }}>
                    재료가 없습니다. [+ 재료 추가] 로 한 줄 추가하세요.
                  </div>
                ) : (
                  ingredients.map((it, idx) => (
                    <div key={idx} style={ingRow}>
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => updateIng(idx, 'name', e.target.value)}
                        placeholder="재료 이름 (예: 스팸)"
                        style={inputStyle}
                      />
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
                        style={{ ...smallBtn, borderColor: '#7f1d1d', color: '#fecaca', background: '#1a0e0e' }}
                      >
                        삭제
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: 14, fontSize: '0.75rem', color: '#6b7280' }}>
                저장 시 서버에서 재료 이름의 공백을 제거합니다(검색 캐시·매핑 규칙과 동일). 분량은 입력 그대로 저장됩니다.
              </div>
            </>
          )}
        </div>

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
