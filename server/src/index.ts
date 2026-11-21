import http from 'http';
import createApp from './app.js';
import config from './config.js';
import { initSocket } from './services/socket.js';
import { startReservationNotifications } from './services/reservationNotifications.js';

const app = createApp();
const server = http.createServer(app);

// Initialize real-time Socket.io
initSocket(server);

server.listen(config.port, '0.0.0.0', () => {
  console.log(`✨ SOFA Server running on http://localhost:${config.port}`);
  console.log(`✨ Socket.io real-time engine active`);
  const notifications = startReservationNotifications();
  server.once('close', () => clearInterval(notifications));
});
