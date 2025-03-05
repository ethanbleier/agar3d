// Mass orb class for Agar3D

import { THREE } from '../lib/three-instance.js';

export class MassOrb {
    constructor(config) {
        this.id = config.id;
        this.ownerId = config.ownerId;
        this.position = new THREE.Vector3().fromArray(config.position);
        this.velocity = config.velocity ? new THREE.Vector3().fromArray(config.velocity) : new THREE.Vector3();
        this.mass = config.mass || 1;
        this.radius = config.radius || Math.cbrt(this.mass);
        this.color = config.color ? new THREE.Color(config.color) : new THREE.Color(0xffffff);
        this.creationTime = config.creationTime || Date.now();
        
        // Create mesh
        this.createMesh();
    }
    
    createMesh() {
        // Create sphere for the mass orb
        const geometry = new THREE.SphereGeometry(1, 16, 16); // Lower poly count for better performance
        const material = new THREE.MeshPhongMaterial({
            color: this.color,
            shininess: 30,
            transparent: true,
            opacity: 0.9
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Scale the mesh based on radius
        this.mesh.scale.set(this.radius, this.radius, this.radius);
        
        // Position the mesh
        this.mesh.position.copy(this.position);
    }
    
    update(deltaTime) {
        // Update position based on velocity from server
        // Client-side prediction can be added here for smoother motion
        
        // Update mesh position
        this.mesh.position.copy(this.position);
    }
    
    updateFromServer(serverData) {
        // Update position from server
        this.position.fromArray(serverData.position);
        
        // Update velocity if provided
        if (serverData.velocity) {
            this.velocity.fromArray(serverData.velocity);
        }
        
        // Update radius if changed
        if (serverData.radius !== this.radius) {
            this.radius = serverData.radius;
            this.mesh.scale.set(this.radius, this.radius, this.radius);
        }
    }
    
    dispose() {
        // Clean up resources when mass orb is removed
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
} 