const express = require('express');
const basicAuth = require('basic-auth');
const logger = require('./logger');

let serverInstance;

function ensureAuth(req, res, next) {
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) return next();
  const user = basicAuth(req);
  if (!user || user.name !== process.env.ADMIN_USER || user.pass !== process.env.ADMIN_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="HeliumRecAdmin"');
    return res.status(401).send('Authentication required');
  }
  return next();
}

function start({ port = 5056, getConnections }) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ ok: true }));

  app.use(ensureAuth);

  app.get('/connections', (req, res) => {
    const conns = [];
    const map = getConnections();
    map.forEach((v, k) => {
      conns.push({ id: k, user: v.user, connectedAt: v.connectedAt, remote: v.ws?._meta?.remote });
    });
    res.json(conns);
  });

  app.post('/broadcast', (req, res) => {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });
    const map = getConnections();
    let sent = 0;
    map.forEach((v) => {
      try { v.ws.send(typeof message === 'string' ? message : JSON.stringify(message)); sent++; } catch (e) { logger.warn('broadcast failed', e.message); }
    });
    res.json({ sent });
  });

  serverInstance = app.listen(port, () => logger.info(`Admin console listening on http://0.0.0.0:${port}`));
}

function stop() { if (serverInstance) serverInstance.close(); }

module.exports = { start, stop };
