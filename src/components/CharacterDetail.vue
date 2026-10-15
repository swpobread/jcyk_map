<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { characters } from '@/data/characters'
import { thumbOf, defaultAvatars, scenarioAvatarsOf } from '@/data/avatars'
import { resolveImg, splitParagraphs, initial } from '@/utils'

const props = defineProps<{ id: string; variant: 'page' | 'modal' }>()

const isPage = computed(() => props.variant === 'page')
/* 존재 여부는 호출 측에서 확인 */
const char = computed(() => characters[props.id]!)
const thumb = computed(() => thumbOf(props.id))

const meta = computed(() => {
  const c = char.value
  const rows: { label: string; value: string }[] = []
  if (c.age != null) rows.push({ label: '나이', value: `${c.age}` })
  if (c.birth) rows.push({ label: '생일', value: c.birth })
  if (c.birthplace) rows.push({ label: '출신', value: c.birthplace })
  if (c.height != null) rows.push({ label: '키', value: `${c.height} cm` })
  return rows
})
const paragraphs = computed(() => splitParagraphs(char.value.description))

const defaults = computed(() => defaultAvatars(props.id))
const scenarioSets = computed(() => scenarioAvatarsOf(props.id))
/* 모달은 이미지가 2장 이상일 때만 갤러리 표시 */
const showGallery = computed(
  () => isPage.value || defaults.value.length + scenarioSets.value.reduce((n, s) => n + s.avatars.length, 0) > 1,
)
</script>

<template>
  <div :class="['detail', `detail--${variant}`]">
    <div class="head">
      <div class="thumb">
        <img v-if="thumb" :src="resolveImg(thumb)" :alt="char.name" />
        <span v-else class="monogram" aria-hidden="true">{{ initial(char.name) }}</span>
      </div>
      <div class="id">
        <div class="badges">
          <span v-if="char.playable" class="badge badge-pc">PLAYER</span>
          <span v-else class="badge badge-npc">NPC</span>
          <span v-if="char.era" class="badge badge-era">{{ char.era }}</span>
        </div>
        <component :is="isPage ? 'h1' : 'h2'" class="name">{{ char.name }}</component>
        <p v-if="char.original || char.nickname" class="sub">
          <span v-if="char.original">{{ char.original }}</span>
          <span v-if="char.nickname" class="nick">{{ char.nickname }}</span>
        </p>
        <p v-if="isPage && char.summary" class="summary">{{ char.summary }}</p>
      </div>
    </div>

    <p v-if="!isPage && char.summary" class="summary">{{ char.summary }}</p>

    <dl v-if="meta.length" class="meta">
      <div v-for="(m, i) in meta" :key="i" class="meta-row">
        <dt>{{ m.label }}</dt>
        <dd>{{ m.value }}</dd>
      </div>
    </dl>

    <section v-if="paragraphs.length" class="description">
      <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
    </section>
    <p v-else class="empty-note">상세 설명이 아직 등록되지 않았습니다.</p>

    <template v-if="showGallery">
      <section v-if="defaults.length" class="avatar-section">
        <ul class="avatar-grid">
          <li v-for="(a, i) in defaults" :key="i" class="avatar-tile">
            <img :src="resolveImg(a.src)" :alt="char.name" loading="lazy" />
            <p v-if="a.label" class="avatar-cap avatar-label">{{ a.label }}</p>
            <p v-if="a.credit" class="avatar-credit">{{ a.credit }}</p>
          </li>
        </ul>
      </section>

      <section v-if="scenarioSets.length" class="avatar-section">
        <ul class="avatar-grid">
          <template v-for="s in scenarioSets" :key="s.id">
            <li v-for="(a, i) in s.avatars" :key="`${s.id}-${i}`" :class="['avatar-tile', { 'avatar-tile--link': isPage }]">
              <!-- 링크는 페이지에서만 -->
              <component :is="isPage ? RouterLink : 'div'" v-bind="isPage ? { to: { path: '/scenarios', query: { id: s.id } } } : {}">
                <img :src="resolveImg(a.src)" :alt="`${char.name} — ${s.title}`" loading="lazy" />
                <p class="avatar-cap">
                  <span class="avatar-title">{{ s.title }}</span>
                  <span v-if="a.label" class="avatar-label">{{ a.label }}</span>
                </p>
                <p v-if="a.credit" class="avatar-credit">{{ a.credit }}</p>
              </component>
            </li>
          </template>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* ---- 머리 ---- */
.head {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.thumb {
  flex: none;
  width: 160px;
  aspect-ratio: 3 / 4;
  border-radius: 12px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--surface-strong);
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.monogram {
  font-size: 56px;
  font-weight: 800;
  color: var(--fg-muted);
  user-select: none;
}
.id {
  flex: 1;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.name {
  margin: 8px 0 0;
  font-size: clamp(26px, 4vw, 34px);
  font-weight: 800;
}
.sub {
  margin: 6px 0 0;
  font-size: 15px;
  color: var(--fg-dim);
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* ---- 모달 변형 ---- */
.detail--modal .head { gap: 18px; flex-wrap: nowrap; padding-right: 28px; }
.detail--modal .thumb { width: 96px; border-radius: 10px; }
.detail--modal .monogram { font-size: 36px; }
.detail--modal .id { min-width: 0; }
.detail--modal .name { margin: 0; font-size: 24px; }
.detail--modal .sub { margin-top: 4px; font-size: 14px; }

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

/* ---- 아바타 갤러리 ---- */
.avatar-section { margin-top: 36px; }
.avatar-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 14px;
}
.detail--modal .avatar-section { margin-top: 28px; }
.detail--modal .avatar-grid { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 12px; }
.avatar-tile img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
  border-radius: 10px;
  background: var(--surface-strong);
}
.avatar-tile--link a {
  display: block;
  color: inherit;
  text-decoration: none;
}
.avatar-tile--link img { transition: transform 0.2s; }
.avatar-tile--link a:hover img { transform: translateY(-3px); }
.avatar-tile--link a:hover .avatar-title { text-decoration: underline; }
.avatar-cap {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  gap: 6px;
  align-items: baseline;
  min-width: 0;
}
.avatar-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.avatar-label {
  flex: none;
  color: var(--accent);
  font-weight: 700;
}
.avatar-credit {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--fg-muted);
}
</style>
