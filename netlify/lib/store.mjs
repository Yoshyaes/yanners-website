import { getStore } from "@netlify/blobs";
import { SEED } from "./seed.mjs";
import { cleanResume, cleanLabel, cleanSlug } from "./schema.mjs";

// Storage layout in the "resumes" blob store
//   index            { ids: [...], primary: id, slugs: { slug: id } }
//   resume/<id>      one full resume record
// Strong consistency so a save is visible on the very next read.

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

let override = null;
export function useTestStore(s) { override = s; } // local tests only

function db() {
  return override || getStore({ name: "resumes", consistency: "strong" });
}

const rand = (n = 6) => {
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
};

async function readIndex() {
  return (await db().get("index", { type: "json" })) || { ids: [], primary: null, slugs: {} };
}
const writeIndex = (idx) => db().setJSON("index", idx);
const readOne = (id) => db().get(`resume/${id}`, { type: "json" });
const writeOne = (r) => db().setJSON(`resume/${r.id}`, r);

// Creates the Main resume from the seed the first time anything is read.
async function ensureSeeded() {
  const idx = await readIndex();
  if (idx.ids.length) return idx;
  const now = new Date().toISOString();
  const r = {
    id: rand(10), label: "Main resume", slug: "ayanna-redwood-crawford",
    published: true, createdAt: now, updatedAt: now, data: cleanResume(SEED)
  };
  await writeOne(r);
  const fresh = { ids: [r.id], primary: r.id, slugs: { [r.slug]: r.id } };
  await writeIndex(fresh);
  return fresh;
}

const summary = (r, idx) => ({
  id: r.id, label: r.label, slug: r.slug, published: r.published,
  primary: idx.primary === r.id, createdAt: r.createdAt, updatedAt: r.updatedAt
});

export async function listResumes() {
  const idx = await ensureSeeded();
  const all = await Promise.all(idx.ids.map(readOne));
  return all.filter(Boolean).map((r) => summary(r, idx));
}

export async function getResume(id) {
  const idx = await ensureSeeded();
  const r = await readOne(id);
  if (!r) throw new HttpError(404, "That resume doesn't exist anymore.");
  return { ...summary(r, idx), data: r.data };
}

export async function getBySlug(slug) {
  const idx = await ensureSeeded();
  const id = idx.slugs[cleanSlug(slug)];
  if (!id) return null;
  const r = await readOne(id);
  return r ? { ...r, primary: idx.primary === r.id } : null;
}

export async function getPrimary() {
  const idx = await ensureSeeded();
  return idx.primary ? readOne(idx.primary) : null;
}

function uniqueSlug(base, idx) {
  const root = cleanSlug(base) || "resume";
  let s;
  do { s = `${root}-${rand(6)}`.slice(0, 60); } while (idx.slugs[s]);
  return s;
}

// New copies start with the link off, so nothing is visible until she's ready.
export async function createResume({ duplicateOf, label } = {}) {
  const idx = await ensureSeeded();
  let data = cleanResume({ name: SEED.name, roles: [{ bullets: [] }] });
  let name = cleanLabel(label || "New resume");
  if (duplicateOf) {
    const src = await readOne(duplicateOf);
    if (!src) throw new HttpError(404, "Couldn't find the resume to copy.");
    data = src.data;
    name = cleanLabel(label || `Copy of ${src.label}`);
  }
  const now = new Date().toISOString();
  const r = { id: rand(10), label: name, slug: uniqueSlug(name, idx), published: false,
              createdAt: now, updatedAt: now, data };
  await writeOne(r);
  idx.ids.unshift(r.id);
  idx.slugs[r.slug] = r.id;
  await writeIndex(idx);
  return { ...summary(r, idx), data: r.data };
}

export async function updateResume(id, patch = {}) {
  const idx = await ensureSeeded();
  const r = await readOne(id);
  if (!r) throw new HttpError(404, "That resume doesn't exist anymore.");

  if ("label" in patch) r.label = cleanLabel(patch.label);

  if ("slug" in patch) {
    const s = cleanSlug(patch.slug);
    if (!s) throw new HttpError(400, "A link needs at least one letter or number.");
    if (idx.slugs[s] && idx.slugs[s] !== id) throw new HttpError(409, "Another resume already uses that link.");
    if (s !== r.slug) { delete idx.slugs[r.slug]; idx.slugs[s] = id; r.slug = s; } // old link stops working
  }

  if ("primary" in patch && patch.primary === true) { idx.primary = id; r.published = true; }

  if ("published" in patch) {
    const on = patch.published === true;
    if (!on && idx.primary === id) throw new HttpError(400, "The Main resume's link has to stay on, since the site's Resume button points to it.");
    r.published = on;
  }

  if ("data" in patch) r.data = cleanResume(patch.data);

  r.updatedAt = new Date().toISOString();
  await writeOne(r);
  await writeIndex(idx);
  return { ...summary(r, idx), data: r.data };
}

export async function deleteResume(id) {
  const idx = await ensureSeeded();
  if (!idx.ids.includes(id)) throw new HttpError(404, "That resume doesn't exist anymore.");
  if (idx.ids.length === 1) throw new HttpError(400, "You can't delete your only resume.");
  if (idx.primary === id) throw new HttpError(400, "Make another resume Main before deleting this one.");
  const r = await readOne(id);
  idx.ids = idx.ids.filter((x) => x !== id);
  if (r) delete idx.slugs[r.slug];
  await writeIndex(idx);
  await db().delete(`resume/${id}`);
  return { ok: true };
}
