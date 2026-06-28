<script setup lang="ts">
import { RouterLink } from 'vue-router'

interface Entry {
  to: string
  title: string
  sub: string
  icon: 'map' | 'people' | 'scenario'
}

const entries: Entry[] = [
  { to: '/map', title: '지도', sub: 'MAP', icon: 'map' },
  { to: '/characters', title: '인물', sub: 'CHARACTERS', icon: 'people' },
  { to: '/scenarios', title: '시나리오', sub: 'SCENARIOS', icon: 'scenario' },
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
        v-for="(e, i) in entries"
        :key="e.to"
        :to="e.to"
        class="card"
      >
        <span class="card-num" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="card-title">{{ e.title }}</span>
        <span class="card-right">
          <span class="card-sub">{{ e.sub }}</span>
          <svg class="card-arrow" viewBox="0 0 8 12" aria-hidden="true">
          <path d="M0 0 L8 6 L0 12 Z" />
        </svg>
        </span>
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
  background: var(--bg);
  color: var(--fg);
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
  color: var(--accent);
}
.hero-title {
  margin: 0;
  font-size: clamp(32px, 6vw, 54px);
  font-weight: 800;
  letter-spacing: 0.02em;
}

/* ---- cards ---- */
.cards {
  width: 100%;
  max-width: 700px;
  border-top: 1.5px solid #111;
}

.card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 16px;
  border-bottom: 1.5px solid #111;
  background: transparent;
  color: #111;
  text-decoration: none;
  transition: background 0.18s, color 0.18s;
}
.card:hover {
  background: #111;
  color: #f5f2ec;
}

.card-num {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--fg-muted);
  flex: none;
  width: 20px;
  transition: color 0.18s;
}
.card:hover .card-num {
  color: rgba(245, 242, 236, 0.35);
}

.card-title {
  flex: 1;
  font-size: clamp(22px, 3.5vw, 30px);
  font-weight: 800;
  letter-spacing: 0.01em;
}

.card-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: none;
}

.card-sub {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--fg-muted);
  transition: color 0.18s;
}
.card:hover .card-sub {
  color: rgba(245, 242, 236, 0.38);
}

.card-arrow {
  width: 9px;
  height: 13px;
  flex: none;
  fill: #f5f2ec;
  opacity: 0;
  transition: opacity 0.18s, transform 0.18s;
}
.card:hover .card-arrow {
  opacity: 0.6;
  transform: translateX(4px);
}

@media (max-width: 560px) {
  .card { padding: 20px 8px; gap: 14px; }
  .card-sub { display: none; }
}
</style>