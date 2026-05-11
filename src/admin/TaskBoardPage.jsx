import { useCallback, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { adminClient } from '../api/adminClient'

const wrapStyle = {
  border: '1px solid #333',
  borderRadius: 12,
  padding: '24px 28px',
  backgroundColor: '#1a1a1a',
  color: '#e5e5e5',
  lineHeight: 1.7,
  maxWidth: 960,
}

const markdownComponents = {
  h1: ({ node, ...props }) => (
    <h1 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: 8, marginTop: 12 }} {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 style={{ color: '#fff', marginTop: 28, paddingBottom: 6, borderBottom: '1px solid #2a2a2a' }} {...props} />
  ),
  h3: ({ node, ...props }) => <h3 style={{ color: '#fafafa', marginTop: 20 }} {...props} />,
  a: ({ node, ...props }) => <a style={{ color: '#60a5fa' }} target="_blank" rel="noreferrer" {...props} />,
  code: ({ inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code
          style={{
            background: '#0f0f0f',
            border: '1px solid #2a2a2a',
            color: '#fcd34d',
            padding: '1px 6px',
            borderRadius: 6,
            fontSize: '0.85em',
          }}
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <pre
        style={{
          background: '#0f0f0f',
          border: '1px solid #2a2a2a',
          padding: 12,
          borderRadius: 8,
          overflowX: 'auto',
          fontSize: '0.85rem',
        }}
      >
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    )
  },
  hr: () => <hr style={{ border: 0, borderTop: '1px solid #2a2a2a', margin: '24px 0' }} />,
  blockquote: ({ node, ...props }) => (
    <blockquote
      style={{
        borderLeft: '4px solid #3b82f6',
        margin: '12px 0',
        padding: '4px 14px',
        background: '#101a2b',
        color: '#cbd5e1',
        borderRadius: 6,
      }}
      {...props}
    />
  ),
  ul: ({ node, ...props }) => <ul style={{ paddingLeft: 22 }} {...props} />,
  ol: ({ node, ...props }) => <ol style={{ paddingLeft: 22 }} {...props} />,
  li: ({ node, ...props }) => <li style={{ margin: '4px 0' }} {...props} />,
  input: ({ node, checked, ...props }) => (
    <input
      type="checkbox"
      checked={!!checked}
      readOnly
      style={{ accentColor: '#10b981', marginRight: 6, width: 16, height: 16 }}
      {...props}
    />
  ),
  table: ({ node, ...props }) => (
    <table style={{ borderCollapse: 'collapse', width: '100%', margin: '12px 0' }} {...props} />
  ),
  th: ({ node, ...props }) => (
    <th style={{ border: '1px solid #2a2a2a', padding: '6px 10px', background: '#1e1e1e' }} {...props} />
  ),
  td: ({ node, ...props }) => (
    <td style={{ border: '1px solid #2a2a2a', padding: '6px 10px' }} {...props} />
  ),
}

export default function TaskBoardPage() {
  const [content, setContent] = useState('')
  const [path, setPath] = useState('')
  const [readAt, setReadAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminClient.get('/api/v1/admin/tasks')
      setContent(res.data?.content ?? '')
      setPath(res.data?.path ?? '')
      setReadAt(res.data?.readAt ?? '')
    } catch (e) {
      const status = e?.response?.status
      if (status === 404) {
        setError('TASK.md 파일을 찾지 못했습니다. (서버 작업 디렉터리 기준으로 ./TASK.md, ../TASK.md, ../../TASK.md 또는 환경변수 YONEODOO_TASK_MD_PATH 를 확인하세요.)')
      } else {
        setError('로드맵을 불러오지 못했습니다.')
      }
      setContent('')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#fff' }}>대시보드 / 로드맵</h2>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #444',
            background: '#1e1e1e',
            color: '#e5e5e5',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
          }}
        >
          {loading ? '불러오는 중…' : '새로고침'}
        </button>
      </div>
      <p style={{ color: '#888', fontSize: '0.85rem', marginTop: 0 }}>
        프로젝트 루트의 <code style={{ color: '#93c5fd' }}>TASK.md</code> 를 그대로 렌더링합니다. 체크리스트 진행 상황도 그대로 표시됩니다.
      </p>

      {error && (
        <div style={{ color: '#f87171', marginBottom: 12, padding: 12, background: '#2a1515', borderRadius: 8 }}>
          {error}
        </div>
      )}

      {!error && (
        <div style={wrapStyle}>
          {loading ? (
            <div style={{ color: '#888' }}>불러오는 중…</div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          )}
        </div>
      )}

      {(path || readAt) && !loading && !error && (
        <div style={{ marginTop: 12, fontSize: '0.75rem', color: '#6b7280' }}>
          {path && <span>파일: <code style={{ color: '#9ca3af' }}>{path}</code></span>}
          {readAt && <span style={{ marginLeft: 12 }}>읽은 시각: {readAt}</span>}
        </div>
      )}
    </div>
  )
}
