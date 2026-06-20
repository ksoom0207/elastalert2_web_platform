// Built-in rule templates. Each template declares the form fields the frontend
// renders, plus a `build(params)` that returns the ElastAlert2-specific portion
// of the rule (everything except name/index/alerter, which are added later).
//
// Field types: text | number | duration | textarea | select

// ElastAlert2 rule types available as dropdown options.
const RULE_TYPE_OPTIONS = [
  { value: 'any', label: 'any — 조건 매치 시 즉시' },
  { value: 'frequency', label: 'frequency — N건/시간 초과' },
  { value: 'flatline', label: 'flatline — N건 미만 (로그 누락)' },
  { value: 'spike', label: 'spike — 급증/급감' },
  { value: 'change', label: 'change — 필드 값 변경' },
  { value: 'new_term', label: 'new_term — 새 값 출현' },
  { value: 'cardinality', label: 'cardinality — 고유 값 수' },
  { value: 'percentage_match', label: 'percentage_match — 비율' },
];

// Fields that appear/hide depending on the selected rule type.
// `showWhen` lists which ruleType values make the field visible.
const RULE_TYPE_FIELDS = [
  { name: 'numEvents', label: '임계 건수 (num_events)', type: 'number', default: 5, required: true,
    showWhen: ['frequency'] },
  { name: 'threshold', label: '최소 건수 (threshold, 이 이하면 알림)', type: 'number', default: 1, required: true,
    showWhen: ['flatline'] },
  { name: 'spikeHeight', label: 'spike 배수 (spike_height)', type: 'number', default: 3, required: true,
    showWhen: ['spike'] },
  { name: 'spikeType', label: 'spike 방향 (spike_type)', type: 'select', default: 'up', required: true,
    options: [{ value: 'up', label: 'up — 급증' }, { value: 'down', label: 'down — 급감' }, { value: 'both', label: 'both — 둘 다' }],
    showWhen: ['spike'] },
  { name: 'compareKey', label: '비교 필드 (compare_key)', type: 'text', default: 'status', required: true,
    showWhen: ['change'] },
  { name: 'newTermFields', label: '감시 필드 (쉼표 구분)', type: 'text', default: '', required: true,
    showWhen: ['new_term'] },
  { name: 'cardinalityField', label: 'cardinality 필드', type: 'text', default: '', required: true,
    showWhen: ['cardinality'] },
  { name: 'maxCardinality', label: '최대 고유 값 수 (max_cardinality)', type: 'number', default: 100, required: true,
    showWhen: ['cardinality'] },
  { name: 'minPercentage', label: '최소 비율 (min_percentage)', type: 'number', default: 50, required: true,
    showWhen: ['percentage_match'] },
  { name: 'timeframeMinutes', label: '집계 시간(분)', type: 'number', default: 5, required: true,
    showWhen: ['frequency', 'flatline', 'spike', 'change', 'new_term', 'cardinality', 'percentage_match'] },
  { name: 'realertMinutes', label: '동일 알람 반복 방지(분)', type: 'number', default: 5, required: false,
    showWhen: ['any', 'frequency', 'flatline', 'spike', 'change', 'new_term', 'cardinality', 'percentage_match'] },
];

