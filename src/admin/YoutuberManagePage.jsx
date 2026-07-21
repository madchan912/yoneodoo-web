import { useCallback, useEffect, useRef, useState } from 'react'
import { adminClient } from '../api/adminClient'

const th = { textAlign: 'left', padding: '10px 10px', borderBottom: '1px solid #333', color: '#9ca3af', fontSize: '0.78rem' }
const td = { padding: '10px 10px', borderBottom: '1px solid #222', fontSize: '0.88rem', verticalAlign: 'middle' }

function parseUtc(val) {
  if (!val) return null
  if (Array.isArray(val)) {
    return new Date(Date.UTC(val[0], val[1] - 1, val[2], val[3] ?? 0, val[4] ?? 0, val[5] ?? 0))
  }
  const s = String(val)
  return new Date(s.endsWith('Z') || s.includes('+') ? s : s + 'Z')
}

function formatDate(val) {
  if (!val) return '—'
  const utc = parseUtc(val)
  if (!utc || isNaN(utc)) return '—'
  const kst = new Date(utc.getTime() + 9 * 60 * 60 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${kst.getUTCFullYear()}.${pad(kst.getUTCMonth() + 1)}.${pad(kst.getUTCDate())} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`
}

function parseResultSummary(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function StatusBadge({ status }) {
  const color = status === 'done' ? '#22c55e' : status === 'failed' ? '#ef4444' : '#f59e0b'
  return (
    <span style={{ color, fontWeight: 600, fontSize: '0.82rem' }}>
      {status ?? '—'}
    </span>
  )
}

export default function YoutuberManagePage() {
  const [youtubers, setYoutubers] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 등록 폼
  const [addName, setAddName] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [adding, setAdding] = useState(false)

  // 크롤링 트리거
  const [crawlYoutuber, setCrawlYoutuber] = useState(null)
  const [crawlStart, setCrawlStart] = useState(1)
  const [crawlEnd, setCrawlEnd] = useState('')
  const [channelTotal, setChannelTotal] = useState(null) // null=조회중, number=완료
  const [crawling, setCrawling] = useState(false)
  const [activeJob, setActiveJob] = useState(null) // { jobId, status, processed, total, results }
  const pollRef = useRef(null)

  // 수동 배치 실행 (로컬 전용, localhost:8000 FastAPI 직접 호출)
  const isLocalAdmin = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchJob, setBatchJob] = useState(null) // { status, total_youtubers, completed_youtubers, current_youtuber }
  const [batchError, setBatchError] = useState('')
  const batchPollRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [yRes, hRes] = await Promise.all([
        adminClient.get('/api/v1/admin/youtubers'),
        adminClient.get('/api/v1/admin/crawl/history'),
      ])
      setYoutubers(yRes.data || [])
      setHistory(hRes.data || [])
    } catch {
      setError('데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    return () => {
      clearInterval(pollRef.current)
      clearInterval(batchPollRef.current)
    }
  }, [load])

  // 전체 배치 실행 — 로컬 FastAPI(localhost:8000)를 직접 호출
  async function handleRunBatch() {
    setBatchRunning(true)
    setBatchError('')
    setBatchJob(null)
    clearInterval(batchPollRef.current)
    try {
      const res = await fetch('http://localhost:8000/batch/run', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const jobId = data.job_id
      setBatchJob({ status: 'pending', total_youtubers: 0, completed_youtubers: 0, current_youtuber: null })

      batchPollRef.current = setInterval(async () => {
        try {
          const sr = await fetch(`http://localhost:8000/batch/status/${jobId}`)
          const d = await sr.json()
          setBatchJob(d)
          if (d.status === 'done' || d.status === 'failed' || d.status === 'blocked') {
            clearInterval(batchPollRef.current)
            setBatchRunning(false)
            await load()
          }
        } catch {
          clearInterval(batchPollRef.current)
          setBatchRunning(false)
          setBatchError('배치 실패 - 로컬 서버가 실행 중인지 확인하세요')
        }
      }, 3000)
    } catch {
      setBatchRunning(false)
      setBatchError('배치 실패 - 로컬 서버가 실행 중인지 확인하세요')
    }
  }

  // 유튜버 등록
  async function handleAdd(e) {
    e.preventDefault()
    if (!addName.trim() || !addUrl.trim()) return
    setAdding(true)
    try {
      await adminClient.post('/api/v1/admin/youtubers', {
        youtuberName: addName.trim(),
        channelUrl: addUrl.trim(),
      })
      setAddName('')
      setAddUrl('')
      await load()
    } catch (err) {
      alert('등록 실패: ' + (err.response?.data?.message || err.message))
    } finally {
      setAdding(false)
    }
  }

  // 토글
  async function handleToggle(id) {
    try {
      await adminClient.patch(`/api/v1/admin/youtubers/${id}/toggle`)
      await load()
    } catch (err) {
      alert('토글 실패: ' + (err.response?.data?.message || err.message))
    }
  }

  // 삭제
  async function handleDelete(id, name) {
    if (!confirm(`"${name}" 유튜버를 삭제할까요? 크롤링 이력은 유지됩니다.`)) return
    try {
      await adminClient.delete(`/api/v1/admin/youtubers/${id}`)
      await load()
    } catch (err) {
      alert('삭제 실패: ' + (err.response?.data?.message || err.message))
    }
  }

  // 크롤링 버튼 클릭 → 패널 열기 + 채널 영상 수 조회
  async function handleOpenCrawl(y) {
    setCrawlYoutuber(y)
    setCrawlStart(1)
    setCrawlEnd('')
    setChannelTotal(null)
    clearInterval(pollRef.current)
    setActiveJob(null)
    try {
      const res = await adminClient.get('/api/v1/admin/channel-info', {
        params: { channelUrl: y.channelUrl },
      })
      const total = res.data.total_videos ?? 0
      setChannelTotal(total)
      setCrawlEnd(total)
    } catch {
      setChannelTotal(0)
      setCrawlEnd(50)
    }
  }

  // 크롤링 트리거
  async function handleCrawl(e) {
    e.preventDefault()
    if (!crawlYoutuber) return
    setCrawling(true)
    setActiveJob(null)
    clearInterval(pollRef.current)
    try {
      const res = await adminClient.post('/api/v1/admin/crawl', {
        channel_url: crawlYoutuber.channelUrl,
        youtuber_name: crawlYoutuber.youtuberName,
        start: Number(crawlStart),
        end: Number(crawlEnd),
      })
      const jobId = res.data.job_id
      setActiveJob({ jobId, status: res.data.status ?? 'pending', processed: 0, total: 0, results: {} })

      // 폴링 시작
      pollRef.current = setInterval(async () => {
        try {
          const sr = await adminClient.get(`/api/v1/admin/crawl/status/${jobId}`)
          const d = sr.data
          setActiveJob({ jobId, status: d.status, processed: d.processed ?? 0, total: d.total ?? 0, results: d.results ?? {} })
          if (d.status === 'done' || d.status === 'failed') {
            clearInterval(pollRef.current)
            setCrawling(false)
            await load()
          }
        } catch {
          clearInterval(pollRef.current)
          setCrawling(false)
        }
      }, 3000)
    } catch (err) {
      alert('크롤링 트리거 실패: ' + (err.response?.data?.message || err.message))
      setCrawling(false)
    }
  }

  const btnBase = {
    padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <h2 style={{ color: '#fff', marginBottom: 20, fontSize: '1.1rem' }}>유튜버 관리</h2>

      {error && <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>}

      {/* ─── 전체 배치 실행 (로컬 전용) ─── */}
      {isLocalAdmin && (
        <section style={{ marginBottom: 20, padding: '14px 20px', backgroundColor: '#1e1e1e', borderRadius: 10, border: '1px solid #333', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            onClick={handleRunBatch}
            disabled={batchRunning}
            style={{ ...btnBase, backgroundColor: batchRunning ? '#374151' : '#065f46', color: '#fff', opacity: batchRunning ? 0.7 : 1 }}
          >
            {batchRunning ? '배치 실행 중…' : '전체 배치 실행'}
          </button>

          {batchJob && (
            <span style={{ color: '#ddd', fontSize: '0.85rem' }}>
              {batchJob.status === 'done' && '배치 완료! Discord 알림 전송됨'}
              {batchJob.status === 'blocked' && `배치 중단 (IP 차단 감지) — ${batchJob.completed_youtubers}/${batchJob.total_youtubers} 유튜버 완료`}
              {batchJob.status === 'failed' && `배치 실패: ${batchJob.error ?? ''}`}
              {(batchJob.status === 'running' || batchJob.status === 'pending') &&
                `${batchJob.completed_youtubers}/${batchJob.total_youtubers} 유튜버 완료${batchJob.current_youtuber ? ` (현재: ${batchJob.current_youtuber})` : ''}`}
            </span>
          )}

          {batchError && <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>{batchError}</span>}
        </section>
      )}

      {/* ─── 유튜버 등록 폼 ─── */}
      <section style={{ marginBottom: 28, padding: '16px 20px', backgroundColor: '#1e1e1e', borderRadius: 10, border: '1px solid #333' }}>
        <div style={{ fontWeight: 700, color: '#ddd', marginBottom: 12 }}>유튜버 등록</div>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ color: '#9ca3af', fontSize: '0.78rem' }}>유튜버명</label>
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="예: 유지만"
              style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #444', backgroundColor: '#2a2a2a', color: '#e0e0e0', width: 180 }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ color: '#9ca3af', fontSize: '0.78rem' }}>채널 URL</label>
            <input
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="https://www.youtube.com/@유지만"
              style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #444', backgroundColor: '#2a2a2a', color: '#e0e0e0', width: 320 }}
            />
          </div>
          <button
            type="submit"
            disabled={adding || !addName.trim() || !addUrl.trim()}
            style={{ ...btnBase, backgroundColor: '#1d4ed8', color: '#fff', opacity: adding ? 0.6 : 1 }}
          >
            {adding ? '등록 중…' : '등록'}
          </button>
        </form>
      </section>

      {/* ─── 유튜버 목록 ─── */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ fontWeight: 700, color: '#ddd', marginBottom: 10 }}>등록 유튜버 목록</div>
        {loading ? (
          <div style={{ color: '#666' }}>불러오는 중…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
              <thead>
                <tr>
                  {['유튜버명', '채널 URL', '활성', '마지막 크롤링', '레시피 수', '등록일', ''].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {youtubers.length === 0 && (
                  <tr><td colSpan={7} style={{ ...td, color: '#666', textAlign: 'center' }}>등록된 유튜버가 없습니다.</td></tr>
                )}
                {youtubers.map((y) => (
                  <tr key={y.id}>
                    <td style={{ ...td, fontWeight: 600, color: '#e0e0e0' }}>{y.youtuberName}</td>
                    <td style={td}>
                      <a href={y.channelUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', fontSize: '0.82rem' }}>
                        {y.channelUrl.length > 45 ? y.channelUrl.slice(0, 45) + '…' : y.channelUrl}
                      </a>
                    </td>
                    <td style={td}>
                      <span style={{ color: y.active ? '#22c55e' : '#6b7280', fontWeight: 600 }}>
                        {y.active ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#9ca3af', fontSize: '0.82rem' }}>{formatDate(y.lastCrawledAt)}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{y.totalRecipes}</td>
                    <td style={{ ...td, color: '#9ca3af', fontSize: '0.82rem' }}>{formatDate(y.createdAt)}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleToggle(y.id)}
                        style={{ ...btnBase, backgroundColor: y.active ? '#374151' : '#065f46', color: '#e0e0e0', marginRight: 6 }}
                      >
                        {y.active ? '비활성화' : '활성화'}
                      </button>
                      <button
                        onClick={() => handleOpenCrawl(y)}
                        style={{ ...btnBase, backgroundColor: '#1e3a5f', color: '#93c5fd', marginRight: 6 }}
                      >
                        크롤링
                      </button>
                      <button
                        onClick={() => handleDelete(y.id, y.youtuberName)}
                        style={{ ...btnBase, backgroundColor: '#7f1d1d', color: '#fca5a5' }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── 크롤링 트리거 ─── */}
      {crawlYoutuber && (
        <section style={{ marginBottom: 28, padding: '16px 20px', backgroundColor: '#1a2740', borderRadius: 10, border: '1px solid #2563eb' }}>
          <div style={{ fontWeight: 700, color: '#93c5fd', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            크롤링 트리거 — {crawlYoutuber.youtuberName}
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: channelTotal === null ? '#6b7280' : '#34d399' }}>
              {channelTotal === null ? '전체 영상 조회 중…' : `전체 영상: ${channelTotal}개`}
            </span>
          </div>
          <form onSubmit={handleCrawl} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ color: '#9ca3af', fontSize: '0.78rem' }}>시작 인덱스</label>
              <input
                type="number" min={1} value={crawlStart}
                onChange={(e) => setCrawlStart(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #444', backgroundColor: '#2a2a2a', color: '#e0e0e0', width: 90 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ color: '#9ca3af', fontSize: '0.78rem' }}>끝 인덱스</label>
              <input
                type="number" min={1} value={crawlEnd}
                onChange={(e) => setCrawlEnd(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #444', backgroundColor: '#2a2a2a', color: '#e0e0e0', width: 90 }}
              />
            </div>
            <button
              type="submit"
              disabled={crawling}
              style={{ ...btnBase, backgroundColor: crawling ? '#374151' : '#1d4ed8', color: '#fff', opacity: crawling ? 0.7 : 1 }}
            >
              {crawling ? '진행 중…' : '크롤링 시작'}
            </button>
            <button
              type="button"
              onClick={() => { setCrawlYoutuber(null); setActiveJob(null); setChannelTotal(null); clearInterval(pollRef.current); setCrawling(false) }}
              style={{ ...btnBase, backgroundColor: '#374151', color: '#d1d5db' }}
            >
              취소
            </button>
          </form>

          {/* 실시간 진행 상황 */}
          {activeJob && (
            <div style={{ marginTop: 14, padding: '12px 16px', backgroundColor: '#111827', borderRadius: 8 }}>
              <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: 6 }}>job_id: {activeJob.jobId}</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>상태: <StatusBadge status={activeJob.status} /></span>
                <span style={{ color: '#ddd' }}>처리: {activeJob.processed} / {activeJob.total}</span>
                {activeJob.results && Object.entries(activeJob.results).map(([k, v]) => (
                  <span key={k} style={{ color: '#9ca3af' }}>{k}: {v}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── 크롤링 이력 ─── */}
      <section>
        <div style={{ fontWeight: 700, color: '#ddd', marginBottom: 10 }}>크롤링 이력</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
            <thead>
              <tr>
                {['유튜버', '범위', '상태', '결과', '시작', '완료', 'job_id'].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr><td colSpan={7} style={{ ...td, color: '#666', textAlign: 'center' }}>이력이 없습니다.</td></tr>
              )}
              {history.map((h) => {
                const summary = parseResultSummary(h.resultSummary)
                return (
                  <tr key={h.id}>
                    <td style={{ ...td, fontWeight: 500 }}>{h.youtuberName ?? '—'}</td>
                    <td style={{ ...td, color: '#9ca3af', fontSize: '0.82rem' }}>
                      {h.startIdx != null ? `${h.startIdx}~${h.endIdx}` : '—'}
                    </td>
                    <td style={td}><StatusBadge status={h.status} /></td>
                    <td style={{ ...td, fontSize: '0.8rem', color: '#9ca3af' }}>
                      {summary
                        ? Object.entries(summary).map(([k, v]) => `${k}:${v}`).join(' ')
                        : '—'}
                    </td>
                    <td style={{ ...td, color: '#9ca3af', fontSize: '0.8rem' }}>{formatDate(h.startedAt)}</td>
                    <td style={{ ...td, color: '#9ca3af', fontSize: '0.8rem' }}>{formatDate(h.finishedAt)}</td>
                    <td style={{ ...td, color: '#4b5563', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                      {h.jobId ? h.jobId.slice(0, 8) + '…' : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
