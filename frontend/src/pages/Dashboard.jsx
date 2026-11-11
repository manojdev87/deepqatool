import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'

export default function Dashboard() {
  const [history, setHistory] = useState([])
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      axios.get('/api/history'),
      axios.get('/api/history/trends')
    ]).then(([h, t]) => {
      setHistory(h.data)
      setTrends(t.data.reverse())
    }).finally(() => setLoading(false))
  }, [])

  const recent = history[0]
  const totalScans = history.length
  const completedScans = history.filter(s => s.status === 'completed').length

  if (loading) return <div style={{display:'flex',alignItems:'center',gap:12,color:'var(--text-muted)'}}><div className="spinner"/><span>Loading dashboard...</span></div>

  return (
    <div>
      <div style={{marginBottom:32}}>
        <h1 style={{fontSize:'1.75rem',fontWeight:700,marginBottom:4}}>Dashboard</h1>
        <p style={{color:'var(--text-muted)'}}>Website QA Audit Overview</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,marginBottom:32}}>
        <StatCard label="Total Scans" value={totalScans} icon="🔍" color="var(--primary)" />
        <StatCard label="Completed" value={completedScans} icon="✅" color="var(--success)" />
        {recent?.summary && <>
          <StatCard label="Critical Issues" value={recent.summary.critical || 0} icon="🔴" color="var(--critical)" />
          <StatCard label="High Issues" value={recent.summary.high || 0} icon="🟠" color="var(--high)" />
          <StatCard label="Total Issues" value={recent.summary.totalIssues || 0} icon="⚠️" color="var(--medium)" />
        </>}
      </div>

      {trends.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginBottom:32}}>
          <div className="card">
            <h3 style={{marginBottom:16,fontSize:'1rem'}}>Issue Trends</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trends}>
                <XAxis dataKey="date" tick={{fontSize:10,fill:'var(--text-muted)'}} tickFormatter={v => new Date(v).toLocaleDateString()} />
                <YAxis tick={{fontSize:10,fill:'var(--text-muted)'}} />
                <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8}} />
                <Line type="monotone" dataKey="critical" stroke="var(--critical)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="high" stroke="var(--high)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="medium" stroke="var(--medium)" strokeWidth={2} dot={false} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 style={{marginBottom:16,fontSize:'1rem'}}>Issues by Severity</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trends.slice(-5)}>
                <XAxis dataKey="date" tick={{fontSize:10,fill:'var(--text-muted)'}} tickFormatter={v => new Date(v).toLocaleDateString()} />
                <YAxis tick={{fontSize:10,fill:'var(--text-muted)'}} />
                <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8}} />
                <Bar dataKey="critical" fill="var(--critical)" />
                <Bar dataKey="high" fill="var(--high)" />
                <Bar dataKey="medium" fill="var(--medium)" />
                <Bar dataKey="low" fill="var(--low)" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{fontSize:'1rem'}}>Recent Scans</h3>
          <button className="btn-primary" onClick={() => navigate('/scan')}>+ New Scan</button>
        </div>
        {history.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)'}}>
            <div style={{fontSize:'3rem',marginBottom:12}}>🔍</div>
            <p>No scans yet. Start your first scan!</p>
            <button className="btn-primary" style={{marginTop:16}} onClick={() => navigate('/scan')}>Start Scan</button>
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                {['URLs','Mode','Status','Issues','Date','Actions'].map(h => (
                  <th key={h} style={{padding:'8px 12px',textAlign:'left',color:'var(--text-muted)',fontWeight:500,fontSize:12}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map(scan => (
                <tr key={scan.id} style={{borderBottom:'1px solid var(--border)'}} onClick={() => navigate(`/scan/${scan.id}`)} className="table-row">
                  <td style={{padding:'10px 12px',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {scan.urls?.[0]}
                    {scan.urls?.length > 1 && <span style={{color:'var(--text-muted)',marginLeft:4}}>+{scan.urls.length-1}</span>}
                  </td>
                  <td style={{padding:'10px 12px'}}><span className="badge badge-low">{scan.scan_mode}</span></td>
                  <td style={{padding:'10px 12px'}}>
                    <span className={`badge ${scan.status === 'completed' ? 'badge-low' : scan.status === 'failed' ? 'badge-critical' : 'badge-medium'}`}>
                      {scan.status}
                    </span>
                  </td>
                  <td style={{padding:'10px 12px',color:'var(--text-muted)'}}>{scan.summary?.totalIssues ?? '-'}</td>
                  <td style={{padding:'10px 12px',color:'var(--text-muted)',fontSize:12}}>{new Date(scan.created_at).toLocaleString()}</td>
                  <td style={{padding:'10px 12px'}}>
                    <button className="btn-secondary" style={{fontSize:12,padding:'4px 10px'}} onClick={e => { e.stopPropagation(); navigate(`/scan/${scan.id}`) }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="card" style={{textAlign:'center'}}>
      <div style={{fontSize:'1.75rem',marginBottom:4}}>{icon}</div>
      <div style={{fontSize:'2rem',fontWeight:700,color}}>{value}</div>
      <div style={{color:'var(--text-muted)',fontSize:12,marginTop:4}}>{label}</div>
    </div>
  )
}
