const PROD_API_BASE = 'https://parkease-production-web.up.railway.app';
const LOCAL_API_BASE = 'http://localhost:8080';

function resolveApiBase() {
	const { hostname } = window.location;
	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		return LOCAL_API_BASE;
	}
	return PROD_API_BASE;
}

const BASE = resolveApiBase();

let SESSION = { username: '', role: '' };
const ROLE_NAV = {
	USER: ['dashboard', 'lots', 'slots', 'bookings'],
	OWNER: ['dashboard', 'lots', 'slots'],
	ADMIN: ['dashboard', 'slots', 'admin-users', 'admin-lots'],
};

function getCsrfToken() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

function headers(method) {
    const h = { 'Content-Type': 'application/json' };
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method?.toUpperCase())) {
        const token = getCsrfToken();
        if (token) h['X-XSRF-TOKEN'] = token;
    }
    return h;
}

async function api(method, path, body) {
	const opts = { method, headers: headers(method), credentials: 'include' };
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

async function initCsrf() {
    await fetch(BASE + '/api/v1/health', {
        credentials: 'include'
    });
}

// Auth
async function doLogin() {
	await initCsrf();

    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    
    if (!u || !p) {
        showAlert('login-alert', 'Username and password required');
        return;
    }
    
    try {
        const params = new URLSearchParams();
        params.append("username", u);
        params.append("password", p);

        // Include CSRF token in the headers for Spring Security
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        const token = getCsrfToken();
        if (token) {
            headers['X-XSRF-TOKEN'] = token;
        }

        const response = await fetch(BASE + '/api/v1/auth/login', {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: params.toString()
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || response.statusText);
        }
        
        SESSION.username = u;
        await fetchSessionInfo();
        startApp();
    } catch (e) {
        showAlert('login-alert', e.message || 'Login failed. Check credentials.');
    }
}

async function doLogout() {
	try {
		await fetch(BASE + '/api/v1/auth/logout', {
			method: 'POST',
			credentials: 'include',
			headers: headers('POST')
		});
	} catch (e) {
		// fall through and clear the local session state
	}
	SESSION = { username: '', role: '' };
	document.getElementById('app-screen').style.display = 'none';
	document.getElementById('login-screen').style.display = 'flex';
}

async function fetchSessionInfo() {
	const data = await api('GET', '/api/v1/auth/me');
	SESSION.username = data?.username || SESSION.username;
	SESSION.role = data?.role || 'USER';
}

async function initApp() {
	try {
		await fetchSessionInfo();
		startApp();
	} catch (e) {
		// Stay on the login screen when there is no active session.
	}
}

function startApp() {
	document.getElementById('login-screen').style.display = 'none';
	document.getElementById('app-screen').style.display = 'flex';
	document.getElementById('sidebar-name').textContent = SESSION.username;
	document.getElementById('sidebar-role').textContent = SESSION.role;
	document.getElementById('sidebar-avatar').textContent = SESSION.username.slice(0, 2).toUpperCase();
	updateConnectionStatus();
	updateDashboardIdentity();
	syncSidebarForRole();
	goto('dashboard');
}

// Register
function showRegister() {
	openModal('modal-register');
}
async function doRegister() {
	const u = document.getElementById('reg-user').value.trim();
	const p = document.getElementById('reg-pass').value;
	const role = document.getElementById('reg-role').value;
	try {
		await api('POST', '/api/v1/auth/register', { username: u, password: p, role });
		closeModal('modal-register');
		document.getElementById('login-user').value = u;
		showAlert('login-alert', 'Registered! Sign in now.', true);
	} catch (e) {
		showAlert('reg-alert', e.message);
	}
}

// Navigation
function goto(page) {
	const allowedPage = resolveAllowedPage(page);
	if (allowedPage !== page) {
		page = allowedPage;
	}

	document.querySelectorAll('.page').forEach((p) => (p.style.display = 'none'));
	document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
	document.getElementById('page-' + page).style.display = 'block';
	document.querySelectorAll('[data-nav-page="' + page + '"]').forEach((nav) => nav.classList.add('active'));
	loadPage(page);
}

function syncSidebarForRole() {
	document.querySelectorAll('[data-role-section]').forEach((section) => {
		section.style.display = 'none';
	});

	const sectionId = roleSectionId(SESSION.role);
	const activeSection = document.getElementById(sectionId);
	if (activeSection) activeSection.style.display = 'block';
}

function roleSectionId(role) {
	if (role === 'OWNER') return 'owner-nav-section';
	if (role === 'ADMIN') return 'admin-nav-section';
	return 'user-nav-section';
}

function updateDashboardIdentity() {
	const el = document.getElementById('dashboard-account-heading');
	if (!el) return;
	el.textContent = `Logged in as ${SESSION.username} (${SESSION.role})`;
}

function updateConnectionStatus() {
	const el = document.getElementById('conn-text');
	if (!el) return;
	const hostLabel = BASE.replace(/^https?:\/\//, '');
	el.innerHTML = `Connected to <strong>${hostLabel}</strong>`;
}

function resolveAllowedPage(page) {
	const allowedPages = ROLE_NAV[SESSION.role] || ROLE_NAV.USER;
	if (allowedPages.includes(page)) return page;
	return allowedPages[0] || 'dashboard';
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
		const showMyBookings = SESSION.role === 'USER';
		const bookingStatCard = document.getElementById('dash-bookings-card');
		const recentBookingsCard = document.getElementById('dash-recent-bookings-card');
		if (bookingStatCard) bookingStatCard.style.display = showMyBookings ? 'block' : 'none';
		if (recentBookingsCard) recentBookingsCard.style.display = showMyBookings ? 'block' : 'none';

		const [lots, slots] = await Promise.allSettled([
			api('GET', '/api/v1/parking-lots'),
			api('GET', '/api/v1/parking-slots'),
		]);
		document.getElementById('dash-lots').textContent = lots.status === 'fulfilled' ? lots.value.length : '—';
		document.getElementById('dash-slots').textContent = slots.status === 'fulfilled' ? slots.value.length : '—';

		if (showMyBookings) {
			const bookings = await api('GET', '/api/v1/bookings/my');
			document.getElementById('dash-bookings').textContent = bookings.length;
			renderBookingTable(bookings.slice(0, 5), 'dash-booking-list', true);
		} else {
			document.getElementById('dash-bookings').textContent = '—';
			const bookingList = document.getElementById('dash-booking-list');
			if (bookingList) bookingList.innerHTML = '';
		}
	} catch (e) {}
}

// Lots
async function loadLots() {
	const wrap = document.getElementById('lots-table-wrap');
	try {
		const path = SESSION.role === 'OWNER' ? '/api/v1/parking-lots/my' : '/api/v1/parking-lots';
		const canDeleteLots = SESSION.role === 'OWNER';
		const data = await api('GET', path);
		if (!data.length) {
			wrap.innerHTML = '<div class="empty-state">No lots found</div>';
			return;
		}
		wrap.innerHTML = `<table class="tbl">
      <thead><tr><th>ID</th><th>Name</th><th>Location</th><th>Rate/hr</th><th>Slots</th><th>Owner</th><th>Status</th>${canDeleteLots ? '<th></th>' : ''}</tr></thead>
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
				${
					canDeleteLots
						? `<td><div class="row-actions">
					<button class="btn btn-sm btn-danger" onclick="deleteLot(${l.id})">Delete</button>
				</div></td>`
						: ''
				}
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
		const canDeleteSlots = SESSION.role === 'OWNER';
		const data = await api('GET', '/api/v1/parking-slots');
		if (!data.length) {
			wrap.innerHTML = '<div class="empty-state">No slots found</div>';
			return;
		}
		wrap.innerHTML = `<table class="tbl">
      <thead><tr><th>ID</th><th>Slot #</th><th>Type</th><th>Available</th><th>Booked By</th>${canDeleteSlots ? '<th></th>' : ''}</tr></thead>
      	<tbody>${data
			.map(
				(s) => `<tr>
			<td class="mono">${s.id}</td>
			<td style="font-weight:500">${s.slotNumber}</td>
			<td>${esc(s.slotType)}</td>
			<td><span class="badge ${s.available ? 'badge-success' : 'badge-danger'}">${s.available ? 'Available' : 'Occupied'}</span></td>
			<td>${s.available ? '—' : esc(s.bookedByUsername || '—')}</td>
			${
					canDeleteSlots
						? `<td><div class="row-actions">
				<button class="btn btn-sm btn-danger" onclick="deleteSlot(${s.id})">Delete</button>
				</div></td>`
						: ''
				}
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

// Restore session on page load
document.addEventListener('DOMContentLoaded', initApp);