# ContentKosh Mobile (Expo)

## Setup

1. Install deps

```bash
npm install
```

2. Configure API base URL

Create `./.env` (copy from `./.env.example`) and set:

- `EXPO_PUBLIC_API_URL`

Examples:

- Android emulator (backend on your dev machine): `http://10.0.2.2:4000`
- iOS simulator (backend on your dev machine): `http://localhost:4000`
- Physical device: use your machine LAN IP, e.g. `http://192.168.1.50:4000`

3. Run

```bash
npm run start
```

The app uses axios with `withCredentials: true` so the backend’s cookie-based JWT auth works.

