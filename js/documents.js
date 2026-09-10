/**
 * documents.js — Document Control (Frontend F1)
 * © 2026 Summit Otsuka Manufacturing Co., Ltd. All rights reserved.
 *
 * F1 scope: Create Document (NEW) · My Documents / queues (read-only) ·
 *           Document Detail (info + history timeline + acknowledge table + download)
 * Action buttons (approve / review / acknowledge) arrive in F2.
 */
const DC_TYPES = ['MANUAL', 'PROCEDURE', 'WORK_INSTRUCTION', 'FORM', 'INTERNAL', 'EXTERNAL'];
const DC_TYPE_LABEL = {
  MANUAL: 'Manual', PROCEDURE: 'Procedure', WORK_INSTRUCTION: 'Work Instruction',
  FORM: 'Form', INTERNAL: 'Internal', EXTERNAL: 'External'
};
const DC_REQ_TYPES = [
  { v: 'NEW', label: 'New document', on: true },
  { v: 'REVISE', label: 'Revise (soon)', on: false },
  { v: 'CONTROLLED_COPY', label: 'Controlled copy (soon)', on: false },
  { v: 'OBSOLETE', label: 'Obsolete (soon)', on: false },
  { v: 'DESTROY', label: 'Destroy copy (soon)', on: false },
  { v: 'OTHER', label: 'Other (soon)', on: false }
];
const DC_STATUS = {
  DRAFT: ['Waiting for Submit', 'dc-b-off'], SUBMITTED: ['Waiting for Dept Approve', 'dc-b-info'],
  DEPT_APPROVED: ['Waiting for QMS Review', 'dc-b-info'], UNDER_REVIEW: ['Waiting for QMS Review', 'dc-b-info'],
  PENDING_PUBLISH: ['Waiting for QMS Manager Approve', 'dc-b-warn'], EFFECTIVE: ['Published', 'dc-b-ok'],
  CANCELLED: ['Cancelled', 'dc-b-cancel']
};
const DC_TABS = [
  ['myDocuments', 'My Documents'], ['drafts', 'In Progress'],
  ['forApproval', 'For Approval'], ['qmsReview', 'QMS Review'], ['acknowledge', 'Acknowledge']
];

function dEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function dcBadge(status) {
  const m = DC_STATUS[String(status || '').toUpperCase()] || [String(status || '—'), 'dc-b-off'];
  return `<span class="dc-badge ${m[1]}">${dEsc(m[0])}</span>`;
}
function dcBadgeBig(status) {
  const m = DC_STATUS[String(status || '').toUpperCase()] || [String(status || '—'), 'dc-b-off'];
  return `<span class="dc-badge dc-badge-lg ${m[1]}">${dEsc(m[0])}</span>`;
}
function dcDate(v) {
  if (!v) return '—';
  try {
    const d = new Date(v); if (isNaN(d)) return String(v);
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  } catch (e) { return String(v); }
}

