/* server.js - simple backend runtime for Irayna visual editor */

const http = require('http');
const WebSocket = require('ws');

// Create HTTP server (optional)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Irayna backend running\n');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      if (msg.action === 'run' && msg.graph) {
        const graph = msg.graph;
        // Iterate over edges and simulate run
        graph.edges.forEach((edge, index) => {
          // Send start update
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'update',
              nodeId: edge.to,
              status: 'running',
              data: `Data from ${edge.from}`
            }));
            // Send completion update
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'update',
                nodeId: edge.to,
                status: 'completed',
                data: `Result at ${edge.to}`
              }));
            }, 500);
          }, index * 1000);
        });
      }
    } catch (err) {
      console.error(err);
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Workflow engine listening on port ${PORT}`);
});
