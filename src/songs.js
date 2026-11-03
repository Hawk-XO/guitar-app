// Song library: songs committed to the repo's songs/ folder (listed in songs/index.json)
// plus songs imported in this browser (saved in localStorage).

const KEY = 'fc.songs';

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLocal(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'song';

export async function loadLibrary() {
  const repo = [];
  try {
    const res = await fetch('songs/index.json', { cache: 'no-cache' });
    if (res.ok) {
      const names = await res.json();
      for (const name of names) {
        try {
          const r = await fetch(`songs/${name}`, { cache: 'no-cache' });
          if (r.ok) repo.push({ ...(await r.json()), id: `repo:${name}`, origin: 'repo' });
        } catch {}
      }
    }
  } catch {}
  const local = readLocal().map((s) => ({ ...s, origin: 'local' }));
  return [...repo, ...local];
}

export function saveLocal(song) {
  const list = readLocal();
  const id = `local:${slug(song.title)}-${Date.now().toString(36)}`;
  list.push({ ...song, id });
  return writeLocal(list) ? id : null;
}

export function removeLocal(id) {
  writeLocal(readLocal().filter((s) => s.id !== id));
}

export function downloadSong(song) {
  const { id, origin, ...data } = song;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slug(song.title)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
