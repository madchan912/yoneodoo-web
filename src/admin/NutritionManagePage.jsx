import { useCallback, useEffect, useRef, useState } from 'react'
import { adminClient } from '../api/adminClient'

const panel = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #2e2e2e',
  borderRadius: 10,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}
const scrollList = {
  flex: 1,
  overflowY: 'auto',
  marginTop: 8,
}
const tag = (color) => ({
  display: 'inline-block',
  padding: '2px 7px',
  borderRadius: 4,
  fontSize: '0.7rem',
  fontWeight: 'bold',
  backgroundColor: color + '22',
  color: color,
  marginLeft: 6,
})
const inputStyle = {
  flex: 1,
  backgroundColor: '#2a2a2a',
  border: '1px solid #3a3a3a',
  borderRadius: 6,
  color: '#e0e0e0',
  padding: '6px 10px',
  fontSize: '0.85rem',
  outline: 'none',
}
const fieldRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
}

const FIELDS = [
  { key: 'calories',     label: '열량',   unit: 'kcal' },
  { key: 'protein',      label: '단백질', unit: 'g' },
  { key: 'fat',          label: '지방',   unit: 'g' },
  { key: 'saturatedFat', label: '포화지방', unit: 'g' },
  { key: 'carbohydrate', label: '탄수화물', unit: 'g' },
  { key: 'sugar',        label: '당류',   unit: 'g' },
  { key: 'sodium',       label: '나트륨', unit: 'mg' },
]

const emptyForm = () => Object.fromEntries(FIELDS.map((f) => [f.key, '']))

