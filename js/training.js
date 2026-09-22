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
          <div class="dc-field dc-span2"><label>คู่มือการฝึกอบรม</label><div id="cMat">${ed ? this.fileChip(existing.MaterialFileID, existing.MaterialFileName, 'material') : '<span class="dc-faint" style="font-size:12px;color:#9ca3af">บันทึกหลักสูตรก่อน แล้วค่อยแนบคู่มือ</span>'}</div></div>
        </div>
        <div id="cErr"></div>
        <div class="dc-bar"><button class="dc-btn dc-ghost" id="cCancel" type="button">Cancel</button><button class="dc-btn dc-primary" id="cSave" type="button">${ed ? 'Save changes' : 'Create'}</button></div>
      </div></div><div class="dc-toast" id="dcToast"></div>`;
    const back = () => this.loadCourses();
    document.getElementById('trnBack').addEventListener('click', back);
    document.getElementById('cCancel').addEventListener('click', back);
    document.getElementById('cSave').addEventListener('click', () => this.saveCourse(ed ? existing.CourseID : null));
    if (ed) this.wireMaterial(existing.CourseID);
  },

  async saveCourse(courseId) {
    const err = document.getElementById('cErr');
    const v = id => (document.getElementById(id) || {}).value;
    const payload = { token: this.token(), courseId: courseId || undefined, CourseName: (v('cName') || '').trim(), CourseType: v('cType'), Category: (v('cCat') || '').trim(), TargetPosition: (v('cTarget') || '').trim(), DurationHours: v('cHours'), Reference: (v('cRef') || '').trim(), Description: (v('cDesc') || '').trim() };
    if (courseId) payload.Status = v('cStatus');
    if (!payload.CourseName) { err.innerHTML = '<div class="dc-err">กรุณากรอกชื่อหลักสูตร</div>'; return; }
    if (!payload.CourseType) { err.innerHTML = '<div class="dc-err">กรุณาเลือกประเภท</div>'; return; }
    const btn = document.getElementById('cSave'); btn.disabled = true; btn.textContent = 'Processing…';
    try {
      if (courseId) { await API.post('updateCourse', payload); this.toast('บันทึกแล้ว'); this.loadCourses(); }
      else { const r = await API.post('createCourse', payload); this.toast('สร้างหลักสูตรแล้ว: ' + r.courseCode); this.openCourse(r.courseId); }
    } catch (ex) { btn.disabled = false; btn.textContent = courseId ? 'Save changes' : 'Create'; err.innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'ล้มเหลว')}</div>`; }
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
function loadTrainingRecords() { Training._courses = null; Training.loadRecords(); }

