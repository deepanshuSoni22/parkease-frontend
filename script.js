const BASE = 'https://parkease-production-web.up.railway.app';
let AUTH = null; // base64 encoded
let SESSION = { username: '', role: '' };

function b64(u, p) {
	return btoa(u + ':' + p);
}
function headers() {
	return { 'Content-Type': 'application/json', Authorization: 'Basic ' + AUTH };
}

async function api(method, path, body) {
	const opts = { method, headers: headers() };
	if (body) opts.body = JSON.stringify(body);
	const r = await fetch(BASE + path, opts);
	if (r.status === 204) return null;
	const text = await r.text();
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		data = text;
	}
	if (!r.ok) throw new Error(data?.message || data || r.statusText);
	return data;
}

// Auth
async function doLogin() {
	const u = document.getElementById('login-user').value.trim();
	const p = document.getElementById('login-pass').value;
	const role = document.getElementById('login-role').value;
	if (!u || !p) {
		showAlert('login-alert', 'Username and password required');
		return;
	}
	AUTH = b64(u, p);
	SESSION = { username: u, role };
	try {
		await api('GET', '/api/v1/health');
		startApp();
	} catch (e) {
		AUTH = null;
		showAlert('login-alert', 'Login failed. Check credentials.');
	}
}

function doLogout() {
	AUTH = null;
	SESSION = {};
	document.getElementById('app-screen').style.display = 'none';
	document.getElementById('login-screen').style.display = 'flex';
}

function startApp() {
	document.getElementById('login-screen').style.display = 'none';
	document.getElementById('app-screen').style.display = 'flex';
	document.getElementById('sidebar-name').textContent = SESSION.username;
	document.getElementById('sidebar-role').textContent = SESSION.role;
	document.getElementById('sidebar-avatar').textContent = SESSION.username.slice(0, 2).toUpperCase();
	if (SESSION.role === 'ADMIN') document.getElementById('admin-nav-section').style.display = 'block';
	goto('dashboard');
}

// Register
function showRegister() {
	openModal('modal-register');
}
async function doRegister() {
	const u = document.getElementById('reg-user').value.trim();
	const p = document.getElementById('reg-pass').value;
	const r = document.getElementById('reg-role').value;
	try {
		await api('POST', '/api/v1/auth/register', { username: u, password: p, role: r });
		closeModal('modal-register');
		document.getElementById('login-user').value = u;
		showAlert('login-alert', 'Registered! Sign in now.', true);
	} catch (e) {
		showAlert('reg-alert', e.message);
	}
}

// Navigation
function goto(page) {
	document.querySelectorAll('.page').forEach((p) => (p.style.display = 'none'));
	document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
	document.getElementById('page-' + page).style.display = 'block';
	const nav = document.getElementById('nav-' + page);
	if (nav) nav.classList.add('active');
	loadPage(page);
}

async function loadPage(page) {
	if (page === 'dashboard') loadDashboard();
	if (page === 'lots') loadLots();
	if (page === 'slots') loadSlots();
	if (page === 'bookings') loadBookings();
	if (page === 'admin-users') loadAdminUsers();
	if (page === 'admin-lots') loadAdminLots();
}

// Dashboard
async function loadDashboard() {
	try {
		const [lots, slots, bookings] = await Promise.allSettled([
			api('GET', '/api/v1/parking-lots'),
			api('GET', '/api/v1/parking-slots'),
			api('GET', '/api/v1/bookings/my'),
		]);
		document.getElementById('dash-lots').textContent = lots.status === 'fulfilled' ? lots.value.length : '—';
		document.getElementById('dash-slots').textContent = slots.status === 'fulfilled' ? slots.value.length : '—';
		document.getElementById('dash-bookings').textContent =
			bookings.status === 'fulfilled' ? bookings.value.length : '—';
		if (bookings.status === 'fulfilled') {
			renderBookingTable(bookings.value.slice(0, 5), 'dash-booking-list', true);
		}
	} catch (e) {}
}

