<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import characterData from '@/data/characters.json'

interface Character {
  era?: string
  playable?: boolean
  name: string
  original?: string
  nickname?: string
  age?: number
  birth?: string
  birthplace?: string
  summary?: string
  height?: number
  description?: string
  image?: string
}

const route = useRoute()
onMounted(() => {
  const id = route.query.id
  if (typeof id === 'string' && characters[id]) open(id)
})
const characters = characterData as Record<string, Character>
const entries = computed(() => Object.entries(characters).map(([id, c]) => ({ id, ...c })))

const base = import.meta.env.BASE_URL
const resolveImg = (src: string) => (src.startsWith('http') ? src : base + src)
const initial = (name: string) => name.trim().charAt(0)
const splitParagraphs = (text?: string) =>
  (text ?? '').split('\n').map((p) => p.trim()).filter(Boolean)

const buildMeta = (c?: Character) => {
  if (!c) return []
  const rows: { label: string; value: string }[] = []
  if (c.age != null) rows.push({ label: '나이', value: `${c.age}` })
  if (c.birth) rows.push({ label: '생일', value: c.birth })
  if (c.birthplace) rows.push({ label: '출신', value: c.birthplace })
  if (c.height != null) rows.push({ label: '키', value: `${c.height} cm` })
  return rows
}

/* PC → 전체 페이지 / NPC → 모달 */
const fullId = ref<string | null>(null)
const modalId = ref<string | null>(null)

const fullChar = computed(() => (fullId.value ? characters[fullId.value] : undefined))
const modalChar = computed(() => (modalId.value ? characters[modalId.value] : undefined))

const fullMeta = computed(() => buildMeta(fullChar.value))
const modalMeta = computed(() => buildMeta(modalChar.value))
const fullParagraphs = computed(() => splitParagraphs(fullChar.value?.description))
const modalParagraphs = computed(() => splitParagraphs(modalChar.value?.description))
function open(id: string) {
  if (characters[id]?.playable) { fullId.value = id; window.scrollTo({ top: 0 }) }
  else { modalId.value = id }
}
function backToGrid() { fullId.value = null }
function closeModal() { modalId.value = null }

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeModal()
}
watch(modalId, (v) => {
  if (v) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <main class="characters">
    <!-- ===== PC 전체 페이지 ===== -->
    <article v-if="fullChar" class="page-detail">
      <button class="text-btn" @click="backToGrid">← 목록</button>

      <div class="pd-head">
        <div class="pd-thumb">
          <img v-if="fullChar.image" :src="resolveImg(fullChar.image)" :alt="fullChar.name" />
          <span v-else class="monogram" aria-hidden="true">{{ initial(fullChar.name) }}</span>
        </div>
        <div class="pd-id">
          <div class="badges">
            <span class="badge badge-pc">PLAYER</span>
            <span v-if="fullChar.era" class="badge badge-era">{{ fullChar.era }}</span>
          </div>
          <h1 class="pd-name">{{ fullChar.name }}</h1>
          <p v-if="fullChar.original || fullChar.nickname" class="pd-sub">
            <span v-if="fullChar.original">{{ fullChar.original }}</span>
            <span v-if="fullChar.nickname" class="nick">{{ fullChar.nickname }}</span>
          </p>
          <p v-if="fullChar.summary" class="summary">{{ fullChar.summary }}</p>
        </div>
      </div>

      <dl v-if="fullMeta.length" class="meta">
        <div v-for="(m, i) in fullMeta" :key="i" class="meta-row">
          <dt>{{ m.label }}</dt>
          <dd>{{ m.value }}</dd>
        </div>
      </dl>

      <section v-if="fullParagraphs.length" class="description">
        <p v-for="(p, i) in fullParagraphs" :key="i">{{ p }}</p>
      </section>
      <p v-else class="empty-note">상세 설명이 아직 등록되지 않았습니다.</p>
    </article>

    <!-- ===== 그리드 ===== -->
    <template v-else>
      <header class="head">
        <RouterLink class="text-btn" to="/">←</RouterLink>
        <h1 class="head-title">인물</h1>
        <p class="head-sub">人物</p>
      </header>

      <ul class="grid">
        <li v-for="c in entries" :key="c.id" class="card" @click="open(c.id)">
          <div class="thumb">
            <img v-if="c.image" :src="resolveImg(c.image)" :alt="c.name" loading="lazy" />
            <span v-else class="monogram" aria-hidden="true">{{ initial(c.name) }}</span>
            <span v-if="c.playable" class="pc-badge">PC</span>
          </div>
          <div class="card-body">
            <h2 class="card-name">{{ c.name }}</h2>
            <p v-if="c.original" class="card-original">{{ c.original }}</p>
          </div>
        </li>
      </ul>
    </template>
  </main>

  <!-- ===== NPC 모달 ===== -->
  <Transition name="modal">
    <div v-if="modalChar" class="overlay" @click.self="closeModal">
      <article class="modal">
        <button class="close-btn" @click="closeModal" aria-label="닫기">×</button>

        <div class="modal-head">
          <div class="modal-thumb">
            <img v-if="modalChar.image" :src="resolveImg(modalChar.image)" :alt="modalChar.name" />
            <span v-else class="monogram" aria-hidden="true">{{ initial(modalChar.name) }}</span>
          </div>
          <div class="modal-id">
            <div class="badges">
              <span class="badge badge-npc">NPC</span>
              <span v-if="modalChar.era" class="badge badge-era">{{ modalChar.era }}</span>
            </div>
            <h2 class="modal-name">{{ modalChar.name }}</h2>
            <p v-if="modalChar.original || modalChar.nickname" class="modal-sub">
              <span v-if="modalChar.original">{{ modalChar.original }}</span>
              <span v-if="modalChar.nickname" class="nick">{{ modalChar.nickname }}</span>
            </p>
          </div>
        </div>

        <p v-if="modalChar.summary" class="summary">{{ modalChar.summary }}</p>

        <dl v-if="modalMeta.length" class="meta">
          <div v-for="(m, i) in modalMeta" :key="i" class="meta-row">
            <dt>{{ m.label }}</dt>
            <dd>{{ m.value }}</dd>
          </div>
        </dl>

        <section v-if="modalParagraphs.length" class="description">
          <p v-for="(p, i) in modalParagraphs" :key="i">{{ p }}</p>
        </section>
        <p v-else class="empty-note">상세 설명이 아직 등록되지 않았습니다.</p>
      </article>
    </div>
  </Transition>
</template>

<style scoped>
.characters {
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
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}
.card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.18s, transform 0.18s;
}
.card:hover {
  border-color: var(--accent);
  transform: translateY(-3px);
}
.thumb {
  position: relative;
  aspect-ratio: 3 / 4;
  display: grid;
  place-items: center;
  background: var(--surface-strong);
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.monogram {
  font-size: 44px;
  font-weight: 800;
  color: var(--fg-muted);
  user-select: none;
}
.pc-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--accent);
  color: var(--bg);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
}
.card-body { padding: 12px 12px 14px; }
.card-name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}
.card-original {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--fg-muted);
}

