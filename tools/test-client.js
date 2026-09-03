// Simple test client that connects to the WebSocket server and sends a message.
// Use this to verify the skeleton server accepts a connection and replies.
const WebSocket = require('ws');

const url = process.argv[2] || 'ws://localhost:5055?tokenType=recnet&token=dummy';
const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('connected to server', url);
  // send a small binary payload (example)
  ws.send(Buffer.from([0x01, 0x02, 0x03, 0x04]));
});

ws.on('message', (data) => {
  console.log('received reply:', data);
  ws.close();
});

ws.on('error', (err) => console.error('client error', err));
