import { whenReady, api, showGate, onLogin, toast, linkFor, copy, when } from "/resumes/api.js";
import { esc } from "/resumes/render.mjs";

const app = document.querySelector("#app");
let resumes = [];

function frame(inner) {
  app.innerHTML = `
  <div class="rbar"><div class="in">
    <a class="me" href="/">Ayanna Redwood-Crawford</a>
    <div class="acts">
      <a class="rlink" href="/admin/">Edit site copy</a>
      <button class="rbtn ghost" id="logout">Log out</button>
      <button class="rbtn solid" id="new">+ New resume</button>
    </div>
  </div></div>
  <main class="hub">
    <div class="kicker">Resume hub</div>
    <h1>Your resumes</h1>
    <p class="intro">Make a copy for each job, tailor it, then turn its link on and send it. Employers can read it online or download a PDF. The site's Resume button always shows your Main resume.</p>
    ${inner}
  </main>`;
  document.querySelector("#logout").onclick = () => window.netlifyIdentity.logout();
  document.querySelector("#new").onclick = () => create({});
}

function card(r) {
  const url = linkFor(r.slug);
  return `<div class="card" data-id="${esc(r.id)}">
    <div class="pills">
      ${r.primary ? `<span class="pill main">Main</span>` : ""}
      <span class="pill ${r.published ? "on" : ""}">${r.published ? "Link on" : "Link off"}</span>
    </div>
    <h3>${esc(r.label)}</h3>
    <div class="url">${esc(url)}</div>
    <div class="when">Edited ${esc(when(r.updatedAt))}</div>
    <div class="cacts">
      <a class="rbtn solid" href="/resumes/edit.html?id=${encodeURIComponent(r.id)}">Edit</a>
      ${r.published ? `<button class="rbtn" data-act="copy">Copy link</button>` : ""}
      <button class="rbtn" data-act="dup">Duplicate</button>
      ${r.primary ? "" : `<button class="rbtn" data-act="toggle">${r.published ? "Turn link off" : "Turn link on"}</button>`}
      ${r.primary ? "" : `<button class="rbtn" data-act="main">Make Main</button>`}
      ${r.primary ? "" : `<button class="rbtn danger" data-act="delete">Delete</button>`}
    </div>
  </div>`;
}

function render() {
  frame(`<div class="cards">${resumes.map(card).join("")}</div>`);
}

async function load() {
  try {
    const { resumes: list } = await api("/api/resumes");
    resumes = list.sort((a, b) => (b.primary - a.primary) || b.updatedAt.localeCompare(a.updatedAt));
    render();
  } catch (e) { if (e.message !== "Please log in again.") toast(e.message); }
}

async function create(body) {
  try {
    const r = await api("/api/resumes", { method: "POST", body });
    location.href = `/resumes/edit.html?id=${encodeURIComponent(r.id)}`;
  } catch (e) { toast(e.message); }
}

app.addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.closest(".card")?.dataset.id;
  const r = resumes.find((x) => x.id === id);
  if (!r) return;
  const act = btn.dataset.act;
  try {
    if (act === "copy") return copy(linkFor(r.slug));
    if (act === "dup") return create({ duplicateOf: r.id });
    if (act === "toggle") { await api(`/api/resumes/${id}`, { method: "PATCH", body: { published: !r.published } }); toast(r.published ? "Link turned off" : "Link turned on"); }
    if (act === "main") { await api(`/api/resumes/${id}`, { method: "PATCH", body: { primary: true } }); toast(`"${r.label}" is now Main`); }
    if (act === "delete") {
      if (!btn.classList.contains("confirm")) {
        btn.classList.add("confirm"); btn.textContent = "Delete for good?";
        setTimeout(() => { btn.classList.remove("confirm"); btn.textContent = "Delete"; }, 4000);
        return;
      }
      await api(`/api/resumes/${id}`, { method: "DELETE" }); toast("Deleted");
    }
    await load();
  } catch (e) { toast(e.message); }
});

(async () => {
  onLogin(load);
  const user = await whenReady();
  if (user) load(); else showGate();
})();
