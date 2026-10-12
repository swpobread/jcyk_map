# backups-src

시나리오 백업 HTML **원문**(티스토리 편집기에서 복사한 HTML)을 이 폴더에 `s23.html` 처럼
시나리오 ID 이름으로 저장한다. 이 폴더의 HTML은 **git에 커밋되지 않는다** (평문 보호).

`npm run backups` 를 실행하면 이미지 인라인 + 암호화를 거쳐 `public/backups/` 에
암호화된 파일이 생성되고, 그 파일만 커밋/배포된다.

비밀번호는 프로젝트 루트 `.env` 의 `BACKUP_PASSWORD` (`.env.example` 참고).
