# personal-site

Built with [Eleventy](https://www.11ty.dev). Content is edited in `src/` (or through [Pages CMS](https://pagescms.org), configured in `.pages.yml`); the published site is generated into `_site/`.

| What | Where |
| --- | --- |
| Projects (one file each; order, cover, hover text, page content) | `src/projects/*.md` |
| Gallery images and which ones rotate on the Work page | `src/_data/gallery.json` |
| About text and drawing | `src/about.md` |
| About timeline | `src/_data/timeline.json` |
| Name, tagline, email, footer links | `src/_data/site.json` |
| Header, footer and page shell | `src/_includes/base.njk` |
| Styles and behaviour | `css/style.css`, `js/site.js` |
| Images and videos (resized to WebP automatically on build) | `src/img/` |

```
npm install      # once
npm start        # local preview at http://localhost:8080 that rebuilds on save
npm run build    # one-off build into _site/
```

Pushing to `main` builds and publishes the site to GitHub Pages (`.github/workflows/deploy.yml`).