/* ==================== Training Needs (FM-HR-03) — Phase 2a ==================== */
const TN_TABS = [['inProgress', 'In Progress'], ['forApproval', 'For Approval'], ['inPlan', 'My Training Need'], ['cancelled', 'Cancelled']];
const TN_PRIORITY = [['HIGH', 'High'], ['MEDIUM', 'Medium'], ['LOW', 'Low']];
const TN_STATUS = {
  DRAFT: ['Waiting for Submit', 'dc-b-off'], SUBMITTED: ['Waiting for Manager Approve', 'dc-b-info'], DEPT_APPROVED: ['Waiting for HR Review', 'dc-b-warn'],
  IN_PLAN: ['In Plan', 'dc-b-ok'], CANCELLED: ['Not in Plan', 'dc-b-cancel']
};
function tnBadge(st) { const m = TN_STATUS[String(st || '').toUpperCase()] || [st || '—', 'dc-b-off']; return `<span class="dc-badge ${m[1]}">${m[0]}</span>`; }

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
    await Training.ensureDepts();
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><p class="dc-muted" style="padding:8px">Loading…</p></div>`;
    try { this.data = await API.get('getTrainingNeedInbox', { token: this.token(), year: this._year }); this.render(); }
    catch (e) { c.innerHTML = `<div class="dc-wrap"><p style="color:#b91c1c;padding:8px">Failed to load: ${trnEsc(e.message || '')}</p></div>`; }
  },

  render() {
    const d = this.data, counts = d.counts || {};
    const yNow = new Date().getFullYear();
    const years = []; for (let y = yNow + 1; y >= yNow - 3; y--) years.push(y);
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
        <td style="width:150px">${trnEsc(o.TargetGroup)}</td>
        <td class="c" style="width:46px">${trnEsc(o.Headcount)}</td>
        <td class="c" style="width:78px">${trnEsc(status(o.Status))}</td>
        <td style="width:160px">${trnEsc(remark)}</td></tr>`;
    }).join('');
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
          <td class="k">เลขที่เอกสาร</td><td class="v"><b>FM-HR-03</b></td>
          <td class="k">หน้า</td><td class="v"></td>
        </tr>
        <tr><td class="k">วันที่ออกใช้</td><td class="v">31/03/08</td><td class="k">ผู้รายงาน</td><td class="v"></td></tr>
        <tr><td class="k">ออกครั้งที่</td><td class="v">A</td><td class="k">ผู้ทบทวน</td><td class="v"></td></tr>
        <tr><td class="k">แก้ไขครั้งที่</td><td class="v">00</td><td class="k">ผู้อนุมัติ</td><td class="v"></td></tr>
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
    const header = ['Year', 'Department', 'Course', 'Type', 'Attendees', 'Headcount', 'Priority', 'Status', 'Reason', 'Decision reason', 'Created by', 'HR decision by', 'HR decision date'];
    const body = rows.map(o => [o.Year, this.deptName(o.DepartmentID), o.CourseName, trnLabel(TRN_COURSE_TYPES, o.TrainingType), o.TargetGroup, o.Headcount, trnLabel(TN_PRIORITY, o.Priority), status(o.Status), o.Reason, o.DecisionReason, o.CreatedByName, o.HrDecisionByName, trnDate(o.HrDecisionDate)]);
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
      const ok = scrim.querySelector('#tnDlOk'); ok.disabled = true; ok.textContent = '…';
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
        <td>${trnEsc(o.CourseName)} <span class="dc-faint">${trnEsc(String(o.TargetGroup || '').slice(0, 24))}</span></td>
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
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tnBack">← Back</button>
      <div class="dc-card">
        <h1 style="margin:0 0 16px;font-size:20px">${ed ? 'Edit Training Need' : 'New Training Need'} <span class="dc-muted" style="font-size:14px">Year ${this._year}</span></h1>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="dc-field"><label>Department <span class="dc-req">*</span></label>${deptField}</div>
          <div class="dc-field"><label>Priority</label>${sel('tnPriority', TN_PRIORITY, ed ? existing.Priority : 'MEDIUM')}</div>
          <div class="dc-field dc-span2"><label>Course (from catalog)</label><select class="dc-in" id="tnCourse">${courseOpts}</select></div>
          <div class="dc-field"><label>Or type a course name</label><input class="dc-in" id="tnCourseName" value="${ed && !existing.CourseID ? g('CourseName') : ''}"></div>
          <div class="dc-field"><label>Training Type <span class="dc-req">*</span> <span class="dc-muted" style="font-weight:400;font-size:11px">(when typed manually)</span></label>${sel('tnType', TRN_COURSE_TYPES, ed && !existing.CourseID ? existing.TrainingType : '', '— select —')}</div>
          <div class="dc-field"><label>Target Group</label><input class="dc-in" id="tnTarget" value="${g('TargetGroup')}"></div>
          <div class="dc-field"><label>Headcount</label><input type="number" min="0" class="dc-in" id="tnHead" value="${g('Headcount')}"></div>
          <div class="dc-field dc-span2"><label>Reason / Justification <span class="dc-req">*</span></label><textarea class="dc-in" id="tnReason" rows="2">${g('Reason')}</textarea></div>
        </div>
        <div id="tnErr"></div>
        <div class="dc-bar"><button class="dc-btn dc-ghost" id="tnCancel" type="button">Cancel</button><button class="dc-btn dc-primary" id="tnSave" type="button">${ed ? 'Save changes' : 'Create (DRAFT)'}</button></div>
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
    document.getElementById('tnSave').addEventListener('click', () => this.submitForm(ed ? existing.NeedID : null));
  },

  async submitForm(needId) {
    const err = document.getElementById('tnErr');
    const v = id => (document.getElementById(id) || {}).value;
    const payload = { token: this.token(), needId: needId || undefined, Year: this._year, DepartmentID: (v('tnDept') || '').trim(), CourseID: v('tnCourse'), CourseName: (v('tnCourseName') || '').trim(), TrainingType: v('tnType'), TargetGroup: (v('tnTarget') || '').trim(), Headcount: v('tnHead'), Priority: v('tnPriority'), Reason: (v('tnReason') || '').trim() };
    if (!payload.DepartmentID) { err.innerHTML = '<div class="dc-err">Department is required</div>'; return; }
    if (!payload.CourseID && !payload.CourseName) { err.innerHTML = '<div class="dc-err">Pick a course from the catalog, or type a course name</div>'; return; }
    if (!payload.CourseID && !payload.TrainingType) { err.innerHTML = '<div class="dc-err">Training Type is required</div>'; return; }
    if (!payload.Reason) { err.innerHTML = '<div class="dc-err">Reason / justification is required</div>'; return; }
    const btn = document.getElementById('tnSave'); btn.disabled = true; btn.textContent = 'Processing…';
    try {
      if (needId) { await API.post('updateTrainingNeed', payload); this.toast('Saved'); this.openDetail(needId); }
      else { const r = await API.post('createTrainingNeed', payload); this.toast('Created'); this.openDetail(r.needId); }
    } catch (ex) { btn.disabled = false; btn.textContent = needId ? 'Save changes' : 'Create (DRAFT)'; err.innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'Failed')}</div>`; }
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
          ${kv('Target Group', trnEsc(t.TargetGroup))}
          ${kv('Headcount', trnEsc(t.Headcount))}
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

function loadTrainingNeeds() { Training._courses = null; Training.loadCourseOptions().then(() => TrainingNeeds.load()); }
