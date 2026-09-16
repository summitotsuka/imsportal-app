/* IMS Overview (menu Dashboard) + Document Control Dashboard + Reports */

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
function dashCard(label, value, accent) {
  return `<div class="dash-card"><div class="dash-val" style="color:${accent || '#172033'}">${value}</div><div class="dash-lbl">${label}</div></div>`;
}
async function dashDepts() {
  if (window._dashDepts) return window._dashDepts;
  try { window._dashDepts = (await API.get('getDocumentFormContext', { token: AUTH.getToken() })).departments || []; }
  catch (e) { window._dashDepts = []; }
  return window._dashDepts;
}
function dashDeptName(id) { const f = (window._dashDepts || []).find(x => x.departmentId === id); return f ? f.name : id; }

/* ============ IMS Overview (menu Dashboard) ============ */
async function loadDashboard() {
  const content = document.getElementById('pageContent');
  injectDashCss();
  content.innerHTML = `<div class="dash-wrap"><p class="dash-faint" style="padding:8px">Loading…</p></div>`;
  try {
    const d = await API.get('getDashboard', { token: AUTH.getToken() });
    await dashDepts();
    const recentDocs = (d.recentDocs || []).map(r =>
      `<li><b>${dEscD(r.docNumber)}</b> <span class="dash-faint">RV${dEscD(r.revision)}</span> — ${dEscD(r.title)}<div class="dash-faint" style="font-size:11px">${dEscD(dashDeptName(r.dep))} · <span class="dash-pill">${dEscD(r.status)}</span></div></li>`
    ).join('') || '<li class="dash-faint">No documents yet</li>';
    content.innerHTML = `<div class="dash-wrap">
      <h1 class="dash-h1">IMS Overview</h1>
      <p class="dash-faint" style="margin:0 0 6px">ภาพรวมระบบบริหารจัดการแบบบูรณาการ</p>

      <div class="dash-sec">📄 Document Control</div>
      <div class="dash-grid">
        ${dashCard('เอกสารใช้งาน (Effective)', d.effective, '#059669')}
        ${dashCard('รอ Department Approval', d.pendingDeptApproval, '#d97706')}
        ${dashCard('รอ QMS Review', d.pendingReview, '#d97706')}
        ${dashCard('รอรับทราบ (Acknowledge)', d.pendingAck, '#d97706')}
        ${dashCard('สำเนารอทำลาย', d.copiesToDestroy, '#b91c1c')}
      </div>
      <div class="dash-card" style="margin-top:12px">
        <div class="dash-lbl" style="margin-bottom:8px">เอกสารล่าสุด 5 รายการ</div>
        <ul class="dash-recent">${recentDocs}</ul>
        <a class="dash-link" data-goto="documents-dashboard">ไปที่ Document Control Dashboard →</a>
      </div>

      ${['⚠️ NCR / CAPA', '🔍 Internal Audit', '🎓 Training & Competency', '🏭 Automotive Core Tools'].map(m =>
        `<div class="dash-sec">${m}</div><div class="dash-card"><span class="dash-faint">โมดูลนี้ยังไม่เปิดใช้งาน — Coming soon</span></div>`).join('')}
    </div>`;
    const g = content.querySelector('[data-goto]');
    if (g) g.addEventListener('click', () => navigateTo('documents-dashboard'));
  } catch (e) {
    content.innerHTML = `<div class="dash-wrap"><p style="color:#b91c1c;padding:8px">โหลดไม่สำเร็จ: ${dEscD(e.message || '')}</p></div>`;
  }
}

