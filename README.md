# abitrolabs.com

Static site (plain HTML + CSS, no build step), migrated from Framer.

- `index.html` – the page
- `styles.css` – all styles, responsive breakpoints at 1080px, 900px and 600px
- `vercel.json` – Vercel settings (clean URLs, cache and security headers)

## Deploy on Vercel

1. In Vercel, **Add New → Project** and import this GitHub repo.
2. Framework preset: **Other**. Leave build command and output directory empty.
3. Deploy, then add `abitrolabs.com` under **Settings → Domains** and update your DNS as Vercel instructs.

Local preview: `npx serve .` and open http://localhost:3000.

Images are still loaded from `framerusercontent.com`. If you cancel Framer, download them into an `assets/` folder and update the URLs.

## Budsyn

The `fixflow/` folder contains Budsyn, a separate Next.js app (Danish SaaS for understanding contractor quotes). It is independent of the static site above – see `fixflow/README.md`. When deploying it on Vercel, create a separate project with **Root Directory = `fixflow`**.
