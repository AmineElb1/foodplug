import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, ContactShadows, useGLTF } from '@react-three/drei'
import { Box3, MathUtils, Vector3 } from 'three'
import { MODELS, SWITCH_MS, DIAMETER, SATURATION, heightOf } from '../models.js'

const FOV = 38
const ELEVATION = 20        // graden boven het model
const PADDING = 1.04        // lucht rondom
const SLIDE = 1.9           // hoe ver (in wereldeenheden) een model opzij schuift bij het wisselen
const SWIPE_PX = 40         // minimale veegafstand om te wisselen
const RAD_PER_PX = 0.004    // 1 volledige draai per ~1570px scrollen
const DAMPING = 6
const IN_S = 0.95           // duur van binnenkomen
const OUT_S = 0.55          // duur van verdwijnen
const IN_DELAY_S = 0.28     // nieuw model start iets later, zodat het oude eerst weg is

// Kleuren van het model levendiger maken: de bakjes en foto's zijn nogal flets. We verhogen de verzadiging
// en een tikje het contrast in de shader, zonder de bestanden zelf aan te passen.
function enrich(scene, sat, bright) {
  scene.traverse((o) => {
    if (!o.isMesh || !o.material || o.material.userData.enriched) return
    const m = o.material
    m.userData.enriched = true
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        diffuseColor.rgb = clamp(mix(vec3(lum), diffuseColor.rgb, ${sat.toFixed(2)}), 0.0, 1.0);
        diffuseColor.rgb = clamp((diffuseColor.rgb - 0.5) * 1.06 + 0.5, 0.0, 1.0) * ${bright.toFixed(2)};`,
      )
    }
    m.customProgramCacheKey = () => `enriched-${sat}-${bright}`
    m.needsUpdate = true
  })
}

const MAX_HEIGHT = Math.max(...MODELS.map(heightOf))
MODELS.forEach((m) => useGLTF.preload(m.url))

// Easing
const easeOutCubic = (t) => 1 - (1 - t) ** 3
const easeInCubic = (t) => t ** 3
const easeOutBack = (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2 }
const easeInBack = (t) => { const c1 = 1.5, c3 = c1 + 1; return c3 * t ** 3 - c1 * t ** 2 }

// Camera zo zetten dat elk model op elk scherm volledig in beeld past (ook tijdens het draaien).
function Rig() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const tan = Math.tan(MathUtils.degToRad(FOV) / 2)
    const aspect = size.width / size.height
    const depth = DIAMETER / 2
    const distance = Math.max(
      (MAX_HEIGHT * PADDING) / 2 / tan + depth * 0.7,
      (DIAMETER * PADDING) / 2 / (tan * aspect) + depth * 0.3,
    )
    const el = MathUtils.degToRad(ELEVATION)
    const targetY = MAX_HEIGHT * 0.5
    camera.position.set(0, targetY + Math.sin(el) * distance, Math.cos(el) * distance)
    camera.lookAt(0, targetY, 0)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size, invalidate])
  return null
}

// Eén model: geschaald, op de grond gezet en met een in/uit-animatie.
function Model({ model, active, dir, angle, onReady }) {
  const { scene } = useGLTF(model.url)
  const invalidate = useThree((s) => s.invalidate)
  const outer = useRef()
  const anim = useRef({ p: 0, delay: IN_DELAY_S, wasActive: false })

  const fit = useMemo(() => {
    enrich(scene, model.sat ?? SATURATION, model.bright ?? 1)
    scene.updateMatrixWorld(true)
    const box = new Box3().setFromObject(scene)
    const size = box.getSize(new Vector3())
    const c = box.getCenter(new Vector3())
    const scale = DIAMETER / Math.hypot(size.x, size.z)
    return { scale, offset: [-c.x * scale, -box.min.y * scale, -c.z * scale] }
  }, [scene])

  useEffect(() => { onReady(model.id) }, [model.id, onReady])
  useEffect(() => { invalidate() }, [active, invalidate])

  useFrame((state, dt) => {
    const g = outer.current
    const a = anim.current
    if (!g) return
    dt = Math.min(dt, 1 / 30)
    if (active) {
      if (!a.wasActive) a.delay = a.p > 0 ? 0 : IN_DELAY_S // draaide hij nog uit: meteen terug
      if (a.delay > 0) a.delay -= dt
      else a.p = Math.min(1, a.p + dt / IN_S)
    } else {
      a.p = Math.max(0, a.p - dt / OUT_S)
    }
    a.wasActive = active

    // Richting: bij "volgende" (dir = 1) schuift het oude model naar links weg en komt het nieuwe van rechts.
    let s, x, y, spin
    if (active) { // binnenkomen: opveren met een kleine overshoot, zijwaarts inschuiven en uitdraaien
      const e = easeOutCubic(a.p)
      s = easeOutBack(a.p); x = (1 - e) * dir.current * SLIDE; y = (1 - e) * -0.4; spin = (1 - e) * dir.current * Math.PI * 0.9
    } else { // verdwijnen: eerst iets groeien (aanloop), dan zijwaarts wegdraaien en krimpen
      const u = 1 - a.p
      s = 1 - easeInBack(u); x = -easeInCubic(u) * dir.current * SLIDE; y = easeInCubic(u) * 0.5; spin = -easeInCubic(u) * dir.current * Math.PI * 0.9
    }
    g.visible = a.p > 0.002
    g.scale.setScalar(Math.max(s, 0.0001))
    g.position.set(x, y, 0)
    g.rotation.y = angle.current + model.rest + spin
    if (active ? a.p < 1 || a.delay > 0 : a.p > 0) state.invalidate()
  })

  return (
    <group ref={outer} visible={false}>
      <group scale={fit.scale} position={fit.offset}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

function Scene({ index, dir, onReady }) {
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  const visible = useRef(true)
  const target = () => window.scrollY * RAD_PER_PX
  const angle = useRef(target())

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting })
    io.observe(gl.domElement)
    // Alleen opnieuw renderen als de gebruiker scrolt en het model in beeld is.
    const onScroll = () => { if (visible.current) invalidate() }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll) }
  }, [gl, invalidate])

  // De rotatie hangt alleen van het scrollen af. Dit blijft per beeld klein: een zachte nadraai.
  useFrame((state, dt) => {
    const t = target()
    angle.current = MathUtils.damp(angle.current, t, DAMPING, Math.min(dt, 1 / 30))
    if (Math.abs(t - angle.current) > 0.0005) state.invalidate()
  })

  return (
    <>
      <Rig />
      {MODELS.map((m, i) => (
        <Suspense key={m.id} fallback={null}>
          <Model model={m} active={i === index} dir={dir} angle={angle} onReady={onReady} />
        </Suspense>
      ))}
      <ContactShadows position={[0, -0.01, 0]} opacity={0.45} scale={7} blur={2.4} far={2.2} />
      <Environment preset="studio" environmentIntensity={0.28} />
    </>
  )
}

export default function ModelCarousel() {
  const [index, setIndex] = useState(0)
  const dir = useRef(1) // 1 = volgende (komt van rechts), -1 = vorige
  const drag = useRef(null)
  const [ready, setReady] = useState({})
  const box = useRef(null)
  const visible = useRef(true)
  const paused = useRef(false)
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const onReady = useMemo(() => (id) => setReady((r) => (r[id] ? r : { ...r, [id]: true })), [])

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting })
    io.observe(box.current)
    return () => io.disconnect()
  }, [])

  // Na een interval naar het volgende model, zodra dat is geladen. Een handmatige keuze start de timer opnieuw.
  // Wisselen naar een model; `d` is de richting van de animatie.
  const go = (i, d) => {
    if (i === index || !ready[MODELS[i].id]) return
    dir.current = d
    setIndex(i)
  }
  const step = (d) => {
    for (let k = 1; k < MODELS.length; k++) { // eerstvolgende model dat al geladen is
      const i = (index + d * k + MODELS.length * k) % MODELS.length
      if (ready[MODELS[i].id]) return go(i, d)
    }
  }

  useEffect(() => {
    if (reduced || MODELS.length < 2) return
    const id = setInterval(() => {
      if (document.hidden || !visible.current || paused.current) return
      const next = (index + 1) % MODELS.length
      if (ready[MODELS[next].id]) go(next, 1)
    }, SWITCH_MS)
    return () => clearInterval(id)
  }, [index, ready, reduced])

  const current = MODELS[index]
  return (
    <div
      className="carousel"
      ref={box}
      onPointerEnter={() => { paused.current = true }}
      onPointerLeave={() => { paused.current = false }}
      // Horizontaal vegen wisselt van model; verticaal blijft gewoon scrollen (touch-action: pan-y).
      onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId } }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (!d || d.id !== e.pointerId) return
        const dx = e.clientX - d.x, dy = e.clientY - d.y
        if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1)
      }}
      onPointerCancel={() => { drag.current = null }}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [0, 1, 6], fov: FOV }}
        gl={{ alpha: true }}
        style={{ height: 'calc(100% - 54px)' }} // ruimte onderaan voor het label en de bolletjes
        aria-label="3D-gerechten van Foodplug, ze draaien terwijl je scrolt"
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[-3, 5, 4]} intensity={0.85} color="#fff8ee" />
        <directionalLight position={[4, 4, -4]} intensity={0.35} color="#fff3e0" />
        <directionalLight position={[4, 1, 3]} intensity={0.2} color="#ffffff" />
        <Scene index={index} dir={dir} onReady={onReady} />
      </Canvas>

      {MODELS.length > 1 && <span className="carousel__hint" aria-hidden="true">veeg ←</span>}

      {MODELS.length > 1 && <span className="carousel__hint" aria-hidden="true">veeg ←</span>}

      {MODELS.length > 1 && (
        <div className="carousel__ui">
          <a key={current.id} className="carousel__label" href={current.href} aria-live="polite">
            {current.label} <span aria-hidden="true">→</span><span className="sr-only"> bekijk in het menu</span>
          </a>
          <div className="carousel__dots">
            {MODELS.map((m, i) => (
              <button key={m.id} type="button" className={i === index ? 'is-active' : ''} aria-label={`Toon ${m.label}`} aria-current={i === index ? 'true' : undefined}
                disabled={!ready[m.id]} onClick={() => go(i, i > index ? 1 : -1)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
