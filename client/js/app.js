// Updated Main client entry point for Agar3D

import { Game } from './game/index.js';
import { SocketManager } from './networking/socket.js';
import { THREE, OrbitControls } from './lib/three-instance.js';

let game;
let socketManager;
let animationFrameId; // To store the animation frame ID
let lastTimestamp = 0;
let frameCount = 0;
let lastFpsUpdate = 0;

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    init();
});

// Initialize all components
function init() {
    // Handle start button click
    document.getElementById('start-button').addEventListener('click', () => {
        const username = document.getElementById('username-input').value.trim();
        if (username) {
            startGame(username);
        } else {
            alert('Please enter a username');
        }
    });

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Prevent context menu on right-click for the game container
    document.getElementById('game-container').addEventListener('contextmenu', (event) => {
        event.preventDefault();
        return false;
    });
    
    // Start a timer to update the server time
    updateServerTime();
    setInterval(updateServerTime, 1000);
}

// Game loop function that updates and renders the game
function gameLoop(timestamp) {
    // Calculate FPS
    if (!lastTimestamp) {
        lastTimestamp = timestamp;
    }
    
    frameCount++;
    const elapsed = timestamp - lastFpsUpdate;
    
    // Update FPS counter approximately every second
    if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        document.getElementById('fps-counter').textContent = fps;
        
        // Reset for next update
        lastFpsUpdate = timestamp;
        frameCount = 0;
        
        // Also update player count if the game is running
        if (game && game.players) {
            document.getElementById('players-count').textContent = game.players.size;
        }
    }
    
    if (game) {
        game.update();
        game.render();
        
        // Update UI with player stats if local player exists
        if (game.localPlayer) {
            document.getElementById('player-mass').textContent = Math.floor(game.localPlayer.mass);
            document.getElementById('player-score').textContent = Math.floor(game.localPlayer.score || 0);
        }
    }
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Update server time in HH:MM format
function updateServerTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('server-time').textContent = `${hours}:${minutes}`;
}

// Start the game with the given username
function startGame(username) {
    // Hide start screen
    document.getElementById('start-screen').style.display = 'none';
    
    // Show game UI
    document.getElementById('game-ui').style.display = 'block';
    
    console.log('Starting game with username:', username);
    
    // Generate a random color for the player
    const playerColor = new THREE.Color(Math.random(), Math.random(), Math.random());
    
    // Initialize socket manager first to ensure connection
    socketManager = new SocketManager();
    socketManager.connect();
    
    // Set up basic socket event listeners
    setupSocketListeners();
    
    // Create game instance with socket manager
    game = new Game({
        containerId: 'game-container',
        socketManager: socketManager,
        username: username,
        playerColor: playerColor.getHex()
    });
    
    // When socket is connected, join the game
    if (socketManager.connected) {
        // Already connected, join immediately
        socketManager.joinGame({
            username: username,
            color: playerColor.getHex()
        });
    }
    // Otherwise the connect handler in setupSocketListeners will handle joining
    
    // Start game loop with timestamp
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Set up socket event listeners
function setupSocketListeners() {
    socketManager.on('connect', () => {
        console.log('Connected to server with ID:', socketManager.id);
        
        // If game exists, join game with username
        if (game && game.username) {
            socketManager.joinGame({
                username: game.username,
                color: game.playerColor
            });
        }
    });
    
    socketManager.on('disconnect', () => {
        console.log('Disconnected from server');
        // Show disconnection message
        const messages = document.getElementById('messages');
        messages.innerHTML = `
            <div class="message error">
                <p>Disconnected from server.</p>
                <p>Attempting to reconnect...</p>
            </div>
        `;
    });
    
    // Player count updates
    socketManager.on('playerCount', (data) => {
        document.getElementById('players-count').textContent = data.count;
        console.log(`Player count updated: ${data.count}/${data.max}`);
    });
    
    // Handle leaderboard updates
    socketManager.on('leaderboard', (leaderboardData) => {
        updateLeaderboard(leaderboardData);
    });
    
    // Note: Other game-specific events like playerJoined, playerLeft, gameState
    // are now handled directly in the Game class setupSocketEvents method
}

// Update the leaderboard UI with current data
function updateLeaderboard(leaderboardData) {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;
    
    // Clear existing entries
    leaderboardList.innerHTML = '';
    
    // Add new entries
    leaderboardData.forEach((player) => {
        const listItem = document.createElement('li');
        
        // Highlight the local player
        if (game && game.localPlayerId === player.id) {
            listItem.className = 'local-player';
        }
        
        listItem.innerHTML = `
            <span class="rank">${player.rank}</span>
            <span class="username">${player.username}</span>
            <span class="score">${player.mass}</span>
        `;
        
        leaderboardList.appendChild(listItem);
    });
}

function onWindowResize() {
    if (game) {
        game.onWindowResize();
    }
}