const KEY = "suiticket.recentEvents";

export function loadRecentEvents(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => typeof x === "string").slice(0, 10);
  } catch {
    return [];
  }
}

export function pushRecentEvent(id: string) {
  const clean = id.trim();
  if (!clean) return;
  const cur = loadRecentEvents();
  const next = [clean, ...cur.filter((x) => x !== clean)].slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function removeRecentEvent(id: string) {
  const cur = loadRecentEvents();
  const next = cur.filter((x) => x !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
}
