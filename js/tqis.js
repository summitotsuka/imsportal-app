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
        </div>
        <div id="tqErr"></div>
        <div class="dc-bar"><button class="dc-btn dc-ghost" id="tqCancel" type="button">Cancel</button><button class="dc-btn dc-primary" id="tqSave" type="button">${editing ? 'Save changes' : 'Create (DRAFT)'}</button></div>
      </div></div>`;
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
      if (tqisId) { await API.post('updateTqis', payload); this.toast('บันทึกแล้ว'); this.openDetail(tqisId); }
      else { const r = await API.post('createTqis', payload); this.toast('สร้าง TQIS แล้ว: ' + r.tqisNo); this.openDetail(r.tqisId); }
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
          <div>${tqBadge(t.Status)}</div>
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
      ${b.length ? `<div class="dc-card"><h2 style="margin:0 0 12px;font-size:15px">Actions</h2><div class="dc-actbar">${b.join('')}</div><div id="tqActErr"></div></div>` : ''}
      <div class="dc-card"><h2 style="margin:0 0 12px;font-size:15px">History</h2><ul class="dc-tl">${tl || '<li><span class="dot"></span><div class="meta">No history</div></li>'}</ul></div>
    </div><div class="dc-toast" id="dcToast"></div>`;
    document.getElementById('tqBack').addEventListener('click', () => this.load());
    this.wireActions(t);
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
