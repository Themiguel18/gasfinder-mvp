const state = {
  screen: 'home',
  bottle: 'Botija Azul',
  location: null,
  results: [],
  agencyId: null,
  agency: null,
  agencyToken: localStorage.getItem('gasfinder_token') || '',
  agencies: [],
  stats: null,
  form: {
    name: '',
    responsible: '',
    phone: '',
    email: '',
    password: '',
    address: '',
    latitude: '',
    longitude: '',
    bottleId: '1'
  }
};

const app = document.getElementById('app');

const API = '/api';

async function apiRequest(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const response = await fetch(`${API}${url}`, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(payload.message || 'Erro inesperado.');
  }

  return payload;
}

function render() {
  if (state.screen === 'home') {
    app.innerHTML = `
      <div class="container">
        <header class="topbar">
          <div class="brand">Gas<span>Finder</span></div>
          <nav class="nav">
            <button>Agência</button>
            <button>Admin</button>
          </nav>
        </header>

        <section class="hero">
          <h1>Encontre gás perto de você.</h1>
          <p>Veja quais agências têm o gás que você procura antes de sair de casa.</p>
          <div class="hero-actions">
            <button class="primary-btn" id="findGasBtn">Encontrar gás perto de mim</button>
            <button class="ghost-btn" id="manualLocationBtn">Inserir localização</button>
          </div>

          <div class="search-panel hidden" id="searchPanel">
            <div class="inline-grid">
              <div>
                <h3>Qual tipo de botija você procura?</h3>
                <div class="pill-group" id="bottleSelector"></div>
              </div>
              <div>
                <h3>Localização</h3>
                <div class="form-grid">
                  <input id="manualLat" placeholder="Latitude" value="-8.84" />
                  <input id="manualLng" placeholder="Longitude" value="13.23" />
                  <button class="secondary-btn" id="searchByManualLocation">Pesquisar</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    document.getElementById('findGasBtn').addEventListener('click', handleFindGas);
    document.getElementById('manualLocationBtn').addEventListener('click', () => {
      document.getElementById('searchPanel').classList.remove('hidden');
    });
    document.getElementById('searchByManualLocation').addEventListener('click', () => {
      const lat = Number(document.getElementById('manualLat').value);
      const lng = Number(document.getElementById('manualLng').value);
      if (lat && lng) {
        state.location = { latitude: lat, longitude: lng };
        fetchNearbyAgencies();
      }
    });
    renderBottleOptions();
    return;
  }

  if (state.screen === 'results') {
    app.innerHTML = `
      <div class="container">
        <header class="topbar">
          <div class="brand">Gas<span>Finder</span></div>
          <nav class="nav">
            <button id="backHomeBtn">Voltar</button>
          </nav>
        </header>

        <section class="hero">
          <h1>Agências próximas</h1>
          <p>Resultados para ${state.bottle}.</p>
        </section>

        <div class="results-grid" style="margin-top: 22px;">
          <div>
            <h3 class="section-title">Lista</h3>
            <div id="resultsList"></div>
          </div>
          <div>
            <h3 class="section-title">Mapa</h3>
            <div class="map-shell">Mapa com marcadores da área de pesquisa</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('backHomeBtn').addEventListener('click', () => {
      state.screen = 'home';
      render();
    });

    renderResultsList();
    return;
  }

  if (state.screen === 'agency-detail') {
    app.innerHTML = `
      <div class="container">
        <header class="topbar">
          <div class="brand">Gas<span>Finder</span></div>
          <nav class="nav">
            <button id="backResultsBtn">Voltar</button>
          </nav>
        </header>

        <section class="detail-page">
          <div id="agencyDetailContent"></div>
        </section>
      </div>
    `;

    document.getElementById('backResultsBtn').addEventListener('click', () => {
      state.screen = 'results';
      render();
    });

    renderAgencyDetail();
  }

  if (state.screen === 'agency-dashboard') {
    app.innerHTML = `
      <div class="container">
        <header class="topbar">
          <div class="brand">Gas<span>Finder</span></div>
          <nav class="nav">
            <button id="logoutAgencyBtn">Sair</button>
          </nav>
        </header>
        <section class="dashboard">
          <div class="detail-page">
            <h2>Painel da Agência</h2>
            <div id="agencyDashboardContent"></div>
          </div>
        </section>
      </div>
    `;

    document.getElementById('logoutAgencyBtn').addEventListener('click', () => {
      localStorage.removeItem('gasfinder_token');
      state.screen = 'home';
      render();
    });

    renderAgencyDashboard();
  }

  if (state.screen === 'admin-dashboard') {
    app.innerHTML = `
      <div class="container">
        <header class="topbar">
          <div class="brand">Gas<span>Finder</span></div>
          <nav class="nav">
            <button id="logoutAdminBtn">Sair</button>
          </nav>
        </header>
        <section class="dashboard">
          <div class="detail-page">
            <h2>Painel Administrativo</h2>
            <div id="adminDashboardContent"></div>
          </div>
        </section>
      </div>
    `;

    document.getElementById('logoutAdminBtn').addEventListener('click', () => {
      localStorage.removeItem('gasfinder_token');
      state.screen = 'home';
      render();
    });

    renderAdminDashboard();
  }
}

