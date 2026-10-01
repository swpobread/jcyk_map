const base = import.meta.env.BASE_URL

/** 외부 URL은 그대로, 상대 경로는 BASE_URL 기준으로 */
export const resolveImg = (src: string) => (src.startsWith('http') ? src : base + src)

export const splitParagraphs = (text?: string) =>
  (text ?? '').split('\n').map((p) => p.trim()).filter(Boolean)

export const initial = (name: string) => name.trim().charAt(0)
