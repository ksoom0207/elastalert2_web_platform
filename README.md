# ElastAlert2 Web Platform

ElastAlert2 룰을 웹에서 관리하고 Slack / Mattermost 로 알림을 보내는 셀프서비스 플랫폼.
관리자는 `config.yaml`(베이스 설정)을 관리하고, developer는 **룰만** 생성/관리합니다.

## 아키텍처

```
React(Vite) ──> Express API ──> PostgreSQL (룰 메타데이터)
   │                │
   │ Keycloak       └─ 활성 룰을 YAML 로 렌더링 ──> ./elastalert/rules (공유 볼륨)
   │ (OIDC)                                              │
   └──────────────────────────────────────────> ElastAlert2 (run_every 마다 스캔)
```

- **저장**: 룰 메타데이터는 DB. 활성화된 룰만 `rules_folder` 에 YAML 로 렌더링.
- **반영**: ElastAlert2 가 `run_every`(기본 1분) 주기로 폴더를 스캔 → 추가/수정/활성/비활성 자동 반영.
- **인증**: Keycloak OIDC. realm role `admin` / `developer`.
- **테스트 알람**: `elastalert-test-rule` 를 ElastAlert2 컨테이너 안에서 실행하는 실데이터 dry-run.

## 권한 모델

| 기능 | developer | admin |
|---|---|---|
| 룰 CRUD / 활성·비활성 / 테스트 | 본인 룰만 | 전체 |
| 기본 webhook 설정 | ✕ | ○ |
| config.yaml 관리 | ✕ (파일로 직접) | ○ |

## 기능

- 룰 추가 / 수정 / 삭제 / 활성화 / 비활성화 / 테스트 알람
- 템플릿 3종: **K8s ERROR 로그**, **APM 500 에러**, **서버 메트릭 한계치** (폼으로 변수 입력)
- Custom: raw YAML 직접 작성 (임의 alerter 허용)
- Alerter: Slack / Mattermost 선택
  - `*_channel_override`, `*_username_override`
  - `*_msg_color`: `good | warning | danger | #HEX`
  - rule별 webhook override (비우면 관리자 기본 webhook 사용)

## 실행

```bash
cp .env.example .env
docker compose up -d --build
```

- 프론트엔드: http://localhost:8081
- 백엔드 API: http://localhost:4000
- Keycloak: http://localhost:8080 (admin/admin)

### Keycloak 초기 설정 (최초 1회)

`keycloak/` 에 realm export(json)를 두면 자동 import 됩니다. 수동 설정 시:

1. realm `elastalert` 생성
2. client `elastalert-web` 생성 (public, PKCE S256, redirect `http://localhost:8081/*`)
3. realm role `admin`, `developer` 생성 후 사용자에게 부여

## 디렉토리

```
backend/    Express API (Prisma, OIDC 검증, YAML 렌더, 테스트 러너)
frontend/   React + Vite (룰 목록/편집, webhook 설정)
elastalert/ config.yaml(관리자) + rules/(렌더링된 룰, 공유 볼륨)
```

## 남은 결정 / TODO

- **Keycloak realm export** 파일 추가 (현재는 수동 설정 안내만 포함).
- **Elasticsearch**: compose 에 ES 미포함 — 사내 클러스터 주소를 `config.yaml`/env 로 연결.
- **테스트 dry-run**: 백엔드가 `docker.sock` 으로 `docker exec` → 운영에서는 권한 최소화 검토 필요.
- **즉시 반영**이 필요하면 `run_every` 대기 대신 ElastAlert2 재시작 트리거 옵션 추가 고려.
- 프로덕션은 `prisma db push` 대신 커밋된 마이그레이션(`prisma migrate deploy`) 사용 권장.
```
