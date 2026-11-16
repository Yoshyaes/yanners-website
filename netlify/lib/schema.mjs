// Everything a browser sends passes through here before it is saved.
// The editor runs in her browser, and anything a browser sends can be faked,
// so the server never trusts it as-is.

const LIMITS = {
  short: 160,   // name, titles, dates, meta
  line: 400,    // tagline, contact, skills lines
  long: 1200,   // profile, bullets
  roles: 20,
  bullets: 12,
  lines: 12
};

// Flatten to a single clean line. Removes control characters and extra spaces.
export function clean(value, max) {
  if (typeof value !== "string") return "";
  let s = "";
  for (const ch of value) {
    const c = ch.codePointAt(0);
    s += (c < 32 || c === 127 || (c >= 0x80 && c < 0xa0)) ? " " : ch;
  }
  s = s.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max).trim() : s;
}

export function cleanResume(input) {
  const d = input && typeof input === "object" ? input : {};
  const arr = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);
  return {
    name: clean(d.name, LIMITS.short),
    tagline: clean(d.tagline, LIMITS.line),
    contact: clean(d.contact, LIMITS.line),
    profile: clean(d.profile, LIMITS.long),
    roles: arr(d.roles, LIMITS.roles).map((r) => ({
      title: clean(r?.title, LIMITS.short),
      org: clean(r?.org, LIMITS.short),
      dates: clean(r?.dates, LIMITS.short),
      note: clean(r?.note, LIMITS.short),
      bullets: arr(r?.bullets, LIMITS.bullets).map((b) => clean(b, LIMITS.long)).filter(Boolean)
    })),
    skills: arr(d.skills, LIMITS.lines).map((s) => clean(s, LIMITS.line)).filter(Boolean),
    education: arr(d.education, LIMITS.lines).map((e) => ({
      title: clean(e?.title, LIMITS.short),
      meta: clean(e?.meta, LIMITS.short)
    })).filter((e) => e.title || e.meta)
  };
}

export function cleanLabel(v) {
  return clean(v, 80) || "Untitled resume";
}

// Link endings are lowercase letters, numbers and hyphens only.
export function cleanSlug(v) {
  return String(v || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
