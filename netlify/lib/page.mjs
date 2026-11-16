// Shared HTML shell and the not-found page for public resume routes.
import { html } from "./http.mjs";
import { esc } from "../../resumes/render.mjs";

export const shell = (title, body) => `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;1,6..96,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/resumes/resume.css">
</head><body>${body}</body></html>`;

export function notFound() {
  return html(shell("Resume not found", `<div class="gate"><h1>Not found</h1><p>This resume link isn't active.</p><a class="rbtn" href="/">Visit the site</a></div>`), 404);
}
