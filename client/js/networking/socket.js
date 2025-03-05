// Socket.io client setup

import io from 'socket.io-client';

export class SocketManager {
    constructor() {
        this.socket = null;
        this.id = null;
        this.connected = false;
        this.eventListeners = {};
        // Automatically determine the server URL based on current location
        this.serverUrl = this.determineServerUrl();
    }
    
    // Helper to determine the appropriate server URL
    determineServerUrl() {
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const host = window.location.hostname;
        
        // If we're running locally
        if (host === 'localhost' || host === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        
        // For preview or production, use same hostname but port 3000
        return `${protocol}//${host}:3000`;
    }
    
    connect() {
        // Initialize socket connection with more resilient configuration
        console.log("Attempting to connect to:", this.serverUrl);
        this.socket = io(this.serverUrl, {
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000,
            autoConnect: true
        });
        
        // Add error handling for connection issues
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error.message);
            this.triggerEvent('connect_error', error);
        });
        
        // Set up basic event handlers
        this.socket.on('connect', () => {
            this.connected = true;
            this.id = this.socket.id;
            console.log('Connected to server with ID:', this.id);
            
            // Trigger event listeners
            this.triggerEvent('connect', this.id);
        });
        
        this.socket.on('disconnect', () => {
            this.connected = false;
            console.log('Disconnected from server');
            
            // Trigger event listeners
            this.triggerEvent('disconnect');
        });
        
        // Set up game-specific event handlers
        this.setupGameEvents();
    }
    
    setupGameEvents() {
        // Server -> Client events
        
        // Player events
        this.socket.on('playerJoined', (data) => {
            console.log('Player joined:', data);
            this.triggerEvent('playerJoined', data);
        });
        
        this.socket.on('playerLeft', (id) => {
            console.log('Player left:', id);
            this.triggerEvent('playerLeft', id);
        });
        
        // Game state update (positions, sizes, etc.)
        this.socket.on('gameState', (gameState) => {
            this.triggerEvent('gameState', gameState);
        });
        
        // Food events
        this.socket.on('foodSpawned', (food) => {
            this.triggerEvent('foodSpawned', food);
        });
        
        this.socket.on('foodConsumed', (data) => {
            this.triggerEvent('foodConsumed', data.foodId);
            
            // If the local player consumed the food, trigger growth event
            if (data.playerId === this.id) {
                this.triggerEvent('playerGrew', data.amount);
            }
        });
        
        // Player actions results
        this.socket.on('playerSplit', (data) => {
            this.triggerEvent('playerSplit', data);
        });
        
        this.socket.on('playerBoosted', (data) => {
            this.triggerEvent('playerBoosted', data);
        });
        
        // Leaderboard update
        this.socket.on('leaderboard', (leaderboard) => {
            this.triggerEvent('leaderboard', leaderboard);
        });
        
        // Server messages (announcements, errors, etc.)
        this.socket.on('serverMessage', (message) => {
            console.log('Server message:', message);
            this.triggerEvent('serverMessage', message);
        });
        
        // Virus events
        this.socket.on('virusSpawned', (virusData) => {
            console.log('Virus spawned:', virusData);
            this.triggerEvent('virusSpawned', virusData);
        });
        
        this.socket.on('virusConsumed', (data) => {
            console.log('Virus consumed:', data);
            this.triggerEvent('virusConsumed', data);
        });
        
        this.socket.on('playerPopped', (data) => {
            console.log('Player popped:', data);
            this.triggerEvent('playerPopped', data);
        });
    }
    
    // Client -> Server events
    
    // Join the game
    joinGame(playerData) {
        if (!this.connected) return;
        this.socket.emit('joinGame', playerData);
    }
    
    // Update player position and rotation
    updatePosition(positionData) {
        if (!this.connected) return;
        this.socket.emit('updatePosition', positionData);
    }
    
    // Player actions
    splitPlayer() {
        if (!this.connected) return;
        this.socket.emit('splitPlayer');
    }
    
    boostPlayer() {
        if (!this.connected) return;
        this.socket.emit('boostPlayer');
    }
    
    // Generic event emitter
    emit(event, data) {
        if (!this.connected) return;
        this.socket.emit(event, data);
    }
    
    // Event listener management
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }
    
    off(event, callback) {
        if (!this.eventListeners[event]) return;
        
        if (callback) {
            // Remove specific callback
            this.eventListeners[event] = this.eventListeners[event].filter(
                (cb) => cb !== callback
            );
        } else {
            // Remove all callbacks for this event
            delete this.eventListeners[event];
        }
    }
    
    triggerEvent(event, data) {
        if (!this.eventListeners[event]) return;
        
        for (const callback of this.eventListeners[event]) {
            callback(data);
        }
    }
    
    // Clean up on disconnect
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.id = null;
            this.connected = false;
            this.eventListeners = {};
        }
    }
}