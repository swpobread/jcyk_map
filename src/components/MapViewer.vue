<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import type { Filter, Category, Marker } from '@/types'
import markerData from '@/data/markers.json'
import categoryData from '@/data/categories.json'
import SidePanel from './SidePanel.vue'

const categories = categoryData as Record<string, Category>

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

const allMarkers = markerData as Record<'1920' | '2020', Marker[]>
const currentMarkers = computed<Marker[]>(() => allMarkers[activeMap.value])

// --- 좌측 패널 + 필터 상태 ---
const panelOpen = ref(false)
const panelView = ref<'list' | 'detail' | 'scenario'>('list')
const selectedMarker = ref<Marker | null>(null)
const selectedScenario = ref<string | null>(null)
const activeFilter = ref<Filter | null>(null)

// 지도에 표시되는 마커: 필터 매칭 안 되면 숨김
const markers = computed<Marker[]>(() => {
  const list = currentMarkers.value
  const f = activeFilter.value
  if (!f) return list
  return list.filter((m) =>
    f.type === 'category'
      ? m.category === f.value
      : f.type === 'tag'
        ? m.tags.includes(f.value)
        : m.scenarios.includes(f.value)
  )
})

function resetSelection() {
  selectedMarker.value = null
  selectedScenario.value = null
  panelView.value = 'list'
}
function openMenu() {
  if (panelOpen.value && panelView.value === 'list') {
    panelOpen.value = false
  } else {
    panelView.value = 'list'
    panelOpen.value = true
  }
}
function selectMarker(m: Marker) {
  selectedMarker.value = m
  panelView.value = 'detail'
  panelOpen.value = true
}
function openScenario(sid: string) {
  selectedScenario.value = sid
  panelView.value = 'scenario'
  panelOpen.value = true
}
function backToList() {
  resetSelection()
}
function closePanel() {
  panelOpen.value = false
}
function setFilter(f: Filter | null) {
  activeFilter.value = f
  resetSelection()
  panelOpen.value = true
}

// --- 좌표 픽커 (개발 모드 전용) ---
const EDIT_MODE_AVAILABLE = import.meta.env.DEV
const editMode = ref(false)
const picked = ref<{ x: number; y: number } | null>(null)

const nextId = computed(() => {
  const prefix = activeMap.value
  const nums = currentMarkers.value
    .map((m) => Number(m.id.split('-')[1]))
    .filter((n) => !Number.isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `${prefix}-${next}`
})
const pickedJson = computed(() => {
  if (!picked.value) return ''
  return JSON.stringify(
    {
      id: nextId.value,
      x: Math.round(picked.value.x * 10) / 10,
      y: Math.round(picked.value.y * 10) / 10,
      label: '',
      category: 'cat1',
      isReal: true,
      tags: [],
      scenarios: [],
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

function pointStyle(xPct: number, yPct: number) {
  const localX = (xPct / 100 - 0.5) * mapW.value
  const localY = (yPct / 100 - 0.5) * mapH.value
  return {
    left: `calc(50% + ${localX * zoom.value + offsetX.value}px)`,
    top: `calc(50% + ${localY * zoom.value + offsetY.value}px)`,
  }
}

function markerStyle(m: Marker) {
  return { ...pointStyle(m.x, m.y), '--mc': categories[m.category]?.color ?? '#58a6ff' }
}

const pickPreviewStyle = computed(() =>
  picked.value ? pointStyle(picked.value.x, picked.value.y) : {}
)

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
  activeFilter.value = null
  resetSelection()
}
</script>

<template>
  <div class="page">
    <button class="menu-btn" :class="{ on: panelOpen }" @click="openMenu" aria-label="메뉴">☰</button>

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

    <pre v-if="EDIT_MODE_AVAILABLE && editMode && picked" class="pick-json">{{ pickedJson }}</pre>

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
          <span
            class="marker-dot"
            :class="{ selected: selectedMarker?.id === m.id }"
            @click.stop="selectMarker(m)"
          >
            <span class="marker-label">{{ m.label }}</span>
          </span>
        </div>

        <div
          v-if="EDIT_MODE_AVAILABLE && editMode && picked"
          class="marker pick-preview"
          :style="pickPreviewStyle"
        >
          <span class="marker-dot"></span>
        </div>
      </div>
    </div>

    <SidePanel
      :open="panelOpen"
      :view="panelView"
      :marker="selectedMarker"
      :scenario-id="selectedScenario"
      :markers="currentMarkers"
      :active-filter="activeFilter"
      @close="closePanel"
      @back="backToList"
      @open-scenario="openScenario"
      @set-filter="setFilter"
    />
  </div>
</template>

<style scoped>
.page {
  position: relative;
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  background: var(--bg);
}

.menu-btn {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 100;
  width: 38px;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-blur);
  color: rgba(230, 237, 243, 0.7);
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: color 0.15s, background 0.15s;
}
.menu-btn:hover {
  color: var(--fg);
}
.menu-btn.on {
  color: var(--fg);
  background: var(--surface-strong);
}

.toggle-wrap {
  position: absolute;
  top: 12px;
  left: 58px;
  z-index: 100;
  display: flex;
  background: var(--bg-blur);
  border: 1px solid var(--border);
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
  background: var(--surface-strong);
  color: var(--fg);
}
.toggle-btn:hover:not(.active) {
  color: var(--fg);
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
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}
.marker-dot:hover .marker-label {
  opacity: 1;
}
.marker-dot.selected {
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.35), 0 0 16px var(--mc);
}
.marker-dot.selected .marker-label {
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
  width: 80px;
  padding: 9px 0;
  border: transparent;
  border-radius: 8px;
  background: var(--bg-blur);
  color: rgba(230, 237, 243, 0.55);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}
.edit-toggle.on {
  color: var(--fg);
}
.pick-json {
  position: absolute;
  top: 44px;
  right: 12px;
  z-index: 100;
  padding: 8px;
  background: rgba(0, 0, 0, 0.7);
  white-space: pre;
  user-select: all;
}
.pick-preview .marker-dot {
  background: #fff;
  pointer-events: none;
}
</style>