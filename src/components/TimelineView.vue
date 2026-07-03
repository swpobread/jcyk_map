<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import eventData from '@/data/events.json'
import scenarioData from '@/data/scenarios.json'
import characterData from '@/data/characters.json'

interface Placement { line: string; date: string }
type CastMember = string | { id: string; note?: string }
interface TimelineEvent {
  title: string
  description?: string
  characters?: CastMember[]
  scenarios?: string[]
  placements: Placement[]
}
interface LineDef { label: string }
interface Scenario {
  title: string; writer?: string; rule?: string; description?: string
  period?: string; characters?: string[]; scenarioLink?: string; backupLink?: string
}
interface Character {
  name: string; original?: string; nickname?: string; era?: string; age?: number
  birth?: string; birthplace?: string; summary?: string; height?: number; description?: string
}

const lineDefs = (eventData.lines ?? {}) as Record<string, LineDef>
const events = (eventData.events ?? {}) as Record<string, TimelineEvent>
const scenarios = scenarioData as Record<string, Scenario>
const characters = characterData as Record<string, Character>
const characterName = (id: string) => characters[id]?.name ?? id
const scenarioTitle = (id: string) => scenarios[id]?.title ?? id

const SLOT_W = 260
const PAD_L = 40
const PAD_R = 40
const MARGIN_Y = 76
const TARGET_PX = 1180

function toDay(s: string): number {
  const [y, m, d] = s.split('.').map((n) => parseInt(n, 10))
  return Date.UTC(y || 1970, (m || 1) - 1, d || 1) / 86400000
}

interface LaidNode {
  key: string; evId: string; lineId: string
  x: number; y: number; isAnchor: boolean
  title: string; date: string; showLabel: boolean
  labelX: number
}
interface LaidLine { id: string; label: string; index: number; x: number; topY: number; bottomY: number }
interface Connector { key: string; x1: number; x2: number; y: number }

type PP = { evId: string; line: string; day: number; isAnchor: boolean; date: string }

