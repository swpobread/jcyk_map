// avatar.json 의 키가 characters.json / scenarios.json 과 맞는지 검사
import { readFileSync } from 'node:fs'

const load = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)))
const avatars = load('avatar.json')
const characters = load('characters.json')
const scenarios = load('scenarios.json')

const errors = []
for (const id of Object.keys(avatars.default)) {
  if (!characters[id]) errors.push(`default.${id}: characters.json 에 없는 캐릭터`)
}
for (const [sid, cast] of Object.entries(avatars.scenarios)) {
  if (!scenarios[sid]) { errors.push(`scenarios.${sid}: scenarios.json 에 없는 시나리오`); continue }
  for (const cid of Object.keys(cast)) {
    if (!characters[cid]) errors.push(`scenarios.${sid}.${cid}: characters.json 에 없는 캐릭터`)
    else if (!scenarios[sid].characters?.includes(cid)) errors.push(`scenarios.${sid}.${cid}: 시나리오 등장인물 목록에 없음`)
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('avatar.json OK')
