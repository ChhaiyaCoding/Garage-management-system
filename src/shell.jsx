import React from 'react';
import { Icon } from './icons';
import { useInstallPrompt } from './lib/installPrompt';
import { searchAll, TYPE_LABELS } from './lib/search';
import { loadRecents, saveRecent, clearRecents } from './lib/recents';

// ── Global Search dropdown ──
function GlobalSearch({ state, onNavigate }) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [recents, setRecents] = React.useState(() => loadRecents());
  const inputRef = React.useRef(null);

  const liveResults = React.useMemo(() => state ? searchAll(state, q, 24) : [], [state, q]);
  // When query is empty, surface recents instead. Re-validate against state
  // so deleted entities don't appear as stale picks.
  const recentResults = React.useMemo(() => {
    if (!state) return [];
    return recents.filter(r => {
      const list = state[
        r.type === "customer" ? "customers" :
        r.type === "vehicle" ? "vehicles" :
        r.type === "job" ? "jobs" :
        r.type === "part" ? "parts" :
        r.type === "invoice" ? "invoices" :
        r.type === "quote" ? "quotations" :
        r.type === "booking" ? "bookings" :
        r.type === "member" ? "members" : null
      ] || [];
      return list.some(x => x.id === r.id);
    });
  }, [recents, state]);
  const results = q.trim() ? liveResults : recentResults;
  const showingRecents = !q.trim() && recentResults.length > 0;

  // Keyboard shortcut: Cmd/Ctrl + K
  React.useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current && inputRef.current.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  React.useEffect(() => { setActive(0); }, [q]);

  function go(r) {
    onNavigate && onNavigate(r);
    setRecents(saveRecent(r));
    setOpen(false);
    setQ("");
  }
  function onClearRecents(e) {
    e.stopPropagation();
    setRecents(clearRecents());
  }

  function onKeyDown(e) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(results.length - 1, a + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active]); }
  }

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 560 }}>
      <div className="search-input" style={{ width: '100%' }}>
        <Icon.Search size={16} />
        <input
          ref={inputRef}
          placeholder="ស្វែងរក​អ្វី​ក៏​បាន · ⌘K"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {q && <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', paddingRight: 6 }}>{results.length}</span>}
      </div>

      {open && (q || showingRecents) && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }}></div>
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10, padding: 6, maxHeight: 480, overflowY: 'auto', zIndex: 50, boxShadow: 'var(--shadow-lg)' }}>
            {showingRecents && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px 6px' }}>
                <div className="mono" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-3)' }}>RECENT</div>
                <button className="btn btn-sm btn-ghost" style={{ fontSize: 10, padding: '2px 8px' }} onClick={onClearRecents}>Clear</button>
              </div>
            )}
            {q && results.length === 0 && (
              <div className="empty" style={{ padding: 18, fontSize: 12 }}>គ្មាន​លទ្ធផល​ "{q}"</div>
            )}
            {results.map((r, i) => {
              const IconComp = Icon[r.icon] || Icon.Search;
              const isActive = i === active;
              return (
                <div
                  key={r.type + "-" + r.id}
                  onClick={() => go(r)}
                  onMouseEnter={() => setActive(i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', background: isActive ? 'var(--bg-2)' : 'transparent' }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', color: 'var(--accent-text)', flexShrink: 0 }}>
                    {r.color && r.initials ? (
                      <div style={{ width: 22, height: 22, borderRadius: 4, background: r.color, color: '#0b0b0b', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>{r.initials}</div>
                    ) : (
                      <IconComp size={14} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.meta}</div>
                  </div>
                  <span className="mono" style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{TYPE_LABELS[r.type] || r.type}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
// ─── App Shell: Sidebar + Topbar + Toast helpers ───

const NAV_CORE = [
  { id: "dashboard", icon: "Dashboard", label: "Dashboard", labelKm: "ផ្ទាំងគ្រប់គ្រង" },
  { id: "customers", icon: "Users", label: "Customers & Vehicles", labelKm: "អតិថិជន & រថយន្ត" },
  { id: "jobs", icon: "Wrench", label: "Job Card", labelKm: "Job Card", badge: 8 },
  { id: "parts", icon: "Box", label: "Parts Inventory", labelKm: "ស្តុក Parts" },
  { id: "quotation", icon: "Calc", label: "Quotation", labelKm: "តម្លៃប៉ាន់ស្មាន" },
  { id: "invoices", icon: "Doc", label: "Invoices", labelKm: "វិក្កយបត្រ" },
  { id: "booking", icon: "Cal", label: "Online Booking", labelKm: "ការកក់ Online" },
  { id: "dvi", icon: "Clip", label: "DVI Inspection", labelKm: "ត្រួតពិនិត្យ DVI" },
];

const NAV_GROW = [
  { id: "members", icon: "Star", label: "Members", labelKm: "សមាជិក" },
  { id: "reports", icon: "Chart", label: "Reports / BI", labelKm: "របាយការណ៍" },
  { id: "settings", icon: "Cog", label: "Settings", labelKm: "ការកំណត់" },
];

function Sidebar({ active, onNav }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">G</div>
        <div className="brand-text">
          <div className="brand-name">GARAGE OS</div>
          <div className="brand-sub">GMS · KH EDITION</div>
        </div>
      </div>

      <div>
        <div className="nav-section-title">សំខាន់ · Core</div>
        <div className="nav-list">
          {NAV_CORE.map((item) => (
            <div
              key={item.id}
              className={"nav-item" + (active === item.id ? " active" : "")}
              onClick={() => onNav(item.id)}
            >
              <span className="nav-icon">{React.createElement(Icon[item.icon])}</span>
              <span className="nav-label">{item.labelKm}</span>
              {item.badge ? <span className="nav-meta">{item.badge}</span> : null}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="nav-section-title">លូតលាស់ · Grow</div>
        <div className="nav-list">
          {NAV_GROW.map((item) => (
            <div
              key={item.id}
              className={"nav-item" + (active === item.id ? " active" : "")}
              onClick={() => onNav(item.id)}
            >
              <span className="nav-icon">{React.createElement(Icon[item.icon])}</span>
              <span className="nav-label">{item.labelKm}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="plan-card">
        <div className="plan-name">CURRENT · PRO</div>
        <div style={{ marginTop: 6, color: "var(--text-1)" }}>មានសិទ្ធិពេញ · ៣ សាខា</div>
        <div style={{ marginTop: 8, color: "var(--text-3)", fontSize: 11 }}>v2.4.1 · 2026.05</div>
      </div>
    </aside>
  );
}

// Derive notifications from current state — no separate Supabase table needed
function deriveNotifications(state) {
  if (!state) return [];
  const notifs = [];
  const today = new Date().toISOString().slice(0, 10);
  // Low stock parts
  (state.parts || []).forEach(p => {
    if ((p.stock || 0) <= (p.reorder || 0) && (p.stock || 0) > 0) {
      notifs.push({ id: `lowstock-${p.id}`, kind: 'lowstock', icon: '⚠️', title: `${p.name} ស្ទើរ​អស់`, sub: `សល់ ${p.stock} (reorder ≤ ${p.reorder})`, route: 'parts' });
    } else if ((p.stock || 0) === 0) {
      notifs.push({ id: `outstock-${p.id}`, kind: 'outstock', icon: '❌', title: `${p.name} អស់​ស្តុក`, sub: `SKU ${p.sku}`, route: 'parts' });
    }
  });
  // Due/overdue invoices
  (state.invoices || []).forEach(inv => {
    if (inv.status === 'overdue') {
      notifs.push({ id: `overdue-${inv.id}`, kind: 'overdue', icon: '🔴', title: `Invoice ${inv.id} ហួស​ការ​បង់`, sub: `$${(inv.total || 0).toFixed(2)}`, route: 'invoices' });
    }
  });
  // Today's bookings
  (state.bookings || []).forEach(b => {
    if (b.date === today && b.status !== 'in-progress' && b.status !== 'done') {
      notifs.push({ id: `booking-${b.id}`, kind: 'booking', icon: '📅', title: `ការ​កក់​ថ្ងៃ​នេះ`, sub: `${b.time} · ${b.service}`, route: 'booking' });
    }
  });
  // Vehicle service due (mileage-based or date — only show if nextService is set and not "—")
  (state.vehicles || []).forEach(v => {
    if (v.nextService && v.nextService !== '—' && v.nextService <= today) {
      notifs.push({ id: `service-${v.id}`, kind: 'service', icon: '🔧', title: `${v.plate} ត្រូវ​ការ Service`, sub: `Due ${v.nextService}`, route: 'customers' });
    }
  });
  return notifs;
}

function Topbar({ search, setSearch, onOpenTweaks, currency, setCurrency, userEmail, onSignOut, saveStatus, theme, onToggleTheme, state, onNavigate }) {
  const notifications = React.useMemo(() => deriveNotifications(state), [state]);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { canInstall, isStandalone, promptInstall } = useInstallPrompt();
  const localName = userEmail ? userEmail.split("@")[0] : "លោក សុខ ភារុណ";
  const initials = (userEmail ? userEmail.slice(0, 2) : "SP").toUpperCase();
  const saveLabel = saveStatus === "saving" ? "កំពុងរក្សាទុក..." : saveStatus === "saved" ? "បានរក្សាទុក ✓" : saveStatus === "queued" ? "រង់ចាំ online ⏳" : saveStatus === "error" ? "បរាជ័យ ⚠" : null;
  return (
    <header className="topbar">
      <div className="branch-pill">
        សាខាមេ · ភ្នំពេញ <Icon.Down size={14} />
      </div>
      {onNavigate ? (
        <GlobalSearch state={state} onNavigate={onNavigate} />
      ) : (
        <div className="search-input">
          <Icon.Search size={16} />
          <input
            placeholder="ស្វែងរក អតិថិជន · រថយន្ត · Job · Parts ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}
      <div className="topbar-actions">
        {saveLabel && (
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: saveStatus === "error" ? 'var(--danger)' : saveStatus === "queued" ? 'var(--warn)' : saveStatus === "saving" ? 'var(--text-2)' : 'var(--success)' }}>{saveLabel}</span>
        )}
        {canInstall && !isStandalone && (
          <button className="btn btn-sm btn-primary" onClick={promptInstall} title="ដំឡើង Garage OS ​ជា App">
            <Icon.Down size={14} /> ដំឡើង​ជា App
          </button>
        )}
        <div style={{ position: 'relative' }}>
          <button className="icon-btn" title="Notifications" onClick={() => setNotifOpen(o => !o)}>
            <Icon.Bell size={16} />
            {notifications.length > 0 && <span className="badge">{notifications.length > 99 ? '99+' : notifications.length}</span>}
          </button>
          {notifOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setNotifOpen(false)} />
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340, maxHeight: 480, overflowY: 'auto', background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 50 }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Notifications</div>
                  <span className="muted" style={{ fontSize: 11 }}>{notifications.length} ​ថ្មី</span>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-2)' }}>គ្មាន​សារ​ថ្មី 🎉</div>
                ) : notifications.map(n => (
                  <button key={n.id} onClick={() => { onNavigate && onNavigate(n.route); setNotifOpen(false); }}
                    style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border-0)', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 18, lineHeight: 1 }}>{n.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{n.title}</div>
                      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{n.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {onToggleTheme && (
          <button className="icon-btn" onClick={onToggleTheme} title={theme === "light" ? "ប្ដូរ​ទៅ Dark mode" : "ប្ដូរ​ទៅ Light mode"}>
            {theme === "light" ? <Icon.Moon size={16} /> : <Icon.Sun size={16} />}
          </button>
        )}
        <button className="icon-btn" onClick={onOpenTweaks} title="Tweaks">
          <Icon.Cog size={16} />
        </button>
        <div className="user-chip" style={{ position: 'relative', cursor: onSignOut ? 'pointer' : 'default' }} onClick={() => onSignOut && setMenuOpen(v => !v)}>
          <div className="avatar av-sm" style={{ background: "#22c55e" }}>{initials}</div>
          <div>
            <div className="name">{localName}</div>
            <div className="role">{userEmail ? "Signed in" : "Owner"}</div>
          </div>
          {onSignOut && menuOpen && (
            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 8, padding: 6, minWidth: 180, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-2)', borderBottom: '1px solid var(--border-0)', fontFamily: 'var(--font-mono)' }}>{userEmail}</div>
              <button className="btn btn-sm" style={{ width: '100%', justifyContent: 'flex-start', marginTop: 6, background: 'transparent', border: 'none' }} onClick={() => { setMenuOpen(false); onSignOut(); }}>
                <Icon.X size={12} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// Toast system
function useToasts() {
  const [toasts, setToasts] = React.useState([]);
  const push = React.useCallback((msg, kind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const view = (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={"toast " + (t.kind || "")}>{t.msg}</div>
      ))}
    </div>
  );
  return { push, view };
}

// Modal
function Modal({ title, onClose, children, footer, wide }) {
  React.useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={wide ? { maxWidth: 980 } : null} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="modal-title">{title}</h3>
          <button className="icon-btn" onClick={onClose}><Icon.X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

// Drawer (for job details, customer details)
function Drawer({ onClose, children, width }) {
  React.useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}></div>
      <div className="drawer" style={width ? { width } : null}>{children}</div>
    </>
  );
}

export { Sidebar, Topbar, useToasts, Modal, Drawer, NAV_CORE, NAV_GROW };
