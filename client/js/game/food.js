// Food class for Agar3D

import { THREE } from '../lib/three-instance.js';

export class Food {
    constructor(config) {
        this.id = config.id || crypto.randomUUID();
        this.position = config.position || new THREE.Vector3(0, 0, 0);
        // Make food smaller with varying sizes
        this.mass = config.mass || (Math.random() * 2 + 1); // Random mass between 1 and 3
        this.radius = 0.3 + (this.mass * 0.1); // Small radius based on mass
        this.scale = config.scale || new THREE.Vector3(this.radius, this.radius, this.radius);
        this.color = config.color || this.getRandomFoodColor();
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
        
        // Make sure material updates properly
        material.needsUpdate = true;
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.scale.copy(this.scale);
        this.mesh.position.copy(this.position);
        
        // Enable shadows for the food
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add a subtle point light to make food glow
        const light = new THREE.PointLight(this.color, 0.3, this.radius * 3);
        light.position.set(0, 0, 0);
        this.mesh.add(light);
        
        // Add custom properties to the mesh for raycasting and collision
        this.mesh.userData.type = 'food';
        this.mesh.userData.id = this.id;
        this.mesh.userData.parent = this;
    }
    
    update(deltaTime) {
        // Rotate the food for visual interest
        this.mesh.rotation.x += this.rotationSpeed * deltaTime;
        this.mesh.rotation.y += this.rotationSpeed * 0.8 * deltaTime;
        this.mesh.rotation.z += this.rotationSpeed * 0.6 * deltaTime;
        
        // Add a subtle hovering motion
        const time = performance.now() * 0.001;
        this.mesh.position.y = this.position.y + Math.sin(time * 2) * 0.05; // Reduced hovering
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
    
    getRandomFoodColor() {
        // Generate vibrant food colors
        const colors = [
            0xff0000, // red
            0x00ff00, // green
            0x0000ff, // blue
            0xffff00, // yellow
            0xff00ff, // magenta
            0x00ffff, // cyan
            0xff8800, // orange
            0x8800ff  // purple
        ];
        return new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
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