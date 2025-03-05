// Centralized three.js imports to prevent duplicate instances
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Create WebGL detection utilities directly
const WebGL = {
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

        if (!this.isWebGLAvailable()) {
            element.innerHTML = window.WebGLRenderingContext ?
                'Your graphics card does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br />' +
                'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.' :
                'Your browser does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br/>' +
                'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.';
        }

        return element;
    }
};

// Export everything to be used by other modules
export { THREE, OrbitControls, WebGL }; 