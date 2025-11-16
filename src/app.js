/* app.js - Enhanced visual graph editor with runtime communication */

class Node {
  constructor(id, x, y, data = {}) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.data = data;
    this.status = 'idle';
    this.width = NODE_CONFIG.width;
    this.height = NODE_CONFIG.height;
  }
  get inputConnector() {
    return { x: this.x, y: this.y + this.height / 2 };
  }
  get outputConnector() {
    return { x: this.x + this.width, y: this.y + this.height / 2 };
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
  getNodeById(id) {
    return this.nodes.find((n) => n.id === id);
  }
}

const NODE_CONFIG = {
  width: 100,
  height: 50,
  colors: {
    idle: '#ddd',
    running: '#f7e464',
    completed: '#8fd88f',
  },
  borderRadius: 8,
};

const EDGE_CONFIG = {
  color: '#555',
};

const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const statusPanel = document.getElementById('statusPanel');
const graph = new Graph();
let nodeCounter = 1;
let draggingNode = null;
let offsetX = 0;
let offsetY = 0;

// Extend CanvasRenderingContext2D to draw rounded rectangles
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  this.beginPath();
  this.moveTo(x + r, y);
  this.arcTo(x + w, y, x + w, y + h, r);
  this.arcTo(x + w, y + h, x, y + h, r);
  this.arcTo(x, y + h, x, y, r);
  this.arcTo(x, y, x + w, y, r);
  this.closePath();
  return this;
};

// Draw the graph
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw edges
  graph.edges.forEach((edge) => {
    const fromNode = graph.getNodeById(edge.from);
    const toNode = graph.getNodeById(edge.to);
    if (fromNode && toNode) {
      ctx.beginPath();
      ctx.moveTo(fromNode.outputConnector.x, fromNode.outputConnector.y);
      ctx.lineTo(toNode.inputConnector.x, toNode.inputConnector.y);
      ctx.strokeStyle = EDGE_CONFIG.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });

  // Draw nodes
  graph.nodes.forEach((node) => {
    ctx.fillStyle = NODE_CONFIG.colors[node.status] || NODE_CONFIG.colors.idle;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.roundRect(node.x, node.y, node.width, node.height, NODE_CONFIG.borderRadius);
    ctx.fill();
    ctx.stroke();

    // Draw connectors
    ctx.beginPath();
    ctx.fillStyle = '#666';
    ctx.arc(node.inputConnector.x, node.inputConnector.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(node.outputConnector.x, node.outputConnector.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw node id
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.fillText(node.id, node.x + 10, node.y + 30);
  });
}

// Add node
window.addNode = function () {
  const n = new Node('node' + nodeCounter, 60 * nodeCounter, 60 * nodeCounter);
  nodeCounter++;
  graph.addNode(n);
  draw();
};

// Add edge connecting last two nodes
window.addEdge = function () {
  if (graph.nodes.length >= 2) {
    const from = graph.nodes[graph.nodes.length - 2].id;
    const to = graph.nodes[graph.nodes.length - 1].id;
    graph.addEdge(new Edge(from, to));
    draw();
  }
};

// Share data across nodes
window.shareData = function () {
  const key = prompt('Enter data key');
  if (!key) return;
  const value = prompt('Enter data value');
  graph.nodes.forEach((node) => {
    node.data[key] = value;
  });
};

// Handle dragging
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  for (const node of graph.nodes) {
    if (x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height) {
      draggingNode = node;
      offsetX = x - node.x;
      offsetY = y - node.y;
      return;
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (draggingNode) {
    const rect = canvas.getBoundingClientRect();
    draggingNode.x = e.clientX - rect.left - offsetX;
    draggingNode.y = e.clientY - rect.top - offsetY;
    draw();
  }
});

canvas.addEventListener('mouseup', () => {
  draggingNode = null;
});

// WebSocket
const backendHost = location.hostname.replace(/-\d+$/, '-3000');
const socket = new WebSocket('ws://' + backendHost);

socket.addEventListener('open', () => {
  appendStatus('Connected to runtime');
});

socket.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.action === 'node-status') {
    const node = graph.getNodeById(msg.nodeId);
    if (node) {
      node.status = msg.status;
      draw();
      appendStatus(`Node ${msg.nodeId} is ${msg.status}`);
    }
  }
});

// Run graph
window.runGraph = function () {
  const payload = {
    action: 'run',
    graph: {
      nodes: graph.nodes.map((n) => ({ id: n.id, data: n.data })),
      edges: graph.edges.map((e) => ({ from: e.from, to: e.to })),
    },
  };
  socket.send(JSON.stringify(payload));
  appendStatus('Sent graph to runtime');
};

// Status panel update
function appendStatus(text) {
  const div = document.createElement('div');
  div.textContent = text;
  statusPanel.appendChild(div);
  statusPanel.scrollTop = statusPanel.scrollHeight;
}
