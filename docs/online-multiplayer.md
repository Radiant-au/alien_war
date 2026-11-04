# Online private rooms

Online is a third mode alongside Local and VS AI. Players need no account. A room is unlisted, and anyone with its six-character code or invite link can join until it fills. The capacity is exactly 2, 3, or 4; the creator can start only after every slot is occupied, connected, and ready. Ship changes and membership changes clear readiness. Duplicate ships are allowed.

## Local development (Node.js 24+)

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` for the Vite client, or use its localhost default in development.
3. Run `npm run dev:server` in one terminal.
4. Run `npm run dev` in another terminal.
5. Open two separate browser tabs at `http://localhost:5173`. Choose New Game → Online, create a room in one tab and join by code in the other. Each tab has its own reconnect session.

The Node server reads its environment from the hosting platform or shell; it does not automatically read `.env.local`. Example: `ALLOWED_ORIGINS=http://localhost:5173 PORT=3001 npm run start:server`.

For LAN testing, serve Vite with `npm run dev -- --host 0.0.0.0`, set `VITE_MULTIPLAYER_URL` to the server laptop's LAN URL, and include the exact frontend LAN origin in `ALLOWED_ORIGINS`. All devices must be able to reach those ports. Clipboard access may be unavailable over LAN HTTP; the UI displays the link/code for manual copying.

## Deploying the feature branch

Keep Cloudflare Pages production tracking `main`. Build this PR/develop only as a preview while testing. The existing frontend build is still `npm run build`, with output `dist`.

The Node multiplayer service is a separate, continuously running process. Deploy it to a Node 24 host/container with WebSocket support and HTTPS termination. It cannot be deployed as part of the static Pages output.

- Build a container with `docker build -f Dockerfile.multiplayer -t alien-war-multiplayer .`, or install dependencies and run `npm run start:server` on a Node 24 host.
- Set the server's `PORT` as required by the host.
- Set `ALLOWED_ORIGINS` to exact allowed frontend origins, separated by commas, e.g. `https://develop.example.pages.dev,https://your-game.example`. This checks both WebSocket and polling origins. Preview commit URLs must be added explicitly if used; prefer a stable branch preview URL.
- In the Cloudflare Pages **preview** environment, set `VITE_MULTIPLAYER_URL=https://your-multiplayer-server.example`, then rebuild the preview. This is a public server address, never a secret.
- Verify `/health` returns `{"ok":true}` and test two browsers before merging anything into `main`.
- For Nginx, proxy `/socket.io/` to the Node service, forward `Upgrade` and `Connection` headers, use HTTP/1.1, and allow idle connections longer than 60 seconds. Do not cache socket traffic.

No Cloudflare settings or hosted services are changed by this code/PR.

## Match authority and synchronization

The server owns a fixed 120 Hz combat simulation. It reuses the game's terrain, movement, projectile collision, spell damage, poison, burn, and support functions. Clients send commands, never health or crater results. Each command is validated for session ownership, active player, match ID, turn, sequence, and payload ranges. Movement inputs expire after 300 ms to prevent stuck movement. Input is sent at most ten times per second; snapshots broadcast at twenty times per second.

Client snapshots omit camera, viewport, and pointer state. Terrain is sent initially and whenever its revision changes. Browsers interpolate positions and play existing procedural effects from numbered visual events; they do not independently calculate online damage. A bounded event history prevents duplicate effects. Session recovery sends a complete state and skips historical effects.

The room creator controls the lobby only. Leaving does not terminate the hosted simulation. Local pause and portrait rotation block that device's input; they do not pause the shared match.

## Disconnects and lifecycle

A disconnected player's slot is reserved for 30 seconds. Movement stops immediately. Any current shot/impact/settling finishes, then match progression waits at a safe boundary. Rejoining with the private per-tab session token restores the player, command sequence, and full state. Reloading the tab resumes automatically after the opening loader. Room codes are invitation identifiers; reconnect tokens are separate and never included in invitations or room broadcasts.

After 30 seconds the player forfeits. Survivors continue; the last player wins. Explicitly leaving forfeits immediately. Lobby ownership transfers when its creator leaves. Empty rooms are deleted. Abandoned lobbies expire after 30 minutes. After the result, Return to Lobby resets the room for all connected players; everyone readies again.

## Limits

Rooms live in one process's memory. Restarting/redeploying the service loses rooms and reconnect sessions. Run **one instance** initially; horizontal scaling requires a shared room/simulation design, not just a load balancer. There are no accounts, matchmaking, spectators, saved matches, AI in online rooms, or persistent rankings. Mobile browsers may suspend sockets in the background, which invokes the same reconnect/forfeit policy. A pause overlay does not suspend the server's status damage. Long network interruptions may skip some cosmetic effects, while state remains authoritative.

## Validation

- `npm test`: existing Local/VS AI regression suite.
- `npm run test:online`: room lifecycle, two-to-four-player rules, real Socket.IO clients, room isolation, all weapon volleys, support, command validation, reconnect/forfeit, and serialization tests.
- `npm run build` and `npm run check:server`: frontend and server type checks/build.
