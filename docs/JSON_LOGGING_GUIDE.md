# JSON 로깅 가이드 (앱 개발자용)

ElastAlert² 알람 품질은 **로그가 얼마나 구조화되어 있는지**에 직접적으로 의존합니다.
비구조 `message` 문자열에서 키워드 매칭만 하면 오탐이 잦고, 알람 본문에 컨텍스트가
부족합니다. 이 문서는 K8s 위에서 동작하는 모든 앱이 **JSON 한 줄(JSONL) 포맷으로
stdout에 로그를 출력**하도록 표준을 정의합니다.

---

## 1. 목표 포맷 (ECS 호환)

Elastic Common Schema(ECS)를 따릅니다. 한 줄에 한 JSON 객체.

```json
{"@timestamp":"2026-06-08T13:14:12.611Z","log.level":"ERROR","message":"no bearer token","service.name":"edux-exam","trace.id":"abc123","error.stack_trace":"..."}
```

### 필수 필드

| 필드 | 예시 | 설명 |
|---|---|---|
| `@timestamp` | `"2026-06-08T13:14:12.611Z"` | ISO8601, UTC. 라이브러리가 자동 채움 |
| `log.level` | `"ERROR"` | `DEBUG\|INFO\|WARN\|ERROR\|FATAL` (대문자) |
| `message` | `"no bearer token"` | 사람이 읽는 한 줄 메시지 |
| `service.name` | `"edux-exam"` | 앱 식별자 (환경변수로 주입) |

### 권장 필드

| 필드 | 언제 |
|---|---|
| `trace.id`, `span.id` | APM 연계 시 |
| `error.type` | 예외 클래스명 (`ValueError`, `NullPointerException`) |
| `error.message` | 예외 메시지 |
| `error.stack_trace` | 스택트레이스 (멀티라인은 `\n` 그대로 포함, 별도 필드) |
| `event.dataset` | logger 이름 (`edux.scan`) |
| `host.name`, `kubernetes.*` | Elastic Agent가 자동 주입 — 앱이 신경 X |

> **주의**: 필드명에 점(`.`)을 써도 되고, 중첩 객체로 써도 됩니다 (`{"log":{"level":"ERROR"}}`).
> ingest pipeline에서 평탄화되므로 결과는 같습니다.

---

## 2. 규칙

1. **stdout/stderr로만 출력**한다. 파일/syslog/외부 sink 금지 — K8s가 알아서 수집
2. **한 줄 = 한 JSON 객체** (JSONL). 멀티라인 JSON 금지
3. **`log.level`은 대문자**로 통일
4. **timestamp는 UTC ISO8601** — 라이브러리에 맡기고 직접 포맷팅하지 말 것
5. **`service.name`은 환경변수**(`SERVICE_NAME`)로 주입, 코드에 하드코딩 금지
6. **민감정보 마스킹** — 토큰, 패스워드, 주민번호, 카드번호는 로그에 절대 X
7. **스택트레이스는 별도 필드**(`error.stack_trace`)로. `message`에 합치지 말 것
8. **사람이 보고 디버깅할 정보는 별도 필드**로 빼기 (`user.id`, `request.id` 등).
   `message`에 `"user_id=123, req_id=abc"` 같은 식으로 박지 말 것

---

## 3. 언어별 권장 라이브러리

### Python — `ecs-logging` (Elastic 공식)

```bash
pip install ecs-logging
```

```python
import logging
import ecs_logging

handler = logging.StreamHandler()  # stdout
handler.setFormatter(ecs_logging.StdlibFormatter())

logger = logging.getLogger("edux.scan")
logger.addHandler(handler)
logger.setLevel(logging.INFO)

logger.error("no bearer token", extra={"service.name": "edux-exam", "user.id": 42})

try:
    1 / 0
except Exception:
    logger.exception("scan failed")  # error.stack_trace 자동 채움
```

대안: `structlog` + `structlog.processors.JSONRenderer()`

### Java / Spring Boot — `ecs-logging-java`

`pom.xml`:
```xml
<dependency>
  <groupId>co.elastic.logging</groupId>
  <artifactId>logback-ecs-encoder</artifactId>
  <version>1.6.0</version>
</dependency>
```

