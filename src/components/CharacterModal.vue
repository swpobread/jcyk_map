<script setup lang="ts">
import { computed } from 'vue'
import { characters } from '@/data/characters'
import { splitParagraphs } from '@/utils'

const props = defineProps<{ id: string | null }>()
const emit = defineEmits<{ close: [] }>()

const char = computed(() => (props.id ? characters[props.id] : undefined))
const paragraphs = computed(() => splitParagraphs(char.value?.description))
</script>

<template>
  <Transition name="modal">
    <div v-if="char" class="char-overlay" @click.self="emit('close')">
      <article class="modal">
        <button class="close-btn" @click="emit('close')" aria-label="닫기">×</button>

        <p v-if="char.era" class="rule-tag">{{ char.era }}s</p>
        <h2 class="detail-title">{{ char.name }}</h2>
        <p v-if="char.original || char.nickname" class="char-meta">
          <span v-if="char.original">{{ char.original }}</span>
          <span v-if="char.original && char.nickname" class="meta-sep">·</span>
          <span v-if="char.nickname">{{ char.nickname }}</span>
        </p>
        <p v-if="char.summary" class="writer">{{ char.summary }}</p>

        <dl v-if="char.birth || char.birthplace || char.age || char.height" class="char-dl">
          <template v-if="char.birth">
            <dt>생년월일</dt><dd>{{ char.birth }}</dd>
          </template>
          <template v-if="char.birthplace">
            <dt>출신지</dt><dd>{{ char.birthplace }}</dd>
          </template>
          <template v-if="char.age">
            <dt>나이</dt><dd>{{ char.age }}세</dd>
          </template>
          <template v-if="char.height">
            <dt>신장</dt><dd>{{ char.height }}cm</dd>
          </template>
        </dl>

        <section v-if="paragraphs.length" class="description">
          <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
        </section>
      </article>
    </div>
  </Transition>
</template>

<style scoped>
.char-overlay {
  position: fixed;
  inset: 0;
  z-index: 600;
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
  color: var(--fg);
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
.rule-tag {
  display: inline-block;
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--fg-muted);
}
.detail-title {
  margin: 8px 0 0;
  font-size: 24px;
  font-weight: 800;
  border-left: 3px solid var(--accent);
  padding-left: 12px;
  padding-right: 24px;
}
.char-meta {
  margin: 4px 0 0;
  font-size: 14px;
  color: #111;
  letter-spacing: 0.05em;
}
.meta-sep { margin: 0 6px; color: var(--fg-muted); }
.writer {
  margin: 8px 0 0;
  font-size: 13px;
  color: #111;
}
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
.description {
  margin-top: 24px;
  font-size: 15px;
  line-height: 1.8;
}
.description p { margin: 0 0 12px; }

.modal-enter-active,
.modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-active .modal,
.modal-leave-active .modal { transition: transform 0.2s ease; }
.modal-enter-from .modal,
.modal-leave-to .modal { transform: translateY(12px); }
</style>
