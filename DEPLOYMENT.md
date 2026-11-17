# Deployment

## Cloudflare Pages

PriceXpert's browser UI can be deployed as a static Cloudflare Pages site:

- Framework preset: **None**
- Build command: **`npm run build`**
- Build output directory: **`dist`**
- Root directory: the repository root

The build copies `index.html`, `main.js`, and `style.css` into `dist` and generates `api-config.js`. If the comparison API is hosted separately, set the Pages build environment variable `PRICE_XPERT_API_BASE` to that service's HTTPS origin (for example, `https://api.example.com`). The browser then calls `/api/compare` on that API. If unset, deployed pages use their own origin for `/api` requests.

## Backend API

`server.js` and the Node branch of `app.js` are Express backend entry points. They expose `/api/compare`, `/api/detect`, and `/api/health`, and use Playwright Chromium with a stealth plugin to fetch product data. Cloudflare Pages static hosting does not run this Express server or its browser automation. Keep the backend intact and deploy it separately to a Node.js host that supports long-running Express processes and Playwright's Chromium runtime and OS dependencies. Configure that host to allow browser requests from the deployed Pages domain if its CORS policy is restricted.

For local development, `npm start` starts the API on port `3001` and the UI on port `7890`; the UI continues to use `http://localhost:3001` by default.
