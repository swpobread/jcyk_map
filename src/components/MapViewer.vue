<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Marker {
  id: number
  x: number   // 0–100 percent of image width
  y: number   // 0–100 percent of image height
  label: string
  color: string
}

const MAP_W = 1600
const MAP_H = 900
const MIN_ZOOM = 1.2   // never show boundary
const MAX_ZOOM = 6

const activeMap = ref<'A' | 'B'>('A')
const zoom = ref(MIN_ZOOM)
const offsetX = ref(0)
const offsetY = ref(0)

const mapSrc = computed(() => activeMap.value === 'A' ? '/map-a.jpg' : '/map-b.jpg')

const markersA: Marker[] = [
  { id: 1, x: 25, y: 30, label: 'Alpha Base', color: '#38bdf8' },
  { id: 2, x: 55, y: 55, label: 'Lake Sector', color: '#38bdf8' },
  { id: 3, x: 75, y: 45, label: 'Delta Post', color: '#38bdf8' },
  { id: 4, x: 40, y: 70, label: 'Green Zone', color: '#4ade80' },
]

const markersB: Marker[] = [
  { id: 1, x: 20, y: 22, label: 'Ruins Site', color: '#c084fc' },
  { id: 2, x: 50, y: 35, label: 'Outpost 7', color: '#c084fc' },
  { id: 3, x: 65, y: 65, label: 'Badlands', color: '#fb923c' },
  { id: 4, x: 82, y: 50, label: 'Echo Ridge', color: '#fb923c' },
  { id: 5, x: 35, y: 60, label: 'Old Bridge', color: '#c084fc' },
]

const markers = computed(() => activeMap.value === 'A' ? markersA : markersB)

// Container ref for bounds
const containerRef = ref<HTMLDivElement | null>(null)

function clampOffset(x: number, y: number, z: number) {
  const cw = containerRef.value?.clientWidth ?? window.innerWidth
  const ch = containerRef.value?.clientHeight ?? window.innerHeight
  const mapDisplayW = MAP_W * z
  const mapDisplayH = MAP_H * z
  // max offset: image edge stays inside container
  const maxX = (mapDisplayW - cw) / 2
  const maxY = (mapDisplayH - ch) / 2
  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y)),
  }
}

// ── Wheel zoom ──────────────────────────────────────────────────────────────
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY < 0 ? 1.1 : 0.9
  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value * delta))
  // zoom toward cursor position
  const rect = containerRef.value!.getBoundingClientRect()
  const cx = e.clientX - rect.left - rect.width / 2
  const cy = e.clientY - rect.top - rect.height / 2
  const scale = newZoom / zoom.value
  const nx = cx + (offsetX.value - cx) * scale
  const ny = cy + (offsetY.value - cy) * scale
  zoom.value = newZoom
  const clamped = clampOffset(nx, ny, newZoom)
  offsetX.value = clamped.x
  offsetY.value = clamped.y
}

// ── Pan (mouse) ─────────────────────────────────────────────────────────────
let dragging = false
let lastMX = 0, lastMY = 0

function onMouseDown(e: MouseEvent) {
  dragging = true
  lastMX = e.clientX
  lastMY = e.clientY
}
function onMouseMove(e: MouseEvent) {
  if (!dragging) return
  const dx = e.clientX - lastMX
  const dy = e.clientY - lastMY
  lastMX = e.clientX
  lastMY = e.clientY
  const clamped = clampOffset(offsetX.value + dx, offsetY.value + dy, zoom.value)
  offsetX.value = clamped.x
  offsetY.value = clamped.y
}
function onMouseUp() { dragging = false }

// ── Touch (pinch + pan) ─────────────────────────────────────────────────────
let lastTouchDist = 0
let lastTouchMid = { x: 0, y: 0 }
let touchCount = 0

function getTouchDist(t: TouchList) {
  const t0 = t.item(0)!, t1 = t.item(1)!
  const dx = t0.clientX - t1.clientX
  const dy = t0.clientY - t1.clientY
  return Math.sqrt(dx * dx + dy * dy)
}
function getTouchMid(t: TouchList) {
  const t0 = t.item(0)!, t1 = t.item(1)!
  return { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 }
}

