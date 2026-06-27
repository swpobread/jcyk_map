<script setup lang="ts">
import { computed } from 'vue'
import type { Filter, Category, Marker } from '@/types'
import detailData from '@/data/details.json'
import scenarioData from '@/data/scenarios.json'
import tagData from '@/data/tags.json'
import categoryData from '@/data/categories.json'

interface DetailImage {
  src: string
  caption?: string
}
interface Detail {
  name: string
  summary?: string
  description?: string
  image?: DetailImage
}
interface Scenario {
  title: string
  writer?: string
  description?: string
  period?: string
  characters?: string[]
  scenarioLink?: string
  backupLink?: string
  image?: DetailImage
  rule?: string
}
interface Tag {
  label: string
  description?: string
}

const props = defineProps<{
  open: boolean
  view: 'list' | 'detail' | 'scenario'
  marker: Marker | null
  scenarioId: string | null
  markers: Marker[]
  activeFilter: Filter | null
}>()
const emit = defineEmits<{
  close: []
  back: []
  openScenario: [string]
  setFilter: [Filter | null]
}>()

const details = detailData as Record<string, Detail>
const scenarios = scenarioData as Record<string, Scenario>
const tags = tagData as Record<string, Tag>
const categories = categoryData as Record<string, Category>

const base = import.meta.env.BASE_URL
const resolveImg = (src: string) => (src.startsWith('http') ? src : base + src)
const splitParagraphs = (text?: string) =>
  (text ?? '')
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)

/* ---------- 목록 뷰 ---------- */
const scenarioEntries = computed(() =>
  Object.entries(scenarios).map(([id, s]) => ({
    id, ...s, count: props.markers.filter((m) => m.scenarios.includes(id)).length
  }))
)
const tagEntries = computed(() =>
  Object.entries(tags).map(([id, t]) => ({
    id, label: t.label, count: props.markers.filter((m) => m.tags.includes(id)).length
  }))
)
const categoryEntries = computed(() =>
  Object.entries(categories).map(([id, c]) => ({
    id, label: c.label, color: c.color, count: props.markers.filter((m) => m.category === id).length
  }))
)

function isActive(type: Filter['type'], value: string) {
  return props.activeFilter?.type === type && props.activeFilter.value === value
}
function toggleFilter(type: Filter['type'], value: string) {
  emit('setFilter', isActive(type, value) ? null : { type, value })
}

const activeFilterLabel = computed(() => {
  const f = props.activeFilter
  if (!f) return ''
  if (f.type === 'category') return categories[f.value]?.label ?? f.value
  if (f.type === 'tag') return tags[f.value]?.label ?? f.value
  return scenarios[f.value]?.title ?? f.value
})

/* ---------- 상세 뷰 (마커) ---------- */
const detail = computed(() => (props.marker ? details[props.marker.id] : undefined))
const heading = computed(() => detail.value?.name || props.marker?.label || '')
const paragraphs = computed(() => splitParagraphs(detail.value?.description))
const markerScenarios = computed(() =>
  (props.marker?.scenarios ?? []).map((sid) => ({ id: sid, title: scenarios[sid]?.title ?? sid }))
)
const markerTags = computed(() =>
  (props.marker?.tags ?? []).map((tid) => ({ id: tid, label: tags[tid]?.label ?? tid }))
)

/* ---------- 시나리오 뷰 ---------- */
const scenario = computed(() => (props.scenarioId ? scenarios[props.scenarioId] : undefined))
const scenarioParagraphs = computed(() => splitParagraphs(scenario.value?.description))
</script>