`logback-spring.xml`:
```xml
<configuration>
  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="co.elastic.logging.logback.EcsEncoder">
      <serviceName>${SERVICE_NAME:-edux-exam}</serviceName>
    </encoder>
  </appender>
  <root level="INFO">
    <appender-ref ref="STDOUT" />
  </root>
</configuration>
```

### Node.js / TypeScript — `pino` (가장 빠름)

```bash
npm install pino @elastic/ecs-pino-format
```

```javascript
import pino from 'pino';
import ecsFormat from '@elastic/ecs-pino-format';

const logger = pino({
  ...ecsFormat({ serviceName: process.env.SERVICE_NAME || 'edux-exam' }),
});

logger.error({ 'user.id': 42 }, 'no bearer token');

try {
  throw new Error('scan failed');
} catch (err) {
  logger.error({ err }, 'scan failed');  // error.* 자동
}
```

### Go — `log/slog` (Go 1.21+, 표준 라이브러리)

```go
package main

import (
    "log/slog"
    "os"
)

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        ReplaceAttr: func(_ []string, a slog.Attr) slog.Attr {
            // slog의 "time" → ECS "@timestamp"로 rename
            if a.Key == slog.TimeKey { a.Key = "@timestamp" }
            if a.Key == slog.LevelKey { a.Key = "log.level" }
            if a.Key == slog.MessageKey { a.Key = "message" }
            return a
        },
    })).With("service.name", os.Getenv("SERVICE_NAME"))

    logger.Error("no bearer token", "user.id", 42)
}
```

대안: `uber-go/zap` + `zapcore.NewJSONEncoder`

---

## 4. K8s Deployment 권장 설정

모든 Deployment의 컨테이너에 다음 환경변수를 강제합니다:

```yaml
env:
  - name: SERVICE_NAME
    value: edux-exam            # Helm chart에서 자동 주입 권장
  - name: LOG_FORMAT
    value: json                 # 앱 내부에서 JSON/text 분기 시 사용
  - name: LOG_LEVEL
    value: INFO
```

Helm 공통 chart에서 `_helpers.tpl`로 강제하면 모든 서비스가 자동으로 따라옵니다.

---

## 5. 점진적 마이그레이션 전략

기존 앱을 모두 한 번에 바꿀 수 없을 때:

1. **신규 서비스는 무조건 JSON 강제** (PR 머지 시 CI에서 검증)
2. **레거시는 ingest pipeline의 grok**으로 보강 — 흔한 포맷
   (`YYYY-MM-DD HH:MM:SS,sss LEVEL [logger] message`) 정도는 ES에서 분해
3. **메타 룰**(`META_NON_JSON_LOG` 템플릿)로 비JSON 로그가 발생하면 알람 → 우선순위 부여
4. 분기별로 비JSON 로그 비율을 모니터링하고 데드라인 정해 마이그레이션 마감

---

## 6. CI 검증 예시

CI에서 컨테이너를 잠시 띄워 첫 N라인이 모두 valid JSON인지 검증:

```bash
docker run --rm -d --name app-test myapp:latest
sleep 5
docker logs app-test 2>&1 | head -20 | while read line; do
  echo "$line" | jq . > /dev/null 2>&1 || { echo "Non-JSON: $line"; exit 1; }
done
docker stop app-test
```

---

## 7. 자주 묻는 질문

**Q. uvicorn/gunicorn 자체 access log도 JSON이어야 하나요?**
네. uvicorn은 `--log-config logging.json`, gunicorn은 `--logger-class`로 JSON 포맷터 지정.

**Q. 로그 라이브러리 바꾸기가 부담스럽습니다.**
일단 출력만 JSON으로 바꾸면 됩니다. 기존 logger API는 그대로 두고 핸들러/포매터만 교체하면
대부분의 라이브러리는 호환됩니다.

**Q. 멀티라인 스택트레이스가 끊겨서 들어옵니다.**
JSON 한 줄에 `error.stack_trace`로 담으면 K8s 로그 드라이버가 절대 끊지 않습니다.
"한 줄 = 한 객체" 원칙을 지키는 이유가 이것입니다.

**Q. 성능에 영향 없나요?**
pino/zap/slog 같은 라이브러리는 텍스트 로깅보다 더 빠릅니다. Python `logging`은 텍스트와
거의 동일.
