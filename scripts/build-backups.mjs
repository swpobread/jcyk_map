// 백업 HTML 빌드: backups-src/*.html (티스토리 원문) →
//   1) 티스토리 [##_Image|kage@...] 매크로를 <img>로 복원
//   2) 외부 이미지를 다운로드해 data URI로 인라인 (작은 아바타는 리사이즈, 반복 이미지는 JS 맵으로 1회만 포함)
//   3) 완전한 HTML 문서로 래핑
//   4) staticrypt(AES-256)로 암호화해 public/backups/에 출력
// 사용법: BACKUP_PASSWORD를 .env에 설정한 뒤 `npm run backups`
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = path.join(root, 'backups-src')
const OUT_DIR = path.join(root, 'public', 'backups')
const STATICRYPT = path.join(root, 'node_modules', '.bin', 'staticrypt')

try { process.loadEnvFile(path.join(root, '.env')) } catch { /* .env 없으면 셸 환경변수 사용 */ }
const PASSWORD = process.env.BACKUP_PASSWORD
if (!PASSWORD) {
  console.error('BACKUP_PASSWORD가 없습니다. .env 파일에 BACKUP_PASSWORD=... 를 설정하세요.')
  process.exit(1)
}

const scenarios = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'scenarios.json'), 'utf8'))

const unescapeHtml = (s) => s.replaceAll('&amp;', '&')
const escapeHtml = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

// [##_Image|kage@<경로>|CDM|1.3|{...}_##] → blog.kakaocdn.net 실제 URL
function restoreTistoryImages(html) {
  html = html.replace(/\[##_Image\|kage@(.+?)\|.*?_##\]/gs, (_, p) =>
    `<img src="https://blog.kakaocdn.net/dna/${p.trim()}" alt="">`)
  const leftover = html.match(/\[##_\w+/g)
  if (leftover) console.warn(`  ⚠ 처리되지 않은 티스토리 매크로: ${[...new Set(leftover)].join(', ')}`)
  return html
}

async function fetchImage(url) {
  const res = await fetch(unescapeHtml(url), { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const mime = (res.headers.get('content-type') || 'image/png').split(';')[0]
  return { buf: Buffer.from(await res.arrayBuffer()), mime }
}

// 모든 참조가 max-width ≤ 64px인 이미지(채팅 아바타 등)는 2배 크기 webp로 축소
function displayWidth(html, url) {
  const widths = []
  for (const tag of html.matchAll(/<img[^>]*>/g)) {
    if (!tag[0].includes(`src="${url}"`)) continue
    const m = tag[0].match(/max-width:\s*(\d+)px/)
    widths.push(m ? Number(m[1]) : Infinity)
  }
  return Math.max(...widths, 0)
}

async function inlineImages(html) {
  const urls = [...new Set([...html.matchAll(/src="(https?:\/\/[^"]+)"/g)].map((m) => m[1]))]
  const script = []
  for (const url of urls) {
    const count = html.split(`src="${url}"`).length - 1
    let dataUri
    try {
      let { buf, mime } = await fetchImage(url)
      const w = displayWidth(html, url)
      if (w <= 64) {
        buf = await sharp(buf).resize({ width: w * 2, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
        mime = 'image/webp'
      }
      dataUri = `data:${mime};base64,${buf.toString('base64')}`
      console.log(`  ✓ ${url.slice(0, 70)}… ×${count} (${(dataUri.length / 1024).toFixed(0)}KB${w <= 64 ? ', 리사이즈' : ''})`)
    } catch (e) {
      console.warn(`  ⚠ 다운로드 실패, 외부 URL 유지: ${url.slice(0, 70)}… (${e.message})`)
      continue
    }
    if (count === 1) {
      html = html.replace(`src="${url}"`, `src="${dataUri}"`)
    } else {
      const key = `b${script.length}`
      html = html.replaceAll(`src="${url}"`, `src="" data-bk="${key}"`)
      script.push(`${key}:"${dataUri}"`)
    }
  }
  if (script.length) {
    html += `\n<script>(function(){var m={${script.join(',')}};` +
      `document.querySelectorAll("img[data-bk]").forEach(function(i){i.src=m[i.dataset.bk]})})()</` + `script>`
  }
  return html
}

function wrapDocument(content, id) {
  const sc = scenarios[id]
  const title = sc ? `${sc.title} — 백업` : `${id} — 백업`
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>
body{margin:0;font-family:"Apple SD Gothic Neo","Malgun Gothic",sans-serif;line-height:1.7;color:#111;background:#f5f2ec}
.site-bar{position:sticky;top:0;z-index:1000;display:flex;align-items:baseline;gap:12px;padding:12px 16px;background:rgba(245,242,236,0.92);backdrop-filter:blur(6px);border-bottom:1px solid rgba(0,0,0,0.10)}
.site-bar a{color:#111;text-decoration:none;font-weight:600;font-size:14px}
.site-bar a:hover{text-decoration:underline}
.site-bar span{color:rgba(17,17,17,0.58);font-size:13px}
main{max-width:860px;margin:0 auto;padding:32px 16px}
img{max-width:100%;height:auto}
</style>
</head>
<body>
<header class="site-bar">
  <a href="/jcyk_map/">← 현상 기록</a>
  <span>${escapeHtml(sc ? sc.title : id)} — 백업 로그</span>
</header>
<main>
${content}
</main>
</body>
</html>`
}

function encrypt(plainPath, id) {
  const sc = scenarios[id]
  execFileSync(STATICRYPT, [
    plainPath, '-d', OUT_DIR, '--short', '--remember', '365',
    '-c', '.staticrypt.json',
    '--template-title', sc ? sc.title : id,
    '--template-instructions', '열람 비밀번호를 입력하세요.',
    '--template-button', '열기',
    '--template-placeholder', '비밀번호',
    '--template-error', '비밀번호가 올바르지 않습니다.',
    '--template-remember', '이 브라우저에서 기억하기',
    '--template-color-primary', '#444444',
    '--template-color-secondary', '#ece7dd',
  ], { cwd: root, env: { ...process.env, STATICRYPT_PASSWORD: PASSWORD }, stdio: 'inherit' })
}

const files = fs.existsSync(SRC_DIR) ? fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.html')) : []
if (!files.length) {
  console.error(`${SRC_DIR} 에 처리할 .html 파일이 없습니다.`)
  process.exit(1)
}
fs.mkdirSync(OUT_DIR, { recursive: true })
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'backups-'))
try {
  for (const file of files) {
    const id = path.basename(file, '.html')
    console.log(`${file} 처리 중…`)
    let html = fs.readFileSync(path.join(SRC_DIR, file), 'utf8')
    html = restoreTistoryImages(html)
    html = await inlineImages(html)
    html = wrapDocument(html, id)
    const plainPath = path.join(tmp, file)
    fs.writeFileSync(plainPath, html)
    encrypt(plainPath, id)
    const size = fs.statSync(path.join(OUT_DIR, file)).size
    console.log(`  → public/backups/${file} (${(size / 1024 / 1024).toFixed(2)}MB, 암호화됨)\n`)
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
