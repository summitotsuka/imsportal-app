// Fallback maps only — the live role names are pulled from the Roles sheet (getRoleNames)
// on login and merged in, so a new role added in the sheet shows its name without any code change.
const ROLE_LABELS = { R001: 'Administrator', R002: 'QMS Manager', R003: 'QMS Reviewer', R004: 'User', R005: 'HR', R006: 'Department Manager', R007: 'HR Manager', R008: 'HR Staff' };
const ROLE_NAME = { R001: 'ADMIN', R002: 'QMS_MANAGER', R003: 'QMS', R004: 'USER', R005: 'HR', R006: 'DEPT_MANAGER', R007: 'HR_MANAGER', R008: 'HR_STAFF' };

// Pull role names from the Roles sheet once per session and merge into the maps above.
// Uses getRoleNames (session-only, not User-Admin gated) so every role — including new
// ones like R009 — resolves for any signed-in user.
var _rolesLoaded = false, _rolesPromise = null;
function loadRolesMap() {
  if (_rolesLoaded) return Promise.resolve();
  if (_rolesPromise) return _rolesPromise;
  var token = (typeof AUTH !== 'undefined' && AUTH.getToken) ? AUTH.getToken() : null;
  if (!token) return Promise.resolve();
  _rolesPromise = API.get('getRoleNames', { token: token }).then(function (res) {
    var list = (res && (res.roles || res.data || res)) || [];
    if (!Array.isArray(list)) list = [];
    list.forEach(function (r) {
      if (!r) return;
      var id = r.roleId || r.RoleID || r.id || r.Role || '';
      if (!id) return;
      var name = r.roleName || r.RoleName || r.name || r.Name || '';
      var label = r.label || r.roleLabel || r.RoleLabel || r.description || r.Description || name;
      if (name) ROLE_NAME[id] = name;
      if (label) ROLE_LABELS[id] = label;
    });
    _rolesLoaded = true;
  }).catch(function () { /* keep fallback maps on failure */ });
  return _rolesPromise;
}

document.addEventListener(
  'DOMContentLoaded',
  initializeApp
);


async function initializeApp() {

  const token = AUTH.getToken();

  // ไม่มี Session
  if (!token) {

    hideSessionLoading();

    showLogin();

    return;

  }


  // มี Session → ตรวจสอบกับ Backend
  try {

    const session =
      await API.post(
        'validateSession',
        {
          token: token
        }
      );


    setCurrentUser(session);

    hideSessionLoading();

    showApp();

  } catch (error) {

    console.warn('Session validation failed:', error);

    // No error.code = a transient network / GAS-redirect (404) error that survived retries.
    // In that case keep the session and load with the stored user instead of forcing a logout.
    const transient = !(error && error.code);
    const stored = (typeof AUTH.getUser === 'function') ? AUTH.getUser() : null;

    if (transient && stored) {
      setCurrentUser(stored);
      hideSessionLoading();
      showApp();
      return;
    }

    AUTH.clearSession();
    hideSessionLoading();
    showLogin();

  }

}


function showLogin() {

  const loginScreen =
    document.getElementById(
      'loginScreen'
    );

  const app =
    document.querySelector(
      '.app'
    );


  if (loginScreen) {

    loginScreen.style.display =
      'flex';

  }


  if (app) {

    app.style.display =
      'none';

  }


  setupLoginForm();

}


function showApp() {

  const loginScreen =
    document.getElementById(
      'loginScreen'
    );

  const app =
    document.querySelector(
      '.app'
    );


  if (loginScreen) {

    loginScreen.style.display =
      'none';

  }


  if (app) {

    app.style.display =
      'flex';

  }


  setCurrentUser(
    AUTH.getUser()
  );


  renderNavigation();

  setupSidebar();

  setupLogout();

  navigateTo('dashboard');

}


function setupLoginForm() {

  const form =
    document.getElementById(
      'loginForm'
    );


  if (!form) return;


  form.addEventListener(
    'submit',
    handleLogin
  );

}


async function handleLogin(event) {

  event.preventDefault();


  const username =
    document
      .getElementById(
        'loginUsername'
      )
      .value
      .trim();


  const password =
    document
      .getElementById(
        'loginPassword'
      )
      .value;


  const button =
    document.getElementById(
      'loginButton'
    );


  const errorBox =
    document.getElementById(
      'loginError'
    );


  errorBox.hidden = true;

  errorBox.textContent = '';


  button.disabled = true;

  button.textContent =
    'Signing in...';


  try {

    const data =
      await AUTH.login(
        username,
        password
      );


    setCurrentUser(
      data.user
    );


    showApp();


  } catch (error) {

    console.error(
      'Login error:',
      error
    );


    errorBox.textContent =
      error.message ||
      'Invalid username or password.';

    errorBox.hidden =
      false;


    button.disabled =
      false;

    button.textContent =
      'LOGIN';

  }

}


