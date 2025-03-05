// server/index.js - Main server entry point

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { GameServer } = require('./game/gameServer');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Initialize Socket.io server
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
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