const layout = computed(() => {
  const lineIds = Object.keys(lineDefs)
  const lineIndex = new Map<string, number>()
  lineIds.forEach((id, i) => lineIndex.set(id, i))
  const dotX = (id: string) => PAD_L + (lineIndex.get(id) ?? 0) * SLOT_W

  const perLine = new Map<string, PP[]>()
  lineIds.forEach((id) => perLine.set(id, []))
  const anchors: string[] = []
  const anchorDay = new Map<string, Map<string, number>>()

  for (const [evId, ev] of Object.entries(events)) {
    const isAnchor = (ev.placements?.length ?? 0) >= 2
    if (isAnchor) { anchors.push(evId); anchorDay.set(evId, new Map()) }
    for (const p of ev.placements ?? []) {
      const bucket = perLine.get(p.line)
      if (!bucket) continue
      const day = toDay(p.date)
      bucket.push({ evId, line: p.line, day, isAnchor, date: p.date })
      if (isAnchor) anchorDay.get(evId)?.set(p.line, day)
    }
  }
  for (const bucket of perLine.values()) bucket.sort((a, b) => a.day - b.day)

  const adj = new Map<string, Set<string>>()
  const indeg = new Map<string, number>()
  anchors.forEach((a) => { adj.set(a, new Set()); indeg.set(a, 0) })
  for (const id of lineIds) {
    const anchorsOnLine = (perLine.get(id) ?? []).filter((p) => p.isAnchor)
    for (let i = 1; i < anchorsOnLine.length; i++) {
      const from = anchorsOnLine[i - 1]?.evId
      const to = anchorsOnLine[i]?.evId
      if (!from || !to) continue
      const set = adj.get(from)
      if (set && from !== to && !set.has(to)) { set.add(to); indeg.set(to, (indeg.get(to) ?? 0) + 1) }
    }
  }
  const minDay = (a: string) => Math.min(...[...(anchorDay.get(a)?.values() ?? [])])
  const queue = anchors.filter((a) => (indeg.get(a) ?? 0) === 0).sort((a, b) => minDay(a) - minDay(b))
  const order: string[] = []
  while (queue.length) {
    const n = queue.shift() as string
    order.push(n)
    for (const m of adj.get(n) ?? []) {
      const d = (indeg.get(m) ?? 0) - 1
      indeg.set(m, d)
      if (d === 0) queue.push(m)
    }
  }
  for (const a of anchors) if (!order.includes(a)) order.push(a)

  const anchorY = new Map<string, number>()
  order.forEach((id, i) => anchorY.set(id, i))

  const yOf = new Map<string, number>()
  const pkey = (evId: string, line: string) => `${evId}@${line}`

  for (const id of lineIds) {
    const pts = perLine.get(id) ?? []
    if (!pts.length) continue
    const anchorsOnLine = pts.filter((p) => p.isAnchor)

    for (const p of pts) {
      if (p.isAnchor) yOf.set(pkey(p.evId, id), anchorY.get(p.evId) ?? 0)
    }

    const nonAnchors = pts.filter((p) => !p.isAnchor)
    if (!nonAnchors.length) continue

    if (!anchorsOnLine.length) {
      nonAnchors.forEach((p, i) => yOf.set(pkey(p.evId, id), i))
      continue
    }

    const first = anchorsOnLine[0]!
    const last = anchorsOnLine[anchorsOnLine.length - 1]!
    const boundaries = [
      { day: -Infinity, y: (anchorY.get(first.evId) ?? 0) - 1 },
      ...anchorsOnLine.map((p) => ({ day: p.day, y: anchorY.get(p.evId) ?? 0 })),
      { day: Infinity, y: (anchorY.get(last.evId) ?? 0) + 1 },
    ]

    for (let si = 0; si < boundaries.length - 1; si++) {
      const lo = boundaries[si]!
      const hi = boundaries[si + 1]!
      const seg = nonAnchors.filter((p) => p.day > lo.day && p.day < hi.day)
      seg.forEach((p, j) => {
        yOf.set(pkey(p.evId, id), lo.y + ((j + 1) / (seg.length + 1)) * (hi.y - lo.y))
      })
    }
  }

  const allY = [...yOf.values()]
  const minY = allY.length ? Math.min(...allY) : 0
  const maxY = allY.length ? Math.max(...allY) : 1
  const range = maxY - minY || 1
  const S = TARGET_PX / range
  const yPx = (y: number) => MARGIN_Y + (y - minY) * S

  const nodes: LaidNode[] = []
  for (const id of lineIds) {
    for (const p of perLine.get(id) ?? []) {
      const ev = events[p.evId]
      let showLabel = true
      let labelX = dotX(id) + 16
      if (p.isAnchor && ev) {
        const colIdx = (ev.placements ?? []).map((pl) => lineIndex.get(pl.line) ?? -1)
        showLabel = (lineIndex.get(id) ?? -1) === Math.max(...colIdx)
        const colX = (ev.placements ?? []).map((pl) => dotX(pl.line))
        labelX = (Math.min(...colX) + Math.max(...colX)) / 2
      }
      nodes.push({
        key: pkey(p.evId, id), evId: p.evId, lineId: id,
        x: dotX(id), y: yPx(yOf.get(pkey(p.evId, id)) ?? 0),
        isAnchor: p.isAnchor, title: ev?.title ?? p.evId, date: p.date, showLabel, labelX,
      })
    }
  }
  const connectors: Connector[] = anchors.map((a) => {
    const cols = (events[a]?.placements ?? []).map((p) => dotX(p.line))
    return { key: a, x1: Math.min(...cols), x2: Math.max(...cols), y: yPx(anchorY.get(a) ?? 0) }
  })
  const lines: LaidLine[] = lineIds
    .filter((id) => (perLine.get(id) ?? []).length > 0)
    .map((id) => {
      const ys = (perLine.get(id) ?? []).map((p) => yPx(yOf.get(pkey(p.evId, id)) ?? 0))
      return {
        id, label: lineDefs[id]?.label ?? id, index: lineIndex.get(id) ?? 0, x: dotX(id),
        topY: Math.min(...ys), bottomY: Math.max(...ys),
      }
    })

  const width = PAD_L + lineIds.length * SLOT_W + PAD_R
  const height = maxY !== minY ? yPx(maxY) + MARGIN_Y : TARGET_PX
  return { nodes, connectors, lines, width, height }
})

const hoveredLine = ref<string | null>(null)
const pinnedLine = ref<string | null>(null)
const activeLine = computed(() => pinnedLine.value ?? hoveredLine.value)
function togglePin(id: string) { pinnedLine.value = pinnedLine.value === id ? null : id }

const selectedEvId = ref<string | null>(null)
const selectedEv = computed(() => (selectedEvId.value ? events[selectedEvId.value] : undefined))
const evParagraphs = computed(() =>
  (selectedEv.value?.description ?? '').split('\n').map((p) => p.trim()).filter(Boolean))
