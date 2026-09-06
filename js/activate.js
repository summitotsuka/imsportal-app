/* js/activate.js — login-screen self-service flows (public, no session):
   • Activate account : step 1 verify identity  → step 2 set first password
   • Forgot password  : verify identity + set a new password
   Calls verifyActivation / activateSelf / resetPasswordSelf. */
(function () {
  function $(id) { return document.getElementById(id); }
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  var st = document.createElement('style');
  st.textContent =
    '.login-links{display:flex;justify-content:space-between;gap:12px;margin-top:14px}' +
    '.login-alt{text-align:center;margin-top:14px}' +
    '.link-btn{background:none;border:0;color:#2563eb;font:inherit;font-size:13px;cursor:pointer;padding:4px}' +
    '.link-btn:hover{text-decoration:underline}' +
    '.login-ok{background:#e7f6ec;border:1px solid #b7e0c4;color:#15803d;border-radius:7px;padding:10px 12px;font-size:13px;margin-bottom:10px}' +
    '.login-hint{font-size:12.5px;color:#6b7280;line-height:1.5;margin-bottom:6px}';
  document.head.appendChild(st);

  ready(function () {
    var loginCard = $('loginCard'), activateCard = $('activateCard'), forgotCard = $('forgotCard');
    if (!loginCard) return;

    function show(el) { [loginCard, activateCard, forgotCard].forEach(function (c) { if (c) c.hidden = (c !== el); }); }
    function hide(id) { var el = $(id); if (el) { el.hidden = true; el.textContent = ''; } }
    function msg(id, m) { var el = $(id); if (!el) return; el.textContent = m; el.hidden = false; }
    function val(id) { var el = $(id); return el ? el.value : ''; }
    function clear(ids) { ids.forEach(function (id) { var el = $(id); if (el) el.value = ''; }); }

    /* ---------------- Activate (2-step) ---------------- */
    function resetActivate() {
      clear(['acEmp', 'acStart', 'acEmail', 'acPw', 'acPw2']);
      $('acStep1').hidden = false; $('acStep2').hidden = true;
      hide('acVerifyError'); hide('activateError'); hide('activateOk');
    }

    var showActivate = $('showActivateLink');
    if (showActivate) showActivate.addEventListener('click', function () { resetActivate(); show(activateCard); });
    var backA = $('backToLoginA');
    if (backA) backA.addEventListener('click', function () { show(loginCard); });

    var verifyBtn = $('acVerifyButton');
    if (verifyBtn) verifyBtn.addEventListener('click', async function () {
      var employeeId = val('acEmp').trim(), startDate = val('acStart'), email = val('acEmail').trim();
      hide('acVerifyError');
      if (!employeeId || !startDate || !email) { msg('acVerifyError', 'Please fill Employee ID, Start date and Email.'); return; }
      verifyBtn.disabled = true; verifyBtn.textContent = 'VERIFYING…';
      try {
        var data = await API.post('verifyActivation', { employeeId: employeeId, startDate: startDate, email: email });
        $('acVerifiedName').textContent = 'Verified: ' + (data && data.fullName ? data.fullName : employeeId);
        $('acStep1').hidden = true; $('acStep2').hidden = false;
      } catch (ex) {
        msg('acVerifyError', (ex && ex.message) ? ex.message : 'Verification failed.');
      } finally {
        verifyBtn.disabled = false; verifyBtn.textContent = 'VERIFY';
      }
    });

    var activateBtn = $('activateButton');
    if (activateBtn) activateBtn.addEventListener('click', async function () {
      var employeeId = val('acEmp').trim(), startDate = val('acStart'), email = val('acEmail').trim(),
          pw = val('acPw'), pw2 = val('acPw2');
      hide('activateError'); hide('activateOk');
      if (!pw) { msg('activateError', 'Please enter a new password.'); return; }
      if (pw !== pw2) { msg('activateError', 'Passwords do not match.'); return; }
      activateBtn.disabled = true; activateBtn.textContent = 'ACTIVATING…';
      try {
        await API.post('activateSelf', { employeeId: employeeId, startDate: startDate, email: email, password: pw });
        msg('activateOk', 'Account activated. You can now log in.');
        setTimeout(function () { show(loginCard); }, 1800);
      } catch (ex) {
        msg('activateError', (ex && ex.message) ? ex.message : 'Activation failed.');
      } finally {
        activateBtn.disabled = false; activateBtn.textContent = 'SET PASSWORD & ACTIVATE';
      }
    });

    /* ---------------- Forgot password (contact HR) ---------------- */
    var showForgot = $('showForgotLink');
    if (showForgot) showForgot.addEventListener('click', function () { show(forgotCard); });
    var backF = $('backToLoginF');
    if (backF) backF.addEventListener('click', function () { show(loginCard); });
  });
})();
