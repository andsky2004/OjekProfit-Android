'use strict';

const STORAGE_RECORDS = 'ojek_records';
const STORAGE_SETTINGS = 'ojek_settings';
const STORAGE_THEME = 'theme';

const defaultSettings = { dailyTarget: 150000, defaultFuel: 40000, defaultTax: 15, defaultMaint: 5 };
let records = readJSON(STORAGE_RECORDS, []);
let settings = { ...defaultSettings, ...readJSON(STORAGE_SETTINGS, {}) };
let chartInstance = null;

const $ = (id) => document.getElementById(id);
const entryForm = $('entryForm');
const inputDate = $('inputDate');
const inputPlatform = $('inputPlatform');
const inputTrips = $('inputTrips');
const inputGross = $('inputGross');
const inputFuel = $('inputFuel');
const inputOtherExp = $('inputOtherExp');
const inputTaxRate = $('inputTaxRate');
const inputMaintRate = $('inputMaintRate');
const inputNotes = $('inputNotes');
const historyTableBody = $('historyTableBody');
const filterPlatform = $('filterPlatform');
const filterMonth = $('filterMonth');
const settingsModal = $('settingsModal');

function readJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString('id-ID');
}
function rupiah(value) {
  return `Rp ${formatNumber(value)}`;
}
function saveData() {
  localStorage.setItem(STORAGE_RECORDS, JSON.stringify(records));
  localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
}
function getNumbers() {
  const gross = Math.max(0, Number(inputGross.value) || 0);
  const fuel = Math.max(0, Number(inputFuel.value) || 0);
  const otherExp = Math.max(0, Number(inputOtherExp.value) || 0);
  const taxRate = Math.min(100, Math.max(0, Number(inputTaxRate.value) || 0));
  const maintRate = Math.min(100, Math.max(0, Number(inputMaintRate.value) || 0));
  const taxAmount = gross * taxRate / 100;
  const maintAmount = gross * maintRate / 100;
  const netAmount = gross - taxAmount - maintAmount - fuel - otherExp;
  return { gross, fuel, otherExp, taxRate, maintRate, taxAmount, maintAmount, netAmount };
}
function calculateCurrentInput() {
  const values = getNumbers();
  $('calcTax').textContent = `-${rupiah(values.taxAmount)}`;
  $('calcMaint').textContent = `-${rupiah(values.maintAmount)}`;
  $('calcNet').textContent = rupiah(values.netAmount);
}
function initDefaults() {
  inputDate.value = localDateString();
  inputFuel.value = settings.defaultFuel;
  inputTaxRate.value = settings.defaultTax;
  inputMaintRate.value = settings.defaultMaint;
  $('maintPercentLabel').textContent = `(${settings.defaultMaint}% alokasi)`;
  calculateCurrentInput();
}
function renderAll() {
  renderStats();
  populateMonthFilter();
  renderTable();
  renderChart();
}
function renderStats() {
  const today = localDateString();
  const month = today.slice(0, 7);
  let todayNet = 0, todayGross = 0, todayExp = 0, todayMaint = 0, monthNet = 0, monthTrips = 0;
  records.forEach((r) => {
    const tax = Number(r.taxAmount) || 0;
    const maint = Number(r.maintAmount) || 0;
    if (r.date === today) {
      todayNet += Number(r.netAmount) || 0;
      todayGross += Number(r.gross) || 0;
      todayExp += (Number(r.fuel) || 0) + (Number(r.otherExp) || 0) + tax;
      todayMaint += maint;
    }
    if ((r.date || '').startsWith(month)) {
      monthNet += Number(r.netAmount) || 0;
      monthTrips += Number(r.trips) || 0;
    }
  });
  $('statTodayNet').textContent = rupiah(todayNet);
  $('statTodayGross').textContent = `Kotor: ${rupiah(todayGross)}`;
  $('statTodayExp').textContent = rupiah(todayExp);
  $('statTodayMaint').textContent = rupiah(todayMaint);
  $('statMonthNet').textContent = rupiah(monthNet);
  $('statTripCount').textContent = `${monthTrips} total order`;
  const target = Math.max(1, Number(settings.dailyTarget) || defaultSettings.dailyTarget);
  const pct = Math.min(100, Math.max(0, todayNet / target * 100));
  $('targetProgressBar').style.width = `${pct}%`;
  $('targetProgressText').textContent = `${Math.round(pct)}% (${rupiah(todayNet)} / ${rupiah(target)})`;
}
function safeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}
function renderTable() {
  const platform = filterPlatform.value;
  const month = filterMonth.value;
  const filtered = records.filter((r) =>
    (platform === 'ALL' || r.platform === platform) &&
    (month === 'ALL' || (r.date || '').startsWith(month))
  );
  if (!filtered.length) {
    historyTableBody.innerHTML = '<tr><td colspan="6" class="empty-row">Belum ada riwayat transaksi.</td></tr>';
    return;
  }
  historyTableBody.innerHTML = filtered.map((r) => {
    const totalExp = (Number(r.fuel) || 0) + (Number(r.otherExp) || 0) +
      (Number(r.taxAmount) || 0) + (Number(r.maintAmount) || 0);
    return `<tr>
      <td>${safeText(r.date)}</td>
      <td><span class="platform-pill">${safeText(r.platform)}</span></td>
      <td class="right">${rupiah(r.gross)}</td>
      <td class="right negative">-${rupiah(totalExp)}</td>
      <td class="right"><strong>${rupiah(r.netAmount)}</strong></td>
      <td class="center"><button class="delete-btn" data-delete-id="${Number(r.id)}" title="Hapus catatan" aria-label="Hapus catatan"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`;
  }).join('');
}
function deleteRecord(id) {
  const record = records.find((r) => Number(r.id) === Number(id));
  if (!record) return;
  if (!confirm(`Hapus catatan ${record.date} — ${record.platform} dengan omset ${rupiah(record.gross)}? Data yang dihapus tidak dapat dikembalikan.`)) return;
  records = records.filter((r) => Number(r.id) !== Number(id));
  saveData();
  renderAll();
}
function populateMonthFilter() {
  const previous = filterMonth.value;
  const months = [...new Set(records.map((r) => (r.date || '').slice(0, 7)).filter(Boolean))].sort().reverse();
  filterMonth.innerHTML = '<option value="ALL">Semua Bulan</option>' +
    months.map((month) => `<option value="${month}">${month}</option>`).join('');
  if (months.includes(previous)) filterMonth.value = previous;
}
function renderChart() {
  const canvas = $('trendChart');
  if (!canvas) return;
  const labels = [], dataNet = [], dataGross = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = localDateString(d);
    labels.push(date.slice(5));
    const dayRecords = records.filter((r) => r.date === date);
    dataNet.push(dayRecords.reduce((sum, r) => sum + (Number(r.netAmount) || 0), 0));
    dataGross.push(dayRecords.reduce((sum, r) => sum + (Number(r.gross) || 0), 0));
  }
  if (chartInstance && typeof chartInstance.destroy === 'function') chartInstance.destroy();
  // Grafik offline: gunakan Chart.js lokal jika tersedia, atau gambar canvas sederhana.
  if (typeof Chart === 'undefined') {
    drawOfflineChart(canvas, labels, dataNet, dataGross);
    return;
  }
  const dark = document.documentElement.classList.contains('dark');
  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [
      { label: 'Pendapatan Bersih', data: dataNet, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.12)', fill: true, tension: .3 },
      { label: 'Omset Kotor', data: dataGross, borderColor: '#94a3b8', borderDash: [5, 5], fill: false, tension: .3 }
    ]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { color: dark ? '#e2e8f0' : '#475569', boxWidth: 12, font: { size: 11 } } } },
      scales: {
        y: { ticks: { color: dark ? '#cbd5e1' : '#64748b', callback: (value) => `Rp ${Math.round(value / 1000)}k`, font: { size: 10 } }, grid: { color: dark ? '#334155' : '#e2e8f0' } },
        x: { ticks: { color: dark ? '#cbd5e1' : '#64748b', font: { size: 10 } }, grid: { display: false } }
      }
    }
  });
}