<template>
  <Transition name="panel">
    <aside v-if="open" class="side-panel" :style="{ '--mc': marker ? (categories[marker.category]?.color ?? '#58a6ff') : '#58a6ff' }">
      <!-- ===== 목록 뷰 ===== -->
      <template v-if="view === 'list'">
        <header class="panel-bar">
          <h2 class="bar-title">둘러보기</h2>
          <button class="icon-btn" @click="emit('close')" aria-label="닫기">×</button>
        </header>

        <div v-if="activeFilter" class="filter-banner">
          <span>필터: <b>{{ activeFilterLabel }}</b></span>
          <button class="clear-btn" @click="emit('setFilter', null)">✕ 해제</button>
        </div>

        <section class="group">
          <h3 class="group-label">카테고리</h3>
          <div class="chips">
            <button
              v-for="c in categoryEntries"
              :key="c.id"
              class="chip cat-chip"
              :class="{ on: isActive('category', c.id) }"
              :style="{ '--cc': c.color }"
              @click="toggleFilter('category', c.id)"
            >
              {{ c.label }}
            </button>
          </div>
        </section>

        <section class="group">
          <h3 class="group-label">태그</h3>
          <div class="chips">
            <button
              v-for="t in tagEntries"
              :key="t.id"
              class="chip"
              :class="{ on: isActive('tag', t.id) }"
              @click="toggleFilter('tag', t.id)"
            >
              #{{ t.label }}
            </button>
          </div>
        </section>

        <section class="group">
          <h3 class="group-label">시나리오</h3>
          <ul class="list">
            <li
              v-for="s in scenarioEntries"
              :key="s.id"
              class="item"
              @click="emit('openScenario', s.id)"
            >
              <span class="item-main">
                <span class="item-title">{{ s.title }}</span>
                <span v-if="s.period" class="item-desc">{{ s.period }}</span>
              </span>
              <span class="chev">›</span>
            </li>
          </ul>
        </section>
      </template>

      <!-- ===== 시나리오 뷰 ===== -->
      <template v-else-if="view === 'scenario' && scenario">
        <header class="panel-bar">
          <button class="icon-btn" @click="emit('back')" aria-label="뒤로">←</button>
          <button class="icon-btn" @click="emit('close')" aria-label="닫기">×</button>
        </header>

        <span v-if="scenario.rule" class="rule-tag">{{ scenario.rule }}</span>
        <h2 class="panel-title panel-title--neutral">{{ scenario.title }}</h2>
        <p v-if="scenario.writer" class="panel-summary">{{ scenario.writer }}</p>

        <p v-if="scenario.period" class="period">{{ scenario.period }}</p>

        <div v-if="scenario.scenarioLink || scenario.backupLink" class="links">
          <a
            v-if="scenario.scenarioLink"
            class="link-btn"
            :href="scenario.scenarioLink"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg class="link-ico" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
            </svg>
            시나리오
          </a>
          <a
            v-if="scenario.backupLink"
            class="link-btn link-btn--alt"
            :href="scenario.backupLink"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg class="link-ico" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8M3 8l2.5-4h13L21 8M3 8h18M9 12h6" />
            </svg>
            백업
          </a>
        </div>

        <button
          class="filter-btn"
          :class="{ on: scenarioId && isActive('scenario', scenarioId) }"
          @click="scenarioId && toggleFilter('scenario', scenarioId)"
        >
          {{ scenarioId && isActive('scenario', scenarioId) ? '필터 해제' : '관련 장소 확인' }}
        </button>

        <figure v-if="scenario.image" class="image-fig">
          <img
            :src="resolveImg(scenario.image.src)"
            :alt="scenario.image.caption ?? scenario.title"
            loading="lazy"
          />
        </figure>

        <section v-if="scenarioParagraphs.length" class="description">
          <p v-for="(p, i) in scenarioParagraphs" :key="i">{{ p }}</p>
        </section>
        <p v-else class="empty-note">상세 설명이 아직 등록되지 않았습니다.</p>

        <section v-if="scenario.characters?.length" class="chips-section">
          <div class="chips">
            <span v-for="(c, i) in scenario.characters" :key="i" class="chip chip--static">
              {{ c }}
            </span>
          </div>
        </section>
      </template>

      <!-- ===== 상세 뷰 (마커) ===== -->
      <template v-else-if="marker">
        <header class="panel-bar">
          <button class="icon-btn" @click="emit('back')" aria-label="뒤로">←</button>
          <button class="icon-btn" @click="emit('close')" aria-label="닫기">×</button>
        </header>

        <h2 class="panel-title">{{ heading }}</h2>
        <p v-if="detail?.summary" class="panel-summary">{{ detail.summary }}</p>

        <div class="badges">
          <span v-if="marker.isReal" class="badge badge-real">실존 장소</span>
          <span
            class="badge badge-cat"
            :style="{ '--cc': categories[marker.category]?.color ?? '#58a6ff' }"
          >{{ categories[marker.category]?.label ?? marker.category }}</span>
        </div>

        <div v-if="markerTags.length" class="chips" style="margin-top: 10px">
          <button
            v-for="t in markerTags"
            :key="t.id"
            class="chip"
            @click="emit('setFilter', { type: 'tag', value: t.id })"
          >
            #{{ t.label }}
          </button>
        </div>

        <figure v-if="detail?.image" class="image-fig">
          <img
            :src="resolveImg(detail.image.src)"
            :alt="detail.image.caption ?? heading"
            loading="lazy"
          />
        </figure>

        <section v-if="paragraphs.length" class="description">
          <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
        </section>
        <p v-else class="empty-note">상세 정보가 아직 등록되지 않았습니다.</p>

        <section v-if="markerScenarios.length" class="chips-section">
          <h3 class="group-label">등장 시나리오</h3>
          <div class="chips">
            <button
              v-for="s in markerScenarios"
              :key="s.id"
              class="chip"
              @click="emit('openScenario', s.id)"
            >
              {{ s.title }}
            </button>
          </div>
        </section>
      </template>
    </aside>
  </Transition>
