# map-viewer

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

## 시나리오 백업 페이지 (비밀번호 보호)

시나리오 로그 백업 HTML을 사이트에 편입하되, 비밀번호를 아는 사람만 열람할 수 있도록
[StatiCrypt](https://github.com/robinmoisson/staticrypt)로 AES-256 암호화해 배포한다.
`public/backups/` 에는 **암호문만** 커밋되므로 public repo여도 안전하다.

### 새 백업 추가 방법

1. 티스토리 편집기(HTML 모드)에서 글 원문을 복사해 `backups-src/<시나리오ID>.html` 로 저장
   (예: `backups-src/s23.html`). 이 폴더는 gitignore 되어 있어 평문이 커밋되지 않는다.
2. `.env` 에 `BACKUP_PASSWORD` 가 설정되어 있는지 확인 (`.env.example` 참고)
3. `npm run backups` 실행 — 티스토리 이미지 매크로 복원, 외부 이미지 다운로드·인라인,
   암호화를 거쳐 `public/backups/` 에 출력된다
4. `src/data/scenarios.json` 의 해당 시나리오에 `"backupLink": "/jcyk_map/backups/<ID>.html"` 추가
5. 커밋 후 `npm run build && npm run deploy`

비밀번호를 바꾸려면 `.env` 수정 후 `npm run backups` 를 다시 실행하면 된다
(`backups-src/` 에 원문이 있는 파일만 재암호화됨).

로컬 확인: `npm run dev` 후 `http://localhost:5173/jcyk_map/backups/s23.html` 접속.
