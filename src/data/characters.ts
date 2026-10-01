import characterData from '@/data/characters.json'

export interface Character {
  name: string
  original?: string
  nickname?: string
  era?: string
  /** PC 여부 (PC → 전체 페이지, NPC → 모달) */
  playable?: boolean
  age?: number
  birth?: string
  birthplace?: string
  summary?: string
  height?: number
  description?: string
  image?: string
}

export const characters = characterData as Record<string, Character>

export const characterName = (id: string) => characters[id]?.name ?? id
