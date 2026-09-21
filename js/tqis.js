/* TQIS module — Phase 1 (core flow) */
const TQIS_TABS = [['inProgress', 'In Progress'], ['forApproval', 'For Approval'], ['finished', 'TQIS Finished']];
const TQIS_PROBLEM = [['QUALITY', 'Quality (คุณภาพ)'], ['IMPROVEMENT', 'Improvement (ปรับปรุง)'], ['5S', '5S (5ส)'], ['SAFETY', 'Safety (ความปลอดภัย)']];
const TQIS_HAZARD = [['INTERNAL_YOKOTEN', 'Internal YOKOTEN'], ['TDEM_YOKOTEN', 'TDEM YOKOTEN'], ['CRA', 'CRA (Condition Risk Assessment)'], ['FIRE_PREVENTION', 'Fire prevention'], ['INTERNAL_AUDIT', 'Internal audit'], ['DAILY_CHECK', 'Daily check']];
const TQIS_STOP = [['STOP1', 'Stop1: Machine Stop'], ['STOP2', 'Stop2: Heavy objects'], ['STOP3', 'Stop3: Forklift Vehicle'], ['STOP4', 'Stop4: High work'], ['STOP5', 'Stop5: Electrical'], ['STOP6', 'Stop6: Hot objects'], ['OTHER', 'Other']];
const TQIS_RANK = [['A', 'Rank A: Fatal (Death)'], ['B', 'Rank B: Injury / Disability / Absent'], ['C', 'Rank C: Little injury (no absent)'], ['D', 'Rank D: Other']];
const TQIS_STATUS = {
  DRAFT: ['Waiting for Submit', 'dc-b-off'], SUBMITTED: ['Waiting for Dept Approve', 'dc-b-info'],
  DEPT_APPROVED: ['Waiting for Final Approve', 'dc-b-warn'], FINISHED: ['Finished', 'dc-b-ok'], CANCELLED: ['Cancelled', 'dc-b-cancel']
};
function tqEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function tqDate(v) { if (!v) return '—'; try { const d = new Date(v); if (isNaN(d)) return String(v); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); } catch (e) { return String(v); } }
function tqLabel(list, v) { const f = list.find(x => x[0] === String(v).toUpperCase()); return f ? f[1] : (v || '—'); }
function tqBadge(st) { const m = TQIS_STATUS[String(st || '').toUpperCase()] || [st || '—', 'dc-b-off']; return `<span class="dc-badge ${m[1]}">${m[0]}</span>`; }

/* ---- images (Drive-backed, max 4 per kind) ---- */
const TQIS_MAX_IMG = 4, TQIS_IMG_EDGE = 1280, TQIS_IMG_Q = 0.8;
function tqImgIds(csv) { return String(csv || '').split(',').map(s => s.trim()).filter(Boolean); }
function tqImgThumb(id) { return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w400`; }
function tqImgLarge(id) { return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`; }
function tqImgOpen(id) { return `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`; }

/** Shrink a picked photo in the browser before upload — GAS cannot take a 5MB phone photo. */
function tqResize(file, maxEdge, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth, h = img.naturalHeight;
      const s = Math.min(1, maxEdge / Math.max(w, h));
      w = Math.max(1, Math.round(w * s)); h = Math.max(1, Math.round(h * s));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);      // flatten transparency for JPEG
      ctx.drawImage(img, 0, 0, w, h);
      resolve(cv.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('อ่านไฟล์รูปไม่ได้')); };
    img.src = url;
  });
}

/** Full-size viewer with a link out to the real Drive page. */
function tqLightbox(id) {
  const s = document.createElement('div');
  s.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.85);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:20px';
  s.innerHTML = `<img src="${tqImgLarge(id)}" style="max-width:96vw;max-height:82vh;border-radius:8px;background:#fff">
    <div style="display:flex;gap:10px"><a href="${tqImgOpen(id)}" target="_blank" rel="noopener" style="color:#fff;font-size:13px;text-decoration:underline">เปิดใน Drive</a>
    <span style="color:#cbd5e1;font-size:13px">คลิกพื้นที่ว่างเพื่อปิด</span></div>`;
  s.addEventListener('click', e => { if (e.target.tagName !== 'A' && e.target.tagName !== 'IMG') s.remove(); });
  document.body.appendChild(s);
}

