# Mirai AI Analyst

Your AI business analyst: upload any Excel or CSV file, get a dashboard and chat with your data.

## Project structure

```
mirai-ai-analyst-project/
├── README.md
├── server.py                 Local server: serves the website and powers Ask Mirai with Gemini (no packages needed)
├── .env.example              Copy to .env and add your free Gemini API key
├── .gitignore
├── website/                  Static website (no build step)
│   ├── index.html
│   └── assets/
│       ├── css/style.css
│       └── js/app.js         Upload, analysis, dashboard charts, Ask Mirai chat, contact form
└── docs/
    └── mvp-spec.md           Build spec for the real product
```

## Run it in VS Code (with Ask Mirai AI working)

Ask Mirai uses Google Gemini, which has a free tier (no card needed).

1. Install Python 3.8 or newer. Open the `mirai-ai-analyst-project` folder in VS Code.
2. Get a free key at https://aistudio.google.com/apikey (sign in with a Google account, click "Create API key").
3. Copy `.env.example` to a new file named `.env` and replace `paste-your-key-here` with your key.
4. Open the VS Code terminal (Ctrl + `) and run:

   ```
   python server.py
   ```

   (On some computers the command is `python3 server.py` or `py server.py`.)
5. Open http://localhost:8000 in your browser. Upload a file or click "Use sample data", then open the Ask Mirai tab and ask a question.

The terminal prints "Ask Mirai AI: ON (gemini, model ...)" when the key is found. If it says OFF, check the `.env` file and restart the server.

You can also open the page with VS Code Live Server. Keep `python server.py` running in the terminal and Ask Mirai will find it on port 8000.

Your uploaded file stays in your browser. Ask Mirai sends only a summary of the data and the results of calculations to Gemini through your own server. On the free tier, Google may use the content you send to improve its products, so do not use confidential data with a free key.

### Troubleshooting

- "Free-form AI answers work when this page is opened inside Claude": you opened an old copy of the site or the server is not running. Run `python server.py` and use http://localhost:8000.
- "Gemini free-tier limit reached": the free tier allows only a few requests per minute and per day. Wait a minute and try again.
- "Model ... was not found": set `GEMINI_MODEL` in `.env` to a model your key can use, for example `gemini-2.5-flash`. Google changes model names often. The list is at https://ai.google.dev/gemini-api/docs/models
- To use Claude instead, set `MIRAI_PROVIDER=claude` and `ANTHROPIC_API_KEY` in `.env`.

## Security notes

- Never put your API key in `website/` files or commit `.env` (it is already in `.gitignore`).
- `server.py` listens only on your own computer and only accepts requests from localhost pages. Do not expose it to the internet as it is. For a public site, deploy a proper backend with login, rate limits and usage caps (see `docs/mvp-spec.md`).

## Contact form (free data audit)

The form sends through FormSubmit (formsubmit.co) to miraiaianalyst@gmail.com. One-time setup: deploy the site (or use http://localhost:8000), submit the form once, then click the activation link FormSubmit emails to that address (check spam). It does not work from a `file://` page or inside the Claude preview. There the form shows buttons for WhatsApp, Gmail, email app and copy instead.

## Before launch

- Check the pricing, the "Coming soon" labels and the security wording. They are placeholders until the product is built.
- Add your logo, product screenshots and the links to your Power BI projects.

## Next steps

Follow the build order in `docs/mvp-spec.md`, starting with Phase 1 (file reader and cleaner).
