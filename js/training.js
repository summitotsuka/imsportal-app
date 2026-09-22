/* Training module — Phase 1: Course catalog + Training History (records) */
const TRN_COURSE_TYPES = [['INTERNAL', 'Internal (ภายใน)'], ['EXTERNAL', 'External (ภายนอก)'], ['OJT', 'OJT (สอนงาน)'], ['ORIENTATION', 'Orientation (ปฐมนิเทศ)']];
const TRN_RESULTS = [['PASS', 'ผ่าน'], ['FAIL', 'ไม่ผ่าน'], ['ATTENDED', 'เข้าร่วม']];
const TRN_CERT_TYPES = [['NONE', 'ไม่มี'], ['INTERNAL', 'ภายใน'], ['INSTITUTE', 'สถาบัน'], ['LICENSE', 'License']];

function trnEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function trnDate(v) { if (!v) return '—'; try { const d = new Date(v); if (isNaN(d)) return String(v); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); } catch (e) { return String(v); } }
function trnLabel(list, v) { const f = list.find(x => x[0] === String(v).toUpperCase()); return f ? f[1] : (v || '—'); }
function trnFileUrl(id) { return 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view'; }
function trnReadFile(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res({ base64: String(r.result).split(',')[1], mimeType: file.type || 'application/octet-stream', fileName: file.name }); r.onerror = () => rej(new Error('อ่านไฟล์ไม่ได้')); r.readAsDataURL(file); }); }

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
    catch (e) { c.innerHTML = `<div class="dc-wrap"><p style="color:#b91c1c;padding:8px">โหลดไม่สำเร็จ: ${trnEsc(e.message || '')}</p></div>`; }
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
const TN_PRIORITY = [['HIGH', 'สูง'], ['MEDIUM', 'กลาง'], ['LOW', 'ต่ำ']];
const TN_STATUS = {
  DRAFT: ['ร่าง', 'dc-b-off'], SUBMITTED: ['รอหัวหน้าฝ่ายอนุมัติ', 'dc-b-info'], DEPT_APPROVED: ['รอ HR พิจารณา', 'dc-b-warn'],
  IN_PLAN: ['เข้าแผนปี', 'dc-b-ok'], CANCELLED: ['ไม่เข้าแผน', 'dc-b-cancel']
};
function tnBadge(st) { const m = TN_STATUS[String(st || '').toUpperCase()] || [st || '—', 'dc-b-off']; return `<span class="dc-badge ${m[1]}">${m[0]}</span>`; }

