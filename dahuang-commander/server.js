import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// CORS headers for Webhooks
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Serve static compiled React files from both root and subpath for absolute robustness
app.use('/commander', express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'dist')));

const server = createServer(app);
// Use explicit path for WebSocket connection to avoid conflicts on custom domains
const wss = new WebSocketServer({ server, path: '/commander/ws' });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  
  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Cloud Webhook Endpoint for Remote Agents
app.post(['/client/log', '/commander/client/log'], (req, res) => {
  const { type, message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  const payload = JSON.stringify({
    type: type || 'SYSTEM',
    message,
    timestamp: new Date().toTimeString().split(' ')[0]
  });

  // Broadcast to all connected web clients in real-time
  let count = 0;
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      count++;
    }
  }

  res.json({ status: 'ok', broadcastedTo: count });
});

// Fallback to index.html for Single Page Application (SPA) routing
app.get('/commander*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server on port 9090 (or environment override)
const PORT = process.env.PORT || 9090;
server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`📡 大荒指挥官云端网关服务启动成功！`);
  console.log(`🔗 网页端访问地址: http://localhost:${PORT}`);
  console.log(`🚀 外部 Agent 远程 Webhook 投递点: http://localhost:${PORT}/client/log`);
  console.log(`==================================================\n`);
});
