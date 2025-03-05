// Updated Game initialization with mouse capture integration

import { THREE, OrbitControls, WebGL } from '../lib/three-instance.js';
import { Player } from './player.js';
import { Food } from './food.js';
import { CameraController } from './camera.js';
import { PhysicsSystem } from './physics.js';
import { RenderSystem } from './rendering.js';

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
        
        // Initialize systems
        this.initThree();
        this.initSystems();
        this.initLocalPlayer();
        
        // Setup pointer lock listener
        window.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
        
        // Add UI indicator for mouse capture
        this.createMouseCaptureIndicator();
        
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
        
        // Set up renderer with explicit WebGL context
        try {
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true,
                canvas: document.createElement('canvas'),
                powerPreference: 'high-performance'
            });
            
            console.log('WebGL renderer created successfully');
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.container.innerHTML = ''; // Clear any previous content
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
        
        // Create game boundaries
        this.createBoundaries();
        
        // Add a test object to confirm rendering is working
        this.addTestObject();
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
    }
    
    addCoordinateHelpers() {
        // Add axes helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
        
        // Add grid helper
        const gridHelper = new THREE.GridHelper(100, 100);
        this.scene.add(gridHelper);
    }
    
    createBoundaries() {
        // Create a wireframe box to represent game boundaries
        const geometry = new THREE.BoxGeometry(100, 100, 100);
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        this.boundaries = new THREE.LineSegments(edges, material);
        this.scene.add(this.boundaries);
    }
    
    addTestObject() {
        // Add a bright, visible test object to verify rendering is working
        const geometry = new THREE.BoxGeometry(5, 5, 5);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff00ff, // Bright magenta color
            wireframe: true,
            linewidth: 2
        });
        this.testCube = new THREE.Mesh(geometry, material);
        this.testCube.position.set(0, 5, 0); // Position above the origin
        this.scene.add(this.testCube);
        
        // Log that the test object was added
        console.log('Test object added to scene');
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
        
        // Update physics (collision detection)
        this.physicsSystem.update(deltaTime, this.players, this.foods, this.localPlayerId);
        
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
    }
    
    render() {
        // Render the scene
        try {
            if (!this.renderer) {
                console.error('Renderer is not initialized');
                return;
            }
            
            // Rotate test cube if it exists to make sure animation is working
            if (this.testCube) {
                this.testCube.rotation.x += 0.01;
                this.testCube.rotation.y += 0.01;
            }
            
            console.log('Rendering scene');
            this.renderer.render(this.scene, this.camera);
        } catch (e) {
            console.error('Error in render method:', e);
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
}