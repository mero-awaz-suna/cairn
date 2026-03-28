# Cairn Frontend

Frontend app for Cairn built with Next.js 16 (App Router).

## Prerequisites

- Node.js 20+
- npm
- A running backend API (default: `http://127.0.0.1:8000`)

## Environment Setup

1. Create a local env file from the example:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

2. Update values in `.env.local` if needed:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## Install Dependencies

```bash
npm install
```

## Run in Development

```bash
npm run dev
```

App URL: [http://localhost:3000](http://localhost:3000)

## Build and Run Production

```bash
npm run build
npm run start
```

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Create production build
- `npm run start`: Start production server

## Notes

- Auth requests use the API base URL from `NEXT_PUBLIC_API_BASE_URL`.
- Register and login flows expect backend auth endpoints under `/auth/*`.
