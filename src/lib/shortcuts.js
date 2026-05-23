// ─── Keyboard shortcuts registry + helpers ───
// Used by App.jsx to wire global hotkeys and by the cheatsheet modal
// to render the categorized list.

import React from 'react';

export const SHORTCUTS = [
  { group: "ទូទៅ · GENERAL", items: [
    { keys: ["⌘", "K"], desc: "បើក Search" },
    { keys: ["⌘", "/"], desc: "បង្ហាញ Shortcuts" },
    { keys: ["Esc"], desc: "បិទ Modal / Drawer" },
  ]},
  { group: "ឆ្លង · NAVIGATE", items: [
    { keys: ["g", "d"], desc: "Dashboard" },
    { keys: ["g", "c"], desc: "Customers" },
    { keys: ["g", "j"], desc: "Jobs" },
    { keys: ["g", "p"], desc: "Parts" },
    { keys: ["g", "q"], desc: "Quotation" },
    { keys: ["g", "i"], desc: "Invoices" },
    { keys: ["g", "b"], desc: "Booking" },
    { keys: ["g", "r"], desc: "Reports" },
    { keys: ["g", "m"], desc: "Members" },
    { keys: ["g", "s"], desc: "Settings" },
  ]},
  { group: "សកម្មភាព · ACTIONS", items: [
    { keys: ["n"], desc: "​បង្កើត​ថ្មី​ (តាម screen ​បច្ចុប្បន្ន)" },
    { keys: ["⌘", "."], desc: "​ប្ដូរ​ Dark / Light theme" },
  ]},
];

export const NAV_MAP = {
  d: "dashboard", c: "customers", j: "jobs", p: "parts",
  q: "quotation", i: "invoices", b: "booking", r: "reports",
  m: "members", s: "settings",
};

// Heuristic: should we ignore a keypress because the user is typing?
export function isTyping(e) {
  const t = e.target;
  if (!t) return false;
  const tag = (t.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (t.isContentEditable) return true;
  return false;
}

/**
 * Hook that installs global shortcut handlers.
 * @param {object} handlers - { onSearch, onHelp, onNav, onNew, onToggleTheme }
 */
export function useShortcuts(handlers) {
  const pendingGRef = React.useRef(null);

  React.useEffect(() => {
    function handler(e) {
      // Cmd/Ctrl + K → Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handlers.onSearch && handlers.onSearch();
        return;
      }
      // Cmd/Ctrl + / → Help
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        handlers.onHelp && handlers.onHelp();
        return;
      }
      // Cmd/Ctrl + . → toggle theme
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        handlers.onToggleTheme && handlers.onToggleTheme();
        return;
      }
      // Plain ? (no modifier) → Help (when not typing)
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !isTyping(e)) {
        e.preventDefault();
        handlers.onHelp && handlers.onHelp();
        return;
      }
      if (isTyping(e)) return;

      // Sequence: g then letter
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        pendingGRef.current = setTimeout(() => { pendingGRef.current = null; }, 1500);
        return;
      }
      if (pendingGRef.current && NAV_MAP[e.key]) {
        clearTimeout(pendingGRef.current);
        pendingGRef.current = null;
        e.preventDefault();
        handlers.onNav && handlers.onNav(NAV_MAP[e.key]);
        return;
      }
      // n → new
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handlers.onNew && handlers.onNew();
        return;
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handlers]);
}