const DocumentsPage = {
  _css: false,
  _tab: 'myDocuments',
  data: null,
  departments: [],
  deptMap: {},

  token() { return AUTH.getToken(); },

  async ensureDepts() {
    if (Object.keys(this.deptMap).length) return;
    try {
      const ctx = await API.get('getDocumentFormContext', { token: this.token() });
      (ctx.departments || []).forEach(d => { this.deptMap[d.departmentId] = d.name; });
    } catch (e) { }
  },
  deptName(id) { return this.deptMap[String(id).trim()] || id; },
  deptNames(csv) {
    return String(csv || '').split(',').map(x => x.trim()).filter(Boolean).map(id => this.deptName(id)).join(', ');
  },

  injectCss() {
    if (this._css) return;
    this._css = true;
    const s = document.createElement('style');
    s.textContent = `
      .dc-wrap{max-width:960px}
      .dc-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.05);padding:20px;margin-bottom:15px}
      .dc-muted{color:#6b7280}.dc-faint{color:#9aa3af}
      .dc-ph{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
      .dc-btn{font:inherit;font-size:13.5px;font-weight:500;border:1px solid #d1d5db;background:#fff;color:#172033;border-radius:8px;padding:8px 14px;cursor:pointer}
      .dc-btn:hover{background:#f7f8fa}
      .dc-primary{background:#172033;color:#fff;border-color:#172033}.dc-primary:hover{filter:brightness(1.15)}
      .dc-ghost{background:#fff}
      .dc-back{background:none;border:0;color:#6b7280;font:inherit;font-size:13px;cursor:pointer;padding:4px 0;margin-bottom:8px}
      .dc-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
      .dc-tab{font:inherit;font-size:13px;border:1px solid #d1d5db;background:#fff;color:#6b7280;border-radius:999px;padding:6px 13px;cursor:pointer;display:flex;align-items:center;gap:6px}
      .dc-tab.on{background:#172033;color:#fff;border-color:#172033}
      .dc-count{font-size:11px;font-weight:700;background:#eef0f3;color:#374151;border-radius:999px;padding:1px 7px}
      .dc-tab.on .dc-count{background:rgba(255,255,255,.25);color:#fff}
      .dc-tbl{width:100%;border-collapse:collapse;font-size:14px}
      .dc-tbl th{text-align:left;font-size:12px;color:#6b7280;font-weight:600;padding:9px 10px;border-bottom:1px solid #e5e7eb}
      .dc-tbl td{padding:10px;border-bottom:1px solid #f0f1f3}
      .dc-tbl tr:last-child td{border-bottom:0}
      .dc-row{cursor:pointer}.dc-row:hover{background:#f7f8fa}
      .dc-id{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;color:#374151}
      .dc-grp{font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.03em;padding:14px 10px 6px}
      .dc-grp-row td{background:#f3f4f6;font-size:12px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:.03em;padding:8px 10px}
      .dc-badge{font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;white-space:nowrap}
      .dc-badge-lg{font-size:14px;padding:6px 16px}
      .dc-filebar{display:flex;align-items:center;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid #eef0f3}
      .dc-file-name{font-size:13px;color:#374151;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dc-b-ok{background:#e7f6ec;color:#15803d}.dc-b-off{background:#f0f1f3;color:#6b7280}
      .dc-b-info{background:#e8f0fe;color:#1d4ed8}.dc-b-warn{background:#fff4e5;color:#9a6400}
      .dc-b-cancel{background:#fde8e8;color:#b91c1c}
      .dc-field{margin-bottom:13px}
      .dc-field label{display:block;font-size:12.5px;font-weight:600;color:#374151;margin-bottom:4px}
      .dc-req{color:#dc2626}
      .dc-in,.dc-sel,.dc-ta{width:100%;box-sizing:border-box;font:inherit;font-size:14px;border:1px solid #d1d5db;border-radius:8px;padding:9px 11px;background:#fff}
      .dc-ta{min-height:74px;resize:vertical}
      .dc-2col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      @media(max-width:560px){.dc-2col{grid-template-columns:1fr}}
      .dc-checks{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
      .dc-chk{display:flex;align-items:center;gap:7px;font-size:13.5px;border:1px solid #e5e7eb;border-radius:8px;padding:7px 10px}
      .dc-bar{display:flex;justify-content:flex-end;gap:9px;margin-top:16px;align-items:center}
      .dc-err{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:13px;border-radius:8px;padding:9px 12px}
      .dc-kv{display:grid;grid-template-columns:150px 1fr;gap:6px 14px;font-size:13.5px}
      .dc-kv .k{color:#6b7280}
      .dc-tl{list-style:none;margin:0;padding:0}
      .dc-tl li{position:relative;padding:0 0 14px 20px;border-left:2px solid #e5e7eb;margin-left:6px}
      .dc-tl li:last-child{border-left-color:transparent}
      .dc-tl .dot{position:absolute;left:-7px;top:2px;width:12px;height:12px;border-radius:50%;background:#172033}
      .dc-tl .act{font-weight:600;font-size:13.5px}
      .dc-tl .meta{font-size:12px;color:#6b7280}
      .dc-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#172033;color:#fff;font-size:13.5px;padding:10px 18px;border-radius:8px;opacity:0;transition:opacity .2s;pointer-events:none;z-index:60}
      .dc-toast.show{opacity:1}
      .dc-file{font-size:13px;border:1px dashed #cbd5e1;border-radius:8px;padding:10px;background:#fafbfc}
      .dc-warn{margin-top:10px;background:#fff4e5;border:1px solid #fde3b8;color:#9a6400;font-size:13px;border-radius:8px;padding:9px 12px}
      .dc-actbar{display:flex;flex-wrap:wrap;gap:9px}
      .dc-scrim{position:fixed;inset:0;background:rgba(15,20,30,.45);display:flex;align-items:center;justify-content:center;z-index:70;padding:16px}
      .dc-modal{background:#fff;border-radius:12px;padding:22px;width:100%;max-width:440px;box-shadow:0 12px 40px rgba(0,0,0,.25)}
    `;
    document.head.appendChild(s);
  },

  async load(tab) {
    this.injectCss();
    if (tab) this._tab = tab;
    const c = document.getElementById('pageContent');
    if (!c) return;
    c.innerHTML = `<div class="dc-wrap"><div class="dc-card"><p class="dc-muted">Loading…</p></div></div>`;
    try {
      const r = await API.get('getDocumentInbox', { token: this.token() });
      this.data = r;
      await this.ensureDepts();
      this.render();
    } catch (err) {
      c.innerHTML = `<div class="dc-wrap"><div class="dc-card"><div class="dc-err">${dEsc(err.message || 'Failed to load')}</div></div></div>`;
    }
  },

  render() {
    const c = document.getElementById('pageContent');
    const counts = (this.data && this.data.counts) || {};
    const role = (function () { try { return String((AUTH.getUser() || {}).roleId || ''); } catch (e) { return ''; } })();
    const tabAllowed = (id) => {
      if (id === 'forApproval') return ['R001', 'R002', 'R006', 'R007'].indexOf(role) !== -1;
      if (id === 'qmsReview') return ['R001', 'R003'].indexOf(role) !== -1;
      return true;
    };
    const allowed = DC_TABS.filter(([id]) => tabAllowed(id));
    if (!allowed.some(([id]) => id === this._tab)) this._tab = 'myDocuments';
    const tabs = allowed.map(([id, label]) =>
      `<button class="dc-tab${this._tab === id ? ' on' : ''}" data-tab="${id}">${label}<span class="dc-count">${counts[id] || 0}</span></button>`).join('');
    c.innerHTML = `
      <div class="dc-wrap">
        <div class="dc-ph" style="margin-bottom:14px">
          <div><h1 style="margin:0">Document Control</h1>
            <p class="dc-muted" style="margin:4px 0 0">Create, track and acknowledge controlled documents</p></div>
          <button class="dc-btn dc-primary" id="dcNew" type="button">+ Create Document</button>
        </div>
        <div class="dc-tabs">${tabs}</div>
        <div class="dc-card" id="dcList"></div>
      </div>
      <div class="dc-toast" id="dcToast"></div>`;
    document.getElementById('dcNew').addEventListener('click', () => this.openCreate());
    document.querySelectorAll('.dc-tabs [data-tab]').forEach(b =>
      b.addEventListener('click', () => this.load(b.dataset.tab)));
    this.renderList();
  },

  renderList() {
    const box = document.getElementById('dcList');
    const items = ((this.data && this.data.inbox) || {})[this._tab] || [];
    if (!items.length) { box.innerHTML = `<p class="dc-faint" style="padding:6px">Nothing here.</p>`; return; }

    if (this._tab === 'acknowledge') {
      box.innerHTML = `<table class="dc-tbl"><thead><tr><th>Doc No.</th><th>Rev</th><th>Title</th><th>Department</th><th>Effective</th></tr></thead><tbody>${items.map(a => `
        <tr class="dc-row" data-doc="${dEsc(a.DocumentID)}">
          <td><span class="dc-id">${dEsc(a.DocNumber)}</span></td><td>${dEsc(a.Revision)}</td><td>${dEsc(a.Title)}</td>
          <td>${dEsc(this.deptName(a.DepartmentID))}</td><td class="dc-faint" style="white-space:nowrap">${dcDate(a.EffectiveDate)}</td>
        </tr>`).join('')}</tbody></table>`;
    } else if (this._tab === 'myDocuments') {
      const groups = {};
      items.forEach(d => { const t = String(d.DocumentType || '').toUpperCase(); (groups[t] = groups[t] || []).push(d); });
      const effTime = d => { const v = d.EffectiveDate; const t = v ? new Date(v).getTime() : 0; return isNaN(t) ? 0 : t; };
      const body = DC_TYPES.filter(t => groups[t]).map(t => {
        const rows = groups[t].slice().sort((a, b) => {
          const c = String(a.DocNumber).localeCompare(String(b.DocNumber));
          return c !== 0 ? c : (effTime(b) - effTime(a));
        });
        return `<tr class="dc-grp-row"><td colspan="6">${DC_TYPE_LABEL[t] || t}</td></tr>` +
          rows.map(d => `<tr class="dc-row" data-doc="${dEsc(d.DocumentID)}">
            <td><span class="dc-id">${dEsc(d.DocNumber)}</span></td>
            <td>${dEsc(d.Revision)}</td>
            <td>${dEsc(d.Title)}</td>
            <td>${dEsc(this.deptName(d.DepartmentID))}</td>
            <td>${dcBadge(d.Status)}</td>
            <td class="dc-faint" style="white-space:nowrap">${dcDate(d.EffectiveDate)}</td>
          </tr>`).join('');
      }).join('');
      box.innerHTML = `<table class="dc-tbl"><thead><tr><th>Doc No.</th><th>Rev</th><th>Title</th><th>Dept</th><th>Status</th><th>Effective</th></tr></thead><tbody>${body}</tbody></table>`;
    } else {
      box.innerHTML = `<table class="dc-tbl"><thead><tr><th>Doc No.</th><th>Title</th><th>Dept</th><th>Status</th><th>Created</th></tr></thead><tbody>${items.map(d => this.rowHtml(d)).join('')}</tbody></table>`;
    }
    box.querySelectorAll('[data-doc]').forEach(r =>
      r.addEventListener('click', () => this.openDetail(r.dataset.doc)));
  },

  rowHtml(d) {
    return `<tr class="dc-row" data-doc="${dEsc(d.DocumentID)}">
      <td><span class="dc-id">${dEsc(d.DocNumber)}</span> <span class="dc-faint">RV${dEsc(d.Revision)}</span></td>
      <td>${dEsc(d.Title)}</td>
      <td>${dEsc(this.deptName(d.DepartmentID))}</td>
      <td>${dcBadge(d.Status)}</td>
      <td class="dc-faint" style="white-space:nowrap">${dcDate(d.CreatedDate)}</td>
    </tr>`;
  },

  /* ---------------- Create ---------------- */
  async openCreate() {
    this.injectCss();
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="dcBack">← Back</button><div class="dc-card"><p class="dc-muted">Loading…</p></div></div>`;
    let deps = [], myDept = (this.data && this.data.department) || '';
    try {
      const ctx = await API.get('getDocumentFormContext', { token: this.token() });
      deps = ctx.departments || []; myDept = ctx.myDept || myDept;
    } catch (e) { }
    this.departments = deps;

    const reqOpts = DC_REQ_TYPES.map(r => `<option value="${r.v}" ${r.on ? '' : 'disabled'} ${r.v === 'NEW' ? 'selected' : ''}>${r.label}</option>`).join('');
    const typeOpts = DC_TYPES.map(t => `<option value="${t}">${DC_TYPE_LABEL[t]}</option>`).join('');
    const deptOpts = deps.map(d => `<option value="${dEsc(d.departmentId)}" ${d.departmentId === myDept ? 'selected' : ''}>${dEsc(d.name)} (${dEsc(d.departmentId)})</option>`).join('');
    const shareChecks = deps.map(d => `<label class="dc-chk"><input type="checkbox" class="dcShare" value="${dEsc(d.departmentId)}"> ${dEsc(d.name)} (${dEsc(d.departmentId)})</label>`).join('');

    c.innerHTML = `
      <div class="dc-wrap">
        <button class="dc-back" id="dcBack">← Back</button>
        <div class="dc-ph" style="margin-bottom:14px"><h1 style="margin:0">Create Document</h1></div>
        <div class="dc-card">
          <div class="dc-2col">
            <div class="dc-field"><label>Request type <span class="dc-req">*</span></label><select class="dc-sel" id="dcReq">${reqOpts}</select></div>
            <div class="dc-field"><label>Document type <span class="dc-req">*</span></label><select class="dc-sel" id="dcType">${typeOpts}</select></div>
          </div>
          <div class="dc-2col">
            <div class="dc-field"><label>Document number <span class="dc-req">*</span></label><input class="dc-in" id="dcNo" placeholder="e.g. QP-PD-001"></div>
            <div class="dc-field"><label>Revision <span class="dc-req">*</span></label><input class="dc-in" id="dcRev" value="00"></div>
          </div>
          <div class="dc-field"><label>Title <span class="dc-req">*</span></label><input class="dc-in" id="dcTitle"></div>
          <div class="dc-field"><label>Owner department <span class="dc-req">*</span></label><select class="dc-sel" id="dcDept">${deptOpts}</select></div>
          <div class="dc-field"><label>Reason / details <span class="dc-req">*</span></label><textarea class="dc-ta" id="dcReason" placeholder="Reason for this document action"></textarea></div>
          <div class="dc-field"><label>Distribute copies to (shared departments)</label><div class="dc-checks">${shareChecks}</div></div>
          <div class="dc-field"><label>Attach file</label>
            <input type="file" id="dcFile" accept=".pdf,.doc,.docx,.xls,.xlsx" class="dc-file">
            <div class="dc-faint" style="font-size:12px;margin-top:4px">PDF, Word or Excel · max 5 MB</div>
          </div>
          <div id="dcErr"></div>
          <div class="dc-bar">
            <button class="dc-btn dc-ghost" id="dcCancel" type="button">Cancel</button>
            <button class="dc-btn dc-primary" id="dcSave" type="button">Create</button>
          </div>
        </div>
      </div>`;

    const back = () => this.load();
    document.getElementById('dcBack').addEventListener('click', back);
    document.getElementById('dcCancel').addEventListener('click', back);
    document.getElementById('dcSave').addEventListener('click', () => this.submitCreate());
  },

  async submitCreate() {
    const $ = id => document.getElementById(id);
    const err = m => { $('dcErr').innerHTML = m ? `<div class="dc-err">${dEsc(m)}</div>` : ''; };
    const docNumber = $('dcNo').value.trim(), revision = $('dcRev').value.trim();
    const title = $('dcTitle').value.trim(), type = $('dcType').value, deptId = $('dcDept').value;
    const reason = $('dcReason').value.trim();
    const fileEl = $('dcFile');
    if (!docNumber || !revision || !title || !deptId) { err('Please fill in all required fields.'); return; }
    if (!reason) { err('Please enter a reason / details.'); return; }
    const shared = Array.from(document.querySelectorAll('.dcShare:checked')).map(x => x.value);

    const btn = $('dcSave'); btn.disabled = true; btn.textContent = (fileEl.files && fileEl.files[0]) ? 'Uploading…' : 'Creating…';
    try {
      const payload = {
        token: this.token(), requestType: 'NEW', DocumentType: type, DocNumber: docNumber,
        Revision: revision, Title: title, DepartmentID: deptId, reason: reason, sharedDepartments: shared
      };
      if (fileEl.files && fileEl.files[0]) payload.file = await this.readFile(fileEl.files[0]);
      const res = await API.post('createDocument', payload);
      this.toast('Document created');
      this.openDetail(res.documentId);
    } catch (ex) {
      err((ex && ex.message) || 'Create failed'); btn.disabled = false; btn.textContent = 'Create';
    }
  },

  readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve({ name: file.name, mimeType: file.type || 'application/octet-stream', base64: String(r.result).split(',')[1] });
      r.onerror = () => reject(new Error('Could not read file'));
      r.readAsDataURL(file);
    });
  },

  /* ---------------- Edit (all fields + file) ---------------- */
  async openEdit(doc) {
    this.injectCss();
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="dcBack">← Back</button><div class="dc-card"><p class="dc-muted">Loading…</p></div></div>`;
    document.getElementById('dcBack').addEventListener('click', () => this.openDetail(doc.DocumentID));
    let deps = [];
    try { deps = (await API.get('getDocumentFormContext', { token: this.token() })).departments || []; } catch (e) { }
    this.departments = deps;
    const cur = String(doc.SharedDepartments || '').split(',').map(x => x.trim()).filter(Boolean);
    const typeOpts = DC_TYPES.map(t => `<option value="${t}" ${t === String(doc.DocumentType).toUpperCase() ? 'selected' : ''}>${DC_TYPE_LABEL[t]}</option>`).join('');
    const deptOpts = deps.map(d => `<option value="${dEsc(d.departmentId)}" ${d.departmentId === doc.DepartmentID ? 'selected' : ''}>${dEsc(d.name)} (${dEsc(d.departmentId)})</option>`).join('');
    const shareChecks = deps.map(d => `<label class="dc-chk"><input type="checkbox" class="dcShare" value="${dEsc(d.departmentId)}" ${cur.indexOf(d.departmentId) !== -1 ? 'checked' : ''}> ${dEsc(d.name)} (${dEsc(d.departmentId)})</label>`).join('');
    const hasFile = doc.FileID && String(doc.FileID).indexOf('MOCK_') !== 0;

    c.innerHTML = `
      <div class="dc-wrap">
        <button class="dc-back" id="dcBack">← Back</button>
        <div class="dc-ph" style="margin-bottom:14px"><h1 style="margin:0">Edit Document</h1></div>
        <div class="dc-card">
          <div class="dc-2col">
            <div class="dc-field"><label>Document type <span class="dc-req">*</span></label><select class="dc-sel" id="dcType">${typeOpts}</select></div>
            <div class="dc-field"><label>Owner department <span class="dc-req">*</span></label><select class="dc-sel" id="dcDept">${deptOpts}</select></div>
          </div>
          <div class="dc-2col">
            <div class="dc-field"><label>Document number <span class="dc-req">*</span></label><input class="dc-in" id="dcNo" value="${dEsc(doc.DocNumber)}"></div>
            <div class="dc-field"><label>Revision <span class="dc-req">*</span></label><input class="dc-in" id="dcRev" value="${dEsc(doc.Revision)}"></div>
          </div>
          <div class="dc-field"><label>Title <span class="dc-req">*</span></label><input class="dc-in" id="dcTitle" value="${dEsc(doc.Title)}"></div>
          <div class="dc-field"><label>Reason / details <span class="dc-req">*</span></label><textarea class="dc-ta" id="dcReason">${dEsc(doc.Reason || '')}</textarea></div>
          <div class="dc-field"><label>Distribute copies to (shared departments)</label><div class="dc-checks">${shareChecks}</div></div>
          <div class="dc-field"><label>File</label>
            <div class="dc-file" id="dcFileRow">${hasFile ? `ไฟล์ปัจจุบัน: <b>${dEsc(doc.FileName)}</b> <button class="dc-btn dc-danger" id="dcRemoveFile" type="button" style="margin-left:8px;padding:4px 10px">Remove</button>` : '<span class="dc-faint">ยังไม่มีไฟล์แนบ</span>'}</div>
            <input type="file" id="dcFile" accept=".pdf,.doc,.docx,.xls,.xlsx" class="dc-file" style="margin-top:8px">
            <div class="dc-faint" style="font-size:12px;margin-top:4px">${hasFile ? 'เลือกไฟล์ใหม่เพื่อแทนที่ (ไฟล์เก่าจะถูกลบจาก Drive)' : 'เลือกไฟล์เพื่อแนบ'} · PDF/Word/Excel · max 5 MB</div>
          </div>
          <div id="dcErr"></div>
          <div class="dc-bar">
            <button class="dc-btn dc-ghost" id="dcCancel" type="button">Cancel</button>
            <button class="dc-btn dc-primary" id="dcSave" type="button">Save changes</button>
          </div>
        </div>
      </div>`;
    document.getElementById('dcBack').addEventListener('click', () => this.openDetail(doc.DocumentID));
    document.getElementById('dcCancel').addEventListener('click', () => this.openDetail(doc.DocumentID));
    document.getElementById('dcSave').addEventListener('click', () => this.submitEdit(doc));
    const rm = document.getElementById('dcRemoveFile');
    if (rm) rm.addEventListener('click', () => {
      this.confirmModal({
        title: 'Remove file', message: 'ลบไฟล์แนบออกจากเอกสาร (ลบจาก Drive ด้วย)?', confirmLabel: 'Remove', danger: true,
        onConfirm: (v, done) => API.post('removeDocumentFile', { token: this.token(), documentId: doc.DocumentID })
          .then(() => { done(); this.toast('ลบไฟล์แล้ว'); this.reopenEdit(doc.DocumentID); })
          .catch(ex => done((ex && ex.message) || 'ล้มเหลว'))
      });
    });
  },

  async reopenEdit(documentId) {
    const r = await API.get('getDocument', { token: this.token(), documentId });
    this.openEdit(r.document);
  },

  async submitEdit(doc) {
    const $ = id => document.getElementById(id);
    const err = m => { $('dcErr').innerHTML = m ? `<div class="dc-err">${dEsc(m)}</div>` : ''; };
    const v = {
      documentId: doc.DocumentID, DocNumber: $('dcNo').value.trim(), Revision: $('dcRev').value.trim(),
      Title: $('dcTitle').value.trim(), DocumentType: $('dcType').value, DepartmentID: $('dcDept').value,
      reason: $('dcReason').value.trim(),
      sharedDepartments: Array.from(document.querySelectorAll('.dcShare:checked')).map(x => x.value)
    };
    if (!v.DocNumber || !v.Revision || !v.Title || !v.DepartmentID) { err('กรุณากรอกช่องที่จำเป็น'); return; }
    if (!v.reason) { err('กรุณาระบุเหตุผล / รายละเอียด'); return; }
    const fileEl = $('dcFile');
    const btn = $('dcSave'); btn.disabled = true; btn.textContent = 'กำลังบันทึก…';
    try {
      await API.post('updateDocumentMeta', Object.assign({ token: this.token() }, v));
      if (fileEl.files && fileEl.files[0]) {
        const file = await this.readFile(fileEl.files[0]);
        await API.post('replaceDocumentFile', { token: this.token(), documentId: doc.DocumentID, file: file });
      }
      this.toast('บันทึกแล้ว');
      this.openDetail(doc.DocumentID);
    } catch (ex) { err((ex && ex.message) || 'บันทึกไม่สำเร็จ'); btn.disabled = false; btn.textContent = 'Save changes'; }
  },

  /* ---------------- Detail ---------------- */
  async openDetail(documentId) {
    this.injectCss();
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="dcBack">← Back</button><div class="dc-card"><p class="dc-muted">Loading…</p></div></div>`;
    document.getElementById('dcBack').addEventListener('click', () => this.load());
    try {
      const [docR, histR, ackR] = await Promise.all([
        API.get('getDocument', { token: this.token(), documentId }),
        API.get('getDocumentHistory', { token: this.token(), documentId }),
        API.get('listAcknowledgements', { token: this.token(), documentId })
      ]);
      await this.ensureDepts();
      this._actions = docR.actions || [];
      this._ackDepts = docR.ackDepts || [];
      this.renderDetail(docR.document, histR.history || [], ackR);
    } catch (err) {
      c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="dcBack2">← Back</button><div class="dc-card"><div class="dc-err">${dEsc(err.message || 'Not found')}</div></div></div>`;
      const b = document.getElementById('dcBack2'); if (b) b.addEventListener('click', () => this.load());
    }
  },

  renderDetail(doc, history, ack) {
    const c = document.getElementById('pageContent');
    const sharedIds = String(doc.SharedDepartments || '').split(',').map(x => x.trim()).filter(Boolean);
    const sharedNames = sharedIds.map(id => this.deptName(id));
    const ackDepts = (ack.acknowledgements || []).map(a => String(a.DepartmentID).trim());
    const ackTargets = [String(doc.DepartmentID).trim()].concat(sharedIds);
    const skippedAck = (String(doc.Status).toUpperCase() === 'EFFECTIVE')
      ? ackTargets.filter((d, i) => d && ackTargets.indexOf(d) === i && ackDepts.indexOf(d) === -1) : [];
    const ackRows = (ack.acknowledgements || []).map(a => `
      <tr><td>${dEsc(this.deptName(a.DepartmentID))}</td>
        <td>${String(a.Status).toUpperCase() === 'ACKNOWLEDGED' ? '<span class="dc-badge dc-b-ok">Acknowledged</span>' : '<span class="dc-badge dc-b-off">Pending</span>'}</td>
        <td>${dEsc(a.AcknowledgedByName || '—')}</td><td>${a.AcknowledgedDate ? dcDate(a.AcknowledgedDate) : '—'}</td></tr>`).join('');
    const tl = history.slice().reverse().map(h => `
      <li><span class="dot"></span>
        <div class="act">${dEsc(h.Action)}${h.Comment ? ' — <span class="dc-muted" style="font-weight:400">' + dEsc(h.Comment) + '</span>' : ''}</div>
        <div class="meta">${dEsc(h.ActorEmployeeID || '')} · ${dcDate(h.Timestamp)}</div>
      </li>`).join('');

    c.innerHTML = `
      <div class="dc-wrap">
        <button class="dc-back" id="dcBack">← Back to list</button>
        <div class="dc-card">
          <div class="dc-ph">
            <div><h1 style="margin:0;font-size:20px">${dEsc(doc.Title)}</h1>
              <p class="dc-muted" style="margin:4px 0 0"><span class="dc-id">${dEsc(doc.DocNumber)}</span> · RV${dEsc(doc.Revision)} · ${DC_TYPE_LABEL[String(doc.DocumentType).toUpperCase()] || dEsc(doc.DocumentType)}</p></div>
            <div>${dcBadgeBig(doc.Status)}</div>
          </div>
          <hr style="border:0;border-top:1px solid #eef0f3;margin:14px 0">
          <div class="dc-kv">
            <div class="k">Owner department</div><div>${dEsc(this.deptName(doc.DepartmentID))}</div>
            <div class="k">Request type</div><div>${dEsc(doc.RequestType || 'NEW')}</div>
            <div class="k">Shared with</div><div>${sharedNames.length ? sharedNames.map(dEsc).join(', ') : '—'}</div>
            <div class="k">Reason</div><div>${dEsc(doc.Reason || '—')}</div>
            <div class="k">Created</div><div>${dEsc(doc.CreatedByName || '')} · ${dcDate(doc.CreatedDate)}</div>
            ${doc.DeptApprovedByName ? `<div class="k">Dept approved</div><div>${dEsc(doc.DeptApprovedByName)} · ${dcDate(doc.DeptApprovedDate)}</div>` : ''}
            ${doc.ReviewedByName ? `<div class="k">QMS reviewed</div><div>${dEsc(doc.ReviewedByName)} · ${dcDate(doc.ReviewedDate)}</div>` : ''}
            ${doc.DarNo ? `<div class="k">DAR No.</div><div><b>${dEsc(doc.DarNo)}</b></div>` : ''}
            ${doc.FourMChange ? `<div class="k">4M Change</div><div>${doc.FourMChange === 'RELATED' ? 'เกี่ยวข้องกับ 4M Change' : 'ไม่เกี่ยวข้องกับ 4M Change'}</div>` : ''}
            ${doc.ReviewComment ? `<div class="k">ข้อคิดเห็น QMS</div><div>${dEsc(doc.ReviewComment)}</div>` : ''}
            ${doc.PublishedByName ? `<div class="k">Published</div><div>${dEsc(doc.PublishedByName)} · ${dcDate(doc.PublishedDate || doc.EffectiveDate)}</div>` : ''}
          </div>
          ${(doc.FileID && String(doc.FileID).indexOf('MOCK_') !== 0) ? `<div class="dc-filebar"><span class="dc-file-name">📄 ${dEsc(doc.FileName)}</span><button class="dc-btn dc-ghost" id="dcView" type="button">View</button><button class="dc-btn" id="dcDl" type="button">Download</button></div>` : ''}
        </div>

        ${this.renderActions(doc)}

        ${((ack.acknowledgements && ack.acknowledgements.length) || skippedAck.length) ? `
        <div class="dc-card">
          <div class="dc-ph" style="margin-bottom:10px"><h2 style="margin:0;font-size:15px">Acknowledgement</h2>
            <span class="dc-muted" style="font-size:13px">${ack.acknowledged}/${ack.total} departments</span></div>
          ${ack.acknowledgements && ack.acknowledgements.length ? `<table class="dc-tbl"><thead><tr><th>Department</th><th>Status</th><th>By</th><th>When</th></tr></thead><tbody>${ackRows}</tbody></table>` : ''}
          ${skippedAck.length ? `<div class="dc-warn">⚠ ข้ามการรับทราบ (ไม่มีหัวหน้าฝ่าย): ${skippedAck.map(d => dEsc(this.deptName(d))).join(', ')}</div>` : ''}
        </div>` : ''}

        <div class="dc-card">
          <h2 style="margin:0 0 12px;font-size:15px">History</h2>
          <ul class="dc-tl">${tl || '<li><span class="dot"></span><div class="meta">No history</div></li>'}</ul>
        </div>
      </div>
      <div class="dc-toast" id="dcToast"></div>`;

    document.getElementById('dcBack').addEventListener('click', () => this.load());
    const dl = document.getElementById('dcDl');
    if (dl) dl.addEventListener('click', () => this.download(doc.DocumentID));
    const vw = document.getElementById('dcView');
    if (vw) vw.addEventListener('click', () => this.view(doc.DocumentID));
    this.wireActions(doc);
  },

  renderActions(doc) {
    const acts = this._actions || [];
    const ackDepts = this._ackDepts || [];
    const b = [];
    const btn = (act, label, cls) => `<button class="dc-btn ${cls}" data-act="${act}" type="button">${label}</button>`;
    if (acts.indexOf('edit') !== -1) b.push(btn('edit', 'Edit', 'dc-ghost'));
    if (acts.indexOf('submit') !== -1) b.push(btn('submit', 'Submit for approval', 'dc-primary'));
    if (acts.indexOf('approve') !== -1) b.push(btn('approve', 'Approve', 'dc-primary'));
    if (acts.indexOf('review') !== -1) b.push(btn('review', 'Verify', 'dc-primary'));
    if (acts.indexOf('forward') !== -1) b.push(btn('forward', 'Forward to publish', 'dc-primary'));
    if (acts.indexOf('publish') !== -1) b.push(btn('publish', 'Publish (make effective)', 'dc-primary'));
    if (acts.indexOf('reject') !== -1) b.push(btn('reject', 'Reject', 'dc-danger'));
    if (acts.indexOf('cancel') !== -1) b.push(btn('cancel', 'Cancel document', 'dc-danger'));
    if (acts.indexOf('acknowledge') !== -1) ackDepts.forEach(d =>
      b.push(`<button class="dc-btn dc-primary" data-ack="${dEsc(d)}" type="button">Acknowledge — ${dEsc(this.deptName(d))}</button>`));
    if (!b.length) return '';
    return `<div class="dc-card"><h2 style="margin:0 0 12px;font-size:15px">Actions</h2><div class="dc-actbar">${b.join('')}</div><div id="dcActErr"></div></div>`;
  },

  wireActions(doc) {
    const id = doc.DocumentID;
    const self = this;
    document.querySelectorAll('#pageContent [data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        if (act === 'edit') self.openEdit(doc);
        else if (act === 'submit') self.doAction('submitDocument', { documentId: id }, 'Submitted for approval', btn);
        else if (act === 'approve') self.doAction('approveDocumentStep', { documentId: id, decision: 'APPROVE' }, 'Approved', btn);
        else if (act === 'forward') self.doAction('forwardToPublish', { documentId: id }, 'Forwarded to publishing', btn);
        else if (act === 'review') self.reviewModal(doc);
        else if (act === 'publish') self.confirmModal({
          title: 'Publish document', message: 'ประกาศใช้เอกสารนี้? ฝ่ายที่เกี่ยวข้องจะได้รับแจ้งให้รับทราบ', confirmLabel: 'Publish',
          onConfirm: (v, done) => self.runModal('approveDocumentStep', { documentId: id, decision: 'APPROVE', comment: v.comment }, 'Published — document is now EFFECTIVE', done, id)
        });
        else if (act === 'reject') {
          const rst = String(doc.Status).toUpperCase();
          const viaReview = (rst === 'DEPT_APPROVED' || rst === 'UNDER_REVIEW');
          self.confirmModal({
            title: 'Reject document', message: viaReview ? 'ตีกลับให้ฝ่ายแก้ไข (กลับเป็นฉบับร่าง)' : 'ตีกลับเอกสารไปขั้นก่อนหน้าเพื่อแก้ไข',
            requireComment: true, commentLabel: 'เหตุผลที่ตีกลับ (จำเป็น)', confirmLabel: 'Reject', danger: true,
            onConfirm: (v, done) => viaReview
              ? self.runModal('rejectReview', { documentId: id, comment: v.comment }, 'ตีกลับให้แก้ไขแล้ว', done, id)
              : self.runModal('approveDocumentStep', { documentId: id, decision: 'REJECT', comment: v.comment }, 'Rejected — sent back for edit', done, id)
          });
        }
        else if (act === 'cancel') self.confirmModal({
          title: 'Cancel document', message: 'ยกเลิกเอกสารถาวร — จะทำอะไรต่อไม่ได้อีก', requireComment: true, commentLabel: 'เหตุผลที่ยกเลิก (จำเป็น)', requireMaster: true, confirmLabel: 'Cancel document', danger: true,
          onConfirm: (v, done) => self.runModal('cancelDocument', { documentId: id, comment: v.comment, masterPassword: v.master }, 'ยกเลิกเอกสารแล้ว', done, id)
        });
      });
    });
    document.querySelectorAll('#pageContent [data-ack]').forEach(btn => {
      btn.addEventListener('click', () => self.doAction('acknowledgeDocument', { documentId: id, departmentId: btn.dataset.ack }, 'Acknowledged', btn));
    });
  },

  async doAction(endpoint, payload, successMsg, btnEl) {
    const orig = btnEl ? btnEl.textContent : '';
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'กำลังบันทึก…'; }
    try {
      await API.post(endpoint, Object.assign({ token: this.token() }, payload));
      this.toast(successMsg);
      this.openDetail(payload.documentId);
    } catch (ex) {
      const e = document.getElementById('dcActErr');
      if (e) e.innerHTML = `<div class="dc-err" style="margin-top:10px">${dEsc((ex && ex.message) || 'ล้มเหลว')}</div>`;
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = orig; }
    }
  },

  // used from inside a modal: run the call, report back via done(errMsg), refresh on success
  runModal(endpoint, payload, successMsg, done, documentId) {
    API.post(endpoint, Object.assign({ token: this.token() }, payload))
      .then(() => { done(); this.toast(successMsg); this.openDetail(documentId); })
      .catch(ex => done((ex && ex.message) || 'ล้มเหลว'));
  },

  confirmModal(opts) {
    const scrim = document.createElement('div');
    scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal">
      <h2 style="margin:0 0 6px;font-size:16px">${dEsc(opts.title)}</h2>
      ${opts.message ? `<p class="dc-muted" style="font-size:13px;margin:0 0 12px">${dEsc(opts.message)}</p>` : ''}
      ${opts.requireComment ? `<label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px">${dEsc(opts.commentLabel || 'Comment')}</label><textarea class="dc-ta" id="dcMComment"></textarea>` : ''}
      ${opts.requireMaster ? `<label style="font-size:12.5px;font-weight:600;display:block;margin:10px 0 4px">Master password</label><input class="dc-in" id="dcMMaster" type="password" autocomplete="off">` : ''}
      <div id="dcMErr"></div>
      <div style="display:flex;gap:9px;justify-content:flex-end;margin-top:16px">
        <button class="dc-btn dc-ghost" id="dcMCancel" type="button">Cancel</button>
        <button class="dc-btn ${opts.danger ? 'dc-danger' : 'dc-primary'}" id="dcMOk" type="button">${dEsc(opts.confirmLabel || 'Confirm')}</button>
      </div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#dcMCancel').addEventListener('click', close);
    scrim.addEventListener('click', e => { if (e.target === scrim) close(); });
    scrim.querySelector('#dcMOk').addEventListener('click', () => {
      const c = opts.requireComment ? scrim.querySelector('#dcMComment').value.trim() : '';
      const m = opts.requireMaster ? scrim.querySelector('#dcMMaster').value : '';
      if (opts.requireComment && !c) { scrim.querySelector('#dcMErr').innerHTML = '<div class="dc-err" style="margin-top:8px">กรุณาระบุเหตุผล</div>'; return; }
      if (opts.requireMaster && !m) { scrim.querySelector('#dcMErr').innerHTML = '<div class="dc-err" style="margin-top:8px">กรุณากรอก master password</div>'; return; }
      const ok = scrim.querySelector('#dcMOk'); ok.disabled = true; ok.textContent = 'กำลังบันทึก…';
      opts.onConfirm({ comment: c, master: m }, (errMsg) => {
        if (errMsg) { scrim.querySelector('#dcMErr').innerHTML = `<div class="dc-err" style="margin-top:8px">${dEsc(errMsg)}</div>`; ok.disabled = false; ok.textContent = opts.confirmLabel || 'Confirm'; }
        else close();
      });
    });
  },

  reviewModal(doc) {
    const current = String(doc.SharedDepartments || '').split(',').map(x => x.trim()).filter(Boolean);
    const owner = String(doc.DepartmentID).trim();
    const checks = (this.departments.length ? this.departments : Object.keys(this.deptMap).map(id => ({ departmentId: id, name: this.deptMap[id] })))
      .filter(d => d.departmentId !== owner)
      .map(d => `<label class="dc-chk"><input type="checkbox" class="dcRShare" value="${dEsc(d.departmentId)}" ${current.indexOf(d.departmentId) !== -1 ? 'checked' : ''}> ${dEsc(d.name)} (${dEsc(d.departmentId)})</label>`).join('');
    const scrim = document.createElement('div');
    scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal" style="max-width:520px">
      <h2 style="margin:0 0 6px;font-size:16px">Verify document</h2>
      <p class="dc-muted" style="font-size:13px;margin:0 0 12px">ตรวจสอบแล้วปรับฝ่ายที่ต้องแชร์ (ถ้าจำเป็น) แล้วยืนยันเพื่อส่งให้ QMS Manager ประกาศใช้</p>
      <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:6px">Distribute copies to</label>
      <div class="dc-checks">${checks}</div>
      <div style="margin-top:14px"><label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px">4M Change <span class="dc-req">*</span></label>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:13.5px">
          <label style="display:flex;gap:7px;align-items:center"><input type="radio" name="dc4m" value="RELATED"> เกี่ยวข้องกับ 4M Change</label>
          <label style="display:flex;gap:7px;align-items:center"><input type="radio" name="dc4m" value="NOT_RELATED"> ไม่เกี่ยวข้องกับ 4M Change</label>
        </div></div>
      <div style="margin-top:12px"><label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px">ข้อคิดเห็น (ผู้ควบคุมเอกสาร) <span class="dc-req">*</span></label>
        <textarea class="dc-ta" id="dcRComment"></textarea></div>
      <div id="dcMErr"></div>
      <div style="display:flex;gap:9px;justify-content:flex-end;margin-top:16px">
        <button class="dc-btn dc-ghost" id="dcMCancel" type="button">Cancel</button>
        <button class="dc-btn dc-primary" id="dcMOk" type="button">Verify &amp; send to Manager</button>
      </div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    const self = this;
    scrim.querySelector('#dcMCancel').addEventListener('click', close);
    scrim.addEventListener('click', e => { if (e.target === scrim) close(); });
    scrim.querySelector('#dcMOk').addEventListener('click', () => {
      const shared = Array.from(scrim.querySelectorAll('.dcRShare:checked')).map(x => x.value);
      const fourM = (scrim.querySelector('input[name="dc4m"]:checked') || {}).value || '';
      const comment = scrim.querySelector('#dcRComment').value.trim();
      const showErr = m => { scrim.querySelector('#dcMErr').innerHTML = `<div class="dc-err" style="margin-top:8px">${dEsc(m)}</div>`; };
      if (!fourM) { showErr('กรุณาเลือก 4M Change'); return; }
      if (!comment) { showErr('กรุณาใส่ข้อคิดเห็น'); return; }
      const ok = scrim.querySelector('#dcMOk'); ok.disabled = true; ok.textContent = 'กำลังบันทึก…';
      API.post('reviewDocument', { token: self.token(), documentId: doc.DocumentID, sharedDepartments: shared, fourMChange: fourM, reviewComment: comment })
        .then(() => { close(); self.toast('Verified & sent to Manager'); self.openDetail(doc.DocumentID); })
        .catch(ex => { showErr((ex && ex.message) || 'ล้มเหลว'); ok.disabled = false; ok.textContent = 'Verify & send to Manager'; });
    });
  },

  b64ToBlob(b64, mime) {
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime || 'application/octet-stream' });
  },

  async download(documentId) {
    try {
      const r = await API.get('downloadDocumentFile', { token: this.token(), documentId });
      const url = URL.createObjectURL(this.b64ToBlob(r.base64, r.mimeType));
      const a = document.createElement('a');
      a.href = url; a.download = r.fileName || 'document';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (ex) { this.toast((ex && ex.message) || 'Download failed'); }
  },

  async view(documentId) {
    try {
      const r = await API.get('downloadDocumentFile', { token: this.token(), documentId });
      const url = URL.createObjectURL(this.b64ToBlob(r.base64, r.mimeType));
      const w = window.open(url, '_blank');
      if (!w) this.toast('เบราว์เซอร์บล็อกป๊อปอัพ — อนุญาตแล้วลองใหม่');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (ex) { this.toast((ex && ex.message) || 'เปิดดูไม่สำเร็จ'); }
  },

  toast(msg) {
    const t = document.getElementById('dcToast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  }
};

function loadDocuments() { DocumentsPage.load(); }