var _profileCache = null, _profilePromise = null;

function setCurrentUser(user) {

  const usernameElement =
    document.getElementById(
      'currentUsername'
    );


  const roleElement =
    document.getElementById(
      'currentRole'
    );


  if (!user) {

    if (usernameElement) {
      usernameElement.textContent =
        'Guest User';
    }

    if (roleElement) {
      roleElement.textContent =
        'Not Logged In';
    }

    return;

  }


  // line 1: EmployeeID : FullName - Department   line 2: Position (RoleName)
  const line1 = function (empId, name, dept) {
    return (empId ? empId + ' : ' : '') + (name || 'User') + (dept ? ' - ' + dept : '');
  };
  const line2 = function (position, roleId) {
    return (position ? position + ' ' : '') + '(' + (ROLE_NAME[roleId] || roleId || '') + ')';
  };

  // already enriched this session -> use cache, no network call
  if (_profileCache) {
    var pc = _profileCache;
    if (usernameElement) usernameElement.textContent = line1(pc.employeeId || user.employeeId, pc.fullName || user.fullName, pc.department);
    if (roleElement) roleElement.textContent = line2(pc.position, pc.roleId || user.roleId);
    return;
  }

  // base values first
  if (usernameElement) usernameElement.textContent = line1(user.employeeId, user.fullName || user.username, '');
  if (roleElement) roleElement.textContent = line2('', user.roleId);

  // enrich once — profile + role names fetched together, a single shared request set
  var token = AUTH.getToken();
  if (!token) return;
  if (!_profilePromise) {
    _profilePromise = Promise.all([
      API.post('getMyProfile', { token: token })
        .then(function (p) { if (p) _profileCache = p; return p; })
        .catch(function () { return null; }),
      loadRolesMap()
    ]).then(function (arr) { return arr[0]; });
  }
  _profilePromise.then(function (p) {
    var un = document.getElementById('currentUsername');
    var rl = document.getElementById('currentRole');
    // re-render even if the profile call returned nothing, so the role name (now loaded) shows
    if (un) un.textContent = line1((p && p.employeeId) || user.employeeId, (p && p.fullName) || user.fullName, p && p.department);
    if (rl) rl.textContent = line2(p && p.position, (p && p.roleId) || user.roleId);
  });

}


function navigateTo(page) {

  document
    .querySelectorAll(
      '.nav-item, .nav-subitem'
    )
    .forEach(item => {

      item.classList.toggle(
        'active',
        item.dataset.page === page
      );

    });


  switch (page) {

    case 'dashboard':

      loadDashboard();

      break;


    case 'users':

      loadUsers();

      break;


    case 'documents':
    case 'documents-activities':

      loadDocuments();

      break;

    case 'documents-dashboard':

      loadDcDashboard();

      break;

    case 'documents-reports':

      loadDcReports();

      break;

    case 'tqis':
    case 'tqis-activities':

      loadTqis();

      break;

    case 'tqis-dashboard':

      loadTqisDashboard();

      break;

    case 'tqis-reports':

      loadTqisReports();

      break;

    case 'training-courses':

      loadTrainingCourses();

      break;

    case 'training-records':

      loadTrainingRecords();

      break;


    default:

      loadComingSoon(page);

  }

}


function loadComingSoon(page) {

  const content =
    document.getElementById(
      'pageContent'
    );


  content.innerHTML = `

    <div class="empty-page">

      <div class="empty-icon">
        🚧
      </div>

      <h1>
        ${page}
      </h1>

      <p>
        This module is under development.
      </p>

    </div>

  `;

}


function setupSidebar() {

  const toggle =
    document.getElementById(
      'sidebarToggle'
    );


  const sidebar =
    document.getElementById(
      'sidebar'
    );


  if (!toggle || !sidebar) {
    return;
  }


  toggle.addEventListener(
    'click',
    () => {

      sidebar.classList.toggle(
        'collapsed'
      );

    }
  );

}

function setupLogout() {

  const logoutButton =
    document.getElementById(
      'logoutButton'
    );


  if (!logoutButton) {

    return;

  }


  logoutButton.addEventListener(
    'click',
    async () => {

      const confirmed =
        confirm(
          'Are you sure you want to logout?'
        );


      if (!confirmed) {

        return;

      }


      logoutButton.disabled =
        true;

      logoutButton.textContent =
        'Logging out...';


      try {

        await AUTH.logout();

      } catch (error) {

        console.error(
          'Logout error:',
          error
        );


        AUTH.clearSession();

        window.location.reload();

      }

    }
  );

}

function showSessionLoading() {

  const loading =
    document.getElementById(
      'sessionLoading'
    );


  if (loading) {

    loading.style.display =
      'flex';

  }

}


function hideSessionLoading() {

  const loading =
    document.getElementById(
      'sessionLoading'
    );


  if (loading) {

    loading.style.display =
      'none';

  }

}
