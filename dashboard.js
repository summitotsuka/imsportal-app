async function loadDashboard() {

  const content =
    document.getElementById('pageContent');

  if (!content) return;

  content.innerHTML = `
    <div class="page-header">

      <div>
        <h1>Dashboard</h1>
        <p>
          Integrated Management System
        </p>
      </div>

      <div class="dashboard-date">
        System Overview
      </div>

    </div>


    <section class="standard-grid">

      <div class="standard-card">

        <div class="standard-icon">
          Q
        </div>

        <div>
          <div class="standard-title">
            ISO 9001
          </div>

          <div class="standard-subtitle">
            Quality Management
          </div>
        </div>

        <div class="standard-score">
          94%
        </div>

      </div>


      <div class="standard-card">

        <div class="standard-icon">
          A
        </div>

        <div>
          <div class="standard-title">
            IATF 16949
          </div>

          <div class="standard-subtitle">
            Automotive Quality
          </div>
        </div>

        <div class="standard-score">
          92%
        </div>

      </div>


      <div class="standard-card">

        <div class="standard-icon">
          E
        </div>

        <div>
          <div class="standard-title">
            ISO 14001
          </div>

          <div class="standard-subtitle">
            Environmental Management
          </div>
        </div>

        <div class="standard-score">
          96%
        </div>

      </div>

    </section>


    <section class="stats-grid">

      <div class="stat-card">
        <span>Open NCR</span>
        <strong>12</strong>
      </div>

      <div class="stat-card">
        <span>Open CAPA</span>
        <strong>8</strong>
      </div>

      <div class="stat-card">
        <span>Audit Findings</span>
        <strong>5</strong>
      </div>

      <div class="stat-card">
        <span>Training Compliance</span>
        <strong>96%</strong>
      </div>

    </section>


    <section class="dashboard-grid">

      <div class="panel">

        <div class="panel-header">
          <h2>Open Actions</h2>

          <button class="link-button">
            View All
          </button>
        </div>

        <div class="action-list">

          <div class="action-row">
            <span class="action-id">
              NCR-2026-001
            </span>

            <span>
              Production
            </span>

            <span class="status status-open">
              Open
            </span>
          </div>

          <div class="action-row">
            <span class="action-id">
              CAPA-2026-008
            </span>

            <span>
              Quality
            </span>

            <span class="status status-progress">
              In Progress
            </span>
          </div>

          <div class="action-row">
            <span class="action-id">
              AUD-2026-014
            </span>

            <span>
              Purchasing
            </span>

            <span class="status status-open">
              Open
            </span>
          </div>

        </div>

      </div>


      <div class="panel">

        <div class="panel-header">

          <h2>
            Environmental Performance
          </h2>

        </div>

        <div class="environment-grid">

          <div>
            <span>Waste</span>
            <strong>92%</strong>
          </div>

          <div>
            <span>Energy</span>
            <strong>96%</strong>
          </div>

          <div>
            <span>Water</span>
            <strong>94%</strong>
          </div>

          <div>
            <span>Chemical</span>
            <strong>98%</strong>
          </div>

        </div>

      </div>

    </section>
  `;
}