const TrainingNeeds = {
  _tab: 'inProgress', _year: new Date().getFullYear(),
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
    catch (e) { c.innerHTML = `<div class="dc-wrap"><p style="color:#b91c1c;padding:8px">โหลดไม่สำเร็จ: ${trnEsc(e.message || '')}</p></div>`; }
  },

  render() {
    const d = this.data, counts = d.counts || {};
    const yNow = new Date().getFullYear();
    const years = []; for (let y = yNow + 1; y >= yNow - 3; y--) years.push(y);
    const yearSel = `<select class="dc-in" id="tnYear" style="width:auto">${years.map(y => `<option value="${y}" ${y === this._year ? 'selected' : ''}>ประจำปี ${y}</option>`).join('')}</select>`;
    const dl = d.deadline ? `<span class="dc-muted" style="font-size:12.5px">กำหนดส่ง: <b>${trnEsc(d.deadline)}</b>${d.deadlineClosed ? ' <span style="color:#b91c1c">(ปิดรับแล้ว)</span>' : ''}</span>` : '<span class="dc-faint" style="font-size:12.5px;color:#9ca3af">ยังไม่ตั้งกำหนดส่ง</span>';
    const dlBtn = d.canApprove ? `<button class="dc-btn dc-ghost" id="tnDeadline" type="button" style="padding:4px 12px;font-size:12px">⚙ ตั้ง Deadline</button>` : '';
    const tabs = TN_TABS.map(([id, label]) => `<button class="dc-tab${this._tab === id ? ' on' : ''}" data-tab="${id}">${label}<span class="dc-count">${counts[id] || 0}</span></button>`).join('');
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap">
      <div class="dc-ph" style="margin-bottom:10px"><div><h1 style="margin:0">Training Needs</h1>
        <p class="dc-muted" style="margin:4px 0 0">แบบสำรวจความต้องการฝึกอบรม (FM-HR-03)</p></div>
        <button class="dc-btn dc-primary" id="tnNew" type="button" ${d.deadlineClosed && !d.canApprove ? 'disabled title="ปิดรับแล้ว"' : ''}>+ New Need</button></div>
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:12px;flex-wrap:wrap">${yearSel}${dl}${dlBtn}</div>
      <div class="dc-tabs">${tabs}</div>
      <div class="dc-card" id="tnList"></div>
    </div><div class="dc-toast" id="dcToast"></div>`;
    document.getElementById('tnNew').addEventListener('click', () => this.openForm());
    document.getElementById('tnYear').addEventListener('change', e => this.load(null, parseInt(e.target.value, 10)));
    c.querySelectorAll('.dc-tabs [data-tab]').forEach(b => b.addEventListener('click', () => { this._tab = b.dataset.tab; this.render(); }));
    const db = document.getElementById('tnDeadline');
    if (db) db.addEventListener('click', () => this.deadlineModal());
    this.renderList();
  },

  deadlineModal() {
    const self = this, year = this._year, cur = (this.data && this.data.deadline) || '';
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal"><h3 style="margin:0 0 4px">กำหนดส่ง Training Needs ปี ${year}</h3>
      <p class="dc-muted" style="font-size:12px;margin:0 0 12px">เว้นว่าง = เปิดรับตลอด (ไม่มีกำหนด)</p>
      <input type="date" class="dc-in" id="tnDl" value="${trnEsc(cur)}"><div id="tnDlErr"></div>
      <div class="dc-bar"><button class="dc-btn dc-ghost" id="tnDlX" type="button">Cancel</button><button class="dc-btn dc-primary" id="tnDlOk" type="button">บันทึก</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tnDlX').addEventListener('click', close);
    scrim.querySelector('#tnDlOk').addEventListener('click', () => {
      const val = scrim.querySelector('#tnDl').value;
      const ok = scrim.querySelector('#tnDlOk'); ok.disabled = true; ok.textContent = '…';
      API.post('setTrainingNeedDeadline', { token: self.token(), year: year, deadline: val })
        .then(() => { close(); self.toast('ตั้ง Deadline แล้ว'); self.load(); })
        .catch(ex => { ok.disabled = false; ok.textContent = 'บันทึก'; scrim.querySelector('#tnDlErr').innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'ล้มเหลว')}</div>`; });
    });
  },

  renderList() {
    const box = document.getElementById('tnList');
    const items = ((this.data && this.data.inbox) || {})[this._tab] || [];
    if (!items.length) { box.innerHTML = `<p class="dc-faint" style="padding:6px;color:#9ca3af">ไม่มีรายการ</p>`; return; }
    box.innerHTML = `<table class="dc-tbl"><thead><tr><th>ฝ่าย</th><th>หลักสูตร</th><th>ประเภท</th><th>จำนวน</th><th>Priority</th><th>สถานะ</th></tr></thead><tbody>${items.map(o => `
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
    const canAll = this.data && this.data.canApprove;   // HR sees all depts; others locked to home dept
    const depIds = Object.keys(Training.deptMap);
    const deptField = canAll
      ? `<select class="dc-in" id="tnDept">${depIds.map(id => `<option value="${trnEsc(id)}" ${ed && String(existing.DepartmentID).trim() === id ? 'selected' : ''}>${trnEsc(Training.deptMap[id])}</option>`).join('')}</select>`
      : `<input class="dc-in" id="tnDept" value="${ed ? trnEsc(existing.DepartmentID) : ''}" readonly placeholder="ฝ่ายของคุณ (อัตโนมัติ)">`;
    const courseOpts = `<option value="">— พิมพ์เองด้านล่าง —</option>` + (Training._courses || []).map(cc => `<option value="${trnEsc(cc.CourseID)}" ${ed && String(existing.CourseID).trim() === String(cc.CourseID) ? 'selected' : ''}>${trnEsc(cc.CourseCode)} · ${trnEsc(cc.CourseName)}</option>`).join('');
    const sel = (id, list, cur, blank) => `<select class="dc-in" id="${id}">${blank ? `<option value="">${blank}</option>` : ''}${list.map(o => `<option value="${o[0]}" ${String(cur || '').toUpperCase() === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tnBack">← Back</button>
      <div class="dc-card">
        <h1 style="margin:0 0 16px;font-size:20px">${ed ? 'Edit Training Need' : 'New Training Need'} <span class="dc-muted" style="font-size:14px">ประจำปี ${this._year}</span></h1>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="dc-field"><label>ฝ่าย <span class="dc-req">*</span></label>${deptField}</div>
          <div class="dc-field"><label>Priority</label>${sel('tnPriority', TN_PRIORITY, ed ? existing.Priority : 'MEDIUM')}</div>
          <div class="dc-field dc-span2"><label>หลักสูตร (เลือกจากแคตตาล็อก)</label><select class="dc-in" id="tnCourse">${courseOpts}</select></div>
          <div class="dc-field"><label>หรือพิมพ์ชื่อหลักสูตรเอง</label><input class="dc-in" id="tnCourseName" value="${ed && !existing.CourseID ? g('CourseName') : ''}"></div>
          <div class="dc-field"><label>ประเภท (ถ้าพิมพ์เอง)</label>${sel('tnType', TRN_COURSE_TYPES, ed && !existing.CourseID ? existing.TrainingType : '', '—')}</div>
          <div class="dc-field"><label>กลุ่มเป้าหมาย</label><input class="dc-in" id="tnTarget" value="${g('TargetGroup')}"></div>
          <div class="dc-field"><label>จำนวนคน</label><input type="number" min="0" class="dc-in" id="tnHead" value="${g('Headcount')}"></div>
          <div class="dc-field dc-span2"><label>เหตุผล/ความจำเป็น <span class="dc-req">*</span></label><textarea class="dc-in" id="tnReason" rows="2">${g('Reason')}</textarea></div>
        </div>
        <div id="tnErr"></div>
        <div class="dc-bar"><button class="dc-btn dc-ghost" id="tnCancel" type="button">Cancel</button><button class="dc-btn dc-primary" id="tnSave" type="button">${ed ? 'Save changes' : 'Create (DRAFT)'}</button></div>
      </div></div><div class="dc-toast" id="dcToast"></div>`;
    const back = () => ed ? this.openDetail(existing.NeedID) : this.load();
    document.getElementById('tnBack').addEventListener('click', back);
    document.getElementById('tnCancel').addEventListener('click', back);
    document.getElementById('tnSave').addEventListener('click', () => this.submitForm(ed ? existing.NeedID : null));
  },

  async submitForm(needId) {
    const err = document.getElementById('tnErr');
    const v = id => (document.getElementById(id) || {}).value;
    const payload = { token: this.token(), needId: needId || undefined, Year: this._year, DepartmentID: (v('tnDept') || '').trim(), CourseID: v('tnCourse'), CourseName: (v('tnCourseName') || '').trim(), TrainingType: v('tnType'), TargetGroup: (v('tnTarget') || '').trim(), Headcount: v('tnHead'), Priority: v('tnPriority'), Reason: (v('tnReason') || '').trim() };
    if (!payload.DepartmentID) { err.innerHTML = '<div class="dc-err">กรุณาระบุฝ่าย</div>'; return; }
    if (!payload.CourseID && !payload.CourseName) { err.innerHTML = '<div class="dc-err">เลือกหลักสูตร หรือพิมพ์ชื่อหลักสูตร</div>'; return; }
    if (!payload.Reason) { err.innerHTML = '<div class="dc-err">กรุณากรอกเหตุผล/ความจำเป็น</div>'; return; }
    const btn = document.getElementById('tnSave'); btn.disabled = true; btn.textContent = 'Processing…';
    try {
      if (needId) { await API.post('updateTrainingNeed', payload); this.toast('บันทึกแล้ว'); this.openDetail(needId); }
      else { const r = await API.post('createTrainingNeed', payload); this.toast('สร้างแล้ว'); this.openDetail(r.needId); }
    } catch (ex) { btn.disabled = false; btn.textContent = needId ? 'Save changes' : 'Create (DRAFT)'; err.innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'ล้มเหลว')}</div>`; }
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
    if (actions.indexOf('deptApprove') !== -1) b.push(btn('deptApprove', 'อนุมัติ (หัวหน้าฝ่าย)', 'dc-primary'));
    if (actions.indexOf('deptReject') !== -1) b.push(btn('deptReject', 'ตีกลับ', 'dc-danger'));
    if (actions.indexOf('hrInPlan') !== -1) b.push(btn('hrInPlan', 'เข้าแผนปี', 'dc-primary'));
    if (actions.indexOf('hrCancel') !== -1) b.push(btn('hrCancel', 'ไม่เข้าแผน', 'dc-danger'));
    if (actions.indexOf('hrReject') !== -1) b.push(btn('hrReject', 'ตีกลับผู้สร้าง', 'dc-danger'));
    if (actions.indexOf('cancel') !== -1) b.push(btn('cancel', 'ยกเลิก', 'dc-danger'));
    const tl = (history || []).map(h => `<li><span class="dot"></span><div class="act">${trnEsc(h.Action)}</div><div class="meta">${trnEsc(h.ActorName)} · ${trnDate(h.Timestamp)}${h.Comment ? ' · ' + trnEsc(h.Comment) : ''}</div></li>`).join('');
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tnBack">← Back</button>
      <div class="dc-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div><h1 style="margin:0;font-size:20px">${trnEsc(t.CourseName)}</h1><p class="dc-muted" style="margin:4px 0 0">ประจำปี ${trnEsc(t.Year)} · ${trnEsc(this.deptName(t.DepartmentID))}</p></div>
          <div>${tnBadge(t.Status)}</div>
        </div>
        <div class="dc-kv" style="margin-top:14px">
          ${kv('ประเภท', trnEsc(trnLabel(TRN_COURSE_TYPES, t.TrainingType)))}
          ${kv('กลุ่มเป้าหมาย', trnEsc(t.TargetGroup))}
          ${kv('จำนวนคน', trnEsc(t.Headcount))}
          ${kv('Priority', trnEsc(trnLabel(TN_PRIORITY, t.Priority)))}
          ${kv('เหตุผล/ความจำเป็น', trnEsc(t.Reason))}
          ${kv('ผู้สร้าง', trnEsc(t.CreatedByName))}
          ${t.DeptApprovedByName ? kv('หัวหน้าฝ่ายอนุมัติ', trnEsc(t.DeptApprovedByName) + ' · ' + trnDate(t.DeptApprovedDate)) : ''}
          ${t.HrDecisionByName ? kv('HR พิจารณา', trnEsc(t.HrDecisionByName) + ' · ' + trnDate(t.HrDecisionDate)) : ''}
          ${t.DecisionReason ? kv('เหตุผล', trnEsc(t.DecisionReason)) : ''}
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
      else if (a === 'submit') self.run('submitTrainingNeed', { needId: id }, 'ส่งแล้ว', bt);
      else if (a === 'deptApprove') self.run('approveTrainingNeedDept', { needId: id, decision: 'APPROVE' }, 'อนุมัติแล้ว', bt);
      else if (a === 'hrInPlan') self.run('decideTrainingNeed', { needId: id, decision: 'IN_PLAN' }, 'เข้าแผนแล้ว', bt);
      else if (a === 'deptReject') self.commentModal('ตีกลับผู้สร้าง', 'approveTrainingNeedDept', { needId: id, decision: 'REJECT' }, id);
      else if (a === 'hrReject') self.commentModal('ตีกลับผู้สร้าง', 'decideTrainingNeed', { needId: id, decision: 'REJECT' }, id);
      else if (a === 'hrCancel') self.commentModal('ไม่เข้าแผน (ระบุเหตุผล)', 'decideTrainingNeed', { needId: id, decision: 'CANCEL' }, id);
      else if (a === 'cancel') self.commentModal('ยกเลิกรายการ', 'cancelTrainingNeed', { needId: id }, id);
    }));
  },

  async run(action, payload, ok, bt) {
    let prev = ''; if (bt) { prev = bt.textContent; bt.disabled = true; bt.textContent = 'Processing…'; }
    try { await API.post(action, Object.assign({ token: this.token() }, payload)); this.toast(ok); this.openDetail(payload.needId); }
    catch (ex) { const e = document.getElementById('tnActErr'); if (e) e.innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'ล้มเหลว')}</div>`; if (bt) { bt.disabled = false; bt.textContent = prev; } }
  },

  commentModal(title, action, payload, needId) {
    const self = this;
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal"><h3 style="margin:0 0 12px">${title}</h3>
      <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px">เหตุผล <span class="dc-req">*</span></label>
      <textarea class="dc-in" id="tnCmt" rows="3"></textarea><div id="tnCmtErr"></div>
      <div class="dc-bar"><button class="dc-btn dc-ghost" id="tnCmtX" type="button">Cancel</button><button class="dc-btn dc-primary" id="tnCmtOk" type="button">Confirm</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tnCmtX').addEventListener('click', close);
    scrim.querySelector('#tnCmtOk').addEventListener('click', () => {
      const cmt = scrim.querySelector('#tnCmt').value.trim();
      if (!cmt) { scrim.querySelector('#tnCmtErr').innerHTML = '<div class="dc-err">กรุณาใส่เหตุผล</div>'; return; }
      const ok = scrim.querySelector('#tnCmtOk'); ok.disabled = true; ok.textContent = 'Processing…';
      API.post(action, Object.assign({ token: self.token(), comment: cmt }, payload))
        .then(() => { close(); self.toast('ดำเนินการแล้ว'); self.openDetail(needId); })
        .catch(ex => { ok.disabled = false; ok.textContent = 'Confirm'; scrim.querySelector('#tnCmtErr').innerHTML = `<div class="dc-err">${trnEsc((ex && ex.message) || 'ล้มเหลว')}</div>`; });
    });
  }
};

function loadTrainingNeeds() { Training._courses = null; Training.loadCourseOptions().then(() => TrainingNeeds.load()); }
