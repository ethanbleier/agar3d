// server/index.js - Main server entry point

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { GameServer } = require('./game/gameServer');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure CORS for Express
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Initialize Socket.io server
const io = new Server(server, {
    cors: {
        origin: '*',  // Allow all origins
        methods: ['GET', 'POST'],
        credentials: false
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 30000,
    allowEIO3: true
});

// Set up routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Initialize game server
const gameServer = new GameServer(io);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Agar3D server running on port ${PORT}`);
    console.log(`Game world size: ${gameServer.worldSize.x} x ${gameServer.worldSize.y} x ${gameServer.worldSize.z}`);
    console.log(`Maximum players: ${gameServer.maxPlayers}`);
    console.log(`Food count: ${gameServer.maxFood}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    gameServer.shutdown();
    server.close(() => {
        console.log('Server shut down.');
        process.exit(0);
    });
});