# GG Meet Frontend

## Run Locally

Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Run With Docker

Build and start the production container:

```bash
docker compose up --build -d
```

If your Docker installation still uses the legacy CLI, run `docker-compose up --build -d` instead.

The frontend will be available at [http://localhost:3000](http://localhost:3000).

Default Docker assumptions:

- Backend API is reachable from the browser at `http://localhost:8080/api`
- Backend API is reachable from inside the frontend container at `http://host.docker.internal:8080/api`
- LiveKit websocket is reachable at `ws://localhost:7880`
- Meeting socket endpoint is reachable at `http://localhost:8080/server`

You can override those values before running Docker. In PowerShell, for example:

```powershell
$env:BACKEND_INTERNAL_URL="http://backend:8080/api"
docker compose up --build -d
```

## Notes

- Docker Compose will reuse matching variables from the root `.env` file when they already exist. The defaults in `docker-compose.yml` are only used when a variable is missing.
- `NEXT_PUBLIC_*` variables are injected at build time, so rerun `docker compose up --build` after changing frontend-facing URLs.
- The production image uses Next.js `standalone` output to keep the runtime container smaller.