const TQIS = {
  _tab: 'inProgress', deptMap: {},
  token() { return AUTH.getToken(); },

  async ensureDepts() {
    if (Object.keys(this.deptMap).length) return;
    try { (await API.get('getDocumentFormContext', { token: this.token() })).departments.forEach(d => { this.deptMap[d.departmentId] = d.name; }); } catch (e) { }
  },
  deptName(id) { return this.deptMap[String(id).trim()] || id; },

  async load(tab) {
    if (tab) this._tab = tab;
    const c = document.getElementById('pageContent');
    if (typeof DocumentsPage !== 'undefined' && DocumentsPage.injectCss) DocumentsPage.injectCss();
    c.innerHTML = `<div class="dc-wrap"><p class="dc-muted" style="padding:8px">Loading…</p></div>`;
    try {
      const [r] = await Promise.all([API.get('getTqisInbox', { token: this.token() }), this.ensureDepts()]);
      this.data = r; this.render();
    } catch (e) { c.innerHTML = `<div class="dc-wrap"><p style="color:#b91c1c;padding:8px">โหลดไม่สำเร็จ: ${tqEsc(e.message || '')}</p></div>`; }
  },

  render() {
    const counts = (this.data && this.data.counts) || {};
    const tabs = TQIS_TABS.map(([id, label]) => `<button class="dc-tab${this._tab === id ? ' on' : ''}" data-tab="${id}">${label}<span class="dc-count">${counts[id] || 0}</span></button>`).join('');
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap">
      <div class="dc-ph" style="margin-bottom:14px">
        <div><h1 style="margin:0">TQIS — Total Quality Improvement &amp; 5S</h1><p class="dc-muted" style="margin:4px 0 0">บันทึกจุดปัญหาจากการตรวจโรงงาน (Manager Patrol)</p></div>
        <button class="dc-btn dc-primary" id="tqNew" type="button">+ New TQIS</button>
      </div>
      <div class="dc-tabs">${tabs}</div>
      <div class="dc-card" id="tqList"></div>
    </div><div class="dc-toast" id="dcToast"></div>`;
    document.getElementById('tqNew').addEventListener('click', () => this.openForm());
    c.querySelectorAll('.dc-tabs [data-tab]').forEach(b => b.addEventListener('click', () => this.load(b.dataset.tab)));
    this.renderList();
  },

  renderList() {
    const box = document.getElementById('tqList');
    const items = ((this.data && this.data.inbox) || {})[this._tab] || [];
    if (!items.length) { box.innerHTML = `<p class="dc-faint" style="padding:6px;color:#9ca3af">Nothing here.</p>`; return; }
    box.innerHTML = `<table class="dc-tbl"><thead><tr><th>TQIS No.</th><th>Problem</th><th>Dept</th><th>Rank</th><th>Status</th><th>Patrol Date</th></tr></thead><tbody>${items.map(t => `
      <tr class="dc-row" data-id="${tqEsc(t.TqisID)}">
        <td><span class="dc-id">${tqEsc(t.TqisNo)}</span></td>
        <td>${tqEsc(tqLabel(TQIS_PROBLEM, t.ProblemType))} <span class="dc-faint">${tqEsc(String(t.ScenePlace || '').slice(0, 30))}</span></td>
        <td>${tqEsc(this.deptName(t.DepartmentID))}</td>
        <td>${tqEsc(t.RiskRank)}</td>
        <td>${tqBadge(t.Status)}</td>
        <td class="dc-faint" style="white-space:nowrap">${t.PatrolDate ? tqDate(t.PatrolDate) : (tqEsc(t.InspectYear) + '-' + String(t.InspectMonth).padStart(2, '0'))}</td>
      </tr>`).join('')}</tbody></table>`;
    box.querySelectorAll('[data-id]').forEach(r => r.addEventListener('click', () => this.openDetail(r.dataset.id)));
  },

  openForm(existing) {
    if (typeof DocumentsPage !== 'undefined') DocumentsPage.injectCss();
    const editing = !!existing;
    const sel = (id, list, cur, ph) => {
      const has = editing && cur;
      const phOpt = `<option value="" disabled ${has ? '' : 'selected'}>${ph || '— เลือก —'}</option>`;
      return `<select class="dc-in" id="${id}">${phOpt}${list.map(o => `<option value="${o[0]}" ${has && String(cur).toUpperCase() === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
    };
    const hasDept = editing && existing.DepartmentID;
    const deptOpts = `<option value="" disabled ${hasDept ? '' : 'selected'}>— เลือกฝ่าย —</option>` +
      Object.keys(this.deptMap).map(id => `<option value="${tqEsc(id)}" ${hasDept && String(existing.DepartmentID).trim() === id ? 'selected' : ''}>${tqEsc(this.deptMap[id])}</option>`).join('');
    const g = (k, d) => editing ? tqEsc(existing[k] || '') : (d || '');
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tqBack">← Back</button>
      <div class="dc-card">
        <h1 style="margin:0 0 4px;font-size:20px">${editing ? 'Edit TQIS' : 'New TQIS'}</h1>
        <p class="dc-muted" style="margin:0 0 16px">${editing ? tqEsc(existing.TqisNo) : 'เลข TQIS จะออกอัตโนมัติจากปี/เดือนที่ตรวจ'}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="dc-field"><label>Problem Type <span class="dc-req">*</span></label>${sel('tqProblem', TQIS_PROBLEM, existing && existing.ProblemType)}</div>
          <div class="dc-field"><label>Department (ฝ่ายที่ต้องแก้) <span class="dc-req">*</span></label><select class="dc-in" id="tqDept">${deptOpts}</select></div>
          <div class="dc-field"><label>Patrol Date (วันที่ตรวจ) <span class="dc-req">*</span></label><input type="date" class="dc-in" id="tqPatrol" value="${editing && existing.PatrolDate ? tqDate(existing.PatrolDate) : ''}" ${editing ? 'readonly' : ''}>${editing ? '' : '<span class="dc-faint" style="font-size:11px">เลขที่ TQIS อ้างอิงเดือน/ปีจากวันนี้</span>'}</div>
          <div class="dc-field"><label>Hazard Source <span class="dc-req">*</span></label>${sel('tqHazard', TQIS_HAZARD, existing && existing.HazardSource)}</div>
          <div class="dc-field"><label>Stop Type <span class="dc-req">*</span></label>${sel('tqStop', TQIS_STOP, existing && existing.StopType)}</div>
          <div class="dc-field"><label>Risk Rank <span class="dc-req">*</span></label>${sel('tqRank', TQIS_RANK, existing && existing.RiskRank)}</div>
          <div class="dc-field"><label>Scene / Place <span class="dc-req">*</span></label><input class="dc-in" id="tqScene" value="${g('ScenePlace')}"></div>
          <div class="dc-field"><label>Machine / Equipment <span class="dc-req">*</span></label><input class="dc-in" id="tqMachine" value="${g('MachineEquip')}"></div>
          <div class="dc-field dc-span2"><label>Description <span class="dc-req">*</span></label><textarea class="dc-in" id="tqDesc" rows="2">${g('Description')}</textarea></div>
          <div class="dc-field dc-span2"><label>Management Advice</label><textarea class="dc-in" id="tqAdvice" rows="2">${g('ManagementAdvice')}</textarea></div>
          <div class="dc-field dc-span2"><label>Temporary Countermeasure <span class="dc-faint">(บังคับตั้งแต่ผู้จัดการอนุมัติ)</span></label><textarea class="dc-in" id="tqTemp" rows="2">${g('TempCountermeasure')}</textarea></div>
          <div class="dc-field dc-span2"><label>Target Date <span class="dc-faint">(บังคับตั้งแต่ผู้จัดการอนุมัติ)</span></label><input type="date" class="dc-in" id="tqTarget" value="${editing && existing.TargetDate ? tqDate(existing.TargetDate) : ''}"></div>
          <div class="dc-field dc-span2"><label>Permanent Countermeasure <span class="dc-faint">(บังคับตั้งแต่ผู้จัดการอนุมัติ)</span></label><textarea class="dc-in" id="tqPerm" rows="2">${g('PermCountermeasure')}</textarea></div>
          <div class="dc-field dc-span2"><label>Finished Date (วันที่ทำเสร็จจริง) <span class="dc-faint">(บังคับตอน Final Approve · ต้องไม่ก่อนวันที่ตรวจ)</span></label><input type="date" class="dc-in" id="tqFinished" value="${editing && existing.FinishedDate ? tqDate(existing.FinishedDate) : ''}"></div>
          <div class="dc-field dc-span2"><label>รูปปัญหา — Before <span class="dc-faint">(สูงสุด ${TQIS_MAX_IMG} รูป · ระบบย่อให้อัตโนมัติ)</span></label>
            <div id="tqStripBEFORE" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px"></div>
            <input type="file" accept="image/*" multiple id="tqFileBEFORE" style="display:none">
            <button type="button" class="dc-btn dc-ghost" id="tqAddBEFORE">+ เลือกรูป Before</button>
            <div id="tqImgErrBEFORE"></div></div>
          <div class="dc-field dc-span2"><label>รูปหลังแก้ไข — After <span class="dc-faint">(สูงสุด ${TQIS_MAX_IMG} รูป)</span></label>
            <div id="tqStripAFTER" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px"></div>
            <input type="file" accept="image/*" multiple id="tqFileAFTER" style="display:none">
            <button type="button" class="dc-btn dc-ghost" id="tqAddAFTER">+ เลือกรูป After</button>
            <div id="tqImgErrAFTER"></div></div>
        </div>
        <div id="tqErr"></div>
        <div class="dc-bar"><button class="dc-btn dc-ghost" id="tqCancel" type="button">Cancel</button><button class="dc-btn dc-primary" id="tqSave" type="button">${editing ? 'Save changes' : 'Create (DRAFT)'}</button></div>
      </div></div>`;
    // Photos live in the form (like the Document module). On an existing record they upload/delete
    // straight away; while creating they queue and go up as soon as the TQIS has an ID.
    this._imgId = editing ? existing.TqisID : null;
    this._existing = { BEFORE: editing ? tqImgIds(existing.BeforeImages) : [], AFTER: editing ? tqImgIds(existing.AfterImages) : [] };
    this._queue = { BEFORE: [], AFTER: [] };
    ['BEFORE', 'AFTER'].forEach(k => this.wireImgField(k));
    // Finished date can never precede the patrol date — keep the picker's lower bound in sync.
    const pIn = document.getElementById('tqPatrol'), fIn = document.getElementById('tqFinished');
    const syncMin = () => { if (fIn) fIn.min = (pIn && pIn.value) || ''; };
    if (pIn) pIn.addEventListener('change', syncMin);
    syncMin();
    const back = () => editing ? this.openDetail(existing.TqisID) : this.load();
    document.getElementById('tqBack').addEventListener('click', back);
    document.getElementById('tqCancel').addEventListener('click', back);
    document.getElementById('tqSave').addEventListener('click', () => this.submitForm(editing ? existing.TqisID : null));
  },

  // --- photos inside the form ---
  imgLabel(kind) { return '+ เลือกรูป ' + (kind === 'AFTER' ? 'After' : 'Before'); },
  imgErr(kind, msg) {
    const e = document.getElementById('tqImgErr' + kind);
    if (e) e.innerHTML = msg ? `<div class="dc-err">${tqEsc(msg)}</div>` : '';
  },

  wireImgField(kind) {
    const self = this;
    const inp = document.getElementById('tqFile' + kind);
    const btn = document.getElementById('tqAdd' + kind);
    if (!inp || !btn) return;
    btn.addEventListener('click', () => inp.click());
    inp.addEventListener('change', async () => {
      const used = self._existing[kind].length + self._queue[kind].length;
      const files = Array.prototype.slice.call(inp.files, 0, Math.max(0, TQIS_MAX_IMG - used));
      inp.value = '';
      if (!files.length) return;
      self.imgErr(kind, '');
      if (!self._imgId) {                      // creating — hold until the record exists
        files.forEach(f => self._queue[kind].push(f));
        self.renderStrip(kind);
        return;
      }
      btn.disabled = true;
      try {
        for (let i = 0; i < files.length; i++) {
          btn.textContent = `กำลังอัปโหลด ${i + 1}/${files.length}…`;
          const base64 = await tqResize(files[i], TQIS_IMG_EDGE, TQIS_IMG_Q);
          const r = await API.post('uploadTqisImage', { token: self.token(), tqisId: self._imgId, kind, base64 });
          if (r && r.images) self._existing[kind] = r.images;
        }
      } catch (ex) { self.imgErr(kind, (ex && ex.message) || 'อัปโหลดไม่สำเร็จ'); }
      btn.disabled = false; btn.textContent = self.imgLabel(kind);
      self.renderStrip(kind);
    });
    this.renderStrip(kind);
  },

  renderStrip(kind) {
    const box = document.getElementById('tqStrip' + kind);
    if (!box) return;
    const ex = this._existing[kind], q = this._queue[kind];
    const tiles = ex.map(id => `<div style="position:relative">
      <img src="${tqImgThumb(id)}" data-view="${tqEsc(id)}" loading="lazy" style="width:110px;height:82px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;cursor:zoom-in;background:#f8fafc">
      <button type="button" data-del="${tqEsc(id)}" title="ลบรูป" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:0;background:#dc2626;color:#fff;cursor:pointer;font-size:13px;line-height:1">×</button></div>`).join('');
    const chips = q.map((f, i) => `<span style="display:inline-flex;align-items:center;gap:6px;background:#f1f5f9;border-radius:6px;padding:4px 8px;font-size:12px">
      ${tqEsc(f.name.length > 20 ? f.name.slice(0, 20) + '…' : f.name)}
      <button type="button" data-q="${i}" style="border:0;background:none;color:#b91c1c;cursor:pointer;font-size:14px;line-height:1">×</button></span>`).join('');
    box.innerHTML = (tiles + chips) || `<span class="dc-faint" style="font-size:12px;color:#9ca3af">ยังไม่มีรูป</span>`;
    const btn = document.getElementById('tqAdd' + kind);
    if (btn) btn.disabled = (ex.length + q.length) >= TQIS_MAX_IMG;
    box.querySelectorAll('[data-view]').forEach(im => im.addEventListener('click', () => tqLightbox(im.dataset.view)));
    box.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
      this._queue[kind].splice(parseInt(b.dataset.q, 10), 1); this.renderStrip(kind);
    }));
    box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('ลบรูปนี้? ไฟล์จะถูกลบออกจาก Drive ด้วย')) return;
      b.disabled = true; this.imgErr(kind, '');
      try {
        const r = await API.post('deleteTqisImage', { token: this.token(), tqisId: this._imgId, kind, fileId: b.dataset.del });
        this._existing[kind] = (r && r.images) || [];
      } catch (ex) { this.imgErr(kind, (ex && ex.message) || 'ลบรูปไม่สำเร็จ'); }
      this.renderStrip(kind);
    }));
  },

  /** Resize + upload every queued image one at a time (never in parallel — GAS is slow). */
  async flushQueue(tqisId, btn) {
    const kinds = ['BEFORE', 'AFTER'];
    const total = kinds.reduce((n, k) => n + this._queue[k].length, 0);
    if (!total) return;
    let done = 0;
    for (const kind of kinds) {
      for (const file of this._queue[kind]) {
        done++;
        if (btn) btn.textContent = `กำลังอัปโหลดรูป ${done}/${total}…`;
        const base64 = await tqResize(file, TQIS_IMG_EDGE, TQIS_IMG_Q);
        await API.post('uploadTqisImage', { token: this.token(), tqisId, kind, base64 });
      }
    }
    this._queue = { BEFORE: [], AFTER: [] };
  },

  async submitForm(tqisId) {
    const err = document.getElementById('tqErr');
    const btn = document.getElementById('tqSave'); btn.disabled = true; btn.textContent = 'Processing…';
    const restore = () => { btn.disabled = false; btn.textContent = tqisId ? 'Save changes' : 'Create (DRAFT)'; };
    const v = id => (document.getElementById(id) || {}).value;
    const payload = {
      token: this.token(), tqisId: tqisId || undefined,
      ProblemType: v('tqProblem'), DepartmentID: v('tqDept'), PatrolDate: v('tqPatrol'),
      HazardSource: v('tqHazard'), StopType: v('tqStop'), RiskRank: v('tqRank'), TargetDate: v('tqTarget'), FinishedDate: v('tqFinished'),
      ScenePlace: v('tqScene').trim(), MachineEquip: v('tqMachine').trim(), Description: v('tqDesc').trim(),
      ManagementAdvice: v('tqAdvice').trim(), TempCountermeasure: v('tqTemp').trim(), PermCountermeasure: v('tqPerm').trim()
    };
    // On create, everything marked * must be actively chosen (selects start blank, date has no default).
    if (!tqisId) {
      const miss = [];
      if (!payload.ProblemType) miss.push('Problem Type');
      if (!payload.DepartmentID) miss.push('Department');
      if (!payload.PatrolDate) miss.push('Patrol Date');
      if (!payload.HazardSource) miss.push('Hazard Source');
      if (!payload.StopType) miss.push('Stop Type');
      if (!payload.RiskRank) miss.push('Risk Rank');
      if (miss.length) { restore(); err.innerHTML = `<div class="dc-err">กรุณาเลือก: ${miss.join(', ')}</div>`; return; }
    }
    if (!payload.ScenePlace || !payload.MachineEquip || !payload.Description) { restore(); err.innerHTML = '<div class="dc-err">กรุณากรอก Scene / Machine / Description</div>'; return; }
    try {
      let id = tqisId, no = '';
      if (tqisId) { await API.post('updateTqis', payload); }
      else { const r = await API.post('createTqis', payload); id = r.tqisId; no = r.tqisNo; }
      // The record exists now. An image failure must NOT throw us back to the form — re-submitting
      // would create a second TQIS. Report it and go to the detail page, where photos can be retried.
      let warn = '';
      try { await this.flushQueue(id, btn); }
      catch (ie) { warn = ' · อัปโหลดรูปไม่ครบ: ' + ((ie && ie.message) || 'ล้มเหลว'); }
      this.toast((tqisId ? 'บันทึกแล้ว' : 'สร้าง TQIS แล้ว: ' + no) + warn);
      this.openDetail(id);
    } catch (ex) { restore(); err.innerHTML = `<div class="dc-err">${tqEsc((ex && ex.message) || 'ล้มเหลว')}</div>`; }
  },

  async openDetail(tqisId) {
    if (typeof DocumentsPage !== 'undefined') DocumentsPage.injectCss();
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tqBack">← Back</button><div class="dc-card"><p class="dc-muted">Loading…</p></div></div>`;
    document.getElementById('tqBack').addEventListener('click', () => this.load());
    try { await this.ensureDepts(); const r = await API.get('getTqis', { token: this.token(), tqisId }); this.renderDetail(r.tqis, r.actions || [], r.history || []); }
    catch (e) { c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tqB2">← Back</button><div class="dc-card"><div class="dc-err">${tqEsc(e.message || '')}</div></div></div>`; const b = document.getElementById('tqB2'); if (b) b.addEventListener('click', () => this.load()); }
  },

  renderDetail(t, actions, history) {
    const kv = (k, v) => `<div class="k">${k}</div><div>${v || '—'}</div>`;
    const btn = (a, l, cls) => `<button class="dc-btn ${cls}" data-act="${a}" type="button">${l}</button>`;
    const b = [];
    if (actions.indexOf('edit') !== -1) b.push(btn('edit', 'Edit', 'dc-ghost'));
    if (actions.indexOf('submit') !== -1) b.push(btn('submit', 'Submit for approval', 'dc-primary'));
    if (actions.indexOf('deptApprove') !== -1) b.push(btn('deptApprove', 'Approve (Dept)', 'dc-primary'));
    if (actions.indexOf('deptReject') !== -1) b.push(btn('deptReject', 'Reject', 'dc-danger'));
    if (actions.indexOf('finalApprove') !== -1) b.push(btn('finalApprove', 'Final Approve (Finish)', 'dc-primary'));
    if (actions.indexOf('finalReject') !== -1) b.push(btn('finalReject', 'Reject to Dept', 'dc-danger'));
    if (actions.indexOf('cancel') !== -1) b.push(btn('cancel', 'Cancel', 'dc-danger'));
    const tl = (history || []).map(h => `<li><span class="dot"></span><div class="act">${tqEsc(h.Action)}</div><div class="meta">${tqEsc(h.ActorName)} · ${tqDate(h.Timestamp)}${h.Comment ? ' · ' + tqEsc(h.Comment) : ''}</div></li>`).join('');
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><button class="dc-back" id="tqBack">← Back</button>
      <div class="dc-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div><h1 style="margin:0;font-size:20px">${tqEsc(t.TqisNo)}</h1><p class="dc-muted" style="margin:4px 0 0">${tqEsc(tqLabel(TQIS_PROBLEM, t.ProblemType))} · ${tqEsc(this.deptName(t.DepartmentID))}</p></div>
          <div style="display:flex;align-items:center;gap:10px">${tqBadge(t.Status)}
            <button class="dc-btn dc-ghost" id="tqPrintOne" type="button" style="padding:4px 12px;font-size:12px">🖨 พิมพ์ / PDF</button></div>
        </div>
        <div class="dc-kv" style="margin-top:14px">
          ${kv('Hazard Source', tqEsc(tqLabel(TQIS_HAZARD, t.HazardSource)))}
          ${kv('Scene / Place', tqEsc(t.ScenePlace))}
          ${kv('Machine / Equipment', tqEsc(t.MachineEquip))}
          ${kv('Stop Type', tqEsc(tqLabel(TQIS_STOP, t.StopType)))}
          ${kv('Risk Rank', tqEsc(tqLabel(TQIS_RANK, t.RiskRank)))}
          ${kv('Patrol Date', t.PatrolDate ? tqDate(t.PatrolDate) : (tqEsc(t.InspectYear) + '-' + String(t.InspectMonth).padStart(2, '0')))}
          ${kv('Target Date', tqDate(t.TargetDate))}
          ${t.FinishedDate ? kv('Finished Date (ทำเสร็จจริง)', tqDate(t.FinishedDate)) : ''}
          ${kv('Description', tqEsc(t.Description))}
          ${kv('Management Advice', tqEsc(t.ManagementAdvice))}
          ${kv('Temporary Countermeasure', tqEsc(t.TempCountermeasure))}
          ${kv('Permanent Countermeasure', tqEsc(t.PermCountermeasure))}
          ${kv('Created by', tqEsc(t.CreatedByName))}
          ${t.DeptApprovedByName ? kv('Dept approved by', tqEsc(t.DeptApprovedByName) + ' · ' + tqDate(t.DeptApprovedDate)) : ''}
          ${t.FinalApprovedByName ? kv('Final approved by', tqEsc(t.FinalApprovedByName) + ' · ' + tqDate(t.FinalApprovedDate)) : ''}
        </div>
      </div>
      ${this.galleryHtml(t)}
      ${b.length ? `<div class="dc-card"><h2 style="margin:0 0 12px;font-size:15px">Actions</h2><div class="dc-actbar">${b.join('')}</div><div id="tqActErr"></div></div>` : ''}
      <div class="dc-card"><h2 style="margin:0 0 12px;font-size:15px">History</h2><ul class="dc-tl">${tl || '<li><span class="dot"></span><div class="meta">No history</div></li>'}</ul></div>
    </div><div class="dc-toast" id="dcToast"></div>`;
    document.getElementById('tqBack').addEventListener('click', () => this.load());
    this._current = t;
    this.wireActions(t);
    this.wireGallery();
  },

  /** Read-only viewer: Before down the left, After down the right. Uploading happens in the form. */
  galleryHtml(t) {
    const col = (title, csv) => {
      const ids = tqImgIds(csv);
      const shots = ids.map(id => `<img src="${tqImgThumb(id)}" data-view="${tqEsc(id)}" loading="lazy"
        style="width:100%;max-width:340px;aspect-ratio:4/3;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;cursor:zoom-in;background:#f8fafc">`).join('');
      return `<div>
        <h3 style="margin:0 0 10px;font-size:13.5px">${title}
          <span class="dc-faint" style="font-size:12px;color:#9ca3af;font-weight:400">${ids.length}/${TQIS_MAX_IMG}</span></h3>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${shots || `<span class="dc-faint" style="font-size:12px;color:#9ca3af">ไม่มีรูป</span>`}
        </div></div>`;
    };
    return `<div class="dc-card"><h2 style="margin:0 0 12px;font-size:15px">รูปประกอบ</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px">
        ${col('Before — รูปปัญหา', t.BeforeImages)}
        ${col('After — รูปหลังแก้ไข', t.AfterImages)}
      </div></div>`;
  },

  wireGallery() {
    document.querySelectorAll('#pageContent [data-view]').forEach(im =>
      im.addEventListener('click', () => tqLightbox(im.dataset.view)));
    const p = document.getElementById('tqPrintOne');
    if (p) p.addEventListener('click', () => this.printOne(this._current));
  },

  /** One TQIS as an A4 form: details, Before/After photos, and the three signature blocks. */
  printOne(t) {
    if (!t) return;
    const row = (k, v) => `<tr><th style="width:150px">${k}</th><td>${v || '—'}</td></tr>`;
    const shots = csv => {
      const ids = tqImgIds(csv);
      return ids.length
        ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">${ids.map(id => `<img src="${tqImgLarge(id)}" style="width:100%;height:110px;object-fit:cover">`).join('')}</div>`
        : '<div class="muted">ไม่มีรูป</div>';
    };
    const sig = (title, name, date) => `<div><div class="t">${title}</div>
      <div style="border-top:1px solid #c3c2b7;padding-top:4px">${tqEsc(name || '')}<br><span class="muted">${date ? tqDate(date) : ''}</span></div></div>`;

    tqPrint('TQIS ' + (t.TqisNo || ''), 'size: A4; margin: 12mm;', `
      <div class="hd"><div><h1>TQIS — Total Quality Improvement &amp; 5S</h1>
        <div class="muted">Manager Patrol Record</div></div>
        <div style="text-align:right"><div style="font-size:15px;font-weight:700">${tqEsc(t.TqisNo)}</div>
        <div class="muted">${tqEsc((TQIS_STATUS[String(t.Status).toUpperCase()] || [t.Status])[0])}</div></div></div>
      <table>
        ${row('Patrol Date (วันที่ตรวจ)', tqDate(t.PatrolDate))}
        ${row('Problem Type', tqEsc(tqLabel(TQIS_PROBLEM, t.ProblemType)))}
        ${row('ฝ่ายที่รับผิดชอบ', tqEsc(this.deptName(t.DepartmentID)))}
        ${row('Hazard Source', tqEsc(tqLabel(TQIS_HAZARD, t.HazardSource)))}
        ${row('Scene / Place', tqEsc(t.ScenePlace))}
        ${row('Machine / Equipment', tqEsc(t.MachineEquip))}
        ${row('Stop Type', tqEsc(tqLabel(TQIS_STOP, t.StopType)))}
        ${row('Risk Rank', tqEsc(tqLabel(TQIS_RANK, t.RiskRank)))}
        ${row('Description', tqEsc(t.Description))}
        ${row('Management Advice', tqEsc(t.ManagementAdvice))}
        ${row('Temporary Countermeasure', tqEsc(t.TempCountermeasure))}
        ${row('Permanent Countermeasure', tqEsc(t.PermCountermeasure))}
        ${row('Target Date', tqDate(t.TargetDate))}
        ${row('Finished Date (ทำเสร็จจริง)', tqDate(t.FinishedDate))}
      </table>
      <h2>รูปประกอบ</h2>
      <table><thead><tr><th style="width:50%">Before — รูปปัญหา</th><th>After — รูปหลังแก้ไข</th></tr></thead>
        <tbody><tr><td>${shots(t.BeforeImages)}</td><td>${shots(t.AfterImages)}</td></tr></tbody></table>
      <div class="sig">
        ${sig('ผู้บันทึก / ผู้ตรวจ', t.CreatedByName, t.CreatedDate)}
        ${sig('หัวหน้าฝ่าย', t.DeptApprovedByName, t.DeptApprovedDate)}
        ${sig('ผู้อนุมัติปิดงาน', t.FinalApprovedByName, t.FinalApprovedDate)}
      </div>`);
  },

  wireActions(t) {
    const id = t.TqisID; const self = this;
    document.querySelectorAll('#pageContent [data-act]').forEach(bt => bt.addEventListener('click', () => {
      const a = bt.dataset.act;
      if (a === 'edit') self.openForm(t);
      else if (a === 'submit') self.run('submitTqis', { tqisId: id }, 'ส่งอนุมัติแล้ว', bt);
      else if (a === 'deptApprove') self.run('approveTqisDept', { tqisId: id, decision: 'APPROVE' }, 'อนุมัติ (ฝ่าย) แล้ว', bt);
      else if (a === 'finalApprove') self.finishModal(t);
      else if (a === 'deptReject') self.commentModal('Reject to creator', 'approveTqisDept', { tqisId: id, decision: 'REJECT' }, id);
      else if (a === 'finalReject') self.commentModal('Reject to department', 'approveTqisFinal', { tqisId: id, decision: 'REJECT' }, id);
      else if (a === 'cancel') self.commentModal('Cancel TQIS', 'cancelTqis', { tqisId: id }, id);
    }));
  },

  async run(action, payload, okMsg, bt) {
    let prev = ''; if (bt) { prev = bt.textContent; bt.disabled = true; bt.textContent = 'Processing…'; }
    try { await API.post(action, Object.assign({ token: this.token() }, payload)); this.toast(okMsg); this.openDetail(payload.tqisId); }
    catch (ex) { const e = document.getElementById('tqActErr'); if (e) e.innerHTML = `<div class="dc-err">${tqEsc((ex && ex.message) || 'ล้มเหลว')}</div>`; if (bt) { bt.disabled = false; bt.textContent = prev; } }
  },

  commentModal(title, action, payload, tqisId) {
    const self = this;
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal"><h3 style="margin:0 0 12px">${title}</h3>
      <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px">เหตุผล <span class="dc-req">*</span></label>
      <textarea class="dc-in" id="tqCmt" rows="3"></textarea><div id="tqCmtErr"></div>
      <div class="dc-bar"><button class="dc-btn dc-ghost" id="tqCmtX" type="button">Cancel</button><button class="dc-btn dc-primary" id="tqCmtOk" type="button">Confirm</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    scrim.querySelector('#tqCmtX').addEventListener('click', close);
    scrim.querySelector('#tqCmtOk').addEventListener('click', () => {
      const cmt = scrim.querySelector('#tqCmt').value.trim();
      if (!cmt) { scrim.querySelector('#tqCmtErr').innerHTML = '<div class="dc-err">กรุณาใส่เหตุผล</div>'; return; }
      const ok = scrim.querySelector('#tqCmtOk'); ok.disabled = true; ok.textContent = 'Processing…';
      API.post(action, Object.assign({ token: self.token(), comment: cmt }, payload))
        .then(() => { close(); self.toast('ดำเนินการแล้ว'); self.openDetail(tqisId); })
        .catch(ex => { ok.disabled = false; ok.textContent = 'Confirm'; scrim.querySelector('#tqCmtErr').innerHTML = `<div class="dc-err">${tqEsc((ex && ex.message) || 'ล้มเหลว')}</div>`; });
    });
  },

  // Final approve = close the TQIS. Requires a real Finished Date within [Patrol Date, today].
  finishModal(t) {
    const self = this;
    const patrol = t.PatrolDate ? tqDate(t.PatrolDate) : '';
    const today = tqDate(new Date());
    const scrim = document.createElement('div'); scrim.className = 'dc-scrim';
    scrim.innerHTML = `<div class="dc-modal"><h3 style="margin:0 0 12px">Final Approve — ปิดงาน TQIS</h3>
      <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px">Finished Date (วันที่ทำเสร็จจริง) <span class="dc-req">*</span></label>
      <input type="date" class="dc-in" id="tqFin" min="${patrol}" max="${today}" value="${t.FinishedDate ? tqDate(t.FinishedDate) : ''}">
      ${patrol ? `<span class="dc-faint" style="font-size:11px">ต้องอยู่ระหว่างวันที่ตรวจ (${patrol}) ถึงวันนี้ (${today})</span>` : ''}
      <label style="font-size:12.5px;font-weight:600;display:block;margin:12px 0 4px">หมายเหตุ (ถ้ามี)</label>
      <textarea class="dc-in" id="tqFinCmt" rows="2"></textarea><div id="tqFinErr"></div>
      <div class="dc-bar"><button class="dc-btn dc-ghost" id="tqFinX" type="button">Cancel</button><button class="dc-btn dc-primary" id="tqFinOk" type="button">Confirm Finish</button></div></div>`;
    document.body.appendChild(scrim);
    const close = () => scrim.remove();
    const showErr = m => { scrim.querySelector('#tqFinErr').innerHTML = `<div class="dc-err">${tqEsc(m)}</div>`; };
    scrim.querySelector('#tqFinX').addEventListener('click', close);
    scrim.querySelector('#tqFinOk').addEventListener('click', () => {
      const fin = scrim.querySelector('#tqFin').value;
      if (!fin) { showErr('กรุณาระบุวันที่ทำเสร็จ'); return; }
      if (patrol && fin < patrol) { showErr('วันที่ทำเสร็จต้องไม่ก่อนวันที่ตรวจ'); return; }
      if (fin > today) { showErr('วันที่ทำเสร็จต้องไม่เกินวันนี้'); return; }
      const cmt = scrim.querySelector('#tqFinCmt').value.trim();
      const ok = scrim.querySelector('#tqFinOk'); ok.disabled = true; ok.textContent = 'Processing…';
      API.post('approveTqisFinal', { token: self.token(), tqisId: t.TqisID, decision: 'APPROVE', FinishedDate: fin, comment: cmt })
        .then(() => { close(); self.toast('ปิดงานแล้ว'); self.openDetail(t.TqisID); })
        .catch(ex => { ok.disabled = false; ok.textContent = 'Confirm Finish'; showErr((ex && ex.message) || 'ล้มเหลว'); });
    });
  },

  toast(msg) { const t = document.getElementById('dcToast'); if (!t) { alert(msg); return; } t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); }
};

