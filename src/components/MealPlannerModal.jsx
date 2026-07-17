import { useState } from 'react'
import axios from 'axios'
import { getApiBaseUrl } from '../config/apiBase'

export default function MealPlannerModal({ onClose }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    if (!query.trim() || loading) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const base = getApiBaseUrl()
      const { data } = await axios.post(`${base}/api/v1/search/meal-plan`, { query })
      setResult(data)
    } catch {
      setError('잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setQuery('')
    setResult(null)
    setError(null)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 9999,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        backdropFilter: 'blur(5px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '20px',
          width: '90%', maxWidth: '500px', border: '1px solid #444',
          position: 'relative', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        }}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#888', fontSize: '1.8rem', cursor: 'pointer' }}
        >
          ×
        </button>

        <h2 style={{ color: '#a78bfa', margin: '0 0 6px 0', fontSize: '1.5rem' }}>🤖 AI 식단 플래너</h2>
        <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 20px 0' }}>
          자연어로 원하는 식단을 설명하면 AI가 레시피를 골라 식단을 짜드립니다.
        </p>

        {/* 입력 영역 */}
        {!result && (
          <>
            <textarea
              placeholder={'예) 다이어트 중인데 닭가슴살은 질렸어, 일주일 식단 짜줘\n예) 고단백 근성장 식단 500kcal 이하로'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
              }}
              rows={4}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '12px',
                border: '2px solid #444', backgroundColor: '#121212', color: '#fff',
                fontSize: '0.95rem', resize: 'none', outline: 'none', boxSizing: 'border-box',
                lineHeight: '1.6',
              }}
            />
            <p style={{ color: '#555', fontSize: '0.75rem', margin: '6px 0 16px 0' }}>Ctrl+Enter로 빠르게 전송</p>

            {error && (
              <div style={{ color: '#f87171', backgroundColor: '#2d1a1a', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '14px' }}>
                ⚠ {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!query.trim() || loading}
              style={{
                padding: '13px 0', backgroundColor: loading || !query.trim() ? '#2d2d2d' : '#7c3aed',
                border: 'none', color: loading || !query.trim() ? '#666' : 'white',
                borderRadius: '10px', cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: loading || !query.trim() ? 'none' : '0 4px 15px rgba(124, 58, 237, 0.4)',
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #555', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  식단 생성 중...
                </>
              ) : '식단 짜기'}
            </button>
          </>
        )}

        {/* 결과 영역 */}
        {result && (
          <div style={{ overflowY: 'auto', flexGrow: 1 }}>
            {/* 식단 텍스트 */}
            <div style={{ backgroundColor: '#121212', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid #333' }}>
              <div style={{ color: '#a78bfa', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '10px' }}>📋 AI 추천 식단</div>
              <div style={{ color: '#e0e0e0', fontSize: '0.95rem', lineHeight: '1.8', whiteSpace: 'pre-line' }}>
                {result.mealPlan}
              </div>
            </div>

            {/* 참고 레시피 목록 */}
            {result.recipes && result.recipes.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '10px' }}>
                  🎥 참고한 레시피 ({result.recipes.length}개)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.recipes.map((recipe, idx) => (
                    <a
                      key={idx}
                      href={`https://youtube.com/shorts/${recipe.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        backgroundColor: '#2d2d2d', padding: '10px 14px', borderRadius: '10px',
                        textDecoration: 'none', border: '1px solid #3a3a3a',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#3a3a3a'}
                    >
                      <div>
                        <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '2px' }}>
                          {recipe.title}
                        </div>
                        {recipe.calories && (
                          <div style={{ color: '#888', fontSize: '0.78rem' }}>
                            {Math.round(recipe.calories)}kcal
                            {recipe.youtuber_name && ` · ${recipe.youtuber_name}`}
                          </div>
                        )}
                      </div>
                      <span style={{ color: '#f87171', fontSize: '1.1rem', marginLeft: '12px' }}>▶</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleReset}
              style={{
                width: '100%', padding: '12px 0', backgroundColor: '#2d2d2d',
                border: '1px solid #444', color: '#aaa', borderRadius: '10px',
                cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold',
              }}
            >
              🔄 다시 짜기
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
