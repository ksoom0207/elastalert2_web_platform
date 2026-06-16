import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

const EMPTY = {
  name: '', description: '', template: 'K8S_ERROR', esIndex: '',
  params: {}, alerter: 'mattermost', alerterConfig: {}, rawYaml: '',
};

export default function RuleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [yaml, setYaml] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.templates().then(setTemplates);
    if (id) api.rule(id).then((r) => { setForm(r); setYaml(r.renderedYaml || ''); });
  }, [id]);

  const tpl = templates.find((t) => t.key === form.template);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setParam = (k, v) => setForm((f) => ({ ...f, params: { ...f.params, [k]: v } }));
  const setCfg = (k, v) => setForm((f) => ({ ...f, alerterConfig: { ...f.alerterConfig, [k]: v || undefined } }));

  // Prefill index from template default when switching template.
  const onTemplateChange = (key) => {
    const t = templates.find((x) => x.key === key);
    setForm((f) => ({ ...f, template: key, esIndex: f.esIndex || t?.defaultIndex || '' }));
  };

  const save = async () => {
    try {
      const payload = { ...form };
      const saved = id ? await api.updateRule(id, payload) : await api.createRule(payload);
      setMsg('저장됨');
      if (!id) navigate(`/rules/${saved.id}`);
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h3>{id ? 'Rule 수정' : '새 Rule'}</h3>
      {msg && <p style={{ color: '#c00' }}>{msg}</p>}

      <Field label="이름 (영문/숫자/-/_)">
        <input value={form.name} onChange={(e) => set('name', e.target.value)} disabled={!!id} />
      </Field>
      <Field label="설명">
        <input value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
      </Field>
      <Field label="템플릿">
        <select value={form.template} onChange={(e) => onTemplateChange(e.target.value)}>
          {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </Field>

      {form.template !== 'CUSTOM' && (
        <>
          <Field label="Elasticsearch index">
            <input value={form.esIndex} onChange={(e) => set('esIndex', e.target.value)} />
          </Field>
          {tpl?.fields.map((fld) => (
            <Field key={fld.name} label={fld.label}>
              <input
                type={fld.type === 'number' ? 'number' : 'text'}
                value={form.params[fld.name] ?? fld.default ?? ''}
                onChange={(e) => setParam(fld.name, e.target.value)}
              />
            </Field>
          ))}
        </>
      )}

      <h4>Alerter</h4>
      <Field label="채널 종류">
        <select value={form.alerter} onChange={(e) => set('alerter', e.target.value)}>
          <option value="mattermost">Mattermost</option>
          <option value="slack">Slack</option>
        </select>
      </Field>
      <Field label="channel override">
        <input value={form.alerterConfig.channelOverride || ''} onChange={(e) => setCfg('channelOverride', e.target.value)} placeholder="infra-alerts" />
      </Field>
      <Field label="username override">
        <input value={form.alerterConfig.usernameOverride || ''} onChange={(e) => setCfg('usernameOverride', e.target.value)} placeholder="ElastAlert" />
      </Field>
      <Field label="msg color">
        <select value={form.alerterConfig.msgColor || ''} onChange={(e) => setCfg('msgColor', e.target.value)}>
          <option value="">(기본)</option>
          <option value="good">good</option>
          <option value="warning">warning</option>
          <option value="danger">danger</option>
          <option value="#FF8800">#HEX (예시)</option>
        </select>
      </Field>
      <Field label="webhook override (기본값과 다를 경우)">
        <input value={form.alerterConfig.webhookOverride || ''} onChange={(e) => setCfg('webhookOverride', e.target.value)} placeholder="비우면 관리자 기본 webhook 사용" />
      </Field>

      {form.template === 'CUSTOM' && (
        <Field label="Raw YAML (전체 rule 직접 작성)">
          <textarea rows={14} style={{ width: '100%', fontFamily: 'monospace' }}
            value={form.rawYaml || ''} onChange={(e) => set('rawYaml', e.target.value)} />
        </Field>
      )}

      <div style={{ marginTop: 16 }}>
        <button onClick={save}>저장</button>
      </div>

      {yaml && (
        <details style={{ marginTop: 16 }}>
          <summary>렌더링된 YAML 미리보기</summary>
          <pre style={{ background: '#f5f5f5', padding: 8 }}>{yaml}</pre>
        </details>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ margin: '8px 0', display: 'flex', gap: 12, alignItems: 'center' }}>
      <label style={{ width: 240, color: '#444' }}>{label}</label>
      {children}
    </div>
  );
}
