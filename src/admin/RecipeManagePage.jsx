import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminClient } from '../api/adminClient'
import RecipeEditModal from './RecipeEditModal'

const th = { textAlign: 'left', padding: '12px 10px', borderBottom: '1px solid #333', color: '#9ca3af', fontSize: '0.8rem' }
const td = { padding: '12px 10px', borderBottom: '1px solid #222', fontSize: '0.9rem' }

const SORT_KEYS = ['id', 'title', 'displayStatus', 'status', 'youtuberName', 'updatedAt']

const STATUS_OPTIONS = ['', 'SUCCESS', 'PENDING', 'NO_SUBTITLES', 'FAILED', 'SKIP']

function SortIcon({ active, dir }) {
  if (!active) return <span style={{ color: '#444', marginLeft: 4 }}>↕</span>
  return <span style={{ color: '#60a5fa', marginLeft: 4 }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

// LocalDateTime은 timezone 정보 없이 직렬화되므로 UTC로 간주하고 파싱
function parseUtc(val) {
  if (Array.isArray(val)) {
    return new Date(Date.UTC(val[0], val[1] - 1, val[2], val[3] ?? 0, val[4] ?? 0, val[5] ?? 0))
  }
  const s = String(val)
  return new Date(s.endsWith('Z') || s.includes('+') ? s : s + 'Z')
}

function toTimestamp(val) {
  if (!val) return 0
  return parseUtc(val).getTime()
}

function formatDate(val) {
  if (!val) return '—'
  const utc = parseUtc(val)
  if (isNaN(utc)) return '—'
  // UTC → KST (+9h)
  const kst = new Date(utc.getTime() + 9 * 60 * 60 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${kst.getUTCFullYear()}.${pad(kst.getUTCMonth() + 1)}.${pad(kst.getUTCDate())} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`
}

function sortValue(row, key) {
  switch (key) {
    case 'id': return row.id ?? 0
    case 'title': return (row.title ?? '').toLowerCase()
    case 'displayStatus': return row.displayStatus === 'ACTIVE' ? 0 : 1
    case 'status': return row.status ?? 'zzz'
    case 'youtuberName': return (row.youtuberName ?? '').toLowerCase()
    case 'updatedAt': return toTimestamp(row.updatedAt)
    default: return ''
  }
}

export default function RecipeManagePage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  // 검색
  const [searchQuery, setSearchQuery] = useState('')

  // 정렬
  const [sortKey, setSortKey] = useState('updatedAt')
  const [sortDir, setSortDir] = useState('desc')

  // 필터
  const [filterDisplay, setFilterDisplay] = useState('')   // '' | 'ACTIVE' | 'HIDDEN'
  const [filterStatus, setFilterStatus] = useState('')     // '' | 'SUCCESS' | 'PENDING' | ...
  const [filterYoutuber, setFilterYoutuber] = useState('') // 유튜버명 부분 일치

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

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const hasFilter = filterDisplay !== '' || filterStatus !== '' || filterYoutuber.trim() !== ''

  const displayRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const yu = filterYoutuber.trim().toLowerCase()

    let result = rows.filter((r) => {
      if (q && !r.title?.toLowerCase().includes(q) && !r.youtuberName?.toLowerCase().includes(q)) return false
      if (filterDisplay && r.displayStatus !== filterDisplay) return false
      if (filterStatus && r.status !== filterStatus) return false
      if (yu && !(r.youtuberName ?? '').toLowerCase().includes(yu)) return false
      return true
    })

    result = [...result].sort((a, b) => {
      const av = sortValue(a, sortKey)
      const bv = sortValue(b, sortKey)
      let cmp = 0
      if (typeof av === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv), 'ko')
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [rows, searchQuery, filterDisplay, filterStatus, filterYoutuber, sortKey, sortDir])

  const colLabel = { id: 'ID', title: '요리명', displayStatus: '노출', status: '파이프라인', youtuberName: '유튜버', updatedAt: '수정일' }

  const thBtn = (key) => ({
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    color: sortKey === key ? '#e5e5e5' : '#9ca3af',
    fontSize: '0.8rem',
    fontWeight: sortKey === key ? 700 : 400,
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  })

  return (
    <div>
      <h2 style={{ marginTop: 0, color: '#fff' }}>
        레시피 관리
        <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#6b7280', marginLeft: 10 }}>
          ({displayRows.length !== rows.length ? `${displayRows.length} / ${rows.length}건` : `${rows.length}건`})
        </span>
      </h2>

      {/* 검색 + 필터 영역 */}
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {/* 전체 검색 */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="제목 또는 유튜버명 검색…"
          style={{
            flex: '1 1 220px',
            maxWidth: 340,
            padding: '9px 14px',
            borderRadius: 8,
            border: '1px solid #444',
            backgroundColor: '#1a1a1a',
            color: '#f3f4f6',
            fontSize: '0.88rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* 노출 상태 필터 */}
        <select
          value={filterDisplay}
          onChange={(e) => setFilterDisplay(e.target.value)}
          style={selectStyle(filterDisplay !== '')}
        >
          <option value="">노출 전체</option>
          <option value="ACTIVE">노출 (ACTIVE)</option>
          <option value="HIDDEN">숨김 (HIDDEN)</option>
        </select>

        {/* 파이프라인 상태 필터 */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={selectStyle(filterStatus !== '')}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === '' ? '파이프라인 전체' : s}</option>
          ))}
        </select>

        {/* 유튜버명 필터 */}
        <input
          type="text"
          value={filterYoutuber}
          onChange={(e) => setFilterYoutuber(e.target.value)}
          placeholder="유튜버명 필터…"
          style={{
            flex: '1 1 140px',
            maxWidth: 200,
            padding: '9px 14px',
            borderRadius: 8,
            border: '1px solid ' + (filterYoutuber ? '#60a5fa' : '#444'),
            backgroundColor: '#1a1a1a',
            color: '#f3f4f6',
            fontSize: '0.88rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* 필터 초기화 */}
        {(hasFilter || searchQuery) && (
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setFilterDisplay(''); setFilterStatus(''); setFilterYoutuber('') }}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #555',
              background: '#1f1f1f',
              color: '#a1a1aa',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            × 초기화
          </button>
        )}
      </div>

      {error && <div style={{ color: '#f87171', marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ color: '#888' }}>불러오는 중…</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #333', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ backgroundColor: '#1a1a1a' }}>
                {/* 정렬 가능한 컬럼 헤더 */}
                {SORT_KEYS.map((key) => (
                  <th key={key} style={th}>
                    <button type="button" style={thBtn(key)} onClick={() => handleSort(key)}>
                      {colLabel[key]}
                      <SortIcon active={sortKey === key} dir={sortDir} />
                    </button>
                  </th>
                ))}
                <th style={th}>videoId</th>
                <th style={{ ...th, textAlign: 'right' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...td, textAlign: 'center', color: '#666' }}>
                    {hasFilter || searchQuery ? '검색/필터 결과가 없습니다.' : '행이 없습니다.'}
                  </td>
                </tr>
              ) : (
                displayRows.map((r) => {
                  const isHidden = r.displayStatus === 'HIDDEN'
                  return (
                    <tr key={r.id} style={isHidden ? { opacity: 0.55 } : undefined}>
                      <td style={td}>{r.id}</td>
                      <td style={{ ...td, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title ?? '—'}
                      </td>
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
                      <td style={td}>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={td}>{r.youtuberName ?? '—'}</td>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.78rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {formatDate(r.updatedAt)}
                      </td>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.videoId ?? '—'}</td>
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
          onSaved={() => { setEditingId(null); load() }}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  if (!status) return <span style={{ color: '#525252' }}>—</span>
  const colors = {
    SUCCESS: { bg: '#14532d', color: '#86efac', border: '#166534' },
    PENDING: { bg: '#1c1a00', color: '#fde68a', border: '#713f12' },
    NO_SUBTITLES: { bg: '#3f1212', color: '#fca5a5', border: '#7f1d1d' },
    FAILED: { bg: '#3f1212', color: '#fca5a5', border: '#7f1d1d' },
    SKIP: { bg: '#1c1c1c', color: '#a1a1aa', border: '#3f3f46' },
  }
  const c = colors[status] ?? { bg: '#1c1c1c', color: '#a1a1aa', border: '#3f3f46' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: '0.72rem',
      fontWeight: 600,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
    }}>
      {status}
    </span>
  )
}

function selectStyle(active) {
  return {
    flex: '0 0 auto',
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid ' + (active ? '#60a5fa' : '#444'),
    backgroundColor: '#1a1a1a',
    color: active ? '#93c5fd' : '#9ca3af',
    fontSize: '0.88rem',
    cursor: 'pointer',
    outline: 'none',
  }
}
