import { THREE, OrbitControls, WebGL } from '../lib/three-instance.js';
import { Player } from './player.js';
import { Food } from './food.js';
import { CameraController } from './camera.js';
import { PhysicsSystem } from './physics.js';
import { RenderSystem } from './rendering.js';
import { Virus } from './virus.js';
import { MassOrb } from './mass.js';

export class Game {
    constructor(config) {
        this.config = config;
        this.container = document.getElementById(config.containerId);
        this.socketManager = config.socketManager;
        this.username = config.username;
        
        // Game state
        this.players = new Map(); // Map of player id -> Player instance
        this.foods = new Map();   // Map of food id -> Food instance
        this.localPlayerId = null;
        this.localPlayer = null;
        this.isRunning = false;
        this.lastTime = 0;
        
        // Input state
        this.keys = {};
        this.mousePosition = new THREE.Vector2();
        this.mouseMovement = new THREE.Vector2();
        this.pointerLocked = false;
        
        // Add viruses collection
        this.viruses = new Map();
        
        // Add mass orbs collection
        this.massOrbs = new Map();
        
        // Game configuration
        this.worldSize = 100; // Size of the game world - this value is used for boundaries
        this.maxFood = 100;   // Maximum number of food items
        this.minFood = 50;    // Minimum number of food items
        
        // Escape menu state
        this.escapeMenuActive = false;
        this.escapeMenu = document.getElementById('escape-menu');
        this.resumeButton = document.getElementById('resume-button');
        this.disconnectButton = document.getElementById('disconnect-button');
        
        // Ensure escape menu is hidden initially
        if (this.escapeMenu) {
            this.escapeMenu.classList.add('hidden');
        }
        
        // Initialize systems
        this.initThree();
        this.initSystems();
        this.initLocalPlayer();
        
        // Set up socket event handlers
        this.setupSocketEvents();
        
        // Add our new setupInputHandlers call
        this.setupInputHandlers();
        
        // Add UI indicator for mouse capture
        this.createMouseCaptureIndicator();
        
        // Spawn initial viruses and food
        this.spawnInitialViruses(10);
        this.spawnInitialFood(this.minFood);
        
        // Log the number of viruses and food spawned
        console.log(`Game initialized with ${this.viruses.size} viruses and ${this.foods.size} food items`);
        
        // Start the game
        this.isRunning = true;
    }
    
    initThree() {
        // Check if WebGL is supported
        if (!WebGL.isWebGLAvailable()) {
            const warning = WebGL.getWebGLErrorMessage();
            this.container.appendChild(warning);
            console.error('WebGL not available');
            return;
        }
        
        // Set up THREE.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000022); // Darker blue background
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1).normalize();
        this.scene.add(directionalLight);
        