const evPlacements = computed(() =>
  (selectedEv.value?.placements ?? []).map((p) => ({ label: lineDefs[p.line]?.label ?? p.line, date: p.date })))
const evCast = computed(() =>
  (selectedEv.value?.characters ?? []).map((c) =>
    typeof c === 'string' ? { id: c, note: '' } : { id: c.id, note: c.note ?? '' }))
function openEvent(evId: string) { selectedEvId.value = evId }
function closeEvent() { selectedEvId.value = null }

const selectedCharId = ref<string | null>(null)
const selectedChar = computed(() => (selectedCharId.value ? characters[selectedCharId.value] : undefined))
const charParagraphs = computed(() =>
  (selectedChar.value?.description ?? '').split('\n').map((p) => p.trim()).filter(Boolean))
function openChar(id: string) { selectedCharId.value = id }
function closeChar() { selectedCharId.value = null }

const selectedScId = ref<string | null>(null)
const selectedSc = computed(() => (selectedScId.value ? scenarios[selectedScId.value] : undefined))
const scParagraphs = computed(() =>
  (selectedSc.value?.description ?? '').split('\n').map((p) => p.trim()).filter(Boolean))
function openScenario(id: string) { selectedScId.value = id }
function closeScenario() { selectedScId.value = null }

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (selectedCharId.value) { closeChar(); return }
  if (selectedScId.value) { closeScenario(); return }
  if (selectedEvId.value) { closeEvent() }
}
watch([selectedEvId, selectedCharId, selectedScId], ([a, b, c]) => {
  if (a || b || c) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <main class="timeline">
    <header class="head">
      <RouterLink class="text-btn" to="/">←</RouterLink>
      <h1 class="head-title">타임라인</h1>
      <p class="head-sub">年 表</p>
    </header>

    <div class="scroll">
      <svg
        class="canvas"
        :width="layout.width"
        :height="layout.height"
        :viewBox="`0 0 ${layout.width} ${layout.height}`"
        role="img"
        aria-label="사건 연표"
      >
        <g v-for="ln in layout.lines" :key="ln.id"
           class="line-group"
           :class="{ active: activeLine === ln.id, dim: activeLine && activeLine !== ln.id }"
           @mouseenter="hoveredLine = ln.id"
           @mouseleave="hoveredLine = null"
           @click="togglePin(ln.id)">
          <line class="line-track" :x1="ln.x" :y1="ln.topY" :x2="ln.x" :y2="ln.bottomY" />
          <text class="line-label-tx" :class="{ active: activeLine === ln.id }"
                :x="ln.x - 4" :y="ln.topY - 20">{{ ln.label }}</text>
        </g>

        <line v-for="c in layout.connectors" :key="c.key"
              class="connector" :x1="c.x1" :y1="c.y" :x2="c.x2" :y2="c.y" />

        <g v-for="n in layout.nodes" :key="n.key"
           class="node"
           :class="{ anchor: n.isAnchor, dim: activeLine && activeLine !== n.lineId, hot: activeLine === n.lineId }"
           @mouseenter="hoveredLine = n.lineId"
           @mouseleave="hoveredLine = null"
           @click.stop="openEvent(n.evId)"
           tabindex="0"
           @keydown.enter="openEvent(n.evId)"
           :aria-label="`${n.title} (${n.date})`">
          <circle v-if="n.isAnchor" class="dot dot-anchor-ring" :cx="n.x" :cy="n.y" r="9" />
          <circle class="dot" :class="{ 'dot-anchor': n.isAnchor }" :cx="n.x" :cy="n.y" :r="n.isAnchor ? 4.5 : 6" />
          <template v-if="n.showLabel">
            <text v-if="n.isAnchor" class="node-title anchor-title" :x="n.labelX" :y="n.y - 16"
                  text-anchor="middle">{{ n.title }}</text>
            <template v-else>
              <text class="node-title" :x="n.labelX" :y="n.y - 1">{{ n.title }}</text>
              <text class="node-date" :x="n.labelX" :y="n.y + 13">{{ n.date }}</text>
            </template>
          </template>
        </g>
      </svg>
    </div>
  </main>

  <Transition name="modal">
    <div v-if="selectedEv" class="overlay" @click.self="closeEvent">
      <article class="modal">
        <button class="close-btn" @click="closeEvent" aria-label="닫기">×</button>
        <h2 class="detail-title">{{ selectedEv.title }}</h2>

        <div class="placements">
          <span v-for="(p, i) in evPlacements" :key="i" class="place-chip">
            {{ p.label }} · <span class="place-date">{{ p.date }}</span>
          </span>
        </div>

        <section v-if="evParagraphs.length" class="description">
          <p v-for="(p, i) in evParagraphs" :key="i">{{ p }}</p>
        </section>
        <p v-else class="empty-note">상세 설명이 아직 등록되지 않았습니다.</p>

        <section v-if="evCast.length" class="chips-section">
          <h3 class="group-label">등장인물</h3>
          <ul class="cast">
            <li v-for="c in evCast" :key="c.id" class="cast-row">
              <button class="cast-name" @click="openChar(c.id)">{{ characterName(c.id) }}</button>
              <span v-if="c.note" class="cast-note">{{ c.note }}</span>
            </li>
          </ul>
        </section>

        <section v-if="selectedEv.scenarios?.length" class="chips-section">
          <h3 class="group-label">관련 시나리오</h3>
          <div class="chips">
            <button v-for="(s, i) in selectedEv.scenarios" :key="i" class="chip" @click="openScenario(s)">
              {{ scenarioTitle(s) }}
            </button>
          </div>
        </section>
      </article>
    </div>
  </Transition>

  <Transition name="modal">
    <div v-if="selectedChar" class="overlay overlay--char" @click.self="closeChar">
      <article class="modal">
        <button class="close-btn" @click="closeChar" aria-label="닫기">×</button>
        <p v-if="selectedChar.era" class="rule-tag">{{ selectedChar.era }}s</p>
        <h2 class="detail-title">{{ selectedChar.name }}</h2>
        <p v-if="selectedChar.summary" class="writer">{{ selectedChar.summary }}</p>
        <section v-if="charParagraphs.length" class="description">
          <p v-for="(p, i) in charParagraphs" :key="i">{{ p }}</p>
        </section>
      </article>
    </div>
  </Transition>

  <Transition name="modal">
    <div v-if="selectedSc" class="overlay overlay--char" @click.self="closeScenario">
      <article class="modal">
        <button class="close-btn" @click="closeScenario" aria-label="닫기">×</button>
        <span v-if="selectedSc.rule" class="rule-tag">{{ selectedSc.rule }}</span>
        <h2 class="detail-title">{{ selectedSc.title }}</h2>
        <p v-if="selectedSc.writer" class="writer">{{ selectedSc.writer }}</p>
        <p v-if="selectedSc.period" class="period">{{ selectedSc.period }}</p>
        <div v-if="selectedSc.scenarioLink || selectedSc.backupLink" class="links">
          <a v-if="selectedSc.scenarioLink" class="link-btn" :href="selectedSc.scenarioLink" target="_blank" rel="noopener noreferrer">시나리오</a>
          <a v-if="selectedSc.backupLink" class="link-btn" :href="selectedSc.backupLink" target="_blank" rel="noopener noreferrer">백업</a>
        </div>
        <section v-if="scParagraphs.length" class="description">
          <p v-for="(p, i) in scParagraphs" :key="i">{{ p }}</p>
        </section>
      </article>
    </div>
  </Transition>
</template>

<style scoped>
.timeline {
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--fg);
}
.text-btn {
  border: none; background: transparent; color: #111;
  font-size: 13px; font-weight: 700; cursor: pointer; text-decoration: none; font-family: inherit;
}
.text-btn:hover { color: var(--fg); }

.head { flex: none; padding: 40px 24px 20px; max-width: 960px; width: 100%; margin: 0 auto; box-sizing: border-box; }
.head-title { margin: 12px 0 0; font-size: clamp(28px, 5vw, 40px); font-weight: 800; }
.head-sub { margin: 4px 0 0; font-size: 13px; font-weight: 700; letter-spacing: 0.3em; color: var(--accent); }
.scroll { flex: 1; overflow: auto; padding: 0 24px 48px; }
.canvas { display: block; margin: 0 auto; }

.line-group { cursor: pointer; }
.line-track {
  stroke: rgba(17, 17, 17, 0.22);
  stroke-width: 2;
  stroke-linecap: round;
  transition: stroke 0.18s, stroke-width 0.18s;
}
.line-group:hover .line-track,
.line-group.active .line-track { stroke: #111; stroke-width: 2.5; }
.line-group.dim .line-track { stroke: rgba(17, 17, 17, 0.12); }
.line-label-tx {
  fill: rgba(17, 17, 17, 0.5);
  font-size: 14px; font-weight: 800; letter-spacing: 0.02em;
  transition: fill 0.18s;
}
.line-group:hover .line-label-tx,
.line-label-tx.active { fill: #111; }
.line-group.dim .line-label-tx { fill: rgba(17, 17, 17, 0.28); }

.connector {
  stroke: rgba(17, 17, 17, 0.5);
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
}

.node { cursor: pointer; outline: none; }
.dot {
  fill: var(--bg);
  stroke: #111;
  stroke-width: 2;
  transition: fill 0.15s, stroke 0.15s;
}
.dot-anchor { fill: #111; }
.dot-anchor-ring { fill: none; stroke: #111; stroke-width: 1.5; }
.node:hover .dot { fill: #111; }
.node:hover .dot-anchor { fill: var(--bg); }
.node:focus-visible .dot { stroke-width: 3; }
.node.dim { opacity: 0.32; }
.node-title {
  font-size: 13px; font-weight: 600; fill: rgba(17, 17, 17, 0.62);
  dominant-baseline: middle; transition: fill 0.15s;
}
.node.hot .node-title { fill: #111; font-weight: 700; }
.node-date {
  font-size: 11px; fill: var(--fg-muted);
  dominant-baseline: middle; font-variant-numeric: tabular-nums;
}

.overlay {
  position: fixed; inset: 0; z-index: 500;
  display: flex; align-items: center; justify-content: center;
  padding: 48px 20px; overflow-y: auto;
  background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
}
.overlay--char { z-index: 600; }
.modal {
  position: relative; width: 100%; max-width: 620px;
  max-height: calc(100dvh - 96px); overflow-y: auto; box-sizing: border-box;
  padding: 32px 28px; border: 1px solid var(--border-mid); border-radius: 14px;
  background: var(--bg-panel); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}
.close-btn {
  position: absolute; top: 16px; right: 16px; width: 32px; height: 32px;
  border: none; border-radius: 7px;
  background: color-mix(in srgb, var(--fg) 8%, transparent);
  color: var(--fg-dim); font-size: 20px; line-height: 1; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.close-btn:hover { background: color-mix(in srgb, var(--fg) 16%, transparent); color: var(--fg); }
.detail-title {
  margin: 8px 0 0; font-size: 24px; font-weight: 800;
  border-left: 3px solid var(--accent); padding-left: 12px; padding-right: 24px;
}
.placements { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.place-chip {
  font-size: 12px; font-weight: 700; padding: 5px 11px;
  border: 1px solid var(--border-mid); border-radius: 999px; color: var(--fg);
}
.place-date { font-variant-numeric: tabular-nums; color: var(--fg-dim); font-weight: 600; }
.rule-tag { display: inline-block; font-size: 11px; font-weight: 600; color: var(--fg-muted); }
.writer { margin: 8px 0 0; font-size: 13px; color: #111; }
.period { margin: 6px 0 0; font-size: 13px; color: #111; font-variant-numeric: tabular-nums; }
.links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.link-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;
  border: 1px solid var(--border-mid); border-radius: 999px; background: var(--surface, transparent);
  color: var(--fg-dim); font-size: 12px; font-weight: 700; text-decoration: none;
}
.link-btn:hover { background: color-mix(in srgb, var(--fg) 8%, transparent); }
.description { margin-top: 24px; font-size: 15px; line-height: 1.8; }
.description p { margin: 0 0 12px; }
.empty-note { margin-top: 24px; font-size: 14px; color: var(--fg-muted); font-style: italic; }
.chips-section { margin-top: 24px; }
.group-label {
  margin: 0 0 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.06em;
  color: var(--fg-muted); text-transform: uppercase;
}
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  padding: 5px 11px; border: 1px solid var(--border-mid); border-radius: 999px;
  background: transparent; color: var(--fg); font-size: 12px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: background 0.15s, color 0.15s;
}
.chip:hover { background: color-mix(in srgb, var(--fg) 8%, transparent); }
.chip--link { background: #111; color: #f5f2ec; border-color: #111; }
.chip--link:hover { background: #f5f2ec; color: #111; }

.cast { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.cast-row { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.cast-name {
  flex: none; padding: 4px 11px; border: 1px solid #111; border-radius: 999px;
  background: #111; color: #f5f2ec; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: background 0.15s, color 0.15s;
}
.cast-name:hover { background: #f5f2ec; color: #111; }
.cast-note { flex: 1; min-width: 180px; font-size: 14px; line-height: 1.6; color: var(--fg); }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform 0.2s ease; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(12px); }

@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
