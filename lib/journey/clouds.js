import * as THREE from 'three';
import { tex, rand } from './util';

/* =====================================================
   CLOUD DECK — a few hundred camera-facing cloud puffs
   (three textures → three instanced draw calls). Lit from
   above in the texture, tinted by the time of day, faded
   when they get close so flying through them is soft, and
   blended into the sky colour with distance.
===================================================== */

const VS = /* glsl */ `
  attribute vec4 aData; // size, rotation, brightness, unused
  varying vec2 vUv;
  varying float vDepth;
  varying float vBright;
  void main() {
    vUv = uv;
    vBright = aData.z;
    vec3 center = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec4 mv = modelViewMatrix * vec4(center, 1.0);
    float c = cos(aData.y);
    float s = sin(aData.y);
    vec2 q = mat2(c, -s, s, c) * position.xy * aData.x;
    mv.xy += q;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const FS = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 uLit;
  uniform vec3 uShade;
  uniform vec3 uFog;
  uniform float uOpacity;
  uniform float uFar;
  varying vec2 vUv;
  varying float vDepth;
  varying float vBright;
  void main() {
    vec4 t = texture2D(map, vUv);
    float near = smoothstep(3.0, 26.0, vDepth);
    float far = 1.0 - smoothstep(uFar * 0.55, uFar, vDepth);
    float a = t.a * uOpacity * near * far;
    if (a < 0.004) discard;
    vec3 col = mix(uShade, uLit, clamp(t.r * vBright, 0.0, 1.2));
    col = mix(col, uFog, smoothstep(uFar * 0.15, uFar, vDepth) * 0.85);
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

export class Clouds {
  constructor({ mobile }) {
    this.group = new THREE.Group();
    this.U = {
      uLit: { value: new THREE.Color('#fff3e0') },
      uShade: { value: new THREE.Color('#8b97ad') },
      uFog: { value: new THREE.Color('#f2d9b0') },
      uOpacity: { value: 1 },
      uFar: { value: 520 },
    };
    const total = mobile ? 120 : 260;
    const geo = new THREE.PlaneGeometry(1, 1);
    this.meshes = [0, 1, 2].map((k) => {
      const n = Math.round(total / 3);
      const mat = new THREE.ShaderMaterial({
        uniforms: { ...this.U, map: { value: tex(`/textures/space/fx/cloud${k}.webp`) } },
        vertexShader: VS,
        fragmentShader: FS,
        transparent: true,
        depthWrite: false,
        fog: false,
      });
      const m = new THREE.InstancedMesh(geo, mat, n);
      const data = new Float32Array(n * 4);
      const M = new THREE.Matrix4();
      for (let i = 0; i < n; i++) {
        const s = k * 1000 + i;
        const layer = rand(s * 5.1);
        let y;
        let size;
        if (layer < 0.7) {
          // the main deck
          y = (rand(s * 2.3) - 0.5) * 16;
          size = 50 + rand(s * 3.7) * 70;
        } else if (layer < 0.85) {
          y = 26 + rand(s * 2.9) * 26; // high wisps
          size = 40 + rand(s * 3.1) * 50;
        } else {
          y = -26 - rand(s * 4.4) * 22; // scattered low cumulus
          size = 30 + rand(s * 6.1) * 40;
        }
        const x = (rand(s * 1.7) - 0.5) * 420;
        const z = 40 - rand(s * 9.3) * 620;
        M.makeTranslation(x, y, z);
        m.setMatrixAt(i, M);
        data.set([size, rand(s * 8.8) * 6.28, 0.85 + rand(s * 7.7) * 0.3, 0], i * 4);
      }
      m.geometry = geo.clone();
      m.geometry.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 4));
      m.frustumCulled = false;
      this.group.add(m);
      return m;
    });
    this.opacity = 1;
  }

  setColors(lit, shade, fog) {
    this.U.uLit.value.copy(lit);
    this.U.uShade.value.copy(shade);
    this.U.uFog.value.copy(fog);
  }

  update() {
    this.U.uOpacity.value = this.opacity;
    this.group.visible = this.opacity > 0.01;
  }
}
