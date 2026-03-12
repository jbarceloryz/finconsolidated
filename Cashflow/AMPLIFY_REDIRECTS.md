# Amplify rewrites (fix white screen)

If you see a **white screen** after deploy, the rewrite rule is likely sending **all** requests (including JS/CSS) to `index.html`, so the app never loads.

Use **one** of these in **Amplify Console → Hosting → Rewrites and redirects → Manage redirects**.

---

## Option A: SPA rewrite that excludes assets (recommended)

Paste this in the **JSON** editor (replace any existing rules, or add this as the only rewrite):

```json
[
  {
    "source": "</^[^.]+$|\\.(?!(css|csv|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
    "target": "/index.html",
    "status": "200",
    "condition": null
  }
]
```

This serves `index.html` only for routes **without** a file extension (e.g. `/`, `/dashboard`). Requests to `/assets/*.js`, **`/db.csv`**, etc. are served as real files. (**csv** must be in the list or the dashboard will show no data.)

---

## Option B: Simple catch-all (only if you have no static files at root)

**Do not use** if you have `/db.csv` or assets at root. This can cause the white screen:

```json
[
  {
    "source": "/<*>",
    "target": "/index.html",
    "status": "200",
    "condition": null
  }
]
```

---

After saving, **redeploy** (Redeploy this version in Build history) or push a new commit.
