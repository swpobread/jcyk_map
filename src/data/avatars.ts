import avatarData from '@/data/avatar.json'
import scenarioData from '@/data/scenarios.json'

export interface Avatar {
  src: string
  /** 출처 (작가명 등) */
  credit?: string
  label?: string
}
type AvatarMap = Record<string, Avatar[]>

const data = avatarData as { default: AvatarMap; scenarios: Record<string, AvatarMap> }
const scenarios = scenarioData as Record<string, { title: string; period?: string }>

const periodKey = (p?: string) => (p ?? '').split('~')[0]?.trim() ?? ''

/** 시나리오와 무관한 기본 아바타 */
export const defaultAvatars = (charId: string): Avatar[] => data.default[charId] ?? []

/** 시나리오 등장인물별 아바타 */
export const castAvatars = (scenarioId: string): AvatarMap => data.scenarios[scenarioId] ?? {}

/** 대표 아바타: 첫 번째 기본 아바타 */
export const mainAvatar = (charId: string): Avatar | undefined => defaultAvatars(charId)[0]

/** 캐릭터가 등장한 시나리오별 아바타 (기간순) */
export const scenarioAvatarsOf = (charId: string) =>
  Object.entries(data.scenarios)
    .filter(([, cast]) => cast[charId]?.length)
    .map(([id, cast]) => ({ id, title: scenarios[id]?.title ?? id, period: scenarios[id]?.period, avatars: cast[charId]! }))
    .sort((a, b) => periodKey(a.period).localeCompare(periodKey(b.period)))
