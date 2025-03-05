// Main game server logic

const { Vector3 } = require('three');
const { ServerPlayer } = require('./serverPlayer');
const { ServerFood } = require('./serverFood');
const { PhysicsSystem } = require('./physics');
const { v4: uuidv4 } = require('uuid');

class GameServer {
    constructor(io) {
        this.io = io;
        
        // Game settings
        this.worldSize = { x: 100, y: 100, z: 100 }; // World boundaries
        this.maxPlayers = 50;
        this.maxFood = 500;
        this.minFood = 300;
        this.foodSpawnRate = 5; // Food items per second
        this.tickRate = 30; // Updates per second
        
        // Game state
        this.players = new Map(); // Map of socket.id -> ServerPlayer
        this.foods = new Map();   // Map of foodId -> ServerFood
        this.isRunning = false;
        
        // Physics system
        this.physics = new PhysicsSystem(this.worldSize);
        
        // Initialize server
        this.init();
    }
    
    init() {
        // Set up socket handlers
        this.setupSocketHandlers();
        
        // Initialize food
        this.spawnInitialFood();
        
        // Start game loop
        this.startGameLoop();
        
        this.isRunning = true;
    }
    
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Player connected: ${socket.id}`);
            
            // Player joined the game
            socket.on('joinGame', (data) => {
                this.handlePlayerJoin(socket, data);
            });
            
            // Player position update
            socket.on('updatePosition', (data) => {
                this.handlePositionUpdate(socket.id, data);
            });
            
            // Player split action
            socket.on('splitPlayer', () => {
                this.handlePlayerSplit(socket.id);
            });
            
            // Player boost action
            socket.on('boostPlayer', () => {
                this.handlePlayerBoost(socket.id);
            });
            
            // Player disconnected
            socket.on('disconnect', () => {
                this.handlePlayerDisconnect(socket.id);
            });
        });
    }
    
    handlePlayerJoin(socket, data) {
        // Check if server is full
        if (this.players.size >= this.maxPlayers) {
            socket.emit('serverMessage', {
                type: 'error',
                message: 'Server is full. Please try again later.'
            });
            return;
        }
        
        // Create new player
        const player = new ServerPlayer({
            id: socket.id,
            username: data.username || 'Player ' + socket.id.substr(0, 5),
            position: this.getRandomSpawnPosition(),
            color: data.color || this.getRandomColor()
        });
        
        // Add player to game
        this.players.set(socket.id, player);
        
        // Notify player of successful join
        socket.emit('serverMessage', {
            type: 'success',
            message: 'You have joined the game.'
        });
        
        // Send current game state to new player
        this.sendGameState(socket.id);
        
        // Notify all players of new player
        socket.broadcast.emit('playerJoined', player.toClientData());
        
        console.log(`Player ${player.username} (${socket.id}) joined the game`);
    }
    
    handlePositionUpdate(playerId, data) {
        const player = this.players.get(playerId);
        if (!player) return;
        
        // Update player position from client
        if (data.position) {
            player.setPositionFromClient(data.position);
        }
        
        // Update player rotation from client
        if (data.rotation) {
            player.setRotationFromClient(data.rotation);
        }
    }
    
    handlePlayerSplit(playerId) {
        const player = this.players.get(playerId);
        if (!player || player.mass < 2) return;
        
        // Implement splitting logic (will be added in the future)
        console.log(`Player ${player.username} (${playerId}) attempted to split`);
    }
    
    handlePlayerBoost(playerId) {
        const player = this.players.get(playerId);
        if (!player || player.mass < 2) return;
        
        // Implement boosting logic (will be added in the future)
        console.log(`Player ${player.username} (${playerId}) attempted to boost`);
    }
    
    handlePlayerDisconnect(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;
        
        console.log(`Player ${player.username} (${playerId}) disconnected`);
        
        // Remove player from game
        this.players.delete(playerId);
        
        // Notify all players
        this.io.emit('playerLeft', playerId);
    }
    
    startGameLoop() {
        const tickInterval = 1000 / this.tickRate;
        this.gameLoopInterval = setInterval(() => {
            this.update(tickInterval / 1000); // Convert to seconds
        }, tickInterval);
        
        console.log(`Game loop started with tick rate of ${this.tickRate}Hz`);
    }
    
    update(deltaTime) {
        if (!this.isRunning) return;
        
        // Spawn food if needed
        this.updateFood(deltaTime);
        
        // Update physics (collisions, etc.)
        this.physics.update(deltaTime, this.players, this.foods);
        
        // Send game state to all players
        this.broadcastGameState();
        
        // Update leaderboard
        this.updateLeaderboard();
    }
    
    spawnInitialFood() {
        // Spawn initial food
        for (let i = 0; i < this.maxFood; i++) {
            this.spawnFood();
        }
        
        console.log(`Spawned ${this.foods.size} initial food items`);
    }
    
    updateFood(deltaTime) {
        // Spawn new food at a certain rate
        if (this.foods.size < this.minFood) {
            const foodToSpawn = Math.min(
                this.foodSpawnRate,
                this.maxFood - this.foods.size
            );
            
            for (let i = 0; i < foodToSpawn; i++) {
                this.spawnFood();
            }
        }
    }
    
    spawnFood() {
        if (this.foods.size >= this.maxFood) return;
        
        // Create new food with random position
        const foodId = uuidv4();
        const food = new ServerFood({
            id: foodId,
            position: this.getRandomPosition(),
            scale: new Vector3(0.5, 0.5, 0.5),
            color: this.getRandomColor()
        });
        
        // Add food to game
        this.foods.set(foodId, food);
        
        // Notify all players of new food
        this.io.emit('foodSpawned', food.toClientData());
    }
    
    consumeFood(foodId, playerId) {
        const food = this.foods.get(foodId);
        const player = this.players.get(playerId);
        
        if (!food || !player) return;
        
        // Remove food from game
        this.foods.delete(foodId);
        
        // Increase player mass
        const growAmount = 0.1; // How much the player grows from each food
        player.grow(growAmount);
        
        // Notify all players
        this.io.emit('foodConsumed', {
            foodId: foodId,
            playerId: playerId,
            amount: growAmount
        });
    }
    
    sendGameState(playerId) {
        const socket = this.io.sockets.sockets.get(playerId);
        if (!socket) return;
        
        // Create game state for the player
        const gameState = this.createGameState();
        
        // Send game state to the player
        socket.emit('gameState', gameState);
    }
    
    broadcastGameState() {
        // Create game state for all players
        const gameState = this.createGameState();
        
        // Send game state to all players
        this.io.emit('gameState', gameState);
    }
    
    createGameState() {
        return {
            players: Array.from(this.players.values()).map(player => player.toClientData()),
            foods: Array.from(this.foods.values()).map(food => food.toClientData())
        };
    }
    
    updateLeaderboard() {
        // Create leaderboard data
        const leaderboardData = Array.from(this.players.values())
            .sort((a, b) => b.mass - a.mass)
            .slice(0, 10)
            .map((player, index) => ({
                username: player.username,
                mass: Math.floor(player.mass),
                rank: index + 1,
                id: player.id
            }));
        
        // Add isLocalPlayer flag for each player
        for (const player of this.players.values()) {
            const entry = leaderboardData.find(entry => entry.id === player.id);
            if (entry) {
                // Send personalized leaderboard to each player
                this.io.to(player.id).emit('leaderboard', leaderboardData.map(item => ({
                    ...item,
                    isLocalPlayer: item.id === player.id
                })));
            } else {
                // Player not in top 10, add their rank
                const rank = Array.from(this.players.values())
                    .sort((a, b) => b.mass - a.mass)
                    .findIndex(p => p.id === player.id) + 1;
                
                this.io.to(player.id).emit('leaderboard', [
                    ...leaderboardData.map(item => ({
                        ...item,
                        isLocalPlayer: false
                    })),
                    {
                        username: player.username,
                        mass: Math.floor(player.mass),
                        rank: rank,
                        id: player.id,
                        isLocalPlayer: true
                    }
                ]);
            }
        }
    }
    
    getRandomPosition() {
        // Get random position within world boundaries
        return new Vector3(
            (Math.random() - 0.5) * this.worldSize.x,
            (Math.random() - 0.5) * this.worldSize.y,
            (Math.random() - 0.5) * this.worldSize.z
        );
    }
    
    getRandomSpawnPosition() {
        // Get random position for player spawn (avoid center of map)
        const radius = Math.random() * 0.3 + 0.2; // 20% to 50% of world radius
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        return new Vector3(
            radius * Math.sin(phi) * Math.cos(theta) * this.worldSize.x / 2,
            radius * Math.sin(phi) * Math.sin(theta) * this.worldSize.y / 2,
            radius * Math.cos(phi) * this.worldSize.z / 2
        );
    }
    
    getRandomColor() {
        // Generate a random pastel color
        return '#' + 
            Math.floor(Math.random() * 128 + 127).toString(16) +
            Math.floor(Math.random() * 128 + 127).toString(16) +
            Math.floor(Math.random() * 128 + 127).toString(16);
    }
    
    shutdown() {
        // Stop game loop
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
        }
        
        this.isRunning = false;
        console.log('Game server shut down');
    }
}

module.exports = { GameServer };