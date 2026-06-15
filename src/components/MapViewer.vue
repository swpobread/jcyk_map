<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import markerData from '@/data/markers.json'

interface Marker {
  id: number
  x: number
  y: number
  label: string
  color: string
  tags: string[]
}

const MAX_ZOOM = 6

const activeMap = ref<'1920' | '2020'>('1920')

const mapW = ref(1)
const mapH = ref(1)

const minZoom = ref(1)
const zoom = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
let initialized = false

const base = import.meta.env.BASE_URL
const mapSrc = computed(() => base + (activeMap.value === '1920' ? '/1920.jpg' : '/2020.jpg'))

const allMarkers: Record<'1920' | '2020', Marker[]> = markerData
const markers = computed<Marker[]>(() => allMarkers[activeMap.value])

const containerRef = ref<HTMLDivElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)

const innerStyle = computed(() => ({
  width: mapW.value + 'px',
  height: mapH.value + 'px',
  marginLeft: -mapW.value / 2 + 'px',
  marginTop: -mapH.value / 2 + 'px',
  transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${zoom.value})`,
}))

function computeMinZoom() {
  const cw = containerRef.value?.clientWidth ?? window.innerWidth
  const ch = containerRef.value?.clientHeight ?? window.innerHeight
  return Math.max(cw / mapW.value, ch / mapH.value) * 1.02
}

function clampOffset(x: number, y: number, z: number) {
  const cw = containerRef.value?.clientWidth ?? window.innerWidth
  const ch = containerRef.value?.clientHeight ?? window.innerHeight
  const maxX = Math.max(0, (mapW.value * z - cw) / 2)
  const maxY = Math.max(0, (mapH.value * z - ch) / 2)
  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y)),
  }
}

function applyZoom(newZoomRaw: number, cx: number, cy: number) {
  const newZoom = Math.min(MAX_ZOOM, Math.max(minZoom.value, newZoomRaw))
  const scale = newZoom / zoom.value
  const nx = cx + (offsetX.value - cx) * scale
  const ny = cy + (offsetY.value - cy) * scale
  zoom.value = newZoom
  const c = clampOffset(nx, ny, newZoom)
  offsetX.value = c.x
  offsetY.value = c.y
}

function onImgLoad() {
  const img = imgRef.value
  if (!img) return
  mapW.value = img.naturalWidth || 1
  mapH.value = img.naturalHeight || 1
  if (!initialized) {
    refresh(true)
    initialized = true
  } else {
    refresh(false)
  }
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const rect = containerRef.value!.getBoundingClientRect()
  const cx = e.clientX - rect.left - rect.width / 2
  const cy = e.clientY - rect.top - rect.height / 2
  applyZoom(zoom.value * (e.deltaY < 0 ? 1.1 : 0.9), cx, cy)
}

let dragging = false
let lastMX = 0,
  lastMY = 0
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
  const c = clampOffset(offsetX.value + dx, offsetY.value + dy, zoom.value)
  offsetX.value = c.x
  offsetY.value = c.y
}
function onMouseUp() {
  dragging = false
}

let lastTouchDist = 0
let lastTouchMid = { x: 0, y: 0 }
let touchCount = 0
function getTouchDist(t: TouchList) {
  const a = t.item(0)!,
    b = t.item(1)!
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}
function getTouchMid(t: TouchList) {
  const a = t.item(0)!,
    b = t.item(1)!
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
}
function onTouchStart(e: TouchEvent) {
  touchCount = e.touches.length
  if (touchCount === 2) {
    lastTouchDist = getTouchDist(e.touches)
    lastTouchMid = getTouchMid(e.touches)
  } else if (touchCount === 1) {
    const t0 = e.touches.item(0)
    if (t0) {
      lastMX = t0.clientX
      lastMY = t0.clientY
    }
  }
}
function onTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (e.touches.length === 2) {
    const dist = getTouchDist(e.touches)
    const mid = getTouchMid(e.touches)
    const rect = containerRef.value!.getBoundingClientRect()
    const cx = mid.x - rect.left - rect.width / 2
    const cy = mid.y - rect.top - rect.height / 2
    applyZoom(zoom.value * (dist / lastTouchDist), cx, cy)
    const c = clampOffset(
      offsetX.value + (mid.x - lastTouchMid.x),
      offsetY.value + (mid.y - lastTouchMid.y),
      zoom.value
    )
    offsetX.value = c.x
    offsetY.value = c.y
    lastTouchDist = dist
    lastTouchMid = mid
  } else if (e.touches.length === 1) {
    const t0 = e.touches.item(0)
    if (!t0) return
    const dx = t0.clientX - lastMX
    const dy = t0.clientY - lastMY
    lastMX = t0.clientX
    lastMY = t0.clientY
    const c = clampOffset(offsetX.value + dx, offsetY.value + dy, zoom.value)
    offsetX.value = c.x
    offsetY.value = c.y
  }
}
function onTouchEnd(e: TouchEvent) {
  touchCount = e.touches.length
}

function refresh(resetZoom = false) {
  minZoom.value = computeMinZoom()
  if (resetZoom || zoom.value < minZoom.value) {
    zoom.value = minZoom.value
    offsetX.value = 0
    offsetY.value = 0
  }
  const c = clampOffset(offsetX.value, offsetY.value, zoom.value)
  offsetX.value = c.x
  offsetY.value = c.y
}

function onResize() {
  refresh()
}

onMounted(() => {
  nextTick(() => {
    const img = imgRef.value
    if (img && img.complete && img.naturalWidth) onImgLoad()
  })
  window.addEventListener('resize', onResize)
  window.addEventListener('mouseup', onMouseUp)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('mouseup', onMouseUp)
})

function switchMap(val: '1920' | '2020') {
  activeMap.value = val
}
</script>

<template>
  <div class="page">
    <div class="toggle-wrap">
      <button
        class="toggle-btn"
        :class="{ active: activeMap === '1920' }"
        @click="switchMap('1920')"
      >
        1920年
      </button>
      <button
        class="toggle-btn"
        :class="{ active: activeMap === '2020' }"
        @click="switchMap('2020')"
      >
        2020s
      </button>
    </div>

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
      <div class="map-inner" :style="innerStyle">
        <img
          ref="imgRef"
          :src="mapSrc"
          :key="activeMap"
          class="map-img"
          draggable="false"
          @load="onImgLoad"
        />

        <div
          v-for="m in markers"
          :key="m.id"
          class="marker"
          :style="{ left: m.x + '%', top: m.y + '%', '--mc': m.color, '--iz': 1 / zoom }"
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

.map-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  cursor: grab;
  user-select: none;
}
.map-container:active {
  cursor: grabbing;
}

.map-inner {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: center center;
  will-change: transform;
}

.map-img {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}

.marker {
  position: absolute;
  /* counter-scale by 1/zoom so marker size stays constant regardless of map zoom */
  transform: translate(-50%, -50%) scale(var(--iz, 1));
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
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.15), 0 0 12px var(--mc);
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