function loadTqis() { TQIS.load(); }

/* ==================== shared: chart tokens, print, csv ==================== */
// Categorical pair validated for CVD + contrast on a white surface; rank colours are the
// reserved status palette (always shown beside their label, never colour alone).
const TQIS_VIZ = {
  s1: '#2a78d6', s2: '#eb6834',
  rank: { A: '#d03b3b', B: '#ec835a', C: '#fab219', D: '#0ca30c' }
};

function tqVizCss() {
  if (document.getElementById('tqVizCss')) return;
  const s = document.createElement('style'); s.id = 'tqVizCss';
  s.textContent = `
    .tq-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:12px;margin-bottom:16px}
    .tq-tile{background:#fff;border:1px solid rgba(11,11,11,.10);border-radius:10px;padding:13px 15px}
    .tq-tile .lab{font-size:12px;color:#52514e;margin-bottom:6px}
    .tq-tile .val{font-size:25px;font-weight:650;color:#0b0b0b;line-height:1.1}
    .tq-tile .sub{font-size:11px;color:#898781;margin-top:4px}
    .tq-tile.alert{border-color:rgba(208,59,59,.35);background:#fff7f7}
    .tq-tile.alert .val{color:#d03b3b}
    .tq-g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:16px}
    .tq-bar{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .tq-bar .lab{width:145px;flex:none;font-size:12px;color:#52514e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .tq-bar .track{flex:1;height:14px;background:#f3f4f6;border-radius:4px;overflow:hidden}
    .tq-bar .fill{display:block;height:100%;border-radius:4px}
    .tq-bar .val{width:36px;flex:none;text-align:right;font-size:12px;color:#0b0b0b;font-variant-numeric:tabular-nums}
    .tq-cols{display:flex;align-items:flex-end;gap:12px;height:148px;padding-top:8px;border-bottom:1px solid #e1e0d9}
    .tq-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end}
    .tq-col .pair{display:flex;align-items:flex-end;gap:2px;height:100%;width:100%;justify-content:center}
    .tq-col .pair i{display:block;width:15px;border-radius:4px 4px 0 0;min-height:2px}
    .tq-col .lab{font-size:11px;color:#898781;white-space:nowrap}
    .tq-lg{display:flex;gap:16px;font-size:12px;color:#52514e;margin-bottom:10px}
    .tq-lg span{display:inline-flex;align-items:center;gap:6px}
    .tq-lg i{width:10px;height:10px;border-radius:3px;display:inline-block}
    .tq-rt{width:100%;border-collapse:collapse;font-size:12px}
    .tq-rt th,.tq-rt td{border:1px solid #e1e0d9;padding:5px 7px;vertical-align:top;text-align:left}
    .tq-rt th{background:#f6f6f4;font-weight:600;white-space:nowrap}
    .tq-rt td.num{text-align:right;font-variant-numeric:tabular-nums}
  `;
  document.head.appendChild(s);
}

