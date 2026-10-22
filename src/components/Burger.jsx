import { useEffect, useMemo, useRef } from 'react'
import { Box3, MathUtils, Vector3 } from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

const URL = '/burger_2.glb'
// Het model wordt genormaliseerd: gecentreerd op de oorsprong en MODEL_WIDTH breed.
export const MODEL_WIDTH = 2.6
const REST_ANGLE = 0.6      // beginstand (rad), zodat de burger niet plat van voren staat
const RAD_PER_PX = 0.004    // 1 volledige draai per ~1570px scrollen
const DAMPING = 6
const ROUGHNESS = { green: 0.65, bred: 0.65, tomato: 0.6 }  // minimale ruwheid per materiaal

export function useBurgerFit() {
  const { scene } = useGLTF(URL)
  return useMemo(() => {
    // In het model zijn sla, broodje en tomaat vrij glad (roughness 0,22 - 0,5): dat geeft
    // doorgebrande glansvlekken. Iets ruwer maakt de highlights zachter.
    scene.traverse((o) => {
      const min = ROUGHNESS[o.material?.name]
      if (o.isMesh && min) o.material.roughness = Math.max(o.material.roughness, min)
    })
    scene.updateMatrixWorld(true)
    const box = new Box3().setFromObject(scene)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const scale = MODEL_WIDTH / Math.max(size.x, size.z)
    return { scene, scale, center, height: size.y * scale }
  }, [scene])
}

const targetAngle = () => REST_ANGLE + window.scrollY * RAD_PER_PX

export default function Burger() {
  const { scene, scale, center } = useBurgerFit()
  const ref = useRef()
  const visible = useRef(true)
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  const start = useMemo(targetAngle, [])

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting })
    io.observe(gl.domElement)
    // Alleen opnieuw renderen als de gebruiker scrolt en de burger in beeld is.
    const onScroll = () => { if (visible.current) invalidate() }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll) }
  }, [gl, invalidate])

  useFrame((state, dt) => {
    const g = ref.current
    if (!g) return
    const target = targetAngle()
    // dt begrenzen: bij frameloop="demand" kan de eerste delta seconden groot zijn.
    g.rotation.y = MathUtils.damp(g.rotation.y, target, DAMPING, Math.min(dt, 1 / 30))
    if (Math.abs(target - g.rotation.y) > 0.0005) state.invalidate()
  })

  return (
    <group ref={ref} rotation={[0, start, 0]}>
      <group scale={scale} position={[-center.x * scale, -center.y * scale, -center.z * scale]}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

useGLTF.preload(URL)
