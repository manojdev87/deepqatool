import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const SEV_CLASS = { critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }
const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

export default function CompareResults() {
  const { compareId } = useParams()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(null)
  const [data, setData] = useState(null)
  const [activePair, setActivePair] = useState(0)
  const [activeTab, setActiveTab] = useState('alt_tags')
  const [filterSev, setFilterSev] = useState('all')
  const [lightboxImg, setLightboxImg] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const { data: prog } = await axios.get(`/api/compare/progress/${compareId}`)
        setProgress(prog)
        if (prog.status === 'completed' || prog.status === 'failed') {
          clearInterval(pollRef.current)
          if (prog.status === 'completed') {
            const { data: res } = await axios.get(`/api/compare/results/${compareId}`)
            setData(res)
          }
        }
      } catch (e) {
        // Only stop polling on 404 (comparison truly not found), not transient errors
        if (e.response?.status === 404) clearInterval(pollRef.current)
      }
    }, 2000)
    return () => clearInterval(pollRef.current)
  }, [compareId])

  // ── Loading / progress states ────────────────────────────────────────
  if (!progress) return <Spinner text="Initializing comparison..." />

  if (progress.status === 'running' || progress.status === 'pending') {
    const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
    return (
      <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔄</div>
        <h2 style={{ marginBottom: 8 }}>Comparing URLs</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
          {progress.current} of {progress.total} pair(s) processed
        </p>
        {progress.currentPair && (
          <p style={{ color: 'var(--primary)', fontSize: 12, marginBottom: 16, wordBreak: 'break-all' }}>
            {progress.currentPair}
          </p>
        )}
        <div className="progress-bar" style={{ marginBottom: 8 }}>
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{pct}% complete</p>
      </div>
    )
  }

  if (progress.status === 'failed') {
    return (
      <div style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>❌</div>
        <h2>Comparison Failed</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>{progress.error}</p>
        <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/compare')}>Try Again</button>
      </div>
    )
  }

  if (!data) return <Spinner text="Loading results..." />

  const { comparison, results } = data
  const summary = comparison.summary || {}
  const pair = results[activePair]
  if (!pair) return <div style={{ color: 'var(--text-muted)' }}>No results found</div>

  const allDiffs = pair.diffs || []
  const altDiffs = allDiffs.filter(d => d.category === 'alt_tag')
  const contentDiffs = allDiffs.filter(d => d.category === 'content')

  const filtered = (list) => list
    .filter(d => filterSev === 'all' || d.severity === filterSev)
    .sort((a, b) => (SEV_ORDER[a.severity] ?? 4) - (SEV_ORDER[b.severity] ?? 4))

  const uatShots = pair.uatScreenshots || {}
  const prodShots = pair.prodScreenshots || {}

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>UAT vs Production Results</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {results.length} pair(s) • {new Date(comparison.created_at).toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`/api/reports/compare/html/${compareId}`} target="_blank" rel="noreferrer">
            <button className="btn-secondary">📄 HTML</button>
          </a>
          <a href={`/api/reports/compare/pdf/${compareId}`} target="_blank" rel="noreferrer">
            <button className="btn-secondary">📑 PDF</button>
          </a>
          <a href={`/api/reports/compare/csv/${compareId}`} target="_blank" rel="noreferrer">
            <button className="btn-secondary">📊 CSV</button>
          </a>
          <a href={`/api/reports/compare/json/${compareId}`} target="_blank" rel="noreferrer">
            <button className="btn-secondary">{ }</button>
          </a>
        </div>
      </div>

      {/* Overall summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Pairs', value: summary.totalPairs || 0, color: 'var(--primary)' },
          { label: 'Critical', value: summary.critical || 0, color: 'var(--critical)' },
          { label: 'High', value: summary.high || 0, color: 'var(--high)' },
          { label: 'Medium', value: summary.medium || 0, color: 'var(--medium)' },
          { label: 'Alt Diffs', value: summary.totalAltTagDiffs || 0, color: '#7c3aed' },
          { label: 'Content Diffs', value: summary.totalContentDiffs || 0, color: 'var(--text-muted)' },
          { label: 'Total Diffs', value: summary.totalDiffs || 0, color: 'var(--text)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pair selector (if multiple pairs) */}
      {results.length > 1 && (
        <div className="card" style={{ marginBottom: 20, padding: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Select URL Pair</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => { setActivePair(i); setActiveTab('alt_tags') }}
                style={{
                  padding: '6px 12px', fontSize: 12, borderRadius: 6,
                  background: activePair === i ? 'var(--primary)' : 'var(--surface2)',
                  color: activePair === i ? 'white' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer'
                }}
              >
                Pair #{i + 1} — {r.summary?.totalDiffs || 0} diffs
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active pair URLs */}
      <div className="card" style={{ marginBottom: 20, padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, marginBottom: 4 }}>🔵 UAT</div>
            <a href={pair.uat_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, wordBreak: 'break-all' }}>{pair.uat_url}</a>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600, marginBottom: 4 }}>🟢 Production</div>
            <a href={pair.prod_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, wordBreak: 'break-all' }}>{pair.prod_url}</a>
          </div>
        </div>
      </div>

      {/* Content overview side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { label: '🔵 UAT', data: pair.uatContent, color: 'var(--primary)', missingAlt: pair.summary?.missingAltUAT },
          { label: '🟢 Production', data: pair.prodContent, color: 'var(--success)', missingAlt: pair.summary?.missingAltProd }
        ].map(({ label, data: d, color, missingAlt }) => (
          <div key={label} className="card" style={{ padding: 14, borderTop: `3px solid ${color}` }}>
            <div style={{ fontWeight: 600, marginBottom: 10, color }}>{label}</div>
            <table style={{ width: '100%', fontSize: 12 }}>
              <tbody>
                {[
                  ['Title', d?.title || '—'],
                  ['Word Count', d?.wordCount ?? '—'],
                  ['Images', d?.imageCount ?? '—'],
                  ['Missing Alt', missingAlt ?? '—'],
                  ['H1 Tags', d?.headings?.filter(h => h.tag === 'h1').length ?? '—']
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color: 'var(--text-muted)', paddingBottom: 6, paddingRight: 12, whiteSpace: 'nowrap' }}>{k}</td>
                    <td style={{ fontWeight: 500, wordBreak: 'break-word' }}>{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {[
          { key: 'alt_tags', label: `🖼️ Alt Tags (${altDiffs.length})` },
          { key: 'content', label: `📝 Content (${contentDiffs.length})` },
          { key: 'screenshots', label: '📸 Screenshots' }
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            background: 'none', border: 'none', padding: '8px 16px',
            color: activeTab === t.key ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
            borderRadius: 0, fontWeight: activeTab === t.key ? 600 : 400, cursor: 'pointer', fontSize: 13
          }}>{t.label}</button>
        ))}
      </div>

      {/* Severity filter */}
      {activeTab !== 'screenshots' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <select value={filterSev} onChange={e => setFilterSev(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      )}

      {/* Alt Tags Tab */}
      {activeTab === 'alt_tags' && (
        <div>
          {filtered(altDiffs).length === 0
            ? <EmptyState icon="✅" text="No alt tag differences found for this filter" />
            : filtered(altDiffs).map((d, i) => <DiffCard key={i} diff={d} />)
          }
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div>
          {filtered(contentDiffs).length === 0
            ? <EmptyState icon="✅" text="No content differences found for this filter" />
            : filtered(contentDiffs).map((d, i) => <DiffCard key={i} diff={d} />)
          }
        </div>
      )}

      {/* Screenshots Tab */}
      {activeTab === 'screenshots' && (
        <div>
          {Object.keys({ ...uatShots, ...prodShots }).length === 0
            ? <EmptyState icon="📸" text="No screenshots available" />
            : Object.keys({ ...uatShots, ...prodShots }).map(device => (
              <div key={device} style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: 12, textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                  {device} viewport
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: '🔵 UAT', src: uatShots[device], color: 'var(--primary)' },
                    { label: '🟢 Production', src: prodShots[device], color: 'var(--success)' }
                  ].map(({ label, src, color }) => (
                    <div key={label} className="card" style={{ padding: 0, overflow: 'hidden', borderTop: `3px solid ${color}` }}>
                      <div style={{ padding: '8px 12px', background: 'var(--surface2)', fontSize: 12, fontWeight: 600, color }}>{label}</div>
                      {src
                        ? <img src={src} alt={label} style={{ width: '100%', height: 220, objectFit: 'cover', objectPosition: 'top', cursor: 'zoom-in', display: 'block' }}
                            onClick={() => setLightboxImg(src)} />
                        : <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No screenshot</div>
                      }
                    </div>
                  ))}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="screenshot" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxImg(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', color: 'white', fontSize: 28, border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}
    </div>
  )
}

function DiffCard({ diff }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="card" style={{ padding: '12px 16px', marginBottom: 8, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span className={`badge ${SEV_CLASS[diff.severity]}`}>{diff.severity}</span>
        <span style={{ fontSize: 11, background: 'var(--surface2)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4 }}>
          {diff.type?.replace(/_/g, ' ')}
        </span>
        <span style={{ flex: 1, fontWeight: 500, fontSize: 13 }}>{diff.title}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12 }}>
          {diff.imageSrc && (
            <div style={{ marginBottom: 8, padding: '6px 10px', background: 'var(--surface2)', borderRadius: 6, fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
              {diff.imageSrc}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
            <div style={{ padding: '8px 10px', background: 'rgba(59,130,246,0.08)', borderRadius: 6, borderLeft: '3px solid var(--primary)' }}>
              <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, marginBottom: 4 }}>🔵 UAT</div>
              <div style={{ wordBreak: 'break-word' }}>{diff.uatValue || '—'}</div>
            </div>
            <div style={{ padding: '8px 10px', background: 'rgba(34,197,94,0.08)', borderRadius: 6, borderLeft: '3px solid var(--success)' }}>
              <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600, marginBottom: 4 }}>🟢 Production</div>
              <div style={{ wordBreak: 'break-word' }}>{diff.prodValue || '—'}</div>
            </div>
          </div>
          {diff.description && <p style={{ color: 'var(--text-muted)' }}>{diff.description}</p>}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{icon}</div>
      <p>{text}</p>
    </div>
  )
}

function Spinner({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)' }}>
      <div className="spinner" /><span>{text}</span>
    </div>
  )
}