</template>

<style scoped>
.side-panel {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 200;
  width: min(380px, 88vw);
  height: 100%;
  box-sizing: border-box;
  padding: 14px 22px 28px;
  overflow-y: auto;
  background: var(--bg-panel);
  border-right: 1px solid var(--border);
  backdrop-filter: blur(12px);
  color: var(--fg);
  box-shadow: 8px 0 24px rgba(0, 0, 0, 0.35);
}

.panel-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.bar-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}
.icon-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(230, 237, 243, 0.7);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.icon-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: var(--fg);
}

.filter-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
  padding: 8px 11px;
  border-radius: 7px;
  background: rgba(88, 166, 255, 0.14);
  font-size: 13px;
}
.clear-btn {
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.group {
  margin-bottom: 20px;
}
.group-label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
  text-transform: uppercase;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 12px;
  border-radius: 7px;
  background: var(--surface);
  cursor: pointer;
  transition: background 0.15s;
}
.item:hover {
  background: var(--surface-hover);
}
.item-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.item-title {
  font-size: 13px;
  font-weight: 600;
}
.item-desc {
  font-size: 11px;
  color: var(--fg-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chev {
  color: rgba(230, 237, 243, 0.4);
  font-size: 16px;
}

.filter-btn {
  margin-top: 14px;
  padding: 8px 14px;
  border: 1px solid rgba(88, 166, 255, 0.5);
  border-radius: 6px;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.filter-btn:hover {
  background: rgba(88, 166, 255, 0.12);
}
.filter-btn.on {
  background: var(--accent);
  color: var(--bg);
  border-color: var(--accent);
}

/* 상세/시나리오 뷰 */
.panel-title {
  margin: 4px 0 0;
  font-size: 20px;
  font-weight: 700;
  border-left: 3px solid var(--mc);
  padding-left: 10px;
}
.panel-summary {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--fg-dim);
}
.period {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--fg-dim);
  font-variant-numeric: tabular-nums;
}
.rule-tag {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--fg-muted);
}
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border: 1px solid var(--border-mid);
  border-radius: 999px;
  background: var(--surface);
  color: var(--fg-dim);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
}
.link-btn:hover {
  background: var(--surface-strong);
}
.link-ico {
  width: 14px;
  height: 14px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.link-btn--alt {
  border-color: var(--border-mid);
  background: var(--surface);
  color: var(--fg-dim);
}
.link-btn--alt:hover {
  background: var(--surface-strong);
}
.badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 14px 0;
}
.badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 3px 9px;
  border-radius: 999px;
}
.badge-real {
  background: rgba(74, 222, 128, 0.16);
  color: #4ade80;
}
.badge-cat {
  background: color-mix(in srgb, var(--cc) 16%, transparent);
  color: var(--cc);
}
.panel-title--neutral {
  border-left-color: rgba(230, 237, 243, 0.25);
}
.image-fig {
  margin: 16px 0;
}
.image-fig img {
  width: 100%;
  border-radius: 8px;
  display: block;
}
.image-fig figcaption {
  margin-top: 5px;
  font-size: 11px;
  color: var(--fg-muted);
}
.description {
  margin-top: 16px;
  font-size: 14px;
  line-height: 1.7;
}
.description p {
  margin: 0 0 10px;
}
.empty-note {
  margin-top: 16px;
  font-size: 13px;
  color: rgba(230, 237, 243, 0.45);
  font-style: italic;
}
.chips-section {
  margin-top: 18px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  padding: 5px 10px;
  border: 1px solid var(--border-mid);
  border-radius: 999px;
  background: var(--surface);
  color: var(--fg);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.chip:hover {
  background: var(--surface-strong);
}
.chip--static {
  cursor: default;
}
.chip--static:hover {
  background: var(--surface);
}
.chip.on {
  background: var(--accent);
  color: var(--bg);
  border-color: var(--accent);
}
.cat-chip {
  border-color: color-mix(in srgb, var(--cc) 40%, transparent);
  color: var(--cc);
}
.cat-chip.on {
  background: var(--cc);
  color: var(--bg);
  border-color: var(--cc);
}

.panel-enter-active,
.panel-leave-active {
  transition: transform 0.28s ease;
}
.panel-enter-from,
.panel-leave-to {
  transform: translateX(-100%);
}
</style>
