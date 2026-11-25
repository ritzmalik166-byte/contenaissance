import * as THREE from 'three';
import { tex } from './util';

/* =====================================================
   EARTH — NASA Blue Marble based maps (Solar System Scope,
   CC BY 4.0): day colour, city lights on the night side,
   ocean sun glint from the specular mask, drifting clouds
   with their own shadows, and a scattering rim.
   Radius R; the studio's home (Noida) faces +Z.
===================================================== */

export const R = 10;
const BASE = '/textures/space/planets';
const HOME = { lat: 22, lon: 79 };

export function latLon(lat, lon, r = 1) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const th = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

const VS = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const GLOBE_FS = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specMap;
  uniform sampler2D cloudMap;
  uniform vec3 sunDir;
  uniform float cloudShift;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    float NdL = dot(N, sunDir);
    float dayK = smoothstep(-0.18, 0.28, NdL);
    vec3 dayC = texture2D(dayMap, vUv).rgb;
    float cloud = texture2D(cloudMap, vUv + vec2(cloudShift, 0.0)).r;
    float shadow = texture2D(cloudMap, vUv + vec2(cloudShift + 0.0025, 0.0015)).r;
    float spec = texture2D(specMap, vUv).r;
    vec3 lit = dayC * (max(NdL, 0.0) * 1.8 + 0.012) * (1.0 - shadow * 0.45);
    vec3 H = normalize(sunDir + V);
    float glint = pow(max(dot(N, H), 0.0), 80.0) * spec * (1.0 - cloud) * 2.4 * dayK;
    vec3 night = texture2D(nightMap, vUv).rgb * vec3(1.0, 0.72, 0.4) * 3.4 * (1.0 - dayK) * (1.0 - cloud * 0.75);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4);
    vec3 col = lit + night + glint * vec3(1.0, 0.92, 0.78);
    col += vec3(0.3, 0.55, 1.0) * fres * (0.02 + 0.6 * smoothstep(-0.25, 0.8, NdL));
    col += vec3(1.0, 0.42, 0.16) * 0.06 * exp(-pow((NdL - 0.02) * 9.0, 2.0));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const CLOUD_FS = /* glsl */ `
  uniform sampler2D cloudMap;
  uniform vec3 sunDir;
  uniform float opacity;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vec3 N = normalize(vN);
    float NdL = dot(N, sunDir);
    float c = texture2D(cloudMap, vUv).r;
    float a = smoothstep(0.1, 0.8, c);
    vec3 col = vec3(1.0, 0.98, 0.95) * (max(NdL, 0.0) * 1.4 + 0.015);
    col += vec3(1.0, 0.5, 0.25) * 0.22 * smoothstep(-0.15, 0.0, NdL) * (1.0 - smoothstep(0.0, 0.2, NdL));
    gl_FragColor = vec4(col, a * opacity * (0.2 + 0.8 * smoothstep(-0.3, 0.2, NdL)));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const ATMO_VS = /* glsl */ `
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
// limb glow seen from outside: strongest where the view grazes the shell
const ATMO_FS = /* glsl */ `
  uniform vec3 sunDir;
  uniform float opacity;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    float rim = 1.0 - abs(dot(N, V));
    float i = pow(rim, 6.0) * 1.15 + pow(rim, 1.5) * 0.06;
    float lit = 0.05 + smoothstep(-0.35, 0.6, dot(N, sunDir));
    vec3 col = mix(vec3(0.25, 0.5, 1.0), vec3(0.6, 0.8, 1.0), rim) * i * lit * 2.2;
    gl_FragColor = vec4(col * opacity, 1.0);
  }
`;

export class Earth {
  constructor({ mobile }) {
    this.group = new THREE.Group();
    this.sunDir = new THREE.Vector3(-1, 0.32, 0.55).normalize();
    const res = mobile ? '1k' : '2k';
    const dayRes = mobile ? '1k' : '4k';
    const seg = mobile ? 96 : 160;
    const clouds = tex(`${BASE}/earth_clouds_${res}.webp`, { srgb: false, repeat: true, aniso: 8 });
    this.globeU = {
      dayMap: { value: tex(`${BASE}/earth_day_${dayRes}.webp`, { aniso: 8 }) },
      nightMap: { value: tex(`${BASE}/earth_night_${res}.webp`) },
      specMap: { value: tex(`${BASE}/earth_spec_1k.webp`, { srgb: false }) },
      cloudMap: { value: clouds },
      sunDir: { value: this.sunDir },
      cloudShift: { value: 0 },
    };
    this.surface = new THREE.Group();
    this.globe = new THREE.Mesh(new THREE.SphereGeometry(R, seg, seg / 2), new THREE.ShaderMaterial({ uniforms: this.globeU, vertexShader: VS, fragmentShader: GLOBE_FS }));
    this.cloudU = { cloudMap: { value: clouds }, sunDir: { value: this.sunDir }, opacity: { value: 1 } };
    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.008, seg, seg / 2),
      new THREE.ShaderMaterial({ uniforms: this.cloudU, vertexShader: VS, fragmentShader: CLOUD_FS, transparent: true, depthWrite: false }),
    );
    this.surface.add(this.globe, this.clouds);
    this.atmoU = { sunDir: { value: this.sunDir }, opacity: { value: 1 } };
    this.atmo = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.032, 96, 48),
      new THREE.ShaderMaterial({ uniforms: this.atmoU, vertexShader: ATMO_VS, fragmentShader: ATMO_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.group.add(this.surface, this.atmo);

    // turn the planet so home faces +Z
    const home = latLon(HOME.lat, HOME.lon);
    this.baseYaw = -Math.atan2(home.x, home.z);
    this.surface.rotation.y = this.baseYaw;
    this.surface.updateMatrixWorld();
    this.home = latLon(HOME.lat, HOME.lon, R).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.baseYaw);
    this.spin = 0;
  }

  update(time, camDist) {
    this.surface.rotation.y = this.baseYaw + this.spin;
    this.clouds.rotation.y = time * 0.003;
    this.globeU.cloudShift.value = -(time * 0.003) / (Math.PI * 2);
    // the limb shell only reads from outside the atmosphere
    this.atmo.visible = camDist > R * 1.06;
  }
}
