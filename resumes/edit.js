import { whenReady, api, showGate, onLogin, toast, linkFor, copy, lastToken } from "/resumes/api.js";
import { renderSheet, roleHTML, bulletHTML, skillHTML, eduHTML, esc } from "/resumes/render.mjs";

const app = document.querySelector("#app");
const id = new URLSearchParams(location.search).get("id");
let meta = null; // label, slug, published, primary

// ---------------- reading the page back into data ----------------
const val = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
const field = (root, key) => val(root.querySelector(`[data-f="${key}"]`));

function serialize() {
  const sheet = app.querySelector(".sheet");
  return {
    name: field(sheet, "name"),
    tagline: field(sheet, "tagline"),
    contact: field(sheet, "contact"),
    profile: field(sheet, "profile"),
    roles: [...sheet.querySelectorAll('[data-item="role"]')].map((r) => ({
      title: field(r, "title"), org: field(r, "org"), dates: field(r, "dates"), note: field(r, "note"),
      bullets: [...r.querySelectorAll('[data-f="bullet"]')].map(val).filter(Boolean)
    })),
    skills: [...sheet.querySelectorAll('[data-f="skill"]')].map(val).filter(Boolean),
    education: [...sheet.querySelectorAll('[data-item="edu"]')]
      .map((e) => ({ title: field(e, "eduTitle"), meta: field(e, "eduMeta") }))
      .filter((e) => e.title || e.meta)
  };
}

// ---------------- saving: one at a time, debounced ----------------
let timer = null, saving = false, again = false, dirty = false;
const status = (t, err) => { const s = app.querySelector(".status"); if (s) { s.textContent = t; s.classList.toggle("err", !!err); } };

function scheduleSave() {
  dirty = true; status("Unsaved");
  clearTimeout(timer); timer = setTimeout(save, 700);
}

async function save() {
  if (saving) { again = true; return; }
  saving = true; again = false; dirty = false; status("Saving…");
  try {
    await api(`/api/resumes/${id}`, { method: "PATCH", body: { data: serialize() } });
    status(dirty ? "Unsaved" : "Saved");
  } catch (e) {
    dirty = true; status("Retrying…", true);
    setTimeout(save, 4000);
  } finally {
    saving = false;
    if (again) save();
  }
}

// Last-chance save if she closes the tab mid-edit.
window.addEventListener("beforeunload", (e) => { if (dirty || saving) { e.preventDefault(); e.returnValue = ""; } });
window.addEventListener("pagehide", () => {
  if (!dirty || !lastToken()) return;
  fetch(`/api/resumes/${id}`, {
    method: "PATCH", keepalive: true,
    headers: { authorization: `Bearer ${lastToken()}`, "content-type": "application/json" },
    body: JSON.stringify({ data: serialize() })
  });
});

// ---------------- settings panel ----------------
// errId names the message box under the field. The panel is redrawn after
// every change, so the message is written into the fresh panel.
async function patchMeta(body, errId) {
  try {
    meta = await api(`/api/resumes/${id}`, { method: "PATCH", body });
    paintBar(); paintPanel(); return true;
  } catch (e) {
    paintPanel(); // restores the last saved values, like the old link
    const box = errId && app.querySelector(`#${errId}`);
    if (box) box.textContent = e.message; else toast(e.message);
    return false;
  }
}

function paintBar() {
  const live = meta.published;
  app.querySelector(".rbar .acts").innerHTML = `
    <span class="status" aria-live="polite">${dirty ? "Unsaved" : "Saved"}</span>
    ${live ? `<button class="rbtn ghost" data-top="copy">Copy link</button>
      <a class="rbtn ghost" href="/r/${esc(meta.slug)}" target="_blank" rel="noopener">View live</a>
      <a class="rbtn solid" href="/r/${esc(meta.slug)}/pdf">Download PDF</a>` : ""}`;
}

