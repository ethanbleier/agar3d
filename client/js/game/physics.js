// Physics and collision detection

import { THREE } from '../lib/three-instance.js';


export class PhysicsSystem {
    constructor() {
        this.tempVector = new THREE.Vector3();
        this.boundarySize = 250; // Default boundary size
        
        // World boundaries (will be set by the game)
        this.minX = -this.boundarySize;
        this.maxX = this.boundarySize;
        this.minZ = -this.boundarySize;
        this.maxZ = this.boundarySize;
    }
    
    // Method to set the world boundaries
    setBoundaries(minX, maxX, minZ, maxZ) {
        this.minX = minX;
        this.maxX = maxX;
        this.minZ = minZ;
        this.maxZ = maxZ;
        console.log(`Physics boundaries set to: X(${minX}, ${maxX}), Z(${minZ}, ${maxZ})`);
    }
    
    update(deltaTime, players, foods, localPlayerId, viruses) {
        // Check for collisions between the local player and food
        const foodsToRemove = this.checkPlayerFoodCollisions(players, foods, localPlayerId);
        
        // Check for collisions between players
        this.checkPlayerPlayerCollisions(players, localPlayerId);
        
        // Check for collisions between the local player and viruses
        this.checkPlayerVirusCollisions(players, viruses, localPlayerId);
        
        // Enforce world boundaries for all players
        players.forEach(player => {
            this.enforceBoundary(player);
        });
        
        // Enforce world boundaries for all viruses to match player behavior
        viruses.forEach(virus => {
            this.enforceEntityBoundary(virus);
        });
        
        // Return the list of foods to remove
        return foodsToRemove;
    }
    
    checkPlayerFoodCollisions(players, foods, localPlayerId) {
        const localPlayer = players.get(localPlayerId);
        if (!localPlayer) return;
        
        const foodsToRemove = [];
        
        foods.forEach((food, foodId) => {
            // Simple distance-based collision detection
            const distance = localPlayer.position.distanceTo(food.mesh.position);
            
            // If the player's radius is greater than the distance to the food center plus the food radius,
            // they are colliding
            if (distance < (localPlayer.radius + food.radius * 0.5)) {
                // Consume the food - add its mass to the player
                localPlayer.grow(food.mass);
                
                // Mark food for removal
                foodsToRemove.push(foodId);
            }
        });
        
        // Return the list of foods to remove
        return foodsToRemove;
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
    
    enforceEntityBoundary(entity) {
        // Boundary restrictions removed - player can move freely across the entire map
        // Just update the mesh position to match the entity position
        if (entity.mesh) {
            entity.mesh.position.copy(entity.position);
        }
    }
    
    enforceBoundary(player) {
        // No boundary enforcement - player can move freely
        
        // Update the player's mesh and label if they exist
        if (player.mesh) {
            player.mesh.position.copy(player.position);
        }
        if (player.label) {
            player.label.position.copy(player.position).add(new THREE.Vector3(0, player.radius + 0.5, 0));
        }
    }
}