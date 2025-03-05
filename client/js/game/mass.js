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
        
        // Animation properties
        this.rotationSpeed = Math.random() * 2 - 1; // Random rotation speed
        this.pulseAmount = 0.1; // How much to pulse
        this.pulseSpeed = 2 + Math.random(); // Randomize pulse speed slightly
        
        // Trail effect
        this.hasTrail = true;
        this.trailLifespan = 500; // ms
        this.trailPoints = [];
        this.maxTrailPoints = 10;
        
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
            opacity: 0.9,
            emissive: this.color.clone().multiplyScalar(0.3), // Add glow effect
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Scale the mesh based on radius
        this.mesh.scale.set(this.radius, this.radius, this.radius);
        
        // Position the mesh
        this.mesh.position.copy(this.position);
        
        // Add a subtle point light to make mass orb glow
        const light = new THREE.PointLight(this.color, 0.5, 2);
        light.position.set(0, 0, 0);
        this.mesh.add(light);
        
        // Create trail if enabled
        if (this.hasTrail) {
            this.createTrail();
        }
    }
    
    createTrail() {
        // Create a line for the trail
        const material = new THREE.LineBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.4,
        });
        
        const geometry = new THREE.BufferGeometry();
        
        // Initialize with current position
        const positions = new Float32Array(this.maxTrailPoints * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Set draw range
        geometry.setDrawRange(0, 0);
        
        this.trail = new THREE.Line(geometry, material);
        this.mesh.add(this.trail);
    }
    
    update(deltaTime) {
        const time = performance.now() * 0.001;
        
        // Update position based on velocity
        if (this.velocity.lengthSq() > 0.01) {
            this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
            
            // Apply drag to slow down mass orb
            this.velocity.multiplyScalar(0.98);
        }
        
        // Update mesh position
        this.mesh.position.copy(this.position);
        
        // Rotate the mass orb for visual interest
        this.mesh.rotation.x += this.rotationSpeed * deltaTime;
        this.mesh.rotation.y += this.rotationSpeed * 0.8 * deltaTime;
        this.mesh.rotation.z += this.rotationSpeed * 0.6 * deltaTime;
        
        // Add a pulsing effect
        const pulseScale = 1 + Math.sin(time * this.pulseSpeed) * this.pulseAmount;
        this.mesh.scale.set(
            this.radius * pulseScale,
            this.radius * pulseScale,
            this.radius * pulseScale
        );
        
        // Update trail
        if (this.hasTrail && this.velocity.lengthSq() > 0.1) {
            this.updateTrail();
        }
    }
    
    updateTrail() {
        const now = Date.now();
        
        // Add current position to trail points
        this.trailPoints.push({
            position: this.position.clone(),
            time: now
        });
        
        // Remove old trail points
        while (this.trailPoints.length > 0 && 
               now - this.trailPoints[0].time > this.trailLifespan) {
            this.trailPoints.shift();
        }
        
        // Limit number of trail points
        if (this.trailPoints.length > this.maxTrailPoints) {
            this.trailPoints.shift();
        }
        
        // Update the trail geometry
        if (this.trailPoints.length > 1) {
            const positions = this.trail.geometry.attributes.position.array;
            
            for (let i = 0; i < this.trailPoints.length; i++) {
                const point = this.trailPoints[i].position;
                positions[i * 3] = point.x;
                positions[i * 3 + 1] = point.y;
                positions[i * 3 + 2] = point.z;
            }
            
            this.trail.geometry.attributes.position.needsUpdate = true;
            this.trail.geometry.setDrawRange(0, this.trailPoints.length);
        }
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
            // Don't update scale directly here, let the update method handle it with pulsing effect
        }
    }
    
    dispose() {
        // Clean up resources when mass orb is removed
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        
        // Clean up trail if it exists
        if (this.trail) {
            this.trail.geometry.dispose();
            this.trail.material.dispose();
        }
        
        // Remove point light
        if (this.mesh.children.length > 0) {
            this.mesh.children[0].dispose();
        }
    }
} 