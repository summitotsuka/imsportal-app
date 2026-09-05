/* js/activate.js — self-service account activation on the login screen.
   Public flow (no session): verify Employee ID + Start date + Email, set a
   password, then the account becomes ACTIVE. Calls activateSelf. */
(function () {
  function $(id) { return document.getElementById(id); }
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // minimal styles (link + success banner) — app.css has no equivalents
  var st = document.createElement('style');
  st.textContent =
    '.login-alt{text-align:center;margin-top:14px}' +
    '.link-btn{background:none;border:0;color:#2563eb;font:inherit;font-size:13px;cursor:pointer;padding:4px}' +
    '.link-btn:hover{text-decoration:underline}' +
    '.login-ok{background:#e7f6ec;border:1px solid #b7e0c4;color:#15803d;border-radius:7px;padding:10px 12px;font-size:13px;margin-bottom:10px}';
  document.head.appendChild(st);

  ready(function () {
    var loginCard = $('loginCard'), activateCard = $('activateCard');
    if (!activateCard || !loginCard) return;

    function hide(id) { var el = $(id); if (el) { el.hidden = true; el.textContent = ''; } }
    function err(m) { var el = $('activateError'); el.textContent = m; el.hidden = false; hide('activateOk'); }
    function ok(m) { var el = $('activateOk'); el.textContent = m; el.hidden = false; hide('activateError'); }
    function resetForm() {
      ['acEmp', 'acStart', 'acEmail', 'acPw', 'acPw2'].forEach(function (id) { var el = $(id); if (el) el.value = ''; });
      hide('activateError'); hide('activateOk');
    }
    function showActivate() { loginCard.hidden = true; activateCard.hidden = false; }
    function showLogin() { activateCard.hidden = true; loginCard.hidden = false; resetForm(); }

    var showLink = $('showActivateLink'); if (showLink) showLink.addEventListener('click', showActivate);
    var backLink = $('backToLoginLink'); if (backLink) backLink.addEventListener('click', showLogin);

    var form = $('activateForm');
    if (form) form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var employeeId = $('acEmp').value.trim(),
          startDate = $('acStart').value,
          email = $('acEmail').value.trim(),
          pw = $('acPw').value,
          pw2 = $('acPw2').value;

      if (!employeeId || !startDate || !email || !pw) { err('Please fill all required fields.'); return; }
      if (pw !== pw2) { err('Passwords do not match.'); return; }

      var btn = $('activateButton'); btn.disabled = true; btn.textContent = 'ACTIVATING…';
      try {
        await API.post('activateSelf', { employeeId: employeeId, startDate: startDate, email: email, password: pw });
        ok('Account activated. You can now log in.');
        setTimeout(showLogin, 1800);
      } catch (ex) {
        err((ex && ex.message) ? ex.message : 'Activation failed.');
      } finally {
        btn.disabled = false; btn.textContent = 'ACTIVATE';
      }
    });
  });
})();
