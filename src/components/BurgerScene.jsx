import { Suspense, useLayoutEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import { MathUtils } from 'three'
import Burger, { MODEL_WIDTH, useBurgerFit } from './Burger.jsx'

const FOV = 38
const ELEVATION = 14   // graden boven het model
const PADDING = 1.12   // lucht rondom het model

// Zet de camera zo dat de burger op elk schermformaat volledig in beeld past.
function Rig() {
  const { height } = useBurgerFit()
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)

  useLayoutEffect(() => {
    const tan = Math.tan(MathUtils.degToRad(FOV) / 2)
    const aspect = size.width / size.height
    // De voorkant van het model staat een halve breedte dichter bij de camera dan
    // het midden en lijkt dus groter: die diepte tellen we erbij.
    const depth = MODEL_WIDTH / 2
    const distance = Math.max(
      (height * PADDING) / 2 / tan + depth * 0.7,
      (MODEL_WIDTH * PADDING) / 2 / (tan * aspect) + depth * 0.3,
    )
    const el = MathUtils.degToRad(ELEVATION)
    camera.position.set(0, Math.sin(el) * distance, Math.cos(el) * distance)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size, height, invalidate])

  return null
}

function Scene() {
  const { height } = useBurgerFit()
  return (
    <>
      <Rig />
      <Burger />
      <ContactShadows position={[0, -height / 2 - 0.05, 0]} opacity={0.45} scale={6} blur={2.2} far={2} />
      <Environment preset="studio" environmentIntensity={0.28} />
    </>
  )
}

export default function BurgerScene() {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0, 1, 6], fov: FOV }}
      gl={{ alpha: true }}
      aria-label="3D hamburger, draait terwijl je scrolt"
    >
      <ambientLight intensity={0.3} />
      {/* hoofdlicht: warm, schuin van links-voor-boven */}
      <directionalLight position={[-3, 5, 4]} intensity={0.85} color="#fff8ee" />
      {/* tegenlicht: laat de rand van het broodje loskomen van de achtergrond */}
      <directionalLight position={[4, 4, -4]} intensity={0.35} color="#fff3e0" />
      {/* vullicht: houdt de schaduwkant open */}
      <directionalLight position={[4, 1, 3]} intensity={0.2} color="#ffffff" />
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
