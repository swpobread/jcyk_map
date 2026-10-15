<script setup lang="ts">
import { characters } from '@/data/characters'
import CharacterDetail from './CharacterDetail.vue'

defineProps<{ id: string | null }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Transition name="modal">
    <div v-if="id && characters[id]" class="char-overlay" @click.self="emit('close')">
      <article class="modal">
        <button class="close-btn" @click="emit('close')" aria-label="닫기">×</button>
        <CharacterDetail :id="id" variant="modal" />
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
  max-width: 560px;
  max-height: calc(100dvh - 96px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 28px;
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

.modal-enter-active,
.modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-active .modal,
.modal-leave-active .modal { transition: transform 0.2s ease; }
.modal-enter-from .modal,
.modal-leave-to .modal { transform: translateY(12px); }
</style>
