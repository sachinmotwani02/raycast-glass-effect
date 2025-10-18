"use client"

import React, { useRef, useMemo, useCallback, memo } from "react"
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber"
import { OrbitControls, Environment, MeshTransmissionMaterial, Instances, Instance } from "@react-three/drei"
import { useControls, folder, LevaPanel, useCreateStore } from 'leva'
import * as THREE from "three"

const GlassStructure = memo(function GlassStructure({ controls }) {
  const groupRef = useRef()
  

  
  // Memoize material to prevent recreation
  const glassMaterial = useMemo(() => (
    <MeshTransmissionMaterial
      transmission={controls.transmission}
      thickness={controls.thickness}
      roughness={controls.roughness}
      envMapIntensity={controls.envMapIntensity}
      clearcoat={controls.clearcoat}
      clearcoatRoughness={controls.clearcoatRoughness}
      ior={controls.ior}
      reflectivity={controls.reflectivity}
      color={controls.glassColor}
      transparent={true}
      chromaticAberration={0.2}
      opacity={1.0}
    />
  ), [controls.transmission, controls.thickness, controls.roughness, controls.envMapIntensity, 
      controls.clearcoat, controls.clearcoatRoughness, controls.ior, controls.reflectivity, controls.glassColor])
  
  // Optimize rotation updates - only update when values change
  const rotationRef = useRef({ x: 0, y: 0, z: 0 })
  
  useFrame(() => {
    if (groupRef.current) {
      const newX = THREE.MathUtils.degToRad(controls.glassRotationX)
      const newY = THREE.MathUtils.degToRad(controls.glassRotationY)
      const newZ = THREE.MathUtils.degToRad(controls.glassRotationZ)
      
      if (rotationRef.current.x !== newX || rotationRef.current.y !== newY || rotationRef.current.z !== newZ) {
        groupRef.current.rotation.set(newX, newY, newZ)
        rotationRef.current = { x: newX, y: newY, z: newZ }
      }
    }
  })

  // Memoize cylinder positions to prevent recalculation
  const cylinderPositions = useMemo(() => {
    return Array.from({ length: controls.count }, (_, index) => {
      const offset = index - (controls.count - 1) / 2
      return [offset * controls.radius * 2, 0, controls.glassZ]
    })
  }, [controls.count, controls.radius, controls.glassZ])

  // Use instancing for better performance when enabled and count > 5
  if (controls.useInstancing && controls.count > 5) {
    return (
      <group ref={groupRef}>
        <Instances>
          <cylinderGeometry args={[controls.radius, controls.radius, controls.height, controls.subdivisions]} />
          {glassMaterial}
          {cylinderPositions.map((position, index) => (
            <Instance key={index} position={position} />
          ))}
        </Instances>
      </group>
    )
  }

  // Use individual meshes for smaller counts
  return (
    <group ref={groupRef}>
      {cylinderPositions.map((position, index) => (
        <mesh 
          key={index} 
          position={position}
          frustumCulled={true}
          matrixAutoUpdate={false}
        >
          <cylinderGeometry args={[controls.radius, controls.radius, controls.height, controls.subdivisions]} />
          {glassMaterial}
        </mesh>
      ))}
    </group>
  )
})

const RotatingCube = memo(function RotatingCube({ controls }) {
  const meshRef = useRef()
  
  // Memoize material with dependency tracking
  const cubeMaterial = useMemo(() => (
    <meshStandardMaterial 
      color={controls.cubeColor} 
      emissive={controls.cubeColor} 
      emissiveIntensity={1} 
    />
  ), [controls.cubeColor])
  
  // Optimize animation - use requestAnimationFrame pattern
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime * 0.2
      meshRef.current.rotation.set(time, time, time)
    }
  })

  return (
    <mesh 
      ref={meshRef} 
      position={[0, 0, controls.cubeZ]}
      frustumCulled={true}
      matrixAutoUpdate={true}
    >
      <boxGeometry args={[8, 8, 8]} />
      {cubeMaterial}
    </mesh>
  )
})

