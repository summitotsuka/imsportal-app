/* Document Control — Dashboard + All Documents report */

const DASH_TYPE_LABEL = {
  MANUAL: 'Manual', PROCEDURE: 'Procedure', WORK_INSTRUCTION: 'Work Instruction',
  FORM: 'Form', INTERNAL: 'Internal', EXTERNAL: 'External'
};
const DASH_STATUSES = ['DRAFT', 'SUBMITTED', 'DEPT_APPROVED', 'PENDING_PUBLISH', 'EFFECTIVE', 'OBSOLETE', 'CANCELLED'];

function dEscD(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function dashDate(v) {
  if (!v) return '—';
  try { const d = new Date(v); if (isNaN(d)) return String(v); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  catch (e) { return String(v); }
}

async function loadDashboard() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `<div class="dash-wrap"><p style="color:#6b7280;padding:8px">Loading…</p></div>`;
  injectDashCss();
  try {
    const token = AUTH.getToken();
    const d = await API.get('getDashboard', { token });
    let depts = [];
    try { depts = (await API.get('getDocumentFormContext', { token })).departments || []; } catch (e) { }
    window._dashDepts = depts;
    renderDashboard(content, d, depts);
    loadDocReport();   // initial report (no filter)
  } catch (e) {
    content.innerHTML = `<div class="dash-wrap"><p style="color:#b91c1c;padding:8px">โหลด Dashboard ไม่สำเร็จ: ${dEscD(e.message || '')}</p></div>`;
  }
}

function card(label, value, accent) {
  return `<div class="dash-card"><div class="dash-val" style="color:${accent || '#172033'}">${value}</div><div class="dash-lbl">${label}</div></div>`;
}

function renderDashboard(content, d, depts) {
  const deptName = id => { const f = (depts || []).find(x => x.departmentId === id); return f ? f.name : id; };
  const typeBars = Object.keys(d.byType || {}).map(t => {
    return `<div class="dash-bar"><span class="dash-bar-l">${dEscD(DASH_TYPE_LABEL[t] || t)}</span><span class="dash-bar-v">${d.byType[t]}</span></div>`;
  }).join('') || '<span style="color:#9ca3af;font-size:13px">—</span>';

  const recent = (d.recent || []).map(r =>
    `<li><span class="dash-act">${dEscD(r.action)}</span> <b>${dEscD(r.docNumber)}</b> <span class="dash-faint">${dEscD(r.title)}</span><div class="dash-faint" style="font-size:11px">${dEscD(r.actor)} · ${dashDate(r.when)}</div></li>`
  ).join('') || '<li class="dash-faint">No recent activity</li>';

  content.innerHTML = `<div class="dash-wrap">
    <h1 class="dash-h1">Document Control Dashboard</h1>

    <div class="dash-sec">ภาพรวมเอกสาร</div>
    <div class="dash-grid">
      ${card('เอกสารใช้งาน (Effective)', d.effective, '#059669')}
      ${card('อยู่ระหว่างดำเนินการ', d.inProgress, '#2563eb')}
      ${card('ยกเลิกแล้ว (Obsolete)', d.obsolete, '#6b7280')}
      ${card('ยกเลิกคำขอ (Cancelled)', d.cancelled, '#9ca3af')}
    </div>
    <div class="dash-card" style="margin-top:12px"><div class="dash-lbl" style="margin-bottom:8px">แยกตามประเภท</div><div class="dash-bars">${typeBars}</div></div>

    <div class="dash-sec">งานค้าง (ต้องดำเนินการ)</div>
    <div class="dash-grid">
      ${card('รออนุมัติ', d.pendingApproval, '#d97706')}
      ${card('รอ QMS ตรวจสอบ', d.pendingReview, '#d97706')}
      ${card('รอรับทราบ (Acknowledge)', d.pendingAck, '#d97706')}
    </div>

    <div class="dash-sec">สำเนาควบคุม</div>
    <div class="dash-grid">
      ${card('สำเนา Active', d.copiesActive, '#059669')}
      ${card('รอทำลาย', d.copiesToDestroy, '#b91c1c')}
      ${card('ใบขอสำเนาค้าง', d.copyRequestsOpen, '#d97706')}
    </div>

    <div class="dash-two">
      <div class="dash-card">
        <div class="dash-lbl" style="margin-bottom:8px">กิจกรรมล่าสุด</div>
        <ul class="dash-recent">${recent}</ul>
      </div>
    </div>

    <div class="dash-sec">รายงานเอกสารทั้งหมด (All Documents)</div>
    <div class="dash-card">
      <div class="dash-filters">
        <select id="rpType" class="dash-in"><option value="">ทุกประเภท</option>${Object.keys(DASH_TYPE_LABEL).map(t => `<option value="${t}">${DASH_TYPE_LABEL[t]}</option>`).join('')}</select>
        <select id="rpDept" class="dash-in"><option value="">ทุกฝ่าย</option>${(depts || []).map(x => `<option value="${dEscD(x.departmentId)}">${dEscD(x.name)}</option>`).join('')}</select>
        <select id="rpStatus" class="dash-in"><option value="">ทุกสถานะ</option>${DASH_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
        <input id="rpSearch" class="dash-in" placeholder="ค้นหา เลข/ชื่อเอกสาร" style="flex:1;min-width:160px">
        <button id="rpApply" class="dash-btn">กรอง</button>
        <button id="rpCsv" class="dash-btn dash-ghost">⬇ CSV</button>
      </div>
      <div id="rpResult"><p class="dash-faint" style="padding:8px">Loading…</p></div>
    </div>
  </div>`;

  document.getElementById('rpApply').addEventListener('click', loadDocReport);
  document.getElementById('rpSearch').addEventListener('keydown', e => { if (e.key === 'Enter') loadDocReport(); });
  document.getElementById('rpCsv').addEventListener('click', exportDocReportCsv);
}

async function loadDocReport() {
  const box = document.getElementById('rpResult');
  if (!box) return;
  box.innerHTML = `<p class="dash-faint" style="padding:8px">Loading…</p>`;
  try {
    const token = AUTH.getToken();
    const params = {
      token,
      type: (document.getElementById('rpType') || {}).value || '',
      departmentId: (document.getElementById('rpDept') || {}).value || '',
      status: (document.getElementById('rpStatus') || {}).value || '',
      search: (document.getElementById('rpSearch') || {}).value || ''
    };
    const r = await API.get('getDocumentReport', params);
    window._dashReportRows = r.rows || [];
    renderDocReport(box, r.rows || [], r.total || 0);
  } catch (e) {
    box.innerHTML = `<p style="color:#b91c1c;padding:8px">${dEscD(e.message || 'โหลดรายงานไม่สำเร็จ')}</p>`;
  }
}

function renderDocReport(box, rows, total) {
  const depts = window._dashDepts || [];
  const deptName = id => { const f = depts.find(x => x.departmentId === id); return f ? f.name : id; };
  if (!rows.length) { box.innerHTML = `<p class="dash-faint" style="padding:8px">ไม่พบเอกสารตามเงื่อนไข</p>`; return; }
  box.innerHTML = `<div class="dash-faint" style="margin:0 0 8px;font-size:12px">พบ ${total} เอกสาร</div>
    <div style="overflow-x:auto"><table class="dash-tbl"><thead><tr>
      <th>Doc No.</th><th>Rev</th><th>Title</th><th>Type</th><th>Dept</th><th>Status</th><th>Effective</th><th>Created by</th></tr></thead>
      <tbody>${rows.map(d => `<tr>
        <td><b>${dEscD(d.DocNumber)}</b></td><td>${dEscD(d.Revision)}</td><td>${dEscD(d.Title)}</td>
        <td>${dEscD(DASH_TYPE_LABEL[d.DocumentType] || d.DocumentType)}</td><td>${dEscD(deptName(d.DepartmentID))}</td>
        <td>${dEscD(d.Status)}</td><td>${dashDate(d.EffectiveDate)}</td><td>${dEscD(d.CreatedByName)}</td>
      </tr>`).join('')}</tbody></table></div>`;
}

function exportDocReportCsv() {
  const rows = window._dashReportRows || [];
  if (!rows.length) { alert('ไม่มีข้อมูลให้ export'); return; }
  const depts = window._dashDepts || [];
  const deptName = id => { const f = depts.find(x => x.departmentId === id); return f ? f.name : id; };
  const head = ['Doc No.', 'Revision', 'Title', 'Type', 'Department', 'Status', 'Effective', 'Created by', 'Created date'];
  const esc = v => { const s = String(v == null ? '' : v).replace(/"/g, '""'); return /[",\n]/.test(s) ? '"' + s + '"' : s; };
  const lines = [head.join(',')];
  rows.forEach(d => lines.push([
    d.DocNumber, d.Revision, d.Title, (DASH_TYPE_LABEL[d.DocumentType] || d.DocumentType),
    deptName(d.DepartmentID), d.Status, dashDate(d.EffectiveDate), d.CreatedByName, dashDate(d.CreatedDate)
  ].map(esc).join(',')));
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'documents_report_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function injectDashCss() {
  if (document.getElementById('dashCss')) return;
  const st = document.createElement('style'); st.id = 'dashCss';
  st.textContent = `
    .dash-wrap{max-width:1100px;margin:0 auto;padding:20px}
    .dash-h1{font-size:22px;margin:0 0 8px}
    .dash-sec{font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.03em;margin:22px 0 10px}
    .dash-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
    .dash-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
    .dash-val{font-size:30px;font-weight:700;line-height:1}
    .dash-lbl{font-size:13px;color:#6b7280;margin-top:6px}
    .dash-bars{display:flex;flex-direction:column;gap:6px}
    .dash-bar{display:flex;justify-content:space-between;font-size:13px;padding:3px 0;border-bottom:1px solid #f3f4f6}
    .dash-bar-v{font-weight:700}
    .dash-two{margin-top:12px}
    .dash-recent{list-style:none;margin:0;padding:0}
    .dash-recent li{padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
    .dash-act{display:inline-block;font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase}
    .dash-faint{color:#9ca3af}
    .dash-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
    .dash-in{border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;font-size:13px}
    .dash-btn{border:0;background:#172033;color:#fff;border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer}
    .dash-btn.dash-ghost{background:#fff;color:#172033;border:1px solid #d1d5db}
    .dash-tbl{width:100%;border-collapse:collapse;font-size:13px}
    .dash-tbl th{text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;padding:8px;border-bottom:2px solid #e5e7eb;white-space:nowrap}
    .dash-tbl td{padding:8px;border-bottom:1px solid #f3f4f6}
  `;
  document.head.appendChild(st);
}