function renderBottleOptions() {
  const selector = document.getElementById('bottleSelector');
  if (!selector) return;

  const options = ['Botija Azul', 'Botija Laranja', 'Todas'];
  selector.innerHTML = options.map((option) => `
    <button class="pill ${state.bottle === option ? 'active' : ''}" data-bottle="${option}">${option}</button>
  `).join('');

  selector.querySelectorAll('.pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.bottle = btn.dataset.bottle;
      renderBottleOptions();
    });
  });
}

async function handleFindGas() {
  if (!navigator.geolocation) {
    document.getElementById('searchPanel').classList.remove('hidden');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      fetchNearbyAgencies();
    },
    () => {
      document.getElementById('searchPanel').classList.remove('hidden');
    },
    { enableHighAccuracy: true }
  );
}

async function fetchNearbyAgencies() {
  if (!state.location) return;
  const { latitude, longitude } = state.location;

  try {
    const payload = await apiRequest(`/agencias/proximas?latitude=${latitude}&longitude=${longitude}&bottleName=${encodeURIComponent(state.bottle)}`);
    state.results = payload.results || [];
    state.screen = 'results';
    render();
  } catch (error) {
    alert(error.message);
  }
}

function renderResultsList() {
  const list = document.getElementById('resultsList');
  if (!list) return;

  if (!state.results.length) {
    list.innerHTML = '<div class="card"><p>Nenhuma agência encontrada com os critérios atuais.</p></div>';
    return;
  }

  list.innerHTML = state.results.map((agency) => `
    <article class="card">
      <div class="card-header">
        <h3>${agency.name}</h3>
        <span class="status ${agency.available ? 'open' : 'closed'}">${agency.available ? 'Disponível' : 'Indisponível'}</span>
      </div>

      <div class="meta-list">
        <div class="meta-item">📍 ${agency.distance} km</div>
        <div class="meta-item">💰 ${agency.price ? `Preço: ${agency.price} Kz` : 'Preço em consulta'}</div>
        <div class="meta-item">🕒 ${formatRelativeTime(agency.updatedAt)}</div>
      </div>

      <div class="inventory">
        <div class="inventory-item">
          <span><span class="dot ${agency.available ? 'available' : 'unavailable'}"></span>${agency.bottleName || state.bottle}</span>
          <strong>${agency.available ? 'Disponível' : 'Indisponível'}</strong>
        </div>
      </div>

      <div class="card-actions">
        <button class="primary-btn" data-agency-view="${agency.id}">Ver agência</button>
        <button class="ghost-btn" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${agency.latitude},${agency.longitude}', '_blank')">Como chegar</button>
      </div>
    </article>
  `).join('');

  list.querySelectorAll('[data-agency-view]').forEach((el) => {
    el.addEventListener('click', () => {
      state.agencyId = Number(el.dataset.agencyView);
      state.screen = 'agency-detail';
      render();
    });
  });
}

async function renderAgencyDetail() {
  const target = document.getElementById('agencyDetailContent');
  if (!target) return;

  try {
    const agency = await apiRequest(`/agencias/${state.agencyId}`);
    state.agency = agency;

    const availability = agency.availability || [];
    const summary = availability.map((item) => {
      const bottleName = item.bottle_name || 'Botija';
      const available = Number(item.available) === 1;
      return `
        <div class="inventory-item">
          <span><span class="dot ${available ? 'available' : 'unavailable'}"></span>${bottleName}</span>
          <strong>${available ? 'Disponível' : 'Indisponível'}</strong>
        </div>
      `;
    }).join('');

    target.innerHTML = `
      <div class="agent-head">
        <div>
          <h2>${agency.name}</h2>
          <div class="rating">★★★★★ 4.6</div>
        </div>
        <span class="status ${agency.status === 'active' ? 'open' : 'closed'}">${agency.status === 'active' ? 'Aberta' : 'Fechada'}</span>
      </div>

      <div class="detailed-list">
        <div class="meta-item">📍 ${agency.address}</div>
        <div class="meta-item">📏 ${state.results.find((item) => item.id === agency.id)?.distance || '—'} km</div>
        <div class="meta-item">📞 ${agency.phone}</div>
      </div>

      <div>
        <h3>Disponibilidade</h3>
        <div class="inventory">${summary || '<p>Dados de disponibilidade indisponíveis.</p>'}</div>
      </div>

      <div class="card-actions">
        <button class="primary-btn" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${agency.latitude},${agency.longitude}', '_blank')">Como chegar</button>
        <button class="secondary-btn" onclick="window.location.href='tel:${agency.phone}'">Ligar</button>
      </div>
    `;
  } catch (error) {
    target.innerHTML = `<p>${error.message}</p>`;
  }
}

