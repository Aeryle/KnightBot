const http = require('http');

function queryServer() {
  http.get('http://127.0.0.1:10000/', (res) => {
    let data = '';

    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log(`[${new Date().toISOString()}] POLLING: Successfully polled to keep Render service alive.`);
    });
  }).on('error', (err) => {
    console.error(`[${new Date().toISOString()}] - POLLING: Error querying server:`, err.message);
  });
}

// Run every 5 minutes (300,000 milliseconds)
setInterval(queryServer, 300000);