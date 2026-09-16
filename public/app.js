const state = {
  screen: 'home',
  bottle: 'Botija Azul',
  location: null,
  results: [],
  radius: 5,
  agencyId: null,
  agency: null,
  agencyToken: localStorage.getItem('gasfinder_token') || '',
  user: JSON.parse(localStorage.getItem('gasfinder_user') || 'null'),
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
    bottleId: '1',
    hours: 'Segunda a Sábado, 07:00 às 18:00'
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
            <button id="agencyNavBtn">🏪 Agência</button>
          </nav>
        </header>

        <section class="hero choice-hero">
          <p class="eyebrow">GAS FINDER</p>
          <h1>Encontre gás antes de sair de casa.</h1>
          <p class="subtitle">Você é?</p>

          <div class="choice-grid">
            <button class="choice-btn primary-btn" id="clientChoiceBtn">
              <span class="choice-icon">👤</span>
              <span>CLIENTE</span>
            </button>
            <button class="choice-btn secondary-btn" id="agencyChoiceBtn">
              <span class="choice-icon">🏪</span>
              <span>AGÊNCIA</span>
            </button>
          </div>
        </section>
      </div>
    `;

    document.getElementById('clientChoiceBtn').addEventListener('click', () => { state.screen = 'client-panel'; render(); });
    document.getElementById('agencyChoiceBtn').addEventListener('click', () => { state.screen = 'agency-login'; render(); });
    document.getElementById('agencyNavBtn').addEventListener('click', () => { state.screen = 'agency-login'; render(); });
    return;
  }

  if (state.screen === 'client-panel') {
    app.innerHTML = `
      <div class="container">
        <header class="topbar">
          <div class="brand">Gas<span>Finder</span></div>
          <nav class="nav">
            <button id="backHomeBtn">Voltar</button>
          </nav>
        </header>

        <section class="hero">
          <h1>Encontre a botija certa perto de você.</h1>
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

    document.getElementById('backHomeBtn').addEventListener('click', () => { state.screen = 'home'; render(); });
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
      localStorage.removeItem('gasfinder_user');
      state.user = null;
      state.screen = 'home';
      render();
    });

    renderAgencyDashboard();
  }

  if (state.screen === 'agency-login') renderAgencyLogin();
  if (state.screen === 'agency-register') renderAgencyRegister();
  if (state.screen === 'admin-login') renderAdminLogin();

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
      localStorage.removeItem('gasfinder_user');
      state.user = null;
      state.screen = 'home';
      render();
    });

    renderAdminDashboard();
  }
}

function renderAccessShell(title, subtitle, content) {
  app.innerHTML = `<div class="container"><header class="topbar"><div class="brand">Gas<span>Finder</span></div><nav class="nav"><button id="accessBackBtn">Voltar</button></nav></header><section class="detail-page"><h2>${title}</h2><p>${subtitle}</p>${content}</section></div>`;
  document.getElementById('accessBackBtn').addEventListener('click', () => { state.screen = 'home'; render(); });
}

function renderAgencyLogin() {
  renderAccessShell('Área da Agência', 'Entre para atualizar os seus dados e a disponibilidade.', `<div class="form-grid"><label>Email<input id="agencyEmail" type="email" placeholder="Email" /></label><label>Palavra-passe<input id="agencyPassword" type="password" placeholder="Palavra-passe" /></label><button class="primary-btn" id="agencyLoginBtn">ENTRAR</button><p class="muted-copy">Ainda não possui uma conta?</p><button class="ghost-btn" id="agencyRegisterBtn">CADASTRAR AGÊNCIA</button></div>`);
  document.getElementById('agencyRegisterBtn').addEventListener('click', () => { state.screen = 'agency-register'; render(); });
  document.getElementById('agencyLoginBtn').addEventListener('click', async () => {
    try {
      const payload = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email: document.getElementById('agencyEmail').value, password: document.getElementById('agencyPassword').value }) });
      if (payload.user.role !== 'agency') throw new Error('Use as credenciais de uma agência.');
      setSession(payload); state.screen = 'agency-dashboard'; render();
    } catch (error) { alert(error.message); }
  });
}

