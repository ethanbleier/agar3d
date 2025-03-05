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
        this.velocity = new Vector3(0, 0, 0);
        this.mass = 1; // Initial mass
        this.radius = 1; // Initial radius
        this.maxSpeed = 10; // Maximum movement speed
        
        // Game stats
        this.score = 0;
        this.foodEaten = 0;
        this.playersEaten = 0;
        this.timeAlive = 0; // Time alive in seconds
    }
    
    update(deltaTime) {
        // Update position based on velocity
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
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
            
            // Scale movement speed based on mass (larger players move slower)
            const speedFactor = 1 / Math.sqrt(this.mass);
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
        this.radius = Math.cbrt(this.mass); // Cube root for 3D scaling
        this.scale = new Vector3(this.radius, this.radius, this.radius);
        
        // Update score
        this.score += amount * 10;
        this.foodEaten += 1;
        
        // Decrease maximum speed as player grows
        this.maxSpeed = 10 / Math.sqrt(this.mass);
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
        // To be implemented
        // Will create a new player object with half the mass
        // and return it to be added to the game
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