// Updated Main client entry point for Agar3D

import { Game } from './game/index.js';
import { SocketManager } from './networking/socket.js';
import { THREE, OrbitControls } from './lib/three-instance.js';

let game;
let socketManager;
let animationFrameId; // To store the animation frame ID

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
}

// Game loop function that updates and renders the game
function gameLoop() {
    if (game) {
        console.log('Game loop running - update and render');
        game.update();
        game.render();
    }
    animationFrameId = requestAnimationFrame(gameLoop);
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
    
    // Set up socket event listeners
    setupSocketListeners();
    
    // Start game loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
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