function renderAgencyRegister() {
  renderAccessShell('Cadastro da Agência', 'A agência ficará pendente até a aprovação do administrador.', `<div class="form-grid"><input id="registerName" placeholder="Nome da agência" /><input id="registerResponsible" placeholder="Nome do responsável" /><input id="registerPhone" placeholder="Número de telefone" /><input id="registerEmail" type="email" placeholder="Email" /><input id="registerPassword" type="password" placeholder="Palavra-passe" /><input id="registerAddress" placeholder="Endereço" /><input id="registerLat" placeholder="Localização atual / Latitude" /><input id="registerLng" placeholder="Localização atual / Longitude" /><input id="registerHours" placeholder="Horário de funcionamento" value="Segunda a Sábado, 07:00 às 18:00" /><button class="primary-btn" id="registerAgencyBtn">CADASTRAR AGÊNCIA</button></div>`);
  document.getElementById('registerAgencyBtn').addEventListener('click', async () => {
    const value = (id) => document.getElementById(id).value.trim();
    try {
      await apiRequest('/agencias', { method: 'POST', body: JSON.stringify({ name: value('registerName'), responsible: value('registerResponsible'), email: value('registerEmail'), phone: value('registerPhone'), password: value('registerPassword'), address: value('registerAddress'), latitude: value('registerLat'), longitude: value('registerLng'), hours: value('registerHours') }) });
      alert('Cadastro realizado com sucesso. Sua agência está aguardando aprovação do administrador.'); state.screen = 'agency-login'; render();
    } catch (error) { alert(error.message); }
  });
}

function renderAdminLogin() {
  renderAccessShell('Acesso administrativo', 'Área restrita ao administrador do GasFinder.', `<div class="form-grid"><input id="adminEmail" type="email" placeholder="Email" value="admin@gasfinder.app" /><input id="adminPassword" type="password" placeholder="Palavra-passe" value="admin123" /><button class="primary-btn" id="adminLoginBtn">Entrar</button></div>`);
  document.getElementById('adminLoginBtn').addEventListener('click', async () => {
    try {
      const payload = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email: document.getElementById('adminEmail').value, password: document.getElementById('adminPassword').value }) });
      if (payload.user.role !== 'admin') throw new Error('Acesso reservado ao administrador.');
      setSession(payload); state.screen = 'admin-dashboard'; render();
    } catch (error) { alert(error.message); }
  });
}

function setSession(payload) {
  localStorage.setItem('gasfinder_token', payload.token);
  localStorage.setItem('gasfinder_user', JSON.stringify(payload.user));
  state.agencyToken = payload.token; state.user = payload.user;
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
    const payload = await apiRequest(`/agencias/proximas?latitude=${latitude}&longitude=${longitude}&radius=${state.radius}&bottleName=${encodeURIComponent(state.bottle)}`);
    state.results = payload.results || [];
    state.radius = payload.radius || state.radius;
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
    list.innerHTML = `<div class="card"><p>Nenhuma agência encontrada em ${state.radius} km.</p><button class="primary-btn" id="expandSearchBtn">Pesquisar em ${Math.min(state.radius * 2, 50)} km</button></div>`;
    document.getElementById('expandSearchBtn').addEventListener('click', () => { state.radius = Math.min(state.radius * 2, 50); fetchNearbyAgencies(); });
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
        <span class="status ${agency.status === 'APPROVED' ? 'open' : 'closed'}">${agency.status === 'APPROVED' ? 'Aberta' : 'Fechada'}</span>
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

  try {
    if (!state.user || state.user.role !== 'agency') { state.screen = 'agency-login'; render(); return; }
    const agency = await apiRequest(`/agencias/${state.user.id}/dashboard`, { headers: { Authorization: `Bearer ${state.agencyToken}` } });

    content.innerHTML = `
      <h3>${agency.name}</h3>
      <p>${agency.address} · ${agency.phone} · ${agency.hours || 'Horário não informado'}</p>
      <div class="form-grid"><input id="agencyPhone" placeholder="Telefone" value="${agency.phone || ''}" /><input id="agencyAddress" placeholder="Endereço" value="${agency.address || ''}" /><input id="agencyHours" placeholder="Horário" value="${agency.hours || ''}" /><button class="secondary-btn" id="updateAgencyProfileBtn">Salvar dados da agência</button></div>
      <div class="availability-editor">
        <button class="primary-btn" id="updateAvailabilityBtn" type="button">Atualizar dados</button>
        <div class="availability-form hidden" id="availabilityForm">
          <h3>Atualizar disponibilidade</h3>
          ${[1, 2].map((bottleId) => {
            const item = agency.availability.find((entry) => Number(entry.bottle_id) === bottleId) || { available: 0, price: 0 };
            return `<fieldset class="availability-fieldset"><legend>${dbBottleName(bottleId)}</legend><label><input type="radio" name="available-${bottleId}" value="1" ${Number(item.available) === 1 ? 'checked' : ''}> Disponível</label><label><input type="radio" name="available-${bottleId}" value="0" ${Number(item.available) !== 1 ? 'checked' : ''}> Indisponível</label><label class="price-field">Preço: <input data-price="${bottleId}" type="number" value="${item.price || 0}" min="0" step="1" required> Kz</label></fieldset>`;
          }).join('')}
          <button class="secondary-btn" id="saveAvailabilityBtn" type="button">Salvar alterações</button>
        </div>
      </div>
    `;

    document.getElementById('updateAgencyProfileBtn').addEventListener('click', async () => {
      await apiRequest(`/agencias/${agency.id}/profile`, { method: 'PUT', headers: { Authorization: `Bearer ${state.agencyToken}` }, body: JSON.stringify({ phone: document.getElementById('agencyPhone').value, address: document.getElementById('agencyAddress').value, hours: document.getElementById('agencyHours').value }) });
      renderAgencyDashboard();
    });
    document.getElementById('updateAvailabilityBtn').addEventListener('click', () => {
      const form = document.getElementById('availabilityForm');
      form.classList.toggle('hidden');
    });
    document.getElementById('saveAvailabilityBtn').addEventListener('click', async () => {
      const items = [1, 2].map((bottleId) => ({
        bottleId,
        available: content.querySelector(`input[name="available-${bottleId}"]:checked`).value === '1',
        price: Number(content.querySelector(`[data-price="${bottleId}"]`).value)
      }));
      if (items.some((item) => !Number.isFinite(item.price) || item.price < 0)) {
        alert('Informe preços válidos para as duas botijas.');
        return;
      }
      const saveButton = document.getElementById('saveAvailabilityBtn');
      saveButton.disabled = true;
      try {
        await apiRequest(`/agencias/${agency.id}/availability`, { method: 'PUT', headers: { Authorization: `Bearer ${state.agencyToken}` }, body: JSON.stringify({ items }) });
        alert('Disponibilidade e preços atualizados.');
        renderAgencyDashboard();
      } catch (error) {
        alert(error.message);
        saveButton.disabled = false;
      }
    });
  } catch (error) {
    content.innerHTML = `<p>${error.message}</p>`;
  }
}

