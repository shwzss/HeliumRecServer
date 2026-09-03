// protocol.js
// Minimal, protocol-agnostic handler. Replace parsing below with the real
// Rec Room 2023 packet parsing and responses once protocol details are available.

const logger = require('./logger');

function handlePacket(ws, data, meta) {
  logger.debug('protocol.handlePacket called', { length: Buffer.isBuffer(data) ? data.length : data.toString().length, remote: meta.remote, user: meta.user ? meta.user.id : null });

  if (Buffer.isBuffer(data)) {
    logger.silly('packet hex:', data.slice(0, 32).toString('hex'));
  } else {
    logger.silly('packet string:', data.toString());
  }

  // TODO: Implement Rec Room 2023 protocol (Photon/RecNet flows). For now, echo a small binary message back
  try {
    const reply = Buffer.from('SERVER_REPLY');
    ws.send(reply);
  } catch (err) {
    logger.error('Failed to send reply:', err);
  }
}

module.exports = { handlePacket };
