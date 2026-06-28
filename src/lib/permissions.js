import React from "react";

// ─── Access roles (login-level permissions, distinct from job title) ───
export const ACCESS_ROLES = [
  { id: "owner", label: "ម្ចាស់ · Owner", desc: "សិទ្ធិ​ពេញ — រួម​ការ​លុប, Settings, របាយការណ៍" },
  { id: "manager", label: "អ្នកគ្រប់គ្រង · Manager", desc: "គ្រប់​គ្រង​ការងារ, លុប, ការ​ទូទាត់, របាយការណ៍ — តែ​មិន​ប៉ះ Settings" },
  { id: "cashier", label: "បេឡា · Cashier", desc: "ទទួល​ការ​ទូទាត់, បង្កើត​វិក្កយបត្រ, អតិថិជន" },
  { id: "mechanic", label: "ជាង · Mechanic", desc: "ការងារ Job/DVI, ស្តុក — មិន​ឃើញ​ការ​ទូទាត់ ឬ​លុប" },
];
export const ROLE_LABEL = Object.fromEntries(ACCESS_ROLES.map(r => [r.id, r.label]));

// Permission matrix.  "*" = everything.
const MATRIX = {
  owner: ["*"],
  manager: ["delete", "payments", "billing", "inventory", "reports", "jobs", "customers", "audit", "expenses"],
  cashier: ["payments", "billing", "customers", "jobs", "reports"],
  mechanic: ["jobs", "customers", "inventory"],
};

// can(role, perm) → boolean.  Unknown role falls back to owner (never lock anyone out).
export function can(role, perm) {
  const list = MATRIX[role] || MATRIX.owner;
  return list.includes("*") || list.includes(perm);
}

// Resolve the access role for a logged-in user from the staff list (matched by email).
// No match → "owner" so the workspace owner / first account is never locked out.
export function resolveRole(staff, email) {
  if (!email) return "owner";
  const e = email.trim().toLowerCase();
  const m = (staff || []).find(s => (s.email || "").trim().toLowerCase() === e && s.accessRole);
  return m ? m.accessRole : "owner";
}

export const RoleContext = React.createContext("owner");
export function useRole() { return React.useContext(RoleContext); }
export function useCan(perm) { return can(React.useContext(RoleContext), perm); }

// Render children only when the current role has the permission.
export function IfCan({ perm, children }) {
  return can(React.useContext(RoleContext), perm) ? children : null;
}
