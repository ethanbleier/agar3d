// Server-side physics and collision detection

const { Vector3 } = require('three');

class PhysicsSystem {
    constructor(worldSize) {
        this.worldSize = worldSize;
        this.tempVector = new Vector3();
    }
    
    update(deltaTime, players, foods) {
        // Track all consumed food
        const allConsumedFood = [];
        
        // Update all players
        for (const player of players.values()) {
            // Update player position and physics
            player.update(deltaTime);
            
            // Keep player within world boundaries
            this.constrainToWorld(player);
            
            // Check for food collisions
            const consumedFood = this.checkFoodCollisions(player, foods);
            if (consumedFood.length > 0) {
                allConsumedFood.push(...consumedFood);
            }
        }
        
        // Check for player-player collisions
        this.checkPlayerCollisions(players);
        
        // Return all consumed food
        return allConsumedFood;
    }
    
    constrainToWorld(player) {
        // Calculate half-sizes for boundaries
        const halfX = this.worldSize.x / 2;
        const halfY = this.worldSize.y / 2;
        const halfZ = this.worldSize.z / 2;
        
        // Constrain player position to world boundaries
        player.position.x = Math.max(-halfX, Math.min(halfX, player.position.x));
        player.position.y = Math.max(-halfY, Math.min(halfY, player.position.y));
        player.position.z = Math.max(-halfZ, Math.min(halfZ, player.position.z));
        
        // If player hit a boundary, zero out velocity in that direction
        if (player.position.x === -halfX || player.position.x === halfX) {
            player.velocity.x = 0;
        }
        if (player.position.y === -halfY || player.position.y === halfY) {
            player.velocity.y = 0;
        }
        if (player.position.z === -halfZ || player.position.z === halfZ) {
            player.velocity.z = 0;
        }
    }
    
    checkFoodCollisions(player, foods) {
        // Optimized food collision detection
        const foodsToRemove = [];
        
        for (const [foodId, food] of foods.entries()) {
            // Check if player can consume the food
            if (this.sphereCollision(
                player.position, player.radius,
                food.position, food.scale.x
            )) {
                // Add food to removal list with player ID
                foodsToRemove.push({
                    foodId: foodId,
                    playerId: player.id
                });
                
                // Grow player
                player.grow(food.value);
            }
        }
        
        // Return list of consumed food IDs with player IDs
        return foodsToRemove;
    }
    
    checkPlayerCollisions(players) {
        // Check for collisions between players
        const playerArray = Array.from(players.values());
        
        for (let i = 0; i < playerArray.length; i++) {
            const player1 = playerArray[i];
            
            for (let j = i + 1; j < playerArray.length; j++) {
                const player2 = playerArray[j];
                
                // Check if players collide
                if (this.sphereCollision(
                    player1.position, player1.radius,
                    player2.position, player2.radius
                )) {
                    // Handle player-player collision
                    if (player1.mass > player2.mass * 1.2) {
                        // Player 1 consumes player 2
                        player1.consumePlayer(player2);
                        return { predator: player1, prey: player2 };
                    }
                    else if (player2.mass > player1.mass * 1.2) {
                        // Player 2 consumes player 1
                        player2.consumePlayer(player1);
                        return { predator: player2, prey: player1 };
                    }
                    else {
                        // Players bounce off each other
                        this.resolveCollision(player1, player2);
                    }
                }
            }
        }
        
        return null; // No consumption occurred
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
            
            // Update velocities for bouncing effect
            const p1Velocity = player1.velocity.clone();
            const p2Velocity = player2.velocity.clone();
            
            // Calculate collision impulse
            const p1Dot = p1Velocity.dot(this.tempVector);
            const p2Dot = p2Velocity.dot(this.tempVector.clone().negate());
            
            // Calculate velocity changes
            const p1Factor = (2 * player2.mass * p2Dot) / totalMass;
            const p2Factor = (2 * player1.mass * p1Dot) / totalMass;
            
            // Apply velocity changes
            player1.velocity.add(
                this.tempVector.clone().multiplyScalar(p1Factor)
            );
            
            player2.velocity.add(
                this.tempVector.clone().negate().multiplyScalar(p2Factor)
            );
            
            // Dampen velocities to prevent excessive bouncing
            player1.velocity.multiplyScalar(0.9);
            player2.velocity.multiplyScalar(0.9);
        }
    }
}

module.exports = { PhysicsSystem };