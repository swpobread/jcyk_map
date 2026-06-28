<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import OpenSeadragon from 'openseadragon'
import type { Filter, Category, Marker } from '@/types'
import markerData from '@/data/markers.json'
import categoryData from '@/data/categories.json'
import SidePanel from './SidePanel.vue'

const categories = categoryData as Record<string, Category>
const baseUrl = import.meta.env.BASE_URL + '/'
const router = useRouter()

const activeMap = ref<'1920' | '2020'>('1920')
const allMarkers = markerData as Record<'1920' | '2020', Marker[]>
const currentMarkers = computed<Marker[]>(() => allMarkers[activeMap.value])

const panelOpen = ref(false)
const panelView = ref<'list' | 'detail' | 'scenario'>('list')
const selectedMarker = ref<Marker | null>(null)
const selectedScenario = ref<string | null>(null)
const activeFilter = ref<Filter | null>(null)

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
  if (panelOpen.value && panelView.value === 'list') { panelOpen.value = false }
  else { panelView.value = 'list'; panelOpen.value = true }
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
function backToList() { resetSelection() }
function closePanel() { panelOpen.value = false }
function setFilter(f: Filter | null) {
  activeFilter.value = f
  resetSelection()
  panelOpen.value = true
}

// --- OpenSeadragon ---
const viewerEl = ref<HTMLDivElement | null>(null)
let viewer: OpenSeadragon.Viewer | null = null
const markerSrc = `${baseUrl}map_marker.svg`

// CSS 변수에서 색을 읽어옴 (main.css 단일 출처)
function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function dziUrl(map: '1920' | '2020') {
  return `${baseUrl}tiles/${map}.dzi`
}

function enforceMinZoom() {
  if (!viewer || viewer.world.getItemCount() === 0) return
  const vp = viewer.viewport as OpenSeadragon.Viewport & { minZoomLevel: number }
  const img = viewer.world.getItemAt(0).getContentSize()
  const con = vp.getContainerSize()
  const minZoom = Math.max(1.0, (con.y * img.x) / (con.x * img.y))
  vp.minZoomLevel = minZoom
  if (vp.getZoom() < minZoom) vp.zoomTo(minZoom, undefined, true)
}

function toViewportPoint(xPct: number, yPct: number): OpenSeadragon.Point | null {
  if (!viewer || viewer.world.getItemCount() === 0) return null
  const item = viewer.world.getItemAt(0)
  const size = item.getContentSize()
  return item.imageToViewportCoordinates(
    new OpenSeadragon.Point((xPct / 100) * size.x, (yPct / 100) * size.y)
  )
}

// overlay 요소 추적 (removeOverlay용)
const overlayEls: HTMLElement[] = []

function clearOverlays() {
  if (!viewer) return
  overlayEls.forEach((el) => { try { viewer!.removeOverlay(el) } catch { /**/ } })
  overlayEls.length = 0
}

function renderOverlays() {
  if (!viewer) return
  clearOverlays()

  const accent = cssVar('--accent') || '#58a6ff'
  const labelBg = cssVar('--bg-panel') || 'rgba(13,17,23,0.85)'

  markers.value.forEach((m) => {
    const pt = toViewportPoint(m.x, m.y)
    if (!pt) return

    const color = categories[m.category]?.color ?? accent
    const isSelected = selectedMarker.value?.id === m.id

    // wrap: 크기 0, OSD가 이 점을 viewport 좌표에 배치
    const wrap = document.createElement('div')
    wrap.style.cssText = `width:0;height:0;overflow:visible;position:absolute;`

    // dot: 마커 아이콘 (하단 중앙이 wrap 기준점에 오도록)
    const dot = document.createElement('div')
    dot.style.cssText = `
      position: absolute;
      left: -12px;
      top: -30px;
      width: 24px;
      height: 30px;
      background: ${color};
      -webkit-mask: url(${markerSrc}) no-repeat center / contain;
      mask: url(${markerSrc}) no-repeat center / contain;
      cursor: pointer;
      filter: ${isSelected ? `drop-shadow(0 0 6px ${color})` : 'none'};
    `

    // label: dot 아래에 표시
    const label = document.createElement('span')
    label.style.cssText = `
      position: absolute;
      top: 4px;
      left: 50%;
      transform: translateX(-50%);
      background: ${labelBg};
      color: ${color};
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid ${color};
      white-space: nowrap;
      text-transform: uppercase;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s;
      user-select: none;
    `
    label.textContent = m.label

    dot.addEventListener('mouseenter', () => { label.style.opacity = '1' })
    dot.addEventListener('mouseleave', () => { label.style.opacity = '0' })
    dot.addEventListener('pointerdown', (e) => { e.stopPropagation(); selectMarker(m) })

    wrap.appendChild(dot)
    wrap.appendChild(label)

    // placement: CENTER → wrap의 중심(= 크기 0이므로 wrap 자체)이 pt에 맞춰짐
    // wrap이 크기 0이므로 dot을 left:-12px, top:-30px으로 올리면
    // 마커 하단 중앙이 정확히 pt에 위치
    viewer!.addOverlay({ element: wrap, location: pt, placement: OpenSeadragon.Placement.CENTER })
    overlayEls.push(wrap)
  })
}

let savedZoom: number | null = null
let savedCenter: OpenSeadragon.Point | null = null

function switchMap(val: '1920' | '2020') {
  if (viewer && viewer.world.getItemCount() > 0) {
    savedZoom = viewer.viewport.getZoom()
    savedCenter = viewer.viewport.getCenter()
  }
  activeMap.value = val
  activeFilter.value = null
  picked.value = null
  resetSelection()
  viewer?.open({ tileSource: dziUrl(val) })
}

