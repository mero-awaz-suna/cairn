# Cairn Frontend

Simple setup guide for the Cairn frontend (Next.js App Router).

## 1. What this frontend uses

Runtime dependencies:

- next `16.2.1`
- react `19.2.4`
- react-dom `19.2.4`

Dev dependencies:

- typescript `^5`
- tailwindcss `^4`
- @tailwindcss/postcss `^4`
- @types/node `^20`
- @types/react `^19`
- @types/react-dom `^19`
- babel-plugin-react-compiler `1.0.0`

You do not need to install these one by one. `npm install` will install everything from `package.json`.

## 2. Prerequisites

- Node.js 20+
- npm
- Backend API running (default expected: `http://127.0.0.1:8000`)

## 3. Install project dependencies

From this `frontend` folder:

```bash
npm install
```

## 4. Create environment file (`.env.local`)

Create a file named `.env.local` in the `frontend` root.

### Option A: Local machine (recommended for development)

```env
# URL used by frontend code
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000

# URL used by Next.js proxy route on server side
API_BASE_URL=http://127.0.0.1:8000
```

### Option B: LAN/mobile testing

Use your backend machine LAN IP:

```env
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.74:8000
API_BASE_URL=http://192.168.1.74:8000
```

### Option C: Production-style values

```env
NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com
API_BASE_URL=https://api.your-domain.com
```

## 5. Start development server

```bash
npm run dev
```

Frontend will run at:

- `http://localhost:3000`

## 6. Build and run production locally

```bash
npm run build
npm run start
```

## 7. Scripts you can use

- `npm run dev` -> start dev server
- `npm run build` -> create production build
- `npm run start` -> run built app

## 8. How API calls work in this frontend

This app uses a Next.js proxy route:

- Browser requests go to `/api/...`
- Proxy forwards to backend (`API_BASE_URL`)

So in development, browser avoids direct cross-origin calls to backend and uses same-origin `/api` first.

## 9. Quick checklist (in order)

1. Start backend API on port `8000` (or your chosen port).
2. Create `.env.local` with correct `NEXT_PUBLIC_API_BASE_URL` and `API_BASE_URL`.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

## 10. Common issues

### `Failed to fetch`

- Check backend is running and reachable.
- Verify `.env.local` URLs are correct.
- Restart frontend after changing env values.

### Works on desktop but not on phone

- Use LAN IP values in `.env.local` (not `127.0.0.1` if phone must reach backend directly).
- Ensure backend CORS and firewall allow your phone.

### Auth seems broken after env change

- Clear browser storage/cookies and log in again.
