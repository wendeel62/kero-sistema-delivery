const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;
console.log('Starting UI server on port', PORT);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Serve WhatsApp React interface
app.get('/whatsapp', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve dashboard for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Serve static files from public
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`WhatsApp UI server running on port ${PORT}`);
});