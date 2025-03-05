// Player class for Agar3D

import { THREE } from '../lib/three-instance.js';

export class Player {
    constructor(config) {
        this.id = config.id;
        this.username = config.username;
        this.position = config.position || new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Quaternion();
        this.scale = new THREE.Vector3(1, 1, 1);
        this.color = config.color || new THREE.Color(0xffffff);
        this.moveSpeed = 10; // Units per second
        this.mass = config.mass || 1; // Initial mass
        this.radius = config.radius || 1; // Initial radius
        
        // Create mesh
        this.createMesh();
        
        // Create username label
        this.createLabel();

        // If this is a fragment from a virus pop
        if (config.isFragment) {
            this.ejectionDirection = config.ejectionDirection;
            this.ejectionForce = config.ejectionForce;
            this.ejectionTime = 0.5; // Duration of ejection force in seconds
        }
    }
    
    createMesh() {
        // Create sphere for the player
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: this.color,
            shininess: 30,
            transparent: true,
            opacity: 0.9
        });
        
        this.mesh = new THREE.Group(); // Container for all player objects
        this.sphereMesh = new THREE.Mesh(geometry, material);
        this.mesh.add(this.sphereMesh);
        
        // Position the mesh
        this.mesh.position.copy(this.position);
    }
    
    createLabel() {
        // Create a canvas for the username label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Draw the username on the canvas
        context.font = 'Bold 24px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText(this.username, canvas.width / 2, canvas.height / 2);
        
        // Create a texture from the canvas
        const texture = new THREE.CanvasTexture(canvas);
        
        // Create a sprite with the texture
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        this.label = new THREE.Sprite(spriteMaterial);
        this.label.scale.set(2, 0.5, 1);
        this.label.position.set(0, 1.5, 0); // Position above the sphere
        
        // Add the label to the player mesh
        this.mesh.add(this.label);
    }
    
    update(deltaTime) {
        // Update mesh position based on player position
        this.mesh.position.copy(this.position);
        
        // Always make the label face the camera
        if (this.label) {
            this.label.quaternion.copy(this.mesh.parent.quaternion).invert();
        }
        
        // Scale the move speed based on mass (larger players move slower)
        this.moveSpeed = 10 / Math.sqrt(this.mass);
    }
    
    move(direction, deltaTime) {
        // Apply movement based on direction and speed
        const moveDelta = direction.clone().multiplyScalar(this.moveSpeed * deltaTime);
        this.position.add(moveDelta);
        
        // Apply movement bounds
        const bounds = 50; // Half the size of the game boundaries
        this.position.x = Math.max(-bounds, Math.min(bounds, this.position.x));
        this.position.y = Math.max(-bounds, Math.min(bounds, this.position.y));
        this.position.z = Math.max(-bounds, Math.min(bounds, this.position.z));
    }
    
    lookAt(direction) {
        // Make the player look in the specified direction
        const lookAtPoint = this.position.clone().add(direction);
        this.mesh.lookAt(lookAtPoint);
        
        // Store rotation
        this.mesh.getWorldQuaternion(this.rotation);
    }
    
    updateSize() {
        // Update radius based on mass
        this.radius = Math.cbrt(this.mass);
        
        // Update scale
        this.scale.set(this.radius, this.radius, this.radius);
        this.sphereMesh.scale.copy(this.scale);
        
        // Update label position and scale
        if (this.label) {
            const labelScale = Math.min(2 * this.radius, 4);
            this.label.scale.set(labelScale, labelScale * 0.25, 1);
            this.label.position.y = 1.5 * this.radius;
        }
    }
    
    grow(amount) {
        this.mass += amount;
        this.updateSize();
    }
    
    split() {
        // This will be handled by the server
        // Client-side anticipation can be added here
    }
    
    boost() {
        // This will be handled by the server
        // Client-side anticipation can be added here
    }
    
    updateFromServer(position, rotation, scale) {
        // Update position from server (with interpolation for smoothness)
        const positionArray = position;
        const serverPosition = new THREE.Vector3().fromArray(positionArray);
        this.position.lerp(serverPosition, 0.3); // Smooth interpolation
        
        // Update rotation from server
        const rotationArray = rotation;
        const serverRotation = new THREE.Quaternion().fromArray(rotationArray);
        this.rotation.slerp(serverRotation, 0.3); // Smooth interpolation
        this.mesh.quaternion.copy(this.rotation);
        
        // Update scale from server
        const scaleArray = scale;
        const serverScale = new THREE.Vector3().fromArray(scaleArray);
        this.scale.lerp(serverScale, 0.3); // Smooth interpolation
        this.sphereMesh.scale.copy(this.scale);
        
        // Update physics values based on scale
        this.radius = this.scale.x; // Assuming uniform scaling
        this.mass = Math.pow(this.radius, 3); // Mass is proportional to volume
        
        // Update label position
        if (this.label) {
            this.label.position.y = 1.5 * this.radius;
        }
    }
    
    dispose() {
        // Clean up resources when player is removed
        this.sphereMesh.geometry.dispose();
        this.sphereMesh.material.dispose();
        if (this.label) {
            this.label.material.map.dispose();
            this.label.material.dispose();
        }
    }
}