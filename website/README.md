# SaffronMetrics — 3D Animated "Read Me" Website

A self-contained, responsive landing page for the Bangalore Food-Delivery Analytics project. Modern dark UI, a Three.js 3D particle hero, CSS 3D card tilt, scroll-reveal, and animated counters — all performance-conscious and accessible.

## 📦 What's in the package
```
website/
├── index.html          # the page (semantic, responsive)
├── css/style.css       # Indigo Noir theme, layout, animations, responsive rules
├── js/hero.js          # Three.js 3D hero scene (particles + wireframe orb)
├── js/main.js          # nav, scroll-reveal, animated counters, 3D tilt (vanilla)
└── README.md           # this file
```

## 🔗 Dependencies
All loaded from CDN — **no build step, no npm install**:
| Dependency | Purpose | How it's loaded |
|---|---|---|
| **Three.js** r128 | 3D hero animation | `<script src="cdnjs…/three.min.js">` in `index.html` |
| **Google Fonts** (Inter, Space Grotesk) | Typography | `<link>` in `<head>` |

Everything else (tilt, reveal, counters, nav) is **plain JavaScript** — zero frameworks.

## ▶️ Run locally
Just open `index.html` in a browser. For best results (fonts/CDN), serve it:
```bash
# from the website/ folder
python -m http.server 8080
# then visit http://localhost:8080
```

## 🚀 Deploy (free options)

### Option A — GitHub Pages (recommended, free)
1. Push the repo to GitHub.
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** → `main` → `/root` → **Save**.
3. Your site goes live at:
   `https://tarunmehrda.github.io/bangalore-food-delivery-analytics-powerbi/website/`
   *(To serve it at the root URL instead, copy the contents of `website/` to the repo root.)*

### Option B — Netlify / Vercel (drag & drop, free)
1. Go to **app.netlify.com** → **Add new site → Deploy manually**.
2. Drag the **`website/`** folder onto the page. Done — you get a public link instantly.

### Option C — Embed in an existing site
Copy `index.html`, `css/`, and `js/` into your site, or drop the hero markup + `hero.js`/`style.css` into any page. Keep the folder structure (or update the `<link>`/`<script>` paths).

## ⚡ Performance & accessibility
- **Capped pixel ratio** (max 2) and **reduced particle count on mobile**.
- Hero animation **pauses** when the tab is hidden or scrolled off-screen (`IntersectionObserver` + `visibilitychange`).
- Full **`prefers-reduced-motion`** support — disables 3D/animation and shows a static layout.
- 3D tilt is **desktop-only** (skipped on touch devices).
- No layout-shift fonts (`display=swap`), lazy reveal via `IntersectionObserver`.

## 🎨 Customize
- **Colors:** edit the CSS variables in `:root` (top of `style.css`).
- **Content/numbers:** edit the text and `data-count` values in `index.html`.
- **Links:** update the GitHub / download URLs (search `tarunmehrda` in `index.html`).
- **Screenshots:** replace the CSS mockup in the `#preview` section with real `<img>` tags.
