import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const PAGE_SIZE = 25;

export default function AuditLog() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.audit(page, PAGE_SIZE)
      .then((res) => { setItems(res.items); setTotal(res.total); })
      .catch((e) => setMsg(e.message));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="page-90s">
      <div className="page-header-90s">
        <div>
          <h1>감사 로그</h1>
          <div className="subtitle">누가 · 언제 · 무엇을 변경했는지 기록합니다.</div>
        </div>
      </div>

      {msg && <div className="status90 status90-err">{msg}</div>}

      <div className="win-card">
        <div className="win-card-title">활동 기록 <span className="badge90 badge90-action">{total}</span></div>
        <div className="win-card-body" style={{ padding: 0 }}>
          <table className="table90">
            <thead>
              <tr>
                <th>시각</th>
                <th>사용자</th>
                <th>액션</th>
                <th>대상 Rule</th>
                <th>상세</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontFamily: '"Courier New", monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td>{l.user?.username || l.user?.email || '—'}</td>
                  <td><span className="badge90 badge90-action">{l.action}</span></td>
                  <td>{l.rule?.name || '—'}</td>
                  <td><code>{JSON.stringify(l.detail)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && !msg && <div className="empty90">기록이 없습니다.</div>}
        </div>
      </div>

      {total > 0 && (
        <div className="pager90">
          <button className="btn90 btn90-sm" disabled={page <= 1} onClick={() => setPage(1)}>« 처음</button>
          <button className="btn90 btn90-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ 이전</button>
          <span className="pager90-status">
            {from}–{to} / {total} · {page} / {totalPages}
          </span>
          <button className="btn90 btn90-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>다음 ›</button>
          <button className="btn90 btn90-sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>끝 »</button>
        </div>
      )}
    </div>
  );
}