function drawOfflineChart(canvas, labels, dataNet, dataGross) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(280, Math.floor(rect.width || 600));
  const height = Math.max(180, Math.floor(rect.height || 230));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const dark = document.documentElement.classList.contains('dark');
  const textColor = dark ? '#cbd5e1' : '#64748b';
  const gridColor = dark ? '#334155' : '#e2e8f0';
  const green = '#10b981', gray = '#94a3b8';
  const left = 48, right = 12, top = 24, bottom = 28;
  const plotW = width - left - right, plotH = height - top - bottom;
  const maxValue = Math.max(1, ...dataNet, ...dataGross);
  const roundedMax = Math.ceil(maxValue / 50000) * 50000 || 50000;
  ctx.clearRect(0, 0, width, height);
  ctx.font = '10px sans-serif';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const y = top + plotH * i / 4;
    const value = roundedMax * (1 - i / 4);
    ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    ctx.fillText(value >= 1000 ? `${Math.round(value / 1000)}k` : String(Math.round(value)), left - 7, y);
  }
  const xAt = (i) => left + (labels.length <= 1 ? plotW / 2 : i * plotW / (labels.length - 1));
  const yAt = (v) => top + plotH - (v / roundedMax) * plotH;
  function drawLine(data, color, dashed, fill) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.beginPath();
    data.forEach((v, i) => { const x = xAt(i), y = yAt(v); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    if (fill && data.length) {
      ctx.lineTo(xAt(data.length - 1), top + plotH);
      ctx.lineTo(xAt(0), top + plotH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(16,185,129,.10)'; ctx.fill();
      ctx.beginPath();
      data.forEach((v, i) => { const x = xAt(i), y = yAt(v); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    }
    ctx.stroke();
    ctx.setLineDash([]);
    data.forEach((v, i) => { ctx.beginPath(); ctx.arc(xAt(i), yAt(v), 2.5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); });
    ctx.restore();
  }
  drawLine(dataGross, gray, true, false);
  drawLine(dataNet, green, false, true);
  ctx.fillStyle = textColor; ctx.textAlign = 'center';
  labels.forEach((label, i) => ctx.fillText(label, xAt(i), height - 12));
  ctx.textAlign = 'left'; ctx.font = '11px sans-serif';
  ctx.fillStyle = green; ctx.fillRect(left, 5, 12, 3); ctx.fillText('Pendapatan Bersih', left + 17, 7);
  ctx.fillStyle = gray; ctx.fillRect(left + 135, 5, 12, 3); ctx.fillText('Omset Kotor', left + 152, 7);
}

function exportCSV() {
  if (!records.length) { alert('Belum ada data untuk diekspor.'); return; }
  const headers = ['ID','Tanggal','Platform','Order','Omset Kotor','Bensin','Biaya Lain','Persen Potongan','Potongan Aplikasi','Persen Servis','Tabungan Servis','Bersih','Catatan'];
  const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = records.map((r) => [
    r.id, r.date, r.platform, r.trips, r.gross, r.fuel, r.otherExp,
    r.taxRate, r.taxAmount, r.maintRate, r.maintAmount, r.netAmount, r.notes
  ].map(csvCell).join(','));
  const csv = '\uFEFF' + [headers.map(csvCell).join(','), ...rows].join('\r\n');
  const filename = `Rekap_OjekProfit_${localDateString()}.csv`;
  if (window.Android && typeof window.Android.saveCsv === 'function') {
    window.Android.saveCsv(filename, csv);
    return;
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function openSettings() {
  $('settingTarget').value = settings.dailyTarget;
  $('settingDefaultFuel').value = settings.defaultFuel;
  $('settingDefaultTax').value = settings.defaultTax;
  $('settingDefaultMaint').value = settings.defaultMaint;
  settingsModal.classList.remove('hidden');
}
function closeSettings() { settingsModal.classList.add('hidden'); }
function setupTheme() {
  const dark = localStorage.getItem(STORAGE_THEME) === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  updateThemeIcon();
}
function updateThemeIcon() {
  const dark = document.documentElement.classList.contains('dark');
  $('themeIcon').className = dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  if (chartInstance) renderChart();
}

document.addEventListener('DOMContentLoaded', () => {
  setupTheme();
  initDefaults();
  renderAll();

  entryForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!inputDate.value) { alert('Tanggal wajib diisi.'); return; }
    const values = getNumbers();
    const record = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      date: inputDate.value,
      platform: inputPlatform.value,
      trips: Math.max(0, parseInt(inputTrips.value, 10) || 0),
      ...values,
      notes: inputNotes.value.trim()
    };
    records.unshift(record);
    saveData();
    renderAll();
    inputGross.value = '';
    inputTrips.value = '';
    inputNotes.value = '';
    calculateCurrentInput();
    alert('Catatan berhasil disimpan.');
  });

  [inputGross, inputFuel, inputOtherExp, inputTaxRate, inputMaintRate].forEach((el) => el.addEventListener('input', calculateCurrentInput));
  filterPlatform.addEventListener('change', renderTable);
  filterMonth.addEventListener('change', renderTable);
  historyTableBody.addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete-id]');
    if (button) deleteRecord(button.dataset.deleteId);
  });
  $('exportCsvBtn').addEventListener('click', exportCSV);
  $('openSettingsBtn').addEventListener('click', openSettings);
  $('closeSettingsBtn').addEventListener('click', closeSettings);
  settingsModal.addEventListener('click', (event) => { if (event.target === settingsModal) closeSettings(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSettings(); });
  $('saveSettingsBtn').addEventListener('click', () => {
    const target = Number($('settingTarget').value);
    const fuel = Number($('settingDefaultFuel').value);
    const tax = Number($('settingDefaultTax').value);
    const maint = Number($('settingDefaultMaint').value);
    if (!(target > 0) || fuel < 0 || tax < 0 || tax > 100 || maint < 0 || maint > 100) {
      alert('Periksa pengaturan. Target harus lebih dari 0 dan persentase harus 0–100.');
      return;
    }
    settings = { dailyTarget: target, defaultFuel: fuel, defaultTax: tax, defaultMaint: maint };
    saveData();
    initDefaults();
    renderAll();
    closeSettings();
  });
  $('themeToggleBtn').addEventListener('click', () => {
    const dark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(STORAGE_THEME, dark ? 'dark' : 'light');
    updateThemeIcon();
  });
});

window.addEventListener('resize', () => {
  if (typeof Chart === 'undefined') renderChart();
});
