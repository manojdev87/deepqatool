import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function NewScan() {
  const [urlInput, setUrlInput] = useState('')
  const [scanMode, setScanMode] = useState('quick')
  const [isSitemap, setIsSitemap] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleScan = async () => {
    setError('')
    const urls = urlInput.split('\n').map(u => u.trim()).filter(Boolean)
    if (urls.length === 0) { setError('Please enter at least one URL'); return }

    setLoading(true)
    try {
      const { data } = await axios.post('/api/scan/start', { urls, scanMode, isSitemap })
      navigate(`/scan/${data.scanId}`)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
      setLoading(false)
    }
  }

  return (
    <div style={{maxWidth:700}}>
      <div style={{marginBottom:32}}>
        <h1 style={{fontSize:'1.75rem',fontWeight:700,marginBottom:4}}>New Scan</h1>
        <p style={{color:'var(--text-muted)'}}>Enter URLs to audit for quality, performance, and accessibility issues</p>
      </div>

      <div className="card" style={{marginBottom:20}}>
        <label style={{display:'block',marginBottom:8,fontWeight:500}}>URLs to Scan</label>
        <textarea
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          placeholder="https://example.com&#10;https://example.com/about&#10;https://example.com/contact"
          rows={6}
          style={{resize:'vertical',fontFamily:'monospace'}}
        />
        <p style={{color:'var(--text-muted)',fontSize:12,marginTop:6}}>Enter one URL per line. For sitemaps, enter the sitemap.xml URL and enable sitemap mode.</p>
      </div>

      <div className="card" style={{marginBottom:20}}>
        <label style={{display:'block',marginBottom:12,fontWeight:500}}>Scan Mode</label>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <ModeCard
            selected={scanMode === 'quick'}
            onClick={() => setScanMode('quick')}
            title="⚡ Quick Scan"
            description="Links, Metadata, Lighthouse scores"
            features={['SEO Analysis','Schema Check','Content Audit','JS Errors','Lighthouse','Screenshots']}
          />
          <ModeCard
            selected={scanMode === 'full'}
            onClick={() => setScanMode('full')}
            title="🔬 Full Scan"
            description="Complete audit including UI, Forms, Accessibility"
            features={['Everything in Quick','Link Audit','Form Testing','UI Testing','Axe Accessibility','Visual Regression']}
          />
        </div>
      </div>

      <div className="card" style={{marginBottom:20}}>
        <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
          <input
            type="checkbox"
            checked={isSitemap}
            onChange={e => setIsSitemap(e.target.checked)}
            style={{width:'auto',accentColor:'var(--primary)'}}
          />
          <div>
            <div style={{fontWeight:500}}>Sitemap Mode</div>
            <div style={{color:'var(--text-muted)',fontSize:12}}>Treat the URL as a sitemap.xml and crawl all discovered pages</div>
          </div>
        </label>
      </div>

      {error && (
        <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid var(--critical)',borderRadius:8,padding:'12px 16px',marginBottom:16,color:'var(--critical)'}}>
          {error}
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleScan}
        disabled={loading}
        style={{width:'100%',padding:'14px',fontSize:'1rem',borderRadius:10}}
      >
        {loading ? <><span className="spinner" style={{marginRight:8}}/> Starting Scan...</> : '🚀 Start Scan'}
      </button>

      <div style={{marginTop:24,padding:16,background:'var(--surface)',borderRadius:8,border:'1px solid var(--border)'}}>
        <p style={{fontWeight:500,marginBottom:8}}>💡 Tips</p>
        <ul style={{color:'var(--text-muted)',fontSize:12,paddingLeft:16,lineHeight:2}}>
          <li>Full scan takes 2-5 minutes per URL depending on page complexity</li>
          <li>Quick scan takes 30-60 seconds per URL</li>
          <li>Lighthouse requires Chrome to be installed on your system</li>
          <li>Screenshots are saved for desktop, tablet, and mobile viewports</li>
        </ul>
      </div>
    </div>
  )
}

function ModeCard({ selected, onClick, title, description, features }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: 16,
        cursor: 'pointer',
        background: selected ? 'rgba(59,130,246,0.08)' : 'transparent',
        transition: 'all 0.15s'
      }}
    >
      <div style={{fontWeight:600,marginBottom:4}}>{title}</div>
      <div style={{color:'var(--text-muted)',fontSize:12,marginBottom:10}}>{description}</div>
      <ul style={{listStyle:'none',fontSize:12,color:'var(--text-muted)'}}>
        {features.map(f => <li key={f} style={{marginBottom:2}}>✓ {f}</li>)}
      </ul>
    </div>
  )
}
