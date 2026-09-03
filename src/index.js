const dotenv = require('dotenv');
dotenv.config();

const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const logger = require('./logger');
const protocol = require('./protocol');
const auth = require('./auth');
const storage = require('./storage');

const PORT = process.env.PORT || 5055;

(async () => {
  await storage.init();

  // Start WebSocket server on its own HTTP server so we can inspect req.url
  const server = http.createServer((req, res) => {
    // Provide a minimal informational page for HTTP GETs so browsers don't see "Cannot GET /"
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body>
        <h1>HeliumRecServer</h1>
        <p>This port is a WebSocket endpoint. Connect using a WebSocket client.</p>
        <p>Server listens on ws://0.0.0.0:${PORT}</p>
      </body></html>`);
      return;
    }
    // leave other requests to return 404
    res.writeHead(404); res.end('Not Found');
  });

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
})();
