import * as THREE from 'three'

export interface Materials {
  plaster: THREE.MeshLambertMaterial
  floor: THREE.MeshLambertMaterial
  wood: THREE.MeshLambertMaterial
  fabric: THREE.MeshLambertMaterial
  stone: THREE.MeshLambertMaterial
  metal: THREE.MeshLambertMaterial
  flame: THREE.MeshBasicMaterial
  glow: THREE.MeshBasicMaterial
  glass: THREE.MeshBasicMaterial
  face: THREE.MeshBasicMaterial
  ghost: THREE.MeshLambertMaterial
  cake: THREE.MeshLambertMaterial
}

function rng(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvasTexture(
  paint: (ctx: CanvasRenderingContext2D, random: () => number) => void,
  size = 256,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is unavailable')
  paint(context, rng(size * 97 + 13))
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 4
  return texture
}

function plaster(): THREE.CanvasTexture {
  return canvasTexture((ctx, random) => {
    ctx.fillStyle = '#6d625b'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 1400; i += 1) {
      const shade = Math.floor(70 + random() * 50)
      ctx.fillStyle = `rgba(${shade}, ${shade - 8}, ${shade - 14}, 0.18)`
      ctx.fillRect(random() * 256, random() * 256, 2 + random() * 7, 2 + random() * 5)
    }
    for (let i = 0; i < 18; i += 1) {
      ctx.fillStyle = `rgba(40, 28, 24, ${0.05 + random() * 0.08})`
      ctx.beginPath()
      ctx.ellipse(random() * 256, random() * 256, 10 + random() * 30, 6 + random() * 16, random(), 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

function floor(): THREE.CanvasTexture {
  return canvasTexture((ctx, random) => {
    ctx.fillStyle = '#3a2c22'
    ctx.fillRect(0, 0, 256, 256)
    const plank = 32
    for (let y = 0; y < 256; y += plank) {
      const tone = 48 + Math.floor(random() * 18)
      ctx.fillStyle = `rgb(${tone + 22}, ${tone}, ${tone - 10})`
      ctx.fillRect(0, y + 1, 256, plank - 2)
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.strokeRect(0.5, y + 0.5, 255, plank - 1)
      for (let i = 0; i < 10; i += 1) {
        ctx.strokeStyle = `rgba(20, 12, 8, ${0.15 + random() * 0.25})`
        ctx.beginPath()
        const gy = y + 4 + random() * (plank - 8)
        ctx.moveTo(0, gy)
        ctx.lineTo(256, gy + random() * 2 - 1)
        ctx.stroke()
      }
    }
  })
}

function wood(): THREE.CanvasTexture {
  return canvasTexture((ctx, random) => {
    ctx.fillStyle = '#5a4030'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 90; i += 1) {
      ctx.strokeStyle = `rgba(30, 18, 10, ${0.15 + random() * 0.35})`
      ctx.beginPath()
      const y = random() * 256
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(80, y + random() * 8, 160, y - random() * 8, 256, y + random() * 4)
      ctx.stroke()
    }
  })
}

function fabric(): THREE.CanvasTexture {
  return canvasTexture((ctx, random) => {
    ctx.fillStyle = '#3d2a2e'
    ctx.fillRect(0, 0, 256, 256)
    for (let y = 0; y < 256; y += 4) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + (y % 8 === 0 ? 0.08 : 0)})`
      ctx.fillRect(0, y, 256, 2)
    }
    for (let i = 0; i < 400; i += 1) {
      ctx.fillStyle = `rgba(90, 50, 54, ${random() * 0.25})`
      ctx.fillRect(random() * 256, random() * 256, 2, 2)
    }
  })
}

export function makeFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 320
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is unavailable')
  ctx.fillStyle = '#120d0e'
  ctx.fillRect(0, 0, 256, 320)
  const gradient = ctx.createRadialGradient(128, 150, 20, 128, 150, 150)
  gradient.addColorStop(0, '#d9d2c8')
  gradient.addColorStop(0.7, '#b3aaa0')
  gradient.addColorStop(1, '#120d0e')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.ellipse(128, 156, 78, 104, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0a0708'
  ctx.beginPath()
  ctx.ellipse(96, 142, 16, 26, -0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(164, 146, 18, 24, 0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#1a1214'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(128, 168)
  ctx.lineTo(124, 188)
  ctx.stroke()
  ctx.fillStyle = '#2a1618'
  ctx.beginPath()
  ctx.ellipse(128, 230, 28, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 7; i += 1) {
    ctx.fillStyle = '#1a1012'
    ctx.fillRect(108 + i * 6, 226, 3, 8)
  }
  ctx.strokeStyle = 'rgba(40, 20, 20, 0.45)'
  ctx.lineWidth = 1
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath()
    ctx.moveTo(70 + i * 8, 70)
    ctx.lineTo(60 + i * 10, 250)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createMaterials(): Materials {
  const plasterMap = plaster()
  const floorMap = floor()
  const woodMap = wood()
  const fabricMap = fabric()
  const faceMap = makeFaceTexture()
  return {
    plaster: new THREE.MeshLambertMaterial({ map: plasterMap }),
    floor: new THREE.MeshLambertMaterial({ map: floorMap }),
    wood: new THREE.MeshLambertMaterial({ map: woodMap }),
    fabric: new THREE.MeshLambertMaterial({ map: fabricMap, color: 0xc8b8b4 }),
    stone: new THREE.MeshLambertMaterial({ color: 0x2a2628 }),
    metal: new THREE.MeshLambertMaterial({ color: 0x8d7846 }),
    flame: new THREE.MeshBasicMaterial({
      color: 0xffb15a,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    glow: new THREE.MeshBasicMaterial({
      color: 0xff8a3d,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
    glass: new THREE.MeshBasicMaterial({
      color: 0x142433,
      transparent: true,
      opacity: 0.72,
    }),
    face: new THREE.MeshBasicMaterial({ map: faceMap }),
    ghost: new THREE.MeshLambertMaterial({
      color: 0xd5d0c8,
      emissive: 0x3a1518,
      transparent: true,
      opacity: 0.86,
    }),
    cake: new THREE.MeshLambertMaterial({ color: 0x6e3b45 }),
  }
}
