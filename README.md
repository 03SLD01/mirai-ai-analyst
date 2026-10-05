# Mirai AI Analyst

Your AI business analyst: upload any Excel or CSV file, get a dashboard and chat with your data.

## Project structure

```
mirai-ai-analyst-project/
├── README.md
├── .gitignore
├── website/                  Static website (no build step)
│   ├── index.html            Page structure and text
│   └── assets/
│       ├── css/style.css     Styling (colors are variables at the top, light and dark)
│       └── js/app.js         Upload, analysis, dashboard charts, Ask Mirai chat
└── docs/
    └── mvp-spec.md           Build spec for the real product (backend, AI, database)
```

## Run the website

1. Open `website/index.html` in a browser, or serve the folder: `cd website && python3 -m http.server 8000`
2. To deploy, upload the `website` folder to Netlify, Vercel, GitHub Pages or Cloudflare Pages.

It needs internet access for Google Fonts, Chart.js and SheetJS (loaded from CDNs).

## How it works today

- File upload, cleaning, dashboard and charts run fully in the browser. Files are not uploaded anywhere.
- Ask Mirai uses `window.claude`, which exists only when the page is opened inside Claude. On your own site it falls back to short built-in answers.

## Before launch

- Ask Mirai: add a backend that calls the Claude API (see `docs/mvp-spec.md`, section 5) and replace `getSmp()` and `ask()` in `assets/js/app.js` with a request to it.
- Audit form: it opens the visitor's email app. Replace it with a form service such as Formspree or Web3Forms.
- Check the pricing, the "Coming soon" labels and the security wording. They are placeholders until the product is built.
- Add your logo, product screenshots and the links to your Power BI projects.

## Next steps

Follow the build order in `docs/mvp-spec.md`, starting with Phase 1 (file reader and cleaner).
