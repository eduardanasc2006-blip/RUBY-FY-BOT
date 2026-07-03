const BASE = 'https://economy.roblox.com';
const THUMB = 'https://thumbnails.roblox.com';

export async function getUserRobux(userId) {
  try {
    const r = await fetch(`${BASE}/v1/users/${userId}/currency`, { headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    const d = await r.json();
    return d.robux ?? null;
  } catch { return null; }
}

export async function getGamepass(id) {
  try {
    const r = await fetch(`${BASE}/v2/game-passes/${id}/game-pass-product-info`, { headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    const d = await r.json();
    let thumb = null;
    try {
      const tr = await fetch(`${THUMB}/v1/game-passes?gamePassIds=${id}&size=150x150&format=Png`, { headers: { Accept: 'application/json' } });
      if (tr.ok) { const td = await tr.json(); thumb = td.data?.[0]?.imageUrl ?? null; }
    } catch {}
    return { name: d.Name, price: d.PriceInRobux ?? null, forSale: d.IsForSale ?? false, sales: d.Sales ?? 0, creator: d.Creator?.Name ?? '?', thumb };
  } catch { return null; }
}

export async function searchUser(username) {
  try {
    const r = await fetch(`https://users.roblox.com/v1/usernames/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.data?.[0] ?? null;
  } catch { return null; }
}

export function robuxParaBrl(robux, taxa) {
  return ((robux / 1000) * taxa).toFixed(2);
}
