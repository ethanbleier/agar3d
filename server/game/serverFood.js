// Server-side food logic

const { Vector3 } = require('three');

class ServerFood {
    constructor(config) {
        this.id = config.id;
        this.position = new Vector3().copy(config.position);
        this.scale = new Vector3().copy(config.scale || new Vector3(0.5, 0.5, 0.5));
        this.color = config.color;
        this.value = config.value || 0.1; // How much mass the player gains when consuming this food
        
        // Optional hover animation data (server keeps track to sync with clients)
        this.basePosition = this.position.clone();
        this.hoverPhase = Math.random() * Math.PI * 2; // Random starting phase
        this.hoverSpeed = 0.5 + Math.random() * 0.5; // Random hover speed
        this.hoverHeight = 0.1 + Math.random() * 0.2; // Random hover height
    }
    
    update(deltaTime) {
        // Update hover animation if enabled
        this.hoverPhase += this.hoverSpeed * deltaTime;
        this.position.y = this.basePosition.y + Math.sin(this.hoverPhase) * this.hoverHeight;
    }
    
    toClientData() {
        // Return the food data to be sent to clients
        return {
            id: this.id,
            position: this.position.toArray(),
            scale: this.scale.toArray(),
            color: this.color,
            value: this.value
        };
    }
}

module.exports = { ServerFood };