import { parentPort, isMainThread } from 'worker_threads';
import http from 'http';

const PORT = 8000;

if (isMainThread) {
  throw new Error('This script should only be run as a worker');
}

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Render');
});

server.listen(PORT, () => {
  parentPort?.postMessage(`Web server started on port ${PORT}`);
});