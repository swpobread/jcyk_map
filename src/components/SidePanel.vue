<script setup lang="ts">
import { computed } from 'vue'
import detailData from '@/data/details.json'
import scenarioData from '@/data/scenarios.json'
import tagData from '@/data/tags.json'

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
  summary?: string
  description?: string
  image?: DetailImage
}
interface Tag {
  label: string
  description?: string
}
interface MarkerInfo {
  id: string
  label: string
  color: string
  isReal: boolean
  tags: string[]
  scenarios: string[]
}
type Filter = { type: 'tag' | 'scenario'; value: string }

const props = defineProps<{
  open: boolean
  view: 'list' | 'detail' | 'scenario'
  marker: MarkerInfo | null
  scenarioId: string | null
  markers: MarkerInfo[]
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

const base = import.meta.env.BASE_URL
const resolveImg = (src: string) => (src.startsWith('http') ? src : base + src)
const splitParagraphs = (text?: string) =>
  (text ?? '')
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)

/* ---------- 목록 뷰 ---------- */
const scenarioCount = (sid: string) =>
  props.markers.filter((m) => m.scenarios.includes(sid)).length
const tagCount = (tid: string) => props.markers.filter((m) => m.tags.includes(tid)).length

const scenarioEntries = computed(() =>
  Object.entries(scenarios).map(([id, s]) => ({ id, ...s, count: scenarioCount(id) }))
)
const tagEntries = computed(() =>
  Object.entries(tags).map(([id, t]) => ({ id, label: t.label, count: tagCount(id) }))
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
  return f.type === 'tag' ? tags[f.value]?.label ?? f.value : scenarios[f.value]?.title ?? f.value
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
    <aside v-if="open" class="side-panel" :style="{ '--mc': marker?.color ?? '#58a6ff' }">
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
              <span class="item-title">{{ s.title }}</span>
              <span class="count">{{ s.count }}</span>
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

        <h2 class="panel-title">{{ scenario.title }}</h2>
        <p v-if="scenario.summary" class="panel-summary">{{ scenario.summary }}</p>

        <button
          class="filter-btn"
          :class="{ on: scenarioId && isActive('scenario', scenarioId) }"
          @click="scenarioId && toggleFilter('scenario', scenarioId)"
        >
          {{ scenarioId && isActive('scenario', scenarioId) ? '필터 해제' : '이 장소만 보기' }}
        </button>

        <figure v-if="scenario.image" class="image-fig">
          <img
            :src="resolveImg(scenario.image.src)"
            :alt="scenario.image.caption ?? scenario.title"
            loading="lazy"
          />
          <figcaption v-if="scenario.image.caption">{{ scenario.image.caption }}</figcaption>
        </figure>

        <section v-if="scenarioParagraphs.length" class="description">
          <p v-for="(p, i) in scenarioParagraphs" :key="i">{{ p }}</p>
        </section>
        <p v-else class="empty-note">상세 설명이 아직 등록되지 않았습니다.</p>
      </template>

      <!-- ===== 상세 뷰 (마커) ===== -->
      <template v-else-if="marker">
        <header class="panel-bar">
          <button class="icon-btn" @click="emit('back')" aria-label="뒤로">←</button>
          <button class="icon-btn" @click="emit('close')" aria-label="닫기">×</button>
        </header>

        <h2 class="panel-title">{{ heading }}</h2>
        <p v-if="detail?.summary" class="panel-summary">{{ detail.summary }}</p>

        <div v-if="marker.isReal" class="badges">
          <span class="badge badge-real">실존 장소</span>
        </div>

        <figure v-if="detail?.image" class="image-fig">
          <img
            :src="resolveImg(detail.image.src)"
            :alt="detail.image.caption ?? heading"
            loading="lazy"
          />
          <figcaption v-if="detail.image.caption">{{ detail.image.caption }}</figcaption>
        </figure>

        <section v-if="paragraphs.length" class="description">
          <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
        </section>
        <p v-else class="empty-note">상세 정보가 아직 등록되지 않았습니다.</p>

        <section v-if="markerTags.length" class="chips-section">
          <h3 class="group-label">태그</h3>
          <div class="chips">
            <button
              v-for="t in markerTags"
              :key="t.id"
              class="chip"
              @click="emit('setFilter', { type: 'tag', value: t.id })"
            >
              #{{ t.label }}
            </button>
          </div>
        </section>

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
  background: rgba(13, 17, 23, 0.94);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  color: #e6edf3;
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
  color: #e6edf3;
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
  color: #58a6ff;
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
  color: rgba(230, 237, 243, 0.5);
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
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.15s;
}
.item:hover {
  background: rgba(255, 255, 255, 0.1);
}
.item-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
}
.count {
  flex: none;
  min-width: 20px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(230, 237, 243, 0.7);
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
  color: #58a6ff;
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
  background: #58a6ff;
  color: #0d1117;
  border-color: #58a6ff;
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
  color: rgba(230, 237, 243, 0.65);
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
  color: rgba(230, 237, 243, 0.5);
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
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: #e6edf3;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.chip:hover {
  background: rgba(255, 255, 255, 0.12);
}
.chip.on {
  background: #58a6ff;
  color: #0d1117;
  border-color: #58a6ff;
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
