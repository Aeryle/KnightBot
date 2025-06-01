const http = require('http');

if (!process.env.RENDER_DEPLOY_URL)
{
    console.error('Invalid RENDER_DEPLOY_URL from ENV. Exiting...');
    process.exit(1);
}

function queryServer() {
  http.get(process.env.RENDER_DEPLOY_URL, (res) => {
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