// Helper: attach type-dependent timing fields to the rule object.
function applyRuleType(rule, p) {
  const ruleType = p.ruleType || 'frequency';
  rule.type = ruleType;

  switch (ruleType) {
    case 'frequency':
      rule.num_events = Number(p.numEvents ?? 5);
      rule.timeframe = { minutes: Number(p.timeframeMinutes ?? 5) };
      break;
    case 'flatline':
      rule.threshold = Number(p.threshold ?? 1);
      rule.timeframe = { minutes: Number(p.timeframeMinutes ?? 5) };
      break;
    case 'spike':
      rule.spike_height = Number(p.spikeHeight ?? 3);
      rule.spike_type = p.spikeType || 'up';
      rule.timeframe = { minutes: Number(p.timeframeMinutes ?? 5) };
      break;
    case 'any':
      break;
    case 'change':
      rule.compare_key = p.compareKey || 'status';
      rule.timeframe = { minutes: Number(p.timeframeMinutes ?? 5) };
      break;
    case 'new_term':
      rule.fields = (p.newTermFields || '').split(',').map((s) => s.trim()).filter(Boolean);
      rule.timeframe = { minutes: Number(p.timeframeMinutes ?? 1440) };
      break;
    case 'cardinality':
      rule.cardinality_field = p.cardinalityField || '';
      rule.max_cardinality = Number(p.maxCardinality ?? 100);
      rule.timeframe = { minutes: Number(p.timeframeMinutes ?? 5) };
      break;
    case 'percentage_match':
      rule.min_percentage = Number(p.minPercentage ?? 50);
      rule.timeframe = { minutes: Number(p.timeframeMinutes ?? 5) };
      break;
    default:
      rule.timeframe = { minutes: Number(p.timeframeMinutes ?? 5) };
  }

  if (p.realertMinutes) rule.realert = { minutes: Number(p.realertMinutes) };

  return rule;
}

