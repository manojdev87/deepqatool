import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }
const CATEGORY_ICONS = {
  seo: '🔎', schema: '📋', content: '📝', links: '🔗',
  forms: '📝', ui: '🖥️', javascript: '⚡', accessibility: '♿',
  performance: '🚀', general: '⚠️'
}

export default function ScanResults() {
  const { scanId } = useParams()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(null)
  const [results, setResults] = useState(null)
  const [activeTab, setActiveTab] = useState('summary')
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [selectedScreenshot, setSelectedScreenshot] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await axios.get(`/api/scan/progress/${scanId}`)
        setProgress(data)
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollRef.current)
          if (data.status === 'completed') {
            const res = await axios.get(`/api/scan/results/${scanId}`)
            setResults(res.data)
          }
        }
      } catch (e) {
        // Only stop polling on 404 (scan truly not found), not transient errors
        if (e.response?.status === 404) clearInterval(pollRef.current)
      }
    }, 2000)

    return () => clearInterval(pollRef.current)
  }, [scanId])

  if (!progress) return <div style={{display:'flex',alignItems:'center',gap:12,color:'var(--text-muted)'}}><div className="spinner"/>Loading...</div>

  if (progress.status === 'running' || progress.status === 'pending') {
    const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
    return (
      <div style={{maxWidth:600,margin:'0 auto',textAlign:'center',paddingTop:60}}>
        <div style={{fontSize:'3rem',marginBottom:16}}>🔍</div>
        <h2 style={{marginBottom:8}}>Scanning in Progress</h2>
        <p style={{color:'var(--text-muted)',marginBottom:24}}>
          {progress.current} of {progress.total} URLs scanned
        </p>
        {progress.currentUrl && (
          <p style={{color:'var(--primary)',fontSize:12,marginBottom:16,wordBreak:'break-all'}}>{progress.currentUrl}</p>
        )}
        <div className="progress-bar" style={{marginBottom:8}}>
          <div className="progress-bar-fill" style={{width:`${pct}%`}} />
        </div>
        <p style={{color:'var(--text-muted)',fontSize:12}}>{pct}% complete</p>
      </div>
    )
  }

  if (progress.status === 'failed') {
    return (
      <div style={{textAlign:'center',paddingTop:60}}>
        <div style={{fontSize:'3rem',marginBottom:16}}>❌</div>
        <h2>Scan Failed</h2>
        <p style={{color:'var(--text-muted)',marginTop:8}}>{progress.error}</p>
        <button className="btn-primary" style={{marginTop:16}} onClick={() => navigate('/scan')}>Try Again</button>
      </div>
    )
  }

  if (!results) return <div style={{display:'flex',alignItems:'center',gap:12,color:'var(--text-muted)'}}><div className="spinner"/>Loading results...</div>

  const { scan, issues } = results
  const summary = scan.summary || {}

  const filteredIssues = issues
    .filter(i => filterSeverity === 'all' || i.severity === filterSeverity)
    .filter(i => filterCategory === 'all' || i.category === filterCategory)
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4))

  const categories = [...new Set(issues.map(i => i.category))]
  const allScreenshots = results.results.flatMap(r => {
    const shots = r.screenshots && typeof r.screenshots === 'string' ? JSON.parse(r.screenshots) : (r.screenshots || {})
    return Object.entries(shots).map(([device, src]) => ({ url: r.url, device, src }))
  })

  const lhResults = results.results.filter(r => r.lighthouse_scores)

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:'1.5rem',fontWeight:700,marginBottom:4}}>Scan Results</h1>
          <p style={{color:'var(--text-muted)',fontSize:12}}>
            {scan.urls?.join(', ')} • {new Date(scan.created_at).toLocaleString()} • {scan.scan_mode} scan
          </p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <a href={`/api/reports/html/${scanId}`} target="_blank" rel="noreferrer">
            <button className="btn-secondary">📄 HTML</button>
          </a>
          <a href={`/api/reports/pdf/${scanId}`} target="_blank" rel="noreferrer">
            <button className="btn-secondary">📑 PDF</button>
          </a>
          <a href={`/api/reports/csv/${scanId}`} target="_blank" rel="noreferrer">
            <button className="btn-secondary">📊 CSV</button>
          </a>
          <a href={`/api/reports/json/${scanId}`} target="_blank" rel="noreferrer">
            <button className="btn-secondary">{ }</button>
          </a>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:12,marginBottom:24}}>
        {[
          { label:'Pages', value: summary.totalPages || 0, color:'var(--primary)' },
          { label:'Critical', value: summary.critical || 0, color:'var(--critical)' },
          { label:'High', value: summary.high || 0, color:'var(--high)' },
          { label:'Medium', value: summary.medium || 0, color:'var(--medium)' },
          { label:'Low', value: summary.low || 0, color:'var(--low)' },
          { label:'Total', value: summary.totalIssues || 0, color:'var(--text-muted)' },
        ].map(s => (
          <div key={s.label} className="card" style={{textAlign:'center',padding:16}}>
            <div style={{fontSize:'1.75rem',fontWeight:700,color:s.color}}>{s.value}</div>
            <div style={{color:'var(--text-muted)',fontSize:11,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:'1px solid var(--border)',paddingBottom:0}}>
        {['summary','issues','lighthouse','screenshots'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background:'none',border:'none',padding:'8px 16px',
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              borderRadius:0,fontWeight: activeTab === tab ? 600 : 400,
              textTransform:'capitalize',cursor:'pointer'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="card">
            <h3 style={{marginBottom:12,fontSize:'0.95rem'}}>Issues by Category</h3>
            {categories.map(cat => {
              const count = issues.filter(i => i.category === cat).length
              const pct = Math.round((count / issues.length) * 100)
              return (
                <div key={cat} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12}}>
                    <span>{CATEGORY_ICONS[cat] || '⚠️'} {cat}</span>
                    <span style={{color:'var(--text-muted)'}}>{count}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{width:`${pct}%`}} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="card">
            <h3 style={{marginBottom:12,fontSize:'0.95rem'}}>Top Issues</h3>
            {issues.slice(0, 8).map((issue, i) => (
              <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:10,paddingBottom:10,borderBottom:'1px solid var(--border)'}}>
                <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{issue.title}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{issue.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues Tab */}
      {activeTab === 'issues' && (
        <div>
          <div style={{display:'flex',gap:10,marginBottom:16}}>
            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} style={{width:'auto'}}>
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{width:'auto'}}>
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{color:'var(--text-muted)',fontSize:12,alignSelf:'center'}}>{filteredIssues.length} issues</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {filteredIssues.map((issue, i) => (
              <IssueCard key={i} issue={issue} />
            ))}
            {filteredIssues.length === 0 && (
              <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)'}}>No issues match the current filters</div>
            )}
          </div>
        </div>
      )}

      {/* Lighthouse Tab */}
      {activeTab === 'lighthouse' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {lhResults.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)'}}>No Lighthouse data available</div>
          ) : lhResults.map((r, i) => {
            const scores = typeof r.lighthouse_scores === 'string' ? JSON.parse(r.lighthouse_scores) : r.lighthouse_scores
            return (
              <div key={i} className="card">
                <p style={{fontSize:12,color:'var(--text-muted)',marginBottom:16,wordBreak:'break-all'}}>{r.url}</p>
                <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
                  {Object.entries(scores).map(([key, val]) => (
                    <div key={key} className="score-ring">
                      <div className="value" style={{color: val >= 90 ? 'var(--success)' : val >= 50 ? 'var(--medium)' : 'var(--critical)'}}>{val}</div>
                      <div className="label">{key}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Screenshots Tab */}
      {activeTab === 'screenshots' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
            {allScreenshots.map((shot, i) => (
              <div key={i} className="card" style={{padding:0,overflow:'hidden',cursor:'pointer'}} onClick={() => setSelectedScreenshot(shot)}>
                <div style={{padding:'8px 12px',background:'var(--surface2)',fontSize:11,color:'var(--text-muted)',display:'flex',justifyContent:'space-between'}}>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{shot.url}</span>
                  <span style={{marginLeft:8,flexShrink:0}}>{shot.device}</span>
                </div>
                <img src={shot.src} alt={`${shot.device} screenshot`} style={{width:'100%',height:180,objectFit:'cover',objectPosition:'top'}} loading="lazy" />
              </div>
            ))}
          </div>
          {allScreenshots.length === 0 && (
            <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)'}}>No screenshots available</div>
          )}
        </div>
      )}

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={() => setSelectedScreenshot(null)}
        >
          <div style={{maxWidth:'90vw',maxHeight:'90vh',overflow:'auto'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,color:'white'}}>
              <span style={{fontSize:12}}>{selectedScreenshot.url} - {selectedScreenshot.device}</span>
              <button onClick={() => setSelectedScreenshot(null)} style={{background:'none',color:'white',fontSize:20,padding:0}}>✕</button>
            </div>
            <img src={selectedScreenshot.src} alt="screenshot" style={{maxWidth:'100%',borderRadius:8}} />
          </div>
        </div>
      )}
    </div>
  )
}

function IssueCard({ issue }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="card" style={{padding:'12px 16px',cursor:'pointer'}} onClick={() => setExpanded(!expanded)}>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
        <span style={{fontSize:11,color:'var(--text-muted)',background:'var(--surface2)',padding:'2px 6px',borderRadius:4}}>{issue.category}</span>
        <span style={{flex:1,fontWeight:500,fontSize:13}}>{issue.title}</span>
        <span style={{color:'var(--text-muted)',fontSize:12}}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)',fontSize:12}}>
          {issue.description && <p style={{color:'var(--text-muted)',marginBottom:8}}>{issue.description}</p>}
          {issue.suggestion && (
            <p style={{color:'var(--success)'}}>💡 {issue.suggestion}</p>
          )}
          {issue.url && (
            <p style={{marginTop:6}}><a href={issue.url} target="_blank" rel="noreferrer" style={{fontSize:11}}>{issue.url}</a></p>
          )}
        </div>
      )}
    </div>
  )
}
