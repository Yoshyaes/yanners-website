import { HttpError } from "./store.mjs";

const PRIVATE = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...PRIVATE } });

export const html = (body, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", ...PRIVATE } });

export function errorResponse(e) {
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  console.error(e);
  return json({ error: "Something went wrong. Please try again." }, 500);
}
