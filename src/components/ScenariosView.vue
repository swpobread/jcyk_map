<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import scenarioData from '@/data/scenarios.json'
import characterData from '@/data/characters.json'

interface DetailImage {
  src: string
  caption?: string
}
interface Scenario {
  title: string
  writer?: string
  rule?: string
  description?: string
  period?: string
  characters?: string[]
  scenarioLink?: string
  backupLink?: string
  image?: DetailImage
}

interface Character {
  name: string
  original?: string
  nickname?: string
  era?: string
  age?: number
  birth?: string
  birthplace?: string
  summary?: string
  height?: number
  description?: string
}

const scenarios = scenarioData as Record<string, Scenario>
const characters = characterData as Record<string, Character>
const characterName = (id: string) => characters[id]?.name ?? id
const entries = computed(() => Object.entries(scenarios).map(([id, s]) => ({ id, ...s })))

const base = import.meta.env.BASE_URL
const resolveImg = (src: string) => (src.startsWith('http') ? src : base + src)
const splitParagraphs = (text?: string) =>
  (text ?? '').split('\n').map((p) => p.trim()).filter(Boolean)

const selectedId = ref<string | null>(null)
const selected = computed(() => (selectedId.value ? scenarios[selectedId.value] : undefined))
const paragraphs = computed(() => splitParagraphs(selected.value?.description))

function open(id: string) { selectedId.value = id }
function close() { selectedId.value = null }

const selectedCharId = ref<string | null>(null)
const selectedChar = computed(() => selectedCharId.value ? characters[selectedCharId.value] : undefined)
const charParagraphs = computed(() => splitParagraphs(selectedChar.value?.description))

function openChar(id: string, e: Event) { e.stopPropagation(); selectedCharId.value = id }
function closeChar() { selectedCharId.value = null }

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (selectedCharId.value) { closeChar(); return }
    close()
  }
}
watch(selectedId, (v) => {
  if (v) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <main class="scenarios">
    <header class="head">
      <RouterLink class="text-btn" to="/">←</RouterLink>
      <h1 class="head-title">시나리오</h1>
      <p class="head-sub">脚本</p>
    </header>

    <ul class="grid">
      <li v-for="s in entries" :key="s.id" class="card" @click="open(s.id)">
        <span v-if="s.rule" class="rule-tag">{{ s.rule }}</span>
        <h2 class="card-title">{{ s.title }}</h2>
        <div class="card-footer">
          <p v-if="s.writer" class="writer">{{ s.writer }}</p>
          <p v-if="s.period" class="period">{{ s.period }}</p>
          <div v-if="s.characters?.length" class="chips">
            <button v-for="(c, i) in s.characters" :key="i" class="chip chip--sm" @click="openChar(c, $event)">{{ characterName(c) }}</button>
          </div>
        </div>
      </li>
    </ul>
  </main>

  <!-- ===== 모달 ===== -->
  <Transition name="modal">
    <div v-if="selected" class="overlay" @click.self="close">
      <article class="modal">
        <button class="close-btn" @click="close" aria-label="닫기">×</button>

        <span v-if="selected.rule" class="rule-tag">{{ selected.rule }}</span>
        <h2 class="detail-title">{{ selected.title }}</h2>
        <p v-if="selected.writer" class="writer">{{ selected.writer }}</p>
        <p v-if="selected.period" class="period">{{ selected.period }}</p>

        <div v-if="selected.scenarioLink || selected.backupLink" class="links">
          <a v-if="selected.scenarioLink" class="link-btn" :href="selected.scenarioLink" target="_blank" rel="noopener noreferrer">
            <svg class="link-ico" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
            </svg>
            시나리오
          </a>
          <a v-if="selected.backupLink" class="link-btn" :href="selected.backupLink" target="_blank" rel="noopener noreferrer">
            <svg class="link-ico" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8M3 8l2.5-4h13L21 8M3 8h18M9 12h6" />
            </svg>
            백업
          </a>
        </div>

        <figure v-if="selected.image" class="image-fig">
          <img :src="resolveImg(selected.image.src)" :alt="selected.image.caption ?? selected.title" loading="lazy" />
          <figcaption v-if="selected.image.caption">{{ selected.image.caption }}</figcaption>
        </figure>

        <section v-if="paragraphs.length" class="description">
          <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
        </section>
        <p v-else class="empty-note">상세 설명이 아직 등록되지 않았습니다.</p>

        <section v-if="selected.characters?.length" class="chips-section">
          <h3 class="group-label">등장인물</h3>
          <div class="chips">
            <button v-for="(c, i) in selected.characters" :key="i" class="chip chip--link" @click="openChar(c, $event)">{{ characterName(c) }}</button>
          </div>
        </section>
      </article>
    </div>
  </Transition>

  <!-- ===== 인물 모달 ===== -->
  <Transition name="modal">
    <div v-if="selectedChar" class="overlay overlay--char" @click.self="closeChar">
      <article class="modal">
        <button class="close-btn" @click="closeChar" aria-label="닫기">×</button>

        <p v-if="selectedChar.era" class="rule-tag">{{ selectedChar.era }}s</p>
        <h2 class="detail-title">{{ selectedChar.name }}</h2>
        <p v-if="selectedChar.original || selectedChar.nickname" class="char-meta">
          <span v-if="selectedChar.original">{{ selectedChar.original }}</span>
          <span v-if="selectedChar.original && selectedChar.nickname" class="meta-sep">·</span>
          <span v-if="selectedChar.nickname">{{ selectedChar.nickname }}</span>
        </p>
        <p v-if="selectedChar.summary" class="writer">{{ selectedChar.summary }}</p>

        <dl v-if="selectedChar.birth || selectedChar.birthplace || selectedChar.age || selectedChar.height" class="char-dl">
          <template v-if="selectedChar.birth">
            <dt>생년월일</dt><dd>{{ selectedChar.birth }}</dd>
          </template>
          <template v-if="selectedChar.birthplace">
            <dt>출신지</dt><dd>{{ selectedChar.birthplace }}</dd>
          </template>
          <template v-if="selectedChar.age">
            <dt>나이</dt><dd>{{ selectedChar.age }}세</dd>
          </template>
          <template v-if="selectedChar.height">
            <dt>신장</dt><dd>{{ selectedChar.height }}cm</dd>
          </template>
        </dl>

        <section v-if="charParagraphs.length" class="description">
          <p v-for="(p, i) in charParagraphs" :key="i">{{ p }}</p>
        </section>
      </article>
    </div>
  </Transition>
</template>

<style scoped>
.scenarios {
  width: 100vw;
  height: 100dvh;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 48px 24px 72px;
  background: var(--bg);
  color: var(--fg);
}

.text-btn {
  border: none;
  background: transparent;
  color: var(--fg-dim);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  font-family: inherit;
}
.text-btn:hover { color: var(--fg); }

/* ---- 헤더 ---- */
.head { max-width: 960px; margin: 0 auto 32px; }
.head-title {
  margin: 14px 0 0;
  font-size: clamp(28px, 5vw, 40px);
  font-weight: 800;
}
.head-sub {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: var(--accent);
}

/* ---- 그리드 ---- */
.grid {
  list-style: none;
  margin: 0 auto;
  padding: 0;
  max-width: 960px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.card {
  position: relative;
  padding: 20px 20px 22px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  cursor: pointer;
  overflow: hidden;
  height: 200px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  transition: border-color 0.18s, background 0.18s, transform 0.18s;
}
.card:hover {
  border-color: var(--accent);
  background: var(--surface-hover);
  transform: translateY(-3px);
}
.card-title {
  margin: 6px 0 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
  padding-right: 18px;
}

/* ---- 공통 메타 ---- */
.rule-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: var(--fg-muted);
}
.card-footer { margin-top: auto; }

.writer {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--fg-dim);
}
.period {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--fg-dim);
  font-variant-numeric: tabular-nums;
}

