import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function History() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = () => {
    axios.get('/api/history').then(r => setHistory(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const deleteScan = async (e, scanId) => {
    e.stopPropagation()
    if (!confirm('Delete this scan?')) return
    await axios.delete(`/api/history/${scanId}`)
    load()
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',gap:12,color:'var(--text-muted)'}}><div className="spinner"/>Loading...</div>

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:32}}>
        <div>
          <h1 style={{fontSize:'1.75rem',fontWeight:700,marginBottom:4}}>Scan History</h1>
          <p style={{color:'var(--text-muted)'}}>{history.length} total scans</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/scan')}>+ New Scan</button>
      </div>

      {history.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 0',color:'var(--text-muted)'}}>
          <div style={{fontSize:'3rem',marginBottom:12}}>📋</div>
          <p>No scan history yet</p>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {history.map(scan => (
            <div
              key={scan.id}
              className="card"
              style={{cursor:'pointer',transition:'border-color 0.15s'}}
              onClick={() => navigate(`/scan/${scan.id}`)}
            >
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                    <span className={`badge ${scan.status === 'completed' ? 'badge-low' : scan.status === 'failed' ? 'badge-critical' : 'badge-medium'}`}>
                      {scan.status}
                    </span>
                    <span className="badge badge-low">{scan.scan_mode}</span>
                    <span style={{fontSize:11,color:'var(--text-muted)'}}>{new Date(scan.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{fontSize:13,color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {scan.urls?.join(' • ')}
                  </div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginLeft:16,flexShrink:0}}>
                  {scan.summary && (
                    <div style={{display:'flex',gap:12,fontSize:12}}>
                      {scan.summary.critical > 0 && <span style={{color:'var(--critical)'}}>🔴 {scan.summary.critical}</span>}
                      {scan.summary.high > 0 && <span style={{color:'var(--high)'}}>🟠 {scan.summary.high}</span>}
                      {scan.summary.medium > 0 && <span style={{color:'var(--medium)'}}>🟡 {scan.summary.medium}</span>}
                      <span style={{color:'var(--text-muted)'}}>{scan.summary.totalIssues} total</span>
                    </div>
                  )}
                  <button
                    className="btn-secondary"
                    style={{fontSize:11,padding:'4px 8px'}}
                    onClick={e => deleteScan(e, scan.id)}
                  >🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