        // Create renderer with optimal settings 
        try {
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,  // Keep antialiasing for better visual quality
                alpha: true,      // Allow transparency
                premultipliedAlpha: false, // Better for transparent materials
                preserveDrawingBuffer: true // Needed for some effects
            });
            
            console.log('WebGL renderer created successfully');
            
            // Use device pixel ratio for higher-res rendering, but cap it to avoid performance issues
            const pixelRatio = Math.min(window.devicePixelRatio, 2);
            this.renderer.setPixelRatio(pixelRatio);
            
            // Set renderer size to container size
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            this.renderer.setSize(width, height);
            
            // Enable physically correct lighting
            this.renderer.physicallyCorrectLights = true;
            
            // Set color space for better color representation
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            
            // Add renderer to DOM
            this.container.appendChild(this.renderer.domElement);
            
            // Initialize camera after renderer is set up
            this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            this.camera.position.set(0, 10, 10);
            this.camera.lookAt(0, 0, 0);
            
            // Add camera controller
            this.cameraController = new CameraController(this.camera, this.renderer.domElement);
        } catch (e) {
            console.error('Error initializing WebGL renderer:', e);
            const warning = document.createElement('div');
            warning.style.position = 'absolute';
            warning.style.top = '50%';
            warning.style.width = '100%';
            warning.style.textAlign = 'center';
            warning.textContent = 'Error initializing WebGL. Please try a different browser.';
            this.container.appendChild(warning);
        }
        
        // Initialize coordinate helpers
        this.addCoordinateHelpers();
    }
    
    initSystems() {
        // Camera controller - Pass the dom element for pointer lock
        this.cameraController = new CameraController(this.camera, this.renderer.domElement);
        this.cameraController.setCameraMode('follow');
        
        // Physics system for collision detection and movement
        this.physicsSystem = new PhysicsSystem();
        
        // Rendering system for visual effects
        this.renderSystem = new RenderSystem(this.scene, this.renderer);
        
        // Define the world size property for boundaries and spawning
        this.worldSize = 500; // Full world size (matches the grid helper)
        
        // Initialize viruses - fixed the spawnInitialViruses method to use the proper world size
        this.spawnInitialViruses(15); // Spawn 15 initial viruses
        
        // Create boundaries
        this.createBoundaries();
    }
    
    createMouseCaptureIndicator() {
        // Create a UI element to show mouse capture status
        const indicator = document.createElement('div');
        indicator.id = 'mouse-capture-indicator';
        indicator.style.position = 'absolute';
        indicator.style.bottom = '10px';
        indicator.style.right = '10px';
        indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        indicator.style.color = 'white';
        indicator.style.padding = '5px 10px';
        indicator.style.borderRadius = '5px';
        indicator.style.fontFamily = 'Arial, sans-serif';
        indicator.style.fontSize = '12px';
        indicator.style.pointerEvents = 'none'; // Don't block clicks
        indicator.style.zIndex = '1000';
        indicator.textContent = 'Click to capture mouse (ESC or L to toggle menu)';
        document.body.appendChild(indicator);
    }
    
    updateMouseCaptureIndicator() {
        const indicator = document.getElementById('mouse-capture-indicator');
        if (indicator) {
            if (this.pointerLocked) {
                indicator.textContent = 'Mouse Captured (ESC or L to open menu)';
                indicator.style.backgroundColor = 'rgba(0, 150, 0, 0.5)';
            } else {
                indicator.textContent = 'Click to capture mouse (ESC or L to toggle menu)';
                indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            }
        }
    }
    
    onPointerLockChange(event) {
        // Update pointer lock status
        this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
        
        // Update the indicator
        this.updateMouseCaptureIndicator();
        
        // Show camera mode message
        if (this.pointerLocked) {
            this.cameraController.showUIMessage('Mouse captured. Use WASD to move, mouse to look around.', 3000);
            
            // If escape menu is active, hide it when pointer is locked
            if (this.escapeMenuActive) {
                this.escapeMenuActive = false;
                this.escapeMenu.classList.add('hidden');
            }
        } else {
            // If pointer is unlocked but escape menu is not active, show it
            // This handles the case when user presses ESC directly
            if (!this.escapeMenuActive && this.isRunning) {
                this.escapeMenuActive = true;
                this.escapeMenu.classList.remove('hidden');
            }
        }
    }
    
    initLocalPlayer() {
        // Create local player and send join request to server
        this.localPlayerId = this.socketManager.id;
        this.localPlayer = new Player({
            id: this.localPlayerId,
            username: this.username,
            position: new THREE.Vector3(0, 0, 0),
            color: this.getRandomColor()
        });
        
        // Add local player to scene
        this.scene.add(this.localPlayer.mesh);
        
        // Add to players map
        this.players.set(this.localPlayerId, this.localPlayer);
        
        // Send join request to server
        this.socketManager.emit('joinGame', {
            username: this.username,
            color: this.localPlayer.color.getHexString()
        });
    }
    
    addCoordinateHelpers() {
        // Add axes helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
        
        // Grid removed as per request
    }
    
    createBoundaries() {
        // Create a visual representation of the world boundaries
        // Using a much larger world size to allow unrestricted movement
        const worldSize = this.worldSize * 10; // Make the world 10x larger
        
        // Create boundary walls - now at a much greater distance
        const wallGeometry = new THREE.BoxGeometry(1, 5, worldSize * 2);
        const wallMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x8888ff,
            transparent: true,
            opacity: 0.1 // Make them more transparent
        });
        
        // East wall
        const eastWall = new THREE.Mesh(wallGeometry, wallMaterial);
        eastWall.position.set(worldSize, 2.5, 0);
        this.scene.add(eastWall);
        
        // West wall
        const westWall = new THREE.Mesh(wallGeometry, wallMaterial);
        westWall.position.set(-worldSize, 2.5, 0);
        this.scene.add(westWall);
        
        // North wall (rotated)
        const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
        northWall.rotation.y = Math.PI / 2;
        northWall.position.set(0, 2.5, -worldSize);
        this.scene.add(northWall);
        
        // South wall (rotated)
        const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
        southWall.rotation.y = Math.PI / 2;
        southWall.position.set(0, 2.5, worldSize);
        this.scene.add(southWall);
        
        // No physics boundaries - player can move freely
        console.log('Physics boundaries removed - player can move freely across the entire map');
    }
    
    addTestObject() {
        // Either remove this function entirely or leave it empty if not needed
        /*
        // Original code was removed to avoid the purple test object
        */
    }
    
    update() {
        // Calculate delta time
        const now = performance.now();
        const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1); // Cap at 100ms
        this.lastTime = now;
        
        if (!this.isRunning) return;
        
        // Update player input
        this.updatePlayerInput(deltaTime);
        
        // Update physics and get foods to remove
        const foodsToRemove = this.physicsSystem.update(
            deltaTime,
            this.players,
            this.foods,
            this.localPlayerId,
            this.viruses
        );
        
        // Remove consumed foods
        if (foodsToRemove && foodsToRemove.length > 0) {
            foodsToRemove.forEach(foodId => {
                this.removeFood(foodId);
                
                // Spawn a new food item to replace the consumed one after a delay
                setTimeout(() => {
                    if (this.foods.size < this.maxFood) {
                        this.spawnNewFood();
                    }
                }, Math.random() * 2000 + 1000); // Random delay between 1-3 seconds
            });
        }
        
        // Update players
        this.players.forEach(player => {
            player.update(deltaTime);
        });
        
        // Update food
        this.foods.forEach(food => {
            food.update(deltaTime);
        });
        
        // Update mass orbs
        if (this.massOrbs) {
            this.massOrbs.forEach(massOrb => {
                massOrb.update(deltaTime);
            });
        }
        
        // Check if we need to spawn more food
        if (this.foods.size < this.minFood) {
            // Spawn new food at a rate of about 1 per second
            if (Math.random() < deltaTime) {
                this.spawnNewFood();
            }
        }
        
        // Update viruses
        this.viruses.forEach(virus => {
            virus.update(deltaTime);
            
            // Check for collisions with the local player
            if (this.localPlayer && virus.checkCollision(this.localPlayer)) {
                if (virus.onCollision(this.localPlayer, this)) {
                    this.removeVirus(virus.id);
                    // Spawn a new virus elsewhere after a delay
                    setTimeout(() => this.spawnNewVirus(), 5000);
                }
            }
            
            // Check for collisions with other players
            this.players.forEach(player => {
                if (virus.checkCollision(player)) {
                    if (virus.onCollision(player, this)) {
                        this.removeVirus(virus.id);
                        // Spawn a new virus elsewhere after a delay
                        setTimeout(() => this.spawnNewVirus(), 5000);
                    }
                }
            });
        });
        
        // Send player position and rotation to server
        this.socketManager.emit('updatePosition', {
            position: this.localPlayer.position.toArray(),
            rotation: this.localPlayer.rotation.toArray(),
            scale: this.localPlayer.scale.toArray()
        });
        
        // Update camera to follow player
        this.cameraController.followPlayer(
            this.localPlayer.position, 
            this.localPlayer.rotation,
            deltaTime
        );
        
        // Update player fragments with ejection physics
        this.players.forEach(player => {
            if (player.ejectionDirection && player.ejectionTime > 0) {
                // Calculate movement based on ejection
                const force = player.ejectionForce * (player.ejectionTime / 0.5);
                player.position.addScaledVector(player.ejectionDirection, force * deltaTime);
                player.mesh.position.copy(player.position);
                player.label.position.copy(player.position).add(new THREE.Vector3(0, player.radius + 0.5, 0));
                
                // Decrease ejection time
                player.ejectionTime -= deltaTime;
            }
        });
        
        // Call render with deltaTime
        this.render(deltaTime);
    }
    
    render(deltaTime = 0.016) {
        // Added default value to prevent undefined error
        if (!this.isRunning) return;
        
        // Simplified camera update
        if (this.localPlayer) {
            this.cameraController.followPlayer(
                this.localPlayer.position,
                this.localPlayer.rotation,
                deltaTime
            );
        }
        
        // Simplified rendering - remove complex operations
        try {
            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error('WebGL rendering error:', error);
        }
    }
    
    updatePlayerInput(deltaTime) {
        if (!this.localPlayer) return;

        // Get camera's forward direction
        const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        cameraForward.y = 0; // Keep on xz plane
        cameraForward.normalize();
        
        // Get camera's right direction
        const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        cameraRight.y = 0; // Keep on xz plane
        cameraRight.normalize();
        
        // Calculate movement direction based on mouse position
        const moveDirection = new THREE.Vector3();
        
        // Add forward movement (always move forward, speed affected by vertical mouse position)
        const forwardFactor = 1.0 - Math.abs(this.mousePosition.y) * 0.5; // Reduce speed when looking far up/down
        moveDirection.addScaledVector(cameraForward, forwardFactor);
        
        // Add horizontal adjustment based on mouse x position
        moveDirection.addScaledVector(cameraRight, this.mousePosition.x);
        
        // Normalize the direction vector
        if (moveDirection.lengthSq() > 0) {
            moveDirection.normalize();
        }
        
        // Move the player in this direction
        this.localPlayer.move(moveDirection, deltaTime);
        this.localPlayer.lookAt(moveDirection);
    }
    
    // Event handlers
    handleKeyDown(event) {
        this.keys[event.key] = true;
        
        // Handle special key presses
        if (event.key === 'w' && !event.repeat) {
            // W for boost
            if (this.localPlayer && this.localPlayer.mass > this.localPlayer.boostCost) {
                // Try to boost
                const boostSuccess = this.localPlayer.boost();
                
                if (boostSuccess) {
                    // Send boost command to server
                    this.socketManager.emit('boostPlayer');
                    console.log('Boost command sent to server');
                    
                    // Add boost particles for visual effect
                    this.addBoostParticles(this.localPlayer.position, this.localPlayer.color);
                }
            }
        } else if (event.key === 'c' && !event.repeat) {
            this.cameraController.toggleCameraMode();
        } else if ((event.key === 'l' || event.key === 'Escape') && !event.repeat) {
            // Toggle escape menu instead of just pointer lock
            this.toggleEscapeMenu();
        }
    }
    
    handleKeyUp(event) {
        this.keys[event.key] = false;
    }
    
    handleMouseMove(event) {
        if (this.pointerLocked) {
            // When pointer is locked, camera controller handles movement
            // We don't need to do anything here
        } else {
            // Calculate mouse position relative to the center of the screen
            // Center of the screen (0,0) should correspond to straight ahead
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            // Calculate normalized position (-1 to 1) with (0,0) at center
            this.mousePosition.x = ((event.clientX - centerX) / (window.innerWidth / 2));
            // Keep the Y-axis inverted for natural feel
            this.mousePosition.y = ((event.clientY - centerY) / (window.innerHeight / 2));
            
            // Optional: Apply sensitivity adjustment to make movement more controlled
            const sensitivity = 0.8; // Adjust this value as needed
            this.mousePosition.x *= sensitivity;
            this.mousePosition.y *= sensitivity;
            
            // Use mouse position to determine direction in 3D space
            // Get camera's forward direction
            const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            cameraForward.y = 0; // Keep on xz plane
            cameraForward.normalize();
            
            // Get camera's right direction
            const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            cameraRight.y = 0; // Keep on xz plane
            cameraRight.normalize();
            
            // Calculate target direction by combining forward and right vectors based on mouse position
            const targetDirection = new THREE.Vector3();
            targetDirection.addScaledVector(cameraForward, 1); // Base forward movement
            targetDirection.addScaledVector(cameraRight, this.mousePosition.x); // Adjust based on horizontal mouse position
            
            // Calculate target position
            const targetDistance = 10; // How far ahead to look
            const targetPosition = this.localPlayer ? 
                this.localPlayer.position.clone().addScaledVector(targetDirection.normalize(), targetDistance) : 
                this.camera.position.clone().addScaledVector(targetDirection.normalize(), targetDistance);
            
            // Use this target position for player movement/rotation
            if (this.localPlayer) {
                const moveDirection = targetPosition.clone().sub(this.localPlayer.position).normalize();
                moveDirection.y = 0; // Keep on xz plane
                this.localPlayer.lookAt(moveDirection);
            }
        }
    }
    
    handleClick(event) {
        // If pointer is not locked, clicking will request pointer lock
        // (handled by the camera controller)
        
        // Handle player boost on right click
        if (event.button === 2) { // Right click
            this.socketManager.emit('boostPlayer');
            
            // Prevent context menu
            event.preventDefault();
            return false;
        }
    }
    
    // Window resize handler
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.cameraController.onWindowResize();
    }
    
    // Game state updates from server
    updateGameState(gameState) {
        // Keep track of current player IDs to detect disconnected players
        const currentPlayerIds = new Set();
        
        // Update players
        for (const playerData of gameState.players) {
            this.updatePlayer(playerData);
            currentPlayerIds.add(playerData.id);
        }
        
        // Check for disconnected players that are not in the current game state
        for (const [playerId, player] of this.players.entries()) {
            if (!currentPlayerIds.has(playerId) && playerId !== this.localPlayerId) {
                // Player is not in the current game state and is not the local player
                console.log('Player no longer in game state, removing:', playerId);
                this.removePlayer(playerId);
            }
        }
        
        // Keep track of current food IDs
        const currentFoodIds = new Set();
        
        // Update foods
        for (const foodData of gameState.foods) {
            this.updateFood(foodData);
            currentFoodIds.add(foodData.id);
        }
        
        // Check for consumed food that is not in the current game state
        for (const foodId of this.foods.keys()) {
            if (!currentFoodIds.has(foodId)) {
                this.removeFood(foodId);
            }
        }
        
        // Update viruses if provided in game state
        if (gameState.viruses) {
            this.updateViruses(gameState.viruses);
        }
        
        // Update mass orbs if provided in game state
        if (gameState.massOrbs) {
            this.updateMassOrbs(gameState.massOrbs);
        }
    }
    
    updatePlayer(playerData) {
        const { id, username, position, rotation, scale, color, mass, score } = playerData;
        
        if (this.players.has(id)) {
            // Update existing player
            const player = this.players.get(id);
            if (id !== this.localPlayerId) { // Don't override local player's position
                // Ensure player is not below the floor (minimum Y = 0)
                const adjustedPosition = position ? [...position] : null;
                if (adjustedPosition && adjustedPosition[1] < 0) {
                    adjustedPosition[1] = 0; // Set Y to floor level if below
                }
                
                player.updateFromServer(adjustedPosition, rotation, scale);
            }
            
            // Update mass and score for all players, including local player
            if (mass !== undefined) {
                player.mass = mass;
                player.updateSize();
            }
            
            // Update score if provided
            if (score !== undefined) {
                player.score = score;
            }
        } else {
            // Create new player
            const newPosition = new THREE.Vector3().fromArray(position);
            // Ensure player is not below the floor (minimum Y = 0)
            if (newPosition.y < 0) {
                newPosition.y = 0; // Set Y to floor level if below
            }
            
            const newPlayer = new Player({
                id,
                username,
                position: newPosition,
                color: new THREE.Color(color),
                mass: mass || 1,
                score: score || 0
            });
            
            // Add player mesh to the scene
            this.scene.add(newPlayer.mesh);
            
            // Add label directly to the scene instead of as a child of the player mesh
            if (newPlayer.label) {
                this.scene.add(newPlayer.label);
            }
            
            this.players.set(id, newPlayer);
        }
    }
    
    updateFood(foodData) {
        const { id, position, scale, color } = foodData;
        
        if (this.foods.has(id)) {
            // Update existing food
            const food = this.foods.get(id);
            food.updateFromServer(position, scale);
        } else {
            // Create new food
            const newFood = new Food({
                id,
                position: new THREE.Vector3().fromArray(position),
                scale: new THREE.Vector3().fromArray(scale),
                color: new THREE.Color(color)
            });
            this.scene.add(newFood.mesh);
            this.foods.set(id, newFood);
        }
    }
    
    // Add a new player from server event
    addPlayer(playerData) {
        this.updatePlayer(playerData);
    }
    
    // Remove a player who left
    removePlayer(id) {
        if (this.players.has(id)) {
            const player = this.players.get(id);
            
            // Remove player's mesh from the scene
            this.scene.remove(player.mesh);
            
            // Also remove the label
            if (player.label) {
                this.scene.remove(player.label);
            }
            
            this.players.delete(id);
        }
    }
    
    // Add new food from server event
    addFood(foodData) {
        this.updateFood(foodData);
    }
    
    // Remove consumed food
    removeFood(id) {
        if (this.foods.has(id)) {
            const food = this.foods.get(id);
            this.scene.remove(food.mesh);
            this.foods.delete(id);
        }
    }
    
    // Utility functions
    getRandomColor() {
        return new THREE.Color(
            Math.random(),
            Math.random(),
            Math.random()
        );
    }
    
    /**
     * Sets up the main input event handlers for mouse, keyboard, pointer locking, etc.
     */
    setupInputHandlers() {
        // Pointer lock listener
        window.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));

        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));

        // Mouse events
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mousedown', this.handleClick.bind(this));

        // Prevent default right-click context menu so right-click can be used for "boost"
        window.addEventListener('contextmenu', (event) => event.preventDefault());

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Set up escape menu button event listeners
        if (this.resumeButton && this.disconnectButton) {
            // Use one-time setup with persistent handlers
            const resumeHandler = this.resumeGame.bind(this);
            const disconnectHandler = this.disconnectFromGame.bind(this);
            
            // Store references to the bound handlers for later removal
            this.resumeButtonHandler = resumeHandler;
            this.disconnectButtonHandler = disconnectHandler;
            
            this.resumeButton.addEventListener('click', resumeHandler);
            this.disconnectButton.addEventListener('click', disconnectHandler);
        }
    }
    
    // Method to spawn initial viruses
    spawnInitialViruses(count) {
        console.log(`Spawning ${count} initial viruses`);
        
        for (let i = 0; i < count; i++) {
            // Create random positions within 90% of world bounds to avoid edge spawning
            // Use the boundaries defined in createBoundaries
            const position = new THREE.Vector3(
                (Math.random() * this.worldSize * 1.8) - this.worldSize * 0.9,
                0, // Keep on the ground plane
                (Math.random() * this.worldSize * 1.8) - this.worldSize * 0.9
            );
            
            // Create the virus with a unique ID
            const virusId = 'virus_' + crypto.randomUUID();
            this.addVirus({
                id: virusId,
                position: position
            });
            
            console.log(`Spawned virus ${virusId} at position:`, position);
        }
    }
    
    // Add a virus to the game
    addVirus(virusData) {
        // Convert position array to Vector3 if needed
        let position = virusData.position;
        if (Array.isArray(position)) {
            position = new THREE.Vector3().fromArray(position);
        }
        
        // Create the virus with the provided data
        const virus = new Virus({
            id: virusData.id,
            position: position,
            radius: virusData.radius || 2.5
        });
        
        // Add to the viruses collection
        this.viruses.set(virus.id, virus);
        
        // Add to the scene
        this.scene.add(virus.mesh);
        
        console.log(`Added virus ${virus.id} to game`);
        return virus;
    }
    
    // Remove a virus from the game
    removeVirus(id) {
        if (this.viruses.has(id)) {
            const virus = this.viruses.get(id);
            this.scene.remove(virus.mesh);
            virus.dispose();
            this.viruses.delete(id);
        }
    }
    
    // Spawn a new virus at a random position
    spawnNewVirus() {
        // Use the same boundary calculation as initial spawning
        const position = new THREE.Vector3(
            (Math.random() * this.worldSize * 1.8) - this.worldSize * 0.9,
            0,
            (Math.random() * this.worldSize * 1.8) - this.worldSize * 0.9
        );
        
        this.addVirus({
            id: 'virus_' + Date.now(),
            position: position
        });
    }
    
    // Add method for player fragments (for virus popping)
    addPlayerFragment(fragmentConfig) {
        // Create a new player instance for the fragment
        const fragment = new Player(fragmentConfig);
        
        // Add it to the scene
        this.scene.add(fragment.mesh);
        this.scene.add(fragment.label);
        
        // Add to players collection
        this.players.set(fragment.id, fragment);
        
        // Apply ejection impulse
        if (fragmentConfig.ejectionDirection && fragmentConfig.ejectionForce) {
            // Store ejection data for movement in the update loop
            fragment.ejectionDirection = fragmentConfig.ejectionDirection;
            fragment.ejectionForce = fragmentConfig.ejectionForce;
            fragment.ejectionTime = 0.5; // Duration of ejection force in seconds
        }
        
        return fragment;
    }
    
    // Handle virus updates from server if needed
    updateViruses(virusData) {
        virusData.forEach(data => {
            if (this.viruses.has(data.id)) {
                // Update existing virus
                const virus = this.viruses.get(data.id);
                virus.updateFromServer(new THREE.Vector3(data.position.x, data.position.y, data.position.z));
            } else {
                // Add new virus
                this.addVirus(data);
            }
        });
    }
    
    // Add method for mass orbs
    addMassOrb(orbData) {
        // Create the mass orb with the provided data
        const orb = new MassOrb({
            id: orbData.id,
            ownerId: orbData.ownerId,
            position: orbData.position,
            velocity: orbData.velocity,
            mass: orbData.mass,
            radius: orbData.radius,
            color: orbData.color,
            creationTime: orbData.creationTime
        });
        
        // Add to the mass orbs collection
        this.massOrbs.set(orb.id, orb);
        
        // Add to the scene
        this.scene.add(orb.mesh);
        
        console.log(`Added mass orb ${orb.id} to game`);
        return orb;
    }
    
    // Update mass orbs
    updateMassOrbs(orbData) {
        // Track existing mass orbs to detect removed ones
        const existingIds = new Set(this.massOrbs.keys());
        
        // Update or add mass orbs
        for (const data of orbData) {
            const id = data.id;
            existingIds.delete(id);
            
            if (this.massOrbs.has(id)) {
                // Update existing mass orb
                this.massOrbs.get(id).updateFromServer(data);
            } else {
                // Add new mass orb
                this.addMassOrb(data);
            }
        }
        
        // Remove mass orbs that no longer exist
        for (const id of existingIds) {
            this.removeMassOrb(id);
        }
    }
    
    // Remove a mass orb from the game
    removeMassOrb(id) {
        const massOrb = this.massOrbs.get(id);
        if (massOrb) {
            // Remove from scene
            this.scene.remove(massOrb.mesh);
            
            // Clean up resources
            massOrb.dispose();
            
            // Remove from collection
            this.massOrbs.delete(id);
        }
    }
    
    // Add this new method to set up socket event handlers
    setupSocketEvents() {
        // Player connection events
        this.socketManager.on('playerJoined', (data) => {
            console.log('Player joined the game:', data);
            this.addPlayer(data);
        });
        
        this.socketManager.on('playerLeft', (id) => {
            console.log('Player left the game:', id);
            this.removePlayer(id);
        });
        
        // Handle player split event
        this.socketManager.on('playerSplit', (data) => {
            this.handlePlayerSplit(data);
        });
        
        // Handle player boost event
        this.socketManager.on('playerBoosted', (data) => {
            this.handlePlayerBoost(data);
        });
        
        // Handle mass orb events
        this.socketManager.on('massEjected', (massData) => {
            this.addMassOrb(massData);
        });
        
        this.socketManager.on('massConsumed', (massId) => {
            this.removeMassOrb(massId);
        });

        // Handle virus events
        this.socketManager.on('virusSpawned', (virusData) => {
            this.addVirus(virusData);
        });
        
        this.socketManager.on('virusConsumed', (id) => {
            this.removeVirus(id);
        });
        
        // Display server messages in the UI
        this.socketManager.on('serverMessage', (message) => {
            this.displayServerMessage(message);
        });
        
        // Handle other socket events as needed
    }
    
    // Display server messages in the UI
    displayServerMessage(message) {
        const messagesElement = document.getElementById('messages');
        if (messagesElement) {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.type || 'info'}`;
            messageElement.textContent = message.message;
            messagesElement.appendChild(messageElement);
            
            // Auto-remove message after 5 seconds
            setTimeout(() => {
                if (messageElement.parentNode === messagesElement) {
                    messagesElement.removeChild(messageElement);
                }
            }, 5000);
        }
    }
    
    // Handle player split event from the server
    handlePlayerSplit(data) {
        const { parentId, fragment } = data;
        
        // Get the parent player that split
        const parentPlayer = this.players.get(parentId);
        if (!parentPlayer) {
            console.error('Parent player not found for split:', parentId);
            return;
        }
        
        // Create a new player for the fragment
        const fragmentPlayer = new Player({
            id: fragment.id,
            username: fragment.username,
            position: new THREE.Vector3().fromArray(fragment.position),
            color: new THREE.Color(parseInt(fragment.color, 16)),
            mass: fragment.mass,
            radius: Math.cbrt(fragment.mass),
            // Set fragment properties to enable visual effects
            isFragment: true,
            ejectionDirection: new THREE.Vector3().fromArray(fragment.velocity).normalize(),
            ejectionForce: 25 // Increase force for more dramatic effect
        });
        
        // Add the fragment to the scene and player list
        this.scene.add(fragmentPlayer.mesh);
        this.players.set(fragment.id, fragmentPlayer);
        
        // Add particle effect at split point for visual flair
        this.addSplitParticles(parentPlayer.position.clone(), parentPlayer.color);
        
        // Add a camera shake effect for dramatic effect
        if (parentId === this.localPlayerId) {
            this.cameraController.addShake(0.3, 0.2); // intensity, duration
        }
        
        console.log(`Player ${parentId} split, created fragment ${fragment.id}`);
    }
    
    // Add a particle effect when a player splits
    addSplitParticles(position, color) {
        // Create a simple particle system for the split effect
        const particleCount = 15;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        // Set up particles in a spherical pattern
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: color,
            size: 0.3,
            transparent: true,
            opacity: 0.8
        });
        
        const particles = new THREE.Points(geometry, particleMaterial);
        this.scene.add(particles);
        
        // Store velocities for each particle
        const velocities = [];
        for (let i = 0; i < particleCount; i++) {
            // Random direction
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            ).normalize().multiplyScalar(5 + Math.random() * 5);
            velocities.push(velocity);
        }
        
        // Animation duration
        const duration = 0.5;
        let elapsed = 0;
        
        // Create animation function
        const animate = (deltaTime) => {
            elapsed += deltaTime;
            
            // Update particle positions
            const positions = particles.geometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                
                // Apply velocity
                positions[i3] += velocities[i].x * deltaTime;
                positions[i3 + 1] += velocities[i].y * deltaTime;
                positions[i3 + 2] += velocities[i].z * deltaTime;
                
                // Fade out based on elapsed time
                particleMaterial.opacity = 0.8 * (1 - elapsed / duration);
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            
            // Remove when animation is complete
            if (elapsed >= duration) {
                this.scene.remove(particles);
                particles.geometry.dispose();
                particleMaterial.dispose();
                return;
            }
            
            // Continue animation with proper time handling
            const now = performance.now();
            requestAnimationFrame(() => animate((now - lastTime) / 1000));
            lastTime = now;
        };
        
        // Start animation
        let lastTime = performance.now();
        requestAnimationFrame(() => animate(1/60));
    }

    // Helper method to calculate direction based on mouse position
    calculateMouseDirection() {
        // Get camera's forward direction
        const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        cameraForward.y = 0; // Keep on xz plane
        cameraForward.normalize();
        
        // Get camera's right direction
        const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        cameraRight.y = 0; // Keep on xz plane
        cameraRight.normalize();
        
        // Calculate movement direction based on mouse position
        const direction = new THREE.Vector3();
        
        // Add forward movement
        direction.addScaledVector(cameraForward, 1);
        
        // Add horizontal adjustment based on mouse x position
        direction.addScaledVector(cameraRight, this.mousePosition.x);
        
        // Normalize the direction vector
        return direction.normalize();
    }

    // Method to spawn initial food
    spawnInitialFood(count) {
        console.log(`Spawning ${count} initial food items`);
        
        for (let i = 0; i < count; i++) {
            this.spawnNewFood();
        }
    }
    
    // Spawn a new food item at a random position
    spawnNewFood() {
        // Create random position within 80% of world bounds to avoid edge spawning
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * this.worldSize * 0.8,
            0, // Keep on the ground plane
            (Math.random() - 0.5) * this.worldSize * 0.8
        );
        
        // Create a new food item with random properties
        const foodId = 'food_' + crypto.randomUUID();
        const mass = Math.random() * 2 + 1; // Random mass between 1 and 3
        const radius = 0.3 + (mass * 0.1); // Small radius based on mass
        
        const newFood = new Food({
            id: foodId,
            position: position,
            mass: mass
        });
        
        // Add to the foods collection
        this.foods.set(foodId, newFood);
        
        // Add to the scene
        this.scene.add(newFood.mesh);
        
        return newFood;
    }

    addBoostParticles(position, color) {
        // Create a particle system for the boost effect
        const particleCount = 50;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);
        
        // Get player's backward direction (opposite of facing direction)
        const backwardDirection = new THREE.Vector3(0, 0, 1);
        if (this.localPlayer) {
            backwardDirection.applyQuaternion(this.localPlayer.rotation);
        }
        
        // Create particles in a cone shape behind the player
        for (let i = 0; i < particleCount; i++) {
            // Random position in a cone behind the player
            const angle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25; // -45 to +45 degrees
            const distance = Math.random() * 3 + 1; // 1 to 4 units behind
            
            // Calculate direction with some randomness
            const particleDir = backwardDirection.clone();
            particleDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
            
            // Set position
            const particlePos = position.clone().add(
                particleDir.multiplyScalar(distance)
            );
            
            particlePositions[i * 3] = particlePos.x;
            particlePositions[i * 3 + 1] = particlePos.y;
            particlePositions[i * 3 + 2] = particlePos.z;
            
            // Random size
            particleSizes[i] = Math.random() * 0.5 + 0.2;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
        
        // Create particle material
        const particleMaterial = new THREE.PointsMaterial({
            color: color,
            size: 0.5,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Create particle system
        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(particleSystem);
        
        // Animate particles
        const animateParticles = () => {
            const positions = particleGeometry.attributes.position.array;
            const sizes = particleGeometry.attributes.size.array;
            
            for (let i = 0; i < particleCount; i++) {
                // Move particles outward and fade
                const index = i * 3;
                const dir = new THREE.Vector3(
                    positions[index] - position.x,
                    positions[index + 1] - position.y,
                    positions[index + 2] - position.z
                ).normalize();
                
                // Move particle
                positions[index] += dir.x * 0.2;
                positions[index + 1] += dir.y * 0.2;
                positions[index + 2] += dir.z * 0.2;
                
                // Shrink particle
                sizes[i] *= 0.95;
            }
            
            particleGeometry.attributes.position.needsUpdate = true;
            particleGeometry.attributes.size.needsUpdate = true;
            
            // Continue animation or remove when particles are too small
            if (sizes[0] > 0.01) {
                requestAnimationFrame(animateParticles);
            } else {
                this.scene.remove(particleSystem);
                particleGeometry.dispose();
                particleMaterial.dispose();
            }
        };
        
        // Start animation
        animateParticles();
    }

    // Handle player boost event from the server
    handlePlayerBoost(data) {
        const { id, position, mass } = data;
        
        // Get the player that boosted
        const player = this.players.get(id);
        if (!player) {
            console.error('Player not found for boost:', id);
            return;
        }
        
        // Update player mass
        player.mass = mass;
        player.updateSize();
        
        // Add boost particles for visual effect
        this.addBoostParticles(player.position, player.color);
        
        // If this is the local player, we've already handled the visual effect
        // Otherwise, we need to update the player's position from the server
        if (id !== this.localPlayerId) {
            player.position.set(position[0], position[1], position[2]);
        }
    }

    // Toggle the escape menu
    toggleEscapeMenu() {
        this.escapeMenuActive = !this.escapeMenuActive;
        
        if (this.escapeMenuActive) {
            // Show escape menu
            this.escapeMenu.classList.remove('hidden');
            
            // Exit pointer lock if active
            if (document.pointerLockElement === this.renderer.domElement) {
                document.exitPointerLock();
            }
        } else {
            // Hide escape menu
            this.escapeMenu.classList.add('hidden');
        }
    }
    
    // Resume the game (hide menu and re-lock pointer)
    resumeGame() {
        this.escapeMenuActive = false;
        this.escapeMenu.classList.add('hidden');
        
        // Re-lock the pointer
        this.renderer.domElement.requestPointerLock();
    }
    
    // Disconnect from the game and return to start screen
    disconnectFromGame() {
        // Hide escape menu
        this.escapeMenuActive = false;
        this.escapeMenu.classList.add('hidden');
        
        // Disconnect from server
        this.socketManager.disconnect();
        
        // Show start screen
        document.getElementById('start-screen').style.display = 'flex';
        document.getElementById('game-ui').style.display = 'none';
        
        // Stop the game loop
        this.isRunning = false;
    }
}