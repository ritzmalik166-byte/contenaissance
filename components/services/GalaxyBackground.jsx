
'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './GalaxyBackground.css';

/* =====================================================
   GALAXY CONFIGURATION
   Edit this array to add, remove or customize galaxies.
===================================================== */


const GALAXIES = [
    {
        id: 'golden-spiral',
        type: 'spiral',
        position: [-12, 5, -12],
        size: [9, 6],
        particles: 2400,
        colors: ['#fff1d2', '#ffc47b', '#ff8a75', '#a66cff'],
        rotation: 0.3,
        speed: 0.3,
        glow: 0.7,
    },
    {
        id: 'purple-nebula',
        type: 'nebula',
        position: [10, 3, -24],
        size: [9, 7],
        particles: 2100,
        colors: ['#ffe0f5', '#e59aff', '#a879ff', '#668cff'],
        rotation: -0.5,
        speed: 0.5,
        glow: 0.65,
    },
    {
        id: 'blue-ring',
        type: 'ring',
        position: [-7, -5, -38],
        size: [8, 6],
        particles: 1900,
        colors: ['#e3faff', '#86e6ff', '#66aaff', '#c18aff'],
        rotation: 0.8,
        speed: 0.25,
        glow: 0.55,
    },
    {
        id: 'pink-elliptical',
        type: 'elliptical',
        position: [12, -4, -52],
        size: [8, 6],
        particles: 2200,
        colors: ['#fff0dc', '#ffb3b8', '#ee81d1', '#a98cff'],
        rotation: -0.3,
        speed: 0.35,
        glow: 0.6,
    },
    {
        id: 'orange-galaxy',
        type: 'spiral',
        position: [-13, 2, -68],
        size: [10, 7],
        particles: 2500,
        colors: ['#fff0c4', '#ffbd6b', '#f18b62', '#b77ad9'],
        rotation: 0.6,
        speed: 0.4,
        glow: 0.7,
    },
    {
        id: 'cosmic-cloud',
        type: 'nebula',
        position: [8, 6, -82],
        size: [11, 8],
        particles: 2000,
        colors: ['#e6ffff', '#83ffe0', '#54b9d5', '#9b80ff'],
        rotation: 0.2,
        speed: 0.6,
        glow: 0.5,
    },

    // Custom galaxy image 01: perfectly straight
    {
        id: 'custom-galaxy-image',
        type: 'image',
        image: '/services/galaxies/galaxy-01.png',
        position: [0, -3, -100],
        imageSize: [13, 9],
        rotation: 0,
        opacity: 0.9,
        speed: 0,
    },

    // {
    //     id: 'violet-spiral',
    //     type: 'spiral',
    //     position: [-10, -5, -116],
    //     size: [9, 6],
    //     particles: 2200,
    //     colors: ['#fff1dc', '#e3a0ff', '#a17aff', '#70aaff'],
    //     rotation: -0.4,
    //     speed: 0.3,
    //     glow: 0.65,
    // },
    // {
    //     id: 'golden-ring',
    //     type: 'ring',
    //     position: [13, 4, -135],
    //     size: [10, 7],
    //     particles: 2100,
    //     colors: ['#fff0c9', '#ffd17c', '#e99c75', '#c47bba'],
    //     rotation: 0.5,
    //     speed: 0.4,
    //     glow: 0.65,
    // },

    // // Custom galaxy image 02: perfectly straight
    // {
    //     id: 'custom-galaxy-image2',
    //     type: 'image',
    //     image: '/services/galaxies/galaxy-02.png',
    //     position: [0, 2, -150],
    //     imageSize: [12, 8.5],
    //     rotation: 0,
    //     opacity: 0.9,
    //     speed: 0,
    // },

    // {
    //     id: 'crimson-spiral',
    //     type: 'spiral',
    //     position: [-11, 4, -166],
    //     size: [9, 7],
    //     particles: 2400,
    //     colors: ['#fff0e0', '#ff987d', '#f15b83', '#a66cff'],
    //     rotation: 0.4,
    //     speed: 0.35,
    //     glow: 0.7,
    // },
    // {
    //     id: 'blue-nebula',
    //     type: 'nebula',
    //     position: [12, 5, -182],
    //     size: [10, 8],
    //     particles: 2200,
    //     colors: ['#e2faff', '#83dfff', '#668cff', '#bd8aff'],
    //     rotation: -0.4,
    //     speed: 0.45,
    //     glow: 0.65,
    // },
    // {
    //     id: 'silver-ring',
    //     type: 'ring',
    //     position: [-8, -5, -198],
    //     size: [9, 7],
    //     particles: 2000,
    //     colors: ['#ffffff', '#c8e5ff', '#9bbcff', '#e6baff'],
    //     rotation: 0.7,
    //     speed: 0.3,
    //     glow: 0.6,
    // },
    // {
    //     id: 'pink-nebula',
    //     type: 'nebula',
    //     position: [10, -3, -214],
    //     size: [11, 8],
    //     particles: 2300,
    //     colors: ['#fff0f8', '#ffacd9', '#e78cff', '#987cff'],
    //     rotation: -0.3,
    //     speed: 0.5,
    //     glow: 0.7,
    // },
    // {
    //     id: 'emerald-spiral',
    //     type: 'spiral',
    //     position: [-13, 5, -230],
    //     size: [10, 7],
    //     particles: 2500,
    //     colors: ['#e5fff5', '#8affcf', '#4bc9b0', '#829cff'],
    //     rotation: 0.5,
    //     speed: 0.35,
    //     glow: 0.65,
    // },
    // {
    //     id: 'violet-ring',
    //     type: 'ring',
    //     position: [11, 4, -246],
    //     size: [9, 7],
    //     particles: 2100,
    //     colors: ['#fff0ff', '#dda6ff', '#a77cff', '#779aff'],
    //     rotation: -0.6,
    //     speed: 0.4,
    //     glow: 0.65,
    // },
    // {
    //     id: 'golden-nebula',
    //     type: 'nebula',
    //     position: [-10, -4, -262],
    //     size: [10, 8],
    //     particles: 2300,
    //     colors: ['#fff4d6', '#ffd17c', '#ff9c70', '#d17dba'],
    //     rotation: 0.3,
    //     speed: 0.55,
    //     glow: 0.7,
    // },
    // {
    //     id: 'blue-elliptical',
    //     type: 'elliptical',
    //     position: [13, 5, -278],
    //     size: [9, 7],
    //     particles: 2200,
    //     colors: ['#f0ffff', '#a8e8ff', '#78baff', '#a78aff'],
    //     rotation: -0.4,
    //     speed: 0.3,
    //     glow: 0.6,
    // },
    // {
    //     id: 'cosmic-barred',
    //     type: 'barred',
    //     position: [-12, 3, -294],
    //     size: [10, 7],
    //     particles: 2500,
    //     colors: ['#fff0d2', '#ffc47b', '#ff8b9b', '#b28aff'],
    //     rotation: 0.65,
    //     speed: 0.4,
    //     glow: 0.7,
    // },
    // {
    //     id: 'final-galaxy-cluster',
    //     type: 'cluster',
    //     position: [10, -4, -310],
    //     size: [11, 8],
    //     particles: 2600,
    //     colors: ['#ffffff', '#bdeaff', '#d8aaff', '#ffc8df'],
    //     rotation: -0.35,
    //     speed: 0.5,
    //     glow: 0.75,
    // },
];

