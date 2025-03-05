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
    
    // Initialize socket connection
    socketManager = new SocketManager();
    socketManager.connect();
    
    // Initialize the game
    game = new Game({
        containerId: 'game-container',
        username: username,
        socketManager: socketManager
    });
    
    console.log('Game initialized, starting game loop');
    
    // Start the game loop with timestamp
    lastTimestamp = 0;
    frameCount = 0;
    lastFpsUpdate = 0;
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Set up socket event listeners
function setupSocketListeners() {
    socketManager.on('playerJoined', (data) => {
        game.addPlayer(data);
    });
    
    socketManager.on('playerLeft', (id) => {
        game.removePlayer(id);
    });
    
    socketManager.on('gameState', (gameState) => {
        game.updateGameState(gameState);
    });
    
    socketManager.on('foodSpawned', (foodData) => {
        game.addFood(foodData);
    });
    
    socketManager.on('foodConsumed', (data) => {
        game.removeFood(data.foodId);
    });
    
    // Add handlers for player splitting
    socketManager.on('playerSplit', (data) => {
        game.handlePlayerSplit(data);
    });
    
    // Add handlers for virus events
    socketManager.on('virusSpawned', (virusData) => {
        game.addVirus(virusData);
    });
    
    socketManager.on('virusConsumed', (virusId) => {
        game.removeVirus(virusId);
    });
    
    // Add handlers for mass orb events
    socketManager.on('massEjected', (massData) => {
        game.addMassOrb(massData);
    });
    
    socketManager.on('massConsumed', (massId) => {
        game.removeMassOrb(massId);
    });
    
    socketManager.on('playerPopped', (data) => {
        // Handle player popping from virus collision
        const { playerId, fragments } = data;
        
        // Get the player that popped
        const player = game.players.get(playerId);
        if (player) {
            // Update the original player size
            player.mass = fragments[0].mass;
            player.updateSize();
            
            // Create fragment players
            for (let i = 1; i < fragments.length; i++) {
                game.addPlayerFragment(fragments[i]);
            }
        }
    });
}

function onWindowResize() {
    if (game) {
        game.onWindowResize();
    }
}