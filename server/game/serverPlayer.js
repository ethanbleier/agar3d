// Server-side player logic

const { Vector3, Quaternion } = require('three');

class ServerPlayer {
    constructor(config) {
        this.id = config.id;
        this.username = config.username;
        this.position = new Vector3().copy(config.position);
        this.rotation = new Quaternion();
        this.scale = new Vector3(1, 1, 1);
        this.color = config.color;
        
        // Physics properties
        this.velocity = config.velocity || new Vector3(0, 0, 0);
        this.mass = config.mass || 1; // Initial mass
        this.radius = config.radius || 1; // Initial radius
        this.maxSpeed = 10; // Maximum movement speed
        
        // Game stats
        this.score = 0;
        this.foodEaten = 0;
        this.playersEaten = 0;
        this.timeAlive = 0; // Time alive in seconds
        
        // Fragment properties for split cells
        this.isFragment = config.isFragment || false;
        this.parentId = config.parent || null;
        
        // If this is a recently split fragment, apply extra force for ejection
        if (this.isFragment) {
            // The split force will decay over time in the update method
            this.splitForce = 20; // Initial force
            this.splitForceDecay = 2; // Force reduction per second
        }
    }
    
    update(deltaTime) {
        // Update position based on velocity
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Handle split fragment force for newly split cells
        if (this.isFragment && this.splitForce > 0) {
            // Get normalized velocity direction
            const direction = this.velocity.clone().normalize();
            
            // Apply additional force in the same direction
            const additionalForce = direction.multiplyScalar(this.splitForce * deltaTime);
            this.position.add(additionalForce);
            
            // Decay the split force over time
            this.splitForce -= this.splitForceDecay * deltaTime;
            if (this.splitForce < 0) this.splitForce = 0;
        }
        
        // Apply drag to gradually slow down
        this.velocity.multiplyScalar(0.95);
        
        // Update stats
        this.timeAlive += deltaTime;
    }
    
    setPositionFromClient(positionArray) {
        // Don't directly set position from client (to prevent cheating)
        // Instead, use client position to influence velocity
        const clientPosition = new Vector3().fromArray(positionArray);
        
        // Calculate direction and distance
        const direction = new Vector3().subVectors(clientPosition, this.position);
        const distance = direction.length();
        
        // Normalize direction and apply speed limit
        if (distance > 0.1) {
            direction.normalize();
            
            // Scale movement speed based on mass in increments of 10
            // Calculate the tier based on mass (1-10 = tier 0, 11-20 = tier 1, etc.)
            const massTier = Math.floor(this.mass / 10);
            // Apply a constant factor for each tier
            const speedFactor = 1 / (1 + massTier * 0.3);
            const moveSpeed = this.maxSpeed * speedFactor;
            
            // Set velocity based on direction and speed
            this.velocity.copy(direction.multiplyScalar(moveSpeed));
        }
    }
    
    setRotationFromClient(rotationArray) {
        // Set rotation directly from client
        this.rotation.fromArray(rotationArray);
    }
    
    grow(amount) {
        // Increase mass
        this.mass += amount;
        
        // Update radius and scale
        this.updateSize();
        
        // Update score
        this.score += amount * 10;
        this.foodEaten += 1;
        
        // Decrease maximum speed as player grows in steps of mass 10
        const massTier = Math.floor(this.mass / 10);
        this.maxSpeed = 10 / (1 + massTier * 0.3);
    }
    
    updateSize() {
        // Update radius based on mass
        this.radius = Math.cbrt(this.mass); // Cube root for 3D scaling
        
        // Update scale
        this.scale = new Vector3(this.radius, this.radius, this.radius);
    }
    
    consumePlayer(otherPlayer) {
        // Calculate how much the player grows based on other player's mass
        const growAmount = otherPlayer.mass * 0.8; // Don't get 100% of other player's mass
        
        // Grow player
        this.grow(growAmount);
        
        // Update stats
        this.playersEaten += 1;
    }
    
    split() {
        // Only split if we have enough mass
        if (this.mass < 2) {
            return null;
        }

        // Halve the mass for splitting
        const newMass = this.mass / 2;
        this.mass = newMass;
        this.updateSize();

        // Determine ejection direction based on current rotation
        const ejectionDir = new Vector3(0, 0, -1);
        ejectionDir.applyQuaternion(this.rotation).normalize();

        // Calculate the spawn position for the new fragment
        // Place it slightly in front of the current player
        const spawnPosition = this.position.clone().add(
            ejectionDir.clone().multiplyScalar(this.radius + 0.5)
        );

        // Create a new player configuration for the fragment
        const fragmentConfig = {
            id: `${this.id}_fragment_${Date.now()}`,
            username: this.username,
            position: spawnPosition,
            color: this.color,
            // Initial speed boost in the ejection direction
            velocity: ejectionDir.clone().multiplyScalar(20),
            mass: newMass,
            isFragment: true,
            parent: this.id
        };

        // Return fragment configuration to be added to the game
        return fragmentConfig;
    }
    
    boost() {
        // To be implemented
        // Will eject mass and boost player in the opposite direction
    }
    
    toClientData() {
        // Return the player data to be sent to clients
        return {
            id: this.id,
            username: this.username,
            position: this.position.toArray(),
            rotation: this.rotation.toArray(),
            scale: this.scale.toArray(),
            color: this.color,
            mass: this.mass
        };
    }
}

module.exports = { ServerPlayer };