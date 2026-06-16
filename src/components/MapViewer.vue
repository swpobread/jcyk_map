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

const ZOOM_TOLERANCE = 1.5

const activeMap = ref<'1920' | '2020'>('1920')

const mapW = ref(1)
const mapH = ref(1)

const minZoom = ref(1)
const maxZoom = ref(1)
const zoom = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
let initialized = false

const base = import.meta.env.BASE_URL
const mapSrc = computed(() => base + (activeMap.value === '1920' ? '/1920.jpg' : '/2020.jpg'))

const allMarkers: Record<'1920' | '2020', Marker[]> = markerData
const markers = computed<Marker[]>(() => allMarkers[activeMap.value])

// --- 좌표 픽커 (개발 모드 전용) ---
const EDIT_MODE_AVAILABLE = import.meta.env.DEV
const editMode = ref(false)
const picked = ref<{ x: number; y: number } | null>(null)

const nextId = computed(() => {
  const ids = markers.value.map((m) => m.id)
  return ids.length ? Math.max(...ids) + 1 : 1
})
const pickedJson = computed(() => {
  if (!picked.value) return ''
  return JSON.stringify(
    {
      id: nextId.value,
      x: Math.round(picked.value.x * 10) / 10,
      y: Math.round(picked.value.y * 10) / 10,
      label: '',
      color: '#58a6ff',
      tags: [],
    },
    null,
    2
  )
})

const containerRef = ref<HTMLDivElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)

const innerStyle = computed(() => ({
  width: mapW.value + 'px',
  height: mapH.value + 'px',
  marginLeft: -mapW.value / 2 + 'px',
  marginTop: -mapH.value / 2 + 'px',
  transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${zoom.value})`,
}))

function markerStyle(m: Marker) {
  const localX = (m.x / 100 - 0.5) * mapW.value
  const localY = (m.y / 100 - 0.5) * mapH.value
  return {
    left: `calc(50% + ${localX * zoom.value + offsetX.value}px)`,
    top: `calc(50% + ${localY * zoom.value + offsetY.value}px)`,
    '--mc': m.color,
  }
}

function computeMinZoom() {
  const cw = containerRef.value?.clientWidth ?? window.innerWidth
  const ch = containerRef.value?.clientHeight ?? window.innerHeight
  return Math.max(cw / mapW.value, ch / mapH.value) * 1.02
}

function computeMaxZoom() {
  const dpr = window.devicePixelRatio || 1
  return Math.max(minZoom.value, (1 / dpr) * ZOOM_TOLERANCE)
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
  const newZoom = Math.min(maxZoom.value, Math.max(minZoom.value, newZoomRaw))
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
let downX = 0,
  downY = 0
let dragMoved = false
function onMouseDown(e: MouseEvent) {
  dragging = true
  lastMX = e.clientX
  lastMY = e.clientY
  downX = e.clientX
  downY = e.clientY
  dragMoved = false
}
function onMouseMove(e: MouseEvent) {
  if (!dragging) return
  const dx = e.clientX - lastMX
  const dy = e.clientY - lastMY
  lastMX = e.clientX
  lastMY = e.clientY
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 4) dragMoved = true
  const c = clampOffset(offsetX.value + dx, offsetY.value + dy, zoom.value)
  offsetX.value = c.x
  offsetY.value = c.y
}

function onMapClick(e: MouseEvent) {
  if (!EDIT_MODE_AVAILABLE || !editMode.value) return
  if (dragMoved) return
  const img = imgRef.value
  if (!img) return
  const rect = img.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  picked.value = { x, y }
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
  maxZoom.value = computeMaxZoom()
  if (resetZoom || zoom.value < minZoom.value) {
    zoom.value = minZoom.value
    offsetX.value = 0
    offsetY.value = 0
  } else if (zoom.value > maxZoom.value) {
    zoom.value = maxZoom.value
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

    <button
      v-if="EDIT_MODE_AVAILABLE"
      class="edit-toggle"
      :class="{ on: editMode }"
      @click="editMode = !editMode"
    >
      {{ editMode ? '편집 ON' : '편집 OFF' }}
    </button>

    <div v-if="EDIT_MODE_AVAILABLE && editMode && picked" class="pick-panel">
      <div class="pick-coord">x: {{ picked.x.toFixed(1) }}% · y: {{ picked.y.toFixed(1) }}%</div>
      <pre class="pick-json">{{ pickedJson }}</pre>
    </div>

    <div
      ref="containerRef"
      class="map-container"
      @wheel.prevent="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @click="onMapClick"
      :class="{ picking: EDIT_MODE_AVAILABLE && editMode }"
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
      </div>

      <div class="marker-layer">
        <div
          v-for="m in markers"
          :key="m.id"
          class="marker"
          :style="markerStyle(m)"
        >
          <span class="marker-dot">
            <span class="marker-label">{{ m.label }}</span>
          </span>
        </div>

        <div
          v-if="EDIT_MODE_AVAILABLE && editMode && picked"
          class="marker pick-preview"
          :style="{ left: picked.x + '%', top: picked.y + '%', '--iz': 1 / zoom }"
        >
          <span class="marker-dot"></span>
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

.marker-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

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
  position: relative;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--mc);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.15), 0 0 12px var(--mc);
  /* re-enable pointer events on the dot so it can be hovered (map drag still works elsewhere) */
  pointer-events: auto;
  cursor: pointer;
}
.marker-label {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
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
  /* hidden by default, shown on hover */
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}
.marker-dot:hover .marker-label {
  opacity: 1;
}

/* --- 좌표 픽커 UI (개발 모드 전용) --- */
.map-container.picking {
  cursor: crosshair;
}
.edit-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 100;
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: rgba(13, 17, 23, 0.82);
  color: rgba(230, 237, 243, 0.7);
  font: 600 13px inherit;
  font-family: inherit;
  cursor: pointer;
  backdrop-filter: blur(8px);
}
.edit-toggle.on {
  background: #58a6ff;
  color: #0d1117;
  border-color: #58a6ff;
}
.pick-panel {
  position: absolute;
  top: 56px;
  right: 12px;
  z-index: 100;
  width: 220px;
  padding: 10px 12px;
  background: rgba(13, 17, 23, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  backdrop-filter: blur(8px);
  color: #e6edf3;
}
.pick-coord {
  font-size: 12px;
  font-weight: 700;
  color: #58a6ff;
  margin-bottom: 6px;
}
.pick-json {
  margin: 0 0 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 5px;
  font-size: 11px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
  user-select: all;
}
.pick-preview .marker-dot {
  background: #fff;
  box-shadow: 0 0 0 3px #58a6ff, 0 0 12px #58a6ff;
  pointer-events: none;
}
</style>