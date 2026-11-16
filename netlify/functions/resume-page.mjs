// The public resume an employer sees at /r/<link>.
import { getBySlug } from "../lib/store.mjs";
import { html } from "../lib/http.mjs";
import { shell, notFound } from "../lib/page.mjs";
import { renderSheet, esc } from "../../resumes/render.mjs";

export default async (req, context) => {
  const r = await getBySlug(context.params?.slug || "");
  if (!r || !r.published) return notFound();
  const d = r.data;
  return html(shell(`${d.name} Resume`, `
<div class="rbar"><div class="in">
  <a class="me" href="/">${esc(d.name)}</a>
  <div class="acts"><a class="rbtn solid" href="/r/${esc(r.slug)}/pdf">Download PDF</a></div>
</div></div>
<main class="stage">${renderSheet(d)}</main>`));
};

export const config = { path: "/r/:slug" };
