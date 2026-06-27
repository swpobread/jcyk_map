<script setup lang="ts">
import { RouterLink } from 'vue-router'

interface Entry {
  to: string
  title: string
  sub: string
  desc: string
  icon: 'map' | 'people' | 'scenario'
}

const entries: Entry[] = [
  {
    to: '/map',
    title: '지도',
    sub: 'MAP',
    icon: 'map',
  },
  {
    to: '/characters',
    title: '인물',
    sub: 'CHARACTERS',
    icon: 'people',
  },
  {
    to: '/scenarios',
    title: '시나리오',
    sub: 'SCENARIOS',
    icon: 'scenario',
  },
]
</script>

<template>
  <main class="home">
    <header class="hero">
      <p class="hero-eyo">1920 — 2020s</p>
      <h1 class="hero-title">현상 기록</h1>
    </header>

    <nav class="cards">
      <RouterLink
        v-for="e in entries"
        :key="e.to"
        :to="e.to"
        class="card"
      >
        <span class="card-icon" aria-hidden="true">
          <!-- map -->
          <svg v-if="e.icon === 'map'" viewBox="0 0 24 24">
            <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z" />
            <path d="M9 3v16M15 5v16" />
          </svg>
          <!-- people -->
          <svg v-else-if="e.icon === 'people'" viewBox="0 0 24 24">
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
            <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 14.4A5.5 5.5 0 0 1 20.5 19.5" />
          </svg>
          <!-- scenario -->
          <svg v-else viewBox="0 0 24 24">
            <path d="M6 3h9l4 4v14H6z" />
            <path d="M15 3v4h4M9 12h6M9 16h6M9 8h2" />
          </svg>
        </span>

        <span class="card-body">
          <span class="card-sub">{{ e.sub }}</span>
          <span class="card-title">{{ e.title }}</span>
          <span class="card-desc">{{ e.desc }}</span>
        </span>

        <span class="card-arrow" aria-hidden="true">→</span>
      </RouterLink>
    </nav>
  </main>
</template>

<style scoped>
.home {
  position: relative;
  width: 100vw;
  min-height: 100dvh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 48px;
  padding: 64px 24px;
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(88, 166, 255, 0.1), transparent 60%),
    var(--bg, #0d1117);
  color: var(--fg, #e6edf3);
}

/* ---- hero ---- */
.hero {
  text-align: center;
}
.hero-eyo {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.4em;
  color: var(--accent, #58a6ff);
}
.hero-title {
  margin: 0;
  font-size: clamp(32px, 6vw, 54px);
  font-weight: 800;
  letter-spacing: 0.02em;
}

/* ---- cards ---- */
.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  width: 100%;
  max-width: 920px;
}
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 26px 22px 24px;
  border: 1px solid var(--border, #30363d);
  border-radius: 14px;
  background: var(--surface, rgba(255, 255, 255, 0.03));
  color: inherit;
  text-decoration: none;
  overflow: hidden;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}
.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 80% at 50% 0%, rgba(88, 166, 255, 0.12), transparent 55%);
  opacity: 0;
  transition: opacity 0.2s;
}
.card:hover {
  border-color: var(--accent, #58a6ff);
  background: var(--surface-hover, rgba(255, 255, 255, 0.06));
  transform: translateY(-4px);
}
.card:hover::before { opacity: 1; }

.card-icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: color-mix(in srgb, var(--accent, #58a6ff) 14%, transparent);
  color: var(--accent, #58a6ff);
}
.card-icon svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.card-sub {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--fg-muted, rgba(230, 237, 243, 0.5));
}
.card-title {
  font-size: 22px;
  font-weight: 800;
}

.card-arrow {
  position: absolute;
  top: 24px;
  right: 22px;
  font-size: 18px;
  color: var(--fg-muted, rgba(230, 237, 243, 0.4));
  transition: transform 0.2s, color 0.2s;
}
.card:hover .card-arrow {
  color: var(--accent, #58a6ff);
  transform: translateX(4px);
}

@media (max-width: 720px) {
  .cards { grid-template-columns: 1fr; max-width: 420px; }
  .card { flex-direction: row; align-items: center; padding: 18px; }
  .card-arrow { top: 50%; transform: translateY(-50%); }
  .card:hover .card-arrow { transform: translateY(-50%) translateX(4px); }
}
</style>