export const TEMPLATES = {
  K8S_ERROR: {
    key: 'K8S_ERROR',
    label: 'K8s 애플리케이션 ERROR 로그 수집',
    description: 'log.level: ERROR 로그가 임계치 이상 발생하면 알림 (KST 타임스탬프 포함)',
    defaultIndex: '.ds-logs-kubernetes.container_logs-default-*',
    fields: [
      { name: 'ruleType', label: 'Rule Type', type: 'select', required: true, default: 'frequency', options: RULE_TYPE_OPTIONS },
      { name: 'namespace', label: 'Kubernetes namespace', type: 'text', required: false },
      { name: 'app', label: '애플리케이션 라벨 (kubernetes.labels.app)', type: 'text', required: false },
      ...RULE_TYPE_FIELDS,
      { name: 'alertText', label: 'alert_text (알림 본문 템플릿)', type: 'textarea', required: false,
        default: '🚨 *에러 감지*\n\n📅 발생 시각: {0}\n🐳 파드: {1}\n🖥️ 노드: {2}\n\n📋 메시지:\n{3}' },
      { name: 'alertTextArgs', label: 'alert_text_args (쉼표 구분)', type: 'text', required: false,
        default: 'timestamp_kst,kubernetes.pod.name,kubernetes.node.name,message' },
    ],
    build(p) {
      const filters = [{ query: { query_string: { query: 'log.level:ERROR OR level:ERROR' } } }];
      if (p.namespace) filters.push({ term: { 'kubernetes.namespace': p.namespace } });
      if (p.app) filters.push({ term: { 'kubernetes.labels.app': p.app } });

      const rule = {
        filter: filters,
        timestamp_field: '@timestamp',
        timestamp_type: 'iso',
        match_enhancements: ['kst_enhancer.KSTEnhancement'],
        alert_text_type: 'alert_text_only',
      };

      applyRuleType(rule, p);

      rule.alert_text = p.alertText || '🚨 *에러 감지*\n\n📅 발생 시각: {0}\n🐳 파드: {1}\n🖥️ 노드: {2}\n\n📋 메시지:\n{3}';
      const argsStr = p.alertTextArgs || 'timestamp_kst,kubernetes.pod.name,kubernetes.node.name,message';
      rule.alert_text_args = argsStr.split(',').map((s) => s.trim()).filter(Boolean);

      return rule;
    },
  },

  APM_500: {
    key: 'APM_500',
    label: 'APM HTTP 500 에러 수집',
    description: 'APM 서비스에서 HTTP 500 에러 발생 시 알림',
    defaultIndex: 'traces-apm-*',
    fields: [
      { name: 'ruleType', label: 'Rule Type', type: 'select', required: true, default: 'any', options: RULE_TYPE_OPTIONS },
      { name: 'services', label: 'service.name (쉼표 구분, 복수 가능)', type: 'text', required: true, default: '' },
      { name: 'statusCode', label: 'HTTP 상태 코드', type: 'number', default: 500, required: true },
      ...RULE_TYPE_FIELDS,
      { name: 'alertText', label: 'alert_text (알림 본문 템플릿)', type: 'textarea', required: false,
        default: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🚨 *HTTP 500 에러 발생*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📍 *서비스*: `{0}`\n🌐 *환경*: `{1}`\n📡 *API*: `{2} {3}`\n🔗 *URL*: `{4}`\n⚠️ *상태코드*: `{5}`\n🖥️ *호스트*: `{6}`\n🕐 *발생시각*: `{7}`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' },
      { name: 'alertTextArgs', label: 'alert_text_args (쉼표 구분)', type: 'text', required: false,
        default: 'service.name,service.environment,http.request.method,transaction.name,url.full,http.response.status_code,host.name,@timestamp' },
    ],
    build(p) {
      const serviceList = (p.services || '')
        .split(',').map((s) => s.trim()).filter(Boolean);

      const filters = [];
      if (serviceList.length > 0) {
        filters.push({ terms: { 'service.name': serviceList } });
      }
      filters.push({ term: { 'http.response.status_code': Number(p.statusCode ?? 500) } });

      const alertText = p.alertText ||
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🚨 *HTTP 500 에러 발생*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📍 *서비스*: `{0}`\n🌐 *환경*: `{1}`\n📡 *API*: `{2} {3}`\n🔗 *URL*: `{4}`\n⚠️ *상태코드*: `{5}`\n🖥️ *호스트*: `{6}`\n🕐 *발생시각*: `{7}`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

      const argsStr = p.alertTextArgs ||
        'service.name,service.environment,http.request.method,transaction.name,url.full,http.response.status_code,host.name,@timestamp';

      const rule = {
        filter: filters,
        include: [
          'service.name',
          'service.environment',
          'transaction.name',
          'http.request.method',
          'url.full',
          'http.response.status_code',
          'host.name',
          '@timestamp',
        ],
        timestamp_field: '@timestamp',
        timestamp_type: 'iso',
        timestamp_format: '%Y-%m-%dT%H:%M:%S.%fZ',
        alert_text_type: 'alert_text_only',
        alert_text: alertText,
        alert_text_args: argsStr.split(',').map((s) => s.trim()).filter(Boolean),
      };

      applyRuleType(rule, p);

      return rule;
    },
  },

  SERVER_METRIC: {
    key: 'SERVER_METRIC',
    label: '서버 메트릭 한계치 알람',
    description: '지정 메트릭이 임계치를 초과하면 알림 (metric_aggregation)',
    defaultIndex: 'metricbeat-*',
    fields: [
      { name: 'metricField', label: '메트릭 필드', type: 'text', default: 'system.cpu.total.pct', required: true },
      { name: 'threshold', label: '임계치(초과 시 알람)', type: 'number', default: 0.9, required: true },
      { name: 'host', label: 'host.name (선택)', type: 'text', required: false },
      { name: 'bufferMinutes', label: '집계 버퍼(분)', type: 'number', default: 5, required: true },
    ],
    build(p) {
      const filters = [];
      if (p.host) filters.push({ term: { 'host.name': p.host } });
      return {
        type: 'metric_aggregation',
        metric_agg_key: p.metricField || 'system.cpu.total.pct',
        metric_agg_type: 'avg',
        buffer_time: { minutes: Number(p.bufferMinutes ?? 5) },
        max_threshold: Number(p.threshold ?? 0.9),
        filter: filters,
      };
    },
  },

  META_NON_JSON_LOG: {
    key: 'META_NON_JSON_LOG',
    label: 'Meta: 비JSON 로그 감지 (마이그레이션 추적용)',
    description:
      'message 필드가 "{"로 시작하지 않는 로그를 감지해 알람. JSON 로깅 가이드 미준수 서비스 추적용.',
    defaultIndex: '.ds-logs-kubernetes.container_logs-default-*',
    fields: [
      { name: 'ruleType', label: 'Rule Type', type: 'select', required: true, default: 'frequency', options: RULE_TYPE_OPTIONS },
      { name: 'namespace', label: 'Kubernetes namespace (선택)', type: 'text', required: false },
      { name: 'app', label: '애플리케이션 라벨 (kubernetes.labels.app, 선택)', type: 'text', required: false },
      { name: 'excludePatterns', label: '제외 패턴 (쉼표 구분, message에 포함되면 무시)', type: 'text', required: false,
        default: 'GET /,POST /,HTTP/1.1' },
      ...RULE_TYPE_FIELDS,
      { name: 'alertText', label: 'alert_text (알림 본문 템플릿)', type: 'textarea', required: false,
        default: '⚠ *비JSON 로그 감지* — JSON 로깅 가이드 미준수\n\n📅 발생 시각: {0}\n🐳 파드: {1}\n📦 네임스페이스: {2}\n🏷️ 앱: {3}\n\n📋 메시지:\n{4}\n\n➡ docs/JSON_LOGGING_GUIDE.md 참고하여 JSON 포맷으로 마이그레이션 부탁드립니다.' },
      { name: 'alertTextArgs', label: 'alert_text_args (쉼표 구분)', type: 'text', required: false,
        default: 'timestamp_kst,kubernetes.pod.name,kubernetes.namespace,kubernetes.labels.app,message' },
    ],
    build(p) {
      // `message:/{.*/` 는 message가 JSON 객체로 시작하는 것을 의미.
      // NOT으로 감싸 비JSON만 잡고, 빈 message는 must_not exists로 추가 제외.
      const filters = [
        {
          bool: {
            must: [{ exists: { field: 'message' } }],
            must_not: [{ query_string: { query: 'message:/\\{.*/' } }],
          },
        },
      ];
      if (p.namespace) filters.push({ term: { 'kubernetes.namespace': p.namespace } });
      if (p.app) filters.push({ term: { 'kubernetes.labels.app': p.app } });

      const excludes = (p.excludePatterns || '')
        .split(',').map((s) => s.trim()).filter(Boolean);
      if (excludes.length > 0) {
        filters.push({
          bool: {
            must_not: excludes.map((kw) => ({ match_phrase: { message: kw } })),
          },
        });
      }

      const rule = {
        filter: filters,
        timestamp_field: '@timestamp',
        timestamp_type: 'iso',
        match_enhancements: ['kst_enhancer.KSTEnhancement'],
        alert_text_type: 'alert_text_only',
      };

      applyRuleType(rule, p);

      rule.alert_text = p.alertText ||
        '⚠ *비JSON 로그 감지*\n\n📅 발생 시각: {0}\n🐳 파드: {1}\n📦 네임스페이스: {2}\n🏷️ 앱: {3}\n\n📋 메시지:\n{4}';
      const argsStr = p.alertTextArgs ||
        'timestamp_kst,kubernetes.pod.name,kubernetes.namespace,kubernetes.labels.app,message';
      rule.alert_text_args = argsStr.split(',').map((s) => s.trim()).filter(Boolean);

      return rule;
    },
  },

  CUSTOM: {
    key: 'CUSTOM',
    label: 'Custom (직접 YAML 작성)',
    description: '템플릿 없이 임의의 alerter/조건을 직접 YAML로 작성',
    defaultIndex: '',
    fields: [],
    build() {
      // Custom rules are produced entirely from rawYaml; see ruleRenderer.
      return {};
    },
  },
};

export function listTemplates() {
  return Object.values(TEMPLATES).map((t) => ({
    key: t.key,
    label: t.label,
    description: t.description,
    defaultIndex: t.defaultIndex,
    fields: t.fields,
  }));
}