/* =====================================================
   CONFIGURATION
===================================================== */

const SETTINGS = {
    background: '#030309',

    scrollSpeed: 0.035,
    scrollSmoothness: 0.075,

    cameraCurveX: 2.8,
    cameraCurveY: 1.1,

    mouseStrength: 0.09,
    mouseSmoothness: 0.055,

    starCount: 4500,
    starSize: 0.085,

    particleSize: 0.105,

    galaxyOpacity: 0.9,

    enableMouseEffect: true,
    enableRotation: true,
    enableScroll: true,

    maxPixelRatio: 1.5,
};

/* =====================================================
   HELPERS
===================================================== */

const random = (min, max) =>
    Math.random() * (max - min) + min;

const choose = (arr) =>
    arr[Math.floor(Math.random() * arr.length)];

function createGalaxyGeometry(config) {
    const count = config.particles || 1600;
    const [width, height] = config.size || [8, 4];

    const positions = [];
    const colors = [];

    const palette = config.colors || [
        '#fff1d2',
        '#ffc47b',
        '#ff8a75',
        '#a66cff',
    ];

    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
        const r = Math.sqrt(Math.random());

        let x = 0;
        let y = 0;

        switch (config.type) {
            case 'spiral': {
                const arm = Math.floor(random(0, 3));

                const angle =
                    arm * Math.PI * 2 / 3 +
                    r * 8 +
                    random(-0.35, 0.35);

                const radius = r * random(0.6, 1);

                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius * 0.58;
                break;
            }

            case 'ring': {
                const angle = random(0, Math.PI * 2);
                const radius = random(0.65, 1);

                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius * 0.55;
                break;
            }

            case 'elliptical': {
                const angle = random(0, Math.PI * 2);
                const radius = Math.sqrt(Math.random());

                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius * 0.48;
                break;
            }

            case 'nebula': {
                const centers = [
                    [-0.4, -0.1],
                    [0.25, 0.2],
                    [0.1, -0.35],
                    [-0.15, 0.35],
                ];

                const center = choose(centers);

                x = center[0] + random(-0.4, 0.4);
                y = center[1] + random(-0.3, 0.3);
                break;
            }

            case 'barred': {
                const angle = random(0, Math.PI * 2);
                const radius = random(0.1, 1);

                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius * 0.28;
                break;
            }

            case 'cluster': {
                x = random(-0.9, 0.9);
                y = random(-0.7, 0.7);
                break;
            }

            default: {
                x = random(-1, 1);
                y = random(-0.6, 0.6);
            }
        }

        // Denser galactic center
        if (Math.random() > 0.72) {
            x *= 0.45;
            y *= 0.45;
        }

        const depth = random(-0.18, 0.18);

        positions.push(
            x * width * 0.5,
            y * height * 0.5,
            depth
        );

        color.set(choose(palette));

        const brightness = random(0.7, 1.25);

        color.multiplyScalar(brightness);

        colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
    );

    geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(colors, 3)
    );

    return geometry;
}