// --- 좌표 픽커 (개발 모드 전용) ---
const EDIT_MODE_AVAILABLE = import.meta.env.DEV
const editMode = ref(false)
const picked = ref<{ x: number; y: number } | null>(null)
let pickPreviewEl: HTMLElement | null = null

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
  return JSON.stringify({
    id: nextId.value,
    x: Math.round(picked.value.x * 10) / 10,
    y: Math.round(picked.value.y * 10) / 10,
    label: '', category: 'cat1', isReal: true, tags: [], scenarios: [],
  }, null, 2)
})

function renderPickPreview() {
  if (pickPreviewEl) { try { viewer?.removeOverlay(pickPreviewEl) } catch { /**/ }; pickPreviewEl = null }
  if (!EDIT_MODE_AVAILABLE || !editMode.value || !picked.value || !viewer) return
  const pt = toViewportPoint(picked.value.x, picked.value.y)
  if (!pt) return

  const wrap = document.createElement('div')
  wrap.style.cssText = 'width:0;height:0;overflow:visible;position:absolute;'
  const dot = document.createElement('div')
  dot.style.cssText = `
    position: absolute;
    left: -12px; top: -30px;
    width: 24px; height: 30px;
    background: #fff;
    -webkit-mask: url(${markerSrc}) no-repeat center / contain;
    mask: url(${markerSrc}) no-repeat center / contain;
    pointer-events: none;
  `
  wrap.appendChild(dot)
  viewer.addOverlay({ element: wrap, location: pt, placement: OpenSeadragon.Placement.CENTER })
  pickPreviewEl = wrap
}

function onViewerClick(e: OpenSeadragon.CanvasClickEvent) {
  if (!EDIT_MODE_AVAILABLE || !editMode.value || !viewer) return
  if (!e.quick) return
  const vp = viewer.viewport.pointFromPixel(e.position)
  const item = viewer.world.getItemAt(0)
  const ip = item.viewportToImageCoordinates(vp)
  const size = item.getContentSize()
  picked.value = { x: (ip.x / size.x) * 100, y: (ip.y / size.y) * 100 }
  renderPickPreview()
}

watch(editMode, () => renderPickPreview())
watch([markers, selectedMarker], () => {
  if (viewer?.world.getItemCount()) renderOverlays()
})

onMounted(() => {
  viewer = OpenSeadragon({
    element: viewerEl.value!,
    prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/',
    tileSources: dziUrl(activeMap.value),
    showNavigationControl: false,
    gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
    gestureSettingsTouch: { clickToZoom: false, dblClickToZoom: true },
    visibilityRatio: 1,
    constrainDuringPan: true,
    maxZoomPixelRatio: 2,
    minZoomImageRatio: 0.1,
    animationTime: 0.4,
    springStiffness: 8,
  })

  viewer.addHandler('open', () => {
    nextTick(() => {
      enforceMinZoom()
      if (savedZoom !== null && savedCenter !== null) {
        const minZ = (viewer!.viewport as OpenSeadragon.Viewport & { minZoomLevel?: number }).minZoomLevel ?? 0
        viewer!.viewport.zoomTo(Math.max(savedZoom, minZ), undefined, true)
        viewer!.viewport.panTo(savedCenter, true)
        savedZoom = null
        savedCenter = null
      }
      renderOverlays()
    })
  })

  viewer.addHandler('resize', () => enforceMinZoom())
  viewer.addHandler('canvas-click', onViewerClick)
})

onUnmounted(() => {
  viewer?.destroy()
  viewer = null
})
</script>

<template>
  <div class="page">
    <button class="back-btn" @click="router.push('/')" aria-label="메인으로">←</button>
    <button class="menu-btn" :class="{ on: panelOpen }" @click="openMenu" aria-label="메뉴">☰</button>

    <div class="toggle-wrap">
      <button class="toggle-btn" :class="{ active: activeMap === '1920' }" @click="switchMap('1920')">
        1920年
      </button>
      <button class="toggle-btn" :class="{ active: activeMap === '2020' }" @click="switchMap('2020')">
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
      ref="viewerEl"
      class="map-container"
      :class="{ picking: EDIT_MODE_AVAILABLE && editMode }"
    ></div>

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
.back-btn {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 100;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: #111;
  color: rgba(245, 242, 236, 0.6);
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.back-btn:hover { color: #f5f2ec; background: #1e1e1e; }

.menu-btn {
  position: absolute;
  top: 12px;
  left: 58px;
  z-index: 100;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: #111;
  color: rgba(245, 242, 236, 0.6);
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.menu-btn:hover { color: #f5f2ec; background: #1e1e1e; }
.menu-btn.on { color: #f5f2ec; background: #222; }

.toggle-wrap {
  position: absolute;
  top: 12px;
  left: 104px;
  z-index: 100;
  display: flex;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}
.toggle-btn {
  padding: 5px 20px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: rgba(245, 242, 236, 0.42);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  font-family: inherit;
}
.toggle-btn.active { background: rgba(255, 255, 255, 0.14); color: #f5f2ec; }
.toggle-btn:hover:not(.active) { color: #f5f2ec; }

.map-container {
  position: absolute;
  inset: 0;
  background: var(--bg);
}
.map-container.picking :deep(.openseadragon-canvas) {
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
  color: var(--fg-muted);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}
.edit-toggle.on { color: var(--fg); }
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
</style>