/* ============ Document Control Dashboard (documents-dashboard) ============ */
async function loadDcDashboard() {
  const content = document.getElementById('pageContent');
  injectDashCss();
  content.innerHTML = `<div class="dash-wrap"><p class="dash-faint" style="padding:8px">Loading…</p></div>`;
  try {
    const d = await API.get('getDashboard', { token: AUTH.getToken() });
    await dashDepts();
    const typeBars = Object.keys(d.byType || {}).map(t =>
      `<div class="dash-bar"><span>${dEscD(DASH_TYPE_LABEL[t] || t)}</span><span class="dash-bar-v">${d.byType[t]}</span></div>`).join('') || '<span class="dash-faint" style="font-size:13px">—</span>';
    const recent = (d.recent || []).map(r =>
      `<li><span class="dash-act">${dEscD(r.action)}</span> <b>${dEscD(r.docNumber)}</b> <span class="dash-faint">${dEscD(r.title)}</span><div class="dash-faint" style="font-size:11px">${dEscD(r.actor)} · ${dashDate(r.when)}</div></li>`).join('') || '<li class="dash-faint">No recent activity</li>';
    content.innerHTML = `<div class="dash-wrap">
      <h1 class="dash-h1">Document Control Dashboard</h1>

      <div class="dash-sec">ภาพรวมเอกสาร</div>
      <div class="dash-grid">
        ${dashCard('เอกสารใช้งาน (Effective)', d.effective, '#059669')}
        ${dashCard('อยู่ระหว่างดำเนินการ', d.inProgress, '#2563eb')}
        ${dashCard('ยกเลิกแล้ว (Obsolete)', d.obsolete, '#6b7280')}
        ${dashCard('ยกเลิกคำขอ (Cancelled)', d.cancelled, '#9ca3af')}
      </div>
      <div class="dash-card" style="margin-top:12px"><div class="dash-lbl" style="margin-bottom:8px">แยกตามประเภท</div><div class="dash-bars">${typeBars}</div></div>

      <div class="dash-sec">งานค้าง (ต้องดำเนินการ)</div>
      <div class="dash-grid">
        ${dashCard('รอ Department Approval', d.pendingDeptApproval, '#d97706')}
        ${dashCard('รอ QMS Review', d.pendingReview, '#d97706')}
        ${dashCard('รอ Manager Approval', d.pendingManagerApproval, '#d97706')}
        ${dashCard('รอรับทราบ (Acknowledge)', d.pendingAck, '#d97706')}
      </div>

      <div class="dash-sec">สำเนาควบคุม</div>
      <div class="dash-grid">
        ${dashCard('สำเนา Active', d.copiesActive, '#059669')}
        ${dashCard('รอทำลาย', d.copiesToDestroy, '#b91c1c')}
        ${dashCard('ใบขอสำเนาค้าง', d.copyRequestsOpen, '#d97706')}
      </div>

      <div class="dash-sec">กิจกรรมล่าสุด</div>
      <div class="dash-card"><ul class="dash-recent">${recent}</ul></div>
    </div>`;
  } catch (e) {
    content.innerHTML = `<div class="dash-wrap"><p style="color:#b91c1c;padding:8px">โหลดไม่สำเร็จ: ${dEscD(e.message || '')}</p></div>`;
  }
}

/* ============ Reports (documents-reports) ============ */
async function loadDcReports() {
  const content = document.getElementById('pageContent');
  injectDashCss();
  await dashDepts();
  content.innerHTML = `<div class="dash-wrap">
    <h1 class="dash-h1">Document Control Reports</h1>
    <div class="dash-card">
      <div class="dash-filters">
        <label style="align-self:center;font-size:13px;font-weight:600">Report Type:</label>
        <select id="rpKind" class="dash-in">
          <option value="documents">All Documents</option>
          <option value="acknowledge">Acknowledge Report</option>
          <option value="copies">Controlled Copies Report</option>
        </select>
      </div>
      <div id="rpFilters" class="dash-filters"></div>
      <div id="rpResult"><p class="dash-faint" style="padding:8px">เลือกประเภทรายงานแล้วกด "กรอง"</p></div>
    </div>
  </div>`;
  document.getElementById('rpKind').addEventListener('change', renderReportFilters);
  renderReportFilters();
}