/* ---- 모달 ---- */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}
.modal {
  position: relative;
  width: 100%;
  max-width: 640px;
  max-height: calc(100dvh - 96px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 32px 28px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-panel);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}
.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 7px;
  background: color-mix(in srgb, var(--fg) 8%, transparent);
  color: var(--fg-dim);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.close-btn:hover {
  background: color-mix(in srgb, var(--fg) 16%, transparent);
  color: var(--fg);
}
.detail-title {
  margin: 8px 0 0;
  font-size: 24px;
  font-weight: 800;
  border-left: 3px solid var(--accent);
  padding-left: 12px;
  padding-right: 24px;
}
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--border-mid);
  border-radius: 999px;
  background: var(--surface);
  color: var(--fg-dim);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s;
}
.link-btn:hover { background: var(--surface-strong); }
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
.image-fig { margin: 24px 0; }
.image-fig img { width: 100%; border-radius: 10px; display: block; }
.image-fig figcaption {
  margin-top: 6px;
  font-size: 12px;
  color: var(--fg-muted);
}
.description {
  margin-top: 24px;
  font-size: 15px;
  line-height: 1.8;
}
.description p { margin: 0 0 12px; }
.empty-note {
  margin-top: 24px;
  font-size: 14px;
  color: var(--fg-muted);
  font-style: italic;
}
.chips-section { margin-top: 28px; }
.group-label {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
  text-transform: uppercase;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.chip {
  padding: 5px 11px;
  border: 1px solid var(--border-mid);
  border-radius: 999px;
  background: var(--surface);
  color: var(--fg);
  font-size: 12px;
  font-weight: 600;
}
.chip--sm {
  padding: 3px 9px;
  font-size: 11px;
  color: var(--fg-dim);
  font-family: inherit;
}
.chip--link {
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.chip--link:hover {
  background: var(--surface-strong);
  color: var(--accent);
  border-color: var(--accent);
}

.overlay--char { z-index: 600; }

.char-meta {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--fg-dim);
  letter-spacing: 0.05em;
}
.meta-sep { margin: 0 6px; color: var(--fg-muted); }

.char-dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 16px;
  margin: 16px 0 0;
  font-size: 13px;
}
.char-dl dt {
  color: var(--fg-muted);
  font-weight: 600;
  white-space: nowrap;
}
.char-dl dd { margin: 0; color: var(--fg); }

/* ---- 전환 ---- */
.modal-enter-active,
.modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-active .modal,
.modal-leave-active .modal { transition: transform 0.2s ease; }
.modal-enter-from .modal,
.modal-leave-to .modal { transform: translateY(12px); }
</style>