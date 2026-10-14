import scenarioData from '@/data/scenarios.json'
import type { DetailImage } from '@/types'

export interface Scenario {
  title: string
  writer?: string
  rule?: string
  description?: string
  period?: string
  characters?: string[]
  scenarioLink?: string
  backupLink?: string
  image?: DetailImage
}

export const scenarios = scenarioData as Record<string, Scenario>

export const scenarioTitle = (id: string) => scenarios[id]?.title ?? id

/** 기간 정렬 키: "2020.11.06 ~ 2020.11.13" → "2020.11.06" */
export const periodKey = (p?: string) => (p ?? '').split('~')[0]?.trim() ?? ''
