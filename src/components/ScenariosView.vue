<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { scenarios, periodKey } from '@/data/scenarios'
import { characterName } from '@/data/characters'
import { mainAvatar, castAvatars } from '@/data/avatars'
import { resolveImg, splitParagraphs, initial } from '@/utils'
import CharacterModal from './CharacterModal.vue'

const entries = computed(() => Object.entries(scenarios).map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => periodKey(a.period).localeCompare(periodKey(b.period))))

const selectedId = ref<string | null>(null)
const selected = computed(() => (selectedId.value ? scenarios[selectedId.value] : undefined))
const paragraphs = computed(() => splitParagraphs(selected.value?.description))

/* 등장인물 타일: 시나리오 첫 아바타 → 기본 아바타 → 이니셜 (전체 버전은 캐릭터 페이지에서) */
const cast = computed(() => {
  const id = selectedId.value
  if (!id) return []
  const avatars = castAvatars(id)
  return (selected.value?.characters ?? []).map((c) => ({
    id: c, name: characterName(c), avatar: avatars[c]?.[0] ?? mainAvatar(c),
  }))
})

function open(id: string) { selectedId.value = id }
function close() { selectedId.value = null }

const route = useRoute()
onMounted(() => {
  const id = route.query.id
  if (typeof id === 'string' && scenarios[id]) open(id)
})

const selectedCharId = ref<string | null>(null)

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
          <ul class="cast-grid">
            <li v-for="m in cast" :key="m.id">
              <button class="cast-tile" @click="openChar(m.id, $event)">
                <span class="cast-thumb">
                  <img v-if="m.avatar" :src="resolveImg(m.avatar.src)" :alt="m.name" loading="lazy" />
                  <span v-else class="monogram" aria-hidden="true">{{ initial(m.name) }}</span>
                </span>
                <span class="cast-name">{{ m.name }}</span>
                <span v-if="m.avatar?.credit" class="cast-credit">{{ m.avatar.credit }}</span>
              </button>
            </li>
          </ul>
        </section>
      </article>
    </div>
  </Transition>

  <!-- ===== 인물 모달 ===== -->
  <CharacterModal :id="selectedCharId" @close="closeChar" />
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
  color: #111;
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
  border: 1.5px solid #111;
  border-radius: 12px;
  background: transparent;
  color: var(--fg);
  cursor: pointer;
  overflow: hidden;
  height: 200px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s, background 0.2s, color 0.2s, transform 0.2s;
}
.card:hover {
  border-color: #111;
  background: #111;
  color: #f5f2ec;
  transform: translateY(-3px);
}
.card:hover .rule-tag { color: rgba(245, 242, 236, 0.38); }
.card:hover .writer,
.card:hover .period { color: rgba(245, 242, 236, 0.58); }
.card:hover .chip--sm { color: rgba(245, 242, 236, 0.5); }
.card:hover .chip--sm::after { color: rgba(245, 242, 236, 0.5); }
.card:hover .chip--sm:hover { color: #f5f2ec; }
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
  color: #111;
}
.period {
  margin: 6px 0 0;
  font-size: 13px;
  color: #111;
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
  border: 1px solid var(--border-mid);
  border-radius: 14px;
  background: var(--bg-panel);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
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
  padding: 0;
  font-size: 12px;
  font-family: inherit;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--fg-muted);
  cursor: pointer;
  transition: color 0.15s;
}
.chip--sm:not(:last-child)::after {
  content: ' ·';
  color: var(--fg-muted);
  pointer-events: none;
}
.chip--sm:hover { color: #111; }

/* ---- 등장인물 타일 ---- */
.cast-grid {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 12px;
}
.cast-tile {
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--fg);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.cast-thumb {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface-strong);
  transition: transform 0.2s;
}
.cast-tile:hover .cast-thumb { transform: translateY(-3px); }
.cast-tile:hover .cast-name { text-decoration: underline; }
.cast-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cast-thumb .monogram {
  font-size: 32px;
  font-weight: 800;
  color: var(--fg-muted);
  user-select: none;
}
.cast-name {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
}
.cast-credit {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--fg-muted);
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