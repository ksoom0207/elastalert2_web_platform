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
      setMsg('C:\\ELASTALERT\\SAVE.EXE — 저장 완료!');
      if (!id) navigate(`/rules/${saved.id}`);
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div className="page-90s">
      <div className="page-header-90s">
        <div>
          <h1>{id ? '📝 Rule 수정' : '✚ 새 Rule'}</h1>
          <div className="subtitle">
            템플릿으로 빠르게 만들거나 Custom YAML로 직접 작성합니다.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn90" onClick={() => navigate('/')}>◀ 목록</button>
          <button className="btn90 btn90-primary" onClick={save}>💾 저장</button>
        </div>
      </div>

      {msg && <div className="status90">{msg}</div>}

      <div className="form90">
        <div className="form90-inner">
          <div className="section-title90">기본 설정</div>
          <Field label="이름 (영문/숫자/-/_)">
            <input value={form.name} onChange={(e) => set('name', e.target.value)} disabled={!!id} placeholder="my-rule-01" />
          </Field>
          <Field label="설명">
            <input value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="이 룰이 무엇을 감시하는지" />
          </Field>
          <Field label="템플릿">
            <select value={form.template} onChange={(e) => onTemplateChange(e.target.value)}>
              {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>

          {form.template !== 'CUSTOM' && (
            <>
              <hr className="hr-groove" />
              <div className="section-title90">Elasticsearch</div>
              <Field label="Index pattern">
                <input value={form.esIndex} onChange={(e) => set('esIndex', e.target.value)} placeholder="filebeat-*" />
              </Field>
              {tpl?.fields
                .filter((fld) => {
                  if (!fld.showWhen) return true;
                  const selectedType = form.params.ruleType ?? tpl.fields.find((f) => f.name === 'ruleType')?.default;
                  return fld.showWhen.includes(selectedType);
                })
                .map((fld) => (
                <Field key={fld.name} label={fld.label}>
                  {fld.type === 'select' ? (
                    <select
                      value={form.params[fld.name] ?? fld.default ?? ''}
                      onChange={(e) => setParam(fld.name, e.target.value)}
                    >
                      {(fld.options || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : fld.type === 'textarea' ? (
                    <textarea
                      rows={8}
                      value={form.params[fld.name] ?? fld.default ?? ''}
                      onChange={(e) => setParam(fld.name, e.target.value)}
                    />
                  ) : (
                    <input
                      type={fld.type === 'number' ? 'number' : 'text'}
                      value={form.params[fld.name] ?? fld.default ?? ''}
                      onChange={(e) => setParam(fld.name, e.target.value)}
                    />
                  )}
                </Field>
              ))}
            </>
          )}

          {form.template !== 'CUSTOM' && (
            <>
              <hr className="hr-groove" />
              <div className="section-title90">Alerter 설정</div>
              <Field label="채널 종류">
                <select value={form.alerter} onChange={(e) => set('alerter', e.target.value)}>
                  <option value="mattermost">Mattermost</option>
                  <option value="slack">Slack</option>
                </select>
              </Field>
              <Field label="Channel override">
                <input value={form.alerterConfig.channelOverride || ''} onChange={(e) => setCfg('channelOverride', e.target.value)} placeholder="infra-alerts" />
              </Field>
              <Field label="Username override">
                <input value={form.alerterConfig.usernameOverride || ''} onChange={(e) => setCfg('usernameOverride', e.target.value)} placeholder="ElastAlert" />
              </Field>
              <Field label="Msg color">
                <select value={form.alerterConfig.msgColor || ''} onChange={(e) => setCfg('msgColor', e.target.value)}>
                  <option value="">(기본)</option>
                  <option value="good">good</option>
                  <option value="warning">warning</option>
                  <option value="danger">danger</option>
                  <option value="#FF8800">#HEX (예시)</option>
                </select>
              </Field>
              <Field label="Webhook override">
                <input value={form.alerterConfig.webhookOverride || ''} onChange={(e) => setCfg('webhookOverride', e.target.value)} placeholder="비우면 관리자 기본 webhook 사용" />
              </Field>
            </>
          )}

          {form.template === 'CUSTOM' && (
            <>
              <hr className="hr-groove" />
              <div className="section-title90">
                Custom YAML <span className="badge90 badge90-new">NEW!</span>
              </div>
              <Field label="Raw YAML">
                <textarea rows={14} value={form.rawYaml || ''} onChange={(e) => set('rawYaml', e.target.value)} />
              </Field>
              <div className="field-hint90">
                작성한 그대로(주석·들여쓰기 포함) 저장됩니다.
                name: {form.name || '<룰 이름>'} 을 반드시 포함하세요. (type / index / alert 필수)
              </div>
              <div className="custom-alert-notice">
                ⚠ Custom 룰은 <b>alerter 설정(alert, webhook_url, channel 등)을 YAML에 직접 작성</b>해야 합니다.
                위 Alerter 폼은 Custom 룰에 적용되지 않습니다.
              </div>
            </>
          )}
        </div>
      </div>

      {yaml && (
        <div className="win-card" style={{ marginTop: 12 }}>
          <div className="win-card-title">📄 렌더링된 YAML 미리보기</div>
          <div className="win-card-body" style={{ padding: 0 }}>
            <pre style={{ margin: 0 }}>{yaml}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="field90">
      <label>{label}</label>
      {children}
    </div>
  );
}
