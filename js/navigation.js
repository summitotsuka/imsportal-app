const NAVIGATION = {

  items: [

    {
      id: 'dashboard',
      icon: '🏠',
      label: 'Dashboard'
    },

    {
      id: 'management-system',
      icon: '📋',
      label: 'Management System',
      children: [
        {
          id: 'iso9001',
          label: 'ISO 9001'
        },
        {
          id: 'iatf16949',
          label: 'IATF 16949'
        },
        {
          id: 'iso14001',
          label: 'ISO 14001'
        }
      ]
    },

    {
      id: 'documents',
      icon: '📄',
      label: 'Document Control'
    },

    {
      id: 'risk',
      icon: '⚠️',
      label: 'Risk & Opportunity'
    },

    {
      id: 'audit',
      icon: '🔍',
      label: 'Audit'
    },

    {
      id: 'ncr',
      icon: '❌',
      label: 'NCR / CAPA'
    },

    {
      id: 'training',
      icon: '🎓',
      label: 'Training & Competency'
    },

    {
      id: 'automotive',
      icon: '🏭',
      label: 'Automotive Core Tools'
    },

    {
      id: 'environment',
      icon: '🌱',
      label: 'Environmental'
    },

    {
      id: 'supplier',
      icon: '👥',
      label: 'Supplier'
    },

    {
      id: 'customer',
      icon: '👤',
      label: 'Customer'
    },

    {
      id: 'kpi',
      icon: '📊',
      label: 'KPI'
    },

    {
      id: 'management-review',
      icon: '📑',
      label: 'Management Review'
    },

    {
      id: 'admin',
      icon: '⚙️',
      label: 'Administration'
    }

  ]

};


function renderNavigation() {

  const container =
    document.getElementById('sidebarMenu');

  if (!container) return;

  container.innerHTML = '';

  NAVIGATION.items.forEach(item => {

    const wrapper =
      document.createElement('div');

    wrapper.className = 'nav-item-wrapper';

    const button =
      document.createElement('button');

    button.className = 'nav-item';

    button.dataset.page = item.id;

    button.innerHTML = `
      <span class="nav-icon">
        ${item.icon || ''}
      </span>

      <span class="nav-label">
        ${item.label}
      </span>

      ${
        item.children
          ? '<span class="nav-arrow">›</span>'
          : ''
      }
    `;

    button.addEventListener('click', () => {

      if (item.children) {

        wrapper.classList.toggle('expanded');

      } else {

        navigateTo(item.id);

      }

    });

    wrapper.appendChild(button);

    if (item.children) {

      const submenu =
        document.createElement('div');

      submenu.className = 'nav-submenu';

      item.children.forEach(child => {

        const childButton =
          document.createElement('button');

        childButton.className =
          'nav-subitem';

        childButton.dataset.page =
          child.id;

        childButton.textContent =
          child.label;

        childButton.addEventListener(
          'click',
          () => navigateTo(child.id)
        );

        submenu.appendChild(childButton);

      });

      wrapper.appendChild(submenu);
    }

    container.appendChild(wrapper);

  });

}
