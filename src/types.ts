export interface Category {
  label: string
  color: string
}

export interface Marker {
  id: string
  x: number
  y: number
  label: string
  category: string
  isReal: boolean
  tags: string[]
  scenarios: string[]
}

export type Filter = { type: 'tag' | 'scenario' | 'category'; value: string }
