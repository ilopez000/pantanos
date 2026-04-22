// Accessibility helpers
function setStatus(text) {
  const s = document.getElementById('status');
  s.textContent = text;
}

async function init() {
  setStatus('Cargando lista de embalses...');

  // Fetch reservoir names from the API (Cloudflare Pages Function → D1)
  let names = [];
  try {
    const resp = await fetch('/api/reservoirs');
    if (!resp.ok) throw new Error('Error al obtener embalses: ' + resp.status);
    names = await resp.json();
  } catch (e) {
    console.error(e);
    setStatus('Error cargando embalses: ' + e.message);
    return;
  }

  const datalist = document.getElementById('reservoirs');
  names.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    datalist.appendChild(opt);
  });

  setStatus('Listo. Selecciona un embalse y pulsa Cargar.');

  // Elements
  const reservoir = document.getElementById('reservoir');
  const loadBtn = document.getElementById('loadBtn');
  const resetBtn = document.getElementById('resetBtn');
  const exportBtn = document.getElementById('exportBtn');

  // Charts — Chart.js instances
  const levelCtx = document.getElementById('levelChart').getContext('2d');
  const volCtx = document.getElementById('volumeChart').getContext('2d');
  const pctCtx = document.getElementById('percentChart').getContext('2d');

  const levelChart = new Chart(levelCtx, { type: 'line', data: { labels: [], datasets: [{ label: 'Nivel (m)', data: [], borderColor: '#0f62fe', backgroundColor: 'rgba(15,98,254,0.08)', pointRadius: 2 }] }, options: { responsive: true, plugins: { legend: { display: false } } } });
  const volChart = new Chart(volCtx, { type: 'line', data: { labels: [], datasets: [{ label: 'Volumen (hm³)', data: [], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', pointRadius: 2 }] }, options: { responsive: true, plugins: { legend: { display: false } } } });
  const pctChart = new Chart(pctCtx, { type: 'line', data: { labels: [], datasets: [{ label: 'Porcentaje', data: [], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', pointRadius: 2 }] }, options: { responsive: true, plugins: { legend: { display: false } } } });

  function renderTable(rows) {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const date = new Date(r.date).toLocaleDateString();
      tr.innerHTML = `<td>${date}</td><td>${r.level ?? ''}</td><td>${r.volume ?? ''}</td><td>${r.percent ?? ''}</td>`;
      tbody.appendChild(tr);
    });
  }

  function updateCharts(rows) {
    const labels = rows.map(r => (new Date(r.date)).toLocaleDateString());
    levelChart.data.labels = labels; levelChart.data.datasets[0].data = rows.map(r => r.level); levelChart.update();
    volChart.data.labels = labels; volChart.data.datasets[0].data = rows.map(r => r.volume); volChart.update();
    pctChart.data.labels = labels; pctChart.data.datasets[0].data = rows.map(r => r.percent); pctChart.update();
  }

  // Fetch data from the API instead of querying local SQLite
  async function queryData(name, start, end) {
    const params = new URLSearchParams({ name });
    if (start) params.set('start', start);
    if (end) params.set('end', end);

    const resp = await fetch('/api/data?' + params.toString());
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'Error en la consulta: ' + resp.status);
    }
    return resp.json();
  }

  // Store last queried rows for export
  let lastRows = [];

  loadBtn.addEventListener('click', async () => {
    const name = reservoir.value.trim();
    if (!name) { setStatus('Selecciona un embalse.'); return; }
    setStatus('Consultando datos...');
    const start = document.getElementById('startDate').value || null;
    const end = document.getElementById('endDate').value || null;
    try {
      const rows = await queryData(name, start, end);
      lastRows = rows;
      if (rows.length === 0) { setStatus('No hay registros para ese filtro.'); renderTable([]); updateCharts([]); return; }
      renderTable(rows); updateCharts(rows); setStatus(`Mostrando ${rows.length} registros de ${name}.`);
    } catch (e) { console.error(e); setStatus('Error en la consulta: ' + e.message); }
  });

  resetBtn.addEventListener('click', () => {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('reservoir').value = '';
    lastRows = [];
    renderTable([]); updateCharts([]); setStatus('Filtros restablecidos.');
  });

  exportBtn.addEventListener('click', () => {
    const name = reservoir.value.trim();
    if (!name) { setStatus('Selecciona un embalse para exportar.'); return; }
    if (lastRows.length === 0) { setStatus('Primero carga datos antes de exportar.'); return; }
    const blob = new Blob([JSON.stringify(lastRows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${name.replace(/[^a-z0-9]+/ig, '_')}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    setStatus(`Exportados ${lastRows.length} registros a JSON.`);
  });
}

init().catch(err => { console.error(err); setStatus('Error inicializando: ' + err.message); });
