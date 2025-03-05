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
        this.moveSpeed = 13; // Increased from 10 to 13 (30% increase)
        this.mass = config.mass || 1; // Initial mass
        this.radius = config.radius || 1; // Initial radius
        this.score = config.score || 0; // Initial score
        
        // Water drop animation parameters
        this.animationTime = 0;
        this.wobbleFrequency = 2.5; // Speed of wobble
        this.wobbleAmplitude = 0.1; // Amount of deformation
        this.originalVertices = []; // Store original vertex positions
        this.vertexNormals = []; // Store vertex normals for deformation
        
        // Boost parameters
        this.boostCooldown = 0; // Cooldown timer for boost
        this.boostDuration = 0; // Duration of current boost
        this.isBoostActive = false; // Flag for boost state
        this.boostMultiplier = 2.5; // Speed multiplier during boost
        this.boostCost = 3; // Mass cost for boosting
        
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
        // Create a higher detail sphere for the water drop effect
        const geometry = new THREE.SphereGeometry(1, 64, 48);
        
        // Store original vertices and normals for animation
        const positionAttribute = geometry.getAttribute('position');
        const normalAttribute = geometry.getAttribute('normal');
        
        this.originalVertices = [];
        this.vertexNormals = [];
        
        for (let i = 0; i < positionAttribute.count; i++) {
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(positionAttribute, i);
            this.originalVertices.push(vertex.clone());
            
            const normal = new THREE.Vector3();
            normal.fromBufferAttribute(normalAttribute, i);
            this.vertexNormals.push(normal.clone());
        }
        
        // Create material with more reflectivity and slight transparency
        const material = new THREE.MeshPhongMaterial({
            color: this.color,
            shininess: 100,
            transparent: true,
            opacity: 0.85,
            reflectivity: 1.0,
            specular: new THREE.Color(0x444444)
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
        canvas.height = 128; // Increased height for larger font
        
        // Clear the canvas with a transparent background
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the username on the canvas with a larger font
        context.font = 'Bold 36px Arial'; // Increased font size
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText(this.username, canvas.width / 2, canvas.height / 2);
        
        // Create a texture from the canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Create a sprite with the texture - this will always face the camera
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        
        // Create the label as a completely separate entity, not part of the mesh
        this.label = new THREE.Sprite(spriteMaterial);
        
        // Set initial scale and position
        const initialScale = 3;
        this.label.scale.set(initialScale, initialScale * 0.5, 1);
        
        // Position will be updated in the update method
        // Add the label directly to the scene instead of the player mesh
        // This will be handled in the app.js file
        
        // Store a reference to the player for updating the label position
        this.label.userData.player = this;
    }
    
    update(deltaTime) {
        // Update mesh position based on player position
        this.mesh.position.copy(this.position);
        
        // Update label position to stay above the player
        // Label position will now be updated independently of player rotation
        if (this.label) {
            // Calculate new position above the player
            const labelPosition = this.position.clone();
            labelPosition.y += this.radius * 2.5 + 1; // More height to avoid blocking view
            
            // Update the label's position
            this.label.position.copy(labelPosition);
        }
        
        // Scale the move speed based on mass in increments of 10
        const massTier = Math.floor(this.mass / 10);
        this.moveSpeed = 13 / (1 + massTier * 0.3); // Increased from 10 to 13 (30% increase)
        
        // Update boost cooldown and duration
        if (this.boostCooldown > 0) {
            this.boostCooldown -= deltaTime;
            if (this.boostCooldown < 0) this.boostCooldown = 0;
        }
        
        // Handle active boost
        if (this.isBoostActive) {
            this.boostDuration -= deltaTime;
            if (this.boostDuration <= 0) {
                this.isBoostActive = false;
                this.boostDuration = 0;
            }
        }
        
        // Update water drop animation
        this.animateWaterDrop(deltaTime);
        
        // Handle pulse animation after splitting
        if (this.pulseTime > 0) {
            // Calculate pulse progress (0 to 1)
            const progress = 1 - (this.pulseTime / 0.3);
            
            // Interpolate between start and end scale
            const currentScale = this.pulseStartScale.clone().lerp(this.pulseEndScale, progress);
            this.scale.copy(currentScale);
            
            // Decrease pulse time
            this.pulseTime -= deltaTime;
            
            // Reset when complete
            if (this.pulseTime <= 0) {
                this.scale.copy(this.pulseEndScale);
                this.pulseTime = 0;
            }
        }
        
        // Handle fragment ejection animation if this is a fragment
        if (this.ejectionDirection && this.ejectionTime > 0) {
            // Apply ejection force that decreases over time
            const ejectionStrength = this.ejectionForce * (this.ejectionTime / 0.5);
            const ejectionMovement = this.ejectionDirection.clone().multiplyScalar(ejectionStrength * deltaTime);
            this.position.add(ejectionMovement);
            
            // Decrease ejection time
            this.ejectionTime -= deltaTime;
            
            // Scale effect during ejection
            const scaleEffect = 1 + (0.2 * (this.ejectionTime / 0.5));
            this.scale.set(
                this.scale.x * scaleEffect,
                this.scale.y * scaleEffect,
                this.scale.z * scaleEffect
            );
            
            // Add slight rotation for visual effect
            this.mesh.rotateOnAxis(new THREE.Vector3(0, 1, 0), deltaTime * 2);
            
            // If ejection is complete, reset
            if (this.ejectionTime <= 0) {
                this.ejectionDirection = null;
                this.ejectionTime = 0;
                this.scale.set(this.radius, this.radius, this.radius);
            }
        }
    }
    
    move(direction, deltaTime) {
        // Apply movement based on direction and speed
        const effectiveSpeed = this.isBoostActive ? this.moveSpeed * this.boostMultiplier : this.moveSpeed;
        const moveDelta = direction.clone().multiplyScalar(effectiveSpeed * deltaTime);
        this.position.add(moveDelta);
        
        // Boundary restrictions removed - player can move freely across the entire map
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
        
        // For water drop effect, we don't directly apply scale to the mesh
        // as it's handled in the animation method
        
        // Update label scale
        if (this.label) {
            // Calculate scale based on player size, but ensure it's visible
            const labelScale = Math.max(2, Math.min(2.5 * this.radius, 5));
            this.label.scale.set(labelScale, labelScale * 0.5, 1);
        }
    }
    
    grow(amount) {
        this.mass += amount;
        this.updateSize();
    }
    
    boost() {
        // Only boost if we have enough mass and not on cooldown
        if (this.mass <= this.boostCost || this.boostCooldown > 0 || this.isBoostActive) {
            return false;
        }
        
        // Deduct mass cost
        this.mass -= this.boostCost;
        this.updateSize();
        
        // Activate boost
        this.isBoostActive = true;
        this.boostDuration = 0.5; // Boost lasts for 0.5 seconds
        this.boostCooldown = 2.0; // 2 second cooldown before next boost
        
        // Add a pulsing animation to show boost
        const originalScale = this.scale.clone();
        this.pulseTime = 0.3; // Duration in seconds
        this.pulseStartScale = originalScale.clone().multiplyScalar(0.8); // Compress slightly
        this.pulseEndScale = originalScale.clone();
        
        return true;
    }
    
    split() {
        // Only split if we have enough mass
        if (this.mass < 2) {
            return null;
        }

        // Halve the mass for splitting (visual effect only, server will sync)
        const newMass = this.mass / 2;
        this.mass = newMass;
        this.updateSize();
        
        // Add a small scale animation to the parent cell
        const originalScale = this.scale.clone();
        
        // Add a pulsing animation to the parent cell
        this.pulseTime = 0.3; // Duration in seconds
        this.pulseStartScale = originalScale.clone().multiplyScalar(1.2);
        this.pulseEndScale = originalScale.clone();
        
        // Determine ejection direction based on current rotation
        const ejectionDir = new THREE.Vector3(0, 0, -1);
        ejectionDir.applyQuaternion(this.rotation).normalize();

        // Calculate the spawn position for the new fragment
        const spawnPosition = this.position.clone().add(
            ejectionDir.clone().multiplyScalar(this.radius + 0.5)
        );

        // Return fragment info for potential local visualization
        // The actual game logic is handled by the server
        return {
            position: spawnPosition,
            direction: ejectionDir,
            mass: newMass
        };
    }
    
    updateFromServer(position, rotation, scale) {
        // Update position from server (with interpolation for smoothness)
        const serverPosition = position instanceof THREE.Vector3 ? position : new THREE.Vector3().fromArray(position);
        this.position.lerp(serverPosition, 0.3); // Smooth interpolation
        
        // Update rotation from server
        const serverRotation = rotation instanceof THREE.Quaternion ? rotation : new THREE.Quaternion().fromArray(rotation);
        this.rotation.slerp(serverRotation, 0.3); // Smooth interpolation
        this.mesh.quaternion.copy(this.rotation);
        
        // Update scale from server
        const serverScale = scale instanceof THREE.Vector3 ? scale : new THREE.Vector3().fromArray(scale);
        this.scale.lerp(serverScale, 0.3); // Smooth interpolation
        
        // Update physics values based on scale
        this.radius = this.scale.x; // Assuming uniform scaling
        this.mass = Math.pow(this.radius, 3); // Mass is proportional to volume
        
        // Update label position to stay above the player
        if (this.label) {
            const labelPosition = this.position.clone();
            labelPosition.y += this.radius * 2.5 + 1; // Position higher above the player
            this.label.position.copy(labelPosition);
            
            // Update label scale based on player size
            const labelScale = Math.max(2, Math.min(2.5 * this.radius, 5));
            this.label.scale.set(labelScale, labelScale * 0.5, 1);
        }
    }
    
    dispose() {
        // Clean up resources when player is removed
        if (this.sphereMesh) {
            this.sphereMesh.geometry.dispose();
            this.sphereMesh.material.dispose();
            this.mesh.remove(this.sphereMesh);
            this.sphereMesh = null;
            
            // Clear animation data
            this.originalVertices = [];
            this.vertexNormals = [];
        }
        
        // Clean up label resources
        if (this.label) {
            if (this.label.material.map) {
                this.label.material.map.dispose();
            }
            this.label.material.dispose();
            // Note: We don't remove the label from the scene here
            // That's handled in the Game.removePlayer method
        }
    }

    // New method to animate the water drop effect
    animateWaterDrop(deltaTime) {
        // Skip animation if not visible or during special effects
        if (!this.originalVertices.length) {
            return;
        }
        
        // Update animation time
        this.animationTime += deltaTime * this.wobbleFrequency;
        
        // Get the geometry for modification
        const geometry = this.sphereMesh.geometry;
        const positionAttribute = geometry.getAttribute('position');
        
        // Apply deformation to each vertex
        for (let i = 0; i < this.originalVertices.length; i++) {
            const originalVertex = this.originalVertices[i];
            const normal = this.vertexNormals[i];
            
            // Calculate wobble factor based on position and time
            const wobbleFactor = Math.sin(
                this.animationTime + 
                originalVertex.x * 2 + 
                originalVertex.y * 3 + 
                originalVertex.z * 2
            ) * this.wobbleAmplitude;
            
            // Apply deformation along normal direction
            const newPos = originalVertex.clone().addScaledVector(normal, wobbleFactor);
            
            // Apply scale
            newPos.multiply(this.scale);
            
            // Update vertex position
            positionAttribute.setXYZ(i, newPos.x, newPos.y, newPos.z);
        }
        
        // Mark attributes for update
        positionAttribute.needsUpdate = true;
        geometry.computeVertexNormals();
    }
}