function dbBottleName(id) { return Number(id) === 1 ? 'Botija Azul' : Number(id) === 2 ? 'Botija Laranja' : 'Botija'; }

async function renderAdminDashboard() {
  const content = document.getElementById('adminDashboardContent');
  if (!content) return;

  try {
    if (!state.user || state.user.role !== 'admin') { state.screen = 'admin-login'; render(); return; }
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
        <div class="stat-box"><h4>Com gás disponível</h4><h2>${stats.gas_available_agencies}</h2></div>
      </div>
      <div class="card" style="margin-top: 18px;">
        <h3>Agências</h3>
        ${agencies.map((agency) => `<div class="inventory-item" style="margin-top: 8px;"><span><strong>${agency.name}</strong><br>${agency.address} · ${agency.phone}<br><small>${String(agency.status || 'PENDING')} · ${agency.availability.filter((item) => Number(item.available) === 1).map((item) => item.bottle_name).join(', ') || 'Sem gás disponível'}</small></span><span class="card-actions">${agency.status === 'PENDING' ? `<button class="ghost-btn" data-approve="${agency.id}">Aprovar</button><button class="ghost-btn" data-reject="${agency.id}">Rejeitar</button>` : ''}${agency.status === 'APPROVED' ? `<button class="ghost-btn" data-suspend="${agency.id}">Desativar</button>` : ''}<button class="ghost-btn" data-delete="${agency.id}">Excluir</button></span></div>`).join('')}
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
    content.querySelectorAll('[data-reject]').forEach((btn) => btn.addEventListener('click', () => adminAction(`/admin/agencias/${btn.dataset.reject}/rejeitar`, 'PUT')));
    content.querySelectorAll('[data-suspend]').forEach((btn) => btn.addEventListener('click', () => adminAction(`/admin/agencias/${btn.dataset.suspend}/suspender`, 'PUT')));
    content.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', () => adminAction(`/admin/agencias/${btn.dataset.delete}`, 'DELETE')));
  } catch (error) {
    content.innerHTML = `<p>${error.message}</p>`;
  }
}

async function adminAction(url, method) {
  try { await apiRequest(url, { method, headers: { Authorization: `Bearer ${state.agencyToken}` } }); renderAdminDashboard(); } catch (error) { alert(error.message); }
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
  const route = window.location.pathname;
  if (route === '/agencia/cadastro') state.screen = 'agency-register';
  else if (route === '/agencia/dashboard') state.screen = 'agency-dashboard';
  else if (route === '/agencia') state.screen = 'agency-login';
  else if (route === '/admin/dashboard' || route === '/admin/agencias' || route === '/admin/solicitacoes') state.screen = 'admin-dashboard';
  else if (route === '/admin') state.screen = 'admin-login';
  if (!['agency-login', 'agency-register', 'admin-login', 'admin-dashboard', 'agency-dashboard', 'client-panel', 'results', 'agency-detail', 'home'].includes(state.screen)) {
    state.screen = 'home';
  }
  render();
});
