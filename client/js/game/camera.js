// client/js/game/camera.js - Camera controller for following the player

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraController {
    constructor(camera) {
        this.camera = camera;
        this.targetPosition = new THREE.Vector3();
        this.offset = new THREE.Vector3(0, 15, 15); // Default camera offset from player
        this.smoothFactor = 0.1; // Lower value = smoother camera (but more lag)
        this.zoomFactor = 1.0;
        
        // Set initial camera position
        this.camera.position.copy(this.offset);
        this.camera.lookAt(0, 0, 0);
        
        // Handle mouse wheel for zoom
        window.addEventListener('wheel', this.handleMouseWheel.bind(this));
    }
    
    followPlayer(playerPosition, deltaTime) {
        // Calculate target position (player position + offset)
        this.targetPosition.copy(playerPosition);
        
        // Calculate the camera position with smooth interpolation
        const targetCameraPosition = new THREE.Vector3().copy(playerPosition).add(this.offset.clone().multiplyScalar(this.zoomFactor));
        this.camera.position.lerp(targetCameraPosition, this.smoothFactor);
        
        // Make camera look at player position
        this.camera.lookAt(this.targetPosition);
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
    }
    
    updateOrbitControls() {
        if (this.controls) {
            this.controls.update();
        }
    }
    
    // Set camera type based on player size or game state
    setCameraMode(mode, playerScale) {
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
                const distance = 15 + playerScale.x * 5;
                this.offset.set(0, distance, distance);
                break;
        }
    }
    
    onWindowResize() {
        // Update camera aspect ratio on window resize
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}