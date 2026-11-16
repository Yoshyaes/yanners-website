// Builds the resume PDF from the saved record. No external packages.
// Text is real, selectable text in embedded Bodoni Moda and DM Sans, so
// applicant-tracking systems can read it. US Letter.
import { deflateSync } from "node:zlib";
import { FONTS } from "./fonts.mjs";

const PAGE_W = 612, PAGE_H = 792;
const M = { top: 46, bottom: 46, left: 52, right: 52 };
const CW = PAGE_W - M.left - M.right;
const INK = [0.102, 0.102, 0.09], MUTED = [0.416, 0.416, 0.384], ACCENT = [0.329, 0.376, 0.29], HAIR = [0.80, 0.80, 0.77];
const FKEY = { serif: "F1", serifBold: "F2", sans: "F3", sansBold: "F4" };

// ---------- text encoding and measuring ----------
const WIN = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };
function codes(str) {
  const out = [];
  for (const ch of String(str).normalize("NFC")) {
    const u = ch.codePointAt(0);
    if (u >= 32 && u < 127) out.push(u);
    else if (u >= 160 && u <= 255) out.push(u);
    else if (WIN[u]) out.push(WIN[u]);
    else if (u === 0x2010 || u === 0x2011) out.push(45);
    else out.push(63); // "?" for anything WinAnsi can't show
  }
  return out;
}
const width = (str, font, size) => codes(str).reduce((w, c) => w + FONTS[font].widths[c - 32], 0) * size / 1000;
const hex = (str) => "<" + codes(str).map((c) => c.toString(16).padStart(2, "0")).join("") + ">";

