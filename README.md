# Support Inbox

A small support-ticket app: customers submit tickets, agents reply from an inbox.
One Expo codebase for web, iOS and Android; a TypeScript GraphQL API; Postgres.

## Day 1-2 setup

Prerequisites: Node 20+, Docker (for local Postgres), Git.

### 1. Database + API
```bash
docker compose up -d                 # Postgres on :5432
cd api
cp .env.example .env
npm install
npm run migrate                      # creates tables
npm run seed                         # 5 sample tickets
npm run dev                          # http://localhost:4000/graphql
```
Open http://localhost:4000/graphql and run:
```graphql
query { tickets { id subject status customerEmail } }
```

### 2. Expo app
From the repo root:
```bash
npx create-expo-app@latest app       # default template (TypeScript + Expo Router)
cd app
npm run reset-project                # clears the starter screens; answer "n" to keep app-example
cp -r ../app-overlay/app/index.tsx app/index.tsx
mkdir -p lib && cp ../app-overlay/lib/api.ts lib/api.ts
cp ../app-overlay/.env.example .env
npx expo start --web                 # press w for browser; scan QR with Expo Go for your phone
```
(If `reset-project` isn't in your template version, just delete the example screens and
put `index.tsx` in `app/` as the root route.)

### Day 1-2 done when
- [ ] The GraphQL query works in the browser playground
- [ ] The Expo web app shows the 5 seeded tickets
- [ ] The same screen shows them on your phone via Expo Go
- [ ] First commit pushed to GitHub, with a clear message

## Next (Day 3-5)
Auth, `createTicket` form screen, ticket detail screen. Ask me and I'll scaffold them.
