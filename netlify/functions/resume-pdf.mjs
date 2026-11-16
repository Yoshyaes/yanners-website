// /r/<link>/pdf builds the PDF from the same saved text as the page.
import { getBySlug } from "../lib/store.mjs";
import { buildPdf } from "../lib/pdf.mjs";
import { notFound } from "../lib/page.mjs";

export default async (req, context) => {
  const r = await getBySlug(context.params?.slug || "");
  if (!r || !r.published) return notFound();
  const file = `${(r.data.name || "Resume").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}-Resume.pdf`;
  return new Response(buildPdf(r.data, { title: `${r.data.name} Resume` }), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${file}"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow"
    }
  });
};

export const config = { path: "/r/:slug/pdf" };
