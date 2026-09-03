const dotenv = require('dotenv');
dotenv.config();

const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const logger = require('./logger');
const protocol = require('./protocol');
const auth = require('./auth');
const storage = require('./storage');
const admin = require('./admin');

const PORT = process.env.PORT || 5055;
const ADMIN_PORT = process.env.ADMIN_PORT || 5056;

(async () => {
  await storage.init();

  // Start WebSocket server on its own HTTP server so we can inspect req.url
  const server = http.createServer();
  const wss = new WebSocket.Server({ noServer: true });

  const connections = new Map(); // key -> { ws, user }

  server.on('upgrade', async (req, socket, head) => {
    // Parse query params for tokens/metadata
    const parsed = url.parse(req.url, true);
    const { tokenType, token } = parsed.query || {};

    wss.handleUpgrade(req, socket, head, (ws) => {
      // Attach metadata
      ws._meta = { remote: req.socket.remoteAddress + ':' + req.socket.remotePort };

      // Optionally verify token before accepting
      (async () => {
        let user = null;
        if (token && tokenType) {
          try {
            if (tokenType === 'steam') {
              user = await auth.verifySteamToken(token);
            } else if (tokenType === 'recnet') {
              user = await auth.verifyRecNetToken(token);
            }
          } catch (err) {
            logger.warn('Auth verification failed, closing connection', { err: err.message });
            ws.close(4001, 'auth_failed');
            return;
          }
        }

        // Store connection and user
        const id = `${ws._meta.remote}-${Date.now()}-${Math.random().toString(16).slice(2,8)}`;
        connections.set(id, { ws, user, connectedAt: Date.now() });

        // Persist user if available
        if (user && user.id) {
          try { await storage.saveOrUpdateUser(user); } catch (err) { logger.error('Failed to persist user', err); }
        }

        // Wire events
        ws.on('message', (data) => {
          logger.debug(`Received ${Buffer.isBuffer(data) ? data.length : data.toString().length} bytes from ${ws._meta.remote}`);
          protocol.handlePacket(ws, data, { remote: ws._meta.remote, user });
        });

        ws.on('close', (code, reason) => {
          logger.info(`Connection closed ${ws._meta.remote} code=${code} reason=${reason}`);
          // remove from map
          connections.forEach((v, k) => { if (v.ws === ws) connections.delete(k); });
        });

        ws.on('error', (err) => logger.error(`Connection error ${ws._meta.remote}: ${err.stack || err}`));

        // Send welcome / handshake placeholder
        try { ws.send(Buffer.from('HELLO_FROM_HELIUM_SERVER')); } catch (err) { logger.error('Failed to send welcome', err); }

      })();
    });
  });

  server.listen(PORT, () => logger.info(`HeliumRecServer WebSocket listening on ws://0.0.0.0:${PORT}`));

  // Start admin console (HTTP) bound to ADMIN_PORT
  admin.start({ port: ADMIN_PORT, getConnections: () => connections });
})();
