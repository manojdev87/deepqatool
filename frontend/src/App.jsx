import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import NewScan from './pages/NewScan'
import ScanResults from './pages/ScanResults'
import History from './pages/History'
import CompareURLs from './pages/CompareURLs'
import CompareResults from './pages/CompareResults'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <nav className="sidebar">
          <div className="sidebar-logo">
            <span className="logo-icon">🔍</span>
            <span className="logo-text">QA Auditor</span>
          </div>
          <div className="nav-links">
            <NavLink to="/" end className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <span>📊</span> Dashboard
            </NavLink>
            <NavLink to="/scan" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <span>🚀</span> New Scan
            </NavLink>
            <NavLink to="/compare" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <span>🔄</span> Compare
            </NavLink>
            <NavLink to="/history" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <span>📋</span> History
            </NavLink>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scan" element={<NewScan />} />
            <Route path="/scan/:scanId" element={<ScanResults />} />
            <Route path="/compare" element={<CompareURLs />} />
            <Route path="/compare/:compareId" element={<CompareResults />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