/* =====================================================
   STAR FIELD
===================================================== */

function createStarField() {
    const positions = [];
    const colors = [];

    const starColors = [
        '#ffffff',
        '#d8caff',
        '#c5e5ff',
        '#ffe3c0',
        '#ffcde8',
    ];

    const color = new THREE.Color();

    for (let i = 0; i < SETTINGS.starCount; i++) {
        positions.push(
            random(-38, 38),
            random(-23, 23),
            random(20, -210)
        );

        color.set(choose(starColors));

        colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
    );

    geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(colors, 3)
    );

    const material = new THREE.PointsMaterial({
        size: SETTINGS.starSize,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const starField = new THREE.Points(geometry, material);

    // Recycled stars can move outside the original bounding sphere.
    starField.frustumCulled = false;

    return starField;
}

function recycleStarField(starField, camera) {
    const positions = starField.geometry.attributes.position;

    // Keep a deep star volume around the camera so it never runs out.
    // The wide X/Y spread preserves the original left/right outward space effect.
    const recycleDistance = 260;
    const behindCamera = 18;
    const farAhead = 242;

    let changed = false;

    for (let i = 0; i < positions.count; i++) {
        let x = positions.getX(i);
        let y = positions.getY(i);
        let z = positions.getZ(i);
        let starChanged = false;

        // Scrolling down: a star has passed behind the camera.
        // Send it far ahead and give it a fresh, wide position.
        while (z > camera.position.z + behindCamera) {
            z -= recycleDistance;
            x = random(-38, 38);
            y = random(-23, 23);
            changed = true;
            starChanged = true;
        }

        // Scrolling back up: recycle stars that have moved too far ahead.
        // This keeps the field balanced in both scroll directions.
        while (z < camera.position.z - farAhead) {
            z += recycleDistance;
            x = random(-38, 38);
            y = random(-23, 23);
            changed = true;
            starChanged = true;
        }

        if (starChanged) {
            positions.setXYZ(i, x, y, z);
        }
    }

    if (changed) {
        positions.needsUpdate = true;
    }
}
/* =====================================================
   SOFT COSMIC GLOW
===================================================== */

function createGlowTexture() {
    const canvas = document.createElement('canvas');

    canvas.width = 128;
    canvas.height = 128;

    const context = canvas.getContext('2d');

    const gradient = context.createRadialGradient(
        64, 64, 0,
        64, 64, 64
    );

    gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.12, 'rgba(255,255,255,0.45)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.12)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
}

/* =====================================================
   GALAXY CREATOR
===================================================== */

function createGalaxy(config, glowTexture, textureLoader) {
    const group = new THREE.Group();

    const position = config.position || [0, 0, -30];

    group.position.set(...position);

    group.rotation.z = config.rotation || 0;

    group.userData.config = config;

    if (config.type === 'image') {
        const texture = textureLoader.load(
            config.image,
            (loadedTexture) => {
                loadedTexture.colorSpace = THREE.SRGBColorSpace;
                loadedTexture.anisotropy = 8;
            }
        );

        const imageSize = config.imageSize || [8, 5];

        const geometry = new THREE.PlaneGeometry(
            imageSize[0],
            imageSize[1]
        );

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: config.opacity ?? 0.9,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const image = new THREE.Mesh(geometry, material);

        image.position.z = 0.1;

        group.add(image);

        group.userData.texture = texture;
    } else {
        const geometry = createGalaxyGeometry(config);

        const material = new THREE.PointsMaterial({
            size: SETTINGS.particleSize,
            vertexColors: true,
            transparent: true,
            opacity: config.opacity ?? SETTINGS.galaxyOpacity,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const particles = new THREE.Points(
            geometry,
            material
        );

        group.add(particles);

        // Soft colored galactic core
        const glow = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: glowTexture,
                color: config.colors?.[0] || '#fff1d2',
                transparent: true,
                opacity: config.glow ?? 0.5,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            })
        );

        const size = config.size || [8, 4];

        glow.scale.set(
            size[0] * 0.48,
            size[1] * 0.7,
            1
        );

        group.add(glow);
    }

    group.userData.rotationSpeed = config.speed || 0.2;

    return group;
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function GalaxyBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
        });

        renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, SETTINGS.maxPixelRatio)
        );

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(SETTINGS.background, 0);

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(
            55,
            window.innerWidth / window.innerHeight,
            0.1,
            350
        );

        camera.position.set(0, 0, 18);

        const universe = new THREE.Group();

        scene.add(universe);

        const glowTexture = createGlowTexture();
        const textureLoader = new THREE.TextureLoader();

        // Starfield
        const starField = createStarField();

        universe.add(starField);

        // Add all configured galaxies
        const galaxyObjects = GALAXIES.map((config) => {
            const galaxy = createGalaxy(
                config,
                glowTexture,
                textureLoader
            );

            universe.add(galaxy);

            return galaxy;
        });

        let targetScroll = window.scrollY;
        let currentScroll = window.scrollY;

        const mouse = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
        };

        const clock = new THREE.Clock();

        const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        );

        let animationId;
        let disposed = false;

        function handleScroll() {
            targetScroll = window.scrollY;
        }

        function handleMouseMove(event) {
            mouse.targetX =
                (event.clientX / window.innerWidth - 0.5) * 2;

            mouse.targetY =
                (event.clientY / window.innerHeight - 0.5) * 2;
        }

        function handleMouseLeave() {
            mouse.targetX = 0;
            mouse.targetY = 0;
        }

        function handleResize() {
            const width = window.innerWidth;
            const height = window.innerHeight;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            renderer.setPixelRatio(
                Math.min(window.devicePixelRatio || 1, SETTINGS.maxPixelRatio)
            );

            renderer.setSize(width, height);
        }

        /* =================================================
           3D CURVED CAMERA MOVEMENT
        ================================================= */

        function animate() {
            if (disposed) return;

            animationId = requestAnimationFrame(animate);

            const delta = Math.min(clock.getDelta(), 0.04);
            const time = clock.elapsedTime;

            const motion = reducedMotion.matches ? 0 : 1;

            // Smooth scroll interpolation
            const scrollFactor =
                1 - Math.pow(1 - SETTINGS.scrollSmoothness, delta * 60);

            currentScroll +=
                (targetScroll - currentScroll) * scrollFactor;

            const scrollDepth = SETTINGS.enableScroll
                ? currentScroll * SETTINGS.scrollSpeed
                : 0;

            // Curved camera path
            const progress = scrollDepth * 0.012;

            const targetCameraX =
                Math.sin(progress) * SETTINGS.cameraCurveX;

            const targetCameraY =
                Math.sin(progress * 0.7) * SETTINGS.cameraCurveY;

            camera.position.z = 18 - scrollDepth;
            recycleStarField(starField, camera);
            camera.position.x +=
                (targetCameraX - camera.position.x) * 0.035;

            camera.position.y +=
                (targetCameraY - camera.position.y) * 0.035;

            camera.lookAt(
                camera.position.x * 0.65,
                camera.position.y * 0.65,
                camera.position.z - 30
            );

            // 3D cursor deformation / perspective
            const mouseFactor =
                1 - Math.pow(1 - SETTINGS.mouseSmoothness, delta * 60);

            mouse.x += (mouse.targetX - mouse.x) * mouseFactor;
            mouse.y += (mouse.targetY - mouse.y) * mouseFactor;

            if (SETTINGS.enableMouseEffect && !reducedMotion.matches) {
                universe.rotation.y +=
                    (mouse.x * SETTINGS.mouseStrength - universe.rotation.y) * 0.055;

                universe.rotation.x +=
                    (-mouse.y * SETTINGS.mouseStrength - universe.rotation.x) * 0.055;
            } else {
                universe.rotation.x *= 0.95;
                universe.rotation.y *= 0.95;
            }

            // Individual galaxy rotations
            galaxyObjects.forEach((galaxy) => {
                if (SETTINGS.enableRotation && !reducedMotion.matches) {
                    galaxy.rotation.z +=
                        galaxy.userData.rotationSpeed * delta * 0.12;
                }
            });

            // Gentle movement of stars
            starField.rotation.z =
                Math.sin(time * 0.04) * 0.002;

            renderer.render(scene, camera);
        }

        window.addEventListener('scroll', handleScroll, {
            passive: true,
        });

        window.addEventListener('mousemove', handleMouseMove, {
            passive: true,
        });

        window.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('resize', handleResize);

        animate();

        return () => {
            disposed = true;

            cancelAnimationFrame(animationId);

            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('resize', handleResize);

            universe.traverse((object) => {
                if (object.geometry) object.geometry.dispose();

                if (object.material) {
                    const materials = Array.isArray(object.material)
                        ? object.material
                        : [object.material];

                    materials.forEach((material) => material.dispose());
                }

                if (object.userData.texture) {
                    object.userData.texture.dispose();
                }
            });

            glowTexture.dispose();
            renderer.dispose();
        };
    }, []);

    return (
        <div className="galaxy-background" aria-hidden="true">
            <canvas ref={canvasRef} />
        </div>
    );
}
