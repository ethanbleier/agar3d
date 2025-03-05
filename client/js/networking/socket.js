// Socket.io client setup
// No import needed - we're using the global io object from the CDN

export class SocketManager {
    constructor() {
        this.socket = null;
        this.id = null;
        this.connected = false;
        this.eventListeners = {};
        this.reconnectionAttempts = 0;
        this.maxReconnectionAttempts = 10;
        // Automatically determine the server URL based on current location
        this.serverUrl = this.determineServerUrl();
        console.log('SocketManager initialized with server URL:', this.serverUrl);
    }
    
    // Helper to determine the appropriate server URL
    determineServerUrl() {
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const host = window.location.hostname;
        
        // Always use port 3000 for the game server regardless of the client port
        // This ensures all clients connect to the same server instance
        const serverPort = '3000';
        
        // If we're running locally
        if (host === 'localhost' || host === '127.0.0.1') {
            return `http://${host}:${serverPort}`;
        }
        
        // For preview or production, use same hostname but always port 3000
        return `${protocol}//${host}:${serverPort}`;
    }
    
    connect() {
        // Initialize socket connection with more resilient configuration
        console.log("Attempting to connect to:", this.serverUrl);
        
        // Generate a unique session ID to help with reconnections
        const sessionId = localStorage.getItem('socketSessionId') || 
                           Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
        
        // Store session ID in localStorage
        localStorage.setItem('socketSessionId', sessionId);
        
        this.socket = io(this.serverUrl, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000,
            autoConnect: true,
            query: {
                sessionId: sessionId
            },
            withCredentials: true,
            forceNew: false
        });
        
        // Add error handling for connection issues
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error.message);
            this.reconnectionAttempts++;
            
            // Display more details about the connection attempt
            console.warn(`Connection attempt ${this.reconnectionAttempts}/${this.maxReconnectionAttempts} failed`);
            
            if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
                console.error('Maximum reconnection attempts reached, please refresh the page');
                
                // Display error message to user
                const messageElement = document.getElementById('messages');
                if (messageElement) {
                    messageElement.innerHTML = `
                        <div class="message error">
                            <p>Connection to server failed after multiple attempts.</p>
                            <p>Please refresh the page to try again.</p>
                        </div>
                    `;
                }
            }
            
            this.triggerEvent('connect_error', error);
        });
        
        // Set up basic event handlers
        this.socket.on('connect', () => {
            this.connected = true;
            this.id = this.socket.id;
            this.reconnectionAttempts = 0;
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
        
        // Player count update
        this.socket.on('playerCount', (data) => {
            console.log('Player count update:', data);
            this.triggerEvent('playerCount', data);
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
        
        // Mass orb events
        this.socket.on('massEjected', (massData) => {
            console.log('Mass ejected:', massData);
            this.triggerEvent('massEjected', massData);
        });
        
        this.socket.on('massConsumed', (massId) => {
            console.log('Mass consumed:', massId);
            this.triggerEvent('massConsumed', massId);
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