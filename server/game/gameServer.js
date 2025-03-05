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
        this.worldSize = { x: 500, y: 500, z: 500 }; // Match client world size
        this.maxPlayers = 50;
        this.maxFood = 1000;  // Increase max food
        this.minFood = 800;   // Increase min food
        this.foodSpawnRate = 20; // Increase food spawn rate
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
            console.log(`Player connected: ${socket.id} from ${socket.handshake.address}`);
            
            // Log socket connection details for debugging
            console.log(`Socket details: transport=${socket.conn.transport.name}, query params:`, socket.handshake.query);
            
            // Send immediate feedback to client that connection is established
            socket.emit('serverMessage', {
                type: 'info',
                message: 'Connected to server successfully!'
            });
            
            // Send current player count to the newly connected client
            socket.emit('playerCount', {
                count: this.players.size,
                max: this.maxPlayers
            });
            
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
            socket.on('ejectMass', (data) => {
                this.handlePlayerEjectMass(socket.id, data);
            });
            
            // Monitor for disconnect
            socket.on('disconnect', (reason) => {
                console.log(`Player ${socket.id} disconnected. Reason: ${reason}`);
                this.handlePlayerDisconnect(socket.id);
            });

            // Handle ping requests (for latency testing)
            socket.on('ping', (callback) => {
                if (typeof callback === 'function') {
                    callback();
                }
            });

            // Handle reconnection attempts
            socket.on('reconnect_attempt', (attemptNumber) => {
                console.log(`Player ${socket.id} attempting to reconnect (attempt ${attemptNumber})`);
            });

            // Monitor for error events
            socket.on('error', (error) => {
                console.error(`Socket ${socket.id} error:`, error);
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
        
        console.log(`Player joining: ${data.username || 'Unknown'} (${socket.id})`);
        
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
        
        // Send individual data about all existing players to the new player
        this.players.forEach((existingPlayer, playerId) => {
            if (playerId !== socket.id) {
                socket.emit('playerJoined', existingPlayer.toClientData());
            }
        });
        
        // Send current game state to new player
        this.sendGameState(socket.id);
        
        // Notify all other players of new player
        socket.broadcast.emit('playerJoined', player.toClientData());
        
        console.log(`Player ${player.username} (${socket.id}) joined the game. Total players: ${this.players.size}`);
        
        // Broadcast updated player count to all clients
        this.broadcastPlayerCount();
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
        if (!player) {
            console.log(`[ERROR] Player ${playerId} not found for split action`);
            return;
        }
        
        if (player.mass < 2) {
            console.log(`[INFO] Player ${player.username} (${playerId}) doesn't have enough mass to split (mass: ${player.mass.toFixed(2)})`);
            return;
        }
        
        // Call the player's split method to get new fragment configuration
        const fragmentConfig = player.split();
        
        // If split was successful (returned a valid config)
        if (fragmentConfig) {
            // Create a new player from the fragment config
            const fragmentPlayer = new ServerPlayer(fragmentConfig);
            
            // Add fragment to the game with a unique ID
            this.players.set(fragmentConfig.id, fragmentPlayer);
            
            // Initialize the fragment's physics properties
            if (fragmentConfig.velocity) {
                fragmentPlayer.velocity = fragmentConfig.velocity;
            }
            
            // Notify all clients about the new fragment
            this.io.emit('playerSplit', {
                parentId: playerId,
                fragment: fragmentPlayer.toClientData()
            });
            
            console.log(`[ACTION] Player ${player.username} (${playerId}) split successfully - Original mass: ${player.mass.toFixed(2)} - Fragment mass: ${fragmentPlayer.mass.toFixed(2)} - Fragment ID: ${fragmentConfig.id}`);
        }
    }
    
    handlePlayerBoost(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;
        
        // Try to boost the player
        const boostSuccess = player.boost();
        
        if (boostSuccess) {
            // Broadcast the boost to all clients
            this.io.emit('playerBoosted', {
                id: playerId,
                position: player.position.toArray(),
                mass: player.mass
            });
            
            console.log(`Player ${player.username} (${playerId}) boosted - New mass: ${player.mass.toFixed(2)}`);
        }
    }
    
    handlePlayerEjectMass(playerId, data) {
        const player = this.players.get(playerId);
        if (!player) {
            console.log(`[ERROR] Player ${playerId} not found for mass ejection`);
            return;
        }
        
        // Minimum mass required to eject
        const MIN_MASS_TO_EJECT = 2;
        // Mass amount to eject (use client value or default)
        const EJECTED_MASS_AMOUNT = data && data.mass ? data.mass : 1;
        
        if (player.mass < MIN_MASS_TO_EJECT) {
            console.log(`[INFO] Player ${player.username} (${playerId}) doesn't have enough mass to eject`);
            return; // Not enough mass to eject
        }
        
        // Decrease player mass
        player.mass -= EJECTED_MASS_AMOUNT;
        player.updateSize(); // Update player size based on new mass
        
        // Use direction from client or default
        let direction;
        if (data && data.direction) {
            direction = new Vector3().fromArray(data.direction).normalize();
        } else {
            direction = new Vector3(0, 0, -1).applyQuaternion(player.rotation).normalize();
        }
        
        // Use position from client or calculate it
        let spawnPosition;
        if (data && data.position) {
            spawnPosition = new Vector3().fromArray(data.position);
        } else {
            spawnPosition = player.position.clone().add(
                direction.clone().multiplyScalar(player.radius + 0.5)
            );
        }
        
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
        
        console.log(`[ACTION] Player ${player.username} (${playerId}) ejected mass ${massId} - Current mass: ${player.mass.toFixed(2)}`);
    }
    
    handlePlayerDisconnect(playerId) {
        // If player exists, remove them from the game
        if (this.players.has(playerId)) {
            const player = this.players.get(playerId);
            this.players.delete(playerId);
            
            // Notify other players that this player has left
            this.io.emit('playerLeft', playerId);
            
            console.log(`Player ${playerId} removed from game. Total players: ${this.players.size}`);
            
            // Broadcast updated player count to all clients
            this.broadcastPlayerCount();
        }
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
        
        // Check for survival score for all players
        // Note: player.update() is called in the physics system, so we don't call it here
        for (const player of this.players.values()) {
            // Check if player has survived another minute (60 seconds)
            // We use Math.floor to check if the player has crossed a full minute threshold
            const previousMinutesAlive = Math.floor((player.timeAlive - deltaTime) / 60);
            const currentMinutesAlive = Math.floor(player.timeAlive / 60);
            
            // If the player has survived another full minute, award 10 score points
            if (currentMinutesAlive > previousMinutesAlive) {
                player.score += 10;
                console.log(`[SCORE] Player ${player.username} (${player.id}) earned 10 survival points for being alive for ${currentMinutesAlive} minutes. Total score: ${player.score.toFixed(0)}`);
            }
        }
        
        // Update physics for players and foods
        const consumedFood = this.physics.update(deltaTime, this.players, this.foods);
        
        // Remove consumed food and notify clients
        if (consumedFood && consumedFood.length > 0) {
            for (const { foodId, playerId, foodValue } of consumedFood) {
                // Get player info for logging
                const player = this.players.get(playerId);
                
                // Remove food from game
                this.foods.delete(foodId);
                
                // Notify all players
                this.io.emit('foodConsumed', {
                    foodId: foodId,
                    playerId: playerId
                });
                
                // Log the food consumption
                if (player) {
                    console.log(`[CONSUME] Player ${player.username} (${playerId}) ate food ${foodId} - Value: ${foodValue.toFixed(2)} - New mass: ${player.mass.toFixed(2)}`);
                }
            }
        }
        
        // Check for player-player consumption
        const playerConsumption = this.physics.checkPlayerCollisions(this.players);
        if (playerConsumption) {
            const { predator, prey } = playerConsumption;
            console.log(`[CONSUME] Player ${predator.username} (${predator.id}) ate player ${prey.username} (${prey.id}) - Gained mass: ${(prey.mass * 0.8).toFixed(2)} - New mass: ${predator.mass.toFixed(2)}`);
            
            // Remove consumed player
            this.players.delete(prey.id);
            
            // Log player death
            console.log(`[DEATH] Player ${prey.username} (${prey.id}) was eaten by ${predator.username} (${predator.id}) - Final score: ${prey.score.toFixed(0)} - Time alive: ${prey.timeAlive.toFixed(0)}s`);
            
            // Notify clients
            this.io.emit('playerConsumed', {
                predatorId: predator.id,
                preyId: prey.id
            });
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
        
        return food;
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
            .sort((a, b) => b.score - a.score) // Sort by score instead of mass
            .slice(0, 10)
            .map((player, index) => ({
                username: player.username,
                mass: Math.floor(player.mass),
                score: Math.floor(player.score), // Include score in leaderboard data
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
                    .sort((a, b) => b.score - a.score) // Sort by score instead of mass
                    .findIndex(p => p.id === player.id) + 1;
                
                this.io.to(player.id).emit('leaderboard', [
                    ...leaderboardData.map(item => ({
                        ...item,
                        isLocalPlayer: false
                    })),
                    {
                        username: player.username,
                        mass: Math.floor(player.mass),
                        score: Math.floor(player.score), // Include score in leaderboard data
                        rank: rank,
                        id: player.id,
                        isLocalPlayer: true
                    }
                ]);
            }
        }
    }
    
    getRandomPosition() {
        // Get random position within world bounds
        const margin = 10; // Keep food away from edges
        return new Vector3(
            (Math.random() - 0.5) * (this.worldSize.x - margin * 2),
            0, // Keep food on the ground plane
            (Math.random() - 0.5) * (this.worldSize.z - margin * 2)
        );
    }
    
    getRandomSpawnPosition() {
        // Get random position for player spawn (avoid center of map)
        const radius = Math.random() * 0.3 + 0.2; // 20% to 50% of world radius
        const theta = Math.random() * Math.PI * 2;
        
        // Simplified spawn position calculation that keeps players on the XZ plane (y=0)
        return new Vector3(
            radius * Math.cos(theta) * this.worldSize.x / 2,
            0, // Keep player on the floor
            radius * Math.sin(theta) * this.worldSize.z / 2
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
                
                // Log the mass consumption
                const ownerPlayer = this.players.get(massOrb.ownerId);
                const ownerName = ownerPlayer ? ownerPlayer.username : 'unknown';
                console.log(`[CONSUME] Player ${player.username} (${playerId}) ate mass orb ${massId} from ${ownerName} (${massOrb.ownerId}) - Value: ${massOrb.mass.toFixed(2)} - New mass: ${player.mass.toFixed(2)}`);
                
                // Mark mass orb for removal
                massOrbsToRemove.push(massId);
                
                // Notify clients
                this.io.emit('massConsumed', massId);
                
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
                const oldMass = virus.mass;
                virus.mass += massOrb.mass;
                virus.radius = Math.cbrt(virus.radius ** 3 + massOrb.mass);
                
                // Log the virus growing
                const ownerPlayer = this.players.get(massOrb.ownerId);
                const ownerName = ownerPlayer ? ownerPlayer.username : 'unknown';
                console.log(`[VIRUS] Virus ${virusId} absorbed mass orb ${massId} from ${ownerName} (${massOrb.ownerId}) - Old mass: ${oldMass.toFixed(2)} - New mass: ${virus.mass.toFixed(2)}`);
                
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
    
    // Send the current player count to all clients
    broadcastPlayerCount() {
        this.io.emit('playerCount', {
            count: this.players.size,
            max: this.maxPlayers
        });
    }
}

module.exports = { GameServer };