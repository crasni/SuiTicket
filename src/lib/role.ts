export type AppRole = "buyer" | "organizer" | "staff";

const KEY = "suiticket.role";
const EVT = "__suiticket_role_change";

export function getRole(): AppRole | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(KEY);
    if (v === "buyer" || v === "organizer" || v === "staff") return v;
    return null;
  } catch {
    return null;
  }
}

export function setRole(role: AppRole | null) {
  if (typeof window === "undefined") return;
  try {
    if (!role) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, role);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVT));
}

export function clearRole() {
  setRole(null);
}

export function roleEventName() {
  return EVT;
}

export function defaultPathForRole(role: AppRole) {
  // Unified home base for all roles.
  // From here, users can navigate to role-specific pages.
  void role;
  return "/dashboard";
}
