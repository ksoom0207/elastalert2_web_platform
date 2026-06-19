// Built-in rule templates. Each template declares the form fields the frontend
// renders, plus a `build(params)` that returns the ElastAlert2-specific portion
// of the rule (everything except name/index/alerter, which are added later).
//
// Field types: text | number | duration | textarea | select

export const TEMPLATES = {
  K8S_ERROR: {
    key: 'K8S_ERROR',
    label: 'K8s 애플리케이션 ERROR 로그 수집',
    description: 'log.level: ERROR 로그가 임계치 이상 발생하면 알림 (KST 타임스탬프 포함)',
    defaultIndex: '.ds-logs-kubernetes.container_logs-default-*',
    fields: [
      { name: 'namespace', label: 'Kubernetes namespace', type: 'text', required: false },
      { name: 'app', label: '애플리케이션 라벨 (kubernetes.labels.app)', type: 'text', required: false },
      { name: 'numEvents', label: '임계 건수', type: 'number', default: 5, required: true },
      { name: 'timeframeMinutes', label: '집계 시간(분)', type: 'number', default: 5, required: true },
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
        type: 'frequency',
        num_events: Number(p.numEvents ?? 5),
        timeframe: { minutes: Number(p.timeframeMinutes ?? 5) },
        filter: filters,
        timestamp_field: '@timestamp',
        timestamp_type: 'iso',
        match_enhancements: ['kst_enhancer.KSTEnhancement'],
        alert_text_type: 'alert_text_only',
      };

      const alertText = p.alertText || '🚨 *에러 감지*\n\n📅 발생 시각: {0}\n🐳 파드: {1}\n🖥️ 노드: {2}\n\n📋 메시지:\n{3}';
      rule.alert_text = alertText;

      const argsStr = p.alertTextArgs || 'timestamp_kst,kubernetes.pod.name,kubernetes.node.name,message';
      rule.alert_text_args = argsStr.split(',').map((s) => s.trim()).filter(Boolean);

      return rule;
    },
  },

  APM_500: {
    key: 'APM_500',
    label: 'APM 500 에러 수집',
    description: 'HTTP 5xx 응답이 임계치 이상이면 알림',
    defaultIndex: 'apm-*-transaction',
    fields: [
      { name: 'service', label: 'service.name', type: 'text', required: false },
      { name: 'statusCode', label: '상태 코드', type: 'number', default: 500, required: true },
      { name: 'numEvents', label: '임계 건수', type: 'number', default: 10, required: true },
      { name: 'timeframeMinutes', label: '집계 시간(분)', type: 'number', default: 5, required: true },
    ],
    build(p) {
      const filters = [
        { term: { 'http.response.status_code': Number(p.statusCode ?? 500) } },
      ];
      if (p.service) filters.push({ term: { 'service.name': p.service } });
      return {
        type: 'frequency',
        num_events: Number(p.numEvents ?? 10),
        timeframe: { minutes: Number(p.timeframeMinutes ?? 5) },
        filter: filters,
      };
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
