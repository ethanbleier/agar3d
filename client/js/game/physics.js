// Physics and collision detection

import * as THREE from 'three';

export class PhysicsSystem {
    constructor() {
        this.tempVector = new THREE.Vector3();
        this.boundarySize = 50; // Half the size of the game boundaries
    }
    
    update(deltaTime, players, foods, localPlayerId) {
        // Get local player for collision detection
        const localPlayer = players.get(localPlayerId);
        if (!localPlayer) return;
        
        // Check for collisions with food
        this.checkFoodCollisions(localPlayer, foods);
        
        // Client-side prediction for player movement
        this.applyMovementConstraints(localPlayer);
        
        // Check for collisions with other players
        // Note: In a real implementation, the server would handle this
        // This is just for visualization/prediction
        this.checkPlayerCollisions(localPlayer, players);
    }
    
    checkFoodCollisions(player, foods) {
        // Check if the player can eat any food
        for (const [foodId, food] of foods.entries()) {
            if (this.sphereCollision(
                player.position, player.radius,
                food.position, food.scale.x
            )) {
                // Don't actually remove the food here - just notify the server
                // The server will confirm and broadcast the food consumption
                // This is just for client-side prediction
                food.mesh.visible = false;
            }
        }
    }
    
    checkPlayerCollisions(localPlayer, players) {
        // Check collisions with other players
        // Note: This is just for client-side prediction
        for (const [playerId, otherPlayer] of players.entries()) {
            // Skip collision with self
            if (playerId === localPlayer.id) continue;
            
            // Check if players collide
            if (this.sphereCollision(
                localPlayer.position, localPlayer.radius,
                otherPlayer.position, otherPlayer.radius
            )) {
                // Determine if localPlayer can eat the other player
                // In Agar.io, a player can eat another if it's about 20% larger
                if (localPlayer.mass > otherPlayer.mass * 1.2) {
                    // Client-side prediction - don't actually remove the player
                    // Just visually indicate the collision
                    otherPlayer.mesh.material.opacity = 0.5;
                }
                else if (otherPlayer.mass > localPlayer.mass * 1.2) {
                    // Local player might get eaten
                    // Just a visual indicator
                    localPlayer.mesh.material.opacity = 0.5;
                }
                else {
                    // Players bounce off each other
                    this.resolveCollision(localPlayer, otherPlayer);
                }
            } else {
                // Reset opacity
                otherPlayer.mesh.material.opacity = 0.9;
                localPlayer.mesh.material.opacity = 0.9;
            }
        }
    }
    
    applyMovementConstraints(player) {
        // Constrain player within boundaries
        player.position.x = Math.max(-this.boundarySize, Math.min(this.boundarySize, player.position.x));
        player.position.y = Math.max(-this.boundarySize, Math.min(this.boundarySize, player.position.y));
        player.position.z = Math.max(-this.boundarySize, Math.min(this.boundarySize, player.position.z));
    }
    
    sphereCollision(pos1, radius1, pos2, radius2) {
        // Calculate squared distance between centers
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dz = pos2.z - pos1.z;
        const distanceSquared = dx * dx + dy * dy + dz * dz;
        
        // Check if spheres intersect
        const sumRadii = radius1 + radius2;
        return distanceSquared <= sumRadii * sumRadii;
    }
    
    resolveCollision(player1, player2) {
        // Calculate direction from player1 to player2
        this.tempVector.subVectors(player2.position, player1.position);
        const distance = this.tempVector.length();
        
        // Normalize direction
        this.tempVector.normalize();
        
        // Calculate how much the spheres overlap
        const sumRadii = player1.radius + player2.radius;
        const overlapDistance = sumRadii - distance;
        
        // Only resolve if there's an overlap
        if (overlapDistance > 0) {
            // Calculate push factor based on relative mass
            const totalMass = player1.mass + player2.mass;
            const push1 = (player2.mass / totalMass) * overlapDistance * 0.5;
            const push2 = (player1.mass / totalMass) * overlapDistance * 0.5;
            
            // Push player1 away
            player1.position.sub(
                this.tempVector.clone().multiplyScalar(push1)
            );
            
            // Push player2 away
            player2.position.add(
                this.tempVector.clone().multiplyScalar(push2)
            );
        }
    }
}