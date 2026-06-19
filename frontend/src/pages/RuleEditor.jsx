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

  const onTemplateChange = (key) => {
    const t = templates.find((x) => x.key === key);
    setForm((f) => ({ ...f, template: key, esIndex: f.esIndex || t?.defaultIndex || '' }));
  };

  const save = async () => {
    try {
      const saved = id ? await api.updateRule(id, form) : await api.createRule(form);
      setMsg('저장됨 ✓');
      if (!id) navigate(`/rules/${saved.id}`);
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">{id ? 'Rule 수정' : '새 Rule'}</h1>
          <p className="page-sub">템플릿으로 빠르게 만들거나 Custom YAML 로 직접 작성합니다.</p>
        </div>
        <button className="btn-primary" onClick={save}>저장</button>
      </div>

      {msg && <div className="status">{msg}</div>}

      <div className="form">
        <div className="section-title">기본</div>
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

        <div className="section-title">Alerter</div>
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
        <Field label="webhook override">
          <input value={form.alerterConfig.webhookOverride || ''} onChange={(e) => setCfg('webhookOverride', e.target.value)} placeholder="비우면 관리자 기본 webhook 사용" />
        </Field>

        {form.template === 'CUSTOM' && (
          <>
            <div className="section-title">Custom YAML</div>
            <Field label="Raw YAML (전체 rule 직접 작성)">
              <textarea rows={14} value={form.rawYaml || ''} onChange={(e) => set('rawYaml', e.target.value)} />
            </Field>
            <p className="field-hint">
              작성한 그대로(주석·들여쓰기 포함) 저장됩니다. <code>name: {form.name || '<룰 이름>'}</code> 을
              반드시 포함하고 룰 이름과 일치시켜 주세요. (type / index / alert 필수)
            </p>
          </>
        )}
      </div>

      {yaml && (
        <details>
          <summary>렌더링된 YAML 미리보기</summary>
          <pre>{yaml}</pre>
        </details>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