function wrap(text, font, size, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = []; let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (!cur || width(next, font, size) <= maxW) { cur = next; continue; }
    lines.push(cur); cur = w;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- layout ----------
function layout(d, s) {
  const pages = [[]];
  let y = PAGE_H - M.top;
  const op = (o) => pages[pages.length - 1].push(o);
  const newPage = () => { pages.push([]); y = PAGE_H - M.top; };
  const need = (h) => { if (y - h < M.bottom && pages[pages.length - 1].length) newPage(); };
  const text = (str, font, size, x, color = INK) =>
    op(`BT /${FKEY[font]} ${n(size)} Tf ${rgb(color)} rg ${n(x)} ${n(y)} Td ${hex(str)} Tj ET`);
  const rule = (color, w, gapAbove) => { y -= gapAbove; op(`${rgb(color)} RG ${n(w)} w ${n(M.left)} ${n(y)} m ${n(PAGE_W - M.right)} ${n(y)} l S`); };

  // Paragraph with wrapping. Returns nothing, moves y.
  const para = (str, font, size, lh, x = M.left, maxW = CW, color = INK) => {
    for (const line of wrap(str, font, size, maxW)) {
      need(size * lh); y -= size * lh; text(line, font, size, x, color);
    }
  };

  // Header
  const nameSize = 25 * s;
  y -= nameSize * 0.9; text(d.name, "serif", nameSize, M.left);
  if (d.tagline) { y -= 7 * s; para(d.tagline.toUpperCase(), "sansBold", 7.4 * s, 1.35, M.left, CW, ACCENT); }
  if (d.contact) { y -= 2 * s; para(d.contact, "sans", 8.2 * s, 1.4, M.left, CW, MUTED); }
  rule(INK, 0.7, 10 * s);
  y -= 4 * s;
  if (d.profile) para(d.profile, "sans", 9.4 * s, 1.45);

  const heading = (title) => {
    need(40 * s);
    y -= 15 * s; const size = 7.4 * s;
    y -= size; text(title.toUpperCase(), "sansBold", size, M.left, ACCENT);
    rule(HAIR, 0.5, 4.5 * s); y -= 3 * s;
  };

  // Title on the left, meta on the right. Falls back to two lines when tight.
  const row = (left, lfont, lsize, meta) => {
    const msize = 8 * s, mw = meta ? width(meta, "sans", msize) : 0;
    const titleLines = wrap(left, lfont, lsize, meta ? CW - mw - 14 : CW);
    const sameLine = !meta || titleLines.length === 1;
    const lines = sameLine ? titleLines : wrap(left, lfont, lsize, CW);
    lines.forEach((ln, i) => {
      y -= lsize * 1.3; text(ln, lfont, lsize, M.left);
      if (i === 0 && meta && sameLine) text(meta, "sans", msize, PAGE_W - M.right - mw, MUTED);
    });
    if (meta && !sameLine) { y -= msize * 1.35; text(meta, "sans", msize, M.left, MUTED); }
  };

  const bsize = 8.9 * s, blh = 1.42, indent = 11 * s;
  const bullet = (str) => {
    const lines = wrap(str, "sans", bsize, CW - indent);
    lines.forEach((ln, i) => {
      need(bsize * blh); y -= bsize * blh;
      if (i === 0) op(`${rgb(ACCENT)} rg ${n(M.left + 1.2 * s)} ${n(y + bsize * 0.28)} ${n(2.6 * s)} ${n(2.6 * s)} re f`);
      text(ln, "sans", bsize, M.left + indent);
    });
    y -= 1.6 * s;
  };

  if (d.roles.length) {
    heading("Experience");
    d.roles.forEach((r, i) => {
      if (i) y -= 6 * s;
      const meta = [r.org, r.dates].filter(Boolean).join(" · ");
      // Keep a role's title on the same page as its first bullet.
      const firstB = r.bullets[0] ? wrap(r.bullets[0], "sans", bsize, CW - indent).length * bsize * blh : 0;
      need(10.6 * s * 1.3 + (r.note ? 8 * s * 1.4 : 0) + firstB + 4 * s);
      row(r.title, "serifBold", 10.6 * s, meta);
      if (r.note) { y -= 8 * s * 1.35; text(r.note, "sans", 8 * s, M.left, MUTED); }
      y -= 2.5 * s;
      r.bullets.forEach(bullet);
    });
  }

  if (d.skills.length) {
    heading("Skills");
    d.skills.forEach((line) => {
      const m = /^([^:]{1,24}):\s+(.*)$/.exec(line);
      if (!m) { para(line, "sans", bsize, 1.45); y -= 2 * s; return; }
      // Bold label, then the rest wrapped after it on the first line.
      const label = m[1] + ": ", lw = width(label, "sansBold", bsize);
      const first = wrap(m[2], "sans", bsize, CW - lw);
      need(bsize * 1.45); y -= bsize * 1.45;
      text(label, "sansBold", bsize, M.left);
      text(first[0] || "", "sans", bsize, M.left + lw);
      const rest = first.slice(1).join(" ");
      if (rest) para(rest, "sans", bsize, 1.45);
      y -= 2 * s;
    });
  }

  if (d.education.length) {
    heading("Education");
    d.education.forEach((e) => { need(bsize * 1.4); row(e.title, "sans", bsize, e.meta); y -= 2 * s; });
  }
  return pages.filter((p) => p.length);
}

// Fit to fewer pages when a slight shrink allows it. Never below 88%.
function bestLayout(d) {
  const full = layout(d, 1);
  for (const s of [0.96, 0.92, 0.88]) {
    const p = layout(d, s);
    if (p.length < full.length) return p;
  }
  return full;
}

// ---------- PDF serialization ----------
const n = (v) => (Math.round(v * 100) / 100).toString();
const rgb = (c) => c.map(n).join(" ");

export function buildPdf(d, { title = "Resume" } = {}) {
  const pages = bestLayout(d);
  const objs = []; // index i holds object number i+1
  const add = (body) => { objs.push(body); return objs.length; };
  const ref = (i) => `${i} 0 R`;

  const fontRefs = {};
  const tags = { serif: "AAAAAB", serifBold: "AAAAAC", sans: "AAAAAD", sansBold: "AAAAAE" };
  for (const key of Object.keys(FKEY)) {
    const F = FONTS[key];
    const raw = Buffer.from(F.data, "base64");
    const z = deflateSync(raw);
    const file = add({ stream: z, dict: `/Length ${z.length} /Length1 ${raw.length} /Filter /FlateDecode` });
    const base = `${tags[key]}+${F.name}`;
    const serif = key.startsWith("serif");
    const desc = add(`<< /Type /FontDescriptor /FontName /${base} /Flags ${serif ? 34 : 32} /FontBBox [${F.bbox.join(" ")}] /ItalicAngle 0 /Ascent ${F.ascent} /Descent ${F.descent} /CapHeight ${F.capHeight} /StemV 80 /FontFile2 ${ref(file)} >>`);
    fontRefs[key] = add(`<< /Type /Font /Subtype /TrueType /BaseFont /${base} /FirstChar 32 /LastChar 255 /Widths [${F.widths.join(" ")}] /FontDescriptor ${ref(desc)} /Encoding /WinAnsiEncoding >>`);
  }
  const fontDict = `<< ${Object.keys(FKEY).map((k) => `/${FKEY[k]} ${ref(fontRefs[k])}`).join(" ")} >>`;

  const pagesId = objs.length + 1 + pages.length * 2; // reserved below
  const pageIds = [];
  for (const ops of pages) {
    const z = deflateSync(Buffer.from(ops.join("\n"), "latin1"));
    const content = add({ stream: z, dict: `/Length ${z.length} /Filter /FlateDecode` });
    pageIds.push(add(`<< /Type /Page /Parent ${ref(pagesId)} /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font ${fontDict} >> /Contents ${ref(content)} >>`));
  }
  const pagesObj = add(`<< /Type /Pages /Kids [${pageIds.map(ref).join(" ")}] /Count ${pageIds.length} >>`);
  if (pagesObj !== pagesId) throw new Error("PDF object numbering mismatch");
  const pdfStr = (s) => "(" + String(s).replace(/[\\()]/g, (c) => "\\" + c).replace(/[^\x20-\x7e]/g, "") + ")";
  const info = add(`<< /Title ${pdfStr(title)} /Author ${pdfStr(d.name)} /Producer (ayannacrawford.com) >>`);
  const catalog = add(`<< /Type /Catalog /Pages ${ref(pagesObj)} >>`);

  const chunks = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  let offset = chunks[0].length;
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(offset);
    const head = Buffer.from(`${i + 1} 0 obj\n`, "latin1");
    const body = typeof o === "string"
      ? Buffer.from(o + "\nendobj\n", "latin1")
      : Buffer.concat([Buffer.from(`<< ${o.dict} >>\nstream\n`, "latin1"), o.stream, Buffer.from("\nendstream\nendobj\n", "latin1")]);
    chunks.push(head, body); offset += head.length + body.length;
  });
  const xref = ["xref", `0 ${objs.length + 1}`, "0000000000 65535 f ", ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n `)].join("\n");
  chunks.push(Buffer.from(`${xref}\ntrailer\n<< /Size ${objs.length + 1} /Root ${ref(catalog)} /Info ${ref(info)} >>\nstartxref\n${offset}\n%%EOF\n`, "latin1"));
  return new Uint8Array(Buffer.concat(chunks));
}
