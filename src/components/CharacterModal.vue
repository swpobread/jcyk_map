<script setup lang="ts">
import { characters } from '@/data/characters'
import CharacterDetail from './CharacterDetail.vue'

defineProps<{ id: string | null }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Transition name="modal">
    <div v-if="id && characters[id]" class="overlay overlay--top" @click.self="emit('close')">
      <article class="modal">
        <button class="close-btn" @click="emit('close')" aria-label="닫기">×</button>
        <CharacterDetail :id="id" variant="modal" />
      </article>
    </div>
  </Transition>
</template>

