<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { characters } from '@/data/characters'
import { thumbOf } from '@/data/avatars'
import { resolveImg, initial } from '@/utils'
import CharacterDetail from './CharacterDetail.vue'
import CharacterModal from './CharacterModal.vue'

const route = useRoute()
onMounted(() => {
  const id = route.query.id
  if (typeof id === 'string' && characters[id]) open(id)
})
const entries = computed(() => Object.entries(characters).map(([id, c]) => ({ id, ...c })))

/* PC → 전체 페이지 / NPC → 모달 */
const fullId = ref<string | null>(null)
const modalId = ref<string | null>(null)

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
    <article v-if="fullId" class="page-detail">
      <button class="text-btn" @click="backToGrid">← 목록</button>
      <CharacterDetail :id="fullId" variant="page" class="pd" />
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
            <img v-if="thumbOf(c.id)" :src="resolveImg(thumbOf(c.id)!)" :alt="c.name" loading="lazy" />
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
  <CharacterModal :id="modalId" @close="closeModal" />
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
  border: 1.5px solid #111;
  border-radius: 12px;
  background: transparent;
  color: var(--fg);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, color 0.2s, transform 0.2s;
}
.card:hover {
  border-color: #111;
  background: #111;
  color: #f5f2ec;
  transform: translateY(-3px);
}
.card:hover .thumb { background: rgba(255, 255, 255, 0.08); }
.card:hover .monogram { color: rgba(245, 242, 236, 0.35); }
.card:hover .card-original { color: rgba(245, 242, 236, 0.42); }
.card:hover .pc-badge { background: #f5f2ec; color: #111; }
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
.pd { margin-top: 20px; }
</style>
