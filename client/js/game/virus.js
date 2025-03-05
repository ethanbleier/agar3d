// Virus class for Agar3D
// Viruses are green spiky entities that cause players to split when consumed

import { THREE } from '../lib/three-instance.js';

export class Virus {
    constructor(config = {}) {
        this.id = config.id || crypto.randomUUID();
        this.position = config.position || new THREE.Vector3(0, 0, 0);
        this.radius = config.radius || 2.5; // Default virus size
        this.color = new THREE.Color(0x00ff00); // Bright green color
        this.spikeCount = 20; // REDUCED number of spikes
        this.spikeHeight = 0.5; // Height of the spikes
        this.mass = 100; // Mass affects how it interacts with players
        
        // Create the virus mesh
        this.createMesh();
    }
    
    createMesh() {
        // Create a simpler visual representation of the virus
        // using a sphere with a normal map to give the appearance of spikes
        const sphereGeometry = new THREE.SphereGeometry(this.radius, 32, 32);
        
        // Use a displacement material to create the appearance of spikes
        const sphereMaterial = new THREE.MeshPhongMaterial({ 
            color: this.color,
            emissive: this.color,
            emissiveIntensity: 0.3,
            shininess: 30,
            // If you have a normal map texture for spikes, use it here
            // normalMap: spikeNormalMapTexture,
            displacementScale: 0.5, // This can help create the spiky appearance
            wireframe: false
        });
        
        this.mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
        
        // Add a secondary sphere for the sharper spikes using a low-poly icosahedron
        const spikeGeometry = new THREE.IcosahedronGeometry(this.radius * 1.2, 1);
        const spikeMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        
        this.spikeMesh = new THREE.Mesh(spikeGeometry, spikeMaterial);
        this.mesh.add(this.spikeMesh);
        
        // For rotation animation
        this.spikeGroup = this.spikeMesh;
        
        // Set initial position
        this.mesh.position.copy(this.position);
        
        // Add custom properties to the mesh for raycasting and collision
        this.mesh.userData.type = 'virus';
        this.mesh.userData.id = this.id;
        this.mesh.userData.parent = this;
    }
    
    createSpikes() {
        // Create a group to hold all spike meshes
        this.spikeGroup = new THREE.Group();
        this.mesh.add(this.spikeGroup);
        
        // Create evenly distributed spikes around the sphere - use fewer spikes
        for (let i = 0; i < this.spikeCount; i++) {
            // Calculate positions on the sphere using fibonacci sphere distribution
            const phi = Math.acos(1 - 2 * (i + 0.5) / this.spikeCount);
            const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
            
            const x = Math.cos(theta) * Math.sin(phi);
            const y = Math.sin(theta) * Math.sin(phi);
            const z = Math.cos(phi);
            
            // Create spike geometry (cone with fewer segments)
            const spikeGeometry = new THREE.ConeGeometry(
                this.radius * 0.2, // Base radius
                this.radius * this.spikeHeight, // Height
                3, // REDUCED number of segments (was 4)
                1  // Height segments
            );
            
            // REUSE the same material for all spikes
            if (!this.spikeMaterial) {
                this.spikeMaterial = new THREE.MeshLambertMaterial({ 
                    color: this.color,
                    emissive: this.color,
                    emissiveIntensity: 0.4,
                });
            }
            
            const spike = new THREE.Mesh(spikeGeometry, this.spikeMaterial);
            
            // Position at the surface of the sphere
            spike.position.set(
                x * this.radius,
                y * this.radius,
                z * this.radius
            );
            
            // Orient the spike to point outward
            spike.lookAt(spike.position.clone().multiplyScalar(2));
            
            // Move spike outward a bit
            spike.translateZ(this.radius * 0.5);
            
            // Add to the group
            this.spikeGroup.add(spike);
        }
    }
    
    update(deltaTime) {
        // Viruses can have subtle animations or movements here
        // For example, gentle rotation or floating movement
        this.spikeGroup.rotation.y += deltaTime * 0.1;
    }
    
    // Collision detection with players
    checkCollision(player) {
        // Simple sphere collision detection
        const distance = this.position.distanceTo(player.position);
        // A player can consume a virus if it's large enough
        const canConsume = player.radius > this.radius * 0.8;
        
        if (distance < (player.radius + this.radius * 0.7) && canConsume) {
            return true; // Collision detected
        }
        return false;
    }
    
    // Method called when a player touches this virus
    onCollision(player, gameWorld) {
        // If player is big enough, it consumes the virus and splits
        if (player.radius > this.radius) {
            // Trigger the player to split into smaller pieces
            this.popPlayer(player, gameWorld);
            
            // Remove the virus
            this.dispose();
            
            // Signal to the game world that this virus should be removed
            return true;
        }
        return false;
    }
    
    // Method to cause the player to "pop" into smaller cells
    popPlayer(player, gameWorld) {
        // Calculate how many pieces to split into (maximum 15)
        const numPieces = Math.min(15, Math.floor(player.mass / 20));
        
        if (numPieces <= 1) return; // Not enough mass to split
        
        // Calculate new mass for each piece
        const newMass = player.mass / numPieces;
        
        // Create smaller pieces and add them to the game
        for (let i = 0; i < numPieces - 1; i++) { // -1 because we keep the original player
            // Calculate random ejection direction
            const angle = (Math.PI * 2) * (i / (numPieces - 1));
            const ejectionForce = player.radius * 0.8;
            
            const direction = new THREE.Vector3(
                Math.cos(angle),
                0,
                Math.sin(angle)
            );
            
            // Create a new player piece with reduced mass
            const newPieceConfig = {
                id: player.id + '_piece_' + i,
                username: player.username,
                position: new THREE.Vector3().copy(player.position),
                color: player.color,
                mass: newMass,
                radius: Math.cbrt(newMass), // Radius scales with cubic root of mass
                isFragment: true,
                ejectionDirection: direction,
                ejectionForce: ejectionForce
            };
            
            // Add the new piece to the game world
            gameWorld.addPlayerFragment(newPieceConfig);
        }
        
        // Reduce the original player's mass
        player.mass = newMass;
        player.updateSize();
    }
    
    // Update position from server data
    updateFromServer(position) {
        this.position.copy(position);
        this.mesh.position.copy(this.position);
    }
    
    // Clean up resources
    dispose() {
        if (this.mesh) {
            // Dispose of spike geometries - material is shared
            if (this.spikeGroup) {
                this.spikeGroup.children.forEach(spike => {
                    spike.geometry.dispose();
                });
                // Dispose the shared material just once
                if (this.spikeMaterial) {
                    this.spikeMaterial.dispose();
                    this.spikeMaterial = null;
                }
            }
            
            // Dispose of main sphere geometry and material
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}
