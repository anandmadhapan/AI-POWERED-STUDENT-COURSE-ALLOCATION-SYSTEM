/* ─────────────────────────────────────────────────────────
   Table.jsx — Complete rewrite
   Design: flat white bg, #f8fafc header, 52px rows,
           shimmer skeleton, centered empty state,
           subtle indigo row hover, sort-icon on data cols
───────────────────────────────────────────────────────── */

const PAD_H    = 16
const ROW_H    = 52
const HEAD_BG  = '#f8fafc'
const HEAD_BDR = '#e2e8f0'
const ROW_BDR  = '#f1f5f9'

/* Small ↑↓ sort indicator shown on data columns */
function SortIcon() {
  return (
    <svg
      width="8" height="10" viewBox="0 0 8 10" fill="none"
      style={{ opacity: 0.35, flexShrink: 0, marginLeft: 3 }}
      aria-hidden="true"
    >
      <path d="M4 0L7 3.5H1L4 0Z"   fill="#64748b" />
      <path d="M4 10L1 6.5H7L4 10Z" fill="#64748b" />
    </svg>
  )
}

/* Shimmer skeleton pill */
function Shimmer({ w = '55%', h = 10, r = 5, style: extra }) {
  return (
    <div
      className="animate-shimmer"
      style={{ height: h, borderRadius: r, width: w, ...extra }}
    />
  )
}

export default function Table({
  columns,
  data,
  loading,
  emptyMessage = 'No records found.',
}) {

  /* ── Loading skeleton ──────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
        overflow: 'hidden',
      }}>
        {/* Skeleton header */}
        <div style={{
          background: HEAD_BG,
          borderBottom: `1.5px solid ${HEAD_BDR}`,
          display: 'flex',
          alignItems: 'center',
          height: 40,
        }}>
          {columns.map((col, i) => (
            <div key={i} style={{ flex: col.width ? `0 0 ${col.width}` : 1, padding: `0 ${PAD_H}px` }}>
              <Shimmer w="50%" h={8} />
            </div>
          ))}
        </div>

        {/* Skeleton rows */}
        {[...Array(6)].map((_, ri) => (
          <div key={ri} style={{
            display: 'flex', alignItems: 'center', height: ROW_H,
            borderBottom: ri < 5 ? `1px solid ${ROW_BDR}` : 'none',
          }}>
            {columns.map((col, ci) => (
              <div key={ci} style={{ flex: col.width ? `0 0 ${col.width}` : 1, padding: `0 ${PAD_H}px` }}>
                {ci === 1 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shimmer w={32} h={32} r={9} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Shimmer w="70%" h={10} r={4} />
                      <Shimmer w="45%" h={8} r={4} style={{ marginTop: 6 }} />
                    </div>
                  </div>
                ) : (
                  <Shimmer w={ci === 0 ? '30%' : '55%'} h={10} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  /* ── Empty state ───────────────────────────────────────────── */
  if (!data || data.length === 0) {
    return (
      <div style={{
        background: '#ffffff', borderRadius: 16,
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
        padding: '60px 24px', textAlign: 'center',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', fontSize: 22,
        }}>📭</div>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#475569' }}>
          Nothing here yet
        </p>
        <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>{emptyMessage}</p>
      </div>
    )
  }

  /* ── Table ─────────────────────────────────────────────────── */
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      border: '1.5px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
      background: '#ffffff',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          tableLayout: 'fixed', minWidth: 640,
        }}>
          <colgroup>
            {columns.map(col => (
              <col key={col.key} style={{ width: col.width ?? 'auto' }} />
            ))}
          </colgroup>

          {/* ── Header ─────────────────────────────────────── */}
          <thead>
            <tr style={{ background: HEAD_BG }}>
              {columns.map(col => {
                const isData = col.label && col.key !== '_actions' && col.key !== '_sno'
                return (
                  <th key={col.key} style={{
                    padding: `0 ${PAD_H}px`, height: 40,
                    textAlign: col.align ?? 'left',
                    fontSize: 11, fontWeight: 700, color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    whiteSpace: 'nowrap',
                    borderBottom: `1.5px solid ${HEAD_BDR}`,
                    overflow: 'hidden', userSelect: 'none', verticalAlign: 'middle',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      {col.label}
                      {isData && <SortIcon />}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* ── Body ───────────────────────────────────────── */}
          <tbody>
            {data.map((row, ri) => (
              <tr key={row.id ?? ri} className="table-row-hover"
                style={{ borderBottom: ri < data.length - 1 ? `1px solid ${ROW_BDR}` : 'none' }}>
                {columns.map(col => (
                  <td key={col.key} style={{
                    padding: `0 ${PAD_H}px`, height: ROW_H,
                    fontSize: 13, color: '#374151',
                    verticalAlign: 'middle', textAlign: col.align ?? 'left',
                    whiteSpace: col.wrap ? 'normal' : 'nowrap', overflow: 'hidden',
                  }}>
                    {col.render
                      ? col.render(row[col.key], row, ri)
                      : (row[col.key] != null
                          ? row[col.key]
                          : <span style={{ color: '#e2e8f0' }}>—</span>)
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