/* ---- PC 전체 페이지 ---- */
.page-detail { max-width: 720px; margin: 0 auto; }
.pd-head {
  display: flex;
  gap: 24px;
  margin-top: 20px;
  flex-wrap: wrap;
}
.pd-thumb {
  flex: none;
  width: 160px;
  aspect-ratio: 3 / 4;
  border-radius: 12px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--surface-strong);
}
.pd-thumb img { width: 100%; height: 100%; object-fit: cover; }
.pd-thumb .monogram { font-size: 56px; }
.pd-id {
  flex: 1;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.pd-name {
  margin: 8px 0 0;
  font-size: clamp(26px, 4vw, 34px);
  font-weight: 800;
}
.pd-sub {
  margin: 6px 0 0;
  font-size: 15px;
  color: var(--fg-dim);
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
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
  max-width: 560px;
  max-height: calc(100dvh - 96px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 28px;
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
.modal-head {
  display: flex;
  gap: 18px;
  padding-right: 28px;
}
.modal-thumb {
  flex: none;
  width: 96px;
  aspect-ratio: 3 / 4;
  border-radius: 10px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--surface-strong);
}
.modal-thumb img { width: 100%; height: 100%; object-fit: cover; }
.modal-thumb .monogram { font-size: 36px; }
.modal-id {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}
.modal-name {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
}
.modal-sub {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--fg-dim);
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* ---- 공통 ---- */
.badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 3px 9px;
  border-radius: 999px;
}
.badge-pc {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
}
.badge-npc,
.badge-era {
  background: color-mix(in srgb, var(--fg) 10%, transparent);
  color: var(--fg-dim);
}
.nick { color: var(--accent); font-weight: 700; }

.summary {
  margin: 20px 0 0;
  font-size: 14px;
  color: var(--fg-dim);
}

.meta {
  margin: 20px 0 0;
  display: grid;
  gap: 10px;
}
.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
}
.meta-row dt { color: var(--fg-muted); }
.meta-row dd { margin: 0; font-weight: 600; }

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