async function renderAgencyDashboard() {
  const content = document.getElementById('agencyDashboardContent');
  if (!content) return;

  if (!state.agencyToken) {
    content.innerHTML = `
      <div class="form-grid">
        <input id="agencyEmail" placeholder="Email da agência" />
        <input id="agencyPassword" type="password" placeholder="Senha" />
        <button class="primary-btn" id="agencyLoginBtn">Entrar no painel</button>
      </div>
    `;

    document.getElementById('agencyLoginBtn').addEventListener('click', async () => {
      const email = document.getElementById('agencyEmail').value;
      const password = document.getElementById('agencyPassword').value;
      try {
        const payload = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        localStorage.setItem('gasfinder_token', payload.token);
        state.agencyToken = payload.token;
        renderAgencyDashboard();
      } catch (error) {
        alert(error.message);
      }
    });
    return;
  }

  try {
    const profile = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'saojose@gasfinder.app', password: 'agencia123' })
    });
    const agencyId = 1;
    const agency = await apiRequest(`/agencias/${agencyId}`);

    content.innerHTML = `
      <h3>Agência São José</h3>
      <p>Status: <span class="status open">Aberta</span></p>
      <div class="inventory">
        ${agency.availability.map((item) => `
          <div class="inventory-item">
            <span>${item.bottle_name}</span>
            <strong>${Number(item.available) === 1 ? 'Disponível' : 'Indisponível'}</strong>
          </div>
        `).join('')}
      </div>
      <button class="primary-btn" id="toggleAvailabilityBtn">Atualizar disponibilidade</button>
    `;

    document.getElementById('toggleAvailabilityBtn').addEventListener('click', async () => {
      await apiRequest(`/agencias/1/availability`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${state.agencyToken}` },
        body: JSON.stringify({ bottleId: 1, available: false, price: 8500 })
      });
      alert('Disponibilidade atualizada.');
      renderAgencyDashboard();
    });
  } catch (error) {
    content.innerHTML = `<p>${error.message}</p>`;
  }
}

async function renderAdminDashboard() {
  const content = document.getElementById('adminDashboardContent');
  if (!content) return;

  if (!state.agencyToken) {
    content.innerHTML = `
      <div class="form-grid">
        <input id="adminEmail" placeholder="Email do administrador" value="admin@gasfinder.app" />
        <input id="adminPassword" type="password" value="admin123" placeholder="Senha" />
        <button class="primary-btn" id="adminLoginBtn">Entrar</button>
      </div>
    `;

    document.getElementById('adminLoginBtn').addEventListener('click', async () => {
      const email = document.getElementById('adminEmail').value;
      const password = document.getElementById('adminPassword').value;
      try {
        const payload = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        localStorage.setItem('gasfinder_token', payload.token);
        state.agencyToken = payload.token;
        renderAdminDashboard();
      } catch (error) {
        alert(error.message);
      }
    });
    return;
  }

  try {
    const stats = await apiRequest('/admin/stats', {
      headers: { Authorization: `Bearer ${state.agencyToken}` }
    });
    const agencies = await apiRequest('/admin/agencias', {
      headers: { Authorization: `Bearer ${state.agencyToken}` }
    });

    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-box"><h4>Total de agências</h4><h2>${stats.total_agencies}</h2></div>
        <div class="stat-box"><h4>Agências ativas</h4><h2>${stats.active_agencies}</h2></div>
        <div class="stat-box"><h4>Pendentes</h4><h2>${stats.pending_agencies}</h2></div>
        <div class="stat-box"><h4>Suspensas</h4><h2>${stats.suspended_agencies}</h2></div>
      </div>
      <div class="card" style="margin-top: 18px;">
        <h3>Agências</h3>
        ${agencies.map((agency) => `
          <div class="inventory-item" style="margin-top: 8px;">
            <span>${agency.name} — ${agency.status}</span>
            <button class="ghost-btn" data-approve="${agency.id}">Aprovar</button>
          </div>
        `).join('')}
      </div>
    `;

    content.querySelectorAll('[data-approve]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await apiRequest(`/admin/agencias/${btn.dataset.approve}/aprovar`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${state.agencyToken}` }
        });
        renderAdminDashboard();
      });
    });
  } catch (error) {
    content.innerHTML = `<p>${error.message}</p>`;
  }
}

function formatRelativeTime(dateString) {
  if (!dateString) return 'Atualização recente';

  const updated = new Date(dateString);
  const now = new Date();
  const diffMinutes = Math.max(0, Math.round((now - updated) / 60000));

  if (diffMinutes < 60) return `Atualizado há ${diffMinutes} minutos`;
  const diffHours = Math.round(diffMinutes / 60);
  return `Atualizado há ${diffHours} horas`;
}

document.addEventListener('DOMContentLoaded', () => {
  const navButtons = document.querySelectorAll('.nav button');
  if (navButtons.length >= 2) {
    navButtons[0].addEventListener('click', () => {
      state.screen = 'agency-dashboard';
      render();
    });
    navButtons[1].addEventListener('click', () => {
      state.screen = 'admin-dashboard';
      render();
    });
  }
  render();
});
