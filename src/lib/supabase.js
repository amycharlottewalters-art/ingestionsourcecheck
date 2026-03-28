export function makeSupabase(url, key) {
  const headers = {
    "apikey": key,
    "Authorization": "Bearer " + key,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  async function get(path) {
    const r = await fetch(url + path, { headers });
    if (!r.ok) throw new Error("Supabase GET " + path + " => " + r.status + ": " + (await r.text()));
    return r.json();
  }

  async function post(path, body) {
    const r = await fetch(url + path, {
      method: "POST",
      headers: { ...headers, "Prefer": "return=representation" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error("Supabase POST " + path + " => " + r.status + ": " + (await r.text()));
    return r.json();
  }

  async function patch(path, body) {
    const r = await fetch(url + path, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error("Supabase PATCH " + path + " => " + r.status + ": " + (await r.text()));
    return r.status === 204 ? null : r.json().catch(() => null);
  }

  return { get, post, patch };
}
