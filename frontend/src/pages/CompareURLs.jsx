import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const EMPTY_PAIR = { uatUrl: '', prodUrl: '' }

export default function CompareURLs() {
  const [pairs, setPairs] = useState([{ ...EMPTY_PAIR }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const updatePair = (idx, field, value) => {
    setPairs(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  const addPair = () => setPairs(prev => [...prev, { ...EMPTY_PAIR }])
  const removePair = (idx) => setPairs(prev => prev.filter((_, i) => i !== idx))

  const handleCompare = async () => {
    setError('')
    const validPairs = pairs.filter(p => p.uatUrl.trim() && p.prodUrl.trim())
    if (validPairs.length === 0) { setError('Add at least one URL pair'); return }

    for (const p of validPairs) {
      try { new URL(p.uatUrl); new URL(p.prodUrl); } catch {
        setError(`Invalid URL: ${p.uatUrl} or ${p.prodUrl}`); return
      }
    }

    setLoading(true)
    try {
      const { data } = await axios.post('/api/compare/start', { pairs: validPairs })
      navigate(`/compare/${data.compareId}`)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 780 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 4 }}>UAT vs Production Comparison</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Compare content, alt tags, headings, and metadata between UAT and Production URLs side-by-side
        </p>
      </div>

      {/* What gets compared info box */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {[
          { icon: '🖼️', label: 'Alt Tag Audit', items: ['Alt text mismatches', 'Missing alt attributes', 'Empty alt strings', 'Images only on UAT/Prod'] },
          { icon: '📝', label: 'Content Audit', items: ['Page title differences', 'Meta description diffs', 'H1/H2/H3 mismatches', 'Word count variance'] }
        ].map(({ icon, label, items }) => (
          <div key={label} className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{icon} {label}</div>
            <ul style={{ listStyle: 'none', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
              {items.map(i => <li key={i}>✓ {i}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* URL Pairs */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <label style={{ fontWeight: 500 }}>URL Pairs</label>
          <button className="btn-secondary" onClick={addPair} style={{ fontSize: 12, padding: '6px 12px' }}>
            + Add Pair
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pairs.map((pair, idx) => (
            <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Pair #{idx + 1}</span>
                {pairs.length > 1 && (
                  <button onClick={() => removePair(idx)} style={{ background: 'none', color: 'var(--critical)', fontSize: 16, padding: 0 }}>✕</button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    🔵 UAT URL
                  </label>
                  <input
                    type="url"
                    value={pair.uatUrl}
                    onChange={e => updatePair(idx, 'uatUrl', e.target.value)}
                    placeholder="https://uat.example.com/page"
                    style={{ borderColor: pair.uatUrl ? 'var(--primary)' : 'var(--border)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    🟢 Production URL
                  </label>
                  <input
                    type="url"
                    value={pair.prodUrl}
                    onChange={e => updatePair(idx, 'prodUrl', e.target.value)}
                    placeholder="https://www.example.com/page"
                    style={{ borderColor: pair.prodUrl ? 'var(--success)' : 'var(--border)' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--critical)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: 'var(--critical)' }}>
          {error}
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleCompare}
        disabled={loading}
        style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: 10 }}
      >
        {loading
          ? <><span className="spinner" style={{ marginRight: 8 }} /> Starting Comparison...</>
          : `🔄 Compare ${pairs.filter(p => p.uatUrl && p.prodUrl).length} URL Pair(s)`
        }
      </button>

      <div style={{ marginTop: 20, padding: 14, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
        <strong style={{ color: 'var(--text)' }}>💡 How it works:</strong> Both URLs are loaded in a headless browser simultaneously.
        All images, alt attributes, headings, meta tags, and content are extracted and compared.
        Differences are reported with severity levels and downloadable as HTML, PDF, CSV, or JSON.
      </div>
    </div>
  )
}