function renderReportFilters() {
  const kind = document.getElementById('rpKind').value;
  const fbox = document.getElementById('rpFilters');
  const depts = window._dashDepts || [];
  const deptOpts = `<option value="">ทุกฝ่าย</option>${depts.map(x => `<option value="${dEscD(x.departmentId)}">${dEscD(x.name)}</option>`).join('')}`;
  if (kind === 'documents') {
    fbox.innerHTML = `
      <select id="rpType" class="dash-in"><option value="">ทุกประเภท</option>${Object.keys(DASH_TYPE_LABEL).map(t => `<option value="${t}">${DASH_TYPE_LABEL[t]}</option>`).join('')}</select>
      <select id="rpDept" class="dash-in">${deptOpts}</select>
      <select id="rpStatus" class="dash-in"><option value="">ทุกสถานะ</option>${DASH_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
      <input id="rpSearch" class="dash-in" placeholder="ค้นหา เลข/ชื่อเอกสาร" style="flex:1;min-width:160px">
      <button id="rpApply" class="dash-btn">กรอง</button><button id="rpCsv" class="dash-btn dash-ghost">⬇ CSV</button>`;
  } else {
    fbox.innerHTML = `<span class="dash-faint" style="align-self:center">รายงานนี้จะเพิ่มในขั้นตอนถัดไป</span>`;
    document.getElementById('rpResult').innerHTML = '';
    return;
  }
  const apply = document.getElementById('rpApply'); if (apply) apply.addEventListener('click', loadDocReport);
  const csv = document.getElementById('rpCsv'); if (csv) csv.addEventListener('click', exportDocReportCsv);
  const se = document.getElementById('rpSearch'); if (se) se.addEventListener('keydown', e => { if (e.key === 'Enter') loadDocReport(); });
  loadDocReport();
}

async function loadDocReport() {
  const box = document.getElementById('rpResult');
  if (!box) return;
  box.innerHTML = `<p class="dash-faint" style="padding:8px">Loading…</p>`;
  try {
    const params = {
      token: AUTH.getToken(),
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
  if (!rows.length) { box.innerHTML = `<p class="dash-faint" style="padding:8px">ไม่พบเอกสารตามเงื่อนไข</p>`; return; }
  box.innerHTML = `<div class="dash-faint" style="margin:0 0 8px;font-size:12px">พบ ${total} เอกสาร</div>
    <div style="overflow-x:auto"><table class="dash-tbl"><thead><tr>
      <th>Doc No.</th><th>Rev</th><th>Title</th><th>Type</th><th>Dept</th><th>Status</th><th>Effective</th><th>Created by</th></tr></thead>
      <tbody>${rows.map(d => `<tr>
        <td><b>${dEscD(d.DocNumber)}</b></td><td>${dEscD(d.Revision)}</td><td>${dEscD(d.Title)}</td>
        <td>${dEscD(DASH_TYPE_LABEL[d.DocumentType] || d.DocumentType)}</td><td>${dEscD(dashDeptName(d.DepartmentID))}</td>
        <td>${dEscD(d.Status)}</td><td>${dashDate(d.EffectiveDate)}</td><td>${dEscD(d.CreatedByName)}</td>
      </tr>`).join('')}</tbody></table></div>`;
}

function exportDocReportCsv() {
  const rows = window._dashReportRows || [];
  if (!rows.length) { alert('ไม่มีข้อมูลให้ export'); return; }
  const head = ['Doc No.', 'Revision', 'Title', 'Type', 'Department', 'Status', 'Effective', 'Created by', 'Created date'];
  const esc = v => { const s = String(v == null ? '' : v).replace(/"/g, '""'); return /[",\n]/.test(s) ? '"' + s + '"' : s; };
  const lines = [head.join(',')];
  rows.forEach(d => lines.push([
    d.DocNumber, d.Revision, d.Title, (DASH_TYPE_LABEL[d.DocumentType] || d.DocumentType),
    dashDeptName(d.DepartmentID), d.Status, dashDate(d.EffectiveDate), d.CreatedByName, dashDate(d.CreatedDate)
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
    .dash-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
    .dash-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
    .dash-val{font-size:30px;font-weight:700;line-height:1}
    .dash-lbl{font-size:13px;color:#6b7280;margin-top:6px}
    .dash-bars{display:flex;flex-direction:column;gap:6px}
    .dash-bar{display:flex;justify-content:space-between;font-size:13px;padding:3px 0;border-bottom:1px solid #f3f4f6}
    .dash-bar-v{font-weight:700}
    .dash-recent{list-style:none;margin:0;padding:0}
    .dash-recent li{padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
    .dash-act{display:inline-block;font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase}
    .dash-pill{display:inline-block;background:#f3f4f6;border-radius:6px;padding:1px 7px;font-size:11px}
    .dash-faint{color:#9ca3af}
    .dash-link{display:inline-block;margin-top:10px;font-size:13px;color:#2563eb;cursor:pointer}
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
