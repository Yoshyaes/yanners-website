// /resume and /resume/pdf always point at whichever resume is Main,
// so the site's Resume buttons never need editing.
import { getPrimary } from "../lib/store.mjs";

export default async (req) => {
  const r = await getPrimary();
  if (!r) return new Response(null, { status: 302, headers: { location: "/work.html" } });
  const pdf = new URL(req.url).pathname.replace(/\/$/, "").endsWith("/pdf");
  return new Response(null, {
    status: 302,
    headers: { location: `/r/${r.slug}${pdf ? "/pdf" : ""}`, "cache-control": "no-store" }
  });
};

export const config = { path: ["/resume", "/resume/pdf"] };
