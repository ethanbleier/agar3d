// Food class for Agar3D

import * as THREE from 'three';

export class Food {
    constructor(config) {
        this.id = config.id;
        this.position = config.position || new THREE.Vector3(0, 0, 0);
        this.scale = config.scale || new THREE.Vector3(0.5, 0.5, 0.5);
        this.color = config.color || new THREE.Color(0xffffff);
        this.rotationSpeed = Math.random() * 2 - 1; // Random rotation speed
        
        // Create mesh
        this.createMesh();
    }
    
    createMesh() {
        // Create a dodecahedron for more interesting food shapes
        const geometry = new THREE.DodecahedronGeometry(1, 0);
        const material = new THREE.MeshPhongMaterial({
            color: this.color,
            shininess: 80,
            emissive: this.color.clone().multiplyScalar(0.2), // Slight glow
            transparent: true,
            opacity: 0.8
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.scale.copy(this.scale);
        this.mesh.position.copy(this.position);
        
        // Add a subtle point light to make food glow
        const light = new THREE.PointLight(this.color, 0.5, 3);
        light.position.set(0, 0, 0);
        this.mesh.add(light);
    }
    
    update(deltaTime) {
        // Rotate the food for visual interest
        this.mesh.rotation.x += this.rotationSpeed * deltaTime;
        this.mesh.rotation.y += this.rotationSpeed * 0.8 * deltaTime;
        this.mesh.rotation.z += this.rotationSpeed * 0.6 * deltaTime;
        
        // Add a subtle hovering motion
        const time = performance.now() * 0.001;
        this.mesh.position.y = this.position.y + Math.sin(time * 2) * 0.1;
    }
    
    updateFromServer(position, scale) {
        // Update position from server
        const positionArray = position;
        this.position.fromArray(positionArray);
        this.mesh.position.copy(this.position);
        
        // Update scale from server
        const scaleArray = scale;
        this.scale.fromArray(scaleArray);
        this.mesh.scale.copy(this.scale);
    }
    
    dispose() {
        // Clean up resources when food is removed
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        
        // Remove point light
        if (this.mesh.children.length > 0) {
            this.mesh.children[0].dispose();
        }
    }
}