function onTouchStart(e: TouchEvent) {
  touchCount = e.touches.length
  if (touchCount === 2) {
    lastTouchDist = getTouchDist(e.touches)
    lastTouchMid = getTouchMid(e.touches)
  } else if (touchCount === 1) {
    const t0 = e.touches.item(0)
    if (t0) { lastMX = t0.clientX; lastMY = t0.clientY }
  }
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (e.touches.length === 2) {
    const dist = getTouchDist(e.touches)
    const mid = getTouchMid(e.touches)
    const scale = dist / lastTouchDist
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value * scale))
    const rect = containerRef.value!.getBoundingClientRect()
    const cx = mid.x - rect.left - rect.width / 2
    const cy = mid.y - rect.top - rect.height / 2
    const zScale = newZoom / zoom.value
    let nx = cx + (offsetX.value - cx) * zScale
    let ny = cy + (offsetY.value - cy) * zScale
    // also pan by mid-point movement
    nx += mid.x - lastTouchMid.x
    ny += mid.y - lastTouchMid.y
    zoom.value = newZoom
    const clamped = clampOffset(nx, ny, newZoom)
    offsetX.value = clamped.x
    offsetY.value = clamped.y
    lastTouchDist = dist
    lastTouchMid = mid
  } else if (e.touches.length === 1) {
    const t0 = e.touches.item(0)
    if (!t0) return
    const dx = t0.clientX - lastMX
    const dy = t0.clientY - lastMY
    lastMX = t0.clientX
    lastMY = t0.clientY
    const clamped = clampOffset(offsetX.value + dx, offsetY.value + dy, zoom.value)
    offsetX.value = clamped.x
    offsetY.value = clamped.y
  }
}
function onTouchEnd(e: TouchEvent) { touchCount = e.touches.length }

// ── Window resize re-clamp ──────────────────────────────────────────────────
function onResize() {
  const clamped = clampOffset(offsetX.value, offsetY.value, zoom.value)
  offsetX.value = clamped.x
  offsetY.value = clamped.y
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('mouseup', onMouseUp)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('mouseup', onMouseUp)
})

function switchMap(val: 'A' | 'B') {
  activeMap.value = val
}
</script>

<template>
  <div class="page">
    <!-- Floating toggle -->
    <div class="toggle-wrap">
      <button
        class="toggle-btn"
        :class="{ active: activeMap === 'A' }"
        @click="switchMap('A')"
      >Map A</button>
      <button
        class="toggle-btn"
        :class="{ active: activeMap === 'B' }"
        @click="switchMap('B')"
      >Map B</button>
    </div>

    <!-- Map canvas -->
    <div
      ref="containerRef"
      class="map-container"
      @wheel.prevent="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @touchstart.passive="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div
        class="map-inner"
        :style="{
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
        }"
      >
        <img :src="mapSrc" :key="activeMap" class="map-img" draggable="false" />

        <!-- Markers -->
        <div
          v-for="m in markers"
          :key="m.id"
          class="marker"
          :style="{ left: m.x + '%', top: m.y + '%', '--mc': m.color }"
        >
          <span class="marker-dot"></span>
          <span class="marker-label">{{ m.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  background: #0d1117;
}

/* ── Floating toggle ─────────────────────────────────────────────────────── */
.toggle-wrap {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 100;
  display: flex;
  background: rgba(13, 17, 23, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
  backdrop-filter: blur(8px);
}

.toggle-btn {
  padding: 5px 20px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: rgba(230, 237, 243, 0.55);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  font-family: inherit;
}
.toggle-btn.active {
  background: rgba(255, 255, 255, 0.12);
  color: #e6edf3;
}
.toggle-btn:hover:not(.active) {
  color: #e6edf3;
}

/* ── Map container ───────────────────────────────────────────────────────── */
.map-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  cursor: grab;
  user-select: none;
}
.map-container:active { cursor: grabbing; }

.map-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center center;
  will-change: transform;
  /* translate -50%,-50% is baked in via JS offset */
  translate: -50% -50%;
}

.map-img {
  display: block;
  width: 1600px;
  height: 900px;
  pointer-events: none;
  user-select: none;
}

/* ── Markers ─────────────────────────────────────────────────────────────── */
.marker {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: none;
}

.marker-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--mc);
  box-shadow: 0 0 0 3px rgba(255,255,255,0.15), 0 0 12px var(--mc);
}

.marker-label {
  background: rgba(13, 17, 23, 0.85);
  color: var(--mc);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--mc);
  white-space: nowrap;
  text-transform: uppercase;
}
</style>
