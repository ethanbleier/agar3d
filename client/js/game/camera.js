// Camera controller for following the player

import { THREE, OrbitControls } from '../lib/three-instance.js';

export class CameraController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.targetPosition = new THREE.Vector3();
        this.offset = new THREE.Vector3(0, 15, 15); // Default camera offset from player
        this.smoothFactor = 0.1; // Lower value = smoother camera (but more lag)
        this.zoomFactor = 1.0;
        
        // Mouse control variables
        this.isPointerLocked = false;
        this.mouseSensitivity = 0.002; // Adjust based on preference
        this.yawAngle = 0;  // Horizontal rotation
        this.pitchAngle = 0; // Vertical rotation (limited range)
        this.minPitchAngle = -Math.PI / 3; // Limit looking down
        this.maxPitchAngle = Math.PI / 3;  // Limit looking up
        
        // Set initial camera position
        this.camera.position.copy(this.offset);
        this.camera.lookAt(0, 0, 0);
        
        // Handle mouse wheel for zoom
        window.addEventListener('wheel', this.handleMouseWheel.bind(this));
        
        // Set up pointer lock
        this.setupPointerLock();
    }
    
    setupPointerLock() {
        // Pointer lock event listeners
        document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this), false);
        document.addEventListener('pointerlockerror', this.onPointerLockError.bind(this), false);
        
        // Mouse movement listener for when pointer is locked
        document.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        
        // Add key press listener for toggling pointer lock (Escape key is handled by the browser)
        document.addEventListener('keydown', this.onKeyDown.bind(this), false);
        
        // Click on game container to request pointer lock
        this.domElement.addEventListener('click', this.requestPointerLock.bind(this), false);
    }
    
    requestPointerLock() {
        if (!this.isPointerLocked) {
            this.domElement.requestPointerLock();
        }
    }
    
    exitPointerLock() {
        if (this.isPointerLocked) {
            document.exitPointerLock();
        }
    }
    
    onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === this.domElement;
        
        // Dispatch a custom event that the game can listen for
        const event = new CustomEvent('pointerlockchange', { 
            detail: { locked: this.isPointerLocked } 
        });
        window.dispatchEvent(event);
    }
    
    onPointerLockError() {
        console.error('Pointer lock failed');
        
        // Show a message to the user
        const message = document.createElement('div');
        message.textContent = 'Pointer lock is not available or was denied. Click again to try.';
        message.style.position = 'absolute';
        message.style.top = '10px';
        message.style.left = '10px';
        message.style.color = 'white';
        message.style.padding = '10px';
        message.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        message.style.borderRadius = '5px';
        message.style.zIndex = '1000';
        document.body.appendChild(message);
        
        // Remove the message after 5 seconds
        setTimeout(() => {
            document.body.removeChild(message);
        }, 5000);
    }
    
    onMouseMove(event) {
        if (!this.isPointerLocked) return;
        
        // Update camera angles based on mouse movement
        this.yawAngle -= event.movementX * this.mouseSensitivity;
        this.pitchAngle -= event.movementY * this.mouseSensitivity;
        
        // Clamp pitch to avoid flipping
        this.pitchAngle = Math.max(this.minPitchAngle, Math.min(this.maxPitchAngle, this.pitchAngle));
    }
    
    onKeyDown(event) {
        // Toggle pointer lock with 'L' key
        if (event.key === 'l' || event.key === 'L') {
            if (this.isPointerLocked) {
                this.exitPointerLock();
            } else {
                this.requestPointerLock();
            }
        }
        
        // Toggle camera mode with 'C' key
        if (event.key === 'c' || event.key === 'C') {
            this.cycleCameraMode();
        }
    }
    
    cycleCameraMode() {
        // Cycle through camera modes
        if (this.currentCameraMode === 'follow') {
            this.setCameraMode('top');
        } else if (this.currentCameraMode === 'top') {
            this.setCameraMode('firstPerson');
        } else if (this.currentCameraMode === 'firstPerson') {
            this.setCameraMode('dynamic');
        } else {
            this.setCameraMode('follow');
        }
        
        // Dispatch an event for UI feedback
        const event = new CustomEvent('cameramodechange', { 
            detail: { mode: this.currentCameraMode } 
        });
        window.dispatchEvent(event);
    }
    
    followPlayer(playerPosition, playerRotation, deltaTime) {
        // Store the target position (player position)
        this.targetPosition.copy(playerPosition);
        
        // Calculate the camera position based on camera mode and orientation
        if (this.isPointerLocked) {
            // When pointer is locked, use yaw and pitch for camera orientation
            let offsetX = this.offset.z * Math.sin(this.yawAngle) * Math.cos(this.pitchAngle);
            let offsetY = this.offset.z * Math.sin(this.pitchAngle);
            let offsetZ = this.offset.z * Math.cos(this.yawAngle) * Math.cos(this.pitchAngle);
            
            const offsetVec = new THREE.Vector3(offsetX, offsetY + this.offset.y, offsetZ);
            offsetVec.multiplyScalar(this.zoomFactor);
            
            // Calculate the target camera position
            const targetCameraPosition = new THREE.Vector3().copy(playerPosition).add(offsetVec);
            
            // Smoothly interpolate to the new position
            this.camera.position.lerp(targetCameraPosition, this.smoothFactor);
            
            // Make camera look at player position
            this.camera.lookAt(this.targetPosition);
        } else {
            // When pointer is not locked, use simple follow camera
            // Calculate target position (player position + offset)
            const targetCameraPosition = new THREE.Vector3().copy(playerPosition).add(
                this.offset.clone().multiplyScalar(this.zoomFactor)
            );
            
            // Smooth camera movement
            this.camera.position.lerp(targetCameraPosition, this.smoothFactor);
            
            // Make camera look at player position
            this.camera.lookAt(this.targetPosition);
        }
    }
    
    handleMouseWheel(event) {
        // Zoom in/out based on mouse wheel
        const zoomDelta = event.deltaY * 0.001;
        this.zoomFactor = Math.max(0.5, Math.min(3.0, this.zoomFactor + zoomDelta));
    }
    
    setOrbitControls(renderer) {
        // Optional: Add orbit controls for debugging
        this.controls = new OrbitControls(this.camera, renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI / 2;
        
        // Disable orbit controls when pointer is locked
        window.addEventListener('pointerlockchange', () => {
            if (this.controls) {
                this.controls.enabled = !this.isPointerLocked;
            }
        });
    }
    
    updateOrbitControls() {
        if (this.controls && this.controls.enabled) {
            this.controls.update();
        }
    }
    
    // Set camera type based on player size or game state
    setCameraMode(mode, playerScale) {
        this.currentCameraMode = mode;
        
        switch (mode) {
            case 'follow':
                // Standard follow camera
                this.offset.set(0, 15, 15);
                break;
                
            case 'top':
                // Top-down view
                this.offset.set(0, 30, 0);
                break;
                
            case 'firstPerson':
                // First-person view (for fun)
                this.offset.set(0, 2, -2);
                break;
                
            case 'dynamic':
                // Scale camera distance based on player size
                const scale = playerScale ? playerScale.x : 1;
                const distance = 15 + scale * 5;
                this.offset.set(0, distance, distance);
                break;
        }
    }
    
    onWindowResize() {
        // Update camera aspect ratio on window resize
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
    
    // Display UI message for pointer lock status
    showUIMessage(message, duration = 3000) {
        const existingMessage = document.getElementById('camera-message');
        if (existingMessage) {
            document.body.removeChild(existingMessage);
        }
        
        const messageElement = document.createElement('div');
        messageElement.id = 'camera-message';
        messageElement.textContent = message;
        messageElement.style.position = 'absolute';
        messageElement.style.bottom = '20px';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translateX(-50%)';
        messageElement.style.color = 'white';
        messageElement.style.padding = '10px';
        messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        messageElement.style.borderRadius = '5px';
        messageElement.style.zIndex = '1000';
        messageElement.style.fontFamily = 'Arial, sans-serif';
        messageElement.style.textAlign = 'center';
        document.body.appendChild(messageElement);
        
        setTimeout(() => {
            if (document.body.contains(messageElement)) {
                document.body.removeChild(messageElement);
            }
        }, duration);
    }
}