// Lots
async function loadLots() {
	const wrap = document.getElementById('lots-table-wrap');
	try {
		const data = await api('GET', '/api/v1/parking-lots');
		if (!data.length) {
			wrap.innerHTML = '<div class="empty-state">No lots found</div>';
			return;
		}
		wrap.innerHTML = `<table class="tbl">
      <thead><tr><th>ID</th><th>Name</th><th>Location</th><th>Rate/hr</th><th>Slots</th><th>Owner</th><th>Status</th><th></th></tr></thead>
      <tbody>${data
			.map(
				(l) => `<tr>
        <td class="mono">${l.id}</td>
        <td style="font-weight:500">${esc(l.name)}</td>
        <td style="color:var(--muted)">${esc(l.location)}</td>
        <td>₹${l.hourlyRate}</td>
        <td>${l.totalSlots}</td>
        <td>${esc(l.ownerName || '—')}</td>
        <td><span class="badge ${l.active ? 'badge-success' : 'badge-neutral'}">${l.active ? 'Active' : 'Inactive'}</span></td>
        <td><div class="row-actions">
          <button class="btn btn-sm btn-danger" onclick="deleteLot(${l.id})">Delete</button>
        </div></td>
      </tr>`
			)
			.join('')}</tbody>
    </table>`;
	} catch (e) {
		wrap.innerHTML = `<div class="empty-state" style="color:var(--danger)">${e.message}</div>`;
	}
}

async function createLot() {
	const body = {
		name: document.getElementById('lot-name').value,
		location: document.getElementById('lot-location').value,
		hourlyRate: parseFloat(document.getElementById('lot-rate').value),
		totalSlots: parseInt(document.getElementById('lot-slots').value),
		active: document.getElementById('lot-active').checked,
	};
	try {
		await api('POST', '/api/v1/parking-lots', body);
		closeModal('modal-lot');
		loadLots();
	} catch (e) {
		showAlert('lot-alert', e.message);
	}
}

async function deleteLot(id) {
	if (!confirm('Delete lot #' + id + '?')) return;
	try {
		await api('DELETE', '/api/v1/parking-lots/' + id);
		loadLots();
	} catch (e) {
		alert(e.message);
	}
}

// Slots
async function loadSlots() {
	const wrap = document.getElementById('slots-table-wrap');
	try {
		const data = await api('GET', '/api/v1/parking-slots');
		if (!data.length) {
			wrap.innerHTML = '<div class="empty-state">No slots found</div>';
			return;
		}
		wrap.innerHTML = `<table class="tbl">
      <thead><tr><th>ID</th><th>Slot #</th><th>Type</th><th>Available</th><th></th></tr></thead>
      <tbody>${data
			.map(
				(s) => `<tr>
        <td class="mono">${s.id}</td>
        <td style="font-weight:500">${s.slotNumber}</td>
        <td>${esc(s.slotType)}</td>
        <td><span class="badge ${s.available ? 'badge-success' : 'badge-danger'}">${s.available ? 'Available' : 'Occupied'}</span></td>
        <td><div class="row-actions">
          <button class="btn btn-sm btn-danger" onclick="deleteSlot(${s.id})">Delete</button>
        </div></td>
      </tr>`
			)
			.join('')}</tbody>
    </table>`;
	} catch (e) {
		wrap.innerHTML = `<div class="empty-state" style="color:var(--danger)">${e.message}</div>`;
	}
}

async function createSlot() {
	const body = {
		slotNumber: parseInt(document.getElementById('slot-number').value),
		slotType: document.getElementById('slot-type').value,
		isAvailable: document.getElementById('slot-avail').checked,
	};
	try {
		await api('POST', '/api/v1/parking-slots', body);
		closeModal('modal-slot');
		loadSlots();
	} catch (e) {
		showAlert('slot-alert', e.message);
	}
}

async function deleteSlot(id) {
	if (!confirm('Delete slot #' + id + '?')) return;
	try {
		await api('DELETE', '/api/v1/parking-slots/' + id);
		loadSlots();
	} catch (e) {
		alert(e.message);
	}
}

// Bookings
async function loadBookings() {
	const wrap = document.getElementById('bookings-table-wrap');
	try {
		const data = await api('GET', '/api/v1/bookings/my');
		if (!data.length) {
			wrap.innerHTML = '<div class="empty-state">No bookings yet</div>';
			return;
		}
		renderBookingTable(data, 'bookings-table-wrap', false);
	} catch (e) {
		wrap.innerHTML = `<div class="empty-state" style="color:var(--danger)">${e.message}</div>`;
	}
}

