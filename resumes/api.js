// Shared by the hub and the editor. Login uses the same Netlify Identity
// account as the copy editor at /admin.

const ID = () => window.netlifyIdentity;
let cachedToken = "";

export function whenReady() {
  // The widget initializes itself on page load. Wait for that, with a
  // fallback in case it already finished before we started listening.
  return new Promise((resolve) => {
    const id = ID();
    if (!id) return resolve(null);
    let done = false;
    const finish = (u) => { if (!done) { done = true; resolve(u || null); } };
    id.on("init", finish);
    setTimeout(() => finish(id.currentUser()), 2500);
  });
}

export async function token() {
  const user = ID()?.currentUser();
  if (!user) return "";
  cachedToken = await user.jwt(); // refreshes when expired
  return cachedToken;
}
export const lastToken = () => cachedToken;

export async function api(path, { method = "GET", body } = {}) {
  const t = await token();
  const res = await fetch(path, {
    method,
    headers: { authorization: `Bearer ${t}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { showGate(); throw new Error(data.error || "Please log in again."); }
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export function showGate() {
  document.querySelector("#app").innerHTML = `
    <div class="gate">
      <h1>Your resumes</h1>
      <p>Log in with the same email and password you use to edit the site.</p>
      <button class="rbtn solid" id="login">Log in</button>
    </div>`;
  document.querySelector("#login").onclick = () => ID().open("login");
}

export function onLogin(fn) {
  ID()?.on("login", () => { ID().close(); fn(); });
  ID()?.on("logout", () => showGate());
}

let toastTimer;
export function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.append(el); }
  el.textContent = msg; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

export const linkFor = (slug) => `${location.origin}/r/${slug}`;

export async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("Link copied"); }
  catch { prompt("Copy this link", text); }
}

export const when = (iso) => {
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return ""; }
};
