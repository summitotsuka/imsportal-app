const ROLE_LABELS = { R001: 'Administrator', R002: 'QMS Manager', R003: 'QMS Reviewer', R004: 'User', R005: 'HR', R006: 'Department Manager', R007: 'HR Manager', R008: 'HR Staff' };
const ROLE_NAME = { R001: 'ADMIN', R002: 'QMS_MANAGER', R003: 'QMS', R004: 'USER', R005: 'HR', R006: 'DEPT_MANAGER', R007: 'HR_MANAGER', R008: 'HR_STAFF' };

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

    console.warn(
      'Session validation failed:',
      error
    );


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

  if (usernameElement) usernameElement.textContent = line1(user.employeeId, user.fullName || user.username, '');
  if (roleElement) roleElement.textContent = line2('', user.roleId);

  // enrich with Department + Position from the profile
  try {
    API.post('getMyProfile', { token: AUTH.getToken() }).then(function (p) {
      if (!p) return;
      if (usernameElement) usernameElement.textContent = line1(p.employeeId || user.employeeId, p.fullName || user.fullName, p.department);
      if (roleElement) roleElement.textContent = line2(p.position, p.roleId || user.roleId);
    }).catch(function () { });
  } catch (e) { }

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

      loadDocuments();

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
