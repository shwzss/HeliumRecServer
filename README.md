# HeliumRecServer (custom-node-server branch)

This branch adds a Node.js skeleton for running a custom Rec Room (2023) server replacement that you can adapt to work with the Photon-based client by swapping keys/addresses in the client.

What I added in this commit:
- WebSocket server skeleton (src/index.js) that accepts query-token authentication and persists minimal user data
- Protocol stub (src/protocol.js) — where Rec Room / Photon packet parsing should be implemented
- Auth helpers (src/auth.js) for Steam/RecNet token verification (placeholders that call configured endpoints)
- SQLite persistence (src/storage.js)
- Admin console (src/admin.js) with basic auth and endpoints to list connections and broadcast messages
- Logger and test client
- package.json with dependencies

Environment variables (set in .env):
- PORT (default 5055) — WebSocket server port
- ADMIN_PORT (default 5056) — Admin HTTP server port
- LOG_LEVEL — winston log level (info/debug/...)
- STEAM_WEB_API_KEY — Steam Web API key (if you plan to use Steam verification)
- RECNET_VERIFY_URL — RecNet verification endpoint to POST { token }
- SQLITE_FILE — path for the SQLite DB file (default ./helium.db)
- ADMIN_USER / ADMIN_PASS — optional Basic auth for admin console

How to run:
1. Copy `.env.example` to `.env` and fill in the variables you need.
2. npm install
3. npm start
4. Admin console: http://localhost:5056 (use basic auth if ADMIN_USER/ADMIN_PASS set)

Notes about Photon & Rec Room:
- The client uses Photon; this skeleton provides a WebSocket entry point you can use for reverse engineering and testing. Photon traffic is binary and has its own framing — you'll need to implement Photon protocol handling inside src/protocol.js (or add a UDP/TCP transport if Photon expects that).
- You said you can replace Photon keys and localhost yourself — good. Put the Photon server host/port to point to this process and replace any required AppId/AppVersion in the client.

Next steps I can take after you confirm:
- Implement Photon framing and basic handshake to accept a 2023 Rec Room client (requires packet captures or protocol docs).
- Implement Steam/RecNet direct verification flow if you provide endpoints or tokens to test.
- Add more persistence (Redis) and matchmaking logic.
