import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { adminClient } from '../api/adminClient'
import AdminLoginPage from './AdminLoginPage'
import RecipeManagePage from './RecipeManagePage'
import IngredientNormalizePage from './IngredientNormalizePage'
import { clearAdminSecret, getAdminSecret } from './adminSession'

function AdminIndexGate() {
  if (getAdminSecret()) {
    return <Navigate to="/admin/recipes" replace />
  }
  return <AdminLoginPage />
}

function AdminRequiredOutlet() {
  if (!getAdminSecret()) {
    return <Navigate to="/admin" replace />
  }
  return <Outlet />
}

const linkBase = { color: '#9ca3af', textDecoration: 'none', padding: '10px 14px', borderRadius: 8, display: 'block' }
const linkActive = { backgroundColor: '#1e3a5f', color: '#fff', fontWeight: 'bold' }

function AdminShell() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await adminClient.get('/api/v1/admin/dashboard/stats')
        if (!cancelled) setStats(res.data)
      } catch {
        if (!cancelled) setStats(null)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const logout = () => {
    clearAdminSecret()
    navigate('/admin', { replace: true })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#121212', color: '#e0e0e0', fontFamily: 'sans-serif' }}>
      <aside style={{ width: 220, borderRight: '1px solid #333', padding: '20px 12px', flexShrink: 0 }}>
        <div style={{ fontWeight: '900', color: '#fff', marginBottom: 24, paddingLeft: 8 }}>요너두 Admin</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavLink to="/admin/recipes" end style={({ isActive }) => ({ ...linkBase, ...(isActive ? linkActive : {}) })}>
            레시피 관리
          </NavLink>
          <NavLink to="/admin/ingredients" style={({ isActive }) => ({ ...linkBase, ...(isActive ? linkActive : {}) })}>
            재료 정규화 매핑
          </NavLink>
        </nav>
        <div style={{ marginTop: 28, paddingLeft: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            type="button"
            onClick={logout}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #444',
              background: '#1e1e1e',
              color: '#e5e5e5',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            로그아웃
          </button>
          <a href="/" style={{ color: '#60a5fa', fontSize: '0.85rem' }}>← 서비스 홈</a>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 28, overflow: 'auto' }}>
        {stats && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            {[
              ['전체', stats.totalRecipes],
              ['SUCCESS', stats.successRecipes],
              ['자막 없음', stats.noSubtitlesRecipes],
              ['대기(비정상)', stats.pendingRecipes],
              ['미분류 재료', stats.unclassifiedIngredients],
            ].map(([label, val]) => (
              <div
                key={label}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  backgroundColor: '#1e1e1e',
                  border: '1px solid #333',
                  minWidth: 120,
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#888' }}>{label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff' }}>{val}</div>
              </div>
            ))}
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}

export default function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminIndexGate />} />
      <Route element={<AdminRequiredOutlet />}>
        <Route element={<AdminShell />}>
          <Route path="recipes" element={<RecipeManagePage />} />
          <Route path="ingredients" element={<IngredientNormalizePage />} />
        </Route>
      </Route>
    </Routes>
  )
}
