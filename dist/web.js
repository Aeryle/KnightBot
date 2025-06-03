"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const http_1 = __importDefault(require("http"));
const PORT = 10000;
if (worker_threads_1.isMainThread) {
    throw new Error('This script should only be run as a worker');
}
const server = http_1.default.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Render');
});
server.listen(PORT, () => {
    worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage(`Web server started on port ${PORT}`);
});
