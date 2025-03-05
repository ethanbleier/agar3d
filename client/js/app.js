// Main client entry point for Agar3D

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Game } from './game/index.js';
import { SocketManager } from './networking/socket.js';
import { UI } from './ui/ui.js';

// Global variables
let game;
let socketManager;
let ui;

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    init();
    animate();
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
}

// Start the game with the given username
function startGame(username) {
    // Hide start screen
    ui.hideStartScreen();
    
    // Initialize socket connection
    socketManager = new SocketManager();
    socketManager.connect();
    
    // Initialize the game
    game = new Game({
        containerId: 'game-container',
        username: username,
        socketManager: socketManager
    });
    
    // Set up socket event listeners
    setupSocketListeners();
    
    // Show game UI
    ui.showGameUI();
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
    
    socketManager.on('foodSpawned', (food) => {
        game.addFood(food);
    });
    
    socketManager.on('foodConsumed', (foodId) => {
        game.removeFood(foodId);
    });
    
    socketManager.on('leaderboard', (leaderboard) => {
        ui.updateLeaderboard(leaderboard);
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (game) {
        game.update();
        game.render();
    }
}

// Handle window resize
function onWindowResize() {
    if (game) {
        game.onWindowResize();
    }
}

// Handle key presses
document.addEventListener('keydown', (event) => {
    if (game) {
        game.handleKeyDown(event);
    }
});

// Handle key releases
document.addEventListener('keyup', (event) => {
    if (game) {
        game.handleKeyUp(event);
    }
});

// Handle mouse movement for direction
document.addEventListener('mousemove', (event) => {
    if (game) {
        game.handleMouseMove(event);
    }
});

// Handle mouse click for actions (e.g., splitting)
document.addEventListener('click', (event) => {
    if (game) {
        game.handleClick(event);
    }
});