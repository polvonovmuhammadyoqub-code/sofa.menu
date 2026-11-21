import http from 'node:http';
import createApp from './app.js';
import config from './config.js';
import { initSocket } from './services/socket.js';

const server = http.createServer(createApp({ guestOnly: true }));
initSocket(server);

server.listen(config.port, '0.0.0.0', () => {
  console.log(`SOFA guest menu listening on port ${config.port}`);
});
