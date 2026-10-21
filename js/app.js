/**
 * TechPeru SAC — Balanced Scorecard (BSC) 2025
 * Cliente Frontend conectado mediante peticiones HTTP fetch() a la API REST de Express
 */

(() => {
  "use strict";

  const SESSION_KEY = "bsc_techperu_session_2025";
  const API_BASE = ""; // Mismo origen (http://localhost:3000)

  // Helpers DOM
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  // Estado Global de la Aplicación (Alimentado por el Backend)
  let state = {
    company: { name: "TechPeru SAC", period: "2025" },
    globalAchievement: 84.2,
    globalStatus: "RIESGO",
    perspectives: [],
    objectives: [],
    kpis: [],
    initiatives: [],
    users: []
  };

  let currentUser = null;
  let currentPage = "dashboard";
  let activeCharts = {};

  // ==========================================================================
  // SERVICIO DE COMUNICACIÓN CON EL BACKEND (FETCH API)
  // ==========================================================================

  const api = {
    async getDashboard() {
      const res = await fetch(`${API_BASE}/api/dashboard`);
      if (!res.ok) throw new Error("Error obteniendo dashboard");
      return await res.json();
    },

    async getObjectives(params = {}) {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/api/objetivos${query ? '?' + query : ''}`);
      if (!res.ok) throw new Error("Error obteniendo objetivos");
      return await res.json();
    },

    async getKpis(params = {}) {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/api/kpis${query ? '?' + query : ''}`);
      if (!res.ok) throw new Error("Error obteniendo KPIs");
      return await res.json();
    },

    async getPerspectives() {
      const res = await fetch(`${API_BASE}/api/perspectivas`);
      if (!res.ok) throw new Error("Error obteniendo perspectivas");
      return await res.json();
    },

    async getInitiatives() {
      const res = await fetch(`${API_BASE}/api/iniciativas`);
      if (!res.ok) throw new Error("Error obteniendo iniciativas");
      return await res.json();
    },

    async postMeasurement(id, value) {
      const res = await fetch(`${API_BASE}/api/mediciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, value: Number(value) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error registrando medición");
      return data;
    },

    async resetData() {
      const res = await fetch(`${API_BASE}/api/reset`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error restableciendo datos");
      return data;
    },

    async saveWeights(weights) {
      const res = await fetch(`${API_BASE}/api/ponderaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weights })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error actualizando ponderaciones");
      return data;
    },

    async createObjective(obj) {
      const res = await fetch(`${API_BASE}/api/objetivos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creando objetivo");
      return data;
    },

    async updateObjective(id, obj) {
      const res = await fetch(`${API_BASE}/api/objetivos/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error actualizando objetivo");
      return data;
    },

    async deleteObjective(id) {
      const res = await fetch(`${API_BASE}/api/objetivos/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error eliminando objetivo");
      return data;
    },

    async createKpi(kpi) {
      const res = await fetch(`${API_BASE}/api/kpis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kpi)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creando KPI");
      return data;
    },

    async createInitiative(ini) {
      const res = await fetch(`${API_BASE}/api/iniciativas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ini)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creando iniciativa");
      return data;
    },

    async getUsers() {
      const res = await fetch(`${API_BASE}/api/usuarios`);
      if (!res.ok) throw new Error("Error obteniendo usuarios");
      return await res.json();
    }
  };

  // ==========================================================================
  // CARGA DE DATOS DESDE EL BACKEND
  // ==========================================================================

  async function syncStateFromBackend() {
    try {
      const [dash, objs, kpis, persps, inis, users] = await Promise.all([
        api.getDashboard(),
        api.getObjectives(),
        api.getKpis(),
        api.getPerspectives(),
        api.getInitiatives(),
        api.getUsers()
      ]);

      state.company = dash.company || { name: "TechPeru SAC", period: "2025" };
      state.globalAchievement = dash.globalAchievement;
      state.globalStatus = dash.globalStatus;
      state.perspectives = persps;
      state.objectives = objs;
      state.kpis = kpis;
      state.initiatives = inis;
      state.users = users;

      updateTopbarAndSidebar();
      return true;
    } catch (err) {
      console.warn("No se pudo conectar con el backend Express:", err.message);
      // Fallback a window.TECHPERU_DATA si no hay conexión HTTP al backend
      if (window.TECHPERU_DATA) {
        state = JSON.parse(JSON.stringify(window.TECHPERU_DATA));
        recalculateLocal();
        updateTopbarAndSidebar();
      }
      return false;
    }
  }

  function recalculateLocal() {
    // Cálculo local de respaldo
    state.kpis.forEach(k => {
      const m = Number(k.meta);
      const r = Number(k.real);
      let ach = k.isInverse ? (m / r) * 100 : (r / m) * 100;
      k.achievement = Math.round(ach * 10) / 10;
      k.status = k.achievement >= 90 ? 'LOGRADO' : k.achievement >= 75 ? 'RIESGO' : 'CRITICO';
    });

    state.objectives.forEach(obj => {
      const oKpis = state.kpis.filter(k => k.objectiveId === obj.id);
      if (oKpis.length > 0) {
        const sum = oKpis.reduce((acc, k) => acc + k.achievement, 0);
        obj.achievement = Math.round((sum / oKpis.length) * 10) / 10;
        obj.status = obj.achievement >= 90 ? 'LOGRADO' : obj.achievement >= 75 ? 'RIESGO' : 'CRITICO';
        obj.kpiCount = oKpis.length;
      }
    });

    state.perspectives.forEach(p => {
      const pKpis = state.kpis.filter(k => k.perspectiveId === p.id);
      if (pKpis.length > 0) {
        const sum = pKpis.reduce((acc, k) => acc + k.achievement, 0);
        p.achievement = Math.round((sum / pKpis.length) * 10) / 10;
        p.status = p.achievement >= 90 ? 'LOGRADO' : p.achievement >= 75 ? 'RIESGO' : 'CRITICO';
      }
    });

    const totalWeight = state.perspectives.reduce((acc, p) => acc + (p.weight || 25), 0);
    const weightedSum = state.perspectives.reduce((acc, p) => acc + (p.achievement * (p.weight || 25)), 0);
    state.globalAchievement = Math.round((weightedSum / (totalWeight || 100)) * 10) / 10;
    state.globalStatus = state.globalAchievement >= 90 ? 'LOGRADO' : state.globalAchievement >= 75 ? 'RIESGO' : 'CRITICO';
  }

  // ==========================================================================
  // GESTIÓN DE SESIÓN Y AUTENTICACIÓN
  // ==========================================================================

  function checkSession() {
    try {
      const sess = sessionStorage.getItem(SESSION_KEY);
      if (sess) {
        currentUser = JSON.parse(sess);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function setSession(user) {
    currentUser = user;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function clearSession() {
    currentUser = null;
    sessionStorage.removeItem(SESSION_KEY);
  }

  function initAuth() {
    const loginView = $("#loginView");
    const appView = $("#appView");
    const loginForm = $("#loginForm");
    const loginError = $("#loginError");

    if (checkSession()) {
      loginView.classList.add("hidden");
      appView.classList.remove("hidden");
      updateTopbarAndSidebar();
      navigateTo("dashboard");
    } else {
      loginView.classList.remove("hidden");
      appView.classList.add("hidden");
    }

    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $("#loginUser").value.trim().toLowerCase();
      const pass = $("#loginPass").value.trim();

      const found = state.users.find(u => u.email.toLowerCase() === email) || {
        id: "usr-1",
        name: "Lic. Carlos Mendoza",
        email: "admin@techperu.pe",
        role: "Administrador",
        title: "Director General & Estrategia",
        avatar: "CM"
      };

      if (pass === "admin123" || pass === "BSC2026!" || pass.length >= 4) {
        loginError.classList.add("hidden");
        setSession(found);
        loginView.classList.add("hidden");
        appView.classList.remove("hidden");
        updateTopbarAndSidebar();
        navigateTo("dashboard");
        toast(`Conectado al Backend: Bienvenido, ${found.name}`, "success");
      } else {
        loginError.classList.remove("hidden");
      }
    });

    // Botones de 1 clic para cuentas de prueba
    $$(".btn-demo-fill").forEach(btn => {
      btn.addEventListener("click", () => {
        const email = btn.dataset.user;
        const pass = btn.dataset.pass;
        $("#loginUser").value = email;
        $("#loginPass").value = pass;
        loginForm.dispatchEvent(new Event("submit"));
      });
    });

    // Cerrar sesión
    $("#logoutBtn").addEventListener("click", () => {
      clearSession();
      appView.classList.add("hidden");
      loginView.classList.remove("hidden");
      toast("Sesión cerrada.", "info");
    });

    // Selector rápido de rol en topbar
    const roleSelect = $("#roleSwitchSelect");
    if (roleSelect) {
      roleSelect.addEventListener("change", (e) => {
        const targetRole = e.target.value;
        const matchingUser = state.users.find(u => u.role === targetRole) || state.users[0];
        setSession(matchingUser);
        updateTopbarAndSidebar();
        toast(`Rol activo cambiado a: ${targetRole}`, "info");
        renderCurrentPage();
      });
    }
  }

  function updateTopbarAndSidebar() {
    if (!currentUser) return;

    // Sidebar User
    $("#sideUserName").textContent = currentUser.name;
    $("#sideUserRole").textContent = currentUser.title || currentUser.role;
    $("#sideUserAvatar").textContent = currentUser.avatar || "CM";

    // Topbar User
    $("#topUserName").textContent = currentUser.name;
    $("#topUserRole").textContent = currentUser.role;
    $("#topUserAvatar").textContent = currentUser.avatar || "CM";

    const roleSelect = $("#roleSwitchSelect");
    if (roleSelect && roleSelect.value !== currentUser.role) {
      roleSelect.value = currentUser.role;
    }

    // Sidebar Health Box
    $("#sidebarScore").textContent = `${state.globalAchievement}%`;
    const fill = $("#sidebarProgressFill");
    fill.style.width = `${Math.min(state.globalAchievement, 100)}%`;
    fill.className = `progress-bar-fill ${state.globalStatus === 'LOGRADO' ? 'good' : state.globalStatus === 'RIESGO' ? 'warn' : 'bad'}`;

    const badge = $("#sidebarStatusBadge");
    if (state.globalStatus === 'LOGRADO') {
      badge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Logrado`;
      badge.style.color = "var(--green)";
    } else if (state.globalStatus === 'RIESGO') {
      badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> En Riesgo`;
      badge.style.color = "var(--amber)";
    } else {
      badge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Crítico`;
      badge.style.color = "var(--red)";
    }

    // Actualizar Alertas Críticas
    updateCriticalAlertsDropdown();
  }

  function updateCriticalAlertsDropdown() {
    const criticalKpis = state.kpis.filter(k => k.status === "CRITICO").sort((a,b) => a.achievement - b.achievement);
    const badge = $("#criticalCountBadge");
    badge.textContent = criticalKpis.length;

    const list = $("#criticalDropdownList");
    if (criticalKpis.length === 0) {
      list.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--green);">
        <i class="fa-solid fa-circle-check" style="font-size: 24px; margin-bottom: 6px;"></i>
        <div>No hay indicadores críticos</div>
      </div>`;
      return;
    }

    list.innerHTML = criticalKpis.map(k => `
      <div class="crit-item" data-kpi-id="${k.id}">
        <div class="crit-item-title">
          <strong>${escapeHtml(k.name)}</strong>
          <small>${k.perspectiveId} · ${k.objectiveId} · Meta: ${k.meta} ${k.unit}</small>
        </div>
        <div style="text-align: right;">
          <span class="status-pill bad">${k.achievement}%</span>
          <small style="display:block; color:var(--text-muted); font-size:9px;">Real: ${k.real}</small>
        </div>
      </div>
    `).join("");

    $$(".crit-item", list).forEach(el => {
      el.addEventListener("click", () => {
        $("#criticalDropdown").classList.add("hidden");
        const kId = el.dataset.kpiId;
        navigateTo("simulador", { kpiId: kId });
      });
    });
  }

  // ==========================================================================
  // ENRUTAMIENTO SPA
  // ==========================================================================

  function navigateTo(pageId, params = {}) {
    currentPage = pageId;

    $$(".sidebar-nav .nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.page === pageId);
    });

    const pageTitles = {
      dashboard: "Dashboard Ejecutivo",
      mapa: "Mapa Estratégico Interactivo",
      objetivos: "Gestión de Objetivos Estratégicos",
      kpis: "Gestión de Indicadores KPI (Tablero)",
      simulador: "Registro de Resultados y Simulador What-If",
      iniciativas: "Portafolio de Iniciativas Estratégicas",
      reportes: "Reportes Ejecutivos y Exportación",
      administracion: "Administración y Configuración BSC"
    };

    $("#breadcrumbPage").textContent = pageTitles[pageId] || "Dashboard";
    $("#sidebar").classList.remove("open");
    destroyCharts();

    const content = $("#pageContent");
    content.scrollTop = 0;

    switch (pageId) {
      case "dashboard": renderDashboard(content); break;
      case "mapa": renderStrategyMap(content); break;
      case "objetivos": renderObjectives(content); break;
      case "kpis": renderKpis(content, params); break;
      case "simulador": renderSimulator(content, params); break;
      case "iniciativas": renderInitiatives(content); break;
      case "reportes": renderReports(content); break;
      case "administracion": renderAdmin(content); break;
      default: renderDashboard(content);
    }
  }

  function renderCurrentPage() {
    navigateTo(currentPage);
  }

  function destroyCharts() {
    Object.keys(activeCharts).forEach(key => {
      if (activeCharts[key]) {
        try { activeCharts[key].destroy(); } catch (e) {}
      }
    });
    activeCharts = {};
  }

  // ==========================================================================
  // MÓDULO 2: DASHBOARD EJECUTIVO
  // ==========================================================================

  function renderDashboard(container) {
    const kpis = state.kpis;
    const logrados = kpis.filter(k => k.status === "LOGRADO").length;
    const riesgo = kpis.filter(k => k.status === "RIESGO").length;
    const criticos = kpis.filter(k => k.status === "CRITICO").length;

    const criticalList = kpis
      .filter(k => k.status === "CRITICO")
      .sort((a,b) => a.achievement - b.achievement);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Dashboard Ejecutivo BSC · TechPeru SAC</h1>
          <p>Visión integral del desempeño estratégico 2025 conectado al servidor Node.js/Express.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-outline" id="btnRefreshDashboard"><i class="fa-solid fa-arrows-rotate"></i> Recargar del Backend</button>
          <button class="btn btn-soft" id="btnQuickSim"><i class="fa-solid fa-sliders"></i> Abrir Simulador</button>
          <button class="btn btn-primary" id="btnGoToReport"><i class="fa-solid fa-file-invoice"></i> Ver Reporte</button>
        </div>
      </div>

      <!-- Tarjetas KPI Globales -->
      <div class="metric-cards-grid">
        <div class="kpi-stat-card">
          <div class="kpi-stat-top">
            <span class="kpi-stat-label">CUMPLIMIENTO GLOBAL</span>
            <div class="kpi-stat-icon ${state.globalStatus === 'LOGRADO' ? 'green' : state.globalStatus === 'RIESGO' ? 'amber' : 'red'}">
              <i class="fa-solid fa-gauge-high"></i>
            </div>
          </div>
          <div class="kpi-stat-value" style="color: ${state.globalStatus === 'LOGRADO' ? 'var(--green)' : state.globalStatus === 'RIESGO' ? 'var(--amber)' : 'var(--red)'};">
            ${state.globalAchievement}%
          </div>
          <div class="kpi-stat-foot">
            <span class="status-pill ${state.globalStatus === 'LOGRADO' ? 'good' : state.globalStatus === 'RIESGO' ? 'warn' : 'bad'}">
              ${state.globalStatus === 'LOGRADO' ? '✅ Logrado (≥90%)' : state.globalStatus === 'RIESGO' ? '⚠️ En Riesgo (75-89%)' : '❌ Crítico (<75%)'}
            </span>
            <span class="muted">Meta: ≥ 90%</span>
          </div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-stat-top">
            <span class="kpi-stat-label">OBJETIVOS ESTRATÉGICOS</span>
            <div class="kpi-stat-icon blue">
              <i class="fa-solid fa-bullseye"></i>
            </div>
          </div>
          <div class="kpi-stat-value">${state.objectives.length}</div>
          <div class="kpi-stat-foot">
            <span class="muted">3 por cada perspectiva</span>
            <span class="status-pill good">100% Cobertura</span>
          </div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-stat-top">
            <span class="kpi-stat-label">TOTAL INDICADORES (KPIs)</span>
            <div class="kpi-stat-icon purple">
              <i class="fa-solid fa-chart-line"></i>
            </div>
          </div>
          <div class="kpi-stat-value">${kpis.length}</div>
          <div class="kpi-stat-foot">
            <span class="muted">API REST: /api/kpis</span>
            <span class="status-pill good">En Vivo</span>
          </div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-stat-top">
            <span class="kpi-stat-label">ESTADOS SEMAFÓRICOS</span>
            <div class="kpi-stat-icon amber">
              <i class="fa-solid fa-traffic-light"></i>
            </div>
          </div>
          <div class="kpi-stat-value" style="font-size: 20px; display:flex; gap: 8px; align-items:center;">
            <span style="color:var(--green);">${logrados} <small style="font-size:11px;">✅</small></span>
            <span style="color:var(--amber);">${riesgo} <small style="font-size:11px;">⚠️</small></span>
            <span style="color:var(--red);">${criticos} <small style="font-size:11px;">❌</small></span>
          </div>
          <div class="kpi-stat-foot">
            <span class="status-pill bad">${criticos} Críticos por atender</span>
            <span class="muted">${logrados} Logrados</span>
          </div>
        </div>
      </div>

      <!-- Gráficos Ejecutivos -->
      <div class="dashboard-charts-grid">
        <div class="card-panel">
          <div class="panel-header">
            <div>
              <h3>Desempeño Promedio por Perspectiva BSC</h3>
              <div class="panel-subtitle">Comparativa frente al umbral corporativo de logro (90%)</div>
            </div>
            <span class="status-pill ${state.globalStatus === 'LOGRADO' ? 'good' : state.globalStatus === 'RIESGO' ? 'warn' : 'bad'}">
              Promedio: ${state.globalAchievement}%
            </span>
          </div>
          <div class="chart-container">
            <canvas id="chartPerspectives"></canvas>
          </div>
        </div>

        <div class="card-panel">
          <div class="panel-header">
            <div>
              <h3>Distribución de Estados Semafóricos</h3>
              <div class="panel-subtitle">Proporción de los 36 KPIs según cumplimiento</div>
            </div>
            <span class="muted" style="font-weight:600; font-size:11px;">36 KPIs</span>
          </div>
          <div class="chart-container">
            <canvas id="chartStatus"></canvas>
          </div>
        </div>
      </div>

      <!-- Resumen por Perspectivas -->
      <div class="perspectives-summary-grid">
        ${state.perspectives.map(p => {
          const pKpis = state.kpis.filter(k => k.perspectiveId === p.id);
          const log = pKpis.filter(k => k.status === 'LOGRADO').length;
          const rie = pKpis.filter(k => k.status === 'RIESGO').length;
          const cri = pKpis.filter(k => k.status === 'CRITICO').length;
          return `
            <div class="persp-card ${p.key}" style="cursor:pointer;" data-persp-id="${p.id}">
              <div class="persp-card-header">
                <span class="persp-card-title">
                  <i class="fa-solid ${p.icon || 'fa-chart-pie'}"></i>
                  ${escapeHtml(p.name)}
                </span>
                <span class="persp-score" style="color:${p.color};">${p.achievement}%</span>
              </div>
              <div class="progress-bar-wrap">
                <div class="progress-bar-fill ${p.status === 'LOGRADO' ? 'good' : p.status === 'RIESGO' ? 'warn' : 'bad'}" style="width: ${Math.min(p.achievement, 100)}%;"></div>
              </div>
              <div class="persp-meta">
                <span>Ponderación: ${p.weight}%</span>
                <span>9 KPIs</span>
              </div>
              <div class="persp-dots-counter">
                <span class="status-pill good" style="font-size:9px; padding:2px 6px;">${log} ✅</span>
                <span class="status-pill warn" style="font-size:9px; padding:2px 6px;">${rie} ⚠️</span>
                <span class="status-pill bad" style="font-size:9px; padding:2px 6px;">${cri} ❌</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>

      <!-- Tabla de Atención Inmediata: Indicadores Críticos -->
      <div class="urgent-table-wrap">
        <div class="urgent-table-header">
          <strong>
            <i class="fa-solid fa-triangle-exclamation"></i>
            TABLA DE ATENCIÓN INMEDIATA — 6 INDICADORES EN ESTADO CRÍTICO (&lt; 75%)
          </strong>
          <span class="status-pill bad" style="background:#ffffff;">Requieren Acción Correctiva</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Indicador Crítico</th>
                <th>Perspectiva</th>
                <th>Meta</th>
                <th>Real Actual</th>
                <th>% Cumpl.</th>
                <th>Semáforo</th>
                <th>Análisis y Acción Recomendada (TechPeru SAC)</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              ${criticalList.map(k => `
                <tr>
                  <td><span class="obj-code-badge" style="background:var(--red);">${k.id}</span></td>
                  <td class="kpi-title-cell">
                    <strong>${escapeHtml(k.name)}</strong>
                    <small>${k.objectiveId}: ${k.objectiveName}</small>
                  </td>
                  <td>
                    <span class="persp-pill ${k.perspectiveKey}" style="font-size:10px; padding:3px 8px;">
                      ${k.perspectiveId}
                    </span>
                  </td>
                  <td><strong>${k.meta}</strong> <span class="muted">${k.unit}</span></td>
                  <td style="color:var(--red); font-weight:700;">${k.real} <span class="muted">${k.unit}</span></td>
                  <td>
                    <strong style="color:var(--red); font-size:14px;">${k.achievement}%</strong>
                  </td>
                  <td><span class="status-pill bad">❌ CRÍTICO</span></td>
                  <td style="max-width:340px; white-space:normal; font-size:11px; line-height:1.4;">
                    ${escapeHtml(k.analysis || 'Requiere intervención inmediata')}
                  </td>
                  <td>
                    <button class="btn btn-sm btn-primary btn-sim-kpi" data-kpi-id="${k.id}">
                      <i class="fa-solid fa-sliders"></i> Simular / Corregir
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Eventos
    $("#btnRefreshDashboard").addEventListener("click", async () => {
      await syncStateFromBackend();
      renderDashboard(container);
      toast("Dashboard sincronizado con el backend Express.", "info");
    });

    $("#btnQuickSim").addEventListener("click", () => navigateTo("simulador"));
    $("#btnGoToReport").addEventListener("click", () => navigateTo("reportes"));

    $$(".persp-card", container).forEach(card => {
      card.addEventListener("click", () => {
        const pId = card.dataset.perspId;
        navigateTo("kpis", { perspectiveId: pId });
      });
    });

    $$(".btn-sim-kpi", container).forEach(btn => {
      btn.addEventListener("click", () => {
        const kId = btn.dataset.kpiId;
        navigateTo("simulador", { kpiId: kId });
      });
    });

    initDashboardCharts();
  }

  function initDashboardCharts() {
    if (typeof Chart === "undefined") return;

    const ctxBar = $("#chartPerspectives");
    if (ctxBar) {
      const pLabels = state.perspectives.map(p => p.name.replace("Perspectiva ", ""));
      const pValues = state.perspectives.map(p => p.achievement);
      const pColors = state.perspectives.map(p => p.color || "#2563eb");

      activeCharts.perspectives = new Chart(ctxBar, {
        type: "bar",
        data: {
          labels: pLabels,
          datasets: [{
            label: "% Cumplimiento Real",
            data: pValues,
            backgroundColor: pColors,
            borderRadius: 6,
            barThickness: 38
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: ctx => `Cumplimiento: ${ctx.parsed.y}%` }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 110,
              ticks: { callback: v => `${v}%`, font: { size: 10 } },
              grid: { color: "#f1f5f9" }
            },
            x: {
              ticks: { font: { size: 11, weight: "bold" } },
              grid: { display: false }
            }
          }
        }
      });
    }

    const ctxPie = $("#chartStatus");
    if (ctxPie) {
      const logrados = state.kpis.filter(k => k.status === "LOGRADO").length;
      const riesgo = state.kpis.filter(k => k.status === "RIESGO").length;
      const criticos = state.kpis.filter(k => k.status === "CRITICO").length;

      activeCharts.status = new Chart(ctxPie, {
        type: "doughnut",
        data: {
          labels: ["Logrado (≥90%)", "En Riesgo (75-89%)", "Crítico (<75%)"],
          datasets: [{
            data: [logrados, riesgo, criticos],
            backgroundColor: ["#16a34a", "#d97706", "#dc2626"],
            borderWidth: 2,
            borderColor: "#ffffff"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "68%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 12, font: { size: 11 }, padding: 14 }
            }
          }
        }
      });
    }
  }

  // ==========================================================================
  // MÓDULO 3: MAPA ESTRATÉGICO INTERACTIVO
  // ==========================================================================

  function renderStrategyMap(container) {
    const perspectiveOrder = ["FIN", "CLI", "PROC", "APR"];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Mapa Estratégico Interactivo · TechPeru SAC 2025</h1>
          <p>Relaciones causa-efecto Kaplan & Norton conectadas con los datos del servidor Express.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-outline" id="btnSimFromMap"><i class="fa-solid fa-sliders"></i> Probar en Simulador</button>
        </div>
      </div>

      <div class="card-panel" style="background:#f8fafc; border:1px solid #cbd5e1; margin-bottom:18px;">
        <div style="display:flex; align-items:center; gap:12px; font-size:12px; color:var(--text-body);">
          <i class="fa-solid fa-circle-info" style="font-size:18px; color:var(--blue-primary);"></i>
          <span>
            <strong>Dinámica Causa-Efecto:</strong> Haz clic en cualquier <strong>nodo de objetivo</strong> para ver sus 3 KPIs asociados, metas, valores reales y plan correctivo.
          </span>
        </div>
      </div>

      <div class="strategy-map-container">
        ${perspectiveOrder.map((code, idx) => {
          const p = state.perspectives.find(item => item.id === code);
          const pObjectives = state.objectives.filter(o => o.perspectiveId === code);
          const isTop = idx === 0;

          return `
            ${!isTop ? `
              <div class="cause-effect-connector">
                <i class="fa-solid fa-arrow-up-long"></i>
                <span>Relación de Causa y Efecto (Impulsa a la perspectiva superior)</span>
                <i class="fa-solid fa-arrow-up-long"></i>
              </div>
            ` : ''}

            <div class="map-layer">
              <div class="map-layer-header">
                <div class="map-layer-title ${p ? p.key : 'fin'}">
                  <i class="fa-solid ${p ? p.icon : 'fa-layer-group'}"></i>
                  <span>${escapeHtml(p ? p.name.toUpperCase() : code)}</span>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                  <span class="status-pill ${p && p.status === 'LOGRADO' ? 'good' : p && p.status === 'RIESGO' ? 'warn' : 'bad'}">
                    Desempeño: ${p ? p.achievement : 0}%
                  </span>
                  <span class="map-layer-weight">Ponderación: ${p ? p.weight : 25}%</span>
                </div>
              </div>

              <div class="map-objectives-row">
                ${pObjectives.map(obj => {
                  const objKpis = state.kpis.filter(k => k.objectiveId === obj.id);
                  const log = objKpis.filter(k => k.status === 'LOGRADO').length;
                  const rie = objKpis.filter(k => k.status === 'RIESGO').length;
                  const cri = objKpis.filter(k => k.status === 'CRITICO').length;

                  return `
                    <div class="map-obj-node" data-obj-id="${obj.id}">
                      <div class="map-obj-top">
                        <span class="obj-code-badge">${obj.id}</span>
                        <span class="status-pill ${obj.status === 'LOGRADO' ? 'good' : obj.status === 'RIESGO' ? 'warn' : 'bad'}">
                          ${obj.achievement}%
                        </span>
                      </div>
                      <div class="map-obj-title">${escapeHtml(obj.name)}</div>
                      <div class="map-obj-foot">
                        <div class="map-kpi-meters" title="3 KPIs: ${log} Logrados, ${rie} En Riesgo, ${cri} Críticos">
                          ${objKpis.map(k => `
                            <span class="dot-status ${k.status === 'LOGRADO' ? 'good' : k.status === 'RIESGO' ? 'warn' : 'bad'}" title="${k.name}: ${k.achievement}%"></span>
                          `).join("")}
                        </div>
                        <span style="font-weight:600;"><i class="fa-solid fa-eye"></i> Ver detalle</span>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    $("#btnSimFromMap").addEventListener("click", () => navigateTo("simulador"));

    $$(".map-obj-node", container).forEach(node => {
      node.addEventListener("click", () => {
        openObjectiveDetailModal(node.dataset.objId);
      });
    });
  }

  function openObjectiveDetailModal(objId) {
    const obj = state.objectives.find(o => o.id === objId);
    if (!obj) return;

    const p = state.perspectives.find(item => item.id === obj.perspectiveId) || { name: obj.perspectiveId };
    const objKpis = state.kpis.filter(k => k.objectiveId === obj.id);

    showModal({
      eyebrow: `${p.name.toUpperCase()} · ${obj.id}`,
      title: obj.name,
      body: `
        <div style="margin-bottom: 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div>
              <strong>Responsable:</strong> <span class="muted">${escapeHtml(obj.owner || 'Gerencia General')}</span>
            </div>
            <span class="status-pill ${obj.status === 'LOGRADO' ? 'good' : obj.status === 'RIESGO' ? 'warn' : 'bad'}" style="font-size:12px; padding:5px 12px;">
              Cumplimiento Promedio: ${obj.achievement}%
            </span>
          </div>
          <p class="muted" style="margin-top:0;">${escapeHtml(obj.description)}</p>
        </div>

        <h4 style="margin-bottom: 12px; font-size:14px;"><i class="fa-solid fa-chart-simple"></i> Indicadores (KPIs) Asociados al Objetivo</h4>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>KPI</th>
                <th>Meta</th>
                <th>Real</th>
                <th>% Cumpl.</th>
                <th>Estado</th>
                <th>Acción Recomendada</th>
                <th>Operación</th>
              </tr>
            </thead>
            <tbody>
              ${objKpis.map(k => `
                <tr>
                  <td class="kpi-title-cell">
                    <strong>${escapeHtml(k.name)}</strong>
                    <small>${k.isInverse ? 'KPI Inverso (menor es mejor)' : 'KPI Directo (mayor es mejor)'}</small>
                  </td>
                  <td>${k.meta} ${k.unit}</td>
                  <td style="font-weight:700;">${k.real} ${k.unit}</td>
                  <td><strong>${k.achievement}%</strong></td>
                  <td>
                    <span class="status-pill ${k.status === 'LOGRADO' ? 'good' : k.status === 'RIESGO' ? 'warn' : 'bad'}">
                      ${k.status === 'LOGRADO' ? '✅ Logrado' : k.status === 'RIESGO' ? '⚠️ En Riesgo' : '❌ Crítico'}
                    </span>
                  </td>
                  <td style="max-width:240px; white-space:normal; font-size:11px;">
                    ${escapeHtml(k.analysis || 'En seguimiento')}
                  </td>
                  <td>
                    <button class="btn btn-sm btn-soft btn-modal-sim" data-kpi-id="${k.id}">
                      <i class="fa-solid fa-sliders"></i> Simular
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `,
      footer: `
        <button class="btn btn-outline" id="modalBtnClose">Cerrar</button>
      `
    });

    $("#modalBtnClose").addEventListener("click", closeModal);

    $$(".btn-modal-sim").forEach(b => {
      b.addEventListener("click", () => {
        const kId = b.dataset.kpiId;
        closeModal();
        navigateTo("simulador", { kpiId: kId });
      });
    });
  }

  // ==========================================================================
  // MÓDULO 4: GESTIÓN DE OBJETIVOS ESTRATÉGICOS (CRUD CON API)
  // ==========================================================================

  function renderObjectives(container) {
    let currentFilter = "TODAS";
    let searchTxt = "";

    function getFilteredList() {
      return state.objectives.filter(obj => {
        const matchPersp = currentFilter === "TODAS" || obj.perspectiveId === currentFilter;
        const matchSearch = !searchTxt || obj.name.toLowerCase().includes(searchTxt) || obj.id.toLowerCase().includes(searchTxt);
        return matchPersp && matchSearch;
      });
    }

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Gestión de Objetivos Estratégicos (12 Objetivos)</h1>
          <p>Catálogo centralizado de objetivos estratégicos conectados mediante la API REST (GET, POST, PUT, DELETE /api/objetivos).</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="btnNewObjective"><i class="fa-solid fa-plus"></i> Nuevo Objetivo</button>
        </div>
      </div>

      <div class="card-panel">
        <div class="table-toolbar">
          <div class="filter-pills-bar" id="objFilterPills">
            <button class="pill-filter-btn active" data-filter="TODAS">Todos (${state.objectives.length})</button>
            <button class="pill-filter-btn" data-filter="FIN">Financiera (3)</button>
            <button class="pill-filter-btn" data-filter="CLI">Clientes (3)</button>
            <button class="pill-filter-btn" data-filter="PROC">Procesos (3)</button>
            <button class="pill-filter-btn" data-filter="APR">Aprendizaje (3)</button>
          </div>

          <div class="search-box-wrap">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="objSearchInput" placeholder="Buscar por código o nombre...">
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table" id="tableObjectives">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre del Objetivo Estratégico</th>
                <th>Perspectiva</th>
                <th>Responsable</th>
                <th>KPIs Asoc.</th>
                <th>% Cumplimiento</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="objTableBody">
              <!-- Renderizado dinámico -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    function updateTable() {
      const list = getFilteredList();
      const tbody = $("#objTableBody");
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">No se encontraron objetivos coincidentes.</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map(obj => {
        const p = state.perspectives.find(item => item.id === obj.perspectiveId) || { key: 'fin', name: obj.perspectiveId };
        return `
          <tr>
            <td><span class="obj-code-badge">${obj.id}</span></td>
            <td class="kpi-title-cell">
              <strong>${escapeHtml(obj.name)}</strong>
              <small>${escapeHtml(obj.description || '')}</small>
            </td>
            <td>
              <span class="persp-pill ${p.key}" style="font-size:10px; padding:3px 8px;">
                ${p.name.replace('Perspectiva ', '')}
              </span>
            </td>
            <td>${escapeHtml(obj.owner || 'Dirección')}</td>
            <td><strong>${obj.kpiCount || 3} KPIs</strong></td>
            <td>
              <strong style="font-size:13px; color:${obj.status === 'LOGRADO' ? 'var(--green)' : obj.status === 'RIESGO' ? 'var(--amber)' : 'var(--red)'};">
                ${obj.achievement}%
              </strong>
            </td>
            <td>
              <span class="status-pill ${obj.status === 'LOGRADO' ? 'good' : obj.status === 'RIESGO' ? 'warn' : 'bad'}">
                ${obj.status === 'LOGRADO' ? '✅ Logrado' : obj.status === 'RIESGO' ? '⚠️ En Riesgo' : '❌ Crítico'}
              </span>
            </td>
            <td>
              <div class="table-actions">
                <button class="btn-table-action btn-view-obj" data-id="${obj.id}" title="Ver Detalle y KPIs"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-table-action btn-edit-obj" data-id="${obj.id}" title="Editar Objetivo"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="btn-table-action btn-del-obj" data-id="${obj.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `;
      }).join("");

      $$(".btn-view-obj", tbody).forEach(b => {
        b.addEventListener("click", () => openObjectiveDetailModal(b.dataset.id));
      });

      $$(".btn-edit-obj", tbody).forEach(b => {
        b.addEventListener("click", () => openEditObjectiveModal(b.dataset.id));
      });

      $$(".btn-del-obj", tbody).forEach(b => {
        b.addEventListener("click", () => confirmDeleteObjective(b.dataset.id));
      });
    }

    $$("#objFilterPills .pill-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        $$("#objFilterPills .pill-filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        updateTable();
      });
    });

    $("#objSearchInput").addEventListener("input", (e) => {
      searchTxt = e.target.value.trim().toLowerCase();
      updateTable();
    });

    $("#btnNewObjective").addEventListener("click", () => openCreateObjectiveModal());

    updateTable();
  }

  function openCreateObjectiveModal() {
    showModal({
      eyebrow: "BACKEND API: POST /api/objetivos",
      title: "Crear Objetivo Estratégico",
      body: `
        <form id="formNewObj">
          <div class="form-group">
            <label for="newObjCode">Código de Objetivo *</label>
            <input type="text" id="newObjCode" required class="input-icon-wrap" style="padding:10px;" placeholder="Ej. OBJ-F4" value="OBJ-${Date.now().toString().slice(-3)}">
          </div>
          <div class="form-group">
            <label for="newObjName">Nombre del Objetivo Estratégico *</label>
            <input type="text" id="newObjName" required class="input-icon-wrap" style="padding:10px;" placeholder="Ej. Expandir operaciones en el sur del país">
          </div>
          <div class="form-group">
            <label for="newObjPersp">Perspectiva BSC *</label>
            <select id="newObjPersp" class="filter-select" style="width:100%;">
              <option value="FIN">Perspectiva Financiera</option>
              <option value="CLI">Perspectiva del Cliente</option>
              <option value="PROC">Perspectiva de Procesos Internos</option>
              <option value="APR">Perspectiva de Aprendizaje y Crecimiento</option>
            </select>
          </div>
          <div class="form-group">
            <label for="newObjOwner">Responsable *</label>
            <input type="text" id="newObjOwner" required class="input-icon-wrap" style="padding:10px;" value="${currentUser ? currentUser.name : 'Lic. Carlos Mendoza'}">
          </div>
          <div class="form-group">
            <label for="newObjDesc">Descripción Estratégica</label>
            <textarea id="newObjDesc" rows="3" style="width:100%; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:10px;" placeholder="Explica el impacto de este objetivo..."></textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" id="modalBtnCancel">Cancelar</button>
        <button class="btn btn-primary" id="modalBtnSaveObj">Crear en el Servidor</button>
      `
    });

    $("#modalBtnCancel").addEventListener("click", closeModal);
    $("#modalBtnSaveObj").addEventListener("click", async () => {
      const code = $("#newObjCode").value.trim().toUpperCase();
      const name = $("#newObjName").value.trim();
      const persp = $("#newObjPersp").value;
      const owner = $("#newObjOwner").value.trim();
      const desc = $("#newObjDesc").value.trim();

      if (!code || !name) {
        toast("Por favor completa los campos obligatorios.", "error");
        return;
      }

      try {
        await api.createObjective({ id: code, name, perspectiveId: persp, owner, description: desc });
        await syncStateFromBackend();
        closeModal();
        toast(`Objetivo ${code} creado en el servidor Node.js/Express.`, "success");
        renderObjectives($("#pageContent"));
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }

  function openEditObjectiveModal(objId) {
    const obj = state.objectives.find(o => o.id === objId);
    if (!obj) return;

    showModal({
      eyebrow: "BACKEND API: PUT /api/objetivos/:id",
      title: `Editar ${obj.id}`,
      body: `
        <form id="formEditObj">
          <div class="form-group">
            <label>Código (Identificador)</label>
            <input type="text" disabled value="${obj.id}" style="background:var(--bg-app); padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-md);">
          </div>
          <div class="form-group">
            <label for="editObjName">Nombre del Objetivo *</label>
            <input type="text" id="editObjName" required value="${escapeHtml(obj.name)}" style="padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-md); width:100%;">
          </div>
          <div class="form-group">
            <label for="editObjOwner">Responsable *</label>
            <input type="text" id="editObjOwner" required value="${escapeHtml(obj.owner || '')}" style="padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-md); width:100%;">
          </div>
          <div class="form-group">
            <label for="editObjDesc">Descripción Estratégica</label>
            <textarea id="editObjDesc" rows="3" style="width:100%; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:10px;">${escapeHtml(obj.description || '')}</textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" id="modalBtnCancel">Cancelar</button>
        <button class="btn btn-primary" id="modalBtnUpdateObj">Guardar en el Servidor</button>
      `
    });

    $("#modalBtnCancel").addEventListener("click", closeModal);
    $("#modalBtnUpdateObj").addEventListener("click", async () => {
      const name = $("#editObjName").value.trim();
      const owner = $("#editObjOwner").value.trim();
      const desc = $("#editObjDesc").value.trim();

      if (!name) {
        toast("El nombre no puede estar vacío.", "error");
        return;
      }

      try {
        await api.updateObjective(obj.id, { name, owner, description: desc });
        await syncStateFromBackend();
        closeModal();
        toast(`Objetivo ${obj.id} actualizado en el servidor.`, "success");
        renderObjectives($("#pageContent"));
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }

  function confirmDeleteObjective(objId) {
    const kpisLinked = state.kpis.filter(k => k.objectiveId === objId);
    let warning = "";
    if (kpisLinked.length > 0) {
      warning = `<div class="alert-box error" style="margin-top:12px;">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>Atención: Este objetivo tiene <strong>${kpisLinked.length} KPIs asociados</strong>.</span>
      </div>`;
    }

    showModal({
      eyebrow: "BACKEND API: DELETE /api/objetivos/:id",
      title: `¿Eliminar Objetivo ${objId}?`,
      body: `
        <p>¿Estás seguro de que deseas eliminar este objetivo del servidor backend?</p>
        <div style="background:var(--bg-app); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-color);">
          <strong>${objId}:</strong> ${escapeHtml(state.objectives.find(o => o.id === objId)?.name || '')}
        </div>
        ${warning}
      `,
      footer: `
        <button class="btn btn-outline" id="modalBtnCancel">Cancelar</button>
        <button class="btn btn-primary" style="background:var(--red); border-color:var(--red);" id="modalBtnConfirmDel">Eliminar en el Servidor</button>
      `
    });

    $("#modalBtnCancel").addEventListener("click", closeModal);
    $("#modalBtnConfirmDel").addEventListener("click", async () => {
      try {
        await api.deleteObjective(objId);
        await syncStateFromBackend();
        closeModal();
        toast(`Objetivo ${objId} eliminado del servidor backend.`, "info");
        renderObjectives($("#pageContent"));
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }

  // ==========================================================================
  // MÓDULO 5: GESTIÓN DE INDICADORES KPI (TABLERO DE CONTROL)
  // ==========================================================================

  function renderKpis(container, params = {}) {
    let filterPersp = params.perspectiveId || "TODAS";
    let filterStatus = "TODOS";
    let filterResp = "TODOS";
    let filterDir = "TODOS";
    let searchTxt = "";

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Tablero de Control de Indicadores (36 KPIs)</h1>
          <p>Supervisión detallada de metas y valores reales alimentados por el endpoint <code>GET /api/kpis</code>.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-soft" id="btnGoToSimFromKpi"><i class="fa-solid fa-sliders"></i> Simulador What-If</button>
          <button class="btn btn-primary" id="btnNewKpi"><i class="fa-solid fa-plus"></i> Nuevo Indicador</button>
        </div>
      </div>

      <div class="card-panel">
        <div class="table-toolbar">
          <div class="search-box-wrap">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="kpiSearchInput" placeholder="Buscar por nombre, código, objetivo o análisis...">
          </div>

          <select class="filter-select" id="filterPerspSelect">
            <option value="TODAS">Perspectiva: Todas</option>
            <option value="FIN" ${filterPersp === 'FIN' ? 'selected' : ''}>Financiera (FIN)</option>
            <option value="CLI" ${filterPersp === 'CLI' ? 'selected' : ''}>Clientes (CLI)</option>
            <option value="PROC" ${filterPersp === 'PROC' ? 'selected' : ''}>Procesos Internos (PROC)</option>
            <option value="APR" ${filterPersp === 'APR' ? 'selected' : ''}>Aprendizaje (APR)</option>
          </select>

          <select class="filter-select" id="filterStatusSelect">
            <option value="TODOS">Semáforo: Todos</option>
            <option value="LOGRADO">✅ Logrado (≥90%)</option>
            <option value="RIESGO">⚠️ En Riesgo (75-89%)</option>
            <option value="CRITICO">❌ Crítico (&lt;75%)</option>
          </select>

          <select class="filter-select" id="filterRespSelect">
            <option value="TODOS">Responsable: Todos</option>
            <option value="Carlos Mendoza">Lic. Carlos Mendoza</option>
            <option value="Patricia Vargas">Ing. Patricia Vargas</option>
            <option value="Fernando Soto">Ing. Fernando Soto</option>
            <option value="Andrea Rivas">Mg. Andrea Rivas</option>
          </select>

          <select class="filter-select" id="filterDirSelect">
            <option value="TODOS">Dirección: Todas</option>
            <option value="direct">Directo (Mayor es mejor)</option>
            <option value="inverse">Inverso (Menor es mejor)</option>
          </select>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:11px; color:var(--text-muted);">
          <span id="kpiCountLabel">Mostrando 36 de 36 KPIs</span>
          <span>Lectura: Verde ≥ 90% | Amarillo 75-89% | Rojo &lt; 75%</span>
        </div>

        <div class="table-responsive">
          <table class="data-table" id="tableKpis">
            <thead>
              <tr>
                <th>Código</th>
                <th>Indicador (KPI)</th>
                <th>Perspectiva</th>
                <th>Objetivo Vinculado</th>
                <th>Meta 2025</th>
                <th>Real Acum.</th>
                <th>Dirección</th>
                <th>% Cumpl.</th>
                <th>Estado</th>
                <th>Responsable</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="kpiTableBody">
              <!-- Renderizado dinámico -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    function getFilteredKpis() {
      return state.kpis.filter(k => {
        const matchPersp = filterPersp === "TODAS" || k.perspectiveId === filterPersp;
        const matchStatus = filterStatus === "TODOS" || k.status === filterStatus;
        const matchResp = filterResp === "TODOS" || k.responsible.includes(filterResp);
        const matchDir = filterDir === "TODOS" || (filterDir === "inverse" ? k.isInverse : !k.isInverse);
        const matchSearch = !searchTxt || 
          k.name.toLowerCase().includes(searchTxt) || 
          k.id.toLowerCase().includes(searchTxt) || 
          k.objectiveId.toLowerCase().includes(searchTxt) || 
          (k.analysis && k.analysis.toLowerCase().includes(searchTxt));
        return matchPersp && matchStatus && matchResp && matchDir && matchSearch;
      });
    }

    function updateKpiTable() {
      const list = getFilteredKpis();
      $("#kpiCountLabel").textContent = `Mostrando ${list.length} de ${state.kpis.length} KPIs`;
      const tbody = $("#kpiTableBody");

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px; color:var(--text-muted);">No se encontraron KPIs con los filtros seleccionados.</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map(k => `
        <tr>
          <td><span class="obj-code-badge">${k.id}</span></td>
          <td class="kpi-title-cell">
            <strong>${escapeHtml(k.name)}</strong>
            <small>${k.analysis ? escapeHtml(k.analysis.slice(0, 70) + '...') : ''}</small>
          </td>
          <td>
            <span class="persp-pill ${k.perspectiveKey}" style="font-size:10px; padding:3px 8px;">
              ${k.perspectiveId}
            </span>
          </td>
          <td><strong style="color:var(--text-muted);">${k.objectiveId}</strong></td>
          <td><strong>${k.meta}</strong> <span class="muted">${k.unit}</span></td>
          <td style="font-weight:700; color:var(--text-main);">${k.real} <span class="muted">${k.unit}</span></td>
          <td>
            <span class="dir-indicator ${k.isInverse ? 'inverse' : ''}" title="${k.isInverse ? 'KPI Inverso: Menor valor es mejor (Meta/Real*100)' : 'KPI Directo: Mayor valor es mejor (Real/Meta*100)'}">
              <i class="fa-solid ${k.isInverse ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
              ${k.isInverse ? 'Menor es mejor' : 'Mayor es mejor'}
            </span>
          </td>
          <td>
            <strong style="font-size:13px; color:${k.status === 'LOGRADO' ? 'var(--green)' : k.status === 'RIESGO' ? 'var(--amber)' : 'var(--red)'};">
              ${k.achievement}%
            </strong>
          </td>
          <td>
            <span class="status-pill ${k.status === 'LOGRADO' ? 'good' : k.status === 'RIESGO' ? 'warn' : 'bad'}">
              ${k.status === 'LOGRADO' ? '✅ Logrado' : k.status === 'RIESGO' ? '⚠️ En Riesgo' : '❌ Crítico'}
            </span>
          </td>
          <td><small>${escapeHtml(k.responsible)}</small></td>
          <td>
            <div class="table-actions">
              <button class="btn-table-action btn-sim-this-kpi" data-id="${k.id}" title="Actualizar / Simular Valor"><i class="fa-solid fa-sliders"></i></button>
              <button class="btn-table-action btn-kpi-card" data-id="${k.id}" title="Ver Ficha Técnica"><i class="fa-solid fa-file-lines"></i></button>
            </div>
          </td>
        </tr>
      `).join("");

      $$(".btn-sim-this-kpi", tbody).forEach(b => {
        b.addEventListener("click", () => navigateTo("simulador", { kpiId: b.dataset.id }));
      });

      $$(".btn-kpi-card", tbody).forEach(b => {
        b.addEventListener("click", () => openKpiDetailModal(b.dataset.id));
      });
    }

    $("#filterPerspSelect").addEventListener("change", (e) => { filterPersp = e.target.value; updateKpiTable(); });
    $("#filterStatusSelect").addEventListener("change", (e) => { filterStatus = e.target.value; updateKpiTable(); });
    $("#filterRespSelect").addEventListener("change", (e) => { filterResp = e.target.value; updateKpiTable(); });
    $("#filterDirSelect").addEventListener("change", (e) => { filterDir = e.target.value; updateKpiTable(); });
    $("#kpiSearchInput").addEventListener("input", (e) => { searchTxt = e.target.value.trim().toLowerCase(); updateKpiTable(); });

    $("#btnGoToSimFromKpi").addEventListener("click", () => navigateTo("simulador"));
    $("#btnNewKpi").addEventListener("click", () => openCreateKpiModal());

    updateKpiTable();
  }

  function openKpiDetailModal(kpiId) {
    const kpi = state.kpis.find(k => k.id === kpiId);
    if (!kpi) return;

    showModal({
      eyebrow: `FICHA TÉCNICA · ${kpi.id}`,
      title: kpi.name,
      body: `
        <div class="kpi-preview-box" style="margin-top:0;">
          <div class="kpi-preview-grid">
            <div class="preview-field">
              <small>PERSPECTIVA</small>
              <strong>${kpi.perspectiveId} (${kpi.perspectiveKey.toUpperCase()})</strong>
            </div>
            <div class="preview-field">
              <small>OBJETIVO VINCULADO</small>
              <strong>${kpi.objectiveId}: ${escapeHtml(kpi.objectiveName || '')}</strong>
            </div>
            <div class="preview-field">
              <small>RESPONSABLE</small>
              <strong>${escapeHtml(kpi.responsible)}</strong>
            </div>
          </div>
          <div class="kpi-preview-grid">
            <div class="preview-field">
              <small>META ANUAL 2025</small>
              <strong style="color:var(--navy-blue);">${kpi.meta} ${kpi.unit}</strong>
            </div>
            <div class="preview-field">
              <small>REAL ACUMULADO</small>
              <strong style="color:${kpi.status === 'LOGRADO' ? 'var(--green)' : kpi.status === 'RIESGO' ? 'var(--amber)' : 'var(--red)'};">${kpi.real} ${kpi.unit}</strong>
            </div>
            <div class="preview-field">
              <small>% CUMPLIMIENTO</small>
              <strong style="font-size:18px;">${kpi.achievement}% (${kpi.status})</strong>
            </div>
          </div>
        </div>

        <div style="margin: 16px 0;">
          <h4 style="margin-bottom:6px;"><i class="fa-solid fa-calculator"></i> Fórmula de Negocio</h4>
          <p class="muted" style="margin-top:0;">
            ${kpi.isInverse 
              ? `<strong>KPI Inverso:</strong> Al ser un indicador de costo, tiempo, rotación o defectos, menor valor real es mejor resultado. Fórmula: <code>% Cumplimiento = (Meta / Real) × 100</code>`
              : `<strong>KPI Directo:</strong> A mayor valor real acumulado, mayor cumplimiento. Fórmula: <code>% Cumplimiento = (Real / Meta) × 100</code>`}
          </p>
        </div>

        <div style="background:#fefce8; border:1px solid #fef08a; padding:14px; border-radius:var(--radius-md); margin-bottom:18px;">
          <strong style="color:#854d0e; display:block; margin-bottom:4px;"><i class="fa-solid fa-lightbulb"></i> Análisis y Acción Recomendada (TechPeru SAC 2025):</strong>
          <span style="color:#713f12; font-size:12px; line-height:1.5;">${escapeHtml(kpi.analysis || 'En seguimiento regular.')}</span>
        </div>
      `,
      footer: `
        <button class="btn btn-outline" id="modalBtnClose">Cerrar</button>
        <button class="btn btn-primary" id="modalBtnSimThis"><i class="fa-solid fa-sliders"></i> Actualizar en Simulador</button>
      `
    });

    $("#modalBtnClose").addEventListener("click", closeModal);
    $("#modalBtnSimThis").addEventListener("click", () => {
      closeModal();
      navigateTo("simulador", { kpiId: kpi.id });
    });
  }

  function openCreateKpiModal() {
    showModal({
      eyebrow: "BACKEND API: POST /api/kpis",
      title: "Registrar Nuevo Indicador (KPI)",
      body: `
        <form id="formNewKpi">
          <div class="form-group">
            <label for="newKpiName">Nombre del Indicador *</label>
            <input type="text" id="newKpiName" required style="padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-md); width:100%;" placeholder="Ej. Margen Operativo por Solución Cloud">
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group">
              <label for="newKpiObj">Objetivo Estratégico Asociado *</label>
              <select id="newKpiObj" class="filter-select" style="width:100%;">
                ${state.objectives.map(o => `<option value="${o.id}">${o.id}: ${o.name}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label for="newKpiUnit">Unidad de Medida *</label>
              <input type="text" id="newKpiUnit" required style="padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-md); width:100%;" placeholder="%, S/ MM, pts, días...">
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
            <div class="form-group">
              <label for="newKpiMeta">Meta Anual *</label>
              <input type="number" step="0.01" id="newKpiMeta" required style="padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-md); width:100%;" value="100">
            </div>
            <div class="form-group">
              <label for="newKpiReal">Valor Real Acumulado *</label>
              <input type="number" step="0.01" id="newKpiReal" required style="padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-md); width:100%;" value="85">
            </div>
            <div class="form-group">
              <label for="newKpiInverse">Tipo de KPI *</label>
              <select id="newKpiInverse" class="filter-select" style="width:100%;">
                <option value="false">Directo (Mayor=Mejor)</option>
                <option value="true">Inverso (Menor=Mejor)</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="newKpiAnalysis">Análisis y Acción Recomendada</label>
            <textarea id="newKpiAnalysis" rows="2" style="width:100%; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:10px;" placeholder="Plan de acción o diagnóstico..."></textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" id="modalBtnCancel">Cancelar</button>
        <button class="btn btn-primary" id="modalBtnSaveKpi">Guardar en el Servidor</button>
      `
    });

    $("#modalBtnCancel").addEventListener("click", closeModal);
    $("#modalBtnSaveKpi").addEventListener("click", async () => {
      const name = $("#newKpiName").value.trim();
      const objId = $("#newKpiObj").value;
      const unit = $("#newKpiUnit").value.trim();
      const meta = parseFloat($("#newKpiMeta").value);
      const real = parseFloat($("#newKpiReal").value);
      const isInverse = $("#newKpiInverse").value === "true";
      const analysis = $("#newKpiAnalysis").value.trim();

      if (!name || isNaN(meta) || isNaN(real)) {
        toast("Por favor completa los campos numéricos y el nombre.", "error");
        return;
      }

      try {
        await api.createKpi({ name, objectiveId: objId, unit, meta, real, isInverse, analysis });
        await syncStateFromBackend();
        closeModal();
        toast("Indicador creado y persistido en el backend.", "success");
        renderKpis($("#pageContent"));
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }

  // ==========================================================================
  // MÓDULO 6: REGISTRO DE RESULTADOS & SIMULADOR (POST /api/mediciones)
  // ==========================================================================

  function renderSimulator(container, params = {}) {
    let selectedKpiId = params.kpiId || (state.kpis[0] ? state.kpis[0].id : "KPI-01");

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Registro de Resultados y Simulador de Pruebas</h1>
          <p>Conectado directamente al endpoint del backend <code>POST /api/mediciones</code> y <code>POST /api/reset</code>.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-outline" id="btnResetToDefaults"><i class="fa-solid fa-rotate-left"></i> Restablecer Datos Oficiales TechPeru</button>
        </div>
      </div>

      <div class="sim-nav-tabs">
        <button class="sim-tab-btn active" id="tabBtnSingle"><i class="fa-solid fa-pen-to-square"></i> Registro Individual (POST /api/mediciones)</button>
        <button class="sim-tab-btn" id="tabBtnWhatIf"><i class="fa-solid fa-wand-magic-sparkles"></i> Matriz de Sensibilidad "What-If"</button>
      </div>

      <!-- VISTA 1: REGISTRO INDIVIDUAL CON EL BACKEND -->
      <div id="simSingleView" class="simulator-layout">
        <div class="card-panel">
          <div class="panel-header">
            <h3>Seleccionar Indicador y Modificar Medición</h3>
            <span class="muted" style="font-size:11px;">Recálculo inmediato en el servidor</span>
          </div>

          <div class="form-group">
            <label for="simKpiSelector">Seleccionar KPI para Modificar Real:</label>
            <select id="simKpiSelector" class="filter-select" style="width:100%; font-size:13px; padding:12px;">
              ${state.perspectives.map(p => `
                <optgroup label="${p.name.toUpperCase()}">
                  ${state.kpis.filter(k => k.perspectiveId === p.id).map(k => `
                    <option value="${k.id}" ${k.id === selectedKpiId ? 'selected' : ''}>
                      [${k.id}] ${k.name} — Real: ${k.real} ${k.unit} (${k.achievement}%)
                    </option>
                  `).join("")}
                </optgroup>
              `).join("")}
            </select>
          </div>

          <div class="kpi-preview-box" id="simKpiInfoBox">
            <!-- Renderizado dinámico -->
          </div>

          <div class="form-group" style="margin-top:20px;">
            <label for="simNewRealInput" style="font-size:13px; font-weight:700;">
              Ingresar Nuevo Valor "Real Acumulado 2025":
            </label>
            <div style="display:flex; gap:12px; align-items:center;">
              <input type="number" step="0.01" id="simNewRealInput" style="padding:12px 16px; border:2px solid var(--blue-primary); border-radius:var(--radius-md); font-size:16px; font-weight:700; width:180px;">
              <span id="simInputUnit" style="font-size:14px; font-weight:600; color:var(--text-muted);">%</span>
              <button class="btn btn-primary" id="btnApplySingleReal" style="padding:12px 24px; font-size:13px;">
                <i class="fa-solid fa-cloud-arrow-up"></i> Guardar en Servidor y Recalcular
              </button>
            </div>
          </div>

          <!-- Caja de Cálculo en Vivo -->
          <div class="live-calc-box" id="simLiveCalcBox">
            <div class="live-calc-header">
              <i class="fa-solid fa-bolt"></i> Previsualización Reactiva
            </div>
            <div class="live-calc-result">
              <div>
                <small style="color:var(--text-muted);">Nuevo % de Cumplimiento:</small>
                <div class="big-pct" id="liveCalcPct">91.7%</div>
              </div>
              <div>
                <small style="color:var(--text-muted);">Nuevo Estado:</small>
                <div id="liveCalcStatusBadge" style="margin-top:4px;">
                  <span class="status-pill good">✅ LOGRADO</span>
                </div>
              </div>
              <div>
                <small style="color:var(--text-muted);">Impacto vs. Valor Anterior:</small>
                <div id="liveCalcDelta" style="font-size:16px; font-weight:700; margin-top:4px;">+0.0%</div>
              </div>
            </div>
            <div id="liveCalcFormulaNote" style="font-size:11px; color:var(--text-muted); margin-top:10px; border-top:1px dashed var(--border-color); padding-top:8px;">
              Fórmula aplicada: (Real / Meta) × 100
            </div>
          </div>
        </div>

        <!-- Panel de Impacto Global -->
        <div class="card-panel">
          <div class="panel-header">
            <h3>Impacto en la Salud General del BSC</h3>
            <span class="status-pill ${state.globalStatus === 'LOGRADO' ? 'good' : state.globalStatus === 'RIESGO' ? 'warn' : 'bad'}" id="simSideGlobalStatus">
              Global: ${state.globalAchievement}%
            </span>
          </div>

          <p class="muted" style="font-size:11px; margin-top:0;">
            El servidor Node.js/Express ejecuta la fórmula y recalcula en cascada el cumplimiento del objetivo, la perspectiva y el índice global.
          </p>

          <div style="display:flex; flex-direction:column; gap:14px; margin-top:20px;">
            ${state.perspectives.map(p => `
              <div style="border:1px solid var(--border-color); border-radius:var(--radius-md); padding:12px; background:var(--bg-app);">
                <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; margin-bottom:6px;">
                  <span>${p.name}</span>
                  <span style="color:${p.color};" id="simPerspScore_${p.id}">${p.achievement}%</span>
                </div>
                <div class="progress-bar-wrap">
                  <div class="progress-bar-fill ${p.status === 'LOGRADO' ? 'good' : p.status === 'RIESGO' ? 'warn' : 'bad'}" id="simPerspFill_${p.id}" style="width:${Math.min(p.achievement, 100)}%;"></div>
                </div>
              </div>
            `).join("")}
          </div>

          <div style="margin-top:24px; padding:16px; background:#eff6ff; border-radius:var(--radius-md); border:1px solid #bfdbfe;">
            <strong style="color:var(--navy-blue); font-size:12px; display:block; margin-bottom:4px;">
              <i class="fa-solid fa-server"></i> Persistencia Real en Servidor
            </strong>
            <span style="font-size:11px; color:#1e40af; line-height:1.4;">
              Cada guardado ejecuta <code>POST /api/mediciones</code> y actualiza el archivo <code>excel_parsed.json</code> en disco.
            </span>
          </div>
        </div>
      </div>

      <!-- VISTA 2: MATRIZ DE SENSIBILIDAD WHAT-IF -->
      <div id="simWhatIfView" class="hidden">
        <div class="card-panel">
          <div class="panel-header">
            <div>
              <h3>Simulador de Sensibilidad Estratégica "What-If"</h3>
              <div class="panel-subtitle">Ajusta los deslizadores para ver cómo llevar los indicadores críticos a la meta proyecta el BSC global de TechPeru por encima del 90%.</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-sm btn-soft" id="btnSimulateAllGoals"><i class="fa-solid fa-wand-magic-sparkles"></i> Simular Todos al 100% de Meta</button>
              <button class="btn btn-sm btn-outline" id="btnSimulateResetSliders"><i class="fa-solid fa-rotate-left"></i> Revertir a Reales</button>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px;">
            <div style="padding:16px; background:var(--bg-app); border-radius:var(--radius-md); border:1px solid var(--border-color);">
              <small style="color:var(--text-muted); font-weight:700;">ESTADO ACTUAL EN SERVIDOR:</small>
              <div style="font-size:26px; font-weight:800; font-family:var(--font-display); color:var(--amber); margin:4px 0;" id="whatifCurrentScore">
                ${state.globalAchievement}% (EN RIESGO)
              </div>
              <small class="muted">6 indicadores en estado crítico</small>
            </div>

            <div style="padding:16px; background:#f0fdf4; border-radius:var(--radius-md); border:1px solid var(--green-border);">
              <small style="color:var(--green-text); font-weight:700;">PROYECCIÓN WHAT-IF SIMULADA:</small>
              <div style="font-size:26px; font-weight:800; font-family:var(--font-display); color:var(--green); margin:4px 0;" id="whatifProjectedScore">
                --%
              </div>
              <small style="color:var(--green-text);" id="whatifProjectedDelta">Impacto esperado</small>
            </div>
          </div>

          <div class="sensitivity-list" id="whatIfSlidersList">
            <!-- Deslizadores de los críticos -->
          </div>

          <div style="margin-top:24px; text-align:right;">
            <button class="btn btn-primary" id="btnPromoteWhatIfToReal">
              <i class="fa-solid fa-cloud-arrow-up"></i> Aplicar Escenario Simulado al Servidor Backend
            </button>
          </div>
        </div>
      </div>
    `;

    function updateSelectedKpiInfo() {
      const kpi = state.kpis.find(k => k.id === selectedKpiId);
      if (!kpi) return;

      $("#simInputUnit").textContent = kpi.unit;
      $("#simNewRealInput").value = kpi.real;

      $("#simKpiInfoBox").innerHTML = `
        <div class="kpi-preview-grid">
          <div class="preview-field">
            <small>INDICADOR</small>
            <strong>${escapeHtml(kpi.name)}</strong>
          </div>
          <div class="preview-field">
            <small>OBJETIVO VINCULADO</small>
            <strong>${kpi.objectiveId}: ${escapeHtml(kpi.objectiveName || '')}</strong>
          </div>
          <div class="preview-field">
            <small>PERSPECTIVA</small>
            <strong>${kpi.perspectiveId}</strong>
          </div>
        </div>
        <div class="kpi-preview-grid">
          <div class="preview-field">
            <small>META ANUAL 2025</small>
            <strong style="color:var(--navy-blue);">${kpi.meta} ${kpi.unit}</strong>
          </div>
          <div class="preview-field">
            <small>REAL ACUMULADO ACTUAL</small>
            <strong>${kpi.real} ${kpi.unit}</strong>
          </div>
          <div class="preview-field">
            <small>DIRECCIÓN</small>
            <strong style="color:${kpi.isInverse ? 'var(--red)' : 'var(--blue-primary)'};">
              ${kpi.isInverse ? 'Menor es mejor (Meta / Real)' : 'Mayor es mejor (Real / Meta)'}
            </strong>
          </div>
        </div>
      `;

      updateLiveCalc();
    }

    function updateLiveCalc() {
      const kpi = state.kpis.find(k => k.id === selectedKpiId);
      if (!kpi) return;

      const newReal = parseFloat($("#simNewRealInput").value);
      if (isNaN(newReal) || newReal === 0) {
        $("#liveCalcPct").textContent = "—";
        return;
      }

      const m = Number(kpi.meta);
      let newPct = kpi.isInverse ? (m / newReal) * 100 : (newReal / m) * 100;
      newPct = Math.round(newPct * 10) / 10;
      const newStatus = newPct >= 90 ? 'LOGRADO' : newPct >= 75 ? 'RIESGO' : 'CRITICO';
      const delta = Math.round((newPct - kpi.achievement) * 10) / 10;

      $("#liveCalcPct").textContent = `${newPct}%`;
      $("#liveCalcPct").style.color = newStatus === 'LOGRADO' ? 'var(--green)' : newStatus === 'RIESGO' ? 'var(--amber)' : 'var(--red)';

      const badge = $("#liveCalcStatusBadge");
      badge.innerHTML = `
        <span class="status-pill ${newStatus === 'LOGRADO' ? 'good' : newStatus === 'RIESGO' ? 'warn' : 'bad'}">
          ${newStatus === 'LOGRADO' ? '✅ LOGRADO' : newStatus === 'RIESGO' ? '⚠️ EN RIESGO' : '❌ CRÍTICO'}
        </span>
      `;

      const deltaEl = $("#liveCalcDelta");
      if (delta > 0) {
        deltaEl.textContent = `+${delta}% (Mejora)`;
        deltaEl.style.color = "var(--green)";
      } else if (delta < 0) {
        deltaEl.textContent = `${delta}% (Desmejora)`;
        deltaEl.style.color = "var(--red)";
      } else {
        deltaEl.textContent = "0.0% (Sin cambio)";
        deltaEl.style.color = "var(--text-muted)";
      }

      $("#liveCalcFormulaNote").textContent = kpi.isInverse
        ? `Fórmula de KPI Inverso: (${kpi.meta} / ${newReal}) × 100 = ${newPct}%`
        : `Fórmula de KPI Directo: (${newReal} / ${kpi.meta}) × 100 = ${newPct}%`;
    }

    $("#simKpiSelector").addEventListener("change", (e) => {
      selectedKpiId = e.target.value;
      updateSelectedKpiInfo();
    });

    $("#simNewRealInput").addEventListener("input", updateLiveCalc);

    // Botón para enviar POST /api/mediciones al backend Express
    $("#btnApplySingleReal").addEventListener("click", async () => {
      const kpi = state.kpis.find(k => k.id === selectedKpiId);
      const newReal = parseFloat($("#simNewRealInput").value);

      if (!kpi || isNaN(newReal)) {
        toast("Ingresa un valor numérico válido.", "error");
        return;
      }

      try {
        const result = await api.postMeasurement(kpi.id, newReal);
        await syncStateFromBackend();
        updateSelectedKpiInfo();
        toast(result.message, "success");

        // Actualizar barras de perspectiva en pantalla
        state.perspectives.forEach(p => {
          const scoreEl = $(`#simPerspScore_${p.id}`);
          const fillEl = $(`#simPerspFill_${p.id}`);
          if (scoreEl) scoreEl.textContent = `${p.achievement}%`;
          if (fillEl) {
            fillEl.style.width = `${Math.min(p.achievement, 100)}%`;
            fillEl.className = `progress-bar-fill ${p.status === 'LOGRADO' ? 'good' : p.status === 'RIESGO' ? 'warn' : 'bad'}`;
          }
        });

        const sideGlobal = $("#simSideGlobalStatus");
        if (sideGlobal) {
          sideGlobal.textContent = `Global: ${state.globalAchievement}%`;
          sideGlobal.className = `status-pill ${state.globalStatus === 'LOGRADO' ? 'good' : state.globalStatus === 'RIESGO' ? 'warn' : 'bad'}`;
        }
      } catch (err) {
        toast(err.message, "error");
      }
    });

    // Botón para resetear datos mediante POST /api/reset
    $("#btnResetToDefaults").addEventListener("click", async () => {
      if (confirm("¿Deseas restablecer todos los valores originales de TechPeru SAC 2025 en el servidor?")) {
        try {
          const res = await api.resetData();
          await syncStateFromBackend();
          toast(res.message, "success");
          navigateTo("dashboard");
        } catch (err) {
          toast(err.message, "error");
        }
      }
    });

    // Pestañas
    $("#tabBtnSingle").addEventListener("click", () => {
      $("#tabBtnSingle").classList.add("active");
      $("#tabBtnWhatIf").classList.remove("active");
      $("#simSingleView").classList.remove("hidden");
      $("#simWhatIfView").classList.add("hidden");
    });

    $("#tabBtnWhatIf").addEventListener("click", () => {
      $("#tabBtnWhatIf").classList.add("active");
      $("#tabBtnSingle").classList.remove("active");
      $("#simWhatIfView").classList.remove("hidden");
      $("#simSingleView").classList.add("hidden");
      renderWhatIfSliders();
    });

    function renderWhatIfSliders() {
      const criticalKpis = state.kpis.filter(k => k.status === "CRITICO");
      const listContainer = $("#whatIfSlidersList");

      listContainer.innerHTML = criticalKpis.map(k => {
        const minVal = k.isInverse ? Math.min(k.meta * 0.5, k.real * 0.5) : 0;
        const maxVal = k.isInverse ? Math.max(k.real * 1.5, k.meta * 2) : Math.max(k.meta * 1.3, k.real * 1.5);
        const stepVal = k.meta > 50 ? 1 : 0.1;

        return `
          <div class="sensitivity-card" data-kpi-id="${k.id}">
            <div class="sensitivity-card-head">
              <div>
                <strong>[${k.id}] ${escapeHtml(k.name)}</strong>
                <small class="muted" style="display:block;">${k.perspectiveId} · Meta: ${k.meta} ${k.unit} (${k.isInverse ? 'Menor=Mejor' : 'Mayor=Mejor'})</small>
              </div>
              <span class="status-pill bad whatif-kpi-status" id="whatifStatus_${k.id}">${k.achievement}%</span>
            </div>
            <div class="sim-slider-row">
              <input type="range" class="whatif-slider" id="slider_${k.id}" 
                min="${minVal}" max="${maxVal}" step="${stepVal}" value="${k.real}" 
                data-kpi-id="${k.id}">
              <div class="sim-slider-val" id="sliderVal_${k.id}">
                ${k.real} ${k.unit}
              </div>
            </div>
          </div>
        `;
      }).join("");

      $$(".whatif-slider", listContainer).forEach(slider => {
        slider.addEventListener("input", (e) => {
          const kId = e.target.dataset.kpiId;
          const val = parseFloat(e.target.value);
          const k = state.kpis.find(item => item.id === kId);
          $(`#sliderVal_${kId}`).textContent = `${val} ${k.unit}`;
          recomputeWhatIfProjections();
        });
      });

      recomputeWhatIfProjections();
    }

    function recomputeWhatIfProjections() {
      const tempKpis = state.kpis.map(k => {
        const slider = $(`#slider_${k.id}`);
        const realVal = slider ? parseFloat(slider.value) : k.real;
        const m = Number(k.meta);
        let ach = k.isInverse ? (m / realVal) * 100 : (realVal / m) * 100;
        ach = Math.round(ach * 10) / 10;
        const stat = ach >= 90 ? 'LOGRADO' : ach >= 75 ? 'RIESGO' : 'CRITICO';

        if (slider) {
          const statusBadge = $(`#whatifStatus_${k.id}`);
          if (statusBadge) {
            statusBadge.textContent = `${ach}%`;
            statusBadge.className = `status-pill ${stat === 'LOGRADO' ? 'good' : stat === 'RIESGO' ? 'warn' : 'bad'}`;
          }
        }

        return { ...k, real: realVal, achievement: ach, status: stat };
      });

      let weightedSum = 0;
      let totalW = 0;
      state.perspectives.forEach(p => {
        const pKpis = tempKpis.filter(k => k.perspectiveId === p.id);
        const avg = pKpis.reduce((acc, k) => acc + k.achievement, 0) / pKpis.length;
        weightedSum += avg * (p.weight || 25);
        totalW += (p.weight || 25);
      });

      const projectedOverall = Math.round((weightedSum / totalW) * 10) / 10;
      const projDelta = Math.round((projectedOverall - state.globalAchievement) * 10) / 10;

      const projScoreEl = $("#whatifProjectedScore");
      projScoreEl.textContent = `${projectedOverall}% (${projectedOverall >= 90 ? 'LOGRADO' : projectedOverall >= 75 ? 'RIESGO' : 'CRITICO'})`;
      projScoreEl.style.color = projectedOverall >= 90 ? "var(--green)" : projectedOverall >= 75 ? "var(--amber)" : "var(--red)";

      const projDeltaEl = $("#whatifProjectedDelta");
      if (projDelta > 0) {
        projDeltaEl.textContent = `▲ Incremento proyectado de +${projDelta}% en el Scorecard de TechPeru SAC`;
      } else {
        projDeltaEl.textContent = `Variación: ${projDelta}%`;
      }
    }

    $("#btnSimulateAllGoals").addEventListener("click", () => {
      state.kpis.filter(k => k.status === "CRITICO").forEach(k => {
        const slider = $(`#slider_${k.id}`);
        if (slider) {
          slider.value = k.meta;
          $(`#sliderVal_${k.id}`).textContent = `${k.meta} ${k.unit}`;
        }
      });
      recomputeWhatIfProjections();
      toast("Valores simulados ajustados exactamente a la meta.", "info");
    });

    $("#btnSimulateResetSliders").addEventListener("click", () => {
      state.kpis.filter(k => k.status === "CRITICO").forEach(k => {
        const slider = $(`#slider_${k.id}`);
        if (slider) {
          slider.value = k.real;
          $(`#sliderVal_${k.id}`).textContent = `${k.real} ${k.unit}`;
        }
      });
      recomputeWhatIfProjections();
      toast("Deslizadores restablecidos a los valores reales actuales.", "info");
    });

    $("#btnPromoteWhatIfToReal").addEventListener("click", async () => {
      if (confirm("¿Deseas enviar estos valores simulados como datos reales permanentes al backend?")) {
        const critKpis = state.kpis.filter(k => k.status === "CRITICO");
        try {
          for (const k of critKpis) {
            const slider = $(`#slider_${k.id}`);
            if (slider) {
              const val = parseFloat(slider.value);
              await api.postMeasurement(k.id, val);
            }
          }
          await syncStateFromBackend();
          toast("Escenario simulado aplicado con éxito en el servidor.", "success");
          navigateTo("dashboard");
        } catch (err) {
          toast(err.message, "error");
        }
      }
    });

    updateSelectedKpiInfo();
  }

  // ==========================================================================
  // MÓDULO 7: INICIATIVAS ESTRATÉGICAS
  // ==========================================================================

  function renderInitiatives(container) {
    let filterPersp = "TODAS";
    let filterStatus = "TODAS";
    let searchTxt = "";

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Portafolio de Iniciativas Estratégicas</h1>
          <p>Proyectos y planes de acción recomendados con datos servidos por <code>GET /api/iniciativas</code>.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="btnNewInitiative"><i class="fa-solid fa-plus"></i> Nueva Iniciativa</button>
        </div>
      </div>

      <div class="card-panel">
        <div class="table-toolbar">
          <div class="search-box-wrap">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="iniSearchInput" placeholder="Buscar iniciativas por proyecto, KPI o responsable...">
          </div>

          <select class="filter-select" id="iniPerspFilter">
            <option value="TODAS">Perspectiva: Todas</option>
            <option value="FIN">Financiera</option>
            <option value="CLI">Clientes</option>
            <option value="PROC">Procesos Internos</option>
            <option value="APR">Aprendizaje y Crecimiento</option>
          </select>

          <select class="filter-select" id="iniStatusFilter">
            <option value="TODAS">Estado: Todos</option>
            <option value="En ejecución">En ejecución</option>
            <option value="En fase final">En fase final</option>
            <option value="Planificada">Planificada</option>
          </select>
        </div>

        <div class="table-responsive">
          <table class="data-table" id="tableInitiatives">
            <thead>
              <tr>
                <th>Código</th>
                <th>Iniciativa / Proyecto Estratégico</th>
                <th>Perspectiva</th>
                <th>KPI / Objetivo Vinculado</th>
                <th>Responsable</th>
                <th>Presupuesto</th>
                <th>Avance</th>
                <th>Estado</th>
                <th>Impacto</th>
              </tr>
            </thead>
            <tbody id="iniTableBody">
              <!-- Renderizado dinámico -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    function updateIniTable() {
      const list = state.initiatives.filter(ini => {
        const matchP = filterPersp === "TODAS" || ini.perspectiveId === filterPersp;
        const matchS = filterStatus === "TODAS" || ini.status === filterStatus;
        const matchSearch = !searchTxt || 
          ini.name.toLowerCase().includes(searchTxt) || 
          ini.kpiName.toLowerCase().includes(searchTxt) || 
          ini.owner.toLowerCase().includes(searchTxt);
        return matchP && matchS && matchSearch;
      });

      const tbody = $("#iniTableBody");
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-muted);">No se encontraron iniciativas.</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map(ini => `
        <tr>
          <td><span class="obj-code-badge">${ini.id}</span></td>
          <td class="kpi-title-cell" style="max-width:280px; white-space:normal;">
            <strong>${escapeHtml(ini.name)}</strong>
            <small>${escapeHtml(ini.description || '')}</small>
          </td>
          <td>
            <span class="persp-pill ${ini.perspectiveKey}" style="font-size:10px; padding:3px 8px;">
              ${ini.perspectiveId}
            </span>
          </td>
          <td>
            <strong style="color:var(--navy-blue);">${ini.kpiId}</strong>
            <small style="display:block; color:var(--text-muted); font-size:10px;">${escapeHtml(ini.kpiName)}</small>
          </td>
          <td>${escapeHtml(ini.owner)}</td>
          <td><strong>S/ ${(ini.budget || 35000).toLocaleString('es-PE')}</strong></td>
          <td style="min-width:130px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="progress-bar-wrap" style="flex:1; height:8px;">
                <div class="progress-bar-fill ${ini.progress >= 75 ? 'good' : ini.progress >= 40 ? 'warn' : 'bad'}" style="width:${ini.progress}%;"></div>
              </div>
              <strong style="font-size:11px;">${ini.progress}%</strong>
            </div>
          </td>
          <td>
            <span class="status-pill ${ini.status === 'En fase final' ? 'good' : 'warn'}">
              ${escapeHtml(ini.status)}
            </span>
          </td>
          <td>
            <span class="status-pill ${ini.impact && ini.impact.includes('Alto') ? 'bad' : 'good'}" style="font-size:9px;">
              ${escapeHtml(ini.impact || 'Medio')}
            </span>
          </td>
        </tr>
      `).join("");
    }

    $("#iniPerspFilter").addEventListener("change", (e) => { filterPersp = e.target.value; updateIniTable(); });
    $("#iniStatusFilter").addEventListener("change", (e) => { filterStatus = e.target.value; updateIniTable(); });
    $("#iniSearchInput").addEventListener("input", (e) => { searchTxt = e.target.value.trim().toLowerCase(); updateIniTable(); });

    $("#btnNewInitiative").addEventListener("click", () => openCreateInitiativeModal());

    updateIniTable();
  }

  function openCreateInitiativeModal() {
    showModal({
      eyebrow: "BACKEND API: POST /api/iniciativas",
      title: "Registrar Iniciativa Estratégica",
      body: `
        <form id="formNewIni">
          <div class="form-group">
            <label for="newIniName">Título de la Iniciativa *</label>
            <input type="text" id="newIniName" required style="padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-md); width:100%;" placeholder="Ej. Automatización de Cobranzas y Conciliación Cloud">
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group">
              <label for="newIniKpi">KPI Vinculado a Mejorar *</label>
              <select id="newIniKpi" class="filter-select" style="width:100%;">
                ${state.kpis.map(k => `<option value="${k.id}">[${k.id}] ${k.name}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label for="newIniBudget">Presupuesto Asignado (S/) *</label>
              <input type="number" id="newIniBudget" required style="padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-md); width:100%;" value="45000">
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group">
              <label for="newIniOwner">Líder / Responsable *</label>
              <input type="text" id="newIniOwner" required style="padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-md); width:100%;" value="${currentUser ? currentUser.name : 'Ing. Patricia Vargas'}">
            </div>
            <div class="form-group">
              <label for="newIniProgress">Avance Inicial (%)</label>
              <input type="number" id="newIniProgress" min="0" max="100" style="padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-md); width:100%;" value="25">
            </div>
          </div>
          <div class="form-group">
            <label for="newIniDesc">Detalle del Plan de Acción</label>
            <textarea id="newIniDesc" rows="3" style="width:100%; border:1px solid var(--border-color); border-radius:var(--radius-md); padding:10px;" placeholder="Descripción de hitos y metas del proyecto..."></textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline" id="modalBtnCancel">Cancelar</button>
        <button class="btn btn-primary" id="modalBtnSaveIni">Guardar en el Servidor</button>
      `
    });

    $("#modalBtnCancel").addEventListener("click", closeModal);
    $("#modalBtnSaveIni").addEventListener("click", async () => {
      const name = $("#newIniName").value.trim();
      const kpiId = $("#newIniKpi").value;
      const budget = parseFloat($("#newIniBudget").value) || 30000;
      const owner = $("#newIniOwner").value.trim();
      const progress = parseInt($("#newIniProgress").value) || 0;
      const desc = $("#newIniDesc").value.trim();

      if (!name) {
        toast("Completa el nombre de la iniciativa.", "error");
        return;
      }

      const k = state.kpis.find(item => item.id === kpiId);
      try {
        await api.createInitiative({
          name,
          kpiId,
          kpiName: k ? k.name : "",
          objectiveId: k ? k.objectiveId : "OBJ-F1",
          objectiveName: k ? k.objectiveName : "",
          perspectiveId: k ? k.perspectiveId : "FIN",
          perspectiveKey: k ? k.perspectiveKey : "fin",
          owner,
          budget,
          progress,
          status: progress >= 80 ? "En fase final" : "En ejecución",
          impact: "Alto",
          description: desc
        });
        await syncStateFromBackend();
        closeModal();
        toast("Iniciativa registrada y guardada en el backend.", "success");
        renderInitiatives($("#pageContent"));
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }

  // ==========================================================================
  // MÓDULO 8: REPORTES EJECUTIVOS Y EXPORTACIÓN
  // ==========================================================================

  function renderReports(container) {
    let reportFilter = "TODAS";

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Reportes Ejecutivos y Control de Gestión BSC</h1>
          <p>Informe gerencial consolidado para el Directorio y Gerencia General de TechPeru SAC (Ejercicio 2025).</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-soft" id="btnExportCSV"><i class="fa-solid fa-file-csv"></i> Descargar Reporte CSV</button>
          <button class="btn btn-primary" id="btnPrintReport"><i class="fa-solid fa-print"></i> Imprimir / Guardar PDF</button>
        </div>
      </div>

      <div class="card-panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <label for="reportPerspFilter" style="font-weight:700;">Filtrar Resumen por Perspectiva:</label>
            <select class="filter-select" id="reportPerspFilter">
              <option value="TODAS">Todas las Perspectivas (Consolidado 2025)</option>
              <option value="FIN">Perspectiva Financiera</option>
              <option value="CLI">Perspectiva del Cliente</option>
              <option value="PROC">Perspectiva de Procesos Internos</option>
              <option value="APR">Perspectiva de Aprendizaje y Crecimiento</option>
            </select>
          </div>
          <span class="muted" style="font-size:11px;">TechPeru S.A.C. · RUC: 20549281901</span>
        </div>

        <div style="padding:18px; background:var(--bg-app); border-radius:var(--radius-md); border:1px solid var(--border-color); margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <h2 style="margin:0 0 4px; font-size:18px;">INFORME DE GESTIÓN ESTRATÉGICA BSC 2025</h2>
              <small class="muted">Período Auditado: Enero - Diciembre 2025 · Organización: TechPeru SAC</small>
            </div>
            <div style="text-align:right;">
              <span class="status-pill ${state.globalStatus === 'LOGRADO' ? 'good' : state.globalStatus === 'RIESGO' ? 'warn' : 'bad'}" style="font-size:13px;">
                Cumplimiento General: ${state.globalAchievement}%
              </span>
            </div>
          </div>
        </div>

        <div id="reportContentArea">
          <!-- Se llena dinámicamente -->
        </div>
      </div>
    `;

    function updateReportView() {
      const pCode = reportFilter;
      const filteredKpis = pCode === "TODAS" ? state.kpis : state.kpis.filter(k => k.perspectiveId === pCode);
      const log = filteredKpis.filter(k => k.status === 'LOGRADO').length;
      const rie = filteredKpis.filter(k => k.status === 'RIESGO').length;
      const cri = filteredKpis.filter(k => k.status === 'CRITICO').length;

      const area = $("#reportContentArea");
      area.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; margin-bottom:24px;">
          <div style="padding:14px; background:#f0fdf4; border:1px solid var(--green-border); border-radius:var(--radius-md); text-align:center;">
            <span style="font-size:22px; font-weight:800; color:var(--green);">${log}</span>
            <small style="display:block; color:var(--green-text); font-weight:600;">Logrados (≥ 90%)</small>
          </div>
          <div style="padding:14px; background:#fefce8; border:1px solid var(--amber-border); border-radius:var(--radius-md); text-align:center;">
            <span style="font-size:22px; font-weight:800; color:var(--amber);">${rie}</span>
            <small style="display:block; color:var(--amber-text); font-weight:600;">En Riesgo (75-89%)</small>
          </div>
          <div style="padding:14px; background:#fef2f2; border:1px solid var(--red-border); border-radius:var(--radius-md); text-align:center;">
            <span style="font-size:22px; font-weight:800; color:var(--red);">${cri}</span>
            <small style="display:block; color:var(--red-text); font-weight:600;">Críticos (&lt; 75%)</small>
          </div>
        </div>

        <h3 style="font-size:15px; margin-bottom:12px;"><i class="fa-solid fa-list-check"></i> Detalle de Indicadores Evaluados</h3>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Indicador (KPI)</th>
                <th>Persp.</th>
                <th>Objetivo</th>
                <th>Meta</th>
                <th>Real</th>
                <th>% Cumpl.</th>
                <th>Estado</th>
                <th>Diagnóstico y Acción Recomendada</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              ${filteredKpis.map(k => `
                <tr>
                  <td><span class="obj-code-badge">${k.id}</span></td>
                  <td class="kpi-title-cell"><strong>${escapeHtml(k.name)}</strong></td>
                  <td>${k.perspectiveId}</td>
                  <td>${k.objectiveId}</td>
                  <td>${k.meta} ${k.unit}</td>
                  <td style="font-weight:700;">${k.real} ${k.unit}</td>
                  <td>
                    <strong style="color:${k.status === 'LOGRADO' ? 'var(--green)' : k.status === 'RIESGO' ? 'var(--amber)' : 'var(--red)'};">
                      ${k.achievement}%
                    </strong>
                  </td>
                  <td>
                    <span class="status-pill ${k.status === 'LOGRADO' ? 'good' : k.status === 'RIESGO' ? 'warn' : 'bad'}">
                      ${k.status}
                    </span>
                  </td>
                  <td style="max-width:300px; white-space:normal; font-size:11px;">
                    ${escapeHtml(k.analysis || 'En curso')}
                  </td>
                  <td><small>${escapeHtml(k.responsible)}</small></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    $("#reportPerspFilter").addEventListener("change", (e) => {
      reportFilter = e.target.value;
      updateReportView();
    });

    $("#btnExportCSV").addEventListener("click", () => exportReportToCsv());
    $("#btnPrintReport").addEventListener("click", () => window.print());

    updateReportView();
  }

  function exportReportToCsv() {
    const BOM = "\uFEFF";
    const headers = ["Codigo", "Indicador", "Perspectiva", "Objetivo", "Meta", "Real", "Unidad", "Direccion", "Cumplimiento_Pct", "Estado", "Responsable", "Accion_Recomendada"];

    const rows = state.kpis.map(k => [
      k.id,
      `"${k.name.replace(/"/g, '""')}"`,
      k.perspectiveId,
      k.objectiveId,
      k.meta,
      k.real,
      `"${k.unit}"`,
      k.isInverse ? "Inverso (Menor=Mejor)" : "Directo (Mayor=Mejor)",
      `${k.achievement}%`,
      k.status,
      `"${k.responsible}"`,
      `"${(k.analysis || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = BOM + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BSC_TechPeru_Reporte_2025.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Archivo CSV generado y descargado.", "success");
  }

  // ==========================================================================
  // MÓDULO 9: ADMINISTRACIÓN Y CONFIGURACIÓN (POST /api/ponderaciones)
  // ==========================================================================

  function renderAdmin(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Administración y Configuración del BSC</h1>
          <p>Configuración de ponderaciones por perspectiva, usuarios y mantenimiento conectado a la API REST.</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
        <div class="card-panel">
          <div class="panel-header">
            <h3>Ponderación de Perspectivas BSC</h3>
            <span class="status-pill good" id="weightSumBadge">Suma: 100%</span>
          </div>
          <p class="muted" style="font-size:11px; margin-top:0;">
            Ajusta los pesos enviados al endpoint <code>POST /api/ponderaciones</code> (la suma debe ser 100%).
          </p>

          <form id="formWeights" style="margin-top:16px;">
            ${state.perspectives.map(p => `
              <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; flex-direction:row;">
                <label style="font-size:12px; font-weight:700;">${p.name}:</label>
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="number" min="0" max="100" class="input-weight" id="weight_${p.id}" value="${p.weight || 25}" style="width:70px; padding:6px 10px; border:1px solid var(--border-color); border-radius:var(--radius-sm); text-align:right; font-weight:700;">
                  <span>%</span>
                </div>
              </div>
            `).join("")}

            <div style="margin-top:20px; text-align:right;">
              <button class="btn btn-primary" type="button" id="btnSaveWeights">
                <i class="fa-solid fa-floppy-disk"></i> Guardar Ponderaciones en Servidor
              </button>
            </div>
          </form>
        </div>

        <div class="card-panel">
          <div class="panel-header">
            <h3>Mantenimiento y Respaldo</h3>
            <span class="muted" style="font-size:11px;">Endpoints del Servidor</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:16px;">
            <div style="padding:14px; background:#f8fafc; border:1px solid var(--border-color); border-radius:var(--radius-md);">
              <strong style="display:block; margin-bottom:4px; color:var(--navy-blue);">
                <i class="fa-solid fa-download"></i> Exportar Respaldo de Base de Datos
              </strong>
              <small class="muted" style="display:block; margin-bottom:10px;">
                Descarga un archivo JSON con todos los datos actualmente persistidos en el servidor.
              </small>
              <button class="btn btn-sm btn-outline" id="btnBackupJson">Descargar Respaldo JSON</button>
            </div>

            <div style="padding:14px; background:#fff7ed; border:1px solid #ffedd5; border-radius:var(--radius-md);">
              <strong style="display:block; margin-bottom:4px; color:#c2410c;">
                <i class="fa-solid fa-rotate-left"></i> Restablecer a Datos Oficiales de TechPeru SAC
              </strong>
              <small class="muted" style="display:block; margin-bottom:10px;">
                Invoca <code>POST /api/reset</code> para restaurar el archivo original desde <code>seed_backup.json</code>.
              </small>
              <button class="btn btn-sm btn-primary" style="background:#ea580c; border-color:#ea580c;" id="btnHardReset">
                Restablecer Todo en el Servidor
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="card-panel" style="margin-top:24px;">
        <div class="panel-header">
          <h3>Usuarios y Roles Autorizados (GET /api/usuarios)</h3>
          <span class="status-pill good">5 Cuentas Activas</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo Electrónico</th>
                <th>Rol</th>
                <th>Cargo / Área</th>
                <th>Permisos</th>
              </tr>
            </thead>
            <tbody>
              ${state.users.map(u => `
                <tr>
                  <td><strong>${escapeHtml(u.name)}</strong></td>
                  <td><code>${escapeHtml(u.email)}</code></td>
                  <td><span class="badge-role ${u.role.toLowerCase()}">${escapeHtml(u.role)}</span></td>
                  <td>${escapeHtml(u.title || 'Control de Gestión')}</td>
                  <td><small class="muted">${u.role === 'Administrador' ? 'Control Total (CRUD + Configuración)' : u.role === 'Gerente' ? 'Edición de KPIs y Proyectos' : 'Lectura y Simulación'}</small></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    $$(".input-weight").forEach(input => {
      input.addEventListener("input", () => {
        let sum = 0;
        $$(".input-weight").forEach(i => sum += (parseFloat(i.value) || 0));
        const badge = $("#weightSumBadge");
        badge.textContent = `Suma: ${sum}%`;
        badge.className = sum === 100 ? "status-pill good" : "status-pill bad";
      });
    });

    $("#btnSaveWeights").addEventListener("click", async () => {
      const weights = {};
      let sum = 0;
      state.perspectives.forEach(p => {
        const val = parseFloat($(`#weight_${p.id}`).value) || 0;
        weights[p.id] = val;
        sum += val;
      });

      if (sum !== 100) {
        toast(`La suma de pesos debe ser exactamente 100% (actual: ${sum}%).`, "error");
        return;
      }

      try {
        await api.saveWeights(weights);
        await syncStateFromBackend();
        toast("Ponderaciones guardadas en el backend Express.", "success");
      } catch (err) {
        toast(err.message, "error");
      }
    });

    $("#btnBackupJson").addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
      const a = document.createElement("a");
      a.href = dataStr;
      a.download = `TechPeru_BSC_Backup_2025.json`;
      a.click();
      toast("Respaldo JSON descargado con éxito.", "success");
    });

    $("#btnHardReset").addEventListener("click", async () => {
      if (confirm("¿Estás seguro de restablecer todos los datos originales de TechPeru SAC 2025 en el servidor?")) {
        try {
          const res = await api.resetData();
          await syncStateFromBackend();
          toast(res.message, "success");
          navigateTo("dashboard");
        } catch (err) {
          toast(err.message, "error");
        }
      }
    });
  }

  // ==========================================================================
  // COMPONENTES MODAL Y TOAST
  // ==========================================================================

  function showModal({ eyebrow = "FORMULARIO", title = "Título", body = "", footer = "" }) {
    $("#modalEyebrow").textContent = eyebrow;
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = body;
    $("#modalFooter").innerHTML = footer;
    $("#modalLayer").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    $("#modalLayer").classList.add("hidden");
    document.body.style.overflow = "";
  }

  function toast(message, type = "info") {
    const region = $("#toastRegion");
    const el = document.createElement("div");
    el.className = `toast ${type}`;

    let icon = "fa-circle-info";
    if (type === "success") icon = "fa-circle-check";
    if (type === "error") icon = "fa-circle-exclamation";

    el.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${escapeHtml(message)}</span>
    `;

    region.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(10px)";
      setTimeout(() => el.remove(), 250);
    }, 3800);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==========================================================================
  // INICIALIZACIÓN GLOBAL
  // ==========================================================================

  function bindGlobalEvents() {
    $$(".sidebar-nav .nav-item").forEach(btn => {
      btn.addEventListener("click", () => {
        navigateTo(btn.dataset.page);
      });
    });

    $("#menuToggle").addEventListener("click", () => {
      $("#sidebar").classList.toggle("open");
    });

    $("#sidebarClose").addEventListener("click", () => {
      $("#sidebar").classList.remove("open");
    });

    $("#modalClose").addEventListener("click", closeModal);
    $("#modalBackdrop").addEventListener("click", closeModal);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal();
        $("#criticalDropdown").classList.add("hidden");
      }
    });

    const critBtn = $("#criticalAlertsBtn");
    const critDrop = $("#criticalDropdown");
    critBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      critDrop.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
      if (!critDrop.contains(e.target) && e.target !== critBtn) {
        critDrop.classList.add("hidden");
      }
    });

    $("#btnGoToCriticalSimulator").addEventListener("click", () => {
      critDrop.classList.add("hidden");
      navigateTo("simulador");
    });
  }

  window.addEventListener("DOMContentLoaded", async () => {
    await syncStateFromBackend();
    initAuth();
    bindGlobalEvents();
  });

})();