export default function NutritionManagePage() {
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('unmatched')
  const [unmatched, setUnmatched] = useState([])
  const [matched, setMatched] = useState([])
  const [selected, setSelected] = useState(null)

  const [keyword, setKeyword] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [savedName, setSavedName] = useState(null)
  const [error, setError] = useState('')

  const searchRef = useRef(null)

  const loadStats = useCallback(async () => {
    const res = await adminClient.get('/api/v1/admin/nutrition/stats')
    setStats(res.data)
  }, [])

  const loadUnmatched = useCallback(async () => {
    const res = await adminClient.get('/api/v1/admin/nutrition/unmatched')
    setUnmatched(res.data)
  }, [])

  const loadMatched = useCallback(async () => {
    const res = await adminClient.get('/api/v1/admin/nutrition/matched')
    setMatched(res.data)
  }, [])

  useEffect(() => {
    loadStats()
    loadUnmatched()
    loadMatched()
  }, [loadStats, loadUnmatched, loadMatched])

  const SOURCE_COLOR = {
    foodsafety_kr: '#22c55e',
    manual:        '#3b82f6',
    gemini_est:    '#f59e0b',
    manual_needed: '#6b7280',
  }

  const selectItem = (item) => {
    setSelected(item)
    setSearchResults([])
    setKeyword('')
    setForm(emptyForm())
    setError('')
    setSavedName(null)
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  const selectMatchedItem = (item) => {
    setSelected({ id: item.id, masterName: item.masterName, source: item.source })
    setSearchResults([])
    setKeyword('')
    setForm({
      calories:     item.calories     ?? '',
      protein:      item.protein      ?? '',
      fat:          item.fat          ?? '',
      saturatedFat: item.saturatedFat ?? '',
      carbohydrate: item.carbohydrate ?? '',
      sugar:        item.sugar        ?? '',
      sodium:       item.sodium       ?? '',
    })
    setError('')
    setSavedName(null)
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!keyword.trim()) return
    setSearching(true)
    setError('')
    try {
      const res = await adminClient.get('/api/v1/admin/nutrition/search', { params: { keyword: keyword.trim() } })
      setSearchResults(res.data)
    } catch {
      setError('검색 실패')
    } finally {
      setSearching(false)
    }
  }

  const applySearchResult = (item) => {
    setForm({
      calories: item.calories ?? '',
      protein: item.protein ?? '',
      fat: item.fat ?? '',
      saturatedFat: item.saturatedFat ?? '',
      carbohydrate: item.carbohydrate ?? '',
      sugar: item.sugar ?? '',
      sodium: item.sodium ?? '',
    })
    setSearchResults([])
    setKeyword(item.foodName)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    setError('')
    try {
      const body = {
        source: 'manual',
        ...Object.fromEntries(
          FIELDS.map((f) => [f.key, form[f.key] === '' ? null : Number(form[f.key])])
        ),
      }
      await adminClient.put(`/api/v1/admin/nutrition/${encodeURIComponent(selected.masterName)}`, body)
      setSavedName(selected.masterName)
      await Promise.all([loadStats(), loadUnmatched(), loadMatched()])
      setSelected(null)
      setForm(emptyForm())
      setKeyword('')
      setSearchResults([])
    } catch (err) {
      setError(err?.response?.data?.message || '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 170px)' }}>

      {/* 왼쪽: 통계 + 미매칭 목록 */}
      <div style={{ ...panel, width: 300, flexShrink: 0 }}>

        {/* 통계 카드 */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: '전체', value: stats.total, color: '#9ca3af' },
              { label: '완료', value: stats.matched, color: '#22c55e' },
              { label: '미완료', value: stats.unmatched, color: '#f59e0b' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{ backgroundColor: '#111', border: '1px solid #2e2e2e', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}
              >
                <div style={{ fontSize: '0.68rem', color: '#888' }}>{label}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {[
            { key: 'unmatched', label: `미매칭 ${unmatched.length}개` },
            { key: 'matched',   label: `완료 ${matched.length}개` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: tab === key ? 'bold' : 'normal',
                backgroundColor: tab === key ? '#1e3a5f' : '#2a2a2a',
                color: tab === key ? '#fff' : '#888',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={scrollList}>
          {/* 미매칭 탭 */}
          {tab === 'unmatched' && (
            <>
              {unmatched.length === 0 && (
                <div style={{ color: '#22c55e', textAlign: 'center', marginTop: 24, fontSize: '0.85rem' }}>
                  모두 완료되었습니다 ✓
                </div>
              )}
              {unmatched.map((item) => (
                <div
                  key={item.id}
                  onClick={() => selectItem(item)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    marginBottom: 3,
                    backgroundColor: selected?.id === item.id ? '#1e3a5f' : 'transparent',
                    color: selected?.id === item.id ? '#fff' : '#ccc',
                    fontSize: '0.85rem',
                    border: selected?.id === item.id ? '1px solid #3b82f6' : '1px solid transparent',
                  }}
                >
                  {item.masterName}
                </div>
              ))}
            </>
          )}

          {/* 완료 탭 */}
          {tab === 'matched' && (
            <>
              {matched.length === 0 && (
                <div style={{ color: '#888', textAlign: 'center', marginTop: 24, fontSize: '0.85rem' }}>
                  완료된 항목이 없습니다
                </div>
              )}
              {matched.map((item) => (
                <div
                  key={item.id}
                  onClick={() => selectMatchedItem(item)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    marginBottom: 3,
                    backgroundColor: selected?.id === item.id ? '#1e3a5f' : 'transparent',
                    color: selected?.id === item.id ? '#fff' : '#ccc',
                    fontSize: '0.83rem',
                    border: selected?.id === item.id ? '1px solid #3b82f6' : '1px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{item.masterName}</span>
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '1px 5px',
                      borderRadius: 3,
                      backgroundColor: (SOURCE_COLOR[item.source] ?? '#6b7280') + '22',
                      color: SOURCE_COLOR[item.source] ?? '#6b7280',
                      fontWeight: 'bold',
                      flexShrink: 0,
                      marginLeft: 6,
                    }}>
                      {item.source === 'foodsafety_kr' ? '식품DB' : item.source === 'gemini_est' ? 'AI' : '수동'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#666', marginTop: 1 }}>
                    {item.calories != null ? `${item.calories}kcal` : '—'}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* 오른쪽: 검색 + 폼 */}
      <div style={{ ...panel, flex: 1 }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '0.9rem' }}>
            {savedName ? (
              <span style={{ color: '#22c55e' }}>✓ &nbsp;<b>{savedName}</b> 저장 완료</span>
            ) : (
              '왼쪽 목록에서 재료를 선택하세요'
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>

            {/* 선택된 재료명 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#fff' }}>{selected.masterName}</span>
              <span style={tag(SOURCE_COLOR[selected.source] ?? '#6b7280')}>
                {selected.source ?? 'manual_needed'}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#666' }}>기준: 100g</span>
            </div>

            {/* 식품성분표 검색 */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
              <input
                ref={searchRef}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="식품성분표 검색 (예: 닭고기)"
                style={inputStyle}
              />
              <button
                type="submit"
                disabled={searching}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  cursor: searching ? 'default' : 'pointer',
                  fontSize: '0.85rem',
                  opacity: searching ? 0.6 : 1,
                }}
              >
                {searching ? '검색 중…' : '검색'}
              </button>
            </form>

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <div
                style={{
                  border: '1px solid #2e2e2e',
                  borderRadius: 8,
                  backgroundColor: '#111',
                  maxHeight: 180,
                  overflowY: 'auto',
                }}
              >
                {searchResults.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => applySearchResult(r)}
                    style={{
                      padding: '9px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #1e1e1e',
                      fontSize: '0.82rem',
                      color: '#ccc',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e3a5f')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ color: '#fff' }}>{r.foodName}</span>
                      {r.foodGroup && <span style={{ color: '#555', fontSize: '0.75rem' }}>{r.foodGroup}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 2, fontSize: '0.75rem', color: '#888' }}>
                      <span style={{ color: '#f59e0b' }}>{r.calories != null ? `${r.calories}kcal` : '-'}</span>
                      <span>단백질 {r.protein != null ? `${r.protein}g` : '-'}</span>
                      <span>나트륨 {r.sodium != null ? `${Number(r.sodium).toLocaleString()}mg` : '-'}</span>
                      {r.sourceVer && <span style={{ color: '#3b82f6' }}>[ver {r.sourceVer}]</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 영양 값 입력 폼 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
              {FIELDS.map((f) => (
                <div key={f.key} style={fieldRow}>
                  <label style={{ width: 66, fontSize: '0.8rem', color: '#9ca3af', flexShrink: 0 }}>
                    {f.label}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form[f.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ ...inputStyle, width: 90, flex: 'none' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#666' }}>{f.unit}</span>
                </div>
              ))}
            </div>

            {/* 에러 */}
            {error && (
              <div style={{ color: '#f87171', fontSize: '0.82rem' }}>{error}</div>
            )}

            {/* 액션 버튼 */}
            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#22c55e',
                  color: '#000',
                  fontWeight: 'bold',
                  cursor: saving ? 'default' : 'pointer',
                  fontSize: '0.9rem',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? '저장 중…' : '저장'}
              </button>
              <button
                onClick={() => { setSelected(null); setForm(emptyForm()); setSearchResults([]); setKeyword(''); setError('') }}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid #444',
                  backgroundColor: 'transparent',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
