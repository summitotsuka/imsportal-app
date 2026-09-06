/* ============================================================
 * js/users.js — Administration ▸ Users
 * Slice 1 screen: employee list ▸ Change Role (role + managed departments)
 * Talks to the real GAS backend via API.get / API.post.
 * Renders into #pageContent, matching the app's page pattern.
 * ============================================================ */

const UsersPage = {
  _css: false,
  roles: [],        // [{roleId, roleName, description, assignable}]
  departments: [],  // [{departmentId, code, name}]

  /* inject feature styles once (kept scoped with .cr- to avoid clashes) */
  injectCss() {
    if (this._css) return;
    this._css = true;
    const s = document.createElement('style');
    s.textContent = `
      .cr-wrap{max-width:760px}
      .cr-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;
        box-shadow:0 1px 3px rgba(0,0,0,.05);padding:20px;margin-bottom:15px}
      .cr-muted{color:#6b7280}.cr-faint{color:#9aa3af}
      .cr-tbl{width:100%;border-collapse:collapse;font-size:14px}
      .cr-tbl th{text-align:left;font-size:12px;color:#6b7280;font-weight:600;
        padding:9px 10px;border-bottom:1px solid #e5e7eb}
      .cr-tbl td{padding:10px;border-bottom:1px solid #f0f1f3}
      .cr-tbl tr:last-child td{border-bottom:0}
      .cr-tbl tbody tr:hover{background:#f8fafc}
      .cr-id{font-variant-numeric:tabular-nums;color:#374151}
      .cr-link{color:#2563eb;font-weight:600;cursor:pointer;background:none;border:0;font:inherit;padding:0}
      .cr-back{color:#6b7280;cursor:pointer;background:none;border:0;font:inherit;font-size:13px;margin-bottom:12px}
      .cr-back:hover{color:#1f2937}
      .cr-who{display:flex;gap:14px;align-items:center}
      .cr-av{width:44px;height:44px;border-radius:9px;background:#e8f0ff;color:#2563eb;
        display:grid;place-items:center;font-weight:700;font-size:17px;flex:none}
      .cr-name{font-size:16px;font-weight:600}
      .cr-meta{display:flex;flex-wrap:wrap;gap:4px 16px;color:#6b7280;font-size:13px;margin-top:2px}
      .cr-meta .k{color:#9aa3af;margin-right:4px}
      .cr-label{font-size:13px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:9px}
      .cr-cur{font-weight:400;color:#6b7280}
      .cr-pill{font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:999px;
        background:#f8fafc;border:1px solid #e5e7eb;color:#374151}
      .cr-sel-w{position:relative}
      .cr-sel{width:100%;appearance:none;font:inherit;font-size:14.5px;color:#1f2937;background:#fff;
        border:1px solid #d1d5db;border-radius:7px;padding:11px 38px 11px 12px;cursor:pointer}
      .cr-sel:focus{outline:2px solid #2563eb;outline-offset:1px;border-color:#2563eb}
      .cr-sel-w::after{content:"";position:absolute;right:14px;top:50%;width:8px;height:8px;
        border-right:2px solid #6b7280;border-bottom:2px solid #6b7280;
        transform:translateY(-70%) rotate(45deg);pointer-events:none}
      .cr-dept{overflow:hidden;transition:max-height .3s ease,opacity .26s ease,margin .26s ease}
      .cr-dept[hidden]{display:block;max-height:0;opacity:0;margin:0;pointer-events:none}
      .cr-dept-in{margin-top:18px;border-top:1px solid #e5e7eb;padding-top:16px}
      .cr-dept-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px}
      .cr-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
      @media(max-width:560px){.cr-grid{grid-template-columns:1fr}}
      .cr-chk{display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;
        border:1px solid #e5e7eb;border-radius:8px;padding:9px 11px;background:#fff}
      .cr-chk:hover{border-color:#d1d5db}
      .cr-chk.on{border-color:#2563eb;background:#e8f0ff}
      .cr-box{width:17px;height:17px;border-radius:4px;border:1.5px solid #d1d5db;flex:none;
        display:grid;place-items:center;background:#fff;font-size:11px;color:#fff;line-height:1}
      .cr-chk.on .cr-box{background:#2563eb;border-color:#2563eb}
      .cr-cd{margin-left:auto;font-size:11px;color:#9aa3af}
      .cr-chk.on .cr-cd{color:#2563eb}
      .cr-chk.locked{background:#f8fafc;border-color:#eef0f3;cursor:not-allowed}
      .cr-chk.locked .cr-box{border-color:#e5e7eb;background:#f0f1f3}
      .cr-chk.locked .nm2{color:#9aa3af}
      .cr-lockname{margin-left:auto;font-size:11px;color:#9aa3af;white-space:nowrap}
      .cr-capline{margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:12.5px;color:#6b7280}
      .cr-bar{display:flex;align-items:center;gap:12px;padding-top:16px;margin-top:4px}
      .cr-note{flex:1;font-size:12.5px;color:#6b7280}
      .cr-note b{color:#1f2937}
      .cr-btn{font:inherit;font-size:13.5px;font-weight:600;border-radius:7px;padding:10px 16px;
        cursor:pointer;border:1px solid transparent}
      .cr-primary{background:#172033;color:#fff}.cr-primary:hover{filter:brightness(1.15)}
      .cr-primary:disabled{opacity:.4;cursor:not-allowed;filter:none}
      .cr-ghost{background:#fff;color:#6b7280;border-color:#d1d5db}.cr-ghost:hover{color:#1f2937}
      .cr-scrim{position:fixed;inset:0;background:rgba(15,20,27,.45);display:none;place-items:center;padding:18px;z-index:1000}
      .cr-scrim.show{display:grid}
      .cr-modal{background:#fff;border-radius:12px;max-width:430px;width:100%;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.25)}
      .cr-diff{display:flex;flex-direction:column;gap:8px;margin-top:6px}
      .cr-drow{display:flex;gap:10px;font-size:13px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:9px 11px}
      .cr-drow .l{color:#9aa3af;width:74px;flex:none;font-size:12px}
      .cr-add{color:#15803d;font-weight:600}.cr-rm{color:#b91c1c;font-weight:600}
      .cr-warn{display:flex;gap:9px;font-size:12.5px;background:#fff4e5;border:1px solid #f0d9a8;color:#9a6400;border-radius:8px;padding:10px 11px;margin-top:10px}
      .cr-toast{position:fixed;left:50%;bottom:26px;transform:translate(-50%,16px);background:#172033;color:#fff;
        font-size:13px;font-weight:500;padding:11px 17px;border-radius:9px;opacity:0;pointer-events:none;
        transition:.26s;z-index:1001;box-shadow:0 10px 30px rgba(0,0,0,.3)}
      .cr-toast.show{opacity:1;transform:translate(-50%,0)}
      .cr-err{background:#fef2f2;border:1px solid #f3cccc;color:#b91c1c;border-radius:8px;padding:11px 13px;font-size:13px}
      .cr-wrap-list{max-width:1100px}
      .cr-wrap-list .cr-tbl th,.cr-wrap-list .cr-tbl td{white-space:nowrap}
      .cr-wrap-list .cr-tbl td:nth-child(2){min-width:180px;white-space:normal}
      .cr-wrap-list .cr-tbl td:nth-child(3){min-width:150px}
      .cr-ph{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .cr-field{margin-bottom:14px}
      .cr-field label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}
      .cr-req{color:#b91c1c;margin-left:2px}
      .cr-in{width:100%;font:inherit;font-size:14px;color:#1f2937;background:#fff;border:1px solid #d1d5db;border-radius:7px;padding:10px 12px}
      .cr-in:focus{outline:2px solid #2563eb;outline-offset:1px;border-color:#2563eb}
      .cr-2col{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
      @media(max-width:560px){.cr-2col{grid-template-columns:1fr}}
      .cr-badge{font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;white-space:nowrap}
      .cr-b-ok{background:#e7f6ec;color:#15803d}
      .cr-b-off{background:#f0f1f3;color:#6b7280}
      .cr-b-pend{background:#fff4e5;color:#9a6400}
      .cr-filter{display:flex;align-items:center;gap:8px;margin-bottom:12px}
      .cr-chip{font:inherit;font-size:12.5px;border:1px solid #d1d5db;background:#fff;color:#6b7280;border-radius:999px;padding:4px 12px;cursor:pointer}
      .cr-chip.on{background:#172033;color:#fff;border-color:#172033}
      .cr-danger{background:#b91c1c;color:#fff}.cr-danger:hover{filter:brightness(1.12)}
      .cr-acct{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .cr-link+.cr-link{margin-left:12px}
    `;
    document.head.appendChild(s);
  },

  token() { return AUTH.getToken(); },

  /* ---------------- LIST VIEW ---------------- */
  async load(filter) {
    this.injectCss();
    const c = document.getElementById('pageContent');
    if (!c) return;
    this._filter = filter || this._filter || 'ACTIVE';
    const role = curRoleId();
    const canEmpData = HR_ROLES.includes(role);
    const chips = ['ACTIVE', 'ALL', 'INACTIVE'].map(f =>
      `<button class="cr-chip${this._filter === f ? ' on' : ''}" data-filter="${f}">${f.charAt(0) + f.slice(1).toLowerCase()}</button>`).join('');
    c.innerHTML = `
      <div class="page-header cr-ph"><div><h1>Users</h1>
        <p class="cr-muted">Administration — user &amp; role management</p></div>
        ${canEmpData ? '<button class="cr-btn cr-primary" id="crEmpData" type="button">Employee Data</button>' : ''}</div>
      <div class="cr-wrap cr-wrap-list">
        <div class="cr-filter"><span class="cr-muted" style="font-size:12.5px">Show:</span>${chips}</div>
        <div class="cr-card" id="crList"><p class="cr-muted">Loading…</p></div>
      </div>`;
    if (canEmpData) document.getElementById('crEmpData').addEventListener('click', () => this.openEmployeeData());
    document.querySelectorAll('.cr-filter [data-filter]').forEach(b =>
      b.addEventListener('click', () => this.load(b.dataset.filter)));
    try {
      const data = await API.get('listEmployees', { token: this.token() });
      let emps = data.employees || [];
      if (this._filter === 'ACTIVE') emps = emps.filter(e => String(e.status || '').toUpperCase() === 'ACTIVE');
      else if (this._filter === 'INACTIVE') emps = emps.filter(e => String(e.status || '').toUpperCase() !== 'ACTIVE');
      const isMgr = ROLE_MGR_ROLES.includes(role);
      const rows = emps.map(e => {
        const acts = [];
        if (canEmpData) acts.push(`<button class="cr-link" data-edit="${esc(e.employeeId)}">Edit</button>`);
        if (isMgr) acts.push(`<button class="cr-link" data-role="${esc(e.employeeId)}">Update Role</button>`);
        return `<tr>
          <td class="cr-id">${esc(e.employeeId)}</td>
          <td>${esc(e.fullName)}</td>
          <td>${esc(e.department)}</td>
          <td>${esc(e.position)}</td>
          <td>${esc(DISPLAY[e.roleId] || e.roleId || '')}</td>
          <td>${statusBadge(e.status)}</td>
          <td style="text-align:right;white-space:nowrap">${acts.join('') || '<span class="cr-faint">—</span>'}</td>
        </tr>`;
      }).join('');
      document.getElementById('crList').innerHTML = `
        <table class="cr-tbl"><thead><tr>
          <th>ID</th><th>Name</th><th>Department</th><th>Position</th><th>Role</th><th>Status</th><th></th>
        </tr></thead><tbody>${rows || '<tr><td colspan="7" class="cr-faint">No employees</td></tr>'}</tbody></table>`;
      document.querySelectorAll('#crList [data-role]').forEach(b =>
        b.addEventListener('click', () => this.openEditor(b.dataset.role)));
      document.querySelectorAll('#crList [data-edit]').forEach(b =>
        b.addEventListener('click', () => this.openEmployeeData(b.dataset.edit)));
    } catch (err) {
      this.showListError(err);
    }
  },

  showListError(err) {
    const el = document.getElementById('crList');
    if (el) el.innerHTML = `<div class="cr-err">Could not load users: ${esc(err.message || 'error')}</div>`;
  },

  /* ---------------- EDITOR VIEW ---------------- */
  async openEditor(employeeId) {
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="cr-wrap"><button class="cr-back" id="crBack">← Back to users</button>
      <div class="cr-card"><p class="cr-muted">Loading…</p></div></div>`;
    document.getElementById('crBack').addEventListener('click', () => this.load());

    try {
      const ctx = await API.get('getChangeRoleContext', { token: this.token(), employeeId });
      this.roles = ctx.roles || [];
      this.departments = ctx.departments || [];
      this.renderEditor(ctx.employee, (ctx.managedDepartments || []));
    } catch (err) {
      const card = document.querySelector('#pageContent .cr-card');
      if (card) card.innerHTML = `<div class="cr-err">Could not open editor: ${esc(err.message || 'error')}</div>`;
    }
  },

  renderEditor(emp, managedDepts) {
    const roleName = id => { const r = this.roles.find(x => x.roleId === id); return r ? r.roleName : id; };
    const roleDisplay = id => { const r = this.roles.find(x => x.roleId === id); return r ? (DISPLAY[id] || r.roleName) : id; };
    const original = { role: emp.roleId, depts: managedDepts.slice() };
    const state = { role: emp.roleId, depts: managedDepts.slice() };

    const roleOptions = this.roles.map(r =>
      `<option value="${r.roleId}" ${r.roleId === state.role ? 'selected' : ''} ${r.assignable ? '' : 'disabled'}>` +
      `${esc(r.roleName)} — ${esc(r.description)}${r.assignable ? '' : ' (admin only)'}</option>`).join('');

    const deptBoxes = this.departments.map(d => {
      const locked = d.managedByEmpId && String(d.managedByEmpId) !== String(emp.employeeId);
      const right = locked
        ? `<span class="cr-lockname" title="Already managed">${esc(d.managedByName || d.managedByEmpId)}</span>`
        : `<span class="cr-cd">${esc(d.departmentId)}</span>`;
      return `<label class="cr-chk${locked ? ' locked' : ''}" data-id="${d.departmentId}" ${locked ? 'data-locked="1"' : ''}>
         <span class="cr-box">✓</span>
         <span class="nm2">${esc(d.name)}</span>${right}
       </label>`;
    }).join('');

    const c = document.getElementById('pageContent');
    c.innerHTML = `
      <div class="cr-wrap">
        <button class="cr-back" id="crBack">← Back to users</button>
        <div class="page-header"><div><h1>Change Role</h1></div></div>

        <div class="cr-card"><div class="cr-who">
          <div class="cr-av">${esc((emp.fullName || '?').charAt(0))}</div>
          <div><div class="cr-name">${esc(emp.fullName)}</div>
            <div class="cr-meta">
              <span><span class="k">ID</span><span class="cr-id">${esc(emp.employeeId)}</span></span>
              <span><span class="k">Dept</span>${esc(emp.department)}</span>
              <span><span class="k">Position</span>${esc(emp.position)}</span>
            </div></div>
        </div></div>

        <div class="cr-card">
          <div class="cr-label">Role <span class="cr-cur">· current</span>
            <span class="cr-pill" id="crCur">${esc(roleDisplay(original.role))}</span></div>
          <div class="cr-sel-w"><select class="cr-sel" id="crRole">${roleOptions}</select></div>

          <div class="cr-dept" id="crDept"><div class="cr-dept-in">
            <div class="cr-dept-h"><div class="cr-label" style="margin:0">Departments managed</div>
              <span class="cr-faint" id="crCount" style="font-size:12px"></span></div>
            <div class="cr-grid" id="crGrid">${deptBoxes}</div>
          </div></div>

          <div class="cr-capline" id="crCap"></div>

          <div class="cr-bar">
            <div class="cr-note" id="crNote">No changes yet</div>
            <button class="cr-btn cr-ghost" id="crReset" type="button">Reset</button>
            <button class="cr-btn cr-primary" id="crSave" type="button" disabled>Save changes</button>
          </div>
        </div>

        <div class="cr-card cr-acct">
          <div><div class="cr-label" style="margin:0">Account access</div>
            <div class="cr-muted" style="font-size:12.5px;margin-top:2px">Login to the system</div></div>
          <div style="display:flex;align-items:center;gap:12px" id="crAcctBox"></div>
        </div>
      </div>

      <div class="cr-scrim" id="crScrim"><div class="cr-modal">
        <h2 style="margin:0 0 3px;font-size:16px">Confirm changes</h2>
        <p class="cr-muted" style="font-size:12.5px;margin:0 0 6px">Recorded in the audit log.</p>
        <div class="cr-diff" id="crDiff"></div><div id="crWarn"></div>
        <div style="display:flex;gap:9px;justify-content:flex-end;margin-top:17px">
          <button class="cr-btn cr-ghost" id="crCancel" type="button">Cancel</button>
          <button class="cr-btn cr-primary" id="crConfirm" type="button">Confirm &amp; save</button>
        </div>
      </div></div>
      <div class="cr-toast" id="crToast"></div>`;

    // ---- wiring ----
    const $ = id => document.getElementById(id);
    const sel = $('crRole'), deptSec = $('crDept'), grid = $('crGrid'),
          countEl = $('crCount'), capEl = $('crCap'), saveBtn = $('crSave'), noteEl = $('crNote');
    const DEPT_MGR_ROLES = ['R006', 'R007'];
    const isMgr = () => DEPT_MGR_ROLES.includes(state.role);

    const syncDept = () => {
      grid.querySelectorAll('.cr-chk').forEach(el => {
        const on = state.depts.includes(el.dataset.id);
        el.classList.toggle('on', on);
      });
      countEl.textContent = state.depts.length ? state.depts.length + ' selected' : 'none selected';
    };
    const reveal = () => {
      const show = isMgr(); deptSec.hidden = !show;
      deptSec.style.maxHeight = show ? deptSec.querySelector('.cr-dept-in').scrollHeight + 40 + 'px' : '0';
    };
    const cap = () => {
      const r = this.roles.find(x => x.roleId === state.role);
      capEl.textContent = r ? ('This role: ' + r.description) : '';
    };
    const diff = () => {
      const roleChanged = state.role !== original.role;
      const added = isMgr() ? state.depts.filter(d => !original.depts.includes(d)) : [];
      const removed = isMgr() ? original.depts.filter(d => !state.depts.includes(d)) : original.depts.slice();
      return { roleChanged, added, removed, leaving: !isMgr() && original.role === 'R006' };
    };
    const refresh = () => {
      const d = diff(), changed = d.roleChanged || d.added.length || d.removed.length;
      saveBtn.disabled = !changed;
      if (!changed) { noteEl.textContent = 'No changes yet'; return; }
      const b = [];
      if (d.roleChanged) b.push(`Role <b>${esc(roleName(original.role))} → ${esc(roleName(state.role))}</b>`);
      if (d.added.length) b.push(`<b>+${d.added.length}</b> dept`);
      if (d.removed.length) b.push(`<b>−${d.removed.length}</b> dept`);
      noteEl.innerHTML = b.join(' · ');
    };

    grid.querySelectorAll('.cr-chk').forEach(el => el.addEventListener('click', () => {
      if (el.dataset.locked) return; // department already has another manager
      const id = el.dataset.id;
      if (state.depts.includes(id)) state.depts = state.depts.filter(x => x !== id);
      else state.depts.push(id);
      syncDept(); refresh();
    }));
    sel.addEventListener('change', () => {
      state.role = sel.value;
      if (!isMgr()) state.depts = [];
      syncDept(); reveal(); cap(); refresh();
    });
    $('crReset').addEventListener('click', () => {
      state.role = original.role; state.depts = original.depts.slice();
      sel.value = state.role; syncDept(); reveal(); cap(); refresh();
    });
    $('crBack').addEventListener('click', () => this.load());

    // save flow
    const scrim = $('crScrim'), nm = id => { const d = this.departments.find(x => x.departmentId === id); return d ? d.departmentId + ' · ' + d.name : id; };
    $('crSave').addEventListener('click', () => {
      const d = diff(), rows = [];
      if (d.roleChanged) rows.push(`<div class="cr-drow"><span class="l">Role</span><span>${esc(roleName(original.role))} → <b>${esc(roleName(state.role))}</b></span></div>`);
      if (d.added.length) rows.push(`<div class="cr-drow"><span class="l">Add dept</span><span class="cr-add">${d.added.map(x => esc(nm(x))).join('<br>')}</span></div>`);
      if (d.removed.length) rows.push(`<div class="cr-drow"><span class="l">Remove</span><span class="cr-rm">${d.removed.map(x => esc(nm(x))).join('<br>')}</span></div>`);
      $('crDiff').innerHTML = rows.join('');
      $('crWarn').innerHTML = d.leaving ? `<div class="cr-warn">Leaving Department Manager removes all ${original.depts.length} managed departments.</div>` : '';
      scrim.classList.add('show');
    });
    $('crCancel').addEventListener('click', () => scrim.classList.remove('show'));
    scrim.addEventListener('click', e => { if (e.target === scrim) scrim.classList.remove('show'); });

    $('crConfirm').addEventListener('click', async () => {
      const confirmBtn = $('crConfirm');
      confirmBtn.disabled = true; confirmBtn.textContent = 'Saving…';
      try {
        await API.post('changeUserRole', {
          token: this.token(),
          employeeId: emp.employeeId,
          roleId: state.role,
          departmentIds: isMgr() ? state.depts : []
        });
        scrim.classList.remove('show');
        const savedRole = roleName(state.role);
        // reload authoritative state from the backend so what's shown == what's saved
        // (departments/role reflect the sheet, not local guesses)
        await this.openEditor(emp.employeeId);
        this.toast('Saved · role set to ' + savedRole);
        return;
      } catch (err) {
        // backend rejections (e.g. ROLE_ESCALATION_DENIED) preserve .code via API.post
        $('crWarn').innerHTML = `<div class="cr-err">${esc(err.message || 'Save failed')}${err.code ? ' (' + esc(err.code) + ')' : ''}</div>`;
      } finally {
        confirmBtn.disabled = false; confirmBtn.textContent = 'Confirm & save';
      }
    });

    // init
    syncDept(); reveal(); cap(); refresh();
    window.addEventListener('resize', reveal);

    // account activation (role managers)
    (function (self) {
      const box = document.getElementById('crAcctBox');
      if (!box) return;
      const st = String(emp.status || '').toUpperCase();
      box.innerHTML = statusBadge(emp.status) + (st === 'INACTIVE'
        ? ' <button class="cr-btn cr-ghost" id="crReact" type="button">Reactivate account</button>'
        : ' <button class="cr-btn cr-danger" id="crDeact" type="button">Deactivate account</button>');
      const dBtn = document.getElementById('crDeact'), rBtn = document.getElementById('crReact');
      if (dBtn) dBtn.addEventListener('click', () => self.promptMaster('Deactivate account', (pw, done) => {
        API.post('deactivateAccount', { token: self.token(), employeeId: emp.employeeId, masterPassword: pw })
          .then(() => { done(); self.toast('Account deactivated'); self.openEditor(emp.employeeId); })
          .catch(ex => done((ex && ex.message) || 'Failed'));
      }));
      if (rBtn) rBtn.addEventListener('click', () => {
        API.post('reactivateAccount', { token: self.token(), employeeId: emp.employeeId })
          .then(() => { self.toast('Account reactivated'); self.openEditor(emp.employeeId); })
          .catch(ex => self.toast((ex && ex.message) || 'Failed'));
      });
    })(this);
  },

  async openCreate() {
    const c = document.getElementById('pageContent');
    c.innerHTML = `<div class="cr-wrap"><button class="cr-back" id="crBack">← Back to users</button>
      <div class="cr-card"><p class="cr-muted">Loading…</p></div></div>`;
    document.getElementById('crBack').addEventListener('click', () => this.load());
    try {
      const dep = await API.get('getDepartments', { token: this.token() });
      this.renderCreate(dep.departments || []);
    } catch (err) {
      const card = document.querySelector('#pageContent .cr-card');
      if (card) card.innerHTML = `<div class="cr-err">${esc(err.message || 'Could not load form')}</div>`;
    }
  },

  renderCreate(departments) {
    const deptOpts = departments.map(d => `<option value="${esc(d.departmentId)}">${esc(d.name)} (${esc(d.departmentId)})</option>`).join('');
    const c = document.getElementById('pageContent');
    c.innerHTML = `
      <div class="cr-wrap">
        <button class="cr-back" id="crBack">← Back to users</button>
        <div class="page-header"><div><h1>New employee</h1></div></div>
        <div class="cr-card">
          <div class="cr-2col">
            <div class="cr-field"><label>Employee ID <span class="cr-req">*</span></label><input class="cr-in" id="fEmp" autocomplete="off"></div>
            <div class="cr-field"><label>Full name <span class="cr-req">*</span></label><input class="cr-in" id="fName"></div>
          </div>
          <div class="cr-2col">
            <div class="cr-field"><label>Department <span class="cr-req">*</span></label>
              <div class="cr-sel-w"><select class="cr-sel" id="fDept"><option value="">— select —</option>${deptOpts}</select></div></div>
            <div class="cr-field"><label>Position</label><input class="cr-in" id="fPos"></div>
          </div>
          <div class="cr-2col">
            <div class="cr-field"><label>Start date <span class="cr-req">*</span></label><input class="cr-in" id="fStart" type="date"></div>
            <div class="cr-field"><label>Email <span class="cr-req">*</span></label><input class="cr-in" id="fEmail" type="email"></div>
          </div>
          <div class="cr-2col">
            <div class="cr-field"><label>Phone</label><input class="cr-in" id="fPhone"></div>
            <div class="cr-field"><label>Telegram ID</label><input class="cr-in" id="fTelegram" autocomplete="off"></div>
          </div>
          <div id="fErr"></div>
          <div class="cr-bar">
            <div class="cr-note">New accounts start as <b>User</b>, pending activation.</div>
            <button class="cr-btn cr-ghost" id="fCancel" type="button">Cancel</button>
            <button class="cr-btn cr-primary" id="fSave" type="button">Create</button>
          </div>
        </div>
      </div>
      <div class="cr-toast" id="crToast"></div>`;

    const $ = id => document.getElementById(id);
    $('crBack').addEventListener('click', () => this.load());
    $('fCancel').addEventListener('click', () => this.load());
    $('fSave').addEventListener('click', async () => {
      const v = {
        employeeId: $('fEmp').value.trim(),
        fullName: $('fName').value.trim(),
        departmentId: $('fDept').value,
        position: $('fPos').value.trim(),
        startDate: $('fStart').value,
        email: $('fEmail').value.trim(),
        phone: $('fPhone').value.trim(),
        telegramChatId: $('fTelegram').value.trim()
      };
      const missing = [];
      if (!v.employeeId) missing.push('Employee ID');
      if (!v.fullName) missing.push('Full name');
      if (!v.departmentId) missing.push('Department');
      if (!v.startDate) missing.push('Start date');
      if (!v.email) missing.push('Email');
      if (missing.length) { $('fErr').innerHTML = `<div class="cr-err">Please fill: ${esc(missing.join(', '))}</div>`; return; }

      const btn = $('fSave'); btn.disabled = true; btn.textContent = 'Creating…';
      try {
        await API.post('createUser', Object.assign({ token: this.token() }, v));
        this.toast('Employee created · ' + v.employeeId);
        setTimeout(() => this.load(), 700);
      } catch (err) {
        $('fErr').innerHTML = `<div class="cr-err">${esc(err.message || 'Create failed')}${err.code ? ' (' + esc(err.code) + ')' : ''}</div>`;
        btn.disabled = false; btn.textContent = 'Create';
      }
    });
  },

  /* ---------------- Employee Data (ADMIN + HR) ---------------- */
  async openEmployeeData(preloadId) {
    this.injectCss();
    const c = document.getElementById('pageContent');
    c.innerHTML = `
      <div class="cr-wrap">
        <button class="cr-back" id="crBack">← Back to users</button>
        <div class="page-header cr-ph"><div><h1>Employee Data</h1></div>
          <button class="cr-btn cr-primary" id="crNew2" type="button">+ New employee</button></div>
        <div class="cr-card">
          <div class="cr-label">Find employee by ID</div>
          <div style="display:flex;gap:8px">
            <input class="cr-in" id="crSearch" placeholder="Employee ID" style="flex:1" value="${esc(preloadId || '')}">
            <button class="cr-btn cr-primary" id="crSearchBtn" type="button">Search</button>
          </div>
        </div>
        <div id="crEmpSlot"></div>
      </div>
      <div class="cr-toast" id="crToast"></div>`;
    document.getElementById('crBack').addEventListener('click', () => this.load());
    document.getElementById('crNew2').addEventListener('click', () => this.openCreate());
    const doSearch = () => this.loadEmployeeForEdit(document.getElementById('crSearch').value.trim());
    document.getElementById('crSearchBtn').addEventListener('click', doSearch);
    document.getElementById('crSearch').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    if (preloadId) this.loadEmployeeForEdit(preloadId);
  },

  async loadEmployeeForEdit(employeeId) {
    if (!employeeId) return;
    const slot = document.getElementById('crEmpSlot');
    slot.innerHTML = `<div class="cr-card"><p class="cr-muted">Loading…</p></div>`;
    try {
      const [empRes, depRes] = await Promise.all([
        API.get('getEmployee', { token: this.token(), employeeId: employeeId }),
        API.get('getDepartments', { token: this.token() })
      ]);
      this.departments = depRes.departments || [];
      this.renderEmployeeEditor(empRes.employee);
    } catch (err) {
      slot.innerHTML = `<div class="cr-card"><div class="cr-err">${esc(err.message || 'Employee not found')}</div></div>`;
    }
  },

  renderEmployeeEditor(emp) {
    const deptOpts = this.departments.map(d =>
      `<option value="${esc(d.departmentId)}" ${d.departmentId === emp.departmentId ? 'selected' : ''}>${esc(d.name)} (${esc(d.departmentId)})</option>`).join('');
    const resigned = String(emp.status || '').toUpperCase() !== 'ACTIVE';
    const slot = document.getElementById('crEmpSlot');
    slot.innerHTML = `
      <div class="cr-card">
        <div class="cr-who" style="margin-bottom:14px">
          <div class="cr-av">${esc((emp.fullName || '?').charAt(0))}</div>
          <div><div class="cr-name">${esc(emp.fullName)}</div>
            <div class="cr-meta"><span><span class="k">ID</span><span class="cr-id">${esc(emp.employeeId)}</span></span> ${statusBadge(emp.status)}</div></div>
        </div>
        <div class="cr-2col">
          <div class="cr-field"><label>Full name <span class="cr-req">*</span></label><input class="cr-in" id="eName" value="${esc(emp.fullName)}"></div>
          <div class="cr-field"><label>Department <span class="cr-req">*</span></label><div class="cr-sel-w"><select class="cr-sel" id="eDept">${deptOpts}</select></div></div>
        </div>
        <div class="cr-2col">
          <div class="cr-field"><label>Position</label><input class="cr-in" id="ePos" value="${esc(emp.position)}"></div>
          <div class="cr-field"><label>Section</label><input class="cr-in" id="eSec" value="${esc(emp.section || '')}"></div>
        </div>
        <div class="cr-2col">
          <div class="cr-field"><label>Start date</label><input class="cr-in" id="eStart" type="date" value="${esc(String(emp.startDate || '').slice(0, 10))}"></div>
          <div class="cr-field"><label>Email <span class="cr-req">*</span></label><input class="cr-in" id="eEmail" type="email" value="${esc(emp.email || '')}"></div>
        </div>
        <div class="cr-2col">
          <div class="cr-field"><label>Phone</label><input class="cr-in" id="ePhone" value="${esc(emp.phone || '')}"></div>
          <div class="cr-field"><label>Telegram ID</label><input class="cr-in" id="eTg" value="${esc(emp.telegramChatId || '')}"></div>
        </div>
        <div id="eErr"></div>
        <div class="cr-bar">
          <div class="cr-note"></div>
          <button class="cr-btn cr-ghost" id="eReset" type="button">Reset password</button>
          ${resigned
            ? '<button class="cr-btn cr-ghost" id="eUnresign" type="button">Un-resign</button>'
            : '<button class="cr-btn cr-danger" id="eResign" type="button">Set resigned</button>'}
          <button class="cr-btn cr-primary" id="eSave" type="button">Save changes</button>
        </div>
      </div>`;

    const $ = id => document.getElementById(id);
    const err = m => { $('eErr').innerHTML = m ? `<div class="cr-err">${esc(m)}</div>` : ''; };
    const self = this;

    $('eSave').addEventListener('click', async () => {
      const v = {
        employeeId: emp.employeeId, fullName: $('eName').value.trim(), departmentId: $('eDept').value,
        position: $('ePos').value.trim(), section: $('eSec').value.trim(), startDate: $('eStart').value,
        email: $('eEmail').value.trim(), phone: $('ePhone').value.trim(), telegramChatId: $('eTg').value.trim()
      };
      if (!v.fullName || !v.email) { err('Full name and Email are required.'); return; }
      const b = $('eSave'); b.disabled = true; b.textContent = 'Saving…';
      try {
        await API.post('updateEmployee', Object.assign({ token: self.token() }, v));
        self.toast('Saved'); self.loadEmployeeForEdit(emp.employeeId);
      } catch (ex) { err((ex && ex.message) || 'Save failed'); b.disabled = false; b.textContent = 'Save changes'; }
    });

    $('eReset').addEventListener('click', () => {
      if (!confirm('Reset this employee password? They must activate again to set a new one.')) return;
      API.post('resetPassword', { token: self.token(), employeeId: emp.employeeId })
        .then(() => { self.toast('Password reset — account is now pending'); self.loadEmployeeForEdit(emp.employeeId); })
        .catch(ex => err((ex && ex.message) || 'Reset failed'));
    });

    if ($('eResign')) $('eResign').addEventListener('click', () => {
      self.promptMaster('Set employee as resigned', (pw, done) => {
        API.post('resignEmployee', { token: self.token(), employeeId: emp.employeeId, masterPassword: pw })
          .then(() => { done(); self.toast('Employee set as resigned'); self.loadEmployeeForEdit(emp.employeeId); })
          .catch(ex => done((ex && ex.message) || 'Failed'));
      });
    });
    if ($('eUnresign')) $('eUnresign').addEventListener('click', () => {
      API.post('unresignEmployee', { token: self.token(), employeeId: emp.employeeId })
        .then(() => { self.toast('Resignation reversed'); self.loadEmployeeForEdit(emp.employeeId); })
        .catch(ex => err((ex && ex.message) || 'Failed'));
    });
  },

  /* ---------------- master password modal (reusable) ---------------- */
  promptMaster(title, onConfirm) {
    let modal = document.getElementById('crMasterScrim');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'crMasterScrim'; modal.className = 'cr-scrim';
      modal.innerHTML = `<div class="cr-modal">
        <h2 id="crMTitle" style="margin:0 0 3px;font-size:16px"></h2>
        <p class="cr-muted" style="font-size:12.5px;margin:0 0 14px">Enter the confirmation (master) password to proceed.</p>
        <input class="cr-in" id="crMPw" type="password" placeholder="Master password" autocomplete="off">
        <div id="crMErr" style="margin-top:8px"></div>
        <div style="display:flex;gap:9px;justify-content:flex-end;margin-top:16px">
          <button class="cr-btn cr-ghost" id="crMCancel" type="button">Cancel</button>
          <button class="cr-btn cr-danger" id="crMOk" type="button">Confirm</button>
        </div></div>`;
      document.body.appendChild(modal);
    }
    const $ = id => document.getElementById(id);
    $('crMTitle').textContent = title;
    $('crMPw').value = ''; $('crMErr').innerHTML = '';
    modal.classList.add('show');
    setTimeout(() => $('crMPw').focus(), 30);
    const close = () => modal.classList.remove('show');
    $('crMCancel').onclick = close;
    modal.onclick = e => { if (e.target === modal) close(); };
    $('crMOk').onclick = () => {
      const pw = $('crMPw').value;
      if (!pw) { $('crMErr').innerHTML = '<div class="cr-err">Password required</div>'; return; }
      const ok = $('crMOk'); ok.disabled = true; ok.textContent = '…';
      onConfirm(pw, (errMsg) => {
        ok.disabled = false; ok.textContent = 'Confirm';
        if (errMsg) $('crMErr').innerHTML = `<div class="cr-err">${esc(errMsg)}</div>`;
        else close();
      });
    };
  },

  toast(msg) {
    const t = document.getElementById('crToast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('show'), 2600);
  }
};

const HR_ROLES = ['R001', 'R005', 'R007', 'R008'];
const ROLE_MGR_ROLES = ['R001', 'R002'];
function curRoleId() { try { return String((AUTH.getUser() || {}).roleId || ''); } catch (e) { return ''; } }
function statusBadge(status) {
  const s = String(status || '').toUpperCase();
  const m = { ACTIVE: ['Active', 'cr-b-ok'], INACTIVE: ['Inactive', 'cr-b-off'], PENDING: ['Pending', 'cr-b-pend'] }[s] || ['—', 'cr-b-off'];
  return `<span class="cr-badge ${m[1]}">${m[0]}</span>`;
}
const DISPLAY = { R001: 'Administrator', R002: 'QMS Manager', R003: 'QMS Reviewer', R004: 'User', R005: 'HR', R006: 'Department Manager' };
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* entry point called by navigateTo('users') */
function loadUsers() { UsersPage.load(); }
