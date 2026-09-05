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
      .cr-lockmgr{margin-left:auto;font-size:11px;color:#9a6400;background:#fff4e5;border:1px solid #f0d9a8;border-radius:5px;padding:1px 7px;white-space:nowrap}
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
    `;
    document.head.appendChild(s);
  },

  token() { return AUTH.getToken(); },

  /* ---------------- LIST VIEW ---------------- */
  async load() {
    this.injectCss();
    const c = document.getElementById('pageContent');
    if (!c) return;
    c.innerHTML = `
      <div class="page-header"><div><h1>Users</h1>
        <p class="cr-muted">Administration — role &amp; department assignment</p></div></div>
      <div class="cr-wrap"><div class="cr-card" id="crList">
        <p class="cr-muted">Loading…</p></div></div>`;
    try {
      const data = await API.get('listEmployees', { token: this.token() });
      const emps = data.employees || [];
      const rows = emps.map(e => `
        <tr>
          <td class="cr-id">${esc(e.employeeId)}</td>
          <td>${esc(e.fullName)}</td>
          <td>${esc(e.department)}</td>
          <td>${esc(e.position)}</td>
          <td>${esc(DISPLAY[e.roleId] || e.roleId || '')}</td>
          <td style="text-align:right">
            <button class="cr-link" data-emp="${esc(e.employeeId)}">Update Role</button>
          </td>
        </tr>`).join('');
      document.getElementById('crList').innerHTML = `
        <table class="cr-tbl"><thead><tr>
          <th>ID</th><th>Name</th><th>Department</th><th>Position</th><th>Role</th><th></th>
        </tr></thead><tbody>${rows || '<tr><td colspan="6" class="cr-faint">No employees</td></tr>'}</tbody></table>`;
      document.querySelectorAll('#crList [data-emp]').forEach(b =>
        b.addEventListener('click', () => this.openEditor(b.dataset.emp)));
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
      const token = this.token();
      const [empRes, rolesRes, deptRes, mgrRes] = await Promise.all([
        API.get('getEmployee', { token, employeeId }),
        API.get('getRoles', { token }),
        API.get('getDepartments', { token }),
        API.get('getEmployeeManagedDepartments', { token, employeeId })
      ]);
      this.roles = rolesRes.roles || [];
      this.departments = deptRes.departments || [];
      this.renderEditor(empRes.employee, (mgrRes.departmentIds || []));
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
        ? `<span class="cr-lockmgr" title="Already managed">${esc(d.managedByName || d.managedByEmpId)}</span>`
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
    const isMgr = () => state.role === 'R006';

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
  },

  toast(msg) {
    const t = document.getElementById('crToast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('show'), 2600);
  }
};

const DISPLAY = { R001: 'Administrator', R002: 'QMS Manager', R003: 'QMS Reviewer', R004: 'User', R005: 'HR', R006: 'Department Manager' };
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* entry point called by navigateTo('users') */
function loadUsers() { UsersPage.load(); }
