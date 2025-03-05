// Centralized import for THREE.js components
// This file helps maintain consistent THREE.js usage across the application

// Import THREE.js from node_modules
import * as THREE from 'three';

// Import OrbitControls
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Export the components for use elsewhere in the application
export { THREE, OrbitControls };

// You can add additional THREE.js components as needed:
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// export { GLTFLoader }; 

// Add WEBGL detection utility
export const WEBGL = {
    isWebGLAvailable: function () {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    },

    getWebGLErrorMessage: function () {
        const element = document.createElement('div');
        element.id = 'webgl-error-message';
        element.style.fontFamily = 'monospace';
        element.style.fontSize = '13px';
        element.style.fontWeight = 'normal';
        element.style.textAlign = 'center';
        element.style.background = '#fff';
        element.style.color = '#000';
        element.style.padding = '1.5em';
        element.style.width = '400px';
        element.style.margin = '5em auto 0';
        element.innerHTML = 'WebGL is not available in your browser';
        return element;
    }
};
