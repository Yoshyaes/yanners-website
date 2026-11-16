// Private API for the hub and editor. Every request needs Ayanna's login.
import { requireUser } from "../lib/auth.mjs";
import { json, errorResponse } from "../lib/http.mjs";
import { listResumes, getResume, createResume, updateResume, deleteResume, HttpError } from "../lib/store.mjs";

export default async (req, context) => {
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Please log in again." }, 401);

    const id = context.params?.id;
    const body = ["POST", "PATCH"].includes(req.method) ? await req.json().catch(() => ({})) : null;

    if (!id) {
      if (req.method === "GET") return json({ resumes: await listResumes() });
      if (req.method === "POST") return json(await createResume(body || {}), 201);
    } else {
      if (req.method === "GET") return json(await getResume(id));
      if (req.method === "PATCH") return json(await updateResume(id, body || {}));
      if (req.method === "DELETE") return json(await deleteResume(id));
    }
    throw new HttpError(405, "That action isn't supported.");
  } catch (e) {
    return errorResponse(e);
  }
};

export const config = { path: ["/api/resumes", "/api/resumes/:id"] };
