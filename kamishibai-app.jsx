import { useState, useCallback, useEffect, useRef } from "react";

const DAYS   = ['Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota','Niedziela'];
const SUBS   = ['I','II','III'];
const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

const OC_BG    = { '':'#d1d5db', green:'#16a34a', yellow:'#ca8a04', red:'#dc2626' };
const OC_RING  = { '':'#9ca3af', green:'#22c55e', yellow:'#eab308', red:'#ef4444' };
const OC_LABEL = { '':'Brak',    green:'OK',       yellow:'Uwaga',   red:'Problem' };

const now = new Date();

function initCells() {
  const c = {};
  DAYS.forEach((_,di) => SUBS.forEach((_,si) => {
    c[`${di}_${si}`] = { o1:'',o2:'',o3:'',o4:'',uwagi:'',dzialania:'',kto:'',termin:'',ocena:'' };
  }));
  return c;
}

function computeOcena(uwagi, termin) {
  if (!uwagi.trim()) return 'green';
  if (termin) {
    const d = new Date(termin);
    if (!isNaN(d) && new Date() > d) return 'red';
  }
  return 'yellow';
}

function fmtDatetime(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleString('pl-PL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

/* ─── Cell textarea ─── */
function Cell({ value, onChange, placeholder }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={1} className="cell-input"
      onFocus={e => e.target.classList.add('cell-focus')}
      onBlur={e  => e.target.classList.remove('cell-focus')}
      onInput={e => { e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'; }}
    />
  );
}

/* ─── Custom DateTime Picker ─── */
const WDAYS = ['Pn','Wt','Śr','Cz','Pt','So','Nd'];
const MNAMES = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

function TerminPicker({ value, onChange }) {
  const [open, setOpen]     = useState(false);
  const [viewYear, setViewYear]   = useState(() => value ? new Date(value).getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? new Date(value).getMonth()    : new Date().getMonth());
  const [selDate, setSelDate]     = useState(() => value ? value.slice(0,10) : '');
  const [selHour, setSelHour]     = useState(() => value ? value.slice(11,13) : '12');
  const [selMin,  setSelMin]      = useState(() => value ? value.slice(14,16) : '00');
  const ref = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* Sync when parent resets value */
  useEffect(() => {
    if (!value) { setSelDate(''); setSelHour('12'); setSelMin('00'); }
    else {
      setSelDate(value.slice(0,10));
      setSelHour(value.slice(11,13) || '12');
      setSelMin(value.slice(14,16)  || '00');
      const d = new Date(value);
      if (!isNaN(d)) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
    }
  }, [value]);

  /* Build calendar days grid */
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const offset = (firstDay + 6) % 7; // Mon-based
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStr = new Date().toISOString().slice(0,10);
  const fmt = (n) => String(n).padStart(2,'0');

  const selectDay = (d) => {
    const s = `${viewYear}-${fmt(viewMonth+1)}-${fmt(d)}`;
    setSelDate(s);
  };

  const confirm = () => {
    if (!selDate) return;
    onChange(`${selDate}T${selHour}:${selMin}`);
    setOpen(false);
  };

  const setToday = () => {
    const d = new Date();
    const s = d.toISOString().slice(0,10);
    setSelDate(s);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelHour(fmt(d.getHours()));
    setSelMin(fmt(d.getMinutes()));
  };

  const clearAll = () => {
    setSelDate(''); setSelHour('12'); setSelMin('00');
    onChange('');
    setOpen(false);
  };

  const prevM = () => { if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextM = () => { if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  /* Display label */
  const displayVal = value
    ? new Date(value).toLocaleString('pl-PL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
    : '';

  return (
    <div className="tp-root" ref={ref}>
      <div className="tp-trigger" onClick={() => setOpen(o => !o)}>
        <span className={displayVal ? 'tp-val' : 'tp-placeholder'}>
          {displayVal || 'dd.mm.rrrr --:--'}
        </span>
        <span className="tp-icon">📅</span>
        {value && <button className="tp-x" onPointerDown={e=>{e.stopPropagation();clearAll();}}>×</button>}
      </div>

      {open && (
        <div className="tp-popup">
          {/* Month nav */}
          <div className="tp-mnav">
            <button className="tp-marr" onClick={prevM}>‹</button>
            <span className="tp-mtitle">{MNAMES[viewMonth]} {viewYear}</span>
            <button className="tp-marr" onClick={nextM}>›</button>
          </div>

          {/* Day headers */}
          <div className="tp-grid">
            {WDAYS.map(w => <div key={w} className="tp-wday">{w}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} />;
              const ds = `${viewYear}-${fmt(viewMonth+1)}-${fmt(d)}`;
              const isToday  = ds === todayStr;
              const isSel    = ds === selDate;
              return (
                <button key={ds}
                  className={`tp-day ${isToday?'tp-today':''} ${isSel?'tp-sel':''}`}
                  onClick={() => selectDay(d)}>
                  {d}
                </button>
              );
            })}
          </div>

          {/* Time picker */}
          <div className="tp-time">
            <span className="tp-time-lbl">Godzina:</span>
            <select className="tp-sel-input" value={selHour} onChange={e=>setSelHour(e.target.value)}>
              {Array.from({length:24},(_,i)=>fmt(i)).map(h=><option key={h} value={h}>{h}</option>)}
            </select>
            <span className="tp-time-sep">:</span>
            <select className="tp-sel-input" value={selMin} onChange={e=>setSelMin(e.target.value)}>
              {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Action buttons */}
          <div className="tp-actions">
            <button className="tp-act-clear" onClick={clearAll}>Wyczyść</button>
            <button className="tp-act-today" onClick={setToday}>Dzisiaj</button>
            <button className="tp-act-confirm" onClick={confirm} disabled={!selDate}>Zatwierdź</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Ocena dot (auto, read-only) ─── */
function OcenaDisplay({ value }) {
  return (
    <div className="ocena-wrap">
      <div className="ocena-dot" style={{ background: OC_BG[value], borderColor: OC_RING[value] }} title={OC_LABEL[value]} />
      {value && <span className="ocena-lbl" style={{ color: OC_RING[value] }}>{OC_LABEL[value]}</span>}
    </div>
  );
}

/* ─── Area header ─── */
function AreaHeader({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const save = () => { onChange(draft || value); setEditing(false); };
  if (editing) return (
    <input autoFocus value={draft} className="area-input"
      onChange={e => setDraft(e.target.value)} onBlur={save}
      onKeyDown={e => { if(e.key==='Enter') save(); if(e.key==='Escape') setEditing(false); }}
    />
  );
  return (
    <div className="area-header" onClick={() => { setDraft(value); setEditing(true); }} title="Kliknij aby zmienić">
      <span className="area-name">{value}</span>
      <span className="area-edit-hint">✎ edytuj</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   STATISTICS MODAL
════════════════════════════════════════════════════════ */
function StatsModal({ cells, areaLabels, statsNotes, onNoteChange, onClose }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy]             = useState('status'); // 'status' | 'area' | 'day'

  /* Collect all rows with uwagi */
  const issues = [];
  DAYS.forEach((day, di) => {
    SUBS.forEach((sub, si) => {
      const cell = cells[`${di}_${si}`];
      if (!cell.uwagi.trim()) return;

      /* Determine which area columns have content */
      const obszary = ['o1','o2','o3','o4']
        .filter(k => cell[k].trim())
        .map(k => ({ key: k, label: areaLabels[k], value: cell[k] }));

      issues.push({
        key: `${di}_${si}`,
        day, sub, di, si,
        obszary,
        uwagi:    cell.uwagi,
        ocena:    cell.ocena,
        termin:   cell.termin,
        kto:      cell.kto,
        dzialania: cell.dzialania,
      });
    });
  });

  /* Filter */
  const filtered = issues.filter(i => filterStatus === 'all' || i.ocena === filterStatus);

  /* Sort */
  const sorted = [...filtered].sort((a,b) => {
    if (sortBy === 'status') {
      const order = { red: 0, yellow: 1, green: 2, '': 3 };
      return (order[a.ocena] ?? 3) - (order[b.ocena] ?? 3);
    }
    if (sortBy === 'area') {
      const aL = a.obszary[0]?.label || '';
      const bL = b.obszary[0]?.label || '';
      return aL.localeCompare(bL, 'pl');
    }
    return a.di - b.di || a.si - b.si; // by day
  });

  /* Summary counts */
  const countByStatus = { red: 0, yellow: 0, green: 0 };
  issues.forEach(i => { if (countByStatus[i.ocena] !== undefined) countByStatus[i.ocena]++; });

  return (
    <div className="modal-overlay" onClick={e => { if(e.target.className === 'modal-overlay') onClose(); }}>
      <div className="modal-box">

        {/* ── Modal header ── */}
        <div className="modal-hdr">
          <div className="modal-title-block">
            <span className="modal-pretitle">Kamishibai</span>
            <span className="modal-title">📊 Statystyki problemów</span>
          </div>
          <div className="modal-summary">
            {[['red','#ef4444','Problemy'],['yellow','#eab308','Uwagi'],['green','#22c55e','OK']].map(([s,c,l]) => (
              <div key={s} className="modal-stat-pill" style={{ borderColor: c, background: c+'22' }}>
                <span className="modal-stat-dot" style={{ background: c }} />
                <span className="modal-stat-count" style={{ color: c }}>{countByStatus[s]}</span>
                <span className="modal-stat-label">{l}</span>
              </div>
            ))}
            <span className="modal-total">Łącznie: <b>{issues.length}</b></span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Filters ── */}
        <div className="modal-filters">
          <div className="filter-group">
            <span className="filter-label">Status:</span>
            {[['all','Wszystkie','#64748b'],['red','Problem','#ef4444'],['yellow','Uwaga','#eab308'],['green','OK','#22c55e']].map(([v,l,c]) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                className={`filter-btn ${filterStatus===v?'filter-active':''}`}
                style={filterStatus===v ? { borderColor: c, color: c, background: c+'18' } : {}}>
                {l}
              </button>
            ))}
          </div>
          <div className="filter-group">
            <span className="filter-label">Sortuj:</span>
            {[['status','Wg statusu'],['area','Wg obszaru'],['day','Wg dnia']].map(([v,l]) => (
              <button key={v} onClick={() => setSortBy(v)}
                className={`filter-btn ${sortBy===v?'filter-active':''}`}
                style={sortBy===v ? { borderColor: '#38bdf8', color: '#38bdf8', background: '#38bdf822' } : {}}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        {sorted.length === 0 ? (
          <div className="modal-empty">
            {issues.length === 0
              ? '✅ Brak wpisanych uwag — tablica czysta!'
              : 'Brak wyników dla wybranego filtra.'}
          </div>
        ) : (
          <div className="modal-table-wrap">
            <table className="modal-table">
              <thead>
                <tr>
                  <th style={{ width:'4rem' }}>Status</th>
                  <th style={{ width:'5.5rem' }}>Dzień / wiersz</th>
                  <th style={{ width:'14%' }}>Obszar</th>
                  <th style={{ width:'22%' }}>Opis problemu<br/><span className="th-sub">(z kolumny Uwagi)</span></th>
                  <th style={{ width:'10%' }}>Kto</th>
                  <th style={{ width:'8rem' }}>Termin</th>
                  <th>Proponowane działania zaradcze<br/><span className="th-sub">(notatki kierownika / lidera)</span></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(issue => {
                  const note = statsNotes[issue.key] || '';
                  return (
                    <tr key={issue.key} className={`srow srow-${issue.ocena}`}>
                      <td className="s-status">
                        <div className="s-dot" style={{ background: OC_BG[issue.ocena], borderColor: OC_RING[issue.ocena] }} />
                        <span className="s-status-lbl" style={{ color: OC_RING[issue.ocena] }}>{OC_LABEL[issue.ocena]}</span>
                      </td>
                      <td className="s-day">
                        <span className="s-dayname">{issue.day}</span>
                        <span className="s-sub">{issue.sub}</span>
                      </td>
                      <td className="s-area">
                        {issue.obszary.length > 0 ? (
                          <div className="s-obszary">
                            {issue.obszary.map(o => (
                              <div key={o.key} className="s-obszar-item">
                                <span className="s-obszar-lbl">{o.label}</span>
                                {o.value && <span className="s-obszar-val">{o.value}</span>}
                              </div>
                            ))}
                          </div>
                        ) : <span className="s-empty">—</span>}
                      </td>
                      <td className="s-problem">
                        <span className="s-problem-text">{issue.uwagi}</span>
                        {issue.dzialania && (
                          <span className="s-dzialania-ref">↳ {issue.dzialania}</span>
                        )}
                      </td>
                      <td className="s-kto">{issue.kto || '—'}</td>
                      <td className="s-termin">
                        {issue.ocena === 'red' && (
                          <span className="s-overdue">⚠ Po terminie</span>
                        )}
                        <span className={issue.ocena === 'red' ? 's-termin-red' : ''}>{fmtDatetime(issue.termin)}</span>
                      </td>
                      <td className="s-note-td">
                        <textarea
                          className="s-note-input"
                          value={note}
                          onChange={e => onNoteChange(issue.key, e.target.value)}
                          placeholder="Wpisz działania zaradcze, uwagi kierownika..."
                          rows={2}
                          onInput={e => { e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'; }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-footer">
          <span className="modal-footer-note">
            💡 Notatki w kolumnie "Działania zaradcze" są zapisywane dynamicznie i widoczne tylko w tym panelu.
          </span>
          <button className="k-btn k-btn-cancel" onClick={onClose}>Zamknij</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN APP
════════════════════════════════════════════════════════ */
export default function KamishibaiApp() {
  const [month, setMonth]           = useState(now.getMonth());
  const [year,  setYear]            = useState(now.getFullYear());
  const [areaLabels, setAreaLabels] = useState({ o1:'OBSZAR 1',o2:'OBSZAR 2',o3:'OBSZAR 3',o4:'OBSZAR 4' });
  const [cells, setCells]           = useState(initCells);
  const [dyzurny, setDyzurny]       = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [showStats, setShowStats]   = useState(false);
  const [statsNotes, setStatsNotes] = useState({});   // { [di_si]: string }

  /* Active issue count for badge */
  const activeIssues = Object.values(cells).filter(c => c.uwagi.trim()).length;

  /* ── Auto-check deadlines every minute ── */
  useEffect(() => {
    const tick = () => {
      setCells(prev => {
        let changed = false;
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          const cell = next[k];
          if (!cell.uwagi.trim()) return;
          const auto = computeOcena(cell.uwagi, cell.termin);
          if (auto !== cell.ocena) { next[k] = { ...cell, ocena: auto }; changed = true; }
        });
        return changed ? next : prev;
      });
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  /* ── Update cell with auto-ocena ── */
  const updateCell = useCallback((di, si, field, val) => {
    setCells(prev => {
      const key  = `${di}_${si}`;
      const old  = prev[key];
      const upd  = { ...old, [field]: val };
      if (field === 'uwagi' || field === 'termin') {
        const uwagi  = field === 'uwagi'  ? val : old.uwagi;
        const termin = field === 'termin' ? val : old.termin;
        if (!uwagi.trim()) {
          upd.ocena = old.uwagi.trim() ? 'green' : old.ocena;
        } else {
          upd.ocena = computeOcena(uwagi, termin);
        }
      }
      return { ...prev, [key]: upd };
    });
  }, []);

  const updateStatsNote = useCallback((key, val) => {
    setStatsNotes(prev => ({ ...prev, [key]: val }));
  }, []);

  const clearMonth = () => { setCells(initCells()); setDyzurny(''); setStatsNotes({}); setConfirmClear(false); };
  const prevMonth  = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth  = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

  return (
    <div className="k-root">

      {/* ═══ HEADER ═══ */}
      <header className="k-header">
        <div className="k-title-block">
          <span className="k-sup">Tablica</span>
          <span className="k-title">Kamishibai</span>
        </div>

        <div className="k-divider" />

        <div className="k-month-nav">
          <button className="k-nav-btn" onClick={prevMonth}>‹</button>
          <span className="k-month-label">{MONTHS[month].toUpperCase()} {year}</span>
          <button className="k-nav-btn" onClick={nextMonth}>›</button>
        </div>

        <div className="k-spacer" />

        <div className="k-legend">
          {[['#22c55e','OK'],['#eab308','Uwaga'],['#ef4444','Problem']].map(([c,l]) => (
            <div key={l} className="k-legend-item">
              <span className="k-legend-dot" style={{ background:c }} />
              <span className="k-legend-text">{l}</span>
            </div>
          ))}
        </div>

        {/* ── Stats button ── */}
        <button className="k-btn k-btn-stats" onClick={() => setShowStats(true)}>
          📊 Statystyki
          {activeIssues > 0 && (
            <span className="stats-badge">{activeIssues}</span>
          )}
        </button>

        {/* ── Clear ── */}
        {confirmClear ? (
          <div className="k-confirm">
            <span className="k-confirm-text">Na pewno wyczyścić?</span>
            <button className="k-btn k-btn-danger" onClick={clearMonth}>Tak, wyczyść</button>
            <button className="k-btn k-btn-cancel" onClick={() => setConfirmClear(false)}>Anuluj</button>
          </div>
        ) : (
          <button className="k-btn k-btn-clear" onClick={() => setConfirmClear(true)}>
            🗑 Wyczyść miesiąc
          </button>
        )}
      </header>

      {/* ═══ TABLE ═══ */}
      <div className="k-table-wrap">
        <div className="k-table-center">
          <table className="k-table">
            <colgroup>
              <col className="col-day" />
              <col className="col-sub" />
              <col className="col-area" /><col className="col-area" />
              <col className="col-area" /><col className="col-area" />
              <col className="col-text" /><col className="col-text" />
              <col className="col-kto" />
              <col className="col-oc" />
              <col className="col-tr" />
            </colgroup>
            <thead>
              <tr>
                <th className="th-base" colSpan={2}>Dzień</th>
                {['o1','o2','o3','o4'].map(k => (
                  <th key={k} className="th-area">
                    <AreaHeader value={areaLabels[k]} onChange={v => setAreaLabels(p=>({...p,[k]:v}))} />
                  </th>
                ))}
                <th className="th-base">Uwagi</th>
                <th className="th-base">Działania</th>
                <th className="th-base">Kto</th>
                <th className="th-base">Ocena</th>
                <th className="th-base">Termin</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day,di) => SUBS.map((sub,si) => {
                const cell   = cells[`${di}_${si}`];
                const isLast = si === 2;
                return (
                  <tr key={`${di}-${si}`} className={`tr-data ${si===1?'tr-mid':''} ${isLast?'tr-last':''}`}>
                    {si===0 && <td rowSpan={3} className="td-day">{day}</td>}
                    <td className="td-sub">{sub}</td>
                    {['o1','o2','o3','o4'].map(f => (
                      <td key={f} className="td-area">
                        <Cell value={cell[f]} onChange={v=>updateCell(di,si,f,v)} placeholder="" />
                      </td>
                    ))}
                    <td className="td-data">
                      <Cell value={cell.uwagi} onChange={v=>updateCell(di,si,'uwagi',v)} placeholder="Wpisz uwagę..." />
                    </td>
                    <td className="td-data">
                      <Cell value={cell.dzialania} onChange={v=>updateCell(di,si,'dzialania',v)} placeholder="Działania..." />
                    </td>
                    <td className="td-data">
                      <Cell value={cell.kto} onChange={v=>updateCell(di,si,'kto',v)} placeholder="Imię" />
                    </td>
                    <td className="td-ocena">
                      <OcenaDisplay value={cell.ocena} />
                    </td>
                    <td className="td-termin">
                      <TerminPicker value={cell.termin} onChange={v=>updateCell(di,si,'termin',v)} />
                    </td>
                  </tr>
                );
              }))}
              <tr className="tr-dyzurny">
                <td colSpan={2} className="td-dyz-label">Dyżurny</td>
                <td colSpan={4} className="td-dyz-name">
                  <textarea className="dyz-input" value={dyzurny} onChange={e => setDyzurny(e.target.value)}
                    placeholder="Wpisz imię dyżurnego..." rows={1}
                    onFocus={e => e.target.style.background='#fef9c3'}
                    onBlur={e  => e.target.style.background='transparent'} />
                </td>
                <td colSpan={5} className="td-dyz-empty" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ STATS MODAL ═══ */}
      {showStats && (
        <StatsModal
          cells={cells}
          areaLabels={areaLabels}
          statsNotes={statsNotes}
          onNoteChange={updateStatsNote}
          onClose={() => setShowStats(false)}
        />
      )}

      {/* ═══ STYLES ═══ */}
      <style>{`
        .k-root {
          font-size: clamp(0.8125rem, 0.85vw, 1.0625rem);
          font-family: 'Inter', 'Segoe UI', sans-serif;
          background: #f5f0e8;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }

        /* ── Header ── */
        .k-header {
          background: #1e293b; border-bottom: 3px solid #0f172a;
          padding: 0.875rem 1.75rem;
          display: flex; align-items: center; gap: 1rem;
          flex-shrink: 0; flex-wrap: nowrap; justify-content: center;
        }
        .k-header > * { flex-shrink: 0; }
        .k-spacer { flex: 1; max-width: 2rem; }
        .k-title-block { display: flex; flex-direction: column; }
        .k-sup { font-size: 0.625rem; letter-spacing: 0.2em; color: #64748b; text-transform: uppercase; margin-bottom: 0.2rem; }
        .k-title { font-size: clamp(1.25rem, 1.6vw, 2rem); font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase; color: #f1f5f9; line-height: 1; }
        .k-divider { width: 1px; height: 3.5rem; background: #334155; }
        .k-month-nav { display: flex; align-items: center; gap: 0.75rem; }
        .k-nav-btn {
          background: #334155; color: #38bdf8; border: 1px solid #475569;
          border-radius: 0.4rem; width: 2.5rem; height: 2.5rem;
          font-size: 1.375rem; font-weight: 900; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: background 0.15s;
        }
        .k-nav-btn:hover { background: #475569; }
        .k-month-label { font-size: clamp(1.5rem, 2.2vw, 2.75rem); font-weight: 900; color: #38bdf8; letter-spacing: 0.04em; min-width: 16rem; text-align: center; }
        .k-legend { display: flex; gap: 0.875rem; align-items: center; }
        .k-legend-item { display: flex; align-items: center; gap: 0.3rem; }
        .k-legend-dot { width: 0.7rem; height: 0.7rem; border-radius: 50%; }
        .k-legend-text { font-size: 0.6875rem; color: #94a3b8; font-weight: 500; }
        .k-btn {
          border-radius: 0.375rem; padding: 0.5rem 1rem; font-size: 0.75rem;
          cursor: pointer; font-weight: 600; letter-spacing: 0.03em;
          white-space: nowrap; font-family: inherit; transition: background 0.15s;
        }
        .k-btn-stats {
          background: rgba(56,189,248,0.12); color: #38bdf8;
          border: 1px solid rgba(56,189,248,0.4);
          position: relative; display: flex; align-items: center; gap: 0.4rem;
        }
        .k-btn-stats:hover { background: rgba(56,189,248,0.22); }
        .stats-badge {
          background: #ef4444; color: white; font-size: 0.6rem;
          font-weight: 800; border-radius: 999px;
          padding: 0.05rem 0.4rem; line-height: 1.5; min-width: 1.2rem; text-align: center;
        }
        .k-btn-clear  { background: transparent; color: #f87171; border: 1px solid #7f1d1d; }
        .k-btn-clear:hover { background: rgba(220,38,38,0.15); }
        .k-btn-danger { background: #dc2626; color: white; border: 1px solid #ef4444; }
        .k-btn-cancel { background: transparent; color: #94a3b8; border: 1px solid #475569; }
        .k-confirm { display: flex; gap: 0.5rem; align-items: center; }
        .k-confirm-text { font-size: 0.75rem; color: #fbbf24; font-weight: 600; }

        /* ── Table ── */
        .k-table-wrap { flex: 1; overflow: auto; padding-bottom: 0.75rem; }
        .k-table-center { max-width: 1600px; margin: 0 auto; width: 100%; }
        .k-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .col-day  { width: 2.4rem; } .col-sub  { width: 1.6rem; }
        .col-area { width: 8%; }     .col-text { width: 13%; }
        .col-kto  { width: 7%; }     .col-oc   { width: 5rem; }
        .col-tr   { width: 9rem; }

        .th-base, .th-area {
          background: #1e293b; color: #e2e8f0; font-size: 0.625rem; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 0.5rem 0.375rem; text-align: center;
          font-weight: 600; border-right: 1px solid #334155; border-bottom: 1px solid #334155; white-space: nowrap;
        }
        .th-area { padding: 0.4rem 0.25rem; }
        .area-header { cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 0.15rem; padding: 0.1rem 0; }
        .area-name { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; color: #f1f5f9; }
        .area-edit-hint { font-size: 0.575rem; color: #64748b; }
        .area-input { width: 100%; background: white; color: #1e293b; border: 1px solid #2563eb; border-radius: 3px; padding: 0.15rem 0.35rem; font-size: 0.7rem; font-family: inherit; text-transform: uppercase; text-align: center; }

        .tr-data { background: #f5f0e8; }
        .tr-mid  { background: #ede8dc; }
        .tr-last td { border-bottom: 2px solid #c4b99a; }
        .td-day { background: #1e293b; border-right: 2px solid #334155; border-bottom: 2px solid #c4b99a; writing-mode: vertical-rl; transform: rotate(180deg); text-align: center; color: #94a3b8; font-size: 0.625rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.375rem 0.2rem; vertical-align: middle; }
        .td-sub { background: #e8e2d4; text-align: center; color: #78716c; font-size: 0.625rem; font-weight: 700; border-right: 1px solid #d4c9b0; border-bottom: 1px solid #d4c9b0; vertical-align: middle; padding: 0; }
        .td-area, .td-data { border-right: 1px solid #d4c9b0; border-bottom: 1px solid #d4c9b0; vertical-align: middle; padding: 0; }
        .td-ocena { border-right: 1px solid #d4c9b0; border-bottom: 1px solid #d4c9b0; vertical-align: middle; text-align: center; padding: 0.25rem 0.375rem; }
        .td-termin { border-right: 1px solid #d4c9b0; border-bottom: 1px solid #d4c9b0; vertical-align: middle; padding: 0.15rem 0.25rem; }

        .cell-input { width: 100%; background: transparent; border: none; outline: none; resize: none; font-family: inherit; font-size: 0.8125rem; color: #1e293b; padding: 0.25rem 0.375rem; line-height: 1.4; overflow-y: hidden; min-height: 1.75rem; display: block; }
        .cell-input::placeholder { color: #a8a29e; font-style: italic; }
        .cell-focus { background: #fef9c3 !important; border-radius: 3px; }

        .ocena-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; }
        .ocena-dot { width: 1.5rem; height: 1.5rem; border-radius: 50%; border-width: 2px; border-style: solid; transition: background 0.4s; }
        .ocena-lbl { font-size: 0.6rem; font-weight: 700; }

        /* ── Custom Date Picker ── */
        .tp-root { position: relative; }
        .tp-trigger {
          display: flex; align-items: center; gap: 0.25rem;
          padding: 0.2rem 0.35rem; cursor: pointer; border-radius: 0.25rem;
          min-height: 1.75rem; transition: background 0.15s;
        }
        .tp-trigger:hover { background: #fef9c3; }
        .tp-val { font-size: 0.6875rem; color: #1e293b; flex: 1; white-space: nowrap; }
        .tp-placeholder { font-size: 0.6875rem; color: #a8a29e; font-style: italic; flex: 1; }
        .tp-icon { font-size: 0.75rem; opacity: 0.5; flex-shrink: 0; }
        .tp-x {
          background: none; border: none; cursor: pointer; color: #94a3b8;
          font-size: 1rem; padding: 0 0.1rem; line-height: 1; flex-shrink: 0;
          transition: color 0.15s;
        }
        .tp-x:hover { color: #ef4444; }

        .tp-popup {
          position: absolute; left: 0; top: calc(100% + 4px);
          background: white; border: 1px solid #d4c9b0;
          border-radius: 0.625rem; box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          z-index: 100; width: 17rem; overflow: hidden;
        }

        .tp-mnav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.6rem 0.75rem; background: #f8f7f3;
          border-bottom: 1px solid #e2ddd4;
        }
        .tp-marr {
          background: none; border: 1px solid #d4c9b0; border-radius: 0.3rem;
          width: 1.75rem; height: 1.75rem; cursor: pointer; font-size: 1rem;
          color: #475569; transition: background 0.15s; display: flex; align-items: center; justify-content: center;
        }
        .tp-marr:hover { background: #e8e2d4; }
        .tp-mtitle { font-size: 0.8125rem; font-weight: 700; color: #1e293b; }

        .tp-grid {
          display: grid; grid-template-columns: repeat(7, 1fr);
          gap: 2px; padding: 0.5rem 0.5rem 0.35rem;
        }
        .tp-wday {
          text-align: center; font-size: 0.5625rem; font-weight: 700;
          color: #94a3b8; text-transform: uppercase; padding: 0.15rem 0;
          letter-spacing: 0.05em;
        }
        .tp-day {
          background: none; border: none; cursor: pointer;
          font-size: 0.75rem; color: #1e293b;
          border-radius: 0.3rem; padding: 0.3rem 0;
          text-align: center; transition: background 0.12s, color 0.12s;
          font-family: inherit;
        }
        .tp-day:hover { background: #fef9c3; }
        .tp-today { font-weight: 700; color: #2563eb; }
        .tp-today:not(.tp-sel) { background: #eff6ff; }
        .tp-sel { background: #2563eb !important; color: white !important; font-weight: 700; }

        .tp-time {
          display: flex; align-items: center; gap: 0.4rem;
          padding: 0.5rem 0.75rem;
          background: #f8f7f3; border-top: 1px solid #e2ddd4;
        }
        .tp-time-lbl { font-size: 0.6875rem; color: #64748b; font-weight: 500; flex-shrink: 0; }
        .tp-sel-input {
          border: 1px solid #d4c9b0; border-radius: 0.25rem;
          padding: 0.2rem 0.3rem; font-size: 0.75rem; font-family: inherit;
          color: #1e293b; background: white; cursor: pointer;
          width: 3rem; text-align: center;
        }
        .tp-sel-input:focus { outline: none; border-color: #2563eb; }
        .tp-time-sep { font-weight: 700; color: #475569; font-size: 0.875rem; }

        .tp-actions {
          display: flex; align-items: center; gap: 0.4rem;
          padding: 0.5rem 0.75rem;
          border-top: 1px solid #e2ddd4; background: #f1ede4;
        }
        .tp-act-clear {
          background: none; border: none; cursor: pointer;
          font-size: 0.75rem; color: #2563eb; font-weight: 600;
          font-family: inherit; padding: 0; transition: color 0.15s;
        }
        .tp-act-clear:hover { color: #1d4ed8; }
        .tp-act-today {
          background: none; border: none; cursor: pointer;
          font-size: 0.75rem; color: #2563eb; font-weight: 600;
          font-family: inherit; padding: 0; margin-left: auto; transition: color 0.15s;
        }
        .tp-act-today:hover { color: #1d4ed8; }
        .tp-act-confirm {
          background: #16a34a; color: white; border: none;
          border-radius: 0.375rem; padding: 0.35rem 0.9rem;
          font-size: 0.75rem; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: background 0.15s; margin-left: 0.5rem;
          white-space: nowrap;
        }
        .tp-act-confirm:hover { background: #15803d; }
        .tp-act-confirm:disabled { background: #a8a29e; cursor: not-allowed; }

        .tr-dyzurny { background: #fef3c7; }
        .td-dyz-label { border-top: 3px solid #f59e0b; background: #fde68a; text-align: center; color: #92400e; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.5rem 0.25rem; border-right: 1px solid #d4c9b0; vertical-align: middle; }
        .td-dyz-name { border-top: 3px solid #f59e0b; padding: 0.25rem 0.5rem; border-right: 1px solid #d4c9b0; vertical-align: middle; }
        .td-dyz-empty { border-top: 3px solid #f59e0b; background: #fef3c7; }
        .dyz-input { width: 100%; background: transparent; border: none; outline: none; resize: none; font-family: inherit; font-size: 0.875rem; color: #78350f; font-weight: 700; padding: 0.15rem 0.25rem; line-height: 1.4; }
        .dyz-input::placeholder { color: #b45309; font-style: italic; }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #e8e2d4; }
        ::-webkit-scrollbar-thumb { background: #a8a29e; border-radius: 3px; }

        /* ══════════════════════════════════════════
           STATS MODAL
        ══════════════════════════════════════════ */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15,23,42,0.72);
          display: flex; align-items: flex-start; justify-content: center;
          z-index: 200; padding: 1.5rem;
          overflow-y: auto;
        }
        .modal-box {
          background: #f8f7f3;
          border-radius: 1rem;
          width: 100%; max-width: 1200px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          display: flex; flex-direction: column;
          overflow: hidden;
          margin: auto;
        }
        .modal-hdr {
          background: #1e293b;
          padding: 1rem 1.5rem;
          display: flex; align-items: center; gap: 1rem;
          flex-shrink: 0;
        }
        .modal-title-block { display: flex; flex-direction: column; margin-right: 0.5rem; }
        .modal-pretitle { font-size: 0.625rem; letter-spacing: 0.2em; color: #64748b; text-transform: uppercase; }
        .modal-title { font-size: 1.125rem; font-weight: 800; color: #f1f5f9; letter-spacing: 0.02em; }
        .modal-summary { display: flex; gap: 0.75rem; align-items: center; flex: 1; flex-wrap: wrap; }
        .modal-stat-pill {
          display: flex; align-items: center; gap: 0.4rem;
          border: 1px solid; border-radius: 999px; padding: 0.25rem 0.75rem;
        }
        .modal-stat-dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; }
        .modal-stat-count { font-size: 1rem; font-weight: 900; }
        .modal-stat-label { font-size: 0.6875rem; color: #cbd5e1; }
        .modal-total { font-size: 0.75rem; color: #64748b; margin-left: 0.5rem; }
        .modal-total b { color: #94a3b8; }
        .modal-close { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #94a3b8; border-radius: 0.375rem; padding: 0.4rem 0.75rem; font-size: 0.875rem; cursor: pointer; margin-left: auto; transition: background 0.15s; }
        .modal-close:hover { background: rgba(220,38,38,0.3); color: white; }

        .modal-filters {
          background: #f1ede4;
          padding: 0.75rem 1.5rem;
          display: flex; gap: 1.5rem; align-items: center;
          border-bottom: 1px solid #e2ddd4;
          flex-wrap: wrap;
        }
        .filter-group { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .filter-label { font-size: 0.6875rem; color: #78716c; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .filter-btn {
          background: white; border: 1px solid #d4c9b0; border-radius: 999px;
          padding: 0.25rem 0.75rem; font-size: 0.6875rem; cursor: pointer;
          color: #57534e; font-family: inherit; font-weight: 500; transition: all 0.15s;
        }
        .filter-btn:hover { background: #e8e2d4; }
        .filter-active { font-weight: 700; }

        .modal-table-wrap { overflow: auto; flex: 1; padding: 0.75rem 1.5rem; }
        .modal-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .modal-table thead th {
          background: #1e293b; color: #94a3b8; font-size: 0.625rem;
          letter-spacing: 0.1em; text-transform: uppercase; padding: 0.5rem 0.75rem;
          text-align: left; font-weight: 600;
          border-right: 1px solid #334155; border-bottom: 2px solid #0f172a;
          white-space: nowrap;
        }
        .th-sub { font-size: 0.5625rem; color: #475569; font-weight: 400; letter-spacing: 0; text-transform: none; display: block; }
        .srow { border-bottom: 1px solid #e2ddd4; transition: background 0.15s; }
        .srow:hover { background: #f1ede4; }
        .srow-red    { border-left: 3px solid #ef4444; }
        .srow-yellow { border-left: 3px solid #eab308; }
        .srow-green  { border-left: 3px solid #22c55e; }
        .srow td { padding: 0.5rem 0.75rem; vertical-align: top; }

        .s-status { text-align: center; }
        .s-dot { width: 1.25rem; height: 1.25rem; border-radius: 50%; border: 2px solid; display: inline-block; margin-bottom: 0.2rem; }
        .s-status-lbl { display: block; font-size: 0.6rem; font-weight: 700; }
        .s-day { white-space: nowrap; }
        .s-dayname { display: block; font-size: 0.75rem; font-weight: 600; color: #1e293b; }
        .s-sub { display: inline-block; background: #e8e2d4; color: #78716c; font-size: 0.6rem; font-weight: 700; border-radius: 3px; padding: 0.1rem 0.35rem; margin-top: 0.2rem; }
        .s-obszary { display: flex; flex-direction: column; gap: 0.3rem; }
        .s-obszar-item { display: flex; flex-direction: column; }
        .s-obszar-lbl { font-size: 0.6rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .s-obszar-val { font-size: 0.75rem; color: #1e293b; }
        .s-empty { color: #a8a29e; font-style: italic; }
        .s-problem-text { display: block; font-size: 0.8125rem; color: #1e293b; font-weight: 500; line-height: 1.4; }
        .s-dzialania-ref { display: block; font-size: 0.6875rem; color: #64748b; margin-top: 0.3rem; font-style: italic; }
        .s-kto { font-size: 0.75rem; color: #475569; }
        .s-termin { font-size: 0.6875rem; color: #475569; white-space: nowrap; }
        .s-overdue { display: block; font-size: 0.6rem; font-weight: 700; color: #ef4444; margin-bottom: 0.2rem; }
        .s-termin-red { color: #dc2626; font-weight: 600; }
        .s-note-td { padding: 0.375rem 0.5rem !important; }
        .s-note-input {
          width: 100%; background: white; border: 1px solid #d4c9b0;
          border-radius: 0.375rem; padding: 0.4rem 0.5rem;
          font-family: inherit; font-size: 0.8125rem; color: #1e293b;
          resize: none; line-height: 1.4; min-height: 2.5rem;
          transition: border-color 0.15s;
        }
        .s-note-input:focus { outline: none; border-color: #3b82f6; background: #eff6ff; }
        .s-note-input::placeholder { color: #a8a29e; font-style: italic; }

        .modal-empty { padding: 3rem; text-align: center; color: #78716c; font-size: 1rem; }
        .modal-footer {
          padding: 0.75rem 1.5rem;
          background: #f1ede4;
          border-top: 1px solid #e2ddd4;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .modal-footer-note { font-size: 0.6875rem; color: #78716c; }

        input:focus, textarea:focus { outline: 2px solid #3b82f6 !important; }
        @media (min-width: 2560px) { .k-root { font-size: clamp(1rem, 0.7vw, 1.1875rem); } }
        @media (min-width: 3200px) { .k-root { font-size: clamp(1.0625rem, 0.65vw, 1.25rem); } }
      `}</style>
    </div>
  );
}
