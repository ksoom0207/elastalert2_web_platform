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
    // The template picks the index per metric type below, so the frontend hides its
    // top-level Index pattern input for this template.
    overridesIndex: true,
    defaultIndex: '.ds-metrics-system.cpu-default-*',
    fields: [
      { name: 'metricType', label: '메트릭 종류', type: 'select', required: true, default: 'CPU',
        options: [
          { value: 'CPU',    label: 'CPU 사용률' },
          { value: 'MEM',    label: '메모리 사용률' },
          { value: 'DISK',   label: '디스크 사용률' },
          { value: 'CUSTOM', label: '기타 (직접 입력)' },
        ] },
      // Shown only for CUSTOM
      { name: 'customIndex', label: '인덱스 패턴 (직접)', type: 'text', required: true,
        default: '.ds-metrics-*', showWhen: { field: 'metricType', values: ['CUSTOM'] } },
      { name: 'customField', label: '메트릭 필드 (직접)', type: 'text', required: true,
        default: 'system.cpu.total.norm.pct', showWhen: { field: 'metricType', values: ['CUSTOM'] } },
      // Shown only for DISK — ES `regexp` query (Lucene syntax, no lookaheads).
      { name: 'diskMountRegex', label: '마운트 포인트 regex (빈값=전체)', type: 'text', required: false,
        default: '/(root|data|var|home|opt)(/.*)?',
        showWhen: { field: 'metricType', values: ['DISK'] } },
      { name: 'threshold', label: '임계치 (0~1, 초과 시 알람)', type: 'number', default: 0.9, required: true },
      { name: 'host', label: 'host.name 필터값 (예: "ofs-" 또는 "web-01", 빈값=전체)', type: 'text', required: false },
      { name: 'hostMatch', label: 'host 매칭 방식', type: 'select', required: false, default: 'prefix',
        options: [
          { value: 'prefix',   label: 'prefix — 앞부분 일치 (예: "ofs-" → ofs-01, ofs-02...)' },
          { value: 'exact',    label: 'exact — 정확히 일치' },
          { value: 'wildcard', label: 'wildcard — * 와일드카드 사용 (예: "*-prod")' },
        ] },
      { name: 'queryKey', label: 'query_key (호스트별 개별 평가)', type: 'select', required: false, default: 'host.name',
        options: [
          { value: 'host.name', label: 'host.name 별로 평가 (추천)' },
          { value: '',          label: '없음 — 전체 평균으로 평가' },
        ] },
      { name: 'metricFormat', label: '값 표시 포맷 (Python format, 예: {:.1%} → 45.7%, 비우면 원본값)',
        type: 'text', required: false, default: '{:.1%}' },
      { name: 'bufferMinutes', label: '집계 시간 (분)', type: 'number', default: 5, required: true },
      { name: 'realertMinutes', label: '동일 알람 반복 방지 (분)', type: 'number', default: 15, required: false },
      { name: 'alertText', label: 'alert_text — 알림 본문 (비워두면 메트릭 종류별 기본 포맷 사용)',
        type: 'textarea', required: false },
      { name: 'alertTextArgs',
        label: 'alert_text_args (쉼표 구분, "metric_value"는 실제 집계 필드로 자동 치환됨, 비우면 기본 사용)',
        type: 'text', required: false },
    ],
    build(p) {
      const MAPPING = {
        CPU:  { index: '.ds-metrics-system.cpu-default-*',        field: 'system.cpu.total.norm.pct' },
        MEM:  { index: '.ds-metrics-system.memory-default-*',     field: 'system.memory.actual.used.pct' },
        DISK: { index: '.ds-metrics-system.filesystem-default-*', field: 'system.filesystem.used.pct',
                mountField: 'system.filesystem.mount_point' },
      };
      // metricType별로 알림 본문/args 기본값을 바꿉니다. 사용자가 폼에서 명시적으로
      // 입력한 값이 있으면 그것이 우선 (아래 effective 체크 참조).
      const BODY_DEFAULTS = {
        CPU: {
          text: '⚠ *CPU 사용률 임계치 초과*\n\n📅 {0}\n🖥️ 호스트: {1}\n📈 값: {2}',
          args: 'timestamp_kst,host.name,metric_value',
        },
        MEM: {
          text: '⚠ *메모리 사용률 임계치 초과*\n\n📅 {0}\n🖥️ 호스트: {1}\n📈 값: {2}',
          args: 'timestamp_kst,host.name,metric_value',
        },
        DISK: {
          text: '⚠ *디스크 사용률 임계치 초과*\n\n📅 {0}\n🖥️ 호스트: {1}\n💾 마운트: {2}\n📈 값: {3}',
          args: 'timestamp_kst,host.name,system.filesystem.mount_point,metric_value',
        },
        CUSTOM: {
          text: '⚠ *서버 메트릭 임계치 초과*\n\n📅 {0}\n🖥️ 호스트: {1}\n📊 지표: {2}\n📈 값: {3}',
          args: 'timestamp_kst,host.name,metric_agg_key,metric_value',
        },
      };
      const type = p.metricType || 'CPU';
      const mapping = MAPPING[type];
      const index = mapping ? mapping.index : (p.customIndex || '.ds-metrics-*');
      const field = mapping ? mapping.field : (p.customField || 'system.cpu.total.norm.pct');

      const filters = [];
      if (p.host) {
        const match = p.hostMatch || 'prefix';
        if (match === 'exact') {
          filters.push({ term: { 'host.name': p.host } });
        } else if (match === 'wildcard') {
          filters.push({ wildcard: { 'host.name': p.host } });
        } else {
          // prefix (default). Strip a trailing '*' if the user wrote 'ofs-*' by habit.
          filters.push({ prefix: { 'host.name': p.host.replace(/\*+$/, '') } });
        }
      }
      if (type === 'DISK' && p.diskMountRegex) {
        filters.push({ regexp: { [mapping.mountField]: p.diskMountRegex } });
      }

      const rule = {
        // Overrides the top-level `index` set from rule.esIndex (see renderRuleObject).
        index,
        type: 'metric_aggregation',
        metric_agg_key: field,
        metric_agg_type: 'avg',
        buffer_time: { minutes: Number(p.bufferMinutes ?? 5) },
        max_threshold: Number(p.threshold ?? 0.9),
        match_enhancements: ['kst_enhancer.KSTEnhancement'],
        filter: filters,
      };

      if (p.queryKey) {
        // DISK: a host usually has multiple mounts (/, /data, /var/log …). A single
        // host.name query_key would average them together and dilute spikes on one
        // mount. Use a compound key so each (host, mount) pair is evaluated separately.
        rule.query_key = (type === 'DISK' && p.queryKey === 'host.name')
          ? ['host.name', mapping.mountField]
          : p.queryKey;
      }
      if (p.realertMinutes) rule.realert = { minutes: Number(p.realertMinutes) };

      // ElastAlert2 writes the formatted value to `metric_<key>_<type>_formatted`.
      if (p.metricFormat) rule.metric_format_string = p.metricFormat;
      const valueField = `metric_${field}_avg${p.metricFormat ? '_formatted' : ''}`;

      // Pick alert body/args: user's input wins; otherwise fall back to the
      // metric-specific default (DISK shows mount_point, etc.).
      const bodyDefault = BODY_DEFAULTS[type] || BODY_DEFAULTS.CUSTOM;
      const alertText = p.alertText || bodyDefault.text;
      const alertTextArgs = p.alertTextArgs || bodyDefault.args;

      rule.alert_text_type = 'alert_text_only';
      rule.alert_text = alertText;
      rule.alert_text_args = alertTextArgs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        // ElastAlert2's metric_aggregation stores the aggregated value under
        // `metric_<metric_agg_key>_<metric_agg_type>` (we always use `avg`).
        // The literal token `metric_value` is a convenience alias we expand
        // here so the default alert_text_args works for any metricType.
        .map((s) => (s === 'metric_value' ? valueField : s));

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
    overridesIndex: !!t.overridesIndex,
    fields: t.fields,
  }));
}
