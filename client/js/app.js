// Updated Main client entry point for Agar3D

import { Game } from './game/index.js';
import { SocketManager } from './networking/socket.js';
import { UI } from './ui/ui.js';
import { THREE, OrbitControls } from './lib/three-instance.js';


let game;
let socketManager;
let ui;
let animationFrameId; // To store the animation frame ID

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    init();
});

// Initialize all components
function init() {
    // Initialize UI (username input, leaderboard, etc.)
    ui = new UI();
    ui.showStartScreen();

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
    
    // Add instructions about mouse capture to the UI
    const instructions = document.querySelector('.instructions ul');
    if (instructions) {
        const mouseCaptureItem = document.createElement('li');
        mouseCaptureItem.textContent = 'Click in game to capture mouse, ESC or L to release';
        instructions.appendChild(mouseCaptureItem);
        
        const rightClickItem = document.createElement('li');
        rightClickItem.textContent = 'Right Click: Boost';
        instructions.appendChild(rightClickItem);
        
        const cameraItem = document.createElement('li');
        cameraItem.textContent = 'C: Change camera view';
        instructions.appendChild(cameraItem);
    }
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
    ui.hideStartScreen();
    
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
    
    // Show game UI
    ui.showGameUI();
    
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
}

function onWindowResize() {
    if (game) {
        game.onWindowResize();
    }
}