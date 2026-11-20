import http from 'http';
import createApp from './app.js';
import config from './config.js';
import { initSocket } from './services/socket.js';

const app = createApp();
const server = http.createServer(app);

// Initialize real-time Socket.io
initSocket(server);

server.listen(config.port, () => {
  console.log(`✨ SOFA Server running on http://localhost:${config.port}`);
  console.log(`✨ Socket.io real-time engine active`);
});
