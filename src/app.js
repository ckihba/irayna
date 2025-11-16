/* app.js - Basic visual graph editor with runtime communication */

// Node, Edge, Graph classes for the frontend
class Node {
  constructor(id, x, y, data = {}) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.data = data;
    this.highlight = 'idle';
  }
}

class Edge {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }
}

class Graph {
  constructor() {
    this.nodes = [];
    this.edges = [];
  }
  addNode(node) {
    this.nodes.push(node);
  }
  addEdge(edge) {
    this.edges.push(edge);
  }
  toJSON() {
    return {
      nodes: this.nodes.map(n => ({ id: n.id, x: n.x, y: n.y, data: n.data })),
      edges: this.edges.map(e => ({ from: e.from, to: e.to }))
    };
  }
}

// Setup canvas and graph
const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const graph = new Graph();
let nextNodeIndex = 1;

// Draw function
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // draw edges
  graph.edges.forEach(edge => {
    const from = graph.nodes.find(n => n.id === edge.from);
    const to = graph.nodes.find(n => n.id === edge.to);
    if (from && to) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = '#888';
      ctx.stroke();
    }
  });
  // draw nodes
  graph.nodes.forEach(node => {
    let fill = '#ddd';
    if (node.highlight === 'running') fill = '#fbe983';
    if (node.highlight === 'completed') fill = '#b0e57c';
    ctx.fillStyle = fill;
    ctx.fillRect(node.x - 40, node.y - 20, 80, 40);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(node.x - 40, node.y - 20, 80, 40);
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.fillText(node.id, node.x - 35, node.y - 5);
    if (node.data && node.data.value) {
      ctx.fillText(String(node.data.value), node.x - 35, node.y + 15);
    }
  });
}

// Add node
document.getElementById('addNodeBtn').addEventListener('click', () => {
  const node = new Node('node' + nextNodeIndex++, 100 + Math.random() * (canvas.width - 200), 50 + Math.random() * (canvas.height - 100), { value: '' });
  graph.addNode(node);
  draw();
});

// Add edge - connect the last two nodes
document.getElementById('addEdgeBtn').addEventListener('click', () => {
  if (graph.nodes.length >= 2) {
    const len = graph.nodes.length;
    const from = graph.nodes[len - 2];
    const to = graph.nodes[len - 1];
    graph.addEdge(new Edge(from.id, to.id));
    draw();
  }
});

// Share data across nodes
document.getElementById('shareDataBtn').addEventListener('click', () => {
  if (graph.nodes.length > 0) {
    const value = prompt('Enter value to propagate:', '');
    if (value !== null) {
      graph.nodes.forEach(node => {
        node.data.value = value;
      });
      draw();
    }
  }
});

// WebSocket for backend runtime
let socket;
document.getElementById('runBtn').addEventListener('click', () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    socket = new WebSocket('ws://localhost:3000');
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ action: 'run', graph: graph.toJSON() }));
    });
    socket.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'update') {
        const node = graph.nodes.find(n => n.id === msg.nodeId);
        if (node) {
          node.highlight = msg.status;
          if (msg.data) {
            node.data.value = msg.data;
          }
          draw();
        }
      }
    });
    socket.addEventListener('close', () => {
      console.log('Socket closed');
    });
  } else {
    socket.send(JSON.stringify({ action: 'run', graph: graph.toJSON() }));
  }
});