function paintPanel() {
  const p = app.querySelector(".panel");
  p.innerHTML = `
    <div><label for="label">Private name</label>
      <input type="text" id="label" value="${esc(meta.label)}" placeholder="Retool, Staff Copywriter" maxlength="80">
      <div class="field-err" id="label-err"></div></div>
    <div><label for="slug">Link</label>
      <div class="slugwrap"><span>${esc(location.host)}/r/</span><input type="text" id="slug" value="${esc(meta.slug)}" maxlength="60"></div>
      <div class="field-err" id="slug-err"></div></div>
    <div class="row2">
      <label class="switch" style="margin:0;text-transform:none;letter-spacing:0;font-size:13px;color:var(--ink);font-weight:400">
        <input type="checkbox" id="pub" ${meta.published ? "checked" : ""} ${meta.primary ? "disabled" : ""}>
        ${meta.published ? "Link is on. Anyone with it can view." : "Link is off. Only you can see this."}
      </label>
      ${meta.primary ? `<span class="pill main">Main resume</span><span class="status">The site's Resume button shows this one, so its link stays on.</span>`
                     : `<button class="rbtn ghost" id="mkmain">Make this Main</button>`}
    </div>`;
  p.querySelector("#label").onchange = (e) => patchMeta({ label: e.target.value }, "label-err");
  p.querySelector("#slug").onchange = (e) => patchMeta({ slug: e.target.value }, "slug-err");
  p.querySelector("#pub").onchange = (e) => patchMeta({ published: e.target.checked });
  const mk = p.querySelector("#mkmain");
  if (mk) mk.onclick = () => patchMeta({ primary: true });
}

// ---------------- editing behavior ----------------
function focusEnd(el) {
  if (!el) return;
  el.focus();
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
const frag = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };

function onClick(ev) {
  const btn = ev.target.closest("button[data-act]");
  if (!btn || !btn.closest(".sheet")) return;
  ev.preventDefault();
  const act = btn.dataset.act;
  const item = btn.closest("[data-item]");

  if (act === "up" && item?.previousElementSibling?.matches("[data-item]")) item.previousElementSibling.before(item);
  else if (act === "down" && item?.nextElementSibling?.matches("[data-item]")) item.nextElementSibling.after(item);
  else if (act === "remove") {
    if (btn.dataset.what === "role" && !btn.classList.contains("confirm")) {
      btn.classList.add("confirm"); btn.textContent = "Remove role?";
      setTimeout(() => { btn.classList.remove("confirm"); btn.innerHTML = "&times;"; }, 3500);
      return;
    }
    item.remove();
  }
  else if (act === "add-bullet") {
    const ul = btn.closest('[data-item="role"]').querySelector(".r-bullets");
    const li = frag(bulletHTML("", true)); ul.append(li); focusEnd(li.querySelector('[data-f="bullet"]'));
  }
  else if (act === "add-role") {
    const el = frag(roleHTML({ title: "", org: "", dates: "", note: "", bullets: [""] }, true));
    app.querySelector(".r-roles").append(el); focusEnd(el.querySelector('[data-f="title"]'));
  }
  else if (act === "add-skill") {
    const el = frag(skillHTML("", true)); app.querySelector('[data-list="skills"]').append(el); focusEnd(el.querySelector('[data-f="skill"]'));
  }
  else if (act === "add-edu") {
    const el = frag(eduHTML({ title: "", meta: "" }, true)); app.querySelector('[data-list="edu"]').append(el); focusEnd(el.querySelector('[data-f="eduTitle"]'));
  }
  scheduleSave();
}

function onKey(ev) {
  const el = ev.target.closest?.("[data-f]");
  if (!el) return;
  if (ev.key === "Enter") {
    ev.preventDefault(); // never a line break inside a field
    if (el.dataset.f === "bullet") {
      const li = frag(bulletHTML("", true)); el.closest("li").after(li); focusEnd(li.querySelector('[data-f="bullet"]'));
      scheduleSave();
    }
  }
  if (ev.key === "Backspace" && el.dataset.f === "bullet" && !val(el)) {
    const li = el.closest("li"); const prev = li.previousElementSibling?.querySelector('[data-f="bullet"]');
    if (li.parentElement.children.length > 1) { ev.preventDefault(); li.remove(); focusEnd(prev || li.parentElement.querySelector('[data-f="bullet"]')); scheduleSave(); }
  }
}

// Pasted text comes in plain, so formatting from Word or a job post stays out.
function onPaste(ev) {
  if (!ev.target.closest?.("[data-f]")) return;
  ev.preventDefault();
  const text = (ev.clipboardData?.getData("text/plain") || "").replace(/\s+/g, " ");
  document.execCommand("insertText", false, text);
}

// ---------------- boot ----------------
async function load() {
  if (!id) { location.href = "/resumes/"; return; }
  try {
    const r = await api(`/api/resumes/${id}`);
    meta = r;
    app.innerHTML = `
      <div class="rbar"><div class="in">
        <a class="rlink" href="/resumes/">&larr; All resumes</a>
        <div class="acts"></div>
      </div></div>
      <div class="panel"></div>
      <main class="stage">${renderSheet(r.data, { editable: true })}</main>`;
    paintBar(); paintPanel();
    const sheet = app.querySelector(".sheet");
    sheet.addEventListener("input", scheduleSave);
    sheet.addEventListener("click", onClick);
    sheet.addEventListener("keydown", onKey);
    sheet.addEventListener("paste", onPaste);
    app.querySelector(".rbar").addEventListener("click", (e) => { if (e.target.closest('[data-top="copy"]')) copy(linkFor(meta.slug)); });
    document.title = `${meta.label} · Edit resume`;
  } catch (e) {
    if (e.message !== "Please log in again.") app.innerHTML = `<div class="gate"><h1>Couldn't open this resume</h1><p>${esc(e.message)}</p><a class="rbtn" href="/resumes/">Back to your resumes</a></div>`;
  }
}

(async () => {
  onLogin(load);
  const user = await whenReady();
  if (user) load(); else showGate();
})();
