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
        
        // Initialize systems
        this.initThree();
        this.initSystems();
        this.initLocalPlayer();
        
        // Add our new setupInputHandlers call
        this.setupInputHandlers();
        
        // Add UI indicator for mouse capture
        this.createMouseCaptureIndicator();
        
        // Log the number of viruses spawned
        console.log(`Game initialized with ${this.viruses.size} viruses`);
        
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
        this.scene.background = new THREE.Color(0x000040); // Dark blue background
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1).normalize();
        this.scene.add(directionalLight);
        
        // Instead of using "powerPreference: 'high-performance'", revert to a simpler config
        try {
            this.renderer = new THREE.WebGLRenderer({
                antialias: true, // Keep antialiasing for better visual quality
                alpha: true      // Allow alpha if needed, or set to false if you prefer opaque
            });
            
            console.log('WebGL renderer created successfully');
            
            // Use device pixel ratio for higher-res rendering
            this.renderer.setPixelRatio(window.devicePixelRatio);
            
            // Fill the window and maintain aspect ratio
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            
            // Clear out any old content from container
            this.container.innerHTML = '';
            this.container.appendChild(this.renderer.domElement);
            
            // Force a clear to ensure WebGL context is working
            this.renderer.setClearColor(0x000040, 1);
            this.renderer.clear();
        } catch (e) {
            console.error('Error creating WebGL renderer:', e);
            const warning = document.createElement('div');
            warning.style.color = 'red';
            warning.textContent = 'Error initializing WebGL renderer: ' + e.message;
            this.container.appendChild(warning);
            return;
        }
        
        // Set up camera
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(0, 30, 30);
        this.camera.lookAt(0, 0, 0);
        
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
        indicator.textContent = 'Click to capture mouse (L to toggle)';
        document.body.appendChild(indicator);
    }
    
    updateMouseCaptureIndicator() {
        const indicator = document.getElementById('mouse-capture-indicator');
        if (indicator) {
            if (this.pointerLocked) {
                indicator.textContent = 'Mouse Captured (ESC or L to release)';
                indicator.style.backgroundColor = 'rgba(0, 150, 0, 0.5)';
            } else {
                indicator.textContent = 'Click to capture mouse (L to toggle)';
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
        
        // Create a "blob" geometry and attach it to the player so it moves with them
        const blobGeometry = new THREE.SphereGeometry(2, 16, 16);
        const blobMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const blobMesh = new THREE.Mesh(blobGeometry, blobMaterial);
        blobMesh.position.set(0, 3, 0);
        this.localPlayer.mesh.add(blobMesh);
    }
    
    addCoordinateHelpers() {
        // Add axes helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
        
        // Make the grid 5x bigger: from 100 => 500
        const gridHelper = new THREE.GridHelper(500, 500);
        this.scene.add(gridHelper);
    }
    
    createBoundaries() {
        // Remove or comment out the old wireframe box
        /*
        // const geometry = new THREE.BoxGeometry(100, 100, 100);
        // const edges = new THREE.EdgesGeometry(geometry);
        // const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        // this.boundaries = new THREE.LineSegments(edges, material);
        // this.scene.add(this.boundaries);
        */
        
        // Instead, create a more visible circular border that's distinct from the grid
        const borderGeometry = new THREE.RingGeometry(245, 250, 64); // ring for a 500x500 map
        const borderMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
        const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
        borderMesh.rotation.x = -Math.PI / 2; // lay it flat
        borderMesh.position.y = 0.1;         // slightly above the grid
        this.scene.add(borderMesh);
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
        const deltaTime = (now - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = now;
        
        if (!this.isRunning || !this.localPlayer) return;
        
        // Update player movement based on input
        this.updatePlayerInput(deltaTime);
        
        // Update all players
        for (const player of this.players.values()) {
            player.update(deltaTime);
        }
        
        // Update foods (rotation, etc.)
        for (const food of this.foods.values()) {
            food.update(deltaTime);
        }
        
        // Update mass orbs
        for (const massOrb of this.massOrbs.values()) {
            massOrb.update(deltaTime);
        }
        
        // Update physics (collision detection) - now passing viruses
        this.physicsSystem.update(deltaTime, this.players, this.foods, this.localPlayerId, this.viruses);
        
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
        // Calculate movement direction based on keys and camera orientation
        const moveDirection = new THREE.Vector3(0, 0, 0);
        
        // Get camera's forward and right vectors for movement relative to camera
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        forward.y = 0; // Keep movement on the xz plane
        forward.normalize();
        
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        right.y = 0; // Keep movement on the xz plane
        right.normalize();
        
        // Apply movement based on WASD/arrow keys
        if (this.keys['w'] || this.keys['ArrowUp']) moveDirection.add(forward);
        if (this.keys['s'] || this.keys['ArrowDown']) moveDirection.sub(forward);
        if (this.keys['a'] || this.keys['ArrowLeft']) moveDirection.sub(right);
        if (this.keys['d'] || this.keys['ArrowRight']) moveDirection.add(right);
        
        // Vertical movement
        if (this.keys[' ']) moveDirection.y += 1; // Space to move up
        if (this.keys['Shift']) moveDirection.y -= 1; // Shift to move down
        
        // Normalize movement direction if moving
        if (moveDirection.lengthSq() > 0) {
            moveDirection.normalize();
            this.localPlayer.move(moveDirection, deltaTime);
            
            // Make the player look in the movement direction
            if (moveDirection.x !== 0 || moveDirection.z !== 0) {
                const lookDirection = new THREE.Vector3(moveDirection.x, 0, moveDirection.z).normalize();
                this.localPlayer.lookAt(lookDirection);
            }
        }
    }
    
    // Event handlers
    handleKeyDown(event) {
        this.keys[event.key] = true;
        
        // Handle special keys
        if (event.key === ' ' && !event.repeat) {
            // Space bar for splitting
            this.socketManager.emit('splitPlayer');
            console.log('Split command sent to server');
        } else if (event.key === 'e' && !event.repeat) {
            // 'e' key for ejecting mass
            this.socketManager.emit('ejectMass');
            console.log('Eject mass command sent to server');
        } else if (event.key === 'c' && !event.repeat) {
            // 'c' key for changing camera view
            this.cameraController.toggleCameraMode();
        } else if (event.key === 'l' && !event.repeat) {
            // 'l' key for toggling pointer lock
            if (document.pointerLockElement === this.renderer.domElement) {
                document.exitPointerLock();
            } else {
                this.renderer.domElement.requestPointerLock();
            }
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
            // Update mouse position for non-locked mode
            this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            // Use mouse position to determine direction in 3D space
            const vector = new THREE.Vector3(this.mousePosition.x, this.mousePosition.y, 0.5);
            vector.unproject(this.camera);
            const dir = vector.sub(this.camera.position).normalize();
            const distance = -this.camera.position.y / dir.y;
            const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
            
            // Calculate direction from player to target point on the plane
            if (this.localPlayer) {
                const targetDirection = pos.sub(this.localPlayer.position).normalize();
                // Ignore Y component for a more intuitive control
                targetDirection.y = 0;
                targetDirection.normalize();
                this.localPlayer.lookAt(targetDirection);
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
        // Update players
        for (const playerData of gameState.players) {
            this.updatePlayer(playerData);
        }
        
        // Update foods
        for (const foodData of gameState.foods) {
            this.updateFood(foodData);
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
        const { id, username, position, rotation, scale, color } = playerData;
        
        if (this.players.has(id)) {
            // Update existing player
            const player = this.players.get(id);
            if (id !== this.localPlayerId) { // Don't override local player's position
                player.updateFromServer(position, rotation, scale);
            }
        } else {
            // Create new player
            const newPlayer = new Player({
                id,
                username,
                position: new THREE.Vector3().fromArray(position),
                color: new THREE.Color(color)
            });
            this.scene.add(newPlayer.mesh);
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
            this.scene.remove(player.mesh);
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
    }
    
    // Method to spawn initial viruses
    spawnInitialViruses(count) {
        console.log(`Spawning ${count} initial viruses`);
        
        for (let i = 0; i < count; i++) {
            // Create random positions within 80% of world bounds to avoid edge spawning
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * this.worldSize * 0.8,
                0, // Keep on the ground plane
                (Math.random() - 0.5) * this.worldSize * 0.8
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
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * this.worldSize * 0.8,
            0,
            (Math.random() - 0.5) * this.worldSize * 0.8
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
}