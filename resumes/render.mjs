// One layout, two uses. The public resume page (rendered on the server) and
// the editor (rendered in the browser) both call renderSheet, so what Ayanna
// edits is exactly what an employer sees.

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const tools = (what) =>
  `<span class="r-tools" contenteditable="false"><button type="button" data-act="up" title="Move up">&uarr;</button><button type="button" data-act="down" title="Move down">&darr;</button><button type="button" data-act="remove" data-what="${what}" title="Remove">&times;</button></span>`;

// Editable text field, or plain text when read-only.
function f(tag, cls, key, value, editable, ph) {
  if (editable) {
    return `<${tag} class="${cls}" data-f="${key}" data-ph="${esc(ph)}" contenteditable="true" spellcheck="true">${esc(value)}</${tag}>`;
  }
  return `<${tag} class="${cls}">${esc(value)}</${tag}>`;
}

// "Tools: Jira, Asana" shows the label in bold on the public page.
function skillLine(s) {
  const m = /^([^:]{1,24}):\s+(.*)$/.exec(s);
  return m ? `<b>${esc(m[1])}:</b> ${esc(m[2])}` : esc(s);
}

export function roleHTML(r, editable) {
  if (editable) {
    return `<div class="r-role" data-item="role">${tools("role")}
      <div class="r-row">
        ${f("span", "r-title", "title", r.title, true, "Job title")}
        <span class="r-meta">${f("span", "", "org", r.org, true, "Company")}<span class="r-dot" contenteditable="false"> · </span>${f("span", "", "dates", r.dates, true, "Dates")}</span>
      </div>
      ${f("p", "r-note", "note", r.note, true, "Optional note, like the company type")}
      <ul class="r-bullets">${(r.bullets.length ? r.bullets : [""]).map((b) => bulletHTML(b, true)).join("")}</ul>
      <button type="button" class="r-add" data-act="add-bullet" contenteditable="false">+ Add bullet</button>
    </div>`;
  }
  const meta = [r.org, r.dates].filter(Boolean).map(esc).join(" · ");
  return `<div class="r-role">
      <div class="r-row"><span class="r-title">${esc(r.title)}</span>${meta ? `<span class="r-meta">${meta}</span>` : ""}</div>
      ${r.note ? `<p class="r-note">${esc(r.note)}</p>` : ""}
      ${r.bullets.length ? `<ul class="r-bullets">${r.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
    </div>`;
}

export function bulletHTML(b, editable) {
  return editable
    ? `<li data-item="bullet"><span class="r-btext" data-f="bullet" data-ph="Bullet" contenteditable="true" spellcheck="true">${esc(b)}</span>${tools("bullet")}</li>`
    : `<li>${esc(b)}</li>`;
}

export function skillHTML(s, editable) {
  return editable
    ? `<div class="r-lineitem" data-item="skill">${f("p", "r-line", "skill", s, true, "Skills line")}${tools("line")}</div>`
    : `<p class="r-line">${skillLine(s)}</p>`;
}

export function eduHTML(e, editable) {
  return editable
    ? `<div class="r-lineitem" data-item="edu"><div class="r-row">${f("span", "r-edu-title", "eduTitle", e.title, true, "Degree")}${f("span", "r-meta", "eduMeta", e.meta, true, "School, place")}</div>${tools("line")}</div>`
    : `<div class="r-row"><span class="r-edu-title">${esc(e.title)}</span>${e.meta ? `<span class="r-meta">${esc(e.meta)}</span>` : ""}</div>`;
}

export function renderSheet(d, { editable = false } = {}) {
  const E = editable;
  const sec = (title, inner, add) =>
    `<section class="r-sec"><h2>${title}</h2>${inner}${E && add ? add : ""}</section>`;
  const showSkills = E || d.skills.length;
  const showEdu = E || d.education.length;
  return `<article class="sheet${E ? " is-editing" : ""}">
    <header>
      ${f("h1", "r-name", "name", d.name, E, "Your name")}
      ${E || d.tagline ? f("p", "r-tag", "tagline", d.tagline, E, "Headline, like Copywriter · Brand Voice") : ""}
      ${E || d.contact ? f("p", "r-contact", "contact", d.contact, E, "Location · email · phone") : ""}
    </header>
    <hr class="r-rule">
    ${E || d.profile ? f("p", "r-profile", "profile", d.profile, E, "A short profile") : ""}
    ${sec("Experience",
      `<div class="r-roles">${d.roles.map((r) => roleHTML(r, E)).join("")}</div>`,
      `<button type="button" class="r-add" data-act="add-role">+ Add role</button>`)}
    ${showSkills ? sec("Skills",
      `<div class="r-lines" data-list="skills">${(E && !d.skills.length ? [""] : d.skills).map((s) => skillHTML(s, E)).join("")}</div>`,
      `<button type="button" class="r-add" data-act="add-skill">+ Add line</button>`) : ""}
    ${showEdu ? sec("Education",
      `<div class="r-lines" data-list="edu">${(E && !d.education.length ? [{ title: "", meta: "" }] : d.education).map((e) => eduHTML(e, E)).join("")}</div>`,
      `<button type="button" class="r-add" data-act="add-edu">+ Add line</button>`) : ""}
  </article>`;
}
