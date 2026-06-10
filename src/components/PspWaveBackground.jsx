import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

function CameraDrift() {
  const pointerTarget = useRef({ x: 0, y: 0 });
  const pointerCurrent = useRef({ x: 0, y: 0 });
  const idleOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onPointerMove = (event) => {
      const x = (event.clientX / window.innerWidth) * 4 - 1;
      const y = (event.clientY / window.innerHeight) * 8 - 1;
      pointerTarget.current.x = x;
      pointerTarget.current.y = y;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  useFrame((state, delta) => {
    const smoothing = 1 - Math.exp(-delta * 2.35);
    pointerCurrent.current.x += (pointerTarget.current.x - pointerCurrent.current.x) * smoothing;
    pointerCurrent.current.y += (pointerTarget.current.y - pointerCurrent.current.y) * smoothing;

    const t = state.clock.elapsedTime;
    idleOffset.current.x = Math.sin(t * 0.19) * 0.12 + Math.sin(t * 0.07) * 0.06;
    idleOffset.current.y = Math.cos(t * 0.17) * 0.08 + Math.sin(t * 0.11) * 0.04;

    const driftX = pointerCurrent.current.x * 0.72 + idleOffset.current.x;
    const driftY = pointerCurrent.current.y * 0.46 + idleOffset.current.y;

    state.camera.position.x += (driftX - state.camera.position.x) * smoothing;
    state.camera.position.y += (-driftY - state.camera.position.y) * smoothing;
    state.camera.lookAt(driftX * 0.66, -driftY * 0.22, 0);
  });

  return null;
}

function WaveRibbon({ position = [0, 0, 0], rotation = [0, 0, 0], color = '#9cd7ff', speed = 1, opacity = 0.18 }) {
  const materialRef = useRef(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: opacity },
          uSpeed: { value: speed },
        },
        vertexShader: `
          uniform float uTime;
          uniform float uSpeed;
          varying vec2 vUv;

          void main() {
            vUv = uv;
            vec3 transformed = position;

            float t = uTime * uSpeed;
            float waveA = sin((uv.x * 8.0) + t * 0.7) * 0.16;
            float waveB = sin((uv.x * 14.0) - t * 0.5) * 0.07;
            float waveC = sin((uv.x * 22.0) + t * 0.35) * 0.03;

            transformed.y += waveA + waveB + waveC;
            transformed.z += sin((uv.x * 10.0) + t * 0.4) * 0.12;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec2 vUv;

          void main() {
            float edge = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y));
            float fadeX = smoothstep(0.0, 0.06, vUv.x) * (1.0 - smoothstep(0.92, 1.0, vUv.x));
            float alpha = edge * fadeX * uOpacity;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
      }),
    [color, opacity, speed],
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[26, 2.4, 180, 2]} />
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
}

function RainbowVeil() {
  const materialRef = useRef(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec2 vUv;

          vec3 hsl2rgb(vec3 c) {
            vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
            return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
          }

          void main() {
            float t = uTime * 0.045;
            float hue = fract(vUv.x * 0.72 + vUv.y * 0.18 + t);
            float sweep = sin((vUv.x * 6.0) + (uTime * 0.24)) * 0.08;
            vec3 rainbow = hsl2rgb(vec3(fract(hue + sweep), 0.72, 0.62));

            float edgeFade = smoothstep(0.0, 0.2, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
            float alpha = edgeFade * 0.16;

            gl_FragColor = vec4(rainbow, alpha);
          }
        `,
      }),
    [],
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh position={[0, -1.25, -3.4]} rotation={[0.02, 0, 0]}>
      <planeGeometry args={[30, 11, 1, 1]} />
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
}

function Sparkles() {
  const pointsRef = useRef(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
        },
        vertexShader: `
          attribute float aPhase;
          attribute float aSize;
          varying float vPhase;

          void main() {
            vPhase = aPhase;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = aSize * (220.0 / -mvPosition.z);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying float vPhase;

          void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float dist = length(uv);

            float core = smoothstep(0.22, 0.0, dist);
            float halo = smoothstep(0.52, 0.0, dist) * 0.65;

            float twinkle = 0.55 + 0.45 * sin(uTime * 0.55 + vPhase);
            float alpha = (core + halo) * twinkle;

            vec3 color = mix(vec3(0.62, 0.84, 1.0), vec3(0.95, 0.98, 1.0), core);
            gl_FragColor = vec4(color, alpha);
          }
        `,
      }),
    [],
  );

  const { positions, phases, sizes } = useMemo(() => {
    const count = 130;
    const positionsArray = new Float32Array(count * 3);
    const phasesArray = new Float32Array(count);
    const sizesArray = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      positionsArray[i * 3] = (Math.random() - 0.5) * 30;
      positionsArray[i * 3 + 1] = (Math.random() - 0.5) * 16;
      positionsArray[i * 3 + 2] = -2 + Math.random() * 5;
      phasesArray[i] = Math.random() * Math.PI * 2;
      sizesArray[i] = 0.35 + Math.random() * 1.3;
    }

    return { positions: positionsArray, phases: phasesArray, sizes: sizesArray };
  }, []);

  useFrame((state) => {
    if (pointsRef.current?.material) {
      pointsRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={positions.length / 3} itemSize={3} />
        <bufferAttribute attach="attributes-aPhase" array={phases} count={phases.length} itemSize={1} />
        <bufferAttribute attach="attributes-aSize" array={sizes} count={sizes.length} itemSize={1} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
}

export default function PspWaveBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 10], fov: 52 }} gl={{ alpha: true, antialias: true }}>
        <CameraDrift />
        <color attach="background" args={['#082449']} />
        <fog attach="fog" args={['#071b37', 8, 28]} />

        <ambientLight intensity={0.32} />
        <directionalLight position={[-7, 5, 6]} intensity={0.8} color="#b8dfff" />
        <pointLight position={[8, -2, 5]} intensity={1} color="#7cc8ff" />

        <RainbowVeil />

        <group position={[0, -0.8, -1]}>
          <WaveRibbon position={[0, 1.7, 0]} rotation={[0.06, -0.02, 0.02]} color="#8dd3ff" speed={0.95} opacity={0.17} />
          <WaveRibbon position={[0, 0.5, 0.3]} rotation={[-0.02, 0.03, -0.01]} color="#bde7ff" speed={0.72} opacity={0.15} />
          <WaveRibbon position={[0, -0.75, 0.45]} rotation={[0.05, -0.05, 0.03]} color="#69c2ff" speed={1.18} opacity={0.16} />
          <WaveRibbon position={[0, -1.95, 0.7]} rotation={[0.04, 0.02, -0.02]} color="#9ad8ff" speed={0.62} opacity={0.13} />
        </group>

        <Sparkles />
      </Canvas>
    </div>
  );
}
