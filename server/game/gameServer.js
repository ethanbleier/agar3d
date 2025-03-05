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
        this.tickRate = 60; // Updates per second
        
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
            
            // Player eject mass action
            socket.on('ejectMass', () => {
                this.handlePlayerEjectMass(socket.id);
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
    
    handlePlayerEjectMass(playerId) {
        const player = this.players.get(playerId);
        if (!player) {
            console.log(`Player ${playerId} not found for mass ejection`);
            return;
        }
        
        // Minimum mass required to eject
        const MIN_MASS_TO_EJECT = 2;
        // Mass amount to eject
        const EJECTED_MASS_AMOUNT = 1;
        
        if (player.mass < MIN_MASS_TO_EJECT) {
            console.log(`Player ${player.username} (${playerId}) doesn't have enough mass to eject`);
            return; // Not enough mass to eject
        }
        
        // Decrease player mass
        player.mass -= EJECTED_MASS_AMOUNT;
        player.updateSize(); // Update player size based on new mass
        
        // Create a mass orb in front of the player
        const direction = new Vector3(0, 0, -1).applyQuaternion(player.rotation).normalize();
        
        // Position the mass orb in front of the player
        const spawnPosition = player.position.clone().add(
            direction.clone().multiplyScalar(player.radius + 0.5)
        );
        
        // Create a unique ID for the mass orb
        const massId = `mass_${uuidv4()}`;
        
        // Create the mass orb
        const massOrb = {
            id: massId,
            type: 'mass',
            position: spawnPosition.toArray(),
            velocity: direction.clone().multiplyScalar(20).toArray(), // Shoot with velocity
            ownerId: player.id, // Remember who ejected this mass
            mass: EJECTED_MASS_AMOUNT,
            radius: Math.cbrt(EJECTED_MASS_AMOUNT), // Radius based on mass
            color: player.color, // Same color as the player
            creationTime: Date.now(),
            lifespan: 30000, // 30 seconds lifespan
        };
        
        // Add mass orb to the game
        if (!this.massOrbs) {
            this.massOrbs = new Map();
        }
        this.massOrbs.set(massId, massOrb);
        
        // Broadcast the mass ejection to all clients
        this.io.emit('massEjected', massOrb);
        
        console.log(`Player ${player.username} (${playerId}) ejected mass ${massId}`);
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
        // Skip if not running
        if (!this.isRunning) {
            return;
        }
        
        // Update physics for players and foods
        const consumedFood = this.physics.update(deltaTime, this.players, this.foods);
        
        // Remove consumed food and notify clients
        if (consumedFood && consumedFood.length > 0) {
            for (const { foodId, playerId } of consumedFood) {
                // Remove food from game
                this.foods.delete(foodId);
                
                // Notify all players
                this.io.emit('foodConsumed', {
                    foodId: foodId,
                    playerId: playerId
                });
            }
        }
        
        // Spawn new food if needed
        this.updateFood(deltaTime);
        
        // Update mass orbs
        this.updateMassOrbs(deltaTime);
        
        // Broadcast game state to all players
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
        // Update existing food animations
        for (const food of this.foods.values()) {
            food.update(deltaTime);
        }
        
        // Spawn new food at a certain rate
        if (this.foods.size < this.minFood) {
            const foodToSpawn = Math.min(
                Math.ceil(this.foodSpawnRate * deltaTime),
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
            color: this.getRandomColor(),
            value: 0.1 + Math.random() * 0.1 // Random value between 0.1 and 0.2
        });
        
        // Add food to game
        this.foods.set(foodId, food);
        
        // Notify all players of new food
        this.io.emit('foodSpawned', food.toClientData());
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
        // Create a compact game state to send to clients
        return {
            players: Array.from(this.players.values()).map(player => player.toClientData()),
            foods: Array.from(this.foods.values()).map(food => food.toClientData()),
            massOrbs: this.massOrbs ? Array.from(this.massOrbs.values()) : []
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
    
    // Update mass orbs positions and check for collisions
    updateMassOrbs(deltaTime) {
        if (!this.massOrbs) {
            this.massOrbs = new Map();
            return;
        }
        
        const massOrbsToRemove = [];
        const now = Date.now();
        
        // Update each mass orb
        for (const [massId, massOrb] of this.massOrbs.entries()) {
            // Check if mass orb has expired
            if (now - massOrb.creationTime > massOrb.lifespan) {
                massOrbsToRemove.push(massId);
                continue;
            }
            
            // Update position based on velocity
            const position = new Vector3().fromArray(massOrb.position);
            const velocity = new Vector3().fromArray(massOrb.velocity);
            
            // Apply velocity
            position.add(velocity.clone().multiplyScalar(deltaTime));
            
            // Apply drag to slow down mass orb
            velocity.multiplyScalar(0.98);
            
            // Update position and velocity
            massOrb.position = position.toArray();
            massOrb.velocity = velocity.toArray();
            
            // Keep mass orb within world boundaries
            this.constrainMassOrbToWorld(massOrb);
            
            // Check for collisions with players
            this.checkMassPlayerCollisions(massOrb, massId, massOrbsToRemove);
            
            // Check for collisions with viruses
            this.checkMassVirusCollisions(massOrb, massId, massOrbsToRemove);
        }
        
        // Remove expired or consumed mass orbs
        for (const massId of massOrbsToRemove) {
            this.massOrbs.delete(massId);
        }
    }
    
    // Keep mass orb within world boundaries
    constrainMassOrbToWorld(massOrb) {
        const position = new Vector3().fromArray(massOrb.position);
        const velocity = new Vector3().fromArray(massOrb.velocity);
        
        // Calculate half-sizes for boundaries
        const halfX = this.worldSize.x / 2;
        const halfY = this.worldSize.y / 2;
        const halfZ = this.worldSize.z / 2;
        
        // Check X boundaries
        if (position.x < -halfX) {
            position.x = -halfX;
            velocity.x *= -0.8; // Bounce with energy loss
        } else if (position.x > halfX) {
            position.x = halfX;
            velocity.x *= -0.8; // Bounce with energy loss
        }
        
        // Check Y boundaries
        if (position.y < -halfY) {
            position.y = -halfY;
            velocity.y *= -0.8; // Bounce with energy loss
        } else if (position.y > halfY) {
            position.y = halfY;
            velocity.y *= -0.8; // Bounce with energy loss
        }
        
        // Check Z boundaries
        if (position.z < -halfZ) {
            position.z = -halfZ;
            velocity.z *= -0.8; // Bounce with energy loss
        } else if (position.z > halfZ) {
            position.z = halfZ;
            velocity.z *= -0.8; // Bounce with energy loss
        }
        
        // Update position and velocity
        massOrb.position = position.toArray();
        massOrb.velocity = velocity.toArray();
    }
    
    // Check for collisions between mass orbs and players
    checkMassPlayerCollisions(massOrb, massId, massOrbsToRemove) {
        // Convert position and radius to Vector3 and number
        const massPosition = new Vector3().fromArray(massOrb.position);
        const massRadius = massOrb.radius;
        
        for (const [playerId, player] of this.players.entries()) {
            // Skip if this is the player who ejected the mass and it was recently ejected
            if (playerId === massOrb.ownerId && Date.now() - massOrb.creationTime < 1000) {
                continue;
            }
            
            // Check for collision
            if (this.physics.sphereCollision(
                massPosition, massRadius,
                player.position, player.radius
            )) {
                // Player absorbs the mass
                player.grow(massOrb.mass);
                
                // Mark mass orb for removal
                massOrbsToRemove.push(massId);
                
                break; // Exit the loop since this mass orb is consumed
            }
        }
    }
    
    // Check for collisions between mass orbs and viruses
    checkMassVirusCollisions(massOrb, massId, massOrbsToRemove) {
        // Only process if we have viruses
        if (!this.viruses) return;
        
        // Convert position and radius to Vector3 and number
        const massPosition = new Vector3().fromArray(massOrb.position);
        const massRadius = massOrb.radius;
        
        for (const [virusId, virus] of this.viruses.entries()) {
            // Convert virus position to Vector3
            const virusPosition = new Vector3().fromArray(virus.position);
            
            // Check for collision
            if (this.physics.sphereCollision(
                massPosition, massRadius,
                virusPosition, virus.radius
            )) {
                // Virus absorbs the mass
                virus.mass += massOrb.mass;
                virus.radius = Math.cbrt(virus.radius ** 3 + massOrb.mass);
                
                // Update virus in game state
                this.io.emit('virusUpdated', {
                    id: virusId,
                    position: virus.position,
                    mass: virus.mass,
                    radius: virus.radius
                });
                
                // Mark mass orb for removal
                massOrbsToRemove.push(massId);
                
                break; // Exit the loop since this mass orb is consumed
            }
        }
    }
}

module.exports = { GameServer };