function renderBookingTable(data, containerId, compact) {
	const el = document.getElementById(containerId);
	if (!data.length) {
		el.innerHTML = '<div class="empty-state">No bookings</div>';
		return;
	}
	el.innerHTML = `<table class="tbl">
    <thead><tr><th>ID</th><th>Lot</th><th>Slot</th><th>Type</th><th>Status</th><th>Booked at</th>${!compact ? '<th></th>' : ''}</tr></thead>
    <tbody>${data
		.map(
			(b) => `<tr>
      <td class="mono">${b.id}</td>
      <td style="font-weight:500">${esc(b.parkingLotName || '—')}</td>
      <td>${b.slotNumber || b.slotId}</td>
      <td style="color:var(--muted)">${esc(b.slotType || '—')}</td>
      <td><span class="badge ${b.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}">${b.status}</span></td>
      <td style="color:var(--muted)">${b.bookedAt ? new Date(b.bookedAt).toLocaleString() : '—'}</td>
      ${
			!compact
				? `<td><div class="row-actions">
        ${b.status === 'ACTIVE' ? `<button class="btn btn-sm" onclick="completeBooking(${b.id})">Complete</button>` : ''}
      </div></td>`
				: ''
		}
    </tr>`
		)
		.join('')}</tbody>
  </table>`;
}

async function createBooking() {
	const slotId = parseInt(document.getElementById('booking-slot-id').value);
	if (!slotId) {
		showAlert('booking-alert', 'Enter a valid slot ID');
		return;
	}
	try {
		await api('POST', '/api/v1/bookings', { slotId });
		closeModal('modal-booking');
		loadBookings();
	} catch (e) {
		showAlert('booking-alert', e.message);
	}
}

async function completeBooking(id) {
	try {
		await api('PUT', '/api/v1/bookings/' + id + '/complete');
		loadBookings();
	} catch (e) {
		alert(e.message);
	}
}

// Admin
async function loadAdminUsers() {
	const wrap = document.getElementById('admin-users-wrap');
	try {
		const data = await api('GET', '/api/v1/admin/users');
		if (!data.length) {
			wrap.innerHTML = '<div class="empty-state">No users</div>';
			return;
		}
		wrap.innerHTML = `<table class="tbl">
      <thead><tr><th>ID</th><th>Username</th><th>Role</th><th></th></tr></thead>
      <tbody>${data
			.map(
				(u) => `<tr>
        <td class="mono">${u.id}</td>
        <td style="font-weight:500">${esc(u.username)}</td>
        <td><span class="badge ${roleClass(u.role)}">${u.role}</span></td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">Delete</button></td>
      </tr>`
			)
			.join('')}</tbody>
    </table>`;
	} catch (e) {
		wrap.innerHTML = `<div class="empty-state" style="color:var(--danger)">${e.message}</div>`;
	}
}

async function deleteUser(id) {
	if (!confirm('Delete user #' + id + '?')) return;
	try {
		await api('DELETE', '/api/v1/admin/users/' + id);
		loadAdminUsers();
	} catch (e) {
		alert(e.message);
	}
}

async function loadAdminLots() {
	const wrap = document.getElementById('admin-lots-wrap');
	try {
		const data = await api('GET', '/api/v1/admin/parking-lots');
		wrap.innerHTML = `<table class="tbl">
      <thead><tr><th>ID</th><th>Name</th><th>Location</th><th>Rate/hr</th><th>Slots</th><th>Owner</th><th>Status</th></tr></thead>
      <tbody>${data
			.map(
				(l) => `<tr>
        <td class="mono">${l.id}</td>
        <td style="font-weight:500">${esc(l.name)}</td>
        <td style="color:var(--muted)">${esc(l.location)}</td>
        <td>₹${l.hourlyRate}</td>
        <td>${l.totalSlots}</td>
        <td>${esc(l.ownerName || '—')}</td>
        <td><span class="badge ${l.active ? 'badge-success' : 'badge-neutral'}">${l.active ? 'Active' : 'Inactive'}</span></td>
      </tr>`
			)
			.join('')}</tbody>
    </table>`;
	} catch (e) {
		wrap.innerHTML = `<div class="empty-state" style="color:var(--danger)">${e.message}</div>`;
	}
}

// Utils
function roleClass(r) {
	return r === 'ADMIN' ? 'badge-warning' : r === 'OWNER' ? 'badge-success' : 'badge-neutral';
}
function esc(s) {
	return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function showAlert(id, msg, ok) {
	const el = document.getElementById(id);
	el.textContent = msg;
	el.className = 'alert show ' + (ok ? 'alert-ok' : 'alert-err');
}
function openModal(id) {
	document.getElementById(id).classList.add('open');
}
function closeModal(id) {
	document.getElementById(id).classList.remove('open');
	document.querySelectorAll('#' + id + ' .alert').forEach((a) => a.classList.remove('show'));
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach((o) => {
	o.addEventListener('click', (e) => {
		if (e.target === o) closeModal(o.id);
	});
});

// Enter to login
document.addEventListener('keydown', (e) => {
	if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') doLogin();
});
