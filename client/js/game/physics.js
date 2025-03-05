// Physics and collision detection

import { THREE } from '../lib/three-instance.js';


export class PhysicsSystem {
    constructor() {
        this.tempVector = new THREE.Vector3();
        this.boundarySize = 250; // Half the size of the game world
    }
    
    update(deltaTime, players, foods, localPlayerId, viruses) {
        // Check for player-food collisions
        this.checkPlayerFoodCollisions(players, foods, localPlayerId);
        
        // Check for player-player collisions
        this.checkPlayerPlayerCollisions(players, localPlayerId);
        
        // Check for player-virus collisions if viruses are provided
        if (viruses && viruses.size > 0) {
            this.checkPlayerVirusCollisions(players, viruses, localPlayerId);
        }
        
        // Check boundary collisions for local player
        const localPlayer = players.get(localPlayerId);
        if (localPlayer) {
            this.enforceBoundary(localPlayer);
        }
    }
    
    checkPlayerFoodCollisions(players, foods, localPlayerId) {
        const localPlayer = players.get(localPlayerId);
        if (!localPlayer) return;
        
        foods.forEach((food, foodId) => {
            // Simple distance-based collision detection
            const distance = localPlayer.position.distanceTo(food.position);
            
            // If the player's radius plus the food's radius is greater than the distance,
            // they are colliding
            if (distance < (localPlayer.radius + food.radius)) {
                // Consume the food
                localPlayer.grow(food.mass);
                
                // Mark food for removal
                // The actual removal happens in the game class
                food.consumed = true;
                food.consumedBy = localPlayerId;
            }
        });
    }
    
    checkPlayerPlayerCollisions(players, localPlayerId) {
        const localPlayer = players.get(localPlayerId);
        if (!localPlayer) return;
        
        players.forEach((otherPlayer, otherPlayerId) => {
            // Skip self-collision
            if (otherPlayerId === localPlayerId) return;
            
            // Calculate distance between players
            const distance = localPlayer.position.distanceTo(otherPlayer.position);
            
            // Check for collision
            if (distance < (localPlayer.radius + otherPlayer.radius)) {
                // Determine which player is larger
                if (localPlayer.mass > otherPlayer.mass * 1.1) {
                    // Local player consumes the other player
                    // This will be handled by the server
                } else if (otherPlayer.mass > localPlayer.mass * 1.1) {
                    // Local player is consumed by the other player
                    // This will be handled by the server
                } else {
                    // Players are too similar in size to consume each other
                    // Apply a slight repulsive force
                    const repulsionDirection = new THREE.Vector3()
                        .subVectors(localPlayer.position, otherPlayer.position)
                        .normalize();
                    
                    const repulsionForce = 0.5 * deltaTime;
                    localPlayer.position.addScaledVector(repulsionDirection, repulsionForce);
                }
            }
        });
    }
    
    checkPlayerVirusCollisions(players, viruses, localPlayerId) {
        const localPlayer = players.get(localPlayerId);
        if (!localPlayer) return;
        
        viruses.forEach((virus, virusId) => {
            // Use the virus's own collision detection method
            if (virus.checkCollision(localPlayer)) {
                // The virus's onCollision method will handle the player popping
                // and other effects. The game class will handle removing the virus
                // if necessary.
            }
        });
    }
    
    enforceBoundary(player) {
        // Keep the player within the game boundaries
        const boundaryRadius = this.boundarySize - player.radius;
        
        const distanceFromCenter = player.position.length();
        if (distanceFromCenter > boundaryRadius) {
            // Push the player back towards the center
            const direction = player.position.clone().normalize();
            player.position.copy(direction.multiplyScalar(boundaryRadius));
        }
    }
}