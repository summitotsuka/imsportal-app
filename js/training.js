/* Training module — Phase 1: Course catalog + Training History (records) */
const TRN_COURSE_TYPES = [['INTERNAL', 'Internal (ภายใน)'], ['EXTERNAL', 'External (ภายนอก)'], ['OJT', 'OJT (สอนงาน)'], ['ORIENTATION', 'Orientation (ปฐมนิเทศ)']];
const TRN_RESULTS = [['PASS', 'ผ่าน'], ['FAIL', 'ไม่ผ่าน'], ['ATTENDED', 'เข้าร่วม']];
const TRN_CERT_TYPES = [['NONE', 'ไม่มี'], ['INTERNAL', 'ภายใน'], ['INSTITUTE', 'สถาบัน'], ['LICENSE', 'License']];

function trnEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function trnDate(v) { if (!v) return '—'; try { const d = new Date(v); if (isNaN(d)) return String(v); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); } catch (e) { return String(v); } }
function trnLabel(list, v) { const f = list.find(x => x[0] === String(v).toUpperCase()); return f ? f[1] : (v || '—'); }
function trnFileUrl(id) { return 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view'; }
function trnReadFile(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res({ base64: String(r.result).split(',')[1], mimeType: file.type || 'application/octet-stream', fileName: file.name }); r.onerror = () => rej(new Error('อ่านไฟล์ไม่ได้')); r.readAsDataURL(file); }); }

/** Open a print-ready window; wait for images (logo) so nothing prints half-loaded. */
function trnPrint(title, pageRule, bodyHtml) {
  const w = window.open('', '_blank');
  if (!w) { alert('Browser blocked the print window — please allow pop-ups and try again.'); return; }
  w.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${trnEsc(title)}</title><style>
    @page{${pageRule}}
    *{box-sizing:border-box}
    body{font-family:system-ui,-apple-system,"Segoe UI",Sarabun,Tahoma,sans-serif;color:#0b0b0b;margin:0;font-size:11px;line-height:1.4}
    table{border-collapse:collapse;width:100%}
    .hdr td{border:1px solid #000;padding:2px 5px;vertical-align:middle}
    .hdr .k{width:74px;font-size:9.5px;color:#000;background:#f4f3f0}
    .hdr .v{width:64px;text-align:center;font-size:10px}
    .meta{margin:9px 0 6px;font-size:12px}
    .grid th,.grid td{border:1px solid #000;padding:4px 6px;vertical-align:top;text-align:left}
    .grid th{background:#f0efec;font-weight:600;text-align:center;font-size:11px}
    .grid td.c{text-align:center}
    .note{margin-top:12px;font-size:10.5px;line-height:1.7}
    .fm{padding-bottom:4px}
    tr,img{break-inside:avoid;page-break-inside:avoid}
  </style></head><body>${bodyHtml}<script>
  (function(){var i=Array.prototype.slice.call(document.images),n=i.length;
  function go(){setTimeout(function(){window.focus();window.print();},350);}
  if(!n)return go();function d(){if(--n<=0)go();}
  i.forEach(function(m){if(m.complete)d();else{m.onload=d;m.onerror=d;}});})();
  <\/script></body></html>`);
  w.document.close();
}

/** CSV with a BOM so Excel opens Thai correctly. */
function trnCsv(filename, header, rows) {
  const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const body = [header.map(esc).join(',')].concat(rows.map(r => r.map(esc).join(','))).join('\r\n');
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

const Training = {
  deptMap: {},
  token() { return AUTH.getToken(); },
  css() { if (typeof DocumentsPage !== 'undefined' && DocumentsPage.injectCss) DocumentsPage.injectCss(); },
  async ensureDepts() {
    if (Object.keys(this.deptMap).length) return;
    try { (await API.get('getDocumentFormContext', { token: this.token() })).departments.forEach(d => { this.deptMap[d.departmentId] = d.name; }); } catch (e) { }
  },
  deptName(id) { return this.deptMap[String(id).trim()] || id || '—'; },
  toast(m) { const t = document.getElementById('dcToast'); if (!t) { alert(m); return; } t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); },

  /* ============================ Courses ============================ */
  async loadCourses() {
    this.css();
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><p class="dc-muted" style="padding:8px">Loading…</p></div>`;
    try { const r = await API.get('getTrainingCourses', { token: this.token() }); this.renderCourses(r.courses || []); }
    catch (e) { c.innerHTML = `<div class="dc-wrap"><p style="color:#b91c1c;padding:8px">Failed to load: ${trnEsc(e.message || '')}</p></div>`; }
  },

  renderCourses(list) {
    const rows = list.map(o => `<tr class="dc-row" data-id="${trnEsc(o.CourseID)}">
      <td><span class="dc-id">${trnEsc(o.CourseCode)}</span></td>
      <td>${trnEsc(o.CourseName)}</td>
      <td>${trnEsc(trnLabel(TRN_COURSE_TYPES, o.CourseType))}</td>
      <td>${trnEsc(o.Category)}</td>
      <td class="dc-faint">${o.DurationHours ? trnEsc(o.DurationHours) + ' ชม.' : '—'}</td>
      <td>${o.MaterialFileID ? '📎' : ''}</td>
      <td>${String(o.Status).toUpperCase() === 'ACTIVE' ? '<span class="dc-badge dc-b-ok">Active</span>' : '<span class="dc-badge dc-b-off">Inactive</span>'}</td>
    </tr>`).join('');
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap">
      <div class="dc-ph" style="margin-bottom:14px"><div><h1 style="margin:0">หลักสูตรฝึกอบรม</h1>
        <p class="dc-muted" style="margin:4px 0 0">Training course catalog</p></div>
        <button class="dc-btn dc-primary" id="trnNewCourse" type="button">+ New Course</button></div>
      <div class="dc-card">${list.length ? `<table class="dc-tbl"><thead><tr><th>Code</th><th>ชื่อหลักสูตร</th><th>ประเภท</th><th>หมวด</th><th>ชั่วโมง</th><th>คู่มือ</th><th>สถานะ</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="dc-faint" style="padding:6px;color:#9ca3af">ยังไม่มีหลักสูตร</p>'}</div>
    </div><div class="dc-toast" id="dcToast"></div>`;
    document.getElementById('trnNewCourse').addEventListener('click', () => this.courseForm());
    c.querySelectorAll('[data-id]').forEach(r => r.addEventListener('click', () => this.openCourse(r.dataset.id)));
  },

  async openCourse(courseId) {
    this.css();
    try { const r = await API.get('getTrainingCourse', { token: this.token(), courseId }); this.courseForm(r.course); }
    catch (e) { this.toast(e.message || 'ล้มเหลว'); }
  },

  courseForm(existing) {
    this.css();
    const ed = !!existing;
    const sel = (id, list, cur) => { const has = ed && cur; return `<select class="dc-in" id="${id}"><option value="" disabled ${has ? '' : 'selected'}>— เลือก —</option>${list.map(o => `<option value="${o[0]}" ${has && String(cur).toUpperCase() === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`; };
    const g = k => ed ? trnEsc(existing[k] || '') : '';
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="trnBack">← Back</button>
      <div class="dc-card">
        <h1 style="margin:0 0 4px;font-size:20px">${ed ? 'Edit Course' : 'New Course'}</h1>
        <p class="dc-muted" style="margin:0 0 16px">${ed ? trnEsc(existing.CourseCode) : 'รหัสหลักสูตรจะออกอัตโนมัติ (TRN-YY-XXX)'}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="dc-field dc-span2"><label>ชื่อหลักสูตร <span class="dc-req">*</span></label><input class="dc-in" id="cName" value="${g('CourseName')}"></div>
          <div class="dc-field"><label>ประเภท <span class="dc-req">*</span></label>${sel('cType', TRN_COURSE_TYPES, existing && existing.CourseType)}</div>
          <div class="dc-field"><label>หมวดหมู่</label><input class="dc-in" id="cCat" value="${g('Category')}"></div>
          <div class="dc-field"><label>ตำแหน่งเป้าหมาย</label><input class="dc-in" id="cTarget" value="${g('TargetPosition')}"></div>
          <div class="dc-field"><label>ชั่วโมง</label><input type="number" min="0" step="0.5" class="dc-in" id="cHours" value="${g('DurationHours')}"></div>
          <div class="dc-field dc-span2"><label>อ้างอิง (WI / JES / มาตรฐาน)</label><input class="dc-in" id="cRef" value="${g('Reference')}"></div>
          <div class="dc-field dc-span2"><label>รายละเอียด</label><textarea class="dc-in" id="cDesc" rows="2">${g('Description')}</textarea></div>
          ${ed ? `<div class="dc-field"><label>สถานะ</label><select class="dc-in" id="cStatus"><option value="ACTIVE" ${String(existing.Status).toUpperCase() !== 'INACTIVE' ? 'selected' : ''}>Active</option><option value="INACTIVE" ${String(existing.Status).toUpperCase() === 'INACTIVE' ? 'selected' : ''}>Inactive</option></select></div>` : ''}
          <div class="dc-field dc-span2"><label>คู่มือการฝึกอบรม</label><div id="cMat">${ed ? this.fileChip(existing.MaterialFileID, existing.MaterialFileName, 'material') : '<span class="dc-faint" style="font-size:12px;color:#9ca3af">บันทึกหลักสูตรก่อน แล้วเปิดหลักสูตรจากรายการเพื่อแนบคู่มือ</span>'}</div></div>
        </div>
        <div id="cErr"></div>
        <div class="dc-bar"><button class="dc-btn dc-ghost" id="cCancel" type="button">Cancel</button>${ed ? '' : '<button class="dc-btn dc-ghost" id="cSaveNew" type="button">Create &amp; New</button>'}<button class="dc-btn dc-primary" id="cSave" type="button">${ed ? 'Save changes' : 'Create'}</button></div>
      </div></div><div class="dc-toast" id="dcToast"></div>`;
    const back = () => this.loadCourses();
    document.getElementById('trnBack').addEventListener('click', back);
    document.getElementById('cCancel').addEventListener('click', back);
    document.getElementById('cSave').addEventListener('click', () => this.saveCourse(ed ? existing.CourseID : null, false));
    const cSaveNew = document.getElementById('cSaveNew');
    if (cSaveNew) cSaveNew.addEventListener('click', () => this.saveCourse(null, true));
    if (ed) this.wireMaterial(existing.CourseID);
  },

  async saveCourse(courseId, andNew) {
    const err = document.getElementById('cErr');
    const v = id => (document.getElementById(id) || {}).value;
    const payload = { token: this.token(), courseId: courseId || undefined, CourseName: (v('cName') || '').trim(), CourseType: v('cType'), Category: (v('cCat') || '').trim(), TargetPosition: (v('cTarget') || '').trim(), DurationHours: v('cHours'), Reference: (v('cRef') || '').trim(), Description: (v('cDesc') || '').trim() };
    if (courseId) payload.Status = v('cStatus');
    if (!payload.CourseName) { err.innerHTML = '<div class="dc-err">กรุณากรอกชื่อหลักสูตร</div>'; return; }
    if (!payload.CourseType) { err.innerHTML = '<div class="dc-err">กรุณาเลือกประเภท</div>'; return; }
    const btn = document.getElementById(andNew ? 'cSaveNew' : 'cSave');
    const prev = btn.textContent; btn.disabled = true; btn.textContent = 'Processing…';
    try {
      if (courseId) { await API.post('updateCourse', payload); this._courses = null; this.toast('บันทึกแล้ว'); this.loadCourses(); }
      else {
        const r = await API.post('createCourse', payload);
        this._courses = null;                       // so course dropdowns pick the new one up
        this.toast('สร้างหลักสูตรแล้ว: ' + r.courseCode);
        if (andNew) this.courseForm(); else this.loadCourses();
      }
    } catch (ex) { btn.disabled = false; btn.textContent = prev; err.innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'ล้มเหลว')}</div>`; }
  },

  fileChip(fileId, fileName, kind) {
    if (!fileId) return `<button class="dc-btn dc-ghost" data-up="${kind}" type="button" style="padding:5px 12px;font-size:12px">📎 แนบไฟล์</button><input type="file" data-inp="${kind}" style="display:none">`;
    return `<span style="display:inline-flex;align-items:center;gap:8px">
      <a href="${trnFileUrl(fileId)}" target="_blank" rel="noopener" style="font-size:13px;color:#2563eb">📄 ${trnEsc(fileName || 'ไฟล์')}</a>
      <button data-del="${kind}" title="ลบ" type="button" style="border:0;background:none;color:#b91c1c;cursor:pointer">×</button></span>`;
  },

  wireMaterial(courseId) {
    const self = this;
    const box = document.getElementById('cMat');
    const wire = () => {
      const up = box.querySelector('[data-up]'), inp = box.querySelector('[data-inp]'), del = box.querySelector('[data-del]');
      if (up && inp) { up.addEventListener('click', () => inp.click()); inp.addEventListener('change', async () => { if (!inp.files[0]) return; up.disabled = true; up.textContent = 'กำลังอัปโหลด…'; try { const f = await trnReadFile(inp.files[0]); const r = await API.post('uploadCourseMaterial', { token: self.token(), courseId, base64: f.base64, mimeType: f.mimeType, fileName: f.fileName }); box.innerHTML = self.fileChip(r.fileId, r.fileName, 'material'); wire(); } catch (ex) { up.disabled = false; up.textContent = '📎 แนบไฟล์'; self.toast((ex && ex.message) || 'อัปโหลดไม่สำเร็จ'); } }); }
      if (del) del.addEventListener('click', async () => { if (!confirm('ลบคู่มือนี้?')) return; try { await API.post('deleteCourseMaterial', { token: self.token(), courseId }); box.innerHTML = self.fileChip('', '', 'material'); wire(); } catch (ex) { self.toast((ex && ex.message) || 'ลบไม่สำเร็จ'); } });
    };
    wire();
  },

  /* ============================ Records ============================ */
  async loadRecords() {
    this.css();
    await this.ensureDepts();
    await this.loadCourseOptions();
    const c = document.getElementById('pageContent');
    const deptOpts = Object.keys(this.deptMap).map(id => `<option value="${trnEsc(id)}">${trnEsc(this.deptMap[id])}</option>`).join('');
    c.innerHTML = `<div class="dc-wrap">
      <div class="dc-ph" style="margin-bottom:14px"><div><h1 style="margin:0">ประวัติการฝึกอบรม</h1>
        <p class="dc-muted" style="margin:4px 0 0">Training History (FM-HR-09) — ข้อมูลมาจากการดำเนินการฝึกอบรม (Phase 3) และการนำเข้า (Phase 6)</p></div></div>
      <div class="dc-card">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
          <input class="dc-in" id="fSearch" placeholder="ค้นหา ชื่อ/รหัส/หลักสูตร">
          <select class="dc-in" id="fDept"><option value="">ทุกฝ่าย</option>${deptOpts}</select>
          <select class="dc-in" id="fType"><option value="">ทุกประเภท</option>${TRN_COURSE_TYPES.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select>
          <select class="dc-in" id="fResult"><option value="">ทุกผล</option>${TRN_RESULTS.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select>
          <input type="date" class="dc-in" id="fFrom" title="ตั้งแต่"><input type="date" class="dc-in" id="fTo" title="ถึง">
        </div>
        <div class="dc-bar" style="justify-content:flex-start"><button class="dc-btn dc-primary" id="fApply" type="button">ค้นหา</button><button class="dc-btn dc-ghost" id="fCsv" type="button">⬇ CSV</button></div>
      </div>
      <div class="dc-card" id="recBox"><p class="dc-faint" style="color:#9ca3af">กดค้นหาเพื่อแสดงข้อมูล</p></div>
    </div><div class="dc-toast" id="dcToast"></div>`;
    document.getElementById('fApply').addEventListener('click', () => this.runRecords());
    document.getElementById('fCsv').addEventListener('click', () => this.csv());
    document.getElementById('fSearch').addEventListener('keydown', e => { if (e.key === 'Enter') this.runRecords(); });
    this.runRecords();
  },

  async loadCourseOptions() {
    if (this._courses) return;
    try { this._courses = (await API.get('getTrainingCourses', { token: this.token(), activeOnly: 'true' })).courses || []; } catch (e) { this._courses = []; }
  },

  async runRecords() {
    const v = id => (document.getElementById(id) || {}).value || '';
    const box = document.getElementById('recBox'); box.innerHTML = `<p class="dc-faint" style="color:#9ca3af">Loading…</p>`;
    try {
      const r = await API.get('getTrainingRecords', { token: this.token(), search: v('fSearch'), departmentId: v('fDept'), courseType: v('fType'), result: v('fResult'), from: v('fFrom'), to: v('fTo') });
      this._rows = r.records || [];
      this.renderRecords(this._rows);
    } catch (e) { box.innerHTML = `<p style="color:#b91c1c">${trnEsc(e.message || 'ล้มเหลว')}</p>`; }
  },

  renderRecords(rows) {
    const box = document.getElementById('recBox');
    if (!rows.length) { box.innerHTML = `<p class="dc-faint" style="color:#9ca3af">ไม่พบข้อมูล</p>`; return; }
    const badge = r => { const s = String(r || '').toUpperCase(); const m = { PASS: ['ผ่าน', 'dc-b-ok'], FAIL: ['ไม่ผ่าน', 'dc-b-cancel'], ATTENDED: ['เข้าร่วม', 'dc-b-info'] }[s]; return m ? `<span class="dc-badge ${m[1]}">${m[0]}</span>` : '—'; };
    box.innerHTML = `<div class="dc-faint" style="font-size:12px;margin-bottom:8px">พบ ${rows.length} รายการ</div>
      <div style="overflow:auto"><table class="dc-tbl"><thead><tr><th>วันที่</th><th>รหัส</th><th>ชื่อ</th><th>ฝ่าย</th><th>หลักสูตร</th><th>ประเภท</th><th>ผล</th><th>คะแนน</th><th>Cert</th></tr></thead>
      <tbody>${rows.map(o => `<tr class="dc-row" data-id="${trnEsc(o.HistoryID)}">
        <td style="white-space:nowrap">${trnDate(o.TrainingDate)}</td><td class="dc-faint">${trnEsc(o.EmployeeID)}</td><td>${trnEsc(o.EmployeeName)}</td>
        <td>${trnEsc(this.deptName(o.DepartmentID))}</td><td>${trnEsc(o.CourseName)}</td><td>${trnEsc(trnLabel(TRN_COURSE_TYPES, o.CourseType))}</td>
        <td>${badge(o.Result)}</td><td class="dc-faint">${o.Score === '' || o.Score == null ? '—' : trnEsc(o.Score)}</td><td>${o.CertFileID ? '📄' : ''}</td></tr>`).join('')}</tbody></table></div>`;
    box.querySelectorAll('[data-id]').forEach(r => r.addEventListener('click', () => this.openRecord(r.dataset.id)));
  },

  async openRecord(historyId) {
    try { const r = await API.get('getTrainingRecord', { token: this.token(), historyId }); this.recordForm(r.record); }
    catch (e) { this.toast(e.message || 'ล้มเหลว'); }
  },

  recordForm(existing) {
    this.css();
    const ed = !!existing;
    const g = k => ed ? trnEsc(existing[k] || '') : '';
    const gd = k => ed && existing[k] ? trnDate(existing[k]) : '';
    const courseOpts = `<option value="">— พิมพ์เองด้านล่าง —</option>` + (this._courses || []).map(c => `<option value="${trnEsc(c.CourseID)}" ${ed && String(existing.CourseID).trim() === String(c.CourseID) ? 'selected' : ''}>${trnEsc(c.CourseCode)} · ${trnEsc(c.CourseName)}</option>`).join('');
    const sel = (id, list, cur, blank) => `<select class="dc-in" id="${id}">${blank ? `<option value="">${blank}</option>` : ''}${list.map(o => `<option value="${o[0]}" ${String(cur || '').toUpperCase() === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="trnBack">← Back</button>
      <div class="dc-card">
        <h1 style="margin:0 0 16px;font-size:20px">${ed ? 'Edit Record' : 'New Training Record'}</h1>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="dc-field"><label>รหัสพนักงาน <span class="dc-req">*</span></label><input class="dc-in" id="rEmp" value="${g('EmployeeID')}" ${ed ? 'readonly' : ''}></div>
          <div class="dc-field"><label>ชื่อ–ฝ่าย</label><input class="dc-in" id="rEmpInfo" value="${ed ? trnEsc((existing.EmployeeName || '') + ' · ' + this.deptName(existing.DepartmentID)) : ''}" readonly placeholder="กรอกรหัสแล้วกด Enter"></div>
          <div class="dc-field dc-span2"><label>หลักสูตร (เลือกจากแคตตาล็อก)</label><select class="dc-in" id="rCourse">${courseOpts}</select></div>
          <div class="dc-field"><label>หรือพิมพ์ชื่อหลักสูตรเอง</label><input class="dc-in" id="rCourseName" value="${ed && !existing.CourseID ? g('CourseName') : ''}"></div>
          <div class="dc-field"><label>ประเภท (ถ้าพิมพ์เอง)</label>${sel('rCourseType', TRN_COURSE_TYPES, existing && !existing.CourseID ? existing.CourseType : '', '—')}</div>
          <div class="dc-field"><label>วันที่อบรม <span class="dc-req">*</span></label><input type="date" class="dc-in" id="rDate" value="${gd('TrainingDate')}"></div>
          <div class="dc-field"><label>ถึงวันที่</label><input type="date" class="dc-in" id="rEnd" value="${gd('EndDate')}"></div>
          <div class="dc-field"><label>ชั่วโมง</label><input type="number" min="0" step="0.5" class="dc-in" id="rHours" value="${g('DurationHours')}"></div>
          <div class="dc-field"><label>วิทยากร/สถาบัน</label><input class="dc-in" id="rTrainer" value="${g('Trainer')}"></div>
          <div class="dc-field"><label>ผล</label>${sel('rResult', TRN_RESULTS, existing && existing.Result, '—')}</div>
          <div class="dc-field"><label>คะแนน / เกณฑ์ผ่าน</label><div style="display:flex;gap:6px"><input type="number" class="dc-in" id="rScore" placeholder="คะแนน" value="${g('Score')}"><input type="number" class="dc-in" id="rPass" placeholder="เกณฑ์" value="${g('PassScore')}"></div></div>
          <div class="dc-field"><label>ประเภทใบเซอร์</label>${sel('rCertType', TRN_CERT_TYPES, existing && existing.CertType || 'NONE')}</div>
          <div class="dc-field"><label>เลขที่ใบเซอร์</label><input class="dc-in" id="rCertNo" value="${g('CertNo')}"></div>
          <div class="dc-field"><label>วันออกใบเซอร์</label><input type="date" class="dc-in" id="rCertIssue" value="${gd('CertIssueDate')}"></div>
          <div class="dc-field"><label>วันหมดอายุ</label><input type="date" class="dc-in" id="rCertExp" value="${gd('CertExpiry')}"></div>
          <div class="dc-field"><label>ค่าใช้จ่าย (บาท)</label><input type="number" min="0" step="0.01" class="dc-in" id="rCost" value="${g('Cost')}"></div>
          <div class="dc-field dc-span2"><label>หมายเหตุ</label><textarea class="dc-in" id="rRemark" rows="2">${g('Remark')}</textarea></div>
          <div class="dc-field dc-span2"><label>ไฟล์ใบเซอร์</label><div id="rCertFile">${ed ? this.fileChip(existing.CertFileID, existing.CertFileName, 'cert') : '<span class="dc-faint" style="font-size:12px;color:#9ca3af">บันทึกก่อน แล้วค่อยแนบใบเซอร์</span>'}</div></div>
        </div>
        <div id="rErr"></div>
        <div class="dc-bar"><button class="dc-btn dc-ghost" id="rCancel" type="button">Cancel</button><button class="dc-btn dc-primary" id="rSave" type="button">${ed ? 'Save changes' : 'Create'}</button></div>
      </div></div><div class="dc-toast" id="dcToast"></div>`;
    const back = () => this.loadRecords();
    document.getElementById('trnBack').addEventListener('click', back);
    document.getElementById('rCancel').addEventListener('click', back);
    document.getElementById('rSave').addEventListener('click', () => this.saveRecord(ed ? existing.HistoryID : null));
    const empIn = document.getElementById('rEmp');
    const lookup = async () => { const id = empIn.value.trim(); if (!id) return; try { const r = await API.get('lookupEmployee', { token: this.token(), employeeId: id }); const e = r.employee || r; document.getElementById('rEmpInfo').value = (e.fullName || e.name || '') + ' · ' + this.deptName(e.departmentId || e.department); } catch (ex) { document.getElementById('rEmpInfo').value = '⚠ ไม่พบพนักงาน'; } };
    if (!ed) empIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); lookup(); } });
    if (!ed) empIn.addEventListener('blur', lookup);
    if (ed) this.wireCert(existing.HistoryID);
  },

  async saveRecord(historyId) {
    const err = document.getElementById('rErr');
    const v = id => (document.getElementById(id) || {}).value;
    const payload = {
      token: this.token(), historyId: historyId || undefined,
      EmployeeID: (v('rEmp') || '').trim(), CourseID: v('rCourse'), CourseName: (v('rCourseName') || '').trim(), CourseType: v('rCourseType'),
      TrainingDate: v('rDate'), EndDate: v('rEnd'), DurationHours: v('rHours'), Trainer: (v('rTrainer') || '').trim(),
      Result: v('rResult'), Score: v('rScore'), PassScore: v('rPass'),
      CertType: v('rCertType'), CertNo: (v('rCertNo') || '').trim(), CertIssueDate: v('rCertIssue'), CertExpiry: v('rCertExp'),
      Cost: v('rCost'), Remark: (v('rRemark') || '').trim()
    };
    if (!payload.EmployeeID) { err.innerHTML = '<div class="dc-err">กรุณากรอกรหัสพนักงาน</div>'; return; }
    if (!payload.TrainingDate) { err.innerHTML = '<div class="dc-err">กรุณาระบุวันที่อบรม</div>'; return; }
    if (!payload.CourseID && !payload.CourseName) { err.innerHTML = '<div class="dc-err">เลือกหลักสูตร หรือพิมพ์ชื่อหลักสูตร</div>'; return; }
    const btn = document.getElementById('rSave'); btn.disabled = true; btn.textContent = 'Processing…';
    try {
      if (historyId) { await API.post('updateTrainingRecord', payload); this.toast('บันทึกแล้ว'); this.openRecord(historyId); }
      else { const r = await API.post('createTrainingRecord', payload); this.toast('บันทึกประวัติแล้ว'); this.openRecord(r.historyId); }
    } catch (ex) { btn.disabled = false; btn.textContent = historyId ? 'Save changes' : 'Create'; err.innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'ล้มเหลว')}</div>`; }
  },

  wireCert(historyId) {
    const self = this;
    const box = document.getElementById('rCertFile');
    const wire = () => {
      const up = box.querySelector('[data-up]'), inp = box.querySelector('[data-inp]'), del = box.querySelector('[data-del]');
      if (up && inp) { up.addEventListener('click', () => inp.click()); inp.addEventListener('change', async () => { if (!inp.files[0]) return; up.disabled = true; up.textContent = 'กำลังอัปโหลด…'; try { const f = await trnReadFile(inp.files[0]); const r = await API.post('uploadTrainingCert', { token: self.token(), historyId, base64: f.base64, mimeType: f.mimeType, fileName: f.fileName }); box.innerHTML = self.fileChip(r.fileId, r.fileName, 'cert'); wire(); } catch (ex) { up.disabled = false; up.textContent = '📎 แนบไฟล์'; self.toast((ex && ex.message) || 'อัปโหลดไม่สำเร็จ'); } }); }
      if (del) del.addEventListener('click', async () => { if (!confirm('ลบใบเซอร์นี้?')) return; try { await API.post('deleteTrainingCert', { token: self.token(), historyId }); box.innerHTML = self.fileChip('', '', 'cert'); wire(); } catch (ex) { self.toast((ex && ex.message) || 'ลบไม่สำเร็จ'); } });
    };
    wire();
  },

  csv() {
    const rows = this._rows || [];
    if (!rows.length) { alert('ไม่มีข้อมูลให้ export'); return; }
    const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const head = ['วันที่', 'รหัสพนักงาน', 'ชื่อ', 'ฝ่าย', 'รหัสหลักสูตร', 'หลักสูตร', 'ประเภท', 'ชั่วโมง', 'วิทยากร', 'ผล', 'คะแนน', 'เกณฑ์', 'ประเภทเซอร์', 'เลขเซอร์', 'วันหมดอายุ', 'ค่าใช้จ่าย', 'หมายเหตุ'];
    const body = rows.map(o => [trnDate(o.TrainingDate), o.EmployeeID, o.EmployeeName, this.deptName(o.DepartmentID), o.CourseCode, o.CourseName, trnLabel(TRN_COURSE_TYPES, o.CourseType), o.DurationHours, o.Trainer, trnLabel(TRN_RESULTS, o.Result), o.Score, o.PassScore, trnLabel(TRN_CERT_TYPES, o.CertType), o.CertNo, trnDate(o.CertExpiry), o.Cost, o.Remark].map(esc).join(','));
    const blob = new Blob(['﻿' + [head.map(esc).join(',')].concat(body).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'TrainingHistory_' + trnDate(new Date()) + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
};

function loadTrainingCourses() { Training.loadCourses(); }
function loadTrainingRecords() { Training.loadRecords(); }

/* ==================== Training Needs (FM-HR-03) — Phase 2a ==================== */
const TN_TABS = [['inProgress', 'In Progress'], ['forApproval', 'For Approval'], ['inPlan', 'My Training Need'], ['cancelled', 'Cancelled']];
const TN_PRIORITY = [['HIGH', 'High'], ['MEDIUM', 'Medium'], ['LOW', 'Low']];
const TN_STATUS = {
  DRAFT: ['Waiting for Submit', 'dc-b-off'], SUBMITTED: ['Waiting for Manager Approve', 'dc-b-info'], DEPT_APPROVED: ['Waiting for HR Review', 'dc-b-warn'],
  IN_PLAN: ['In Plan', 'dc-b-ok'], CANCELLED: ['Not in Plan', 'dc-b-cancel']
};
function tnBadge(st) { const m = TN_STATUS[String(st || '').toUpperCase()] || [st || '—', 'dc-b-off']; return `<span class="dc-badge ${m[1]}">${m[0]}</span>`; }
/* Participant groups (Group Of Participant) — stored as pipe-joined keys, shown title-cased. */
function tnGrpLabel(g) { g = String(g || '').trim(); return g ? g.charAt(0) + g.slice(1).toLowerCase() : g; }
function tnGroupList(val) { return String(val || '').split('|').map(s => s.trim()).filter(Boolean); }
function tnGroupsText(val) { return tnGroupList(val).map(tnGrpLabel).join(', '); }
function tnGroupsCheck(val) { return tnGroupList(val).map(g => '☑ ' + tnGrpLabel(g)).join('  '); }
function tnMoney(v) { const n = Number(v); return (v === '' || v == null || isNaN(n)) ? '' : n.toLocaleString('en-US'); }

const TN_RPT_MODES = [['DECIDED', 'Decided (In / Not in Plan)'], ['IN_PLAN', 'In Plan only'], ['CANCELLED', 'Not in Plan only'], ['ALL', 'All statuses']];
const TrainingNeeds = {
  _tab: 'inProgress', _year: new Date().getFullYear(), _printMode: 'DECIDED',
  token() { return AUTH.getToken(); },
  css() { if (typeof DocumentsPage !== 'undefined' && DocumentsPage.injectCss) DocumentsPage.injectCss(); },
  toast(m) { return Training.toast(m); },
  deptName(id) { return Training.deptName(id); },

  async load(tab, year) {
    if (tab) this._tab = tab;
    if (year) this._year = year;
    this.css();
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><p class="dc-muted" style="padding:8px">Loading…</p></div>`;
    try {
      const req = API.get('getTrainingNeedInbox', { token: this.token(), year: this._year });
      await Promise.all([Training.ensureDepts(), Training.loadCourseOptions()]);
      this.data = await req; this.render();
    }
    catch (e) { c.innerHTML = `<div class="dc-wrap"><p style="color:#b91c1c;padding:8px">Failed to load: ${trnEsc(e.message || '')}</p></div>`; }
  },

  render() {
    const d = this.data, counts = d.counts || {};
    // Years are automatic: current year ±, plus every year that already holds needs. Nothing to set up.
    const yNow = new Date().getFullYear(), seenY = {}, years = [];
    for (let y = yNow + 1; y >= yNow - 3; y--) { seenY[y] = 1; years.push(y); }
    ((d.years) || []).forEach(y => { if (!seenY[y]) { seenY[y] = 1; years.push(Number(y)); } });
    years.sort((a, b) => b - a);
    const yearSel = `<select class="dc-in" id="tnYear" style="width:auto">${years.map(y => `<option value="${y}" ${y === this._year ? 'selected' : ''}>Year ${y}</option>`).join('')}</select>`;
    const dl = d.deadline ? `<span class="dc-muted" style="font-size:12.5px">Deadline: <b>${trnEsc(d.deadline)}</b>${d.deadlineClosed ? ' <span style="color:#b91c1c">(Closed)</span>' : ''}</span>` : '<span class="dc-faint" style="font-size:12.5px;color:#9ca3af">No deadline set</span>';
    const dlBtn = d.canApprove ? `<button class="dc-btn dc-ghost" id="tnDeadline" type="button" style="padding:4px 12px;font-size:12px">⚙ Set Deadline</button>` : '';
    const modeSel = `<select class="dc-in" id="tnRptMode" title="Which statuses to print / export" style="width:auto;font-size:12px;padding:4px 8px">${TN_RPT_MODES.map(m => `<option value="${m[0]}" ${this._printMode === m[0] ? 'selected' : ''}>${m[1]}</option>`).join('')}</select>`;
    const printBtns = `<span style="margin-left:auto;display:inline-flex;gap:8px;align-items:center">${modeSel}
      <button class="dc-btn dc-ghost" id="tnCsv" type="button" style="padding:4px 12px;font-size:12px">⬇ CSV</button>
      <button class="dc-btn dc-ghost" id="tnPrint" type="button" style="padding:4px 12px;font-size:12px">🖨 Print FM-HR-03</button></span>`;
    const tabs = TN_TABS.map(([id, label]) => `<button class="dc-tab${this._tab === id ? ' on' : ''}" data-tab="${id}">${label}<span class="dc-count">${counts[id] || 0}</span></button>`).join('');
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap">
      <div class="dc-ph" style="margin-bottom:10px"><div><h1 style="margin:0">Training Needs</h1>
        <p class="dc-muted" style="margin:4px 0 0">Training Needs Survey (FM-HR-03)</p></div>
        <button class="dc-btn dc-primary" id="tnNew" type="button" ${d.deadlineClosed && !d.canApprove ? 'disabled title="Closed"' : ''}>+ New Need</button></div>
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:12px;flex-wrap:wrap">${yearSel}${dl}${dlBtn}${printBtns}</div>
      <div class="dc-tabs">${tabs}</div>
      <div class="dc-card" id="tnList"></div>
    </div><div class="dc-toast" id="dcToast"></div>`;
    document.getElementById('tnNew').addEventListener('click', () => this.openForm());
    document.getElementById('tnYear').addEventListener('change', e => this.load(null, parseInt(e.target.value, 10)));
    c.querySelectorAll('.dc-tabs [data-tab]').forEach(b => b.addEventListener('click', () => { this._tab = b.dataset.tab; this.render(); }));
    const db = document.getElementById('tnDeadline');
    if (db) db.addEventListener('click', () => this.deadlineModal());
    const ms = document.getElementById('tnRptMode'); if (ms) ms.addEventListener('change', e => { this._printMode = e.target.value; });
    const pb = document.getElementById('tnPrint'); if (pb) pb.addEventListener('click', () => this.printForms());
    const cb = document.getElementById('tnCsv'); if (cb) cb.addEventListener('click', () => this.exportCsv());
    this.renderList();
  },

  /** Needs to print / export for a status mode, within the current year scope, from the loaded inbox. */
  _reportRows(mode) {
    const box = (this.data && this.data.inbox) || {};
    const inPlan = box.inPlan || [];
    const notInPlan = (box.cancelled || []).filter(o => String(o.HrDecisionBy || '').trim());  // HR-decided "Not in Plan" only
    switch (String(mode || 'DECIDED').toUpperCase()) {
      case 'IN_PLAN': return inPlan.slice();
      case 'CANCELLED': return notInPlan.slice();
      case 'ALL': return (box.inProgress || []).concat(inPlan, box.cancelled || []);   // every status, no overlap
      default: return inPlan.concat(notInPlan);   // DECIDED
    }
  },

  async ensureLogo() {
    if (TrainingNeeds._logo !== undefined) return TrainingNeeds._logo;
    try { const r = await API.get('getCompanyLogo', { token: this.token() }); TrainingNeeds._logo = r.logo || ''; }
    catch (e) { TrainingNeeds._logo = ''; }
    return TrainingNeeds._logo;
  },

  async printForms() {
    const rows = this._reportRows(this._printMode);
    if (!rows.length) { this.toast('No items to print for this status'); return; }
    const logo = await this.ensureLogo();
    // group by department, department name from the shared map
    const groups = {};
    rows.forEach(o => { const d = String(o.DepartmentID || '').trim() || '—'; (groups[d] = groups[d] || []).push(o); });
    const depIds = Object.keys(groups).sort((a, b) => (this.deptName(a) || a).localeCompare(this.deptName(b) || b, 'th'));
    const body = depIds.map((d, i) => this.formHtml(d, groups[d], logo, i > 0)).join('');
    trnPrint('FM-HR-03 · Training Needs ' + this._year, 'size: A4 portrait; margin: 10mm;', body);
  },

  /** One FM-HR-03 sheet (a department's decided needs). pageBreak=true starts it on a new page. */
  formHtml(depId, list, logo, pageBreak) {
    const status = st => (TN_STATUS[String(st || '').toUpperCase()] || [st || ''])[0];
    const dataRows = list.map((o, i) => {
      const reason = String(o.Status).toUpperCase() === 'CANCELLED' ? (o.DecisionReason || o.Reason || '') : (o.Reason || '');
      const pr = trnLabel(TN_PRIORITY, o.Priority);
      const remark = (pr ? '[' + pr + '] ' : '') + reason;   // หมายเหตุ = Priority + เหตุผล
      return `<tr>
        <td class="c" style="width:34px">${i + 1}</td>
        <td>${trnEsc(o.CourseName)}</td>
        <td style="width:150px;font-size:10px">${trnEsc(tnGroupsCheck(o.TargetGroup))}</td>
        <td class="c" style="width:46px">${trnEsc(o.Headcount)}</td>
        <td class="c" style="width:78px">${trnEsc(status(o.Status))}</td>
        <td style="width:160px">${trnEsc(remark)}</td></tr>`;
    }).join('');
    const fh = (this.data && this.data.formHeader) || ['FM-HR-03', '31/03/08', 'A', '00'];
    const pad = Math.max(0, 12 - list.length);
    const padRows = new Array(pad).fill('<tr><td class="c" style="height:22px">&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>').join('');
    // Logo aspect 1024×428 (≈2.39:1) — fix height, let width follow so it never distorts.
    const logoCell = logo ? `<img src="${logo}" alt="SOM" style="height:40px;width:auto;max-width:130px;border:0;display:block;margin:0 auto">` : '<b style="font-size:15px">SOM</b>';
    return `<section class="fm" style="${pageBreak ? 'page-break-before:always;' : ''}">
      <table class="hdr">
        <tr>
          <td rowspan="4" style="width:140px;text-align:center;padding:6px">${logoCell}</td>
          <td rowspan="4" style="text-align:center"><div style="font-weight:700">บริษัท ซัมมิท โอซูกะ แมนูแฟคเจอริ่ง จำกัด</div>
            <div style="font-size:9px">SUMMIT OTSUKA MANUFACTURING CO., LTD.</div>
            <div style="margin-top:6px;font-weight:700">แบบสำรวจความต้องการฝึกอบรม</div></td>
          <td class="k">เลขที่เอกสาร</td><td class="v"><b>${trnEsc(fh[0])}</b></td>
          <td class="k">หน้า</td><td class="v"></td>
        </tr>
        <tr><td class="k">วันที่ออกใช้</td><td class="v">${trnEsc(fh[1])}</td><td class="k">ผู้รายงาน</td><td class="v"></td></tr>
        <tr><td class="k">ออกครั้งที่</td><td class="v">${trnEsc(fh[2])}</td><td class="k">ผู้ทบทวน</td><td class="v"></td></tr>
        <tr><td class="k">แก้ไขครั้งที่</td><td class="v">${trnEsc(fh[3])}</td><td class="k">ผู้อนุมัติ</td><td class="v"></td></tr>
      </table>
      <div class="meta">ฝ่าย / แผนก : <b>${trnEsc(this.deptName(depId))}</b> &nbsp;&nbsp; ประจำปี : <b>${trnEsc(this._year)}</b></div>
      <table class="grid">
        <thead><tr><th style="width:34px">ลำดับ</th><th>หลักสูตรที่ต้องการฝึกอบรม</th><th style="width:150px">ผู้ที่จะอบรม</th>
          <th style="width:46px">จำนวน</th><th style="width:78px">สถานะ</th><th style="width:150px">หมายเหตุ</th></tr></thead>
        <tbody>${dataRows}${padRows}</tbody>
      </table>
      <div class="note"><u>คำชี้แจง</u>
        <div>1. ให้ผู้บังคับบัญชาหรือผู้ที่รับมอบหมายพิจารณา กำหนดหลักสูตรหรือความต้องการในการฝึกอบรม</div>
        <div>2. กำหนดหลักสูตรหรือความต้องการฝึกอบรม และส่งต้นฉบับให้ฝ่ายบุคคลจัดเก็บ</div></div>
    </section>`;
  },

  exportCsv() {
    const rows = this._reportRows(this._printMode);
    if (!rows.length) { this.toast('No items for this status'); return; }
    const status = st => (TN_STATUS[String(st || '').toUpperCase()] || [st || ''])[0];
    const header = ['Year', 'Department', 'Course', 'Type', 'Group Of Participant', 'Times', 'Hours', 'Headcount', 'Budget', 'Priority', 'Status', 'Reason', 'Decision reason', 'Created by', 'HR decision by', 'HR decision date'];
    const body = rows.map(o => [o.Year, this.deptName(o.DepartmentID), o.CourseName, trnLabel(TRN_COURSE_TYPES, o.TrainingType), tnGroupsText(o.TargetGroup), o.Times, o.PeriodHours, o.Headcount, tnMoney(o.Budget), trnLabel(TN_PRIORITY, o.Priority), status(o.Status), o.Reason, o.DecisionReason, o.CreatedByName, o.HrDecisionByName, trnDate(o.HrDecisionDate)]);
    trnCsv('training-needs-' + this._year + '.csv', header, body);
  },

  deadlineModal() {
    const self = this, year = this._year, cur = (this.data && this.data.deadline) || '';
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal"><h3 style="margin:0 0 4px">Training Needs Deadline — Year ${year}</h3>
      <p class="dc-muted" style="font-size:12px;margin:0 0 12px">Leave blank = open (no deadline)</p>
      <input type="date" class="dc-in" id="tnDl" value="${trnEsc(cur)}"><div id="tnDlErr"></div>
      <div class="dc-bar"><button class="dc-btn dc-ghost" id="tnDlX" type="button">Cancel</button><button class="dc-btn dc-primary" id="tnDlOk" type="button">Save</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tnDlX').addEventListener('click', close);
    scrim.querySelector('#tnDlOk').addEventListener('click', () => {
      const val = scrim.querySelector('#tnDl').value;
      const ok = scrim.querySelector('#tnDlOk'); ok.disabled = true; ok.textContent = 'Processing…';
      API.post('setTrainingNeedDeadline', { token: self.token(), year: year, deadline: val })
        .then(() => { close(); self.toast('Deadline saved'); self.load(); })
        .catch(ex => { ok.disabled = false; ok.textContent = 'Save'; scrim.querySelector('#tnDlErr').innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; });
    });
  },

  renderList() {
    const box = document.getElementById('tnList');
    const items = ((this.data && this.data.inbox) || {})[this._tab] || [];
    if (!items.length) { box.innerHTML = `<p class="dc-faint" style="padding:6px;color:#9ca3af">No items</p>`; return; }
    box.innerHTML = `<table class="dc-tbl"><thead><tr><th>Department</th><th>Course</th><th>Type</th><th>Qty</th><th>Priority</th><th>Status</th></tr></thead><tbody>${items.map(o => `
      <tr class="dc-row" data-id="${trnEsc(o.NeedID)}">
        <td>${trnEsc(this.deptName(o.DepartmentID))}</td>
        <td>${trnEsc(o.CourseName)} <span class="dc-faint">${trnEsc(tnGroupsText(o.TargetGroup))}</span></td>
        <td>${trnEsc(trnLabel(TRN_COURSE_TYPES, o.TrainingType))}</td>
        <td class="dc-faint">${o.Headcount || '—'}</td>
        <td>${trnEsc(trnLabel(TN_PRIORITY, o.Priority))}</td>
        <td>${tnBadge(o.Status)}${this._tab === 'cancelled' && o.DecisionReason ? `<div class="dc-faint" style="font-size:11px">${trnEsc(o.DecisionReason)}</div>` : ''}</td>
      </tr>`).join('')}</tbody></table>`;
    box.querySelectorAll('[data-id]').forEach(r => r.addEventListener('click', () => this.openDetail(r.dataset.id)));
  },

  openForm(existing) {
    this.css();
    const ed = !!existing;
    const g = k => ed ? trnEsc(existing[k] || '') : '';
    const seesAll = !!(this.data && this.data.seesAll);   // ALL scope → any dept; manager → depts they manage; user → own dept
    const home = String((this.data && this.data.homeDept) || '').trim();
    const managed = ((this.data && this.data.managedDepts) || []).map(x => String(x).trim()).filter(Boolean);
    // Departments this user may request for: everyone if ALL scope; else own dept + every dept they manage.
    let allowed;
    if (seesAll) allowed = Object.keys(Training.deptMap);
    else { const seen = {}; allowed = []; managed.concat(home ? [home] : []).forEach(id => { if (id && !seen[id]) { seen[id] = 1; allowed.push(id); } }); }
    const curDept = ed ? String(existing.DepartmentID || '').trim() : (allowed.indexOf(home) !== -1 ? home : (allowed[0] || home));
    if (curDept && allowed.indexOf(curDept) === -1) allowed.push(curDept);   // keep the record's own dept selectable when editing
    const deptField = (seesAll || allowed.length > 1)
      ? `<select class="dc-in" id="tnDept">${allowed.map(id => `<option value="${trnEsc(id)}" ${curDept === id ? 'selected' : ''}>${trnEsc(Training.deptMap[id] || id)}</option>`).join('')}</select>`
      : `<input class="dc-in" value="${trnEsc(this.deptName(curDept) || curDept || '—')}" readonly title="Your department (auto)"><input type="hidden" id="tnDept" value="${trnEsc(curDept)}">`;
    const courseOpts = `<option value="">— type manually below —</option>` + (Training._courses || []).map(cc => `<option value="${trnEsc(cc.CourseID)}" ${ed && String(existing.CourseID).trim() === String(cc.CourseID) ? 'selected' : ''}>${trnEsc(cc.CourseCode)} · ${trnEsc(cc.CourseName)}</option>`).join('');
    const sel = (id, list, cur, blank) => `<select class="dc-in" id="${id}">${blank ? `<option value="">${blank}</option>` : ''}${list.map(o => `<option value="${o[0]}" ${String(cur || '').toUpperCase() === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
    const groupOpts = (this.data && this.data.participantGroups) || [];
    const chosen = ed ? tnGroupList(String(existing.TargetGroup || '').toUpperCase()) : [];
    const groupBoxes = groupOpts.map(gk => `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:16px;font-weight:400;white-space:nowrap"><input type="checkbox" class="tnGrp" value="${trnEsc(gk)}" ${chosen.indexOf(gk) !== -1 ? 'checked' : ''}> ${trnEsc(tnGrpLabel(gk))}</label>`).join('') || '<span class="dc-faint" style="color:#9ca3af">No groups configured</span>';
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tnBack">← Back</button>
      <div class="dc-card">
        <h1 style="margin:0 0 16px;font-size:20px">${ed ? 'Edit Training Need' : 'New Training Need'} <span class="dc-muted" style="font-size:14px">Year ${this._year}</span></h1>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="dc-field"><label>Department <span class="dc-req">*</span></label>${deptField}</div>
          <div class="dc-field"><label>Priority</label>${sel('tnPriority', TN_PRIORITY, ed ? existing.Priority : 'MEDIUM')}</div>
          <div class="dc-field dc-span2"><label>Course (from catalog)</label><select class="dc-in" id="tnCourse">${courseOpts}</select></div>
          <div class="dc-field"><label>Or type a course name <span class="dc-req">*</span> <span class="dc-muted" style="font-weight:400;font-size:11px">(if not from catalog)</span></label><input class="dc-in" id="tnCourseName" value="${ed && !existing.CourseID ? g('CourseName') : ''}"></div>
          <div class="dc-field"><label>Training Type <span class="dc-req">*</span> <span class="dc-muted" style="font-weight:400;font-size:11px">(when typed manually)</span></label>${sel('tnType', TRN_COURSE_TYPES, ed && !existing.CourseID ? existing.TrainingType : '', '— select —')}</div>
          <div class="dc-field dc-span2"><label>Group Of Participant <span class="dc-req">*</span></label>
            <div style="display:flex;flex-wrap:wrap;gap:2px 4px;padding:6px 0">${groupBoxes}</div></div>
          <div class="dc-field"><label>Times (จำนวนครั้ง) <span class="dc-req">*</span></label><input type="number" min="1" step="1" class="dc-in" id="tnTimes" value="${ed ? trnEsc(existing.Times || '') : '1'}"></div>
          <div class="dc-field"><label>Period — hours (ชั่วโมง) <span class="dc-req">*</span></label><input type="number" min="0" step="0.5" class="dc-in" id="tnHours" value="${g('PeriodHours')}"></div>
          <div class="dc-field"><label>Headcount <span class="dc-req">*</span></label><input type="number" min="1" step="1" class="dc-in" id="tnHead" value="${g('Headcount')}"></div>
          <div class="dc-field"><label>Budget <span class="dc-muted" style="font-weight:400;font-size:11px">(internal — HR fills before the plan)</span></label><input type="number" min="0" step="0.01" class="dc-in" id="tnBudget" value="${g('Budget')}"></div>
          <div class="dc-field dc-span2"><label>Reason / Justification <span class="dc-req">*</span></label><textarea class="dc-in" id="tnReason" rows="2">${g('Reason')}</textarea></div>
        </div>
        <div id="tnErr"></div>
        <div class="dc-bar"><button class="dc-btn dc-ghost" id="tnCancel" type="button">Cancel</button>${ed ? '' : '<button class="dc-btn dc-ghost" id="tnSaveNew" type="button">Create &amp; New</button>'}<button class="dc-btn dc-primary" id="tnSave" type="button">${ed ? 'Save changes' : 'Create (DRAFT)'}</button></div>
      </div></div><div class="dc-toast" id="dcToast"></div>`;
    // Keep Training Type in sync with catalog choice: a catalog course carries its own type, so lock the select then.
    const courseEl = document.getElementById('tnCourse'), typeEl = document.getElementById('tnType');
    const syncType = () => {
      const picked = courseEl.value;
      if (picked) {
        const cc = (Training._courses || []).find(x => String(x.CourseID) === String(picked));
        if (cc && cc.CourseType) typeEl.value = String(cc.CourseType).toUpperCase();
        typeEl.disabled = true;
      } else { typeEl.disabled = false; }
    };
    courseEl.addEventListener('change', syncType); syncType();
    const back = () => ed ? this.openDetail(existing.NeedID) : this.load();
    document.getElementById('tnBack').addEventListener('click', back);
    document.getElementById('tnCancel').addEventListener('click', back);
    document.getElementById('tnSave').addEventListener('click', () => this.submitForm(ed ? existing.NeedID : null, false));
    const tnSaveNew = document.getElementById('tnSaveNew');
    if (tnSaveNew) tnSaveNew.addEventListener('click', () => this.submitForm(null, true));
  },

  async submitForm(needId, andNew) {
    const err = document.getElementById('tnErr');
    const v = id => (document.getElementById(id) || {}).value;
    const groups = Array.prototype.slice.call(document.querySelectorAll('.tnGrp')).filter(x => x.checked).map(x => x.value).join('|');
    const payload = { token: this.token(), needId: needId || undefined, Year: this._year, DepartmentID: (v('tnDept') || '').trim(), CourseID: v('tnCourse'), CourseName: (v('tnCourseName') || '').trim(), TrainingType: v('tnType'), TargetGroup: groups, Times: v('tnTimes'), PeriodHours: v('tnHours'), Budget: (v('tnBudget') || '').trim(), Headcount: v('tnHead'), Priority: v('tnPriority'), Reason: (v('tnReason') || '').trim() };
    if (!payload.DepartmentID) { err.innerHTML = '<div class="dc-err">Department is required</div>'; return; }
    if (!payload.CourseID && !payload.CourseName) { err.innerHTML = '<div class="dc-err">Pick a course from the catalog, or type a course name</div>'; return; }
    if (!payload.CourseID && !payload.TrainingType) { err.innerHTML = '<div class="dc-err">Training Type is required</div>'; return; }
    if (!groups) { err.innerHTML = '<div class="dc-err">Select at least one participant group</div>'; return; }
    if (!(Number(payload.Times) > 0)) { err.innerHTML = '<div class="dc-err">Times (จำนวนครั้ง) is required</div>'; return; }
    if (!(Number(payload.PeriodHours) > 0)) { err.innerHTML = '<div class="dc-err">Period hours (ชั่วโมง) is required</div>'; return; }
    if (!(Number(payload.Headcount) > 0)) { err.innerHTML = '<div class="dc-err">Headcount is required</div>'; return; }
    if (!payload.Reason) { err.innerHTML = '<div class="dc-err">Reason / justification is required</div>'; return; }
    const btn = document.getElementById(andNew ? 'tnSaveNew' : 'tnSave');
    const prevTxt = btn.textContent; btn.disabled = true; btn.textContent = 'Processing…';
    try {
      if (needId) { await API.post('updateTrainingNeed', payload); this.toast('Saved'); this.openDetail(needId); }
      else {
        const r = await API.post('createTrainingNeed', payload);
        this.toast('Created');
        if (andNew) this.openForm(); else this.openDetail(r.needId);
      }
    } catch (ex) { btn.disabled = false; btn.textContent = prevTxt; err.innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; }
  },

  async openDetail(needId) {
    this.css();
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tnBack">← Back</button><div class="dc-card"><p class="dc-muted">Loading…</p></div></div>`;
    document.getElementById('tnBack').addEventListener('click', () => this.load());
    try { await Training.ensureDepts(); const r = await API.get('getTrainingNeed', { token: this.token(), needId }); this.renderDetail(r.need, r.actions || [], r.history || []); }
    catch (e) { c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tnB2">← Back</button><div class="dc-card"><div class="dc-err">${trnEsc(e.message || '')}</div></div></div>`; const b = document.getElementById('tnB2'); if (b) b.addEventListener('click', () => this.load()); }
  },

  renderDetail(t, actions, history) {
    const kv = (k, val) => `<div class="k">${k}</div><div>${val || '—'}</div>`;
    const btn = (a, l, cls) => `<button class="dc-btn ${cls}" data-act="${a}" type="button">${l}</button>`;
    const b = [];
    if (actions.indexOf('edit') !== -1) b.push(btn('edit', 'Edit', 'dc-ghost'));
    if (actions.indexOf('submit') !== -1) b.push(btn('submit', 'Submit', 'dc-primary'));
    if (actions.indexOf('deptApprove') !== -1) b.push(btn('deptApprove', 'Approve (Manager)', 'dc-primary'));
    if (actions.indexOf('deptReject') !== -1) b.push(btn('deptReject', 'Reject', 'dc-danger'));
    if (actions.indexOf('hrInPlan') !== -1) b.push(btn('hrInPlan', 'Accept into Plan', 'dc-primary'));
    if (actions.indexOf('hrCancel') !== -1) b.push(btn('hrCancel', 'Not in Plan', 'dc-danger'));
    if (actions.indexOf('hrReject') !== -1) b.push(btn('hrReject', 'Reject to Creator', 'dc-danger'));
    if (actions.indexOf('cancel') !== -1) b.push(btn('cancel', 'Cancel', 'dc-danger'));
    const tl = (history || []).map(h => `<li><span class="dot"></span><div class="act">${trnEsc(h.Action)}</div><div class="meta">${trnEsc(h.ActorName)} · ${trnDate(h.Timestamp)}${h.Comment ? ' · ' + trnEsc(h.Comment) : ''}</div></li>`).join('');
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tnBack">← Back</button>
      <div class="dc-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div><h1 style="margin:0;font-size:20px">${trnEsc(t.CourseName)}</h1><p class="dc-muted" style="margin:4px 0 0">Year ${trnEsc(t.Year)} · ${trnEsc(this.deptName(t.DepartmentID))}</p></div>
          <div>${tnBadge(t.Status)}</div>
        </div>
        <div class="dc-kv" style="margin-top:14px">
          ${kv('Type', trnEsc(trnLabel(TRN_COURSE_TYPES, t.TrainingType)))}
          ${kv('Group Of Participant', trnEsc(tnGroupsText(t.TargetGroup)))}
          ${kv('Times / Hours', trnEsc(t.Times) + ' × ' + trnEsc(t.PeriodHours) + ' hr')}
          ${kv('Headcount', trnEsc(t.Headcount))}
          ${t.Budget !== '' && t.Budget != null ? kv('Budget', trnEsc(tnMoney(t.Budget))) : ''}
          ${kv('Priority', trnEsc(trnLabel(TN_PRIORITY, t.Priority)))}
          ${kv('Reason / Justification', trnEsc(t.Reason))}
          ${kv('Created by', trnEsc(t.CreatedByName))}
          ${t.DeptApprovedByName ? kv('Manager approved', trnEsc(t.DeptApprovedByName) + ' · ' + trnDate(t.DeptApprovedDate)) : ''}
          ${t.HrDecisionByName ? kv('HR decision', trnEsc(t.HrDecisionByName) + ' · ' + trnDate(t.HrDecisionDate)) : ''}
          ${t.DecisionReason ? kv('Decision reason', trnEsc(t.DecisionReason)) : ''}
        </div>
      </div>
      ${b.length ? `<div class="dc-card"><h2 style="margin:0 0 12px;font-size:15px">Actions</h2><div class="dc-actbar">${b.join('')}</div><div id="tnActErr"></div></div>` : ''}
      <div class="dc-card"><h2 style="margin:0 0 12px;font-size:15px">History</h2><ul class="dc-tl">${tl || '<li><span class="dot"></span><div class="meta">No history</div></li>'}</ul></div>
    </div><div class="dc-toast" id="dcToast"></div>`;
    document.getElementById('tnBack').addEventListener('click', () => this.load());
    this.wireActions(t);
  },

  wireActions(t) {
    const id = t.NeedID, self = this;
    document.querySelectorAll('#pageContent [data-act]').forEach(bt => bt.addEventListener('click', () => {
      const a = bt.dataset.act;
      if (a === 'edit') self.openForm(t);
      else if (a === 'submit') self.run('submitTrainingNeed', { needId: id }, 'Submitted', bt);
      else if (a === 'deptApprove') self.run('approveTrainingNeedDept', { needId: id, decision: 'APPROVE' }, 'Approved', bt);
      else if (a === 'hrInPlan') self.run('decideTrainingNeed', { needId: id, decision: 'IN_PLAN' }, 'Accepted into plan', bt);
      else if (a === 'deptReject') self.commentModal('Reject to Creator', 'approveTrainingNeedDept', { needId: id, decision: 'REJECT' }, id);
      else if (a === 'hrReject') self.commentModal('Reject to Creator', 'decideTrainingNeed', { needId: id, decision: 'REJECT' }, id);
      else if (a === 'hrCancel') self.commentModal('Not in Plan (reason required)', 'decideTrainingNeed', { needId: id, decision: 'CANCEL' }, id);
      else if (a === 'cancel') self.commentModal('Cancel this need', 'cancelTrainingNeed', { needId: id }, id);
    }));
  },

  async run(action, payload, ok, bt) {
    let prev = ''; if (bt) { prev = bt.textContent; bt.disabled = true; bt.textContent = 'Processing…'; }
    try { await API.post(action, Object.assign({ token: this.token() }, payload)); this.toast(ok); this.openDetail(payload.needId); }
    catch (ex) { const e = document.getElementById('tnActErr'); if (e) e.innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; if (bt) { bt.disabled = false; bt.textContent = prev; } }
  },

  commentModal(title, action, payload, needId) {
    const self = this;
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal"><h3 style="margin:0 0 12px">${title}</h3>
      <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px">Reason <span class="dc-req">*</span></label>
      <textarea class="dc-in" id="tnCmt" rows="3"></textarea><div id="tnCmtErr"></div>
      <div class="dc-bar"><button class="dc-btn dc-ghost" id="tnCmtX" type="button">Cancel</button><button class="dc-btn dc-primary" id="tnCmtOk" type="button">Confirm</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tnCmtX').addEventListener('click', close);
    scrim.querySelector('#tnCmtOk').addEventListener('click', () => {
      const cmt = scrim.querySelector('#tnCmt').value.trim();
      if (!cmt) { scrim.querySelector('#tnCmtErr').innerHTML = '<div class="dc-err">Reason is required</div>'; return; }
      const ok = scrim.querySelector('#tnCmtOk'); ok.disabled = true; ok.textContent = 'Processing…';
      API.post(action, Object.assign({ token: self.token(), comment: cmt }, payload))
        .then(() => { close(); self.toast('Done'); self.openDetail(needId); })
        .catch(ex => { ok.disabled = false; ok.textContent = 'Confirm'; scrim.querySelector('#tnCmtErr').innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; });
    });
  }
};

function loadTrainingNeeds() { TrainingNeeds.load(); }

/* ==================== Annual Training Plan (FM-HR-04) — Phase 2b ==================== */
const TP_STATUS = {
  DRAFT: ['Waiting for Submit', 'dc-b-off'], SUBMITTED: ['Waiting for Check', 'dc-b-info'],
  CHECKED: ['Waiting for Approve', 'dc-b-warn'], APPROVED: ['Approved', 'dc-b-ok'], CANCELLED: ['Cancelled', 'dc-b-cancel']
};
const TP_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function tpBadge(st) { const m = TP_STATUS[String(st || '').toUpperCase()] || [st || '—', 'dc-b-off']; return `<span class="dc-badge ${m[1]}">${m[0]}</span>`; }
function tpRev2(n) { return 'Rev.' + ('0' + (Number(n) || 0)).slice(-2); }
function tpRevText(p) { return p.Revision || tpRev2(p.RevNo); }
function tpTypeLabel(t) { const k = String(t || '').toUpperCase(); const f = TRN_COURSE_TYPES.filter(o => o[0] === k)[0]; return f ? f[1] : (k || 'Other'); }
function tpWeeks(pw) { return String(pw || '').split(',').map(s => s.trim()).filter(Boolean); }
function tpWeeksText(pw) { return tpWeeks(pw).map(k => { const p = k.split('-'); return (TP_MONTHS[(+p[0]) - 1] || p[0]) + '·' + p[1]; }).join('  '); }

const TrainingPlan = {
  _year: new Date().getFullYear(), _rev: '', _type: 'ANNUAL', _dept: '',
  isOjt() { return this._type === 'OJT'; },
  pageTitle() { return this.isOjt() ? 'On-the-Job Training Plan' : 'Annual Training Plan'; },
  pageSub() { return this.isOjt() ? 'OJT Plan per department (FM-HR-04)' : 'Training Yearly Plan (FM-HR-04)'; },
  token() { return AUTH.getToken(); },
  css() { if (typeof DocumentsPage !== 'undefined' && DocumentsPage.injectCss) DocumentsPage.injectCss(); },
  toast(m) { return Training.toast(m); },
  deptName(id) { return Training.deptName(id); },

  async load(year, rev) {
    if (year) this._year = year;
    this._rev = (rev === undefined || rev === null) ? '' : rev;
    this.css();
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><p class="dc-muted" style="padding:8px">Loading…</p></div>`;
    try {
      const q = { token: this.token(), year: this._year, type: this._type };
      if (this._rev !== '') q.rev = this._rev;
      if (this.isOjt() && this._dept) q.dept = this._dept;
      // fire the page request first, then load the lookups alongside it instead of one after another
      const req = API.get('getTrainingPlan', q);
      await Promise.all([Training.ensureDepts(), Training.loadCourseOptions()]);
      this.data = await req;
      this._rev = this.data.selectedRev === '' ? '' : this.data.selectedRev;
      this._dept = this.data.dept || this._dept;
      this.render();
    } catch (e) { c.innerHTML = `<div class="dc-wrap"><p style="color:#b91c1c;padding:8px">Failed to load: ${trnEsc(e.message || '')}</p></div>`; }
  },

  /** Years are automatic: the current year ±, plus every year that already has a plan. Nothing to set up. */
  yearBar() {
    const yNow = new Date().getFullYear(), seen = {}, years = [];
    for (let y = yNow + 1; y >= yNow - 3; y--) { seen[y] = 1; years.push(y); }
    ((this.data && this.data.years) || []).forEach(y => { if (!seen[y]) { seen[y] = 1; years.push(Number(y)); } });
    years.sort((a, b) => b - a);
    return `<select class="dc-in" id="tpYear" style="width:auto">${years.map(y => `<option value="${y}" ${y === this._year ? 'selected' : ''}>Year ${y}</option>`).join('')}</select>`;
  },

  deptBar() {
    if (!this.isOjt()) return '';
    const d = this.data || {};
    const ids = d.deptScope === 'ALL' ? Object.keys(Training.deptMap) : (d.deptList || []);
    if (!ids.length) return '<span class="dc-faint" style="color:#9ca3af;font-size:12.5px">No department available</span>';
    return `<select class="dc-in" id="tpDept" style="width:auto">${ids.map(id => `<option value="${trnEsc(id)}" ${String(d.dept) === id ? 'selected' : ''}>${trnEsc(Training.deptMap[id] || id)}</option>`).join('')}</select>`;
  },

  revBar() {
    const revs = (this.data && this.data.revs) || [];
    if (!revs.length) return '';
    return `<select class="dc-in" id="tpRev" style="width:auto">${revs.slice().reverse().map(r =>
      `<option value="${r.revNo}" ${Number(r.revNo) === Number(this.data.selectedRev) ? 'selected' : ''}>${this._year} ${tpRev2(r.revNo)} · ${(TP_STATUS[String(r.status).toUpperCase()] || [r.status])[0]}</option>`).join('')}</select>`;
  },

  render() {
    const d = this.data, p = d.plan, c = document.getElementById('pageContent');
    if (!p) {
      c.innerHTML = `<div class="dc-wrap">
        <div class="dc-ph" style="margin-bottom:10px"><div><h1 style="margin:0">${this.pageTitle()}</h1>
          <p class="dc-muted" style="margin:4px 0 0">${this.pageSub()}</p></div></div>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">${this.yearBar()}${this.deptBar()}</div>
        <div class="dc-card" style="text-align:center;padding:32px">
          <p class="dc-muted" style="margin:0 0 14px">No plan for year ${this._year}.</p>
          ${d.canCreate ? `<button class="dc-btn dc-primary" id="tpCreate" type="button">+ Create Plan ${this._year} (Rev.00)</button>` : '<p class="dc-faint" style="color:#9ca3af">You do not have permission to create a plan.</p>'}
        </div></div><div class="dc-toast" id="dcToast"></div>`;
      document.getElementById('tpYear').addEventListener('change', e => this.load(parseInt(e.target.value, 10)));
      this.wireDept();
      const cb = document.getElementById('tpCreate'); if (cb) cb.addEventListener('click', () => this.createPlan());
      return;
    }
    const a = d.actions || [];
    const btn = (id, label, cls) => `<button class="dc-btn ${cls}" id="${id}" type="button" style="padding:5px 14px;font-size:12.5px">${label}</button>`;
    const actBtns = [];
    if (a.indexOf('edit') !== -1) actBtns.push(btn('tpEdit', 'Edit header', 'dc-ghost'));
    if (a.indexOf('addNeeds') !== -1) actBtns.push(btn('tpAddNeeds', '↓ Pull from Needs', 'dc-ghost'));
    if (a.indexOf('addItem') !== -1) actBtns.push(btn('tpAddItem', '+ Add item', 'dc-ghost'));
    if (a.indexOf('submit') !== -1) actBtns.push(btn('tpSubmit', 'Submit', 'dc-primary'));
    if (a.indexOf('check') !== -1) actBtns.push(btn('tpCheck', 'Check (HR Mgr)', 'dc-primary'));
    if (a.indexOf('checkReject') !== -1) actBtns.push(btn('tpCheckRej', 'Reject', 'dc-danger'));
    if (a.indexOf('approve') !== -1) actBtns.push(btn('tpApprove', 'Approve (QMS)', 'dc-primary'));
    if (a.indexOf('approveReject') !== -1) actBtns.push(btn('tpApproveRej', 'Reject', 'dc-danger'));
    if (a.indexOf('revise') !== -1) actBtns.push(btn('tpRevise', '+ Revise (open next Rev)', 'dc-primary'));
    if (a.indexOf('cancel') !== -1) actBtns.push(btn('tpCancel', 'Cancel revision', 'dc-danger'));

    const sig = (t, name, date) => `<div style="flex:1"><div class="dc-faint" style="font-size:11px">${t}</div><div style="font-weight:600">${trnEsc(name) || '—'}</div><div class="dc-faint" style="font-size:11px">${date ? trnDate(date) : ''}</div></div>`;
    const older = d.isLatest === false;
    c.innerHTML = `<div class="dc-wrap">
      <div class="dc-ph" style="margin-bottom:10px"><div><h1 style="margin:0">${this.pageTitle()}</h1>
        <p class="dc-muted" style="margin:4px 0 0">${this.pageSub()}</p></div>
        <span style="display:inline-flex;gap:8px;align-items:center">${this.yearBar()}${this.deptBar()}${this.revBar()}
          <button class="dc-btn dc-ghost" id="tpCsv" type="button" style="padding:4px 12px;font-size:12px">⬇ CSV</button>
          <button class="dc-btn dc-ghost" id="tpPrint" type="button" style="padding:4px 12px;font-size:12px">🖨 Print A3</button></span></div>

      ${older ? `<div class="dc-card" style="padding:8px 12px;background:#fffbe6;border-color:#f0d98c"><span class="dc-muted" style="font-size:12.5px">Viewing <b>${trnEsc(tpRev2(d.selectedRev))}</b> — an earlier revision, read-only.</span></div>` : ''}

      <div class="dc-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div><h2 style="margin:0;font-size:17px">${trnEsc(p.Title)}</h2>
            <p class="dc-muted" style="margin:4px 0 0">To: <b>${trnEsc(p.ToText)}</b>${p.CcText ? ' · CC: ' + trnEsc(p.CcText) : ''}</p>
            <p class="dc-muted" style="margin:2px 0 0">${trnEsc(tpRevText(p))}${p.IssuedDate ? ' · Issued date ' + trnEsc(p.IssuedDate) : ''}</p></div>
          <div>${tpBadge(p.Status)}</div>
        </div>
        <div class="sig" style="display:flex;gap:16px;margin-top:14px;border-top:1px solid #eee;padding-top:12px">
          ${sig('Issued by', p.IssuedByName, p.IssuedDate2)}${sig('Checked by', p.CheckedByName, p.CheckedDate)}${sig('Approved by', p.ApprovedByName, p.ApprovedDate)}
          <div style="flex:1;text-align:right"><div class="dc-faint" style="font-size:11px">Total budget</div><div style="font-weight:700;font-size:16px">${tnMoney(d.budget) || '0'}</div></div>
        </div>
        ${p.DecisionReason ? `<div class="dc-muted" style="margin-top:8px;font-size:12.5px">Note: ${trnEsc(p.DecisionReason)}</div>` : ''}
        ${actBtns.length ? `<div class="dc-actbar" style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">${actBtns.join('')}</div><div id="tpActErr"></div>` : ''}
      </div>

      <div class="dc-card" id="tpItems"></div>
      <div class="dc-card"><h2 style="margin:0 0 12px;font-size:15px">History</h2><ul class="dc-tl" id="tpHist"></ul></div>
    </div><div class="dc-toast" id="dcToast"></div>`;

    document.getElementById('tpYear').addEventListener('change', e => this.load(parseInt(e.target.value, 10)));
    this.wireDept();
    const rv = document.getElementById('tpRev'); if (rv) rv.addEventListener('change', e => this.load(this._year, parseInt(e.target.value, 10)));
    document.getElementById('tpPrint').addEventListener('click', () => this.print());
    document.getElementById('tpCsv').addEventListener('click', () => this.csv());
    const wire = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', () => fn(el)); };
    wire('tpEdit', () => this.headerForm());
    wire('tpAddNeeds', () => this.needsModal());
    wire('tpAddItem', () => this.itemForm());
    wire('tpSubmit', el => this.run('submitTrainingPlan', { planId: p.PlanID }, 'Submitted', el));
    wire('tpCheck', el => this.run('checkTrainingPlan', { planId: p.PlanID, decision: 'APPROVE' }, 'Checked', el));
    wire('tpCheckRej', () => this.commentModal('Reject to HR', 'checkTrainingPlan', { planId: p.PlanID, decision: 'REJECT' }));
    wire('tpApprove', el => this.run('approveTrainingPlan', { planId: p.PlanID, decision: 'APPROVE' }, 'Approved', el));
    wire('tpApproveRej', () => this.commentModal('Reject to HR Manager', 'approveTrainingPlan', { planId: p.PlanID, decision: 'REJECT' }));
    wire('tpRevise', () => this.reviseModal(p));
    wire('tpCancel', () => this.commentModal('Cancel this revision', 'cancelTrainingPlan', { planId: p.PlanID }));
    this.renderItems();
    this.renderHistory();
  },

  wireDept() {
    const el = document.getElementById('tpDept');
    if (el) el.addEventListener('change', e => { this._dept = e.target.value; this.load(this._year, ''); });
  },

  renderHistory() {
    const box = document.getElementById('tpHist');
    const h = (this.data && this.data.history) || [];
    if (!h.length) { box.innerHTML = '<li><span class="dot"></span><div class="meta">No history</div></li>'; return; }
    box.innerHTML = h.map(o => `<li><span class="dot"></span>
      <div class="act">${trnEsc(o.Action)} <span class="dc-faint" style="font-weight:400">· ${trnEsc(tpRev2(o.RevNo))}</span></div>
      <div class="meta">${trnEsc(o.ActorName)} · ${trnDate(o.Timestamp)}${o.Comment ? ' · ' + trnEsc(o.Comment) : ''}</div></li>`).join('');
  },

  renderItems() {
    const box = document.getElementById('tpItems');
    const d = this.data, items = d.items || [], curRev = Number(d.plan.RevNo) || 0;
    const editable = (d.actions || []).indexOf('addItem') !== -1;
    if (!items.length) { box.innerHTML = `<p class="dc-faint" style="padding:6px;color:#9ca3af">No items yet${editable ? ' — use “Pull from Needs” or “Add item”.' : '.'}</p>`; return; }
    const cols = editable ? 12 : 11;
    let lastType = null;
    box.innerHTML = `<table class="dc-tbl"><thead><tr><th style="width:34px">#</th><th>Subject</th><th>Dept</th><th>Group</th><th>Times</th><th>Hrs</th><th>Head</th><th>Budget</th><th>Schedule</th><th>Rev</th><th>Remark</th>${editable ? '<th></th>' : ''}</tr></thead><tbody>${items.map(o => {
      const own = (Number(o.RevNo) || 0) === curRev;
      const t = String(o.TrainingType || '').toUpperCase();
      let head = '';
      if (t !== lastType) { lastType = t; head = `<tr><td colspan="${cols}" style="background:#f3f4f6;font-weight:700;font-size:12px">${trnEsc(tpTypeLabel(t))}</td></tr>`; }
      return head + `<tr>
        <td class="dc-faint">${o.No}</td>
        <td>${trnEsc(o.Subject)}${o.SourceNeedID ? ' <span class="dc-faint" style="font-size:10px">(from need)</span>' : ''}</td>
        <td>${trnEsc(this.deptName(o.DepartmentID))}</td>
        <td class="dc-faint" style="font-size:11.5px">${trnEsc(tnGroupsText(o.Groups))}</td>
        <td class="dc-faint">${trnEsc(o.Times)}</td>
        <td class="dc-faint">${trnEsc(o.PeriodHours)}</td>
        <td class="dc-faint">${trnEsc(o.Headcount)}</td>
        <td class="dc-faint">${(o.Budget === '' || o.Budget == null) ? '<span style="color:#b91c1c">—</span>' : tnMoney(o.Budget)}</td>
        <td class="dc-faint" style="font-size:11px">${trnEsc(tpWeeksText(o.PlanWeeks)) || '<span style="color:#b91c1c">—</span>'}</td>
        <td class="dc-faint" style="font-size:11px">${trnEsc(tpRev2(o.RevNo))}</td>
        <td class="dc-faint" style="font-size:11px">${trnEsc(o.Remark)}</td>
        ${editable ? `<td style="white-space:nowrap">${own
          ? `<button class="dc-btn dc-ghost" data-ed="${trnEsc(o.ItemID)}" type="button" style="padding:2px 8px;font-size:11px">Edit</button> <button class="dc-btn dc-ghost" data-del="${trnEsc(o.ItemID)}" type="button" style="padding:2px 8px;font-size:11px;color:#b91c1c">✕</button>`
          : `<button class="dc-btn dc-ghost" data-rep="${trnEsc(o.ItemID)}" type="button" style="padding:2px 8px;font-size:11px" title="Replace with an editable copy in this revision">Replace</button> <button class="dc-btn dc-ghost" data-void="${trnEsc(o.ItemID)}" type="button" style="padding:2px 8px;font-size:11px;color:#b91c1c" title="Remove from this revision onward">Void</button>`}</td>` : ''}
      </tr>`; }).join('')}</tbody></table>`;
    if (editable) {
      box.querySelectorAll('[data-ed]').forEach(b => b.addEventListener('click', () => this.itemForm(items.filter(x => String(x.ItemID) === b.dataset.ed)[0])));
      box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => this.deleteItem(b.dataset.del, b)));
      box.querySelectorAll('[data-void]').forEach(b => b.addEventListener('click', () => this.voidItem(b.dataset.void, false, b)));
      box.querySelectorAll('[data-rep]').forEach(b => b.addEventListener('click', () => this.voidItem(b.dataset.rep, true, b)));
    }
  },

  async createPlan() {
    const payload = { token: this.token(), Year: this._year };
    if (this.isOjt()) { payload.PlanType = 'OJT'; payload.DepartmentID = this._dept; }
    try { await API.post('createTrainingPlan', payload); this.toast('Plan created (Rev.00)'); this.load(this._year, ''); }
    catch (e) { this.toast((e && e.message) || 'Failed'); }
  },

  reviseModal(p) {
    const self = this;
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal"><h3 style="margin:0 0 4px">Open ${trnEsc(tpRev2((Number(p.RevNo) || 0) + 1))}</h3>
      <p class="dc-muted" style="font-size:12px;margin:0 0 12px">${trnEsc(tpRev2(p.RevNo))} stays exactly as approved. The new revision starts as DRAFT for HR to add, replace or void items.</p>
      <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px">Reason (optional)</label>
      <textarea class="dc-in" id="tpRvCmt" rows="2"></textarea><div id="tpRvErr"></div>
      <div class="dc-bar"><button class="dc-btn dc-ghost" id="tpRvX" type="button">Cancel</button><button class="dc-btn dc-primary" id="tpRvOk" type="button">Open revision</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tpRvX').addEventListener('click', close);
    scrim.querySelector('#tpRvOk').addEventListener('click', () => {
      const ok = scrim.querySelector('#tpRvOk'); ok.disabled = true; ok.textContent = 'Processing…';
      API.post('reviseTrainingPlan', { token: self.token(), planId: p.PlanID, comment: scrim.querySelector('#tpRvCmt').value.trim() })
        .then(r => { close(); self.toast(tpRev2(r.rev) + ' opened'); self.load(self._year, r.rev); })
        .catch(ex => { ok.disabled = false; ok.textContent = 'Open revision'; scrim.querySelector('#tpRvErr').innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; });
    });
  },

  headerForm() {
    const p = this.data.plan;
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    const row = (id, label, val) => `<div class="dc-field" style="margin-bottom:8px"><label>${label}</label><input class="dc-in" id="${id}" value="${trnEsc(val || '')}"></div>`;
    scrim.innerHTML = `<div class="dc-modal" style="max-width:480px"><h3 style="margin:0 0 4px">Edit plan header</h3>
      <p class="dc-muted" style="font-size:12px;margin:0 0 12px">Revision and Issued date are stamped automatically when QMS approves.</p>
      ${row('tpTitle', 'Title', p.Title)}${row('tpTo', 'To', p.ToText)}${row('tpCc', 'CC', p.CcText)}
      <div id="tpHErr"></div><div class="dc-bar"><button class="dc-btn dc-ghost" id="tpHX" type="button">Cancel</button><button class="dc-btn dc-primary" id="tpHOk" type="button">Save</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tpHX').addEventListener('click', close);
    scrim.querySelector('#tpHOk').addEventListener('click', () => {
      const g = id => (scrim.querySelector('#' + id) || {}).value || '';
      const ok = scrim.querySelector('#tpHOk'); ok.disabled = true; ok.textContent = 'Processing…';
      API.post('updateTrainingPlan', { token: this.token(), planId: p.PlanID, Title: g('tpTitle'), ToText: g('tpTo'), CcText: g('tpCc') })
        .then(() => { close(); this.toast('Saved'); this.load(this._year, this._rev); })
        .catch(ex => { ok.disabled = false; ok.textContent = 'Save'; scrim.querySelector('#tpHErr').innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; });
    });
  },

  weeksGrid(pw) {
    const set = {}; tpWeeks(pw).forEach(k => set[k] = 1);
    let rows = '';
    for (let m = 1; m <= 12; m++) {
      let cells = '';
      for (let w = 1; w <= 4; w++) { const k = m + '-' + w; cells += `<td style="text-align:center"><input type="checkbox" class="tpWk" value="${k}" ${set[k] ? 'checked' : ''}></td>`; }
      rows += `<tr><td style="font-size:11px;padding-right:6px">${TP_MONTHS[m - 1]}</td>${cells}</tr>`;
    }
    return `<table style="border-collapse:collapse;font-size:11px"><thead><tr><th></th><th>W1</th><th>W2</th><th>W3</th><th>W4</th></tr></thead><tbody>${rows}</tbody></table>`;
  },

  itemForm(existing) {
    const ed = !!existing, p = this.data.plan, ojt = this.isOjt();
    const g = k => ed ? trnEsc(existing[k] || '') : '';
    const groupOpts = this.data.participantGroups || [];
    const chosen = ed ? tnGroupList(String(existing.Groups || '').toUpperCase()) : [];
    const groupBoxes = groupOpts.map(gk => `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:14px;font-weight:400"><input type="checkbox" class="tpGrp" value="${trnEsc(gk)}" ${chosen.indexOf(gk) !== -1 ? 'checked' : ''}> ${trnEsc(tnGrpLabel(gk))}</label>`).join('');
    const depIds = Object.keys(Training.deptMap);
    // an OJT plan only offers OJT courses, and every item it holds is an OJT item
    const catalog = (Training._courses || []).filter(cc => !ojt || String(cc.CourseType || '').toUpperCase() === 'OJT');
    const courseOpts = `<option value="">— type the subject below —</option>` + catalog.map(cc => `<option value="${trnEsc(cc.CourseID)}" ${ed && String(existing.CourseID || '').trim() === String(cc.CourseID) ? 'selected' : ''}>${trnEsc(cc.CourseCode)} · ${trnEsc(cc.CourseName)}</option>`).join('');
    const curType = ojt ? 'OJT' : (ed ? String(existing.TrainingType).toUpperCase() : '');
    const typeSel = `<select class="dc-in" id="tpiType" ${ojt ? 'disabled' : ''}>${ojt ? '' : '<option value="">—</option>'}${TRN_COURSE_TYPES.map(o => `<option value="${o[0]}" ${curType === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
    const curDep = ed ? String(existing.DepartmentID || '').trim() : (ojt ? String(this.data.dept || '') : '');
    const depSel = `<select class="dc-in" id="tpiDept"><option value="">—</option>${depIds.map(id => `<option value="${trnEsc(id)}" ${curDep === id ? 'selected' : ''}>${trnEsc(Training.deptMap[id])}</option>`).join('')}</select>`;
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal" style="max-width:640px;max-height:90vh;overflow:auto"><h3 style="margin:0 0 12px">${ed ? 'Edit item' : 'Add item'} <span class="dc-muted" style="font-size:13px">${trnEsc(tpRev2(p.RevNo))}</span></h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="dc-field dc-span2"><label>Course (from catalog)</label><select class="dc-in" id="tpiCourse">${courseOpts}</select></div>
        <div class="dc-field dc-span2"><label>Subject <span class="dc-req">*</span></label><input class="dc-in" id="tpiSubject" value="${g('Subject')}"></div>
        <div class="dc-field"><label>Type</label>${typeSel}</div>
        <div class="dc-field"><label>Department <span class="dc-req">*</span></label>${depSel}</div>
        <div class="dc-field dc-span2"><label>Group Of Participant <span class="dc-req">*</span></label><div style="padding:4px 0">${groupBoxes}</div></div>
        <div class="dc-field"><label>Times <span class="dc-req">*</span></label><input type="number" min="1" class="dc-in" id="tpiTimes" value="${g('Times')}"></div>
        <div class="dc-field"><label>Hours <span class="dc-req">*</span></label><input type="number" min="0" step="0.5" class="dc-in" id="tpiHours" value="${g('PeriodHours')}"></div>
        <div class="dc-field"><label>Headcount <span class="dc-req">*</span></label><input type="number" min="1" class="dc-in" id="tpiHead" value="${g('Headcount')}"></div>
        <div class="dc-field"><label>Budget ${ojt ? '<span class="dc-muted" style="font-weight:400;font-size:11px">(optional)</span>' : '<span class="dc-req">*</span>'}</label><input type="number" min="0" step="0.01" class="dc-in" id="tpiBudget" value="${g('Budget')}"></div>
        <div class="dc-field dc-span2"><label>Schedule (month × week) <span class="dc-req">*</span></label>${this.weeksGrid(ed ? existing.PlanWeeks : '')}</div>
        <div class="dc-field dc-span2"><label>Remark</label><input class="dc-in" id="tpiRemark" value="${g('Remark')}"></div>
      </div>
      <div id="tpiErr"></div><div class="dc-bar"><button class="dc-btn dc-ghost" id="tpiX" type="button">Cancel</button><button class="dc-btn dc-primary" id="tpiOk" type="button">${ed ? 'Save' : 'Add'}</button></div></div>`;
    document.body.appendChild(scrim);
    // Picking a catalog course fills the subject + type and locks them; blank = type your own.
    const courseEl = scrim.querySelector('#tpiCourse'), subjEl = scrim.querySelector('#tpiSubject'), typeEl = scrim.querySelector('#tpiType');
    const syncCourse = () => {
      const picked = courseEl.value;
      if (picked) {
        const cc = (Training._courses || []).find(x => String(x.CourseID) === String(picked));
        if (cc) { subjEl.value = cc.CourseName || ''; if (cc.CourseType) typeEl.value = String(cc.CourseType).toUpperCase(); }
        subjEl.readOnly = true; typeEl.disabled = true;
      } else { subjEl.readOnly = false; typeEl.disabled = false; }
    };
    courseEl.addEventListener('change', syncCourse); syncCourse();
    const close = () => scrim.remove();
    scrim.querySelector('#tpiX').addEventListener('click', close);
    scrim.querySelector('#tpiOk').addEventListener('click', () => {
      const v = id => (scrim.querySelector('#' + id) || {}).value;
      const groups = Array.prototype.slice.call(scrim.querySelectorAll('.tpGrp')).filter(x => x.checked).map(x => x.value).join('|');
      const weeks = Array.prototype.slice.call(scrim.querySelectorAll('.tpWk')).filter(x => x.checked).map(x => x.value).join(',');
      const subject = (v('tpiSubject') || '').trim();
      const budget = (v('tpiBudget') || '').trim();
      const miss = [];
      if (!subject) miss.push('Subject');
      if (!v('tpiDept')) miss.push('Department');
      if (!groups) miss.push('Group');
      if (!(Number(v('tpiTimes')) > 0)) miss.push('Times');
      if (!(Number(v('tpiHours')) > 0)) miss.push('Hours');
      if (!(Number(v('tpiHead')) > 0)) miss.push('Headcount');
      if (ojt) { if (budget !== '' && !(Number(budget) >= 0)) miss.push('Budget (number)'); }
      else if (budget === '' || !(Number(budget) >= 0)) miss.push('Budget');
      if (!weeks) miss.push('Schedule');
      if (miss.length) { scrim.querySelector('#tpiErr').innerHTML = `<div class="dc-err">Please fill: ${miss.join(', ')}</div>`; return; }
      const payload = { token: this.token(), CourseID: v('tpiCourse') || '', Subject: subject, TrainingType: ojt ? 'OJT' : v('tpiType'), DepartmentID: v('tpiDept'), Groups: groups, Times: v('tpiTimes'), PeriodHours: v('tpiHours'), Headcount: v('tpiHead'), Budget: budget, PlanWeeks: weeks, Remark: (v('tpiRemark') || '').trim() };
      const ok = scrim.querySelector('#tpiOk'); ok.disabled = true; ok.textContent = 'Processing…';
      const req = ed ? API.post('updateTrainingPlanItem', Object.assign({ itemId: existing.ItemID }, payload)) : API.post('addTrainingPlanItem', Object.assign({ planId: p.PlanID }, payload));
      req.then(() => { close(); this.toast(ed ? 'Item saved' : 'Item added'); this.load(this._year, this._rev); })
        .catch(ex => { ok.disabled = false; ok.textContent = ed ? 'Save' : 'Add'; scrim.querySelector('#tpiErr').innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; });
    });
  },

  deleteItem(itemId, bt) {
    if (!window.confirm('Delete this item?')) return;
    if (bt) { bt.disabled = true; bt.textContent = '…'; }
    API.post('deleteTrainingPlanItem', { token: this.token(), itemId: itemId })
      .then(() => { this.toast('Item deleted'); this.load(this._year, this._rev); })
      .catch(e => { if (bt) { bt.disabled = false; bt.textContent = '✕'; } this.toast((e && e.message) || 'Failed'); });
  },

  voidItem(itemId, replace, bt) {
    const msg = replace
      ? 'Replace this item in the current revision?\n\nThe earlier revision keeps the original; an editable copy is added here.'
      : 'Void this item from this revision onward?\n\nEarlier revisions still show it.';
    if (!window.confirm(msg)) return;
    let prev = ''; if (bt) { prev = bt.textContent; bt.disabled = true; bt.textContent = 'Processing…'; }
    API.post('voidTrainingPlanItem', { token: this.token(), itemId: itemId, replace: replace ? 'true' : 'false' })
      .then(() => { this.toast(replace ? 'Item replaced' : 'Item voided'); this.load(this._year, this._rev); })
      .catch(e => { if (bt) { bt.disabled = false; bt.textContent = prev; } this.toast((e && e.message) || 'Failed'); });
  },

  async needsModal() {
    const p = this.data.plan;
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal" style="max-width:640px;max-height:90vh;overflow:auto"><h3 style="margin:0 0 4px">Pull from Training Needs — ${this._year}</h3>
      <p class="dc-muted" style="font-size:12px;margin:0 0 10px">In-Plan needs not yet used in this year's plan</p><div id="tpNList"><p class="dc-muted">Loading…</p></div>
      <div id="tpNErr"></div><div class="dc-bar"><button class="dc-btn dc-ghost" id="tpNX" type="button">Cancel</button><button class="dc-btn dc-primary" id="tpNOk" type="button">Add selected</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tpNX').addEventListener('click', close);
    let cand = [];
    try { const r = await API.get('getTrainingPlanCandidates', { token: this.token(), year: this._year }); cand = r.candidates || []; }
    catch (e) { scrim.querySelector('#tpNList').innerHTML = `<div class="dc-err">${trnEsc(e.message || '')}</div>`; return; }
    if (!cand.length) { scrim.querySelector('#tpNList').innerHTML = `<p class="dc-faint" style="color:#9ca3af">No In-Plan needs available.</p>`; scrim.querySelector('#tpNOk').disabled = true; return; }
    scrim.querySelector('#tpNList').innerHTML = `<table class="dc-tbl"><thead><tr><th style="width:30px"></th><th>Course</th><th>Dept</th><th>Group</th><th>Head</th></tr></thead><tbody>${cand.map(o => `
      <tr><td><input type="checkbox" class="tpNChk" value="${trnEsc(o.NeedID)}"></td><td>${trnEsc(o.CourseName)}</td><td>${trnEsc(this.deptName(o.DepartmentID))}</td><td class="dc-faint" style="font-size:11px">${trnEsc(tnGroupsText(o.TargetGroup))}</td><td class="dc-faint">${trnEsc(o.Headcount)}</td></tr>`).join('')}</tbody></table>`;
    scrim.querySelector('#tpNOk').addEventListener('click', () => {
      const ids = Array.prototype.slice.call(scrim.querySelectorAll('.tpNChk')).filter(x => x.checked).map(x => x.value);
      if (!ids.length) { scrim.querySelector('#tpNErr').innerHTML = '<div class="dc-err">Select at least one</div>'; return; }
      const ok = scrim.querySelector('#tpNOk'); ok.disabled = true; ok.textContent = 'Processing…';
      API.post('addTrainingPlanNeeds', { token: this.token(), planId: p.PlanID, needIds: ids })
        .then(r => { close(); this.toast((r.added || 0) + ' added'); this.load(this._year, this._rev); })
        .catch(ex => { ok.disabled = false; ok.textContent = 'Add selected'; scrim.querySelector('#tpNErr').innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; });
    });
  },

  async run(action, payload, ok, bt) {
    let prev = '';
    if (bt) { prev = bt.textContent; bt.disabled = true; bt.textContent = 'Processing…'; }
    try { await API.post(action, Object.assign({ token: this.token() }, payload)); this.toast(ok); this.load(this._year, ''); }
    catch (ex) {
      if (bt) { bt.disabled = false; bt.textContent = prev; }
      const e = document.getElementById('tpActErr');
      if (e) e.innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; else this.toast((ex && ex.message) || 'Failed');
    }
  },

  commentModal(title, action, payload) {
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal"><h3 style="margin:0 0 12px">${title}</h3>
      <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px">Reason <span class="dc-req">*</span></label>
      <textarea class="dc-in" id="tpCmt" rows="3"></textarea><div id="tpCmtErr"></div>
      <div class="dc-bar"><button class="dc-btn dc-ghost" id="tpCmtX" type="button">Cancel</button><button class="dc-btn dc-primary" id="tpCmtOk" type="button">Confirm</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tpCmtX').addEventListener('click', close);
    scrim.querySelector('#tpCmtOk').addEventListener('click', () => {
      const cmt = scrim.querySelector('#tpCmt').value.trim();
      if (!cmt) { scrim.querySelector('#tpCmtErr').innerHTML = '<div class="dc-err">Reason is required</div>'; return; }
      const ok = scrim.querySelector('#tpCmtOk'); ok.disabled = true; ok.textContent = 'Processing…';
      API.post(action, Object.assign({ token: this.token(), comment: cmt }, payload))
        .then(() => { close(); this.toast('Done'); this.load(this._year, ''); })
        .catch(ex => { ok.disabled = false; ok.textContent = 'Confirm'; scrim.querySelector('#tpCmtErr').innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; });
    });
  },

  async ensureLogo() {
    if (TrainingPlan._logo !== undefined) return TrainingPlan._logo;
    try { const r = await API.get('getTrainingPlanLogo', { token: this.token() }); TrainingPlan._logo = r.logo || ''; } catch (e) { TrainingPlan._logo = ''; }
    return TrainingPlan._logo;
  },

  async print() {
    const p = this.data.plan, items = this.data.items || [];
    if (!items.length) { this.toast('No items to print'); return; }
    const logo = await this.ensureLogo();
    trnPrint('FM-HR-04 · ' + (p.Title || '') + ' ' + tpRev2(p.RevNo), 'size: A3 landscape; margin: 8mm;', this.printHtml(p, items, logo));
  },

  printHtml(p, items, logo) {
    const formNo = (this.data && this.data.formNo) || 'FM-HR-04';   // the blank form's own doc identity (Settings)
    const monthHead = TP_MONTHS.map(m => `<th colspan="4" class="mo">${m}</th>`).join('');
    const weekHead = TP_MONTHS.map(() => '<th class="wk">1</th><th class="wk">2</th><th class="wk">3</th><th class="wk">4</th>').join('');
    // A planned week is drawn with a thick border (borders print even when background graphics are off).
    const cell = (set, m, w) => set[m + '-' + w] ? '<td class="c"><span class="bar"></span></td>' : '<td class="c"></td>';
    let lastType = null;
    const rows = items.map(o => {
      const set = {}; tpWeeks(o.PlanWeeks).forEach(k => set[k] = 1);
      let planCells = '', actualCells = '';
      for (let m = 1; m <= 12; m++) for (let w = 1; w <= 4; w++) { planCells += cell(set, m, w); actualCells += '<td class="c"></td>'; }
      const t = String(o.TrainingType || '').toUpperCase();
      let head = '';
      if (t !== lastType) { lastType = t; head = `<tr><td colspan="55" class="gh">${trnEsc(tpTypeLabel(t))}</td></tr>`; }
      return head + `<tr><td rowspan="2" class="c">${o.No}</td><td rowspan="2" class="sub">${trnEsc(o.Subject)}</td>
        <td rowspan="2" class="c">${trnEsc(o.Times)}</td><td rowspan="2" class="c">${trnEsc(o.PeriodHours)}</td>
        <td class="pa">Plan</td>${planCells}<td rowspan="2" class="grp">${trnEsc(tnGroupsCheck(o.Groups))}</td><td rowspan="2" class="rmk">${trnEsc(o.Remark)}</td></tr>
        <tr><td class="pa">Actual</td>${actualCells}</tr>`;
    }).join('');
    const logoCell = logo ? `<img src="${logo}" alt="SOM" style="height:34px;width:auto">` : '<b>SOM</b>';
    return `<style>
      .p4{font-size:8.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .p4 table{border-collapse:collapse;width:100%}.p4 td,.p4 th{border:1px solid #000;padding:1px 2px}
      .p4 .hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px}
      .p4 .sigbox td,.p4 .sigbox th{font-size:8px;padding:2px 4px}
      .p4 th.mo{font-size:8px}.p4 th.wk{width:11px;font-size:7px;padding:0}
      .p4 td.c{width:11px;text-align:center;padding:1px 0}
      .p4 .bar{display:block;width:100%;border-top:8px solid #000;font-size:0;line-height:0}
      .p4 td.pa{font-size:7.5px;white-space:nowrap}.p4 .sub{min-width:150px}
      .p4 .gh{background:#e8e8e8;font-weight:700;font-size:9px;text-align:left}
      .p4 .grp{min-width:74px;font-size:8px;white-space:normal}.p4 .rmk{min-width:70px}.p4 .foot td{height:16px}
    </style>
    <div class="p4">
      <div class="hd">
        <div style="display:flex;gap:10px;align-items:center">${logoCell}<div><div style="font-weight:700">SUMMIT OTSUKA MANUFACTURING CO.,LTD.</div>
          <div style="font-size:11px;font-weight:700">${trnEsc(p.Title)}</div>
          <div style="margin-top:3px">To: ${trnEsc(p.ToText)}</div>
          <div>CC: ${trnEsc(p.CcText)}</div>
          <div>Revision: ${trnEsc(tpRevText(p))} &nbsp;&nbsp; Issued date: ${trnEsc(p.IssuedDate)}</div></div></div>
        <table class="sigbox" style="width:auto"><tr><th></th><th>ISSUED BY</th><th>CHECKED BY</th><th>APPROVED BY</th></tr>
          <tr><td>Signature</td><td style="width:80px">${trnEsc(p.IssuedByName)}</td><td style="width:80px">${trnEsc(p.CheckedByName)}</td><td style="width:80px">${trnEsc(p.ApprovedByName)}</td></tr>
          <tr><td>Date</td><td>${p.IssuedDate2 ? trnDate(p.IssuedDate2) : ''}</td><td>${p.CheckedDate ? trnDate(p.CheckedDate) : ''}</td><td>${p.ApprovedDate ? trnDate(p.ApprovedDate) : ''}</td></tr>
          <tr><td colspan="4" style="text-align:right"><b>${trnEsc(formNo)}</b></td></tr></table>
      </div>
      <table>
        <thead>
          <tr><th rowspan="3">Item</th><th rowspan="3">Subject</th><th rowspan="3">Time<br>(s)</th><th rowspan="3">Period<br>(hrs)</th><th rowspan="3">Plan/<br>Actual</th><th colspan="48">Month</th><th rowspan="3" class="grp">Group Of Participant</th><th rowspan="3">Remark</th></tr>
          <tr>${monthHead}</tr>
          <tr>${weekHead}</tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="foot"><td colspan="5" style="text-align:center">Monthly Check</td><td colspan="50"></td></tr></tfoot>
      </table>
    </div>`;
  },

  csv() {
    const items = this.data.items || [];
    if (!items.length) { this.toast('No items'); return; }
    const header = ['Type', 'No', 'Rev', 'Subject', 'Department', 'Group', 'Times', 'Hours', 'Headcount', 'Budget', 'Schedule', 'SourceNeedID', 'Remark'];
    const body = items.map(o => [tpTypeLabel(o.TrainingType), o.No, tpRev2(o.RevNo), o.Subject, this.deptName(o.DepartmentID), tnGroupsText(o.Groups), o.Times, o.PeriodHours, o.Headcount, tnMoney(o.Budget), tpWeeksText(o.PlanWeeks), o.SourceNeedID, o.Remark]);
    trnCsv('training-plan-' + this._year + '-' + tpRev2(this.data.selectedRev) + '.csv', header, body);
  }
};

function loadTrainingPlan() { TrainingPlan._logo = undefined; TrainingPlan._type = 'ANNUAL'; TrainingPlan._rev = ''; TrainingPlan.load(); }
function loadOjtPlan() { TrainingPlan._logo = undefined; TrainingPlan._type = 'OJT'; TrainingPlan._dept = ''; TrainingPlan._rev = ''; TrainingPlan.load(); }

/* ==================== Training Sessions · Assignment · Registration — Phase 3 ====================
   A session (รุ่นอบรม) is one delivery of one APPROVED plan item; a plan item may have many.
   One status machine for every training type — the type only decides which paper comes out:
     INTERNAL → FM-HR-06 (one page per department) · EXTERNAL → FM-HR-02 · OJT/ORIENTATION → none
     every type → FM-HR-07 registration sheet once the list is closed.                            */

const TS_STATUS = {
  DRAFT: ['Draft', 'dc-b-off'],
  PENDING_MGR: ['Waiting for Dept Manager', 'dc-b-info'],
  PENDING_HR: ['Waiting for HR Manager', 'dc-b-info'],
  PENDING_QMS: ['Waiting for QMS Manager', 'dc-b-warn'],
  OPEN: ['Open for Registration', 'dc-b-info'],
  CONFIRMED: ['Confirmed', 'dc-b-ok'], DONE: ['Trained', 'dc-b-ok'], CLOSED: ['Closed', 'dc-b-ok'],
  POSTPONED: ['Postponed', 'dc-b-warn'], CANCELLED: ['Cancelled', 'dc-b-cancel']
};
/** The approval stage a session is sitting in, in the words the buttons use. */
function tsStageLabel(st) {
  const k = String(st || '').toUpperCase();
  if (k === 'PENDING_MGR') return 'ผู้จัดการฝ่าย';
  if (k === 'PENDING_HR') return 'ผู้จัดการฝ่ายบุคคล';
  if (k === 'PENDING_QMS') return 'QMS Manager';
  return k;
}
function tsIsPending(st) { return ['PENDING_MGR', 'PENDING_HR', 'PENDING_QMS'].indexOf(String(st || '').toUpperCase()) !== -1; }
const TS_METHODS = [['ATTENDANCE', 'Attendance (เวลาเข้าอบรม)'], ['TEST', 'Test (แบบทดสอบ)'], ['PRACTICAL', 'Practical (ลงมือปฏิบัติ)']];
const TS_LEVEL_MARKS = ['◔', '◑', '◕', '●'];
const TS_LEVEL_TH = ['สามารถทำได้ภายใต้คำแนะนำ', 'สามารถทำได้และอธิบายขั้นตอนหลักได้', 'สามารถทำได้และอธิบายจุดสำคัญได้', 'สามารถทำได้และอธิบายเหตุผลการปฏิบัติได้'];

function tsBadge(st) { const m = TS_STATUS[String(st || '').toUpperCase()] || [st || '—', 'dc-b-off']; return `<span class="dc-badge ${m[1]}">${m[0]}</span>`; }
function tsDeptBadge(st) { return String(st || '').toUpperCase() === 'CONFIRMED' ? '<span class="dc-badge dc-b-ok">Confirmed</span>' : '<span class="dc-badge dc-b-off">Pending</span>'; }
function tsMethodList(v) { return String(v || '').split('|').map(s => s.trim()).filter(Boolean); }
function tsMethodsText(v) { return tsMethodList(v).map(m => trnLabel(TS_METHODS, m)).join(' · ') || '—'; }
function tsLevelMark(n) { const i = (Number(n) || 0) - 1; return TS_LEVEL_MARKS[i] || ''; }
function tsMoney(v) { const n = Number(v); return (v === '' || v == null || isNaN(n)) ? '' : n.toLocaleString('en-US'); }
function tsRange(a, b) { const s = trnDate(a), e = b && String(b) !== String(a) ? trnDate(b) : ''; return e ? s + ' → ' + e : s; }

/** Criteria sentence printed on every form, built from the session's own settings. */
function tsCriteriaText(s) {
  const out = [];
  const m = tsMethodList(s.AssessMethods);
  if (m.indexOf('ATTENDANCE') !== -1) out.push('เวลาการเข้าอบรมต้องเท่ากับ ' + (s.MinAttendPct || 100) + '%');
  if (m.indexOf('TEST') !== -1) out.push('แบบทดสอบคะแนนเต็ม ' + (s.FullScore || '____') + ' คะแนน ต้องได้ไม่น้อยกว่า ' + (s.PassScore || '____') + ' คะแนน');
  if (m.indexOf('PRACTICAL') !== -1) {
    const lv = Number(s.MinLevel) || 3;
    out.push('การลงมือปฏิบัติต้องถึงระดับ ' + tsLevelMark(lv) + ' (' + (lv * 25) + '%) ' + (TS_LEVEL_TH[lv - 1] || ''));
  }
  return out.length ? out.join('  ·  ') : '—';
}

const TrainingSession = {
  _year: null, _type: '', _status: '', _q: '', _id: '', data: null, _logo: undefined, _items: null,
  token() { return AUTH.getToken(); },
  css() { Training.css(); },
  toast(m) { Training.toast(m); },

  /* ------------------------------ list ------------------------------ */

  async load(year) {
    this.css();
    if (year !== undefined) this._year = year;
    this._id = '';
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><p class="dc-muted" style="padding:8px">Loading…</p></div>`;
    const q = { token: this.token() };
    if (this._year) q.year = this._year;
    if (this._type) q.type = this._type;
    if (this._status) q.status = this._status;
    if (this._q) q.q = this._q;
    try {
      const req = API.get('getTrainingSessions', q);           // fire first, warm the caches in parallel
      await Training.ensureDepts();
      this.data = await req;
      this._year = this.data.year;
      this.renderList();
    } catch (e) {
      c.innerHTML = `<div class="dc-wrap"><p style="color:#b91c1c;padding:8px">Failed to load: ${trnEsc(e.message || '')}</p></div>`;
    }
  },

  renderList() {
    const d = this.data, list = d.sessions || [];
    const yearOpts = (d.years || []).map(y => `<option value="${y}" ${Number(y) === Number(d.year) ? 'selected' : ''}>${y}</option>`).join('');
    const typeOpts = `<option value="">All types</option>` + TRN_COURSE_TYPES.map(o => `<option value="${o[0]}" ${this._type === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('');
    const stOpts = `<option value="">All statuses</option>` + Object.keys(TS_STATUS).map(k => `<option value="${k}" ${this._status === k ? 'selected' : ''}>${TS_STATUS[k][0]}</option>`).join('');
    const rows = list.map(o => `<tr class="dc-row" data-id="${trnEsc(o.SessionID)}">
      <td><span class="dc-id">${trnEsc(o.SessionNo)}</span></td>
      <td>${trnEsc(o.Subject)}${o.CourseCode ? `<div class="dc-faint" style="font-size:11px">${trnEsc(o.CourseCode)}</div>` : ''}</td>
      <td>${trnEsc(tpTypeLabel(o.TrainingType))}</td>
      <td>${trnEsc(tsRange(o.StartDate, o.EndDate))}${o.TimeText ? `<div class="dc-faint" style="font-size:11px">${trnEsc(o.TimeText)}</div>` : ''}</td>
      <td>${trnEsc(Training.deptName(o.OrganizerDept))}</td>
      <td class="dc-faint">${o.deptConfirmed}/${o.deptCount}</td>
      <td class="dc-faint">${o.attendees}${o.Quota ? ' / ' + o.Quota : ''}</td>
      <td>${tsBadge(o.Status)}</td>
    </tr>`).join('');
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap">
      <div class="dc-ph" style="margin-bottom:14px"><div><h1 style="margin:0">Training Sessions</h1>
        <p class="dc-muted" style="margin:4px 0 0">รุ่นอบรม · ใบส่งพนักงานเข้าฝึกอบรม · ใบลงทะเบียน</p></div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="dc-btn dc-ghost" id="tsCsv" type="button">CSV</button>
          ${d.canCreate ? '<button class="dc-btn dc-primary" id="tsNew" type="button">+ New Session</button>' : ''}
        </div></div>
      <div class="dc-card" style="margin-bottom:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
        <div class="dc-field" style="margin:0"><label>Year</label><select class="dc-in" id="tsYear" style="width:110px">${yearOpts}</select></div>
        <div class="dc-field" style="margin:0"><label>Type</label><select class="dc-in" id="tsType" style="width:180px">${typeOpts}</select></div>
        <div class="dc-field" style="margin:0"><label>Status</label><select class="dc-in" id="tsSt" style="width:190px">${stOpts}</select></div>
        <div class="dc-field" style="margin:0;flex:1;min-width:180px"><label>Search</label><input class="dc-in" id="tsQ" value="${trnEsc(this._q)}" placeholder="course · session no · trainer"></div>
      </div>
      <div class="dc-card">${list.length ? `<table class="dc-tbl"><thead><tr><th>Session</th><th>หลักสูตร</th><th>ประเภท</th><th>วันที่อบรม</th><th>ผู้จัด</th><th>ฝ่ายยืนยัน</th><th>คน</th><th>สถานะ</th></tr></thead><tbody>${rows}</tbody></table>`
        : '<p class="dc-faint" style="padding:6px;color:#9ca3af">ยังไม่มีรุ่นอบรมในปีนี้</p>'}</div>
    </div><div class="dc-toast" id="dcToast"></div>`;

    const re = () => this.load(Number(document.getElementById('tsYear').value));
    document.getElementById('tsYear').addEventListener('change', re);
    document.getElementById('tsType').addEventListener('change', e => { this._type = e.target.value; re(); });
    document.getElementById('tsSt').addEventListener('change', e => { this._status = e.target.value; re(); });
    const qi = document.getElementById('tsQ');
    qi.addEventListener('keydown', e => { if (e.key === 'Enter') { this._q = qi.value.trim(); re(); } });
    qi.addEventListener('blur', () => { if (qi.value.trim() !== this._q) { this._q = qi.value.trim(); re(); } });
    document.getElementById('tsCsv').addEventListener('click', () => this.csv());
    const nb = document.getElementById('tsNew');
    if (nb) nb.addEventListener('click', () => this.pickPlanItem());
    c.querySelectorAll('[data-id]').forEach(r => r.addEventListener('click', () => this.openDetail(r.dataset.id)));
  },

  csv() {
    const list = (this.data && this.data.sessions) || [];
    if (!list.length) { this.toast('Nothing to export'); return; }
    trnCsv('training-sessions-' + this._year + '.csv',
      ['Session No', 'Course Code', 'Subject', 'Type', 'Start', 'End', 'Time', 'Hours', 'Organizer', 'Provider', 'Trainer', 'Venue', 'Depts', 'Confirmed', 'Attendees', 'Quota', 'Cost', 'Assessment', 'Status'],
      list.map(o => [o.SessionNo, o.CourseCode, o.Subject, o.TrainingType, o.StartDate, o.EndDate, o.TimeText, o.Hours,
        Training.deptName(o.OrganizerDept), o.Provider, o.Trainer, o.Venue, o.deptCount, o.deptConfirmed, o.attendees, o.Quota, o.Cost, o.AssessMethods, o.Status]));
  },

  /* ------------------------------ create ------------------------------ */

  /** Step 1 of creating a session: pick the APPROVED plan item it delivers. */
  async pickPlanItem() {
    this.css();
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><p class="dc-muted" style="padding:8px">Loading plan items…</p></div>`;
    let r;
    try { r = await API.get('getTrainingSessionPlanItems', { token: this.token(), year: this._year }); }
    catch (e) { this.toast(e.message || 'Failed'); this.load(); return; }
    const items = r.items || [];
    this._items = items;
    const rows = items.map(o => `<tr class="dc-row" data-item="${trnEsc(o.ItemID)}">
      <td>${trnEsc(o.Subject)}</td>
      <td>${trnEsc(tpTypeLabel(o.TrainingType))}</td>
      <td>${trnEsc(o.PlanType === 'OJT' ? Training.deptName(o.ScopeDept) : (o.DepartmentID ? Training.deptName(o.DepartmentID) : 'ทุกฝ่าย'))}</td>
      <td class="dc-faint">${trnEsc(tpWeeksText(o.PlanWeeks)) || '—'}</td>
      <td class="dc-faint">${o.Times || '—'} × ${o.PeriodHours || '—'} ชม.</td>
      <td class="dc-faint">${o.Headcount || '—'}</td>
      <td class="dc-faint">${o.sessions} รุ่น / ${o.assigned} คน</td>
    </tr>`).join('');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tsBack">← Back</button>
      <div class="dc-card">
        <h1 style="margin:0 0 4px;font-size:20px">New Session — เลือกรายการจากแผน</h1>
        <p class="dc-muted" style="margin:0 0 14px">ทุกรุ่นอบรมต้องมาจากรายการในแผนที่อนุมัติแล้ว (ปี ${trnEsc(String(this._year))}) · 1 รายการเปิดได้หลายรุ่น</p>
        ${items.length ? `<table class="dc-tbl"><thead><tr><th>หลักสูตร</th><th>ประเภท</th><th>ฝ่าย</th><th>ตามแผน</th><th>ครั้ง × ชม.</th><th>เป้าหมาย</th><th>จัดไปแล้ว</th></tr></thead><tbody>${rows}</tbody></table>`
        : `<div class="dc-faint" style="padding:6px;color:#6b7280;font-size:12.5px;line-height:1.9">
            <b>ไม่มีรายการที่คุณเปิดรุ่นอบรมได้ในปี ${trnEsc(String(this._year))}</b> — ระบบใช้เงื่อนไขนี้:
            <div style="margin-left:14px">
              1. แผนของปีนั้นต้องอยู่สถานะ <b>Approved</b> แล้ว (DRAFT / Waiting for… ยังไม่นับ)<br>
              2. รายการต้องยังไม่ถูก Void และอยู่ใน revision ที่อนุมัติล่าสุด<br>
              3. คุณต้องเป็นผู้จัดของรายการนั้น — <b>ฝ่ายบุคคล</b> จัดได้ทุกรายการ ·
                 <b>ผู้จัดการฝ่าย</b> จัดได้ทุกประเภทเฉพาะรายการของฝ่ายที่ตัวเองดูแล ·
                 <b>พนักงานฝ่าย</b> จัดได้เฉพาะ OJT ของฝ่ายตัวเอง<br>
              4. รายการที่ไม่ระบุฝ่าย (ทั้งบริษัท) เป็นของฝ่ายบุคคล
            </div></div>`}
      </div></div><div class="dc-toast" id="dcToast"></div>`;
    document.getElementById('tsBack').addEventListener('click', () => this.load());
    c.querySelectorAll('[data-item]').forEach(tr => tr.addEventListener('click', () => {
      this.sessionForm(null, items.filter(x => String(x.ItemID) === tr.dataset.item)[0]);
    }));
  },

  /** Step 2 (and the edit form): the session's own details. */
  sessionForm(existing, item) {
    this.css();
    const ed = !!existing;
    const s = existing || {};
    const type = String((ed ? s.TrainingType : item.TrainingType) || '').toUpperCase();
    const methods = tsMethodList(ed ? s.AssessMethods : 'ATTENDANCE');
    const g = k => trnEsc(ed ? (s[k] == null ? '' : s[k]) : '');
    const subject = ed ? s.Subject : item.Subject;
    const hours = ed ? s.Hours : (item.PeriodHours || '');
    const quota = ed ? s.Quota : (item.Headcount || '');
    const chk = m => `<label style="display:inline-flex;gap:6px;align-items:center;margin-right:16px;font-size:13px">
      <input type="checkbox" class="tsM" value="${m[0]}" ${methods.indexOf(m[0]) !== -1 ? 'checked' : ''}> ${m[1]}</label>`;
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tsBack">← Back</button>
      <div class="dc-card">
        <h1 style="margin:0 0 4px;font-size:20px">${ed ? 'Edit Session' : 'New Session'}</h1>
        <p class="dc-muted" style="margin:0 0 4px">${trnEsc(subject)} · ${trnEsc(tpTypeLabel(type))}${ed ? ' · ' + trnEsc(s.SessionNo) : ''}</p>
        <p class="dc-faint" style="margin:0 0 16px;font-size:12px">เอกสารขอฝึกอบรม: <b>${type === 'INTERNAL' ? 'FM-HR-06 (พิมพ์แยกต่อฝ่าย)' : type === 'EXTERNAL' ? 'FM-HR-02' : 'ไม่ต้องพิมพ์'}</b> · ใบลงทะเบียน: <b>FM-HR-07</b></p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="dc-field"><label>วันที่เริ่มอบรม <span class="dc-req">*</span></label><input type="date" class="dc-in" id="tsStart" value="${ed ? trnEsc(s.StartDate) : ''}"></div>
          <div class="dc-field"><label>วันที่สิ้นสุด</label><input type="date" class="dc-in" id="tsEnd" value="${ed ? trnEsc(s.EndDate) : ''}"></div>
          <div class="dc-field"><label>เวลา</label><input class="dc-in" id="tsTime" value="${g('TimeText')}" placeholder="09:00-16:00"></div>
          <div class="dc-field"><label>จำนวนชั่วโมง <span class="dc-req">*</span></label><input type="number" min="0" step="0.5" class="dc-in" id="tsHours" value="${trnEsc(hours)}"></div>
          <div class="dc-field"><label>สถานที่</label><input class="dc-in" id="tsVenue" value="${g('Venue')}"></div>
          <div class="dc-field"><label>วิทยากร</label><input class="dc-in" id="tsTrainer" value="${g('Trainer')}"></div>
          <div class="dc-field"><label>สถาบันผู้จัด ${type === 'EXTERNAL' ? '<span class="dc-req">*</span>' : ''}</label><input class="dc-in" id="tsProv" value="${g('Provider')}"></div>
          <div class="dc-field"><label>ค่าลงทะเบียน (บาท)</label><input type="number" min="0" step="1" class="dc-in" id="tsCost" value="${g('Cost')}"></div>
          <div class="dc-field"><label>จำนวนที่รับ (Quota)</label><input type="number" min="0" step="1" class="dc-in" id="tsQuota" value="${trnEsc(quota)}"></div>
          <div class="dc-field dc-span2"><label>วัตถุประสงค์ / ประโยชน์ที่คาดว่าจะได้รับ</label><textarea class="dc-in" id="tsObj" rows="2">${g('Objective')}</textarea></div>
          <div class="dc-field dc-span2"><label>วิธีประเมินผล <span class="dc-req">*</span> <span class="dc-faint" style="font-weight:400;font-size:11.5px">(เลือกได้หลายวิธี)</span></label>
            <div style="padding:4px 0">${TS_METHODS.map(chk).join('')}</div></div>
          <div class="dc-field"><label>เวลาเข้าอบรมขั้นต่ำ (%)</label><input type="number" min="0" max="100" step="1" class="dc-in" id="tsPct" value="${ed ? trnEsc(s.MinAttendPct) : 100}"></div>
          <div class="dc-field"><label>ระดับปฏิบัติที่ถือว่าผ่าน</label><select class="dc-in" id="tsLv">${[1, 2, 3, 4].map(n => `<option value="${n}" ${Number(ed ? s.MinLevel : 3) === n ? 'selected' : ''}>${TS_LEVEL_MARKS[n - 1]} ${n * 25}% — ${TS_LEVEL_TH[n - 1]}</option>`).join('')}</select></div>
          <div class="dc-field"><label>คะแนนเต็ม</label><input type="number" min="0" step="1" class="dc-in" id="tsFull" value="${g('FullScore')}"></div>
          <div class="dc-field"><label>คะแนนผ่าน</label><input type="number" min="0" step="1" class="dc-in" id="tsPass" value="${g('PassScore')}"></div>
          <div class="dc-field dc-span2"><label>หมายเหตุ</label><input class="dc-in" id="tsRmk" value="${g('Remark')}"></div>
        </div>
        <div id="tsErr"></div>
        <div class="dc-bar"><button class="dc-btn dc-ghost" id="tsCancel" type="button">Cancel</button>
          <button class="dc-btn dc-primary" id="tsSave" type="button">${ed ? 'Save changes' : 'Create session'}</button></div>
      </div></div><div class="dc-toast" id="dcToast"></div>`;

    const back = () => ed ? this.openDetail(s.SessionID) : this.pickPlanItem();
    document.getElementById('tsBack').addEventListener('click', back);
    document.getElementById('tsCancel').addEventListener('click', back);
    document.getElementById('tsSave').addEventListener('click', async ev => {
      const bt = ev.currentTarget, prev = bt.textContent;
      const num = id => { const v = document.getElementById(id).value; return v === '' ? '' : Number(v); };
      const payload = {
        token: this.token(),
        StartDate: document.getElementById('tsStart').value,
        EndDate: document.getElementById('tsEnd').value,
        TimeText: document.getElementById('tsTime').value.trim(),
        Hours: num('tsHours'), Venue: document.getElementById('tsVenue').value.trim(),
        Trainer: document.getElementById('tsTrainer').value.trim(),
        Provider: document.getElementById('tsProv').value.trim(),
        Cost: num('tsCost'), Quota: num('tsQuota'),
        Objective: document.getElementById('tsObj').value.trim(),
        AssessMethods: Array.prototype.map.call(document.querySelectorAll('.tsM:checked'), x => x.value).join('|'),
        MinAttendPct: num('tsPct'), MinLevel: num('tsLv'), FullScore: num('tsFull'), PassScore: num('tsPass'),
        Remark: document.getElementById('tsRmk').value.trim()
      };
      const err = m => { document.getElementById('tsErr').innerHTML = `<div class="dc-err">${trnEsc(m)}</div>`; };
      if (!payload.StartDate) return err('กรุณาระบุวันที่เริ่มอบรม');
      if (!(Number(payload.Hours) > 0)) return err('กรุณาระบุจำนวนชั่วโมง');
      if (!payload.AssessMethods) return err('กรุณาเลือกวิธีประเมินผลอย่างน้อย 1 วิธี');
      if (payload.AssessMethods.indexOf('TEST') !== -1 && !(Number(payload.FullScore) > 0 && Number(payload.PassScore) > 0)) return err('วิธีประเมินแบบทดสอบต้องระบุคะแนนเต็มและคะแนนผ่าน');
      bt.disabled = true; bt.textContent = 'Processing…';
      try {
        if (ed) { await API.post('updateTrainingSession', Object.assign({ sessionId: s.SessionID }, payload)); this.toast('บันทึกแล้ว'); this.openDetail(s.SessionID); }
        else {
          const r = await API.post('createTrainingSession', Object.assign({ PlanItemID: item.ItemID }, payload));
          this.toast(r.message || 'Created'); this.openDetail(r.sessionId);
        }
      } catch (ex) { bt.disabled = false; bt.textContent = prev; err((ex && ex.message) || 'Failed'); }
    });
  },

  /* ------------------------------ detail ------------------------------ */

  async openDetail(sessionId) {
    this.css();
    this._id = sessionId;
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><p class="dc-muted" style="padding:8px">Loading…</p></div>`;
    try {
      const req = API.get('getTrainingSession', { token: this.token(), sessionId });
      await Training.ensureDepts();
      this.detail = await req;
      this.renderDetail();
    } catch (e) {
      c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tsBack">← Back</button><p style="color:#b91c1c;padding:8px">${trnEsc(e.message || 'Failed')}</p></div>`;
      const b = document.getElementById('tsBack'); if (b) b.addEventListener('click', () => this.load());
    }
  },

  renderDetail() {
    const d = this.detail, s = d.session, acts = d.actions || [];
    const depts = d.depts || [], att = d.attendees || [];
    const has = a => acts.indexOf(a) !== -1;
    const info = [
      ['ประเภท', tpTypeLabel(s.TrainingType)],
      ['วันที่อบรม', tsRange(s.StartDate, s.EndDate) + (s.TimeText ? '  (' + s.TimeText + ')' : '')],
      ['จำนวนชั่วโมง', (s.Hours || '—') + ' ชม.'],
      ['สถานที่', s.Venue || '—'],
      ['วิทยากร', s.Trainer || '—'],
      ['สถาบันผู้จัด', s.Provider || '—'],
      ['ค่าลงทะเบียน', tsMoney(s.Cost) ? tsMoney(s.Cost) + ' บาท' : '—'],
      ['ผู้จัด', Training.deptName(s.OrganizerDept)],
      ['จำนวนที่รับ', (s.Quota || '—') + ' คน'],
      ['วิธีประเมินผล', tsMethodsText(s.AssessMethods)],
      ['เกณฑ์ผ่าน', tsCriteriaText(s)],
      ['เอกสารขอฝึกอบรม', d.requestDoc || 'ไม่ต้องพิมพ์']
    ].map(r => `<tr><td class="k">${trnEsc(r[0])}</td><td>${trnEsc(r[1])}</td></tr>`).join('');

    const trail = [
      ['ผู้ขอ / ผู้จัด', s.SubmittedByName, s.SubmittedDate],
      ['ผู้จัดการฝ่าย', s.MgrApprovedByName, s.MgrApprovedDate],
      ['ผู้จัดการฝ่ายบุคคล', s.HrApprovedByName, s.HrApprovedDate],
      ['QMS Manager', s.QmsApprovedByName, s.QmsApprovedDate],
      ['ปิดรับสมัคร', s.RegClosedByName, s.RegClosedDate],
      ['ปิดรุ่นอบรม', s.ClosedByName, s.ClosedDate]
    ].filter(r => trnEsc(r[1] || '')).map(r => `<tr><td class="k">${trnEsc(r[0])}</td><td>${trnEsc(r[1])} <span class="dc-faint" style="font-size:11.5px">${trnEsc(trnDate(r[2]))}</span></td></tr>`).join('');

    const deptRows = depts.map(o => {
      const btns = [];
      if (String(s.Status).toUpperCase() === 'OPEN' && o.mine) {
        if (String(o.Status).toUpperCase() !== 'CONFIRMED') {
          btns.push(`<button class="dc-btn dc-ghost dc-sm" data-assign="${trnEsc(o.DepartmentID)}" type="button">+ Employees</button>`);
          if (o.canConfirm) btns.push(`<button class="dc-btn dc-primary dc-sm" data-confirm="${trnEsc(o.DepartmentID)}" type="button">Confirm list</button>`);
        } else if (o.canConfirm || d.isOrganiser) {
          btns.push(`<button class="dc-btn dc-ghost dc-sm" data-unconfirm="${trnEsc(o.DepartmentID)}" type="button">Reopen list</button>`);
        }
      }
      if (d.isOrganiser && ['DRAFT', 'OPEN'].indexOf(String(s.Status).toUpperCase()) !== -1 && !o.assigned) {
        btns.push(`<button class="dc-btn dc-ghost dc-sm" data-rmdept="${trnEsc(o.DepartmentID)}" type="button">Remove</button>`);
      }
      if (String(o.Status).toUpperCase() === 'CONFIRMED' && d.requestDoc === 'FM-HR-06') {
        btns.push(`<button class="dc-btn dc-ghost dc-sm" data-print6="${trnEsc(o.DepartmentID)}" type="button">FM-HR-06</button>`);
      }
      return `<tr><td>${trnEsc(Training.deptName(o.DepartmentID))}</td>
        <td class="dc-faint">${o.assigned}${o.Quota ? ' / ' + o.Quota : ''}</td>
        <td>${tsDeptBadge(o.Status)}</td>
        <td class="dc-faint">${o.ConfirmedByName ? trnEsc(o.ConfirmedByName) + ' · ' + trnEsc(trnDate(o.ConfirmedDate)) : '—'}</td>
        <td style="white-space:nowrap">${btns.join(' ')}</td></tr>`;
    }).join('');

    const deptStatus = {}; depts.forEach(o => { deptStatus[String(o.DepartmentID)] = String(o.Status || '').toUpperCase(); });
    const openNow = String(s.Status).toUpperCase() === 'OPEN';
    let lastDept = null, n = 0;
    const attRows = att.map(a => {
      let head = '';
      if (String(a.DepartmentID) !== lastDept) { lastDept = String(a.DepartmentID); head = `<tr><td colspan="7" style="background:#f3f4f6;font-weight:600">${trnEsc(Training.deptName(a.DepartmentID))}</td></tr>`; }
      const canRemove = openNow && deptStatus[String(a.DepartmentID)] !== 'CONFIRMED'
        && (d.isOrganiser || (d.myDepts || []).indexOf(String(a.DepartmentID)) !== -1);
      return head + `<tr><td class="dc-faint">${++n}</td><td><span class="dc-id">${trnEsc(a.EmployeeID)}</span></td>
        <td>${trnEsc(a.EmployeeName)}</td><td class="dc-faint">${trnEsc(a.Position)}</td>
        <td class="dc-faint">${trnEsc(a.AssignedByName)}</td>
        <td>${a.Result ? tsResultChip(a.Result, '') : '<span class="dc-faint">—</span>'}${a.Level ? ' ' + tsLevelIcon(a.Level, 14) : ''}</td>
        <td>${canRemove ? `<button class="dc-btn dc-ghost dc-sm" data-rmatt="${trnEsc(a.AttendeeID)}" type="button">Remove</button>`
          : (a.HistoryID ? `<button class="dc-btn dc-ghost dc-sm" data-card="${trnEsc(a.EmployeeID)}" type="button">FM-HR-09</button>` : '')}</td></tr>`;
    }).join('');

    const bar = [];
    if (has('edit')) bar.push('<button class="dc-btn dc-ghost" data-a="edit" type="button">Edit</button>');
    if (has('depts')) bar.push('<button class="dc-btn dc-ghost" data-a="depts" type="button">+ Departments</button>');
    if (has('submit')) bar.push('<button class="dc-btn dc-primary" data-a="submit" type="button">Submit for approval</button>');
    if (has('approve')) bar.push(`<button class="dc-btn dc-primary" data-a="approve" type="button">Approve (${trnEsc(tsStageLabel(s.Status))})</button>`);
    if (has('approveReject')) bar.push('<button class="dc-btn dc-ghost" data-a="approveReject" type="button">Reject</button>');
    if (has('open')) bar.push('<button class="dc-btn dc-primary" data-a="open" type="button">Open registration</button>');
    if (has('closeReg')) bar.push('<button class="dc-btn dc-primary" data-a="closeReg" type="button">Close registration</button>');
    if (has('reopenReg')) bar.push('<button class="dc-btn dc-ghost" data-a="reopenReg" type="button">Reopen registration</button>');
    if (has('results')) bar.push('<button class="dc-btn dc-primary" data-a="results" type="button">บันทึกผลการอบรม</button>');
    if (has('viewResults') && !has('results')) bar.push('<button class="dc-btn dc-ghost" data-a="results" type="button">ดูผลการอบรม</button>');
    if (has('complete')) bar.push('<button class="dc-btn dc-ghost" data-a="complete" type="button">ปิดการกรอกผล (DONE)</button>');
    if (has('reopenResults')) bar.push('<button class="dc-btn dc-ghost" data-a="reopenResults" type="button">แก้ไขผล</button>');
    if (has('files')) bar.push('<button class="dc-btn dc-ghost" data-a="files" type="button">เอกสารแนบ</button>');
    if (has('close')) bar.push('<button class="dc-btn dc-primary" data-a="close" type="button">Close session (HR Manager)</button>');
    if (has('reopenClosed')) bar.push('<button class="dc-btn dc-ghost" data-a="reopenClosed" type="button">Reopen closed session</button>');
    if (has('printExtReq')) bar.push('<button class="dc-btn dc-ghost" data-a="printExtReq" type="button">Print FM-HR-02</button>');
    if (has('printAssign')) bar.push('<button class="dc-btn dc-ghost" data-a="printAssign" type="button">Print FM-HR-06 (all depts)</button>');
    if (has('printRegister')) bar.push('<button class="dc-btn dc-ghost" data-a="printRegister" type="button">Print FM-HR-07</button>');
    if (has('postpone')) bar.push('<button class="dc-btn dc-ghost" data-a="postpone" type="button">Postpone</button>');
    if (has('cancel')) bar.push('<button class="dc-btn dc-ghost" data-a="cancel" type="button">Cancel session</button>');

    const hist = (d.history || []).map(h => `<tr><td class="dc-faint">${trnEsc(trnDate(h.Timestamp))}</td><td>${trnEsc(h.Action)}</td>
      <td>${trnEsc(h.ActorName)}</td><td class="dc-faint">${trnEsc(h.Comment)}</td></tr>`).join('');

    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tsBack">← Back to sessions</button>
      <div class="dc-ph" style="margin-bottom:12px"><div>
        <h1 style="margin:0;font-size:22px">${trnEsc(s.Subject)}</h1>
        <p class="dc-muted" style="margin:4px 0 0">${trnEsc(s.SessionNo)}${s.CourseCode ? ' · ' + trnEsc(s.CourseCode) : ''} &nbsp; ${tsBadge(s.Status)}</p>
        ${s.PostponeReason ? `<p class="dc-faint" style="margin:6px 0 0;font-size:12px">เลื่อน: ${trnEsc(s.PostponeReason)}</p>` : ''}
        ${s.CancelReason ? `<p class="dc-faint" style="margin:6px 0 0;font-size:12px">ยกเลิก: ${trnEsc(s.CancelReason)}</p>` : ''}
      </div></div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:12px;align-items:start">
        <div class="dc-card"><h3 style="margin:0 0 10px;font-size:15px">รายละเอียดรุ่นอบรม</h3>
          <table class="dc-tbl ts-kv"><tbody>${info}</tbody></table>
          ${trail ? `<h3 style="margin:14px 0 8px;font-size:15px">การอนุมัติ</h3><table class="dc-tbl ts-kv"><tbody>${trail}</tbody></table>` : ''}
          ${s.DecisionReason ? `<div class="dc-err" style="margin-top:10px">เหตุผลที่ส่งกลับ: ${trnEsc(s.DecisionReason)}</div>` : ''}</div>
        <div class="dc-card"><h3 style="margin:0 0 10px;font-size:15px">ฝ่ายที่เข้าอบรม <span class="dc-faint" style="font-weight:400;font-size:12px">(ทุกฝ่ายต้องยืนยันก่อนปิดรับ)</span></h3>
          ${depts.length ? `<table class="dc-tbl"><thead><tr><th>ฝ่าย</th><th>คน</th><th>สถานะ</th><th>ยืนยันโดย</th><th></th></tr></thead><tbody>${deptRows}</tbody></table>`
        : '<p class="dc-faint" style="padding:6px;color:#9ca3af">ยังไม่มีฝ่ายถูกเรียกเข้าอบรม</p>'}</div>
      </div>
      <div class="dc-card" style="margin-top:12px"><h3 style="margin:0 0 10px;font-size:15px">รายชื่อผู้เข้าอบรม <span class="dc-faint" style="font-weight:400;font-size:12px">${att.length} คน</span></h3>
        ${att.length ? `<table class="dc-tbl"><thead><tr><th>#</th><th>รหัส</th><th>ชื่อ-นามสกุล</th><th>ตำแหน่ง</th><th>เพิ่มโดย</th><th>ผลการอบรม</th><th></th></tr></thead><tbody>${attRows}</tbody></table>`
        : '<p class="dc-faint" style="padding:6px;color:#9ca3af">ยังไม่มีรายชื่อ</p>'}</div>
      <div id="tsActErr"></div>
      ${bar.length ? `<div class="dc-bar" style="margin-top:12px;flex-wrap:wrap">${bar.join('')}</div>` : ''}
      ${hist ? `<div class="dc-card" style="margin-top:12px"><h3 style="margin:0 0 10px;font-size:15px">ประวัติ</h3>
        <table class="dc-tbl"><thead><tr><th>วันที่</th><th>การกระทำ</th><th>ผู้ทำ</th><th>หมายเหตุ</th></tr></thead><tbody>${hist}</tbody></table></div>` : ''}
      <style>.ts-kv td.k{width:150px;color:#6b7280;font-size:12.5px}.dc-sm{padding:3px 8px;font-size:11.5px}</style>
    </div><div class="dc-toast" id="dcToast"></div>`;

    document.getElementById('tsBack').addEventListener('click', () => this.load());
    c.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', ev => this.onAction(b.dataset.a, ev.currentTarget)));
    c.querySelectorAll('[data-assign]').forEach(b => b.addEventListener('click', () => this.assignModal(b.dataset.assign)));
    c.querySelectorAll('[data-confirm]').forEach(b => b.addEventListener('click', ev => this.run('confirmTrainingSessionDept', { sessionId: s.SessionID, dept: b.dataset.confirm }, 'ยืนยันรายชื่อแล้ว', ev.currentTarget)));
    c.querySelectorAll('[data-unconfirm]').forEach(b => b.addEventListener('click', ev => this.run('unconfirmTrainingSessionDept', { sessionId: s.SessionID, dept: b.dataset.unconfirm }, 'เปิดรายชื่อให้แก้ไขแล้ว', ev.currentTarget)));
    c.querySelectorAll('[data-rmdept]').forEach(b => b.addEventListener('click', ev => this.run('removeTrainingSessionDept', { sessionId: s.SessionID, dept: b.dataset.rmdept }, 'ลบฝ่ายแล้ว', ev.currentTarget)));
    c.querySelectorAll('[data-rmatt]').forEach(b => b.addEventListener('click', ev => this.run('removeTrainingSessionAttendee', { attendeeId: b.dataset.rmatt }, 'ลบรายชื่อแล้ว', ev.currentTarget)));
    c.querySelectorAll('[data-print6]').forEach(b => b.addEventListener('click', () => this.printAssign(b.dataset.print6)));
    c.querySelectorAll('[data-card]').forEach(b => b.addEventListener('click', () => this.printHistoryCard(b.dataset.card)));
  },

  onAction(a, bt) {
    const s = this.detail.session, id = s.SessionID;
    if (a === 'edit') return this.sessionForm(s);
    if (a === 'depts') return this.deptModal();
    if (a === 'submit') return this.run('submitTrainingSession', { sessionId: id }, 'ส่งขออนุมัติแล้ว', bt);
    if (a === 'approve') return this.run('approveTrainingSession', { sessionId: id, decision: 'APPROVE' }, 'อนุมัติแล้ว', bt);
    if (a === 'approveReject') return this.reasonModal('Reject — ส่งกลับให้แก้ไข', 'approveTrainingSession', { sessionId: id, decision: 'REJECT' }, false);
    if (a === 'open') return this.run('openTrainingSession', { sessionId: id }, 'เปิดรับสมัครแล้ว', bt);
    if (a === 'closeReg') return this.run('closeTrainingSessionRegistration', { sessionId: id }, 'ปิดรับสมัครแล้ว', bt);
    if (a === 'reopenReg') return this.reasonModal('Reopen registration', 'reopenTrainingSessionRegistration', { sessionId: id }, false);
    if (a === 'results') return this.resultsScreen();
    if (a === 'complete') return this.run('completeTrainingSession', { sessionId: id }, 'บันทึกผลเสร็จสิ้น', bt);
    if (a === 'reopenResults') return this.reasonModal('แก้ไขผลการอบรม — กลับไปสถานะ CONFIRMED', 'reopenTrainingSessionResults', { sessionId: id }, false);
    if (a === 'files') return this.filesModal();
    if (a === 'close') return this.run('closeTrainingSession', { sessionId: id }, 'ปิดรุ่นอบรมแล้ว', bt);
    if (a === 'reopenClosed') return this.reasonModal('Reopen closed session', 'reopenTrainingSession', { sessionId: id }, false);
    if (a === 'postpone') return this.reasonModal('Postpone this session', 'postponeTrainingSession', { sessionId: id }, true);
    if (a === 'cancel') return this.reasonModal('Cancel this session', 'cancelTrainingSession', { sessionId: id }, false);
    if (a === 'printAssign') return this.printAssign('');
    if (a === 'printExtReq') return this.printExtReq();
    if (a === 'printRegister') return this.printRegister();
  },

  async run(action, payload, okMsg, bt) {
    let prev = ''; if (bt) { prev = bt.textContent; bt.disabled = true; bt.textContent = 'Processing…'; }
    try { await API.post(action, Object.assign({ token: this.token() }, payload)); this.toast(okMsg); this.openDetail(this._id); }
    catch (ex) {
      if (bt) { bt.disabled = false; bt.textContent = prev; }
      const e = document.getElementById('tsActErr');
      if (e) e.innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; else this.toast((ex && ex.message) || 'Failed');
    }
  },

  /** Reason prompt; withDate also offers a new start date (postpone). */
  reasonModal(title, action, payload, withDate) {
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal"><h3 style="margin:0 0 12px">${trnEsc(title)}</h3>
      ${withDate ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div class="dc-field" style="margin:0"><label>วันที่เริ่มใหม่ <span class="dc-faint" style="font-weight:400;font-size:11px">(เว้นว่าง = ยังไม่กำหนด)</span></label><input type="date" class="dc-in" id="tsRmD"></div>
        <div class="dc-field" style="margin:0"><label>ถึงวันที่</label><input type="date" class="dc-in" id="tsRmD2"></div></div>` : ''}
      <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px">เหตุผล <span class="dc-req">*</span></label>
      <textarea class="dc-in" id="tsRm" rows="3"></textarea><div id="tsRmErr"></div>
      <div class="dc-bar"><button class="dc-btn dc-ghost" id="tsRmX" type="button">Cancel</button><button class="dc-btn dc-primary" id="tsRmOk" type="button">Confirm</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tsRmX').addEventListener('click', close);
    scrim.querySelector('#tsRmOk').addEventListener('click', () => {
      const reason = scrim.querySelector('#tsRm').value.trim();
      if (!reason) { scrim.querySelector('#tsRmErr').innerHTML = '<div class="dc-err">กรุณาระบุเหตุผล</div>'; return; }
      const body = Object.assign({ token: this.token(), reason: reason, comment: reason }, payload);
      if (withDate) { body.StartDate = scrim.querySelector('#tsRmD').value; body.EndDate = scrim.querySelector('#tsRmD2').value; }
      const ok = scrim.querySelector('#tsRmOk'); ok.disabled = true; ok.textContent = 'Processing…';
      API.post(action, body)
        .then(() => { close(); this.toast('Done'); this.openDetail(this._id); })
        .catch(ex => { ok.disabled = false; ok.textContent = 'Confirm'; scrim.querySelector('#tsRmErr').innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; });
    });
  },

  /** Organiser nominates departments. */
  deptModal() {
    const s = this.detail.session;
    const already = {}; (this.detail.depts || []).forEach(o => already[String(o.DepartmentID)] = 1);
    const pool = Object.keys(Training.deptMap).filter(id => !already[id]).sort();
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal" style="max-width:520px;max-height:85vh;overflow:auto">
      <h3 style="margin:0 0 4px">เรียกฝ่ายเข้าอบรม</h3>
      <p class="dc-muted" style="margin:0 0 12px;font-size:12.5px">${trnEsc(s.Subject)} · ${trnEsc(s.SessionNo)}</p>
      ${pool.length ? `<div style="display:grid;gap:6px">${pool.map(id => `<label style="display:flex;gap:8px;align-items:center;font-size:13px">
          <input type="checkbox" class="tsD" value="${trnEsc(id)}"> <span style="flex:1">${trnEsc(Training.deptName(id))}</span>
          <input type="number" min="0" step="1" class="dc-in tsDQ" data-d="${trnEsc(id)}" placeholder="quota" style="width:82px"></label>`).join('')}</div>`
        : '<p class="dc-faint" style="color:#9ca3af">ทุกฝ่ายถูกเรียกไปแล้ว</p>'}
      <div id="tsDErr"></div>
      <div class="dc-bar"><button class="dc-btn dc-ghost" id="tsDX" type="button">Cancel</button><button class="dc-btn dc-primary" id="tsDOk" type="button">Add</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tsDX').addEventListener('click', close);
    scrim.querySelector('#tsDOk').addEventListener('click', () => {
      const picked = Array.prototype.map.call(scrim.querySelectorAll('.tsD:checked'), x => x.value);
      if (!picked.length) { scrim.querySelector('#tsDErr').innerHTML = '<div class="dc-err">กรุณาเลือกอย่างน้อย 1 ฝ่าย</div>'; return; }
      const quotas = {};
      scrim.querySelectorAll('.tsDQ').forEach(i => { if (picked.indexOf(i.dataset.d) !== -1 && i.value !== '') quotas[i.dataset.d] = Number(i.value); });
      const ok = scrim.querySelector('#tsDOk'); ok.disabled = true; ok.textContent = 'Processing…';
      API.post('addTrainingSessionDepts', { token: this.token(), sessionId: s.SessionID, depts: picked, quotas: quotas })
        .then(() => { close(); this.toast('เรียกฝ่ายแล้ว'); this.openDetail(this._id); })
        .catch(ex => { ok.disabled = false; ok.textContent = 'Add'; scrim.querySelector('#tsDErr').innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; });
    });
  },

  /** A department picks its own employees. */
  async assignModal(dept) {
    const s = this.detail.session;
    let r;
    try { r = await API.get('getTrainingSessionEmployees', { token: this.token(), sessionId: s.SessionID, dept: dept }); }
    catch (e) { this.toast(e.message || 'Failed'); return; }
    const list = r.employees || [];
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal" style="max-width:520px;max-height:85vh;overflow:auto">
      <h3 style="margin:0 0 4px">เพิ่มรายชื่อ — ${trnEsc(Training.deptName(dept))}</h3>
      <p class="dc-muted" style="margin:0 0 12px;font-size:12.5px">${trnEsc(s.Subject)} · ${trnEsc(s.SessionNo)}</p>
      ${list.length ? `<div style="display:grid;gap:5px">${list.map(e => `<label style="display:flex;gap:8px;align-items:center;font-size:13px">
          <input type="checkbox" class="tsE" value="${trnEsc(e.employeeId)}">
          <span class="dc-id">${trnEsc(e.employeeId)}</span><span style="flex:1">${trnEsc(e.name)}</span>
          <span class="dc-faint" style="font-size:11.5px">${trnEsc(e.position)}</span></label>`).join('')}</div>`
        : '<p class="dc-faint" style="color:#9ca3af">ไม่มีพนักงานที่ยังไม่ถูกเพิ่มในฝ่ายนี้</p>'}
      <div id="tsEErr"></div>
      <div class="dc-bar"><button class="dc-btn dc-ghost" id="tsEX" type="button">Cancel</button><button class="dc-btn dc-primary" id="tsEOk" type="button">Add selected</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tsEX').addEventListener('click', close);
    scrim.querySelector('#tsEOk').addEventListener('click', () => {
      const picked = Array.prototype.map.call(scrim.querySelectorAll('.tsE:checked'), x => x.value);
      if (!picked.length) { scrim.querySelector('#tsEErr').innerHTML = '<div class="dc-err">กรุณาเลือกอย่างน้อย 1 คน</div>'; return; }
      const ok = scrim.querySelector('#tsEOk'); ok.disabled = true; ok.textContent = 'Processing…';
      API.post('addTrainingSessionAttendees', { token: this.token(), sessionId: s.SessionID, dept: dept, employees: picked })
        .then(() => { close(); this.toast('เพิ่มรายชื่อแล้ว'); this.openDetail(this._id); })
        .catch(ex => { ok.disabled = false; ok.textContent = 'Add selected'; scrim.querySelector('#tsEErr').innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; });
    });
  },

  /* ------------------------------ printed forms ------------------------------ */

  async ensureLogo() {
    if (TrainingSession._logo !== undefined) return TrainingSession._logo;
    try { const r = await API.get('getTrainingSessionLogo', { token: this.token() }); TrainingSession._logo = r.logo || ''; }
    catch (e) { TrainingSession._logo = ''; }
    return TrainingSession._logo;
  },

  /** Shared form head: logo, company, title and the blank form's own doc identity. */
  formHead(logo, titleTh, titleEn, formNo) {
    const logoCell = logo ? `<img src="${logo}" alt="SOM" style="height:38px;width:auto">` : '<b style="font-size:15px">SOM</b>';
    return `<table class="fh"><tr>
      <td style="width:190px">${logoCell}<div style="font-size:9px;font-weight:700;margin-top:2px">SUMMIT OTSUKA MANUFACTURING CO.,LTD.</div></td>
      <td style="text-align:center"><div style="font-size:14px;font-weight:700">${trnEsc(titleTh)}</div>
        <div style="font-size:10px;letter-spacing:.4px">${trnEsc(titleEn)}</div></td>
      <td style="width:180px;text-align:right;font-size:9.5px;white-space:pre-line">${trnEsc(formNo)}</td>
    </tr></table>`;
  },

  kvTable(pairs) {
    return `<table class="kv">${pairs.map(p => `<tr><td class="k">${trnEsc(p[0])}</td><td>${trnEsc(p[1])}</td></tr>`).join('')}</table>`;
  },

  signBox(cols) {
    return `<table class="sg"><tr>${cols.map(c => `<th>${trnEsc(c[0])}</th>`).join('')}</tr>
      <tr>${cols.map(() => '<td class="sp"></td>').join('')}</tr>
      <tr>${cols.map(c => `<td class="nm">(${trnEsc(c[1] || '')})</td>`).join('')}</tr>
      <tr>${cols.map(c => `<td class="dt">วันที่ ${trnEsc(c[2] || '')}</td>`).join('')}</tr></table>`;
  },

  printStyle() {
    return `<style>
      .fm{font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .fm table{border-collapse:collapse;width:100%}
      .fm .fh td{border:1px solid #000;padding:4px 6px;vertical-align:middle}
      .fm .kv{margin-top:6px}.fm .kv td{border:1px solid #000;padding:3px 6px}
      .fm .kv td.k{width:120px;background:#f4f3f0;font-size:10px}
      .fm .lst{margin-top:8px}.fm .lst th,.fm .lst td{border:1px solid #000;padding:3px 5px}
      .fm .lst th{background:#f0efec;font-size:10px;text-align:center}
      .fm .lst td.c{text-align:center}.fm .lst td.s{height:20px}
      .fm .note{margin-top:8px;border:1px solid #000;padding:5px 6px;font-size:10px;line-height:1.6}
      .fm .sg{margin-top:14px}.fm .sg th,.fm .sg td{border:1px solid #000;padding:3px 6px;text-align:center;font-size:10px}
      .fm .sg th{background:#f0efec}.fm .sg td.sp{height:46px}.fm .sg td.nm{font-size:9.5px}.fm .sg td.dt{font-size:9.5px}
      .fm .pg{page-break-after:always;break-after:page}.fm .pg:last-child{page-break-after:auto;break-after:auto}
      tr,img{break-inside:avoid;page-break-inside:avoid}
    </style>`;
  },

  /** FM-HR-06 — internal training assignment, ONE PAGE PER DEPARTMENT. */
  async printAssign(onlyDept) {
    const d = this.detail, s = d.session;
    const depts = (d.depts || []).filter(o => String(o.Status).toUpperCase() === 'CONFIRMED' && (!onlyDept || String(o.DepartmentID) === String(onlyDept)));
    if (!depts.length) { this.toast('ยังไม่มีฝ่ายที่ยืนยันรายชื่อ'); return; }
    const logo = await this.ensureLogo();
    const formNo = (d.formNos && d.formNos.assign) || 'FM-HR-06';
    const pages = depts.map(dep => {
      const rows = (d.attendees || []).filter(a => String(a.DepartmentID) === String(dep.DepartmentID));
      const body = rows.map((a, i) => `<tr><td class="c">${i + 1}</td><td class="c">${trnEsc(a.EmployeeID)}</td>
        <td>${trnEsc(a.EmployeeName)}</td><td>${trnEsc(a.Position)}</td><td class="s"></td></tr>`).join('')
        + Array.from({ length: Math.max(0, 12 - rows.length) }).map((_, i) => `<tr><td class="c">${rows.length + i + 1}</td><td></td><td></td><td></td><td class="s"></td></tr>`).join('');
      return `<div class="pg">
        ${this.formHead(logo, 'ใบส่งพนักงานเข้ารับการฝึกอบรม', 'TRAINING ASSIGNMENT', formNo)}
        ${this.kvTable([
        ['ฝ่าย / แผนก', Training.deptName(dep.DepartmentID)],
        ['หลักสูตร', s.Subject + (s.CourseCode ? '  (' + s.CourseCode + ')' : '')],
        ['ประเภทการอบรม', tpTypeLabel(s.TrainingType)],
        ['วันที่อบรม', tsRange(s.StartDate, s.EndDate)],
        ['เวลา', (s.TimeText || '') + (s.Hours ? '   รวม ' + s.Hours + ' ชั่วโมง' : '')],
        ['สถานที่', s.Venue || ''],
        ['วิทยากร', s.Trainer || (s.Provider || '')],
        ['เลขที่รุ่นอบรม', s.SessionNo]
      ])}
        <table class="lst"><thead><tr><th style="width:34px">ลำดับ</th><th style="width:88px">รหัสพนักงาน</th><th>ชื่อ - นามสกุล</th><th style="width:140px">ตำแหน่ง</th><th style="width:150px">ลายมือชื่อ</th></tr></thead>
          <tbody>${body}</tbody></table>
        <div class="note"><b>เกณฑ์การประเมินผลการฝึกอบรม:</b> ${trnEsc(tsCriteriaText(s))}</div>
        ${this.signBox([
        ['ผู้จัดทำ', s.SubmittedByName || s.CreatedByName, trnDate(s.SubmittedDate || s.CreatedDate)],
        ['ยืนยันรายชื่อ (ผู้จัดการฝ่าย)', dep.ConfirmedByName, dep.ConfirmedDate ? trnDate(dep.ConfirmedDate) : ''],
        ['อนุมัติ', s.MgrApprovedByName || s.HrApprovedByName, trnDate(s.MgrApprovedDate || s.HrApprovedDate)]
      ])}
      </div>`;
    }).join('');
    trnPrint(formNo.split(/\s+/)[0] + ' · ' + s.SessionNo, 'size: A4 portrait; margin: 10mm;', `<div class="fm">${pages}</div>${this.printStyle()}`);
  },

  /** FM-HR-02 — external training request, one page for the whole session. */
  async printExtReq() {
    const d = this.detail, s = d.session;
    const att = d.attendees || [];
    if (!att.length) { this.toast('ยังไม่มีรายชื่อ'); return; }
    const logo = await this.ensureLogo();
    const formNo = (d.formNos && d.formNos.extReq) || 'FM-HR-02';
    const rows = att.map((a, i) => `<tr><td class="c">${i + 1}</td><td class="c">${trnEsc(a.EmployeeID)}</td>
      <td>${trnEsc(a.EmployeeName)}</td><td>${trnEsc(a.Position)}</td><td>${trnEsc(Training.deptName(a.DepartmentID))}</td></tr>`).join('')
      + Array.from({ length: Math.max(0, 10 - att.length) }).map((_, i) => `<tr><td class="c">${att.length + i + 1}</td><td></td><td></td><td></td><td></td></tr>`).join('');
    const body = `<div class="pg">
      ${this.formHead(logo, 'ขออนุมัติส่งพนักงานเข้ารับการฝึกอบรมภายนอก', 'EXTERNAL TRAINING REQUEST', formNo)}
      ${this.kvTable([
      ['หลักสูตร', s.Subject + (s.CourseCode ? '  (' + s.CourseCode + ')' : '')],
      ['สถาบันผู้จัด', s.Provider || ''],
      ['วันที่อบรม', tsRange(s.StartDate, s.EndDate)],
      ['เวลา', (s.TimeText || '') + (s.Hours ? '   รวม ' + s.Hours + ' ชั่วโมง' : '')],
      ['สถานที่', s.Venue || ''],
      ['วิทยากร', s.Trainer || ''],
      ['ค่าลงทะเบียน', (tsMoney(s.Cost) || '-') + ' บาท' + (s.Budget ? '   (งบตามแผน ' + tsMoney(s.Budget) + ' บาท)' : '')],
      ['เลขที่รุ่นอบรม', s.SessionNo]
    ])}
      <div class="note"><b>วัตถุประสงค์ / ประโยชน์ที่คาดว่าจะได้รับ:</b><br>${trnEsc(s.Objective || '')}</div>
      <table class="lst"><thead><tr><th style="width:34px">ลำดับ</th><th style="width:88px">รหัสพนักงาน</th><th>ชื่อ - นามสกุล</th><th style="width:130px">ตำแหน่ง</th><th style="width:150px">ฝ่าย / แผนก</th></tr></thead>
        <tbody>${rows}</tbody></table>
      <div class="note"><b>เกณฑ์การประเมินผลการฝึกอบรม:</b> ${trnEsc(tsCriteriaText(s))}</div>
      ${this.signBox([
      ['ผู้ขออนุมัติ', s.SubmittedByName || s.CreatedByName, trnDate(s.SubmittedDate || s.CreatedDate)],
      ['ผู้จัดการฝ่ายบุคคล', s.HrApprovedByName, trnDate(s.HrApprovedDate)],
      ['ผู้อนุมัติ (QMS Manager)', s.QmsApprovedByName, trnDate(s.QmsApprovedDate)]
    ])}
    </div>`;
    trnPrint(formNo.split(/\s+/)[0] + ' · ' + s.SessionNo, 'size: A4 portrait; margin: 10mm;', `<div class="fm">${body}</div>${this.printStyle()}`);
  },

  /** FM-HR-07 — registration / sign-in sheet, every type. */
  /* ==================== Phase 4 — บันทึกผลการอบรม ==================== */

  /** หน้าจอกรอกผล: โหลดทุกอย่างในคำขอเดียว */
  async resultsScreen() {
    const c = document.getElementById('pageContent');
    c.innerHTML = '<div class="dc-wrap"><p class="dc-faint">กำลังโหลดผลการอบรม…</p></div>';
    try {
      this._res = await API.get('getTrainingSessionResults', { token: this.token(), sessionId: this._id });
    } catch (ex) {
      c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tsRBack">← กลับ</button>
        <div class="dc-err">${trnEsc((ex && ex.message) || 'โหลดไม่สำเร็จ')}</div></div>`;
      const b = document.getElementById('tsRBack'); if (b) b.addEventListener('click', () => this.openDetail(this._id));
      return;
    }
    this.renderResults();
  },

  renderResults() {
    const d = this._res, s = d.session, crit = d.criteria || {}, days = d.days || [];
    const m = crit.methods || [];
    const hasTest = m.indexOf('TEST') !== -1, hasPrac = m.indexOf('PRACTICAL') !== -1;
    const editable = !!d.canRecord && s.status === 'CONFIRMED';
    const slotCount = d.slotCount || 2;

    const slotHead = days.map(dt => `<th colspan="2" class="ts-day">${trnEsc(tsShortDate(dt))}</th>`).join('');
    const slotSub = days.map(() => '<th class="ts-h">เช้า</th><th class="ts-h">บ่าย</th>').join('');
    const span = 4 + slotCount + 1 + (hasTest ? 1 : 0) + (hasPrac ? 2 : 0) + 3;

    const rows = (d.attendees || []).map((a, i) => {
      const cells = [];
      for (let k = 0; k < slotCount; k++) {
        cells.push(`<td class="ts-c"><input type="checkbox" data-slot="${k}" ${a.slots.charAt(k) === '1' ? 'checked' : ''} ${editable ? '' : 'disabled'}></td>`);
      }
      // ผลที่ถูกแก้ทับไว้ต้องติดกลับมากับแถว ไม่งั้นการเซฟรอบหน้าจะกลืนการแก้ทับหายไป
      const over = (a.result && a.autoResult && a.result !== a.autoResult) ? a.result : '';
      return `<tr data-aid="${trnEsc(a.attendeeId)}" data-auto="${trnEsc(a.autoResult || '')}"${over ? ` data-override="${trnEsc(over)}"` : ''}>
        <td class="dc-faint ts-c">${i + 1}</td>
        <td><span class="dc-id">${trnEsc(a.employeeId)}</span></td>
        <td>${trnEsc(a.employeeName)}<div class="dc-faint" style="font-size:11px">${trnEsc(Training.deptName(a.departmentId))}</div></td>
        ${cells.join('')}
        <td class="ts-c ts-pct">${a.attendPct}%<div class="dc-faint" style="font-size:11px">${a.attendHours === '' ? '' : a.attendHours + ' ชม.'}</div></td>
        ${hasTest ? `<td class="ts-c"><input class="dc-in ts-num" type="number" min="0" max="${crit.fullScore || 100}" data-f="score" value="${a.score === '' ? '' : a.score}" ${editable ? '' : 'disabled'}></td>` : ''}
        ${hasPrac ? `<td class="ts-c"><input class="dc-in ts-num" type="number" min="0" max="100" data-f="prac" value="${a.practicalScore === '' ? '' : a.practicalScore}" ${editable ? '' : 'disabled'}></td>
        <td class="ts-c ts-lv">${tsLevelCell(a.practicalScore)}</td>` : ''}
        <td class="ts-c ts-res">${tsResultChip(a.result, a.autoResult)}</td>
        <td><input class="dc-in ts-rm" data-f="remark" value="${trnEsc(a.remark)}" placeholder="หมายเหตุ" ${editable ? '' : 'disabled'}></td>
        <td class="ts-c"><button class="dc-btn dc-ghost dc-sm" data-more type="button" ${editable ? '' : 'disabled'}>ใบรับรอง</button>
          <input type="hidden" data-f="certNo" value="${trnEsc(a.certNo)}"><input type="hidden" data-f="certExpiry" value="${trnEsc(a.certExpiry)}"></td>
      </tr>`;
    }).join('');

    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tsRBack">← กลับไปหน้ารุ่นอบรม</button>
      <div class="dc-ph" style="margin-bottom:12px"><div>
        <h1 style="margin:0;font-size:22px">บันทึกผลการอบรม</h1>
        <p class="dc-muted" style="margin:4px 0 0">${trnEsc(s.subject)} · ${trnEsc(s.sessionNo)} &nbsp; ${tsBadge(s.status)}</p>
      </div></div>

      <div class="dc-card" style="margin-bottom:12px;font-size:12.5px;line-height:1.8">
        <b>เกณฑ์ผ่าน</b> — ${trnEsc(tsCritText(crit))}<br>
        <span class="dc-faint">ระดับทักษะจากคะแนน:</span> ${(d.scale || []).filter(x => x.level > 0).map(x => `${tsLevelIcon(x.level, 14)} ${x.from}–${x.to} = ${x.skill}%`).join(' &nbsp;·&nbsp; ')}
      </div>

      ${editable ? `<div class="dc-bar" style="margin-bottom:8px;flex-wrap:wrap">
        <button class="dc-btn dc-ghost dc-sm" id="tsAllIn" type="button">✓ เข้าครบทุกคน</button>
        <button class="dc-btn dc-ghost dc-sm" id="tsClearIn" type="button">ล้างการเข้าอบรมทั้งหมด</button>
        ${hasPrac ? `<span class="dc-faint" style="font-size:12px">ใส่คะแนนปฏิบัติเท่ากันทุกคน</span>
        <input class="dc-in ts-num" id="tsBulkPrac" type="number" min="0" max="100" style="width:70px">
        <button class="dc-btn dc-ghost dc-sm" id="tsBulkGo" type="button">ใส่</button>` : ''}
      </div>` : ''}

      <div class="dc-card" style="overflow-x:auto">
        <table class="dc-tbl ts-grid"><thead>
          <tr><th rowspan="2" style="width:34px">#</th><th rowspan="2" style="width:80px">รหัส</th><th rowspan="2">ชื่อ - นามสกุล</th>
            ${slotHead}
            <th rowspan="2" style="width:66px">เวลา</th>
            ${hasTest ? '<th rowspan="2" style="width:74px">คะแนน<br>ทดสอบ</th>' : ''}
            ${hasPrac ? '<th rowspan="2" style="width:74px">คะแนน<br>ปฏิบัติ</th><th rowspan="2" style="width:60px">ระดับ</th>' : ''}
            <th rowspan="2" style="width:92px">ผลประเมิน</th><th rowspan="2" style="width:150px">หมายเหตุ</th><th rowspan="2" style="width:76px"></th></tr>
          <tr>${slotSub}</tr>
        </thead><tbody>${rows || `<tr><td colspan="${span}" class="dc-faint" style="padding:10px">ยังไม่มีรายชื่อ</td></tr>`}</tbody></table>
      </div>

      <div id="tsResErr"></div>
      <div class="dc-bar" style="margin-top:12px;flex-wrap:wrap">
        ${editable ? '<button class="dc-btn dc-primary" id="tsSave" type="button">บันทึกผล</button>' : ''}
        ${editable ? '<button class="dc-btn dc-ghost" id="tsSaveDone" type="button">บันทึกแล้วปิดการกรอก (DONE)</button>' : ''}
        <button class="dc-btn dc-ghost" id="tsFiles" type="button">เอกสารแนบ (${(d.files || []).length})</button>
        <button class="dc-btn dc-ghost" id="tsPrintReg" type="button">พิมพ์ FM-HR-07</button>
      </div>

      <style>
        .ts-grid th{font-size:11.5px;text-align:center;vertical-align:middle}
        .ts-grid td{vertical-align:middle}
        .ts-grid td.ts-c{text-align:center}
        .ts-grid th.ts-day{background:#eef2ff}
        .ts-grid th.ts-h{font-weight:400;font-size:11px}
        .ts-num{width:62px;padding:3px 5px;text-align:center}
        .ts-rm{padding:3px 6px;font-size:12px}
        .ts-chip{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11.5px;font-weight:600}
        .ts-pass{background:#dcfce7;color:#166534}.ts-fail{background:#fee2e2;color:#991b1b}
        .ts-abs{background:#f3f4f6;color:#6b7280}.ts-att{background:#dbeafe;color:#1e40af}
        .ts-ovr{display:block;font-size:10px;color:#b45309;font-weight:400}
        .dc-sm{padding:3px 8px;font-size:11.5px}
      </style>
    </div><div class="dc-toast" id="dcToast"></div>`;

    document.getElementById('tsRBack').addEventListener('click', () => this.openDetail(this._id));
    const pr = document.getElementById('tsPrintReg'); if (pr) pr.addEventListener('click', () => this.printRegister());
    const fb = document.getElementById('tsFiles'); if (fb) fb.addEventListener('click', () => this.filesModal());

    if (!editable) return;
    const recalc = tr => this.recalcRow(tr);
    c.querySelectorAll('tbody tr[data-aid]').forEach(tr => {
      tr.querySelectorAll('input[data-slot],input[data-f]').forEach(el => {
        el.addEventListener('change', () => recalc(tr));
        if (el.type === 'number') el.addEventListener('input', () => recalc(tr));
      });
      const more = tr.querySelector('[data-more]');
      if (more) more.addEventListener('click', () => this.certModal(tr));
    });
    document.getElementById('tsAllIn').addEventListener('click', () => {
      c.querySelectorAll('tbody tr[data-aid]').forEach(tr => { tr.querySelectorAll('input[data-slot]').forEach(x => { x.checked = true; }); recalc(tr); });
    });
    document.getElementById('tsClearIn').addEventListener('click', () => {
      c.querySelectorAll('tbody tr[data-aid]').forEach(tr => { tr.querySelectorAll('input[data-slot]').forEach(x => { x.checked = false; }); recalc(tr); });
    });
    const bg = document.getElementById('tsBulkGo');
    if (bg) bg.addEventListener('click', () => {
      const v = document.getElementById('tsBulkPrac').value;
      c.querySelectorAll('tbody tr[data-aid]').forEach(tr => { const el = tr.querySelector('[data-f="prac"]'); if (el) { el.value = v; recalc(tr); } });
    });
    document.getElementById('tsSave').addEventListener('click', ev => this.saveResults(ev.currentTarget, false));
    document.getElementById('tsSaveDone').addEventListener('click', ev => this.saveResults(ev.currentTarget, true));
  },

  /** คิดผลใหม่ในหน้าจอ ใช้กติกาเดียวกับฝั่งเซิร์ฟเวอร์ */
  recalcRow(tr) {
    const d = this._res, crit = d.criteria || {};
    const slots = Array.from(tr.querySelectorAll('input[data-slot]')).map(x => x.checked ? '1' : '0').join('');
    const hit = slots.split('').filter(x => x === '1').length;
    const total = slots.length || 1;
    const pct = Math.round((hit / total) * 10000) / 100;
    const hours = Number(d.session.hours) > 0 ? Math.round((Number(d.session.hours) * hit / total) * 100) / 100 : '';
    const pc = tr.querySelector('.ts-pct');
    if (pc) pc.innerHTML = `${pct}%<div class="dc-faint" style="font-size:11px">${hours === '' ? '' : hours + ' ชม.'}</div>`;

    const scEl = tr.querySelector('[data-f="score"]'), prEl = tr.querySelector('[data-f="prac"]');
    const score = scEl && scEl.value !== '' ? Number(scEl.value) : '';
    const prac = prEl && prEl.value !== '' ? Number(prEl.value) : '';
    const lvCell = tr.querySelector('.ts-lv');
    if (lvCell) lvCell.innerHTML = tsLevelCell(prac);

    const auto = tsAutoResult(crit, hit > 0, pct, score, prac);
    tr.dataset.auto = auto;
    const ov = tr.dataset.override || '';
    const cell = tr.querySelector('.ts-res');
    if (cell) cell.innerHTML = tsResultChip(ov || auto, auto);
  },

  async saveResults(bt, thenDone) {
    const c = document.getElementById('pageContent');
    const rows = Array.from(c.querySelectorAll('tbody tr[data-aid]')).map(tr => ({
      attendeeId: tr.dataset.aid,
      slots: Array.from(tr.querySelectorAll('input[data-slot]')).map(x => x.checked ? '1' : '0').join(''),
      score: (tr.querySelector('[data-f="score"]') || {}).value || '',
      practicalScore: (tr.querySelector('[data-f="prac"]') || {}).value || '',
      result: tr.dataset.override || '',
      remark: (tr.querySelector('[data-f="remark"]') || {}).value || '',
      certNo: (tr.querySelector('[data-f="certNo"]') || {}).value || '',
      certExpiry: (tr.querySelector('[data-f="certExpiry"]') || {}).value || ''
    }));
    if (!rows.length) { this.toast('ยังไม่มีรายชื่อ'); return; }
    const prev = bt.textContent; bt.disabled = true; bt.textContent = 'กำลังบันทึก…';
    const err = document.getElementById('tsResErr'); if (err) err.innerHTML = '';
    try {
      await API.post('saveTrainingSessionResults', { token: this.token(), sessionId: this._id, rows });
      if (thenDone) {
        const r = await API.post('completeTrainingSession', { token: this.token(), sessionId: this._id });
        this.toast(r && r.message ? r.message : 'บันทึกผลเสร็จสิ้น');
        return this.openDetail(this._id);
      }
      this.toast('บันทึกผลแล้ว');
      this.resultsScreen();
    } catch (ex) {
      bt.disabled = false; bt.textContent = prev;
      if (err) err.innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'บันทึกไม่สำเร็จ')}</div>`;
    }
  },

  /** แก้ผลทับ + ใบรับรอง ของคนเดียว */
  certModal(tr) {
    const auto = tr.dataset.auto || '';
    const cur = tr.dataset.override || '';
    const certNo = tr.querySelector('[data-f="certNo"]');
    const certEx = tr.querySelector('[data-f="certExpiry"]');
    const name = tr.children[2].textContent.trim();
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal"><h3 style="margin:0 0 4px">${trnEsc(name)}</h3>
      <p class="dc-faint" style="margin:0 0 12px;font-size:12px">ระบบคำนวณได้: <b>${trnEsc(tsResultTh(auto))}</b></p>
      <div class="dc-field"><label>แก้ผลทับ (ต้องใส่หมายเหตุ)</label>
        <select class="dc-in" id="tsOv"><option value="">— ใช้ผลที่ระบบคำนวณ —</option>
          ${['PASS', 'FAIL', 'ABSENT', 'ATTENDED'].map(x => `<option value="${x}" ${cur === x ? 'selected' : ''}>${tsResultTh(x)}</option>`).join('')}</select></div>
      <div class="dc-field"><label>เลขที่ใบรับรอง</label><input class="dc-in" id="tsCn" value="${trnEsc(certNo ? certNo.value : '')}"></div>
      <div class="dc-field"><label>วันหมดอายุใบรับรอง</label><input class="dc-in" id="tsCe" type="date" value="${trnEsc(certEx ? certEx.value : '')}"></div>
      <div class="dc-bar" style="margin-top:14px"><button class="dc-btn dc-primary" id="tsOk" type="button">ตกลง</button>
        <button class="dc-btn dc-ghost" id="tsX" type="button">ยกเลิก</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tsX').addEventListener('click', close);
    scrim.querySelector('#tsOk').addEventListener('click', () => {
      tr.dataset.override = scrim.querySelector('#tsOv').value;
      if (certNo) certNo.value = scrim.querySelector('#tsCn').value;
      if (certEx) certEx.value = scrim.querySelector('#tsCe').value;
      close();
      this.recalcRow(tr);
    });
  },

  /* ==================== เอกสารแนบ ==================== */

  async filesModal() {
    let files = [];
    try { const r = await API.get('getTrainingSessionFiles', { token: this.token(), sessionId: this._id }); files = r.files || []; }
    catch (ex) { this.toast((ex && ex.message) || 'โหลดไฟล์ไม่สำเร็จ'); return; }
    const st = String((this._res && this._res.session.status) || (this.detail && this.detail.session.Status) || '').toUpperCase();
    const canEdit = ['CLOSED', 'CANCELLED'].indexOf(st) === -1;

    const list = files.length ? files.map(f => `<tr><td>${trnEsc(tsFileCat(f.category))}</td>
      <td><a href="${trnEsc(f.url)}" target="_blank" rel="noopener">${trnEsc(f.fileName)}</a>
        ${f.source === 'LINK' ? '<span class="dc-badge dc-b-off" style="margin-left:6px">ลิงก์</span>' : ''}</td>
      <td class="dc-faint">${f.sizeKB ? Math.round(f.sizeKB) + ' KB' : ''}</td>
      <td class="dc-faint">${trnEsc(f.uploadedByName)}</td>
      <td>${canEdit ? `<button class="dc-btn dc-ghost dc-sm" data-rmf="${trnEsc(f.fileRowId)}" type="button">ลบ</button>` : ''}</td></tr>`).join('')
      : '<tr><td colspan="5" class="dc-faint" style="padding:8px">ยังไม่มีเอกสารแนบ</td></tr>';

    const cats = [['MATERIAL', 'เอกสารหลักสูตร'], ['REGISTER', 'ใบลงทะเบียนที่เซ็นแล้ว'], ['TEST', 'เอกสารการทดสอบ'], ['CERT', 'ใบรับรอง'], ['OTHER', 'อื่น ๆ']];
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal" style="max-width:720px"><h3 style="margin:0 0 12px">เอกสารแนบ</h3>
      <table class="dc-tbl"><thead><tr><th style="width:150px">ประเภท</th><th>ไฟล์</th><th style="width:70px">ขนาด</th><th style="width:110px">แนบโดย</th><th style="width:50px"></th></tr></thead>
        <tbody>${list}</tbody></table>
      ${canEdit ? `<div style="margin-top:14px;border-top:1px solid #e5e7eb;padding-top:12px">
        <div class="dc-field"><label>ประเภทเอกสาร</label><select class="dc-in" id="tsFc">${cats.map(x => `<option value="${x[0]}">${x[1]}</option>`).join('')}</select></div>
        <div class="dc-field"><label>เลือกไฟล์ (เลือกหลายไฟล์พร้อมกันได้ · รูปจะถูกย่อให้อัตโนมัติ)</label>
          <input class="dc-in" id="tsFi" type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"></div>
        <div class="dc-field"><label>หรือวางลิงก์ Google Drive (สำหรับไฟล์ใหญ่ที่แอดมินอัปโหลดเข้าโฟลเดอร์เอง)</label>
          <div style="display:flex;gap:6px"><input class="dc-in" id="tsFl" placeholder="https://drive.google.com/file/d/…">
            <button class="dc-btn dc-ghost" id="tsFlGo" type="button">แนบลิงก์</button></div></div>
        <div id="tsFp" class="dc-faint" style="font-size:12px;line-height:1.7"></div>
        <div id="tsFe"></div>
      </div>` : ''}
      <div class="dc-bar" style="margin-top:14px"><button class="dc-btn dc-ghost" id="tsFx" type="button">ปิด</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tsFx').addEventListener('click', close);
    scrim.querySelectorAll('[data-rmf]').forEach(b => b.addEventListener('click', async () => {
      b.disabled = true;
      try { await API.post('deleteTrainingSessionFile', { token: this.token(), fileRowId: b.dataset.rmf }); close(); this.toast('ลบแล้ว'); this.filesModal(); }
      catch (ex) { b.disabled = false; scrim.querySelector('#tsFe').innerHTML = `<div class="dc-err">${trnEsc(ex.message || 'ลบไม่สำเร็จ')}</div>`; }
    }));
    if (!canEdit) return;

    const prog = scrim.querySelector('#tsFp'), errBox = scrim.querySelector('#tsFe');
    scrim.querySelector('#tsFi').addEventListener('change', async ev => {
      const list2 = Array.from(ev.target.files || []);
      if (!list2.length) return;
      const cat = scrim.querySelector('#tsFc').value;
      errBox.innerHTML = ''; prog.innerHTML = '';
      let done = 0;
      for (const f of list2) {
        const line = document.createElement('div');
        line.textContent = f.name + ' — กำลังเตรียม…';
        prog.appendChild(line);
        try {
          const p = await tsPrepFile(f);
          line.textContent = `${f.name} ${tsKb(f.size)} → ${tsKb(p.bytes)} — กำลังส่ง…`;
          await API.post('uploadTrainingSessionFile', {
            token: this.token(), sessionId: this._id, category: cat,
            fileName: p.fileName, mimeType: p.mimeType, base64: p.base64
          });
          line.textContent = `${p.fileName} ${tsKb(p.bytes)} ✓`;
          done++;
        } catch (ex) {
          line.innerHTML = `<span style="color:#b91c1c">${trnEsc(f.name)} — ${trnEsc((ex && ex.message) || 'ส่งไม่สำเร็จ')}</span>`;
        }
      }
      if (done) { setTimeout(() => { close(); this.filesModal(); }, 900); }
    });
    scrim.querySelector('#tsFlGo').addEventListener('click', async ev => {
      const url = scrim.querySelector('#tsFl').value.trim();
      if (!url) return;
      ev.currentTarget.disabled = true; errBox.innerHTML = '';
      try {
        await API.post('linkTrainingSessionFile', { token: this.token(), sessionId: this._id, category: scrim.querySelector('#tsFc').value, url });
        close(); this.toast('แนบลิงก์แล้ว'); this.filesModal();
      } catch (ex) {
        ev.currentTarget.disabled = false;
        errBox.innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'แนบไม่สำเร็จ')}</div>`;
      }
    });
  },

  /* ==================== FM-HR-07 · FM-HR-09 ==================== */

  /** ถามก่อนพิมพ์ว่าจะแสดงเลขบัตรประชาชนแบบไหน แล้วค่อยดึงข้อมูลจากเซิร์ฟเวอร์ */
  printRegister() {
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal"><h3 style="margin:0 0 6px">พิมพ์ใบลงทะเบียน FM-HR-07</h3>
      <p class="dc-faint" style="margin:0 0 12px;font-size:12px">อบรมหลายวันจะพิมพ์แยกแผ่นละวัน</p>
      <div class="dc-field"><label>เลขที่บัตรประชาชน <span class="dc-faint">(ข้อมูลส่วนบุคคล — ค่าเริ่มต้นมาจาก Settings)</span></label>
        <select class="dc-in" id="tsCm">
          <option value="">ตามค่าเริ่มต้นของบริษัท</option>
          <option value="HIDE">ไม่แสดง</option>
          <option value="MASK">แสดง 4 ตัวท้าย</option>
          <option value="FULL">แสดงเต็ม</option></select></div>
      <div class="dc-bar" style="margin-top:14px"><button class="dc-btn dc-primary" id="tsPg" type="button">พิมพ์</button>
        <button class="dc-btn dc-ghost" id="tsPx" type="button">ยกเลิก</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tsPx').addEventListener('click', close);
    scrim.querySelector('#tsPg').addEventListener('click', async ev => {
      const mode = scrim.querySelector('#tsCm').value;
      ev.currentTarget.disabled = true;
      try { await this.doPrintRegister(mode); close(); }
      catch (ex) { ev.currentTarget.disabled = false; this.toast((ex && ex.message) || 'พิมพ์ไม่สำเร็จ'); }
    });
  },

  async doPrintRegister(mode) {
    const p = { token: this.token(), sessionId: this._id };
    if (mode) p.citizenMode = mode;
    const d = await API.get('getTrainingSessionRegister', p);
    const s = d.session, days = d.days || [], rows = d.rows || [], crit = d.criteria || {};
    if (!rows.length) { this.toast('ยังไม่มีรายชื่อ'); return; }
    const logo = await this.ensureLogo();
    const formNo = (this.detail && this.detail.formNos && this.detail.formNos.register) || 'FM-HR-07';
    const showId = d.citizenMode !== 'HIDE';

    const pages = (days.length ? days : ['']).map((day, di) => {
      const body = rows.map((r, i) => {
        const am = r.slots.charAt(di * 2) === '1' ? '✓' : '';
        const pm = r.slots.charAt(di * 2 + 1) === '1' ? '✓' : '';
        return `<tr>
          <td class="c">${i + 1}</td><td class="c">${trnEsc(r.employeeId)}</td>
          <td>${trnEsc(r.employeeName)}${showId && r.citizenId ? `<div class="cid">${trnEsc(r.citizenId)}</div>` : ''}</td>
          <td class="c">${trnEsc(Training.deptName(r.departmentId))}</td>
          <td class="c">${r.years === '' ? '' : r.years}</td>
          <td class="sg2">${am}</td><td class="sg2">${pm}</td>
          <td class="c">${r.score === '' ? '' : r.score}</td>
          <td class="c">${r.practicalScore === '' ? '' : r.practicalScore}</td>
          <td class="c">${r.result === 'PASS' || r.result === 'ATTENDED' ? '✓' : ''}</td>
          <td class="c">${r.result === 'FAIL' ? '✓' : ''}</td>
          <td class="c">${r.recorded ? '✓' : ''}</td></tr>`;
      }).join('');
      const blanks = Array.from({ length: Math.max(0, 14 - rows.length) }).map((_, i) =>
        `<tr><td class="c">${rows.length + i + 1}</td><td></td><td></td><td></td><td></td><td class="sg2"></td><td class="sg2"></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('');
      return `<div class="pg">
        ${this.formHead(logo, 'ใบลงทะเบียนเข้ารับการฝึกอบรม', 'TRAINING REGISTRATION', formNo)}
        ${this.kvTable([
          ['หลักสูตร', s.subject + (s.courseCode ? '  (' + s.courseCode + ')' : '')],
          ['ประเภท / รุ่น', tpTypeLabel(s.trainingType) + '     เลขที่รุ่น ' + s.sessionNo],
          ['วันที่อบรม', (day ? tsShortDate(day) + '     ' : '') + (days.length > 1 ? '(วันที่ ' + (di + 1) + ' จาก ' + days.length + ')     ' : '') + (s.timeText || '') + (s.hours ? '     รวม ' + s.hours + ' ชั่วโมง' : '')],
          ['สถานที่', s.venue || ''],
          ['วิทยากร / สถาบัน', s.trainer || s.provider || '']
        ])}
        <table class="lst reg"><thead>
          <tr><th rowspan="2" class="w1">ลำดับ<br>ที่</th><th rowspan="2" class="w2">รหัส<br>พนักงาน</th><th rowspan="2" class="w3">ชื่อ - สกุล</th>
            <th rowspan="2" class="w4">แผนก</th><th rowspan="2" class="w5">อายุงาน<br>(ปี)</th>
            <th colspan="2" class="w6">ลงชื่อผู้เข้าอบรม</th>
            <th rowspan="2" class="w7">คะแนน<br>ทดสอบ</th><th rowspan="2" class="w7">คะแนน<br>ปฏิบัติ</th>
            <th colspan="2" class="w8">ผลประเมิน</th><th rowspan="2" class="w9">บันทึก<br>ประวัติ</th></tr>
          <tr><th class="w6">เช้า</th><th class="w6">บ่าย</th><th class="w8">ผ่าน</th><th class="w8">ไม่ผ่าน</th></tr>
        </thead><tbody>${body}${blanks}</tbody></table>
        <div class="note"><b>วิธีการประเมินผล:</b> ${trnEsc(tsMethodsText((crit.methods || []).join('|')))}<br>
          <b>เกณฑ์ผ่าน:</b> ${trnEsc(tsCritText(crit))}<br>
          <b>ระดับทักษะจากคะแนน:</b> 91–100 = 100% · 81–90 = 75% · 71–80 = 50% · 61–70 = 25% · ต่ำกว่า 61 = ไม่ถึงระดับ</div>
        ${this.signBox([['วิทยากร', s.trainer || '', ''], ['ผู้จัดการฝึกอบรม', '', '']])}
      </div>`;
    }).join('');

    trnPrint(formNo.split(/\s+/)[0] + ' · ' + s.sessionNo, 'size: A4 portrait; margin: 10mm;',
      `<div class="fm">${pages}</div>${this.printStyle()}${tsRegStyle()}`);
  },

  /** FM-HR-09 — ประวัติการฝึกอบรมรายบุคคล */
  async printHistoryCard(employeeId) {
    let d;
    try { d = await API.get('getTrainingHistoryCard', { token: this.token(), employeeId }); }
    catch (ex) { this.toast((ex && ex.message) || 'โหลดไม่สำเร็จ'); return; }
    const logo = await this.ensureLogo();
    const formNo = 'FM-HR-09';
    const rows = (d.rows || []).map((h, i) => `<tr>
      <td class="c">${i + 1}</td><td class="c">${trnEsc(trnDate(h.TrainingDate))}</td>
      <td>${trnEsc(h.CourseName)}${h.CourseCode ? ' <span class="cid">(' + trnEsc(h.CourseCode) + ')</span>' : ''}</td>
      <td class="c">${trnEsc(tpTypeLabel(h.CourseType))}</td>
      <td class="c">${h.DurationHours === '' || h.DurationHours == null ? '' : h.DurationHours}</td>
      <td>${trnEsc(h.Trainer)}</td>
      <td class="c">${h.Score === '' || h.Score == null ? '' : h.Score}</td>
      <td class="c">${trnEsc(tsResultTh(h.Result))}</td>
      <td class="c">${trnEsc(h.CertNo || '')}</td></tr>`).join('')
      || '<tr><td colspan="9" class="c" style="padding:10px">ยังไม่มีประวัติการฝึกอบรม</td></tr>';
    const body = `<div class="pg">
      ${this.formHead(logo, 'ประวัติการฝึกอบรมพนักงาน', 'EMPLOYEE TRAINING RECORD', formNo)}
      ${this.kvTable([
        ['ชื่อ - สกุล', d.employeeName + '   (' + d.employeeId + ')'],
        ['แผนก / ตำแหน่ง', Training.deptName(d.departmentId) + (d.position ? '   ' + d.position : '')],
        ['วันที่เริ่มงาน', (d.startDate ? trnDate(d.startDate) : '-') + (d.years === '' ? '' : '     อายุงาน ' + d.years + ' ปี')]
      ])}
      <table class="lst"><thead><tr><th style="width:8mm">ลำดับ</th><th style="width:22mm">วันที่อบรม</th><th>หลักสูตร</th>
        <th style="width:20mm">ประเภท</th><th style="width:14mm">ชั่วโมง</th><th style="width:30mm">วิทยากร</th>
        <th style="width:14mm">คะแนน</th><th style="width:16mm">ผล</th><th style="width:24mm">ใบรับรอง</th></tr></thead>
        <tbody>${rows}</tbody></table>
      ${this.signBox([['ผู้บันทึก', '', ''], ['ผู้จัดการฝ่ายบุคคล', '', '']])}
    </div>`;
    trnPrint(formNo + ' · ' + d.employeeId, 'size: A4 portrait; margin: 10mm;', `<div class="fm">${body}</div>${this.printStyle()}${tsRegStyle()}`);
  }
};

/* ==================== helpers ที่ใช้ร่วมกัน (Phase 4) ==================== */

/** ช่วงคะแนน → Skill % — ต้องตรงกับ TRR_BANDS_ ฝั่ง Apps Script เป๊ะ */
const TS_BANDS = [
  { min: 91, skill: 100, level: 4 }, { min: 81, skill: 75, level: 3 },
  { min: 71, skill: 50, level: 2 }, { min: 61, skill: 25, level: 1 },
  { min: 51, skill: 24, level: 0 }, { min: 0, skill: 0, level: 0 }
];
function tsBand(score) {
  if (score === '' || score == null || isNaN(Number(score))) return { skill: '', level: 0 };
  const n = Number(score);
  for (const b of TS_BANDS) if (n >= b.min) return b;
  return { skill: 0, level: 0 };
}

/**
 * วงกลมระดับทักษะ วาดด้วย SVG — รัศมีเท่ากันทุกระดับ เท่ากันทุกเครื่อง และพิมพ์ออกกระดาษได้
 * (ตัวอักษร ●◕◑◔ มาจากคนละบล็อกในฟอนต์ ขนาดจึงไม่เท่ากัน และบางเครื่องขึ้นเป็น □)
 */
function tsLevelIcon(lv, px) {
  const s = px || 16, n = Number(lv) || 0;
  const wedge = {
    1: 'M8,8 L8,2 A6,6 0 0,1 14,8 Z',
    2: 'M8,8 L8,2 A6,6 0 0,1 8,14 Z',
    3: 'M8,8 L8,2 A6,6 0 1,1 2,8 Z'
  };
  const fill = n >= 4 ? '<circle cx="8" cy="8" r="6" fill="currentColor"/>'
    : (wedge[n] ? `<path d="${wedge[n]}" fill="currentColor"/>` : '');
  return `<svg viewBox="0 0 16 16" width="${s}" height="${s}" style="vertical-align:-2px" aria-hidden="true">
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.2"/>${fill}</svg>`;
}

function tsLevelCell(score) {
  const b = tsBand(score);
  if (b.skill === '') return '<span class="dc-faint">—</span>';
  if (!b.level) return `<span class="dc-faint" title="ยังไม่ถึงระดับ ${tsLevelIcon(1, 12)}">— ${b.skill}%</span>`;
  return `${tsLevelIcon(b.level, 16)} <span class="dc-faint" style="font-size:11px">${b.skill}%</span>`;
}

function tsResultTh(r) {
  return { PASS: 'ผ่าน', FAIL: 'ไม่ผ่าน', ABSENT: 'ขาดอบรม', ATTENDED: 'เข้าอบรม' }[String(r || '').toUpperCase()] || '—';
}

function tsResultChip(result, auto) {
  const r = String(result || '').toUpperCase();
  if (!r) return '<span class="dc-faint">—</span>';
  const cls = { PASS: 'ts-pass', FAIL: 'ts-fail', ABSENT: 'ts-abs', ATTENDED: 'ts-att' }[r] || 'ts-abs';
  const over = auto && auto !== r ? `<span class="ts-ovr">แก้ทับ (ระบบ: ${tsResultTh(auto)})</span>` : '';
  return `<span class="ts-chip ${cls}">${tsResultTh(r)}</span>${over}`;
}

/** กติกาเดียวกับ trrComputeResult_ ฝั่งเซิร์ฟเวอร์ — เซิร์ฟเวอร์เป็นคนตัดสินจริงเสมอ */
function tsAutoResult(crit, attended, pct, score, prac) {
  if (!attended) return 'ABSENT';
  const m = crit.methods || [];
  if (!m.length) return 'ATTENDED';
  if (m.indexOf('ATTENDANCE') !== -1 && pct < Number(crit.minAttendPct)) return 'FAIL';
  if (m.indexOf('TEST') !== -1) {
    if (score === '') return 'FAIL';
    if (crit.passScore !== '' && Number(score) < Number(crit.passScore)) return 'FAIL';
  }
  if (m.indexOf('PRACTICAL') !== -1) {
    if (prac === '') return 'FAIL';
    if (tsBand(prac).level < Number(crit.minLevel)) return 'FAIL';
  }
  return 'PASS';
}

function tsCritText(crit) {
  const m = (crit && crit.methods) || [];
  const out = [];
  if (m.indexOf('ATTENDANCE') !== -1) out.push('เวลาเข้าอบรม ' + (crit.minAttendPct || 100) + '%');
  if (m.indexOf('TEST') !== -1) out.push('คะแนนทดสอบ ≥ ' + (crit.passScore === '' ? '—' : crit.passScore) + ' จาก ' + (crit.fullScore || 100));
  if (m.indexOf('PRACTICAL') !== -1) out.push('คะแนนปฏิบัติถึงระดับ ' + (crit.minLevel || 3) + ' (' + ((crit.minLevel || 3) * 25) + '%)');
  return out.length ? out.join('  ·  ') + '   — ต้องผ่านทุกข้อ' : 'ไม่มีการประเมิน (เข้าอบรมถือว่าจบ)';
}

function tsShortDate(v) {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(v || '');
  const th = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return Number(m[3]) + ' ' + th[Number(m[2]) - 1] + ' ' + (Number(m[1]) + 543).toString().slice(-2);
}

function tsFileCat(c) {
  return { MATERIAL: 'เอกสารหลักสูตร', REGISTER: 'ใบลงทะเบียน', TEST: 'เอกสารการทดสอบ', CERT: 'ใบรับรอง', OTHER: 'อื่น ๆ' }[String(c || '').toUpperCase()] || c;
}

function tsKb(n) { return n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB'; }

/**
 * เตรียมไฟล์ก่อนส่ง — รูปถูกย่อในเบราว์เซอร์ (Apps Script ย่อรูปเองไม่ได้ และการย่อก่อนส่ง
 * ทำให้อัปโหลดเร็วขึ้นหลายเท่า) ไฟล์อื่นส่งตามเดิม
 */
function tsPrepFile(file) {
  const maxPx = 1600, quality = 0.8;
  const asIs = () => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res({ base64: String(fr.result).split(',')[1], mimeType: file.type || 'application/octet-stream', fileName: file.name, bytes: file.size });
    fr.onerror = () => rej(new Error('อ่านไฟล์ไม่ได้'));
    fr.readAsDataURL(file);
  });
  if (!/^image\//i.test(file.type || '')) return asIs();
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          const cx = cv.getContext('2d');
          cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
          cx.drawImage(img, 0, 0, w, h);
          const url = cv.toDataURL('image/jpeg', quality);
          const b64 = url.split(',')[1];
          res({ base64: b64, mimeType: 'image/jpeg', fileName: file.name.replace(/\.[^.]+$/, '') + '.jpg', bytes: Math.round(b64.length * 0.75) });
        } catch (e) { asIs().then(res, rej); }
      };
      img.onerror = () => asIs().then(res, rej);
      img.src = String(fr.result);
    };
    fr.onerror = () => rej(new Error('อ่านไฟล์ไม่ได้'));
    fr.readAsDataURL(file);
  });
}

/** ความกว้างคอลัมน์ FM-HR-07 บน A4 แนวตั้ง — รวม 190 มม. พอดี */
function tsRegStyle() {
  return `<style>
    .fm .reg{table-layout:fixed;width:190mm}
    .fm .reg th,.fm .reg td{font-size:9.5px;padding:2px 3px}
    .fm .reg .w1{width:8mm}.fm .reg .w2{width:16mm}.fm .reg .w3{width:40mm}.fm .reg .w4{width:16mm}
    .fm .reg .w5{width:10mm}.fm .reg .w6{width:22mm}.fm .reg .w7{width:14mm}.fm .reg .w8{width:9mm}.fm .reg .w9{width:10mm}
    .fm .reg td.sg2{height:11mm;text-align:center}
    .fm .cid{font-size:8px;color:#555}
  </style>`;
}

function loadTrainingSessions() { TrainingSession._logo = undefined; TrainingSession._id = ''; TrainingSession._res = null; TrainingSession.load(); }
