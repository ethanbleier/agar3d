// Visual effects and rendering optimizations

import * as THREE from 'three';

export class RenderSystem {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        
        // Visual effects settings
        this.enableBloom = false;
        this.enablePostProcessing = false;
        this.enableHDR = false;
        
        // Performance settings
        this.qualityLevel = 'medium'; // low, medium, high
        this.enableFrustumCulling = true;
        this.enableLOD = true; // Level of Detail
        
        // Setup renderer
        this.configureRenderer();
        
        // Setup visual effects
        if (this.enablePostProcessing) {
            this.setupPostProcessing();
        }
        
        // Add ambient occlusion
        this.setupLighting();
    }
    
    configureRenderer() {
        // Configure renderer based on quality settings
        switch (this.qualityLevel) {
            case 'low':
                this.renderer.setPixelRatio(window.devicePixelRatio * 0.5);
                this.renderer.shadowMap.enabled = false;
                break;
                
            case 'medium':
                this.renderer.setPixelRatio(window.devicePixelRatio * 0.75);
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                break;
                
            case 'high':
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                this.renderer.outputEncoding = THREE.sRGBEncoding;
                if (this.enableHDR) {
                    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                    this.renderer.toneMappingExposure = 1.0;
                }
                break;
        }
    }
    
    setupPostProcessing() {
        // This would be implemented using postprocessing or EffectComposer
        // For a simple implementation, we'll leave it empty for now
        console.log('Post-processing is disabled in this version');
    }
    
    setupLighting() {
        // Add ambient occlusion to the scene
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemiLight.position.set(0, 50, 0);
        this.scene.add(hemiLight);
        
        // Add directional light with shadows
        if (this.qualityLevel !== 'low') {
            const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
            dirLight.position.set(10, 30, 10);
            dirLight.castShadow = true;
            dirLight.shadow.camera.near = 0.1;
            dirLight.shadow.camera.far = 200;
            dirLight.shadow.camera.right = 60;
            dirLight.shadow.camera.left = -60;
            dirLight.shadow.camera.top = 60;
            dirLight.shadow.camera.bottom = -60;
            dirLight.shadow.mapSize.width = 1024;
            dirLight.shadow.mapSize.height = 1024;
            this.scene.add(dirLight);
        }
    }
    
    createPlayerMaterial(color) {
        // Create a material for players with visual enhancements
        const material = new THREE.MeshPhongMaterial({
            color: color,
            shininess: 30,
            transparent: true,
            opacity: 0.9
        });
        
        return material;
    }
    
    createFoodMaterial(color) {
        // Create a material for food with visual enhancements
        const material = new THREE.MeshPhongMaterial({
            color: color,
            shininess: 80,
            emissive: new THREE.Color(color).multiplyScalar(0.2),
            transparent: true,
            opacity: 0.8
        });
        
        return material;
    }
    
    addBloomEffect(object) {
        // Add bloom effect to an object
        // This would be implemented with a proper post-processing setup
        if (!this.enableBloom) return;
        
        // For now, we'll just make the object emit light
        if (object.material) {
            object.material.emissive = object.material.color.clone().multiplyScalar(0.2);
        }
    }
    
    addSplitEffect(position) {
        // Create a particle effect when a player splits
        const particles = 20;
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (let i = 0; i < particles; i++) {
            // Randomize position slightly
            const x = position.x + (Math.random() - 0.5) * 2;
            const y = position.y + (Math.random() - 0.5) * 2;
            const z = position.z + (Math.random() - 0.5) * 2;
            
            vertices.push(x, y, z);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        const particleSystem = new THREE.Points(geometry, material);
        this.scene.add(particleSystem);
        
        // Animate particles outward and remove after animation
        const startTime = performance.now();
        const duration = 1000; // 1 second animation
        
        const animateParticles = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const positions = particleSystem.geometry.attributes.position.array;
            
            for (let i = 0; i < particles; i++) {
                const i3 = i * 3;
                const x = positions[i3];
                const y = positions[i3 + 1];
                const z = positions[i3 + 2];
                
                // Move particles outward
                const direction = new THREE.Vector3(x - position.x, y - position.y, z - position.z).normalize();
                positions[i3] = position.x + direction.x * progress * 5;
                positions[i3 + 1] = position.y + direction.y * progress * 5;
                positions[i3 + 2] = position.z + direction.z * progress * 5;
            }
            
            particleSystem.geometry.attributes.position.needsUpdate = true;
            
            // Fade out
            particleSystem.material.opacity = 1 - progress;
            
            if (progress < 1) {
                requestAnimationFrame(animateParticles);
            } else {
                // Remove particles
                this.scene.remove(particleSystem);
                particleSystem.geometry.dispose();
                particleSystem.material.dispose();
            }
        };
        
        requestAnimationFrame(animateParticles);
    }
    
    addConsumptionEffect(position) {
        // Create a particle effect when a player consumes another
        const particles = 30;
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (let i = 0; i < particles; i++) {
            // Start at random positions around the consumed entity
            const radius = 2 + Math.random() * 3;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            const x = position.x + radius * Math.sin(phi) * Math.cos(theta);
            const y = position.y + radius * Math.sin(phi) * Math.sin(theta);
            const z = position.z + radius * Math.cos(phi);
            
            vertices.push(x, y, z);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xffaa00,
            size: 0.8,
            transparent: true,
            opacity: 0.8
        });
        
        const particleSystem = new THREE.Points(geometry, material);
        this.scene.add(particleSystem);
        
        // Animate particles inward and remove after animation
        const startTime = performance.now();
        const duration = 800; // 0.8 second animation
        
        const animateParticles = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const positions = particleSystem.geometry.attributes.position.array;
            
            for (let i = 0; i < particles; i++) {
                const i3 = i * 3;
                const x = positions[i3];
                const y = positions[i3 + 1];
                const z = positions[i3 + 2];
                
                // Move particles inward
                const direction = new THREE.Vector3(x - position.x, y - position.y, z - position.z).normalize();
                const factor = 1 - progress;
                positions[i3] = position.x + direction.x * factor * 5;
                positions[i3 + 1] = position.y + direction.y * factor * 5;
                positions[i3 + 2] = position.z + direction.z * factor * 5;
            }
            
            particleSystem.geometry.attributes.position.needsUpdate = true;
            
            if (progress < 1) {
                requestAnimationFrame(animateParticles);
            } else {
                // Remove particles
                this.scene.remove(particleSystem);
                particleSystem.geometry.dispose();
                particleSystem.material.dispose();
            }
        };
        
        requestAnimationFrame(animateParticles);
    }
    
    // Optimization methods
    
    setQuality(level) {
        this.qualityLevel = level;
        this.configureRenderer();
    }
    
    optimizeForMobile() {
        // Apply mobile-specific optimizations
        this.setQuality('low');
        this.enableBloom = false;
        this.enablePostProcessing = false;
    }
    
    updateLOD(camera) {
        // If LOD (Level of Detail) is enabled, we can update meshes based on distance from camera
        if (!this.enableLOD) return;
        
        // This would be implemented with THREE.LOD or custom distance-based detail adjustment
    }
    
    performFrustumCulling(camera, objects) {
        // If frustum culling is enabled, hide objects outside camera view
        if (!this.enableFrustumCulling) return;
        
        // Create a frustum from the camera
        const frustum = new THREE.Frustum();
        frustum.setFromProjectionMatrix(
            new THREE.Matrix4().multiplyMatrices(
                camera.projectionMatrix,
                camera.matrixWorldInverse
            )
        );
        
        // Check each object against the frustum
        for (const object of objects) {
            if (object.geometry) {
                if (!object.geometry.boundingSphere) {
                    object.geometry.computeBoundingSphere();
                }
                
                const sphere = object.geometry.boundingSphere.clone();
                sphere.applyMatrix4(object.matrixWorld);
                
                object.visible = frustum.intersectsSphere(sphere);
            }
        }
    }
}