# ToxScan — AI Product Safety Analyzer

Scan products for toxic substances using Claude AI vision.

## Deploy to Vercel (same as your other projects)

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "initial commit"
gh repo create toxscan --public --push

# 2. Deploy
vercel --prod
```

## Set Environment Variable in Vercel

In your Vercel project dashboard → Settings → Environment Variables:

```
ANTHROPIC_API_KEY = your_key_here
```

## Project Structure

```
toxscan/
├── api/
│   └── analyze.js      ← Serverless function (calls Claude API securely)
├── src/
│   ├── main.jsx
│   └── App.jsx         ← React frontend
├── index.html
├── package.json
└── vite.config.js
```

## Local Dev

```bash
npm install
vercel dev    # runs both frontend + api routes locally
```
