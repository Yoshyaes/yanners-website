// Uses the same Netlify Identity login Ayanna has for the copy editor.
// The browser sends her login token. We confirm it by asking this site's own
// Identity service who the token belongs to. Invite-only registration means
// only people Fred invited can ever get a valid token.

let override = null;
export function useTestAuth(fn) { override = fn; } // local tests only

export async function requireUser(req) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  if (override) return override(token);
  try {
    const origin = new URL(req.url).origin;
    const res = await fetch(`${origin}/.netlify/identity/user`, {
      headers: { authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user && user.email ? user : null;
  } catch {
    return null;
  }
}