/** Horizontal bars: one hue for a single series; per-bar colour only when it carries meaning. */
function tqBars(items, color) {
  const max = Math.max(1, ...items.map(i => i.v));
  return items.map(i => `<div class="tq-bar">
    <span class="lab" title="${tqEsc(i.k)}">${tqEsc(i.k)}</span>
    <span class="track"><span class="fill" style="width:${Math.round(i.v / max * 100)}%;background:${i.c || color}" title="${tqEsc(i.k)}: ${i.v}"></span></span>
    <span class="val">${i.v}</span></div>`).join('');
}

/** Open a print-ready window; wait for photos so nothing prints half-loaded. */
function tqPrint(title, pageRule, bodyHtml) {
  const w = window.open('', '_blank');
  if (!w) { alert('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ — กรุณาอนุญาต popup แล้วลองใหม่'); return; }
  w.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${tqEsc(title)}</title><style>
    @page{${pageRule}}
    *{box-sizing:border-box}
    body{font-family:system-ui,-apple-system,"Segoe UI",Sarabun,Tahoma,sans-serif;color:#0b0b0b;margin:0;font-size:11px;line-height:1.45}
    h1{font-size:16px;margin:0 0 2px}h2{font-size:12.5px;margin:14px 0 6px}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #c3c2b7;padding:4px 6px;vertical-align:top;text-align:left}
    th{background:#f0efec;font-weight:600}
    .muted{color:#52514e}.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0b0b0b;padding-bottom:6px;margin-bottom:10px}
    .sig{display:flex;gap:10px;margin-top:18px}
    .sig div{flex:1;border:1px solid #c3c2b7;padding:8px;min-height:72px}
    .sig .t{font-size:10px;color:#52514e;margin-bottom:26px}
    img{max-width:100%;border:1px solid #c3c2b7;border-radius:3px}
    tr,img,.sig{break-inside:avoid;page-break-inside:avoid}
  </style></head><body>${bodyHtml}<script>
  (function(){var i=Array.prototype.slice.call(document.images),n=i.length;
  function go(){setTimeout(function(){window.focus();window.print();},350);}
  if(!n)return go();function d(){if(--n<=0)go();}
  i.forEach(function(m){if(m.complete)d();else{m.onload=d;m.onerror=d;}});})();
  <\/script></body></html>`);
  w.document.close();
}

/** CSV with a BOM so Excel opens Thai correctly. */
function tqCsv(filename, header, rows) {
  const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const body = [header.map(esc).join(',')].concat(rows.map(r => r.map(esc).join(','))).join('\r\n');
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ============================== Dashboard ============================== */
const TQISDash = {
  async load() {
    tqVizCss();
    if (typeof DocumentsPage !== 'undefined' && DocumentsPage.injectCss) DocumentsPage.injectCss();
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><p class="dc-muted" style="padding:8px">Loading…</p></div>`;
    try {
      const [d] = await Promise.all([API.get('getTqisDashboard', { token: AUTH.getToken() }), TQIS.ensureDepts()]);
      this.render(d);
    } catch (e) {
      c.innerHTML = `<div class="dc-wrap"><p style="color:#b91c1c;padding:8px">โหลดไม่สำเร็จ: ${tqEsc(e.message || '')}</p></div>`;
    }
  },

  render(d) {
    const k = d.counts || {};
    const tile = (lab, val, sub, alert) => `<div class="tq-tile${alert ? ' alert' : ''}">
      <div class="lab">${lab}</div><div class="val">${val}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;

    const rankItems = ['A', 'B', 'C', 'D'].map(r => ({
      k: tqLabel(TQIS_RANK, r), v: (d.byRank || {})[r] || 0, c: TQIS_VIZ.rank[r]
    }));
    const probItems = TQIS_PROBLEM.map(p => ({ k: p[1], v: (d.byProblem || {})[p[0]] || 0 }));
    const deptItems = (d.byDept || []).map(x => ({ k: TQIS.deptName(x.departmentId), v: x.count }));

    const t = d.trend || [];
    const tmax = Math.max(1, ...t.map(x => Math.max(x.opened, x.finished)));
    const trendHtml = `<div class="tq-lg">
        <span><i style="background:${TQIS_VIZ.s1}"></i>เปิดใหม่ (ตามวันตรวจ)</span>
        <span><i style="background:${TQIS_VIZ.s2}"></i>ปิดงานได้</span></div>
      <div class="tq-cols">${t.map(x => `<div class="tq-col"><div class="pair">
        <i style="height:${Math.round(x.opened / tmax * 100)}%;background:${TQIS_VIZ.s1}" title="${x.ym} · เปิดใหม่ ${x.opened}"></i>
        <i style="height:${Math.round(x.finished / tmax * 100)}%;background:${TQIS_VIZ.s2}" title="${x.ym} · ปิดได้ ${x.finished}"></i>
      </div><span class="lab">${tqEsc(x.ym.slice(2))}</span></div>`).join('')}</div>`;

    const recent = (d.recent || []).map(r => `<tr class="dc-row" data-id="${tqEsc(r.TqisID)}">
        <td><span class="dc-id">${tqEsc(r.TqisNo)}</span></td>
        <td>${tqEsc(tqLabel(TQIS_PROBLEM, r.ProblemType))} <span class="dc-faint">${tqEsc(String(r.ScenePlace || '').slice(0, 26))}</span></td>
        <td>${tqEsc(TQIS.deptName(r.DepartmentID))}</td>
        <td>${tqEsc(r.RiskRank)}</td>
        <td>${tqBadge(r.Status)}</td>
        <td class="dc-faint" style="white-space:nowrap">${tqDate(r.PatrolDate)}</td></tr>`).join('');

    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap">
      <div class="dc-ph" style="margin-bottom:14px">
        <div><h1 style="margin:0">TQIS Dashboard</h1>
        <p class="dc-muted" style="margin:4px 0 0">ภาพรวมกิจกรรม Manager Patrol ตามสิทธิ์การมองเห็นของคุณ</p></div>
      </div>

      <div class="tq-tiles">
        ${tile('รอ Submit', k.draft || 0)}
        ${tile('รออนุมัติฝ่าย', k.submitted || 0)}
        ${tile('รออนุมัติสุดท้าย', k.deptApproved || 0)}
        ${tile('ปิดงานเดือนนี้', k.finishedThisMonth || 0, 'ทั้งหมด ' + (k.finished || 0) + ' รายการ')}
        ${tile('เกินกำหนด', k.overdue || 0, 'เลย Target Date และยังไม่ปิด', true)}
        ${tile('เฉลี่ยวันที่ใช้แก้', d.avgDaysToClose == null ? '—' : d.avgDaysToClose, d.closedSample ? 'จาก ' + d.closedSample + ' รายการที่ปิดแล้ว' : 'ยังไม่มีข้อมูล')}
      </div>

      <div class="tq-g2">
        <div class="dc-card"><h2 style="margin:0 0 12px;font-size:15px">แยกตามระดับความเสี่ยง</h2>${tqBars(rankItems)}</div>
        <div class="dc-card"><h2 style="margin:0 0 12px;font-size:15px">แยกตามประเภทปัญหา</h2>${tqBars(probItems, TQIS_VIZ.s1)}</div>
        <div class="dc-card"><h2 style="margin:0 0 12px;font-size:15px">งานค้างแยกตามฝ่าย</h2>
          ${deptItems.length ? tqBars(deptItems, TQIS_VIZ.s1) : '<p class="dc-faint" style="color:#9ca3af;font-size:12px">ไม่มีงานค้าง</p>'}</div>
        <div class="dc-card"><h2 style="margin:0 0 12px;font-size:15px">แนวโน้ม 6 เดือน</h2>${trendHtml}</div>
      </div>

      <div class="dc-card" style="margin-top:16px"><h2 style="margin:0 0 12px;font-size:15px">รายการล่าสุด</h2>
        ${recent ? `<table class="dc-tbl"><thead><tr><th>TQIS No.</th><th>Problem</th><th>Dept</th><th>Rank</th><th>Status</th><th>Patrol Date</th></tr></thead><tbody>${recent}</tbody></table>`
        : '<p class="dc-faint" style="color:#9ca3af;font-size:12px">ยังไม่มีรายการ</p>'}</div>
    </div>`;
    c.querySelectorAll('[data-id]').forEach(r => r.addEventListener('click', () => TQIS.openDetail(r.dataset.id)));
  }
};
function loadTqisDashboard() { TQISDash.load(); }

/* =============================== Reports =============================== */
const TQIS_REPORTS = [['SUMMARY', 'TQIS Summary'], ['MANAGER_PATROL', 'Manager Patrol Form'], ['PERFORMANCE', 'Performance by Department'], ['SAFETY', 'Safety & Risk']];

const TQISReport = {
  _res: null, _meta: null,

  async load() {
    tqVizCss();
    if (typeof DocumentsPage !== 'undefined' && DocumentsPage.injectCss) DocumentsPage.injectCss();
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="dc-wrap"><p class="dc-muted" style="padding:8px">Loading…</p></div>`;
    await TQIS.ensureDepts();
    const deptOpts = Object.keys(TQIS.deptMap).map(id => `<option value="${tqEsc(id)}">${tqEsc(TQIS.deptMap[id])}</option>`).join('');
    c.innerHTML = `<div class="dc-wrap">
      <div class="dc-ph" style="margin-bottom:14px"><div><h1 style="margin:0">TQIS Reports</h1>
        <p class="dc-muted" style="margin:4px 0 0">เลือกประเภทรายงานและช่วงวันที่ตรวจ</p></div></div>
      <div class="dc-card">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px">
          <div class="dc-field"><label>Report Type <span class="dc-req">*</span></label>
            <select class="dc-in" id="rpType"><option value="" disabled selected>— เลือกรายงาน —</option>
            ${TQIS_REPORTS.map(r => `<option value="${r[0]}">${r[1]}</option>`).join('')}</select></div>
          <div class="dc-field"><label>Patrol Date — ตั้งแต่</label><input type="date" class="dc-in" id="rpFrom"></div>
          <div class="dc-field"><label>ถึง</label><input type="date" class="dc-in" id="rpTo"></div>
          <div class="dc-field"><label>ฝ่าย</label><select class="dc-in" id="rpDept"><option value="">ทั้งหมด</option>${deptOpts}</select></div>
          <div class="dc-field"><label>สถานะ</label><select class="dc-in" id="rpStatus"><option value="">ทั้งหมด</option>
            ${Object.keys(TQIS_STATUS).filter(s => s !== 'CANCELLED').map(s => `<option value="${s}">${TQIS_STATUS[s][0]}</option>`).join('')}</select></div>
          <div class="dc-field"><label>ประเภทปัญหา</label><select class="dc-in" id="rpProblem"><option value="">ทั้งหมด</option>
            ${TQIS_PROBLEM.map(p => `<option value="${p[0]}">${p[1]}</option>`).join('')}</select></div>
          <div class="dc-field"><label>Risk Rank</label><select class="dc-in" id="rpRank"><option value="">ทั้งหมด</option>
            ${TQIS_RANK.map(r => `<option value="${r[0]}">${r[1]}</option>`).join('')}</select></div>
        </div>
        <div id="rpErr"></div>
        <div class="dc-bar"><button class="dc-btn dc-primary" id="rpRun" type="button">แสดงรายงาน</button></div>
      </div>
      <div id="rpOut"></div></div>`;
    document.getElementById('rpRun').addEventListener('click', () => this.run());
  },

  async run() {
    const v = id => (document.getElementById(id) || {}).value || '';
    const err = document.getElementById('rpErr');
    const type = v('rpType');
    if (!type) { err.innerHTML = '<div class="dc-err">กรุณาเลือกประเภทรายงาน</div>'; return; }
    err.innerHTML = '';
    const btn = document.getElementById('rpRun'); btn.disabled = true; btn.textContent = 'กำลังประมวลผล…';
    const params = {
      token: AUTH.getToken(), type,
      from: v('rpFrom'), to: v('rpTo'), departmentId: v('rpDept'),
      status: v('rpStatus'), problemType: v('rpProblem'), riskRank: v('rpRank')
    };
    try {
      this._res = await API.get('getTqisReport', params);
      this._meta = params;
      this.renderOut();
    } catch (ex) {
      err.innerHTML = `<div class="dc-err">${tqEsc((ex && ex.message) || 'ล้มเหลว')}</div>`;
    }
    btn.disabled = false; btn.textContent = 'แสดงรายงาน';
  },

  rangeText() {
    const m = this._meta || {};
    return (m.from || m.to) ? `ช่วงวันที่ตรวจ ${m.from || '—'} ถึง ${m.to || '—'}` : 'ทุกช่วงวันที่';
  },

  renderOut() {
    const r = this._res, box = document.getElementById('rpOut');
    const title = (TQIS_REPORTS.find(x => x[0] === r.type) || ['', r.type])[1];
    const body = r.type === 'SUMMARY' ? this.summaryHtml(r.rows, false)
      : r.type === 'MANAGER_PATROL' ? this.patrolHtml(r.rows, false)
        : r.type === 'PERFORMANCE' ? this.perfHtml(r.rows)
          : this.safetyHtml(r);
    box.innerHTML = `<div class="dc-card" style="margin-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <div><h2 style="margin:0;font-size:15px">${tqEsc(title)}</h2>
          <p class="dc-muted" style="margin:3px 0 0;font-size:12px">${tqEsc(this.rangeText())} · ${r.count} รายการ</p></div>
        <div style="display:flex;gap:8px">
          <button class="dc-btn dc-ghost" id="rpCsv" type="button">Export CSV</button>
          <button class="dc-btn dc-primary" id="rpPrint" type="button">🖨 พิมพ์ / PDF (A3)</button></div>
      </div>
      <div style="overflow:auto">${body}</div></div>`;
    document.getElementById('rpCsv').addEventListener('click', () => this.csv());
    document.getElementById('rpPrint').addEventListener('click', () => this.print());
    box.querySelectorAll('[data-id]').forEach(t => t.addEventListener('click', () => TQIS.openDetail(t.dataset.id)));
  },

  imgCell(csv, forPrint) {
    const ids = tqImgIds(csv);
    if (!ids.length) return '<span style="color:#9ca3af">—</span>';
    const size = forPrint ? 62 : 54;
    return `<div style="display:flex;gap:3px;flex-wrap:wrap">${ids.map(id =>
      `<img src="${tqImgThumb(id)}" loading="lazy" style="width:${size}px;height:${Math.round(size * .75)}px;object-fit:cover;border-radius:3px;border:1px solid #e1e0d9">`).join('')}</div>`;
  },

  summaryHtml(rows, forPrint) {
    if (!rows.length) return '<p class="dc-faint" style="color:#9ca3af;font-size:12px">ไม่พบข้อมูลตามเงื่อนไข</p>';
    const cls = forPrint ? '' : ' class="tq-rt"';
    return `<table${cls}><thead><tr>
      <th>#</th><th>TQIS No.</th><th>Patrol Date</th><th>Problem</th><th>ฝ่าย</th><th>Scene / Place</th>
      <th>Description</th><th>Management Advice</th><th>Before</th><th>After</th>
      <th>Permanent CM</th><th>Target</th><th>Dept Approved</th><th>Finished</th><th>Final Approved</th>
    </tr></thead><tbody>${rows.map(o => `<tr${forPrint ? '' : ` data-id="${tqEsc(o.TqisID)}" style="cursor:pointer"`}>
      <td>${o.seq}</td><td>${tqEsc(o.TqisNo)}</td><td style="white-space:nowrap">${tqDate(o.PatrolDate)}</td>
      <td>${tqEsc(tqLabel(TQIS_PROBLEM, o.ProblemType))}</td><td>${tqEsc(TQIS.deptName(o.DepartmentID))}</td>
      <td>${tqEsc(o.ScenePlace)}</td><td>${tqEsc(o.Description)}</td><td>${tqEsc(o.ManagementAdvice)}</td>
      <td>${this.imgCell(o.BeforeImages, forPrint)}</td><td>${this.imgCell(o.AfterImages, forPrint)}</td>
      <td>${tqEsc(o.PermCountermeasure)}</td><td style="white-space:nowrap">${tqDate(o.TargetDate)}</td>
      <td>${tqEsc(o.DeptApprovedByName)}</td><td style="white-space:nowrap">${tqDate(o.FinishedDate)}</td>
      <td>${tqEsc(o.FinalApprovedByName)}</td></tr>`).join('')}</tbody></table>`;
  },

  // Manager Patrol form — grouped by patrol date, one "round" header per date, photos prominent.
  patrolHtml(rows, forPrint) {
    if (!rows.length) return '<p class="dc-faint" style="color:#9ca3af;font-size:12px">ไม่พบข้อมูลตามเงื่อนไข</p>';
    const groups = {}, order = [];
    rows.forEach(o => { const key = tqDate(o.PatrolDate); if (!groups[key]) { groups[key] = []; order.push(key); } groups[key].push(o); });
    const size = forPrint ? 96 : 82;
    const img = csv => {
      const ids = tqImgIds(csv);
      if (!ids.length) return '<span style="color:#9ca3af">—</span>';
      return `<div style="display:flex;gap:3px;flex-wrap:wrap">${ids.map(id =>
        `<img src="${tqImgThumb(id)}" loading="lazy" style="width:${size}px;height:${Math.round(size * .75)}px;object-fit:cover;border-radius:3px;border:1px solid #c3c2b7">`).join('')}</div>`;
    };
    const cls = forPrint ? '' : ' class="tq-rt"';
    const dateBig = key => (key && key !== '—') ? key.replace(/\//g, ' / ') : '—';
    return order.map((key, gi) => `<div${forPrint && gi > 0 ? ' style="break-before:page"' : ''}>
      <div style="text-align:center;margin:${forPrint ? (gi ? '0 0 8px' : '0 0 8px') : (gi ? '26px 0 8px' : '4px 0 8px')}">
        <div style="font-size:${forPrint ? '16px' : '17px'};font-weight:700">( MANAGER PATROL ) รอบโรงงาน</div>
        <div style="letter-spacing:1px;color:#52514e">...... ${dateBig(key)} ......</div>
      </div>
      <table${cls}><thead><tr>
        <th>ลำดับ</th><th>TQIS No.</th><th>วันที่</th><th>ประเภท</th><th>ฝ่าย</th><th>จุด / บริเวณ</th><th>ปัญหา</th><th>ข้อเสนอแนะผู้บริหาร</th>
        <th>Before</th><th>After</th><th>การแก้ไขถาวร</th><th>กำหนดเสร็จ</th><th>หัวหน้าฝ่ายอนุมัติ</th><th>เสร็จจริง</th><th>อนุมัติปิดงาน</th>
      </tr></thead><tbody>${groups[key].map((o, i) => `<tr${forPrint ? '' : ` data-id="${tqEsc(o.TqisID)}" style="cursor:pointer"`}>
        <td style="text-align:center">${i + 1}</td><td>${tqEsc(o.TqisNo)}</td><td style="white-space:nowrap">${tqDate(o.PatrolDate)}</td>
        <td>${tqEsc(tqLabel(TQIS_PROBLEM, o.ProblemType))}</td><td>${tqEsc(TQIS.deptName(o.DepartmentID))}</td>
        <td>${tqEsc(o.ScenePlace)}</td><td>${tqEsc(o.Description)}</td><td>${tqEsc(o.ManagementAdvice)}</td>
        <td>${img(o.BeforeImages)}</td><td>${img(o.AfterImages)}</td><td>${tqEsc(o.PermCountermeasure)}</td>
        <td style="white-space:nowrap">${tqDate(o.TargetDate)}</td><td>${tqEsc(o.DeptApprovedByName)}</td>
        <td style="white-space:nowrap">${tqDate(o.FinishedDate)}</td><td>${tqEsc(o.FinalApprovedByName)}</td>
      </tr>`).join('')}</tbody></table></div>`).join('');
  },

  perfHtml(rows) {
    if (!rows.length) return '<p class="dc-faint" style="color:#9ca3af;font-size:12px">ไม่พบข้อมูลตามเงื่อนไข</p>';
    return `<table class="tq-rt"><thead><tr><th>ฝ่าย</th><th>ทั้งหมด</th><th>ปิดแล้ว</th><th>% ปิดได้</th><th>เฉลี่ยวันที่ใช้</th><th>เกินกำหนด</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${tqEsc(TQIS.deptName(r.departmentId))}</td>
        <td class="num">${r.total}</td><td class="num">${r.finished}</td><td class="num">${r.finishedPct}%</td>
        <td class="num">${r.avgDays == null ? '—' : r.avgDays}</td>
        <td class="num"${r.overdue ? ' style="color:#d03b3b;font-weight:600"' : ''}>${r.overdue}</td></tr>`).join('')}</tbody></table>`;
  },

  safetyHtml(r) {
    if (!r.count) return '<p class="dc-faint" style="color:#9ca3af;font-size:12px">ไม่พบข้อมูลตามเงื่อนไข</p>';
    const matrix = `<table class="tq-rt"><thead><tr><th>Risk Rank \\ Hazard Source</th>
      ${r.hazards.map(h => `<th>${tqEsc(tqLabel(TQIS_HAZARD, h))}</th>`).join('')}<th>รวม</th></tr></thead>
      <tbody>${r.ranks.map(rk => `<tr><td>${tqEsc(tqLabel(TQIS_RANK, rk))}</td>
        ${r.hazards.map(h => `<td class="num">${(r.matrix[rk] || {})[h] || 0}</td>`).join('')}
        <td class="num" style="font-weight:600">${r.byRank[rk] || 0}</td></tr>`).join('')}</tbody></table>`;
    const list = (title, map, labels) => `<div class="dc-card" style="padding:12px"><h3 style="margin:0 0 10px;font-size:13px">${title}</h3>
      ${tqBars(Object.keys(map).map(k => ({ k: tqLabel(labels, k), v: map[k], c: labels === TQIS_RANK ? TQIS_VIZ.rank[k] : null })), TQIS_VIZ.s1)}</div>`;
    return `${matrix}<div class="tq-g2" style="margin-top:16px">
      ${list('ระดับความเสี่ยง', r.byRank, TQIS_RANK)}
      ${list('แหล่งอันตราย', r.byHazard, TQIS_HAZARD)}
      ${list('ประเภทการหยุด', r.byStop, TQIS_STOP)}</div>`;
  },

  csv() {
    const r = this._res;
    const stamp = tqDate(new Date());
    if (r.type === 'SUMMARY' || r.type === 'MANAGER_PATROL') {
      const links = csv => tqImgIds(csv).map(tqImgOpen).join(' ');
      tqCsv(`${r.type === 'MANAGER_PATROL' ? 'TQIS_ManagerPatrol' : 'TQIS_Summary'}_${stamp}.csv`,
        ['ลำดับ', 'TQIS No.', 'Patrol Date', 'Problem Type', 'ฝ่าย', 'Scene/Place', 'Description', 'Management Advice',
          'Before Images', 'After Images', 'Permanent Countermeasure', 'Target Date', 'Dept Approved By', 'Finished Date', 'Final Approved By', 'Status'],
        r.rows.map(o => [o.seq, o.TqisNo, tqDate(o.PatrolDate), tqLabel(TQIS_PROBLEM, o.ProblemType), TQIS.deptName(o.DepartmentID),
          o.ScenePlace, o.Description, o.ManagementAdvice, links(o.BeforeImages), links(o.AfterImages),
          o.PermCountermeasure, tqDate(o.TargetDate), o.DeptApprovedByName, tqDate(o.FinishedDate), o.FinalApprovedByName,
          (TQIS_STATUS[String(o.Status).toUpperCase()] || [o.Status])[0]]));
    } else if (r.type === 'PERFORMANCE') {
      tqCsv(`TQIS_Performance_${stamp}.csv`,
        ['ฝ่าย', 'ทั้งหมด', 'ปิดแล้ว', '% ปิดได้', 'เฉลี่ยวันที่ใช้', 'เกินกำหนด'],
        r.rows.map(x => [TQIS.deptName(x.departmentId), x.total, x.finished, x.finishedPct, x.avgDays == null ? '' : x.avgDays, x.overdue]));
    } else {
      const head = ['Risk Rank'].concat(r.hazards.map(h => tqLabel(TQIS_HAZARD, h))).concat(['รวม']);
      tqCsv(`TQIS_Safety_${stamp}.csv`, head,
        r.ranks.map(rk => [tqLabel(TQIS_RANK, rk)].concat(r.hazards.map(h => (r.matrix[rk] || {})[h] || 0)).concat([r.byRank[rk] || 0])));
    }
  },

  print() {
    const r = this._res;
    const title = (TQIS_REPORTS.find(x => x[0] === r.type) || ['', r.type])[1];
    if (r.type === 'MANAGER_PATROL') {
      // The form carries its own centred header per round — no generic report banner.
      tqPrint(title, 'size: A3 landscape; margin: 10mm;', this.patrolHtml(r.rows, true));
      return;
    }
    const body = r.type === 'SUMMARY' ? this.summaryHtml(r.rows, true)
      : r.type === 'PERFORMANCE' ? this.perfHtml(r.rows)
        : this.safetyHtml(r);
    tqPrint(title, 'size: A3 landscape; margin: 10mm;',
      `<div class="hd"><div><h1>TQIS — ${tqEsc(title)}</h1>
        <div class="muted">${tqEsc(this.rangeText())} · ${r.count} รายการ</div></div>
        <div class="muted">พิมพ์เมื่อ ${tqDate(new Date())}</div></div>${body}`);
  }
};
function loadTqisReports() { TQISReport.load(); }