function Scene({ store }) {
  const controls = useControls({
    Scene: folder({
      backgroundColor: { value: '#070708' },
      cubeColor: { value: '#ff3030' },
      cubeZ: { value: -9.6, min: -15, max: 0, step: 0.1 },
      glassZ: { value: 0.02, min: -1, max: 1, step: 0.01 },
      cameraZ: { value: 16.8, min: 10, max: 30, step: 0.1 },
    }),
    Glass: folder({
      transmission: { value: 1, min: 0, max: 1, step: 0.01 },
      thickness: { value: 3.2, min: 0, max: 5, step: 0.01 },
      roughness: { value: 0.35, min: 0, max: 1, step: 0.01 },
      clearcoat: { value: 0.18, min: 0, max: 1, step: 0.01 },
      clearcoatRoughness: { value: 0.2, min: 0, max: 1, step: 0.01 },
      ior: { value: 1.5, min: 1, max: 2.5, step: 0.01 },
      reflectivity: { value: 0.5, min: 0, max: 1, step: 0.01 },
      envMapIntensity: { value: 2.8, min: 0, max: 5, step: 0.1 },
      glassColor: { value: '#ffffff' },
      chromaticAberration: { value: 0.2, min: 0, max: 4, step: 0.1 },
    }),
    Cylinder: folder({
      count: { value: 8, min: 1, max: 20, step: 1 },
      radius: { value: 0.66, min: 0.1, max: 1, step: 0.01 },
      height: { value: 29.8, min: 1, max: 40, step: 0.1 },
      subdivisions: { value: 8, min: 3, max: 64, step: 1 },
    }),
    'Glass Rotation': folder({
      glassRotationX: { value: 0, min: -180, max: 180, step: 1 },
      glassRotationY: { value: 0, min: -180, max: 180, step: 1 },
      glassRotationZ: { value: 41, min: -180, max: 180, step: 1 },
    }),
    Performance: folder({
      samples: { value: 8, min: 1, max: 32, step: 1 },
      resolution: { value: 512, min: 256, max: 2048, step: 256 },
      enableShadows: { value: false },
      pixelRatio: { value: 1, min: 0.5, max: 2, step: 0.1 },
      frameloop: { options: ['always', 'demand', 'never'], value: 'demand' },
      toneMappingExposure: { value: 1, min: 0.1, max: 3, step: 0.1 },
      outputEncoding: { options: ['sRGB', 'Linear'], value: 'sRGB' },
      useInstancing: { value: true },
      culling: { value: true },
    }),
  }, { store })

  return (
          <>
        <color attach="background" args={[controls.backgroundColor]} />
        
        {/* Soft ambient lighting for glass materials */}
        <ambientLight intensity={0.8} />
        <hemisphereLight 
          skyColor="#ffffff" 
          groundColor="#444444" 
          intensity={0.6} 
        />
        <pointLight 
          position={[5, 5, 5]} 
          intensity={0.3}
          distance={50}
          decay={2}
        />
        <pointLight 
          position={[-5, -5, 5]} 
          intensity={0.2}
          distance={50}
          decay={2}
        />
        
        <GlassStructure controls={controls} />
        <RotatingCube controls={controls} />
        <OrbitControls enablePan={false} enableZoom={true} />
      </>
  )
}

export default function App() {
  const store = useCreateStore()

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <div style={{ flexGrow: 1, position: 'relative' }}>
        <Canvas 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
          camera={{ position: [0, 0, 12], fov: 50 }}
          gl={{ 
            antialias: false, // Disable for better performance
            alpha: false,
            powerPreference: "high-performance",
            stencil: false,
            depth: true
          }}
          dpr={[1, 2]} // Limit device pixel ratio for performance
          performance={{ min: 0.5 }} // Auto-adjust quality based on performance
          frameloop="always" // Continuous rendering for animations
          shadows={false}
        >
          <Scene store={store} />
        </Canvas>
      </div>
      <div style={{ width: '320px', backgroundColor: '#1a1a1a', overflowY: 'auto' }}>
        <LevaPanel 
          store={store}
          theme={{
            sizes: { rootWidth: '320px' },
            fontSizes: { base: 11 },
            space: { md: '10px' },
          }}
          fill 
          flat 
          titleBar={false}
        />
      </div>
    </div>
  )
}