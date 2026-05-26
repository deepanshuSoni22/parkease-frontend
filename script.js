const PROD_API_BASE = 'https://parkeasebackend.me';
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
let selectedParkingLot = null;
let pendingBookingSlotId = null;
const ROLE_NAV = {
	USER: ['dashboard', 'lots', 'bookings'],
	OWNER: ['dashboard', 'lots'],
	ADMIN: ['dashboard', 'lots', 'admin-users', 'admin-lots', 'admin-bookings'],
};

const SLOT_AVAILABLE_TOPIC = '/topic/slot-available';
const SLOT_AVAILABLE_WS_PATH = '/ws';

let slotAvailabilityClient = null;
let slotAvailabilitySocket = null;
let slotAvailabilityReconnectTimer = null;
let slotAvailabilityEnabled = false;
const slotAvailabilityToastCache = new Map();

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
	try {
		await initCsrf();
	} catch (e) {
		showAlert('login-alert', 'Cannot reach API: ' + (e.message || e));
		return;
	}

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
	closeSlotAvailabilityListener();
	selectedParkingLot = null;
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
	selectedParkingLot = null;
	document.getElementById('login-screen').style.display = 'none';
	document.getElementById('app-screen').style.display = 'flex';
	document.getElementById('sidebar-name').textContent = SESSION.username;
	document.getElementById('sidebar-role').textContent = SESSION.role;
	document.getElementById('sidebar-avatar').textContent = SESSION.username.slice(0, 2).toUpperCase();
	const newSlotButton = document.getElementById('new-slot-btn');
	if (newSlotButton) newSlotButton.style.display = SESSION.role === 'USER' ? 'none' : 'inline-flex';
	updateConnectionStatus();
	updateDashboardIdentity();
	syncSidebarForRole();
	initSlotAvailabilityListener();
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
	if (page === 'bookings') loadBookings();
	if (page === 'admin-users') loadAdminUsers();
	if (page === 'admin-lots') loadAdminLots();
	if (page === 'admin-bookings') loadAdminBookings();
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
	const slotsWrap = document.getElementById('lot-slots-wrap');
	try {
		const path = SESSION.role === 'OWNER' ? '/api/v1/parking-lots/my' : '/api/v1/parking-lots';
		const canDeleteLots = SESSION.role === 'OWNER';
		const [lotsResult, slotsResult] = await Promise.allSettled([api('GET', path), api('GET', '/api/v1/parking-slots')]);
		const data = lotsResult.status === 'fulfilled' ? lotsResult.value : [];
		const slots = slotsResult.status === 'fulfilled' ? slotsResult.value : [];

		if (!data.length) {
			wrap.innerHTML = '<div class="empty-state">No lots found</div>';
		} else {
		wrap.innerHTML = `<table class="tbl">
      <thead><tr><th>ID</th><th>Name</th><th>Location</th><th>Rate/hr</th><th>Slots</th><th>Owner</th><th>Status</th>${canDeleteLots ? '<th></th>' : ''}</tr></thead>
      <tbody>${data
			.map(
				(l) => `<tr class="lot-row ${selectedParkingLot?.id === l.id ? 'selected' : ''}" onclick="selectParkingLot(${l.id}, ${JSON.stringify(l.name)})">
        <td class="mono">${l.id}</td>
        <td style="font-weight:500">${esc(l.name)}</td>
        <td style="color:var(--muted)">${esc(l.location)}</td>
        <td>₹${l.hourlyRate}</td>
        <td>${l.totalSlots}</td>
        <td>${esc(l.ownerName || '—')}</td>
        <td><span class="badge ${l.active ? 'badge-success' : 'badge-neutral'}">${l.active ? 'Active' : 'Inactive'}</span></td>
				${
					canDeleteLots
						? `<td><div class="row-actions row-actions-end">
						<button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteLot(${l.id})">Delete</button>
				</div></td>`
						: ''
				}
      </tr>`
			)
			.join('')}</tbody>
    </table>`;
		}

		if (slotsWrap) {
			renderParkingLotSlots(slots, slotsWrap);
		}
	} catch (e) {
		wrap.innerHTML = `<div class="empty-state" style="color:var(--danger)">${e.message}</div>`;
		if (slotsWrap) slotsWrap.innerHTML = `<div class="empty-state" style="color:var(--danger)">${e.message}</div>`;
	}
}

function selectParkingLot(lotId, lotName) {
	selectedParkingLot = { id: lotId, name: lotName };
	updateSelectedLotHeader();
	loadParkingLotSlots();
}

function clearSelectedParkingLot() {
	selectedParkingLot = null;
	updateSelectedLotHeader();
	loadParkingLotSlots();
	loadLots();
}

function updateSelectedLotHeader() {
	const title = document.getElementById('selected-lot-title');
	const subtitle = document.getElementById('selected-lot-subtitle');
	const button = document.getElementById('show-all-slots-btn');
	if (selectedParkingLot) {
		if (title) title.textContent = `${selectedParkingLot.name} slots`;
		if (subtitle) subtitle.textContent = `Showing slots for parking lot #${selectedParkingLot.id}.`;
		if (button) button.style.display = 'inline-flex';
		return;
	}
	if (title) title.textContent = 'Parking Slots';
	if (subtitle) subtitle.textContent = 'Select a parking lot to filter its slots.';
	if (button) button.style.display = 'none';
}

function getSlotLotId(slot) {
	return slot?.parkingLotId ?? slot?.parkingLot?.id ?? slot?.lotId ?? slot?.parkingLot?.parkingLotId ?? slot?.parkingLot?.lotId ?? null;
}

function getSlotLotName(slot) {
	return slot?.parkingLotName ?? slot?.parkingLot?.name ?? slot?.lotName ?? '—';
}

function normalizeSlotsForSelectedLot(slots) {
	if (!selectedParkingLot) return slots;
	return slots.filter((slot) => {
		const slotLotId = getSlotLotId(slot);
		if (slotLotId != null) return String(slotLotId) === String(selectedParkingLot.id);
		const slotLotName = getSlotLotName(slot);
		return slotLotName !== '—' && slotLotName === selectedParkingLot.name;
	});
}

function renderParkingLotSlots(slots, wrap) {
	updateSelectedLotHeader();
	const filteredSlots = normalizeSlotsForSelectedLot(slots);
	if (!filteredSlots.length) {
		wrap.innerHTML = '<div class="empty-state">No parking slots found for this selection</div>';
		return;
	}
	wrap.innerHTML = `<table class="tbl">
      <thead><tr><th>ID</th><th>Lot</th><th>Slot #</th><th>Type</th><th>Available</th><th>Booked By</th><th></th></tr></thead>
      <tbody>${filteredSlots
		.map(
			(s) => `<tr>
			<td class="mono">${s.id}</td>
			<td style="font-weight:500">${esc(getSlotLotName(s))}</td>
			<td style="font-weight:500">${s.slotNumber}</td>
			<td>${esc(s.slotType)}</td>
			<td><span class="badge ${s.available ? 'badge-success' : 'badge-danger'}">${s.available ? 'Available' : 'Occupied'}</span></td>
			<td>${s.available ? '—' : esc(s.bookedByUsername || '—')}</td>
			<td>
				<div class="row-actions row-actions-end">
					${SESSION.role === 'USER' && s.available ? `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); bookSlotFromList(${s.id})">Book</button>` : ''}
					${SESSION.role === 'OWNER' ? `<button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteSlot(${s.id})">Delete</button>` : ''}
				</div>
			</td>
		</tr>`
		)
		.join('')}</tbody>
    </table>`;
}

async function loadParkingLotSlots() {
	const wrap = document.getElementById('lot-slots-wrap');
	try {
		const data = await api('GET', '/api/v1/parking-slots');
		renderParkingLotSlots(data, wrap);
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
	return loadParkingLotSlots();
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
		const message = e?.message ? String(e.message) : 'Unable to load your bookings.';
		wrap.innerHTML = `<div class="empty-state" style="color:var(--danger)">${esc(message)}</div>`;
	}
}

function renderBookingTable(data, containerId, compact) {
	const el = document.getElementById(containerId);
	if (!data.length) {
		el.innerHTML = '<div class="empty-state">No bookings</div>';
		return;
	}
	el.innerHTML = `<table class="tbl">
		<thead><tr><th>ID</th><th>Lot</th><th>Slot</th><th>Type</th><th>Duration</th><th>Status</th><th>Booked at</th>${!compact ? '<th></th>' : ''}</tr></thead>
		<tbody>${data
		.map(
			(b) => `<tr>
			<td class="mono">${b.id}</td>
			<td style="font-weight:500">${esc(b.parkingLotName || '—')}</td>
			<td>${b.slotNumber || b.slotId}</td>
			<td style="color:var(--muted)">${esc(b.slotType || '—')}</td>
			<td>${formatDurationMinutes(b.durationMinutes)}</td>
			<td><span class="badge ${b.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}">${b.status}</span></td>
			<td style="color:var(--muted)">${b.bookedAt ? new Date(b.bookedAt).toLocaleString() : '—'}</td>
			${
			!compact
				? `<td><div class="row-actions">
						${(SESSION.role === 'ADMIN' || SESSION.role === 'USER') && b.status === 'ACTIVE' ? `<button class="btn btn-sm" onclick="completeBooking(${b.id})">Complete</button>` : ''}
						${SESSION.role === 'ADMIN' ? `<button class="btn btn-sm" onclick="viewAdminBooking(${b.id})">View</button>` : ''}
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
	const durationMinutes = getBookingDurationMinutes();
	if (!slotId) {
		showAlert('booking-alert', 'Select a slot first');
		return;
	}
	if (!durationMinutes) {
		showAlert('booking-alert', 'Enter a valid booking duration');
		return;
	}
	try {
		await api('POST', '/api/v1/bookings', { slotId, durationMinutes });
		closeModal('modal-booking');
		loadBookings();
		loadParkingLotSlots();
	} catch (e) {
		showAlert('booking-alert', e.message);
	}
}

function bookSlotFromList(slotId) {
	openBookingModal(slotId);
}


function toggleBookingDurationInput() {
	const preset = document.getElementById('booking-duration-preset');
	const customWrap = document.getElementById('booking-duration-custom-wrap');
	if (!preset || !customWrap) return;
	customWrap.style.display = preset.value === 'custom' ? 'block' : 'none';
}

function getBookingDurationMinutes() {
	const preset = document.getElementById('booking-duration-preset');
	if (!preset) return null;
	if (preset.value === 'custom') {
		const customValue = parseInt(document.getElementById('booking-duration-minutes').value);
		return Number.isFinite(customValue) && customValue > 0 ? customValue : null;
	}
	const presetValue = parseInt(preset.value);
	return Number.isFinite(presetValue) && presetValue > 0 ? presetValue : null;
}

function formatDurationMinutes(minutes) {
	if (!Number.isFinite(minutes) || minutes <= 0) return '—';
	if (minutes % 60 === 0) {
		const hours = minutes / 60;
		return hours === 1 ? '1 hr' : hours + ' hrs';
	}
	return minutes + ' min';
}

function prepareBookingModal() {
	prepareBookingModalForSlot(null);
}

function prepareBookingModalForSlot(slotId) {
	const slotInput = document.getElementById('booking-slot-id');
	const slotSummary = document.getElementById('booking-selected-slot');
	const durationPreset = document.getElementById('booking-duration-preset');
	const durationCustom = document.getElementById('booking-duration-minutes');
	if (slotInput) slotInput.value = slotId || '';
	if (slotSummary) {
		slotSummary.textContent = slotId ? `Slot #${slotId} selected` : 'No slot selected';
	}
	if (durationPreset) durationPreset.value = '60';
	if (durationCustom) durationCustom.value = '';
	toggleBookingDurationInput();
}

function openBookingModal(slotId) {
	pendingBookingSlotId = slotId;
	openModal('modal-booking');
}
async function completeBooking(id) {
	try {
		await api('PUT', '/api/v1/bookings/' + id + '/complete');
		if (SESSION.role === 'ADMIN') {
			loadAdminBookings();
		} else {
			loadBookings();
		}
		loadParkingLotSlots();
	} catch (e) {
		alert(e.message);
	}
}
// Admin bookings
async function loadAdminBookings() {
	const wrap = document.getElementById('admin-bookings-wrap');
	try {
		const data = await api('GET', '/api/v1/bookings');
		if (!data.length) {
			wrap.innerHTML = '<div class="empty-state">No bookings</div>';
			return;
		}
		renderBookingTable(data, 'admin-bookings-wrap', false);
	} catch (e) {
		wrap.innerHTML = `<div class="empty-state" style="color:var(--danger)">${e.message}</div>`;
	}
}

async function viewAdminBooking(id) {
	try {
		const data = await api('GET', '/api/v1/bookings/' + id);
		const detailsEl = document.getElementById('admin-booking-details');
		if (!detailsEl) return;
		const html = `
			<div><strong>ID:</strong> <span class="mono">${data.id}</span></div>
			<div><strong>Lot:</strong> ${esc(data.parkingLotName || '—')}</div>
			<div><strong>Slot:</strong> ${data.slotNumber || data.slotId}</div>
			<div><strong>Type:</strong> ${esc(data.slotType || '—')}</div>
			<div><strong>Duration:</strong> ${formatDurationMinutes(data.durationMinutes)}</div>
			<div><strong>Status:</strong> ${data.status}</div>
			<div><strong>Booked by:</strong> ${esc(data.bookedByUsername || '—')}</div>
			<div><strong>Booked at:</strong> ${data.bookedAt ? new Date(data.bookedAt).toLocaleString() : '—'}</div>
		`;
		detailsEl.innerHTML = html;
		const btn = document.getElementById('admin-booking-complete-btn');
		if (btn) {
			const isCompleted = String(data.status).toUpperCase() === 'COMPLETED';
			btn.style.display = isCompleted ? 'none' : 'inline-flex';
			btn.onclick = async () => {
				try {
					await completeBookingAdmin(id);
				} catch (e) {
					document.getElementById('admin-booking-alert').textContent = e.message || e;
					document.getElementById('admin-booking-alert').className = 'alert show alert-err';
				}
			};
		}
		openModal('modal-admin-booking');
	} catch (e) {
		alert(e.message);
	}
}

async function completeBookingAdmin(id) {
	try {
		await api('PUT', '/api/v1/bookings/' + id + '/complete');
		closeModal('modal-admin-booking');
		loadAdminBookings();
	} catch (e) {
		throw e;
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

function isUserSession() {
	return SESSION.role === 'USER';
}

function buildHttpUrl(path) {
	return BASE.replace(/\/$/, '') + path;
}

function buildWebSocketUrl(path) {
	const base = BASE.replace(/\/$/, '');
	if (base.startsWith('https://')) {
		return 'wss://' + base.slice('https://'.length) + path;
	}
	if (base.startsWith('http://')) {
		return 'ws://' + base.slice('http://'.length) + path;
	}
	return base + path;
}

function isSlotsPageVisible() {
	const page = document.getElementById('page-lots');
	return page && page.style.display !== 'none';
}

function extractSlotAvailabilityEvent(payload) {
	const slotId = payload?.slotId ?? payload?.id ?? payload?.slot?.id;
	const slotNumber = payload?.slotNumber ?? payload?.slot?.slotNumber ?? slotId ?? 'unknown';
	let isAvailable = true;

	if (payload && Object.prototype.hasOwnProperty.call(payload, 'available')) {
		isAvailable = Boolean(payload.available);
	} else if (payload && Object.prototype.hasOwnProperty.call(payload, 'currentAvailable')) {
		isAvailable = Boolean(payload.currentAvailable);
	} else if (payload && Object.prototype.hasOwnProperty.call(payload, 'isAvailable')) {
		isAvailable = Boolean(payload.isAvailable);
	} else if (typeof payload?.status === 'string') {
		isAvailable = payload.status.toUpperCase() === 'AVAILABLE';
	}

	return {
		cacheKey: slotId == null ? null : String(slotId),
		slotNumber,
		isAvailable,
	};
}

function showToast(title, message, variant = 'success') {
	const container = document.getElementById('toast-container');
	if (!container) return;

	const toast = document.createElement('div');
	toast.className = 'toast toast-' + variant;
	toast.innerHTML = `
		<div class="toast-body">
			<div class="toast-title">${esc(title)}</div>
			<div class="toast-message">${esc(message)}</div>
		</div>
	`;
	container.appendChild(toast);

	requestAnimationFrame(() => toast.classList.add('show'));
	window.setTimeout(() => {
		toast.classList.remove('show');
		window.setTimeout(() => toast.remove(), 220);
	}, 3600);
}

function handleSlotAvailableMessage(rawMessage) {
	if (!isUserSession()) return;

	let payload = rawMessage;
	if (typeof rawMessage === 'string') {
		try {
			payload = JSON.parse(rawMessage);
		} catch {
			payload = { slotNumber: rawMessage };
		}
	}

	const slotData = extractSlotAvailabilityEvent(payload);
	if (!slotData.isAvailable) return;

	const cacheKey = slotData.cacheKey || String(slotData.slotNumber);
	const lastToastAt = slotAvailabilityToastCache.get(cacheKey) || 0;
	if (Date.now() - lastToastAt < 4000) {
		return;
	}

	slotAvailabilityToastCache.set(cacheKey, Date.now());
	showToast('Slot available', 'Slot #' + slotData.slotNumber + ' is now available.', 'success');

	if (isSlotsPageVisible()) {
		loadSlots();
	}
}

function scheduleSlotAvailabilityReconnect() {
	if (!slotAvailabilityEnabled || !isUserSession()) return;
	if (slotAvailabilityReconnectTimer) return;
	slotAvailabilityReconnectTimer = window.setTimeout(() => {
		slotAvailabilityReconnectTimer = null;
		connectSlotAvailabilityListener();
	}, 5000);
}

function closeSlotAvailabilityListener() {
	slotAvailabilityEnabled = false;
	if (slotAvailabilityReconnectTimer) {
		clearTimeout(slotAvailabilityReconnectTimer);
		slotAvailabilityReconnectTimer = null;
	}
	slotAvailabilityToastCache.clear();

	if (slotAvailabilityClient) {
		try {
			slotAvailabilityClient.disconnect(() => {});
		} catch (e) {}
	}

	if (slotAvailabilitySocket) {
		try {
			if (typeof slotAvailabilitySocket.close === 'function') {
				slotAvailabilitySocket.close();
			}
		} catch (e) {}
	}

	slotAvailabilityClient = null;
	slotAvailabilitySocket = null;
}

function connectSlotAvailabilityListener() {
	if (!slotAvailabilityEnabled || !isUserSession()) return;

	if (window.SockJS && window.Stomp) {
		const socket = new SockJS(buildHttpUrl(SLOT_AVAILABLE_WS_PATH));
		const client = window.Stomp.over(socket);
		client.debug = null;
		client.reconnect_delay = 5000;

		client.connect(
			{},
			() => {
				slotAvailabilitySocket = socket;
				slotAvailabilityClient = client;
				client.subscribe(SLOT_AVAILABLE_TOPIC, (frame) => {
					handleSlotAvailableMessage(frame.body);
				});
			},
			() => {
				scheduleSlotAvailabilityReconnect();
			}
		);
		return;
	}

	if (!('WebSocket' in window)) {
		showToast('Notifications unavailable', 'This browser cannot open live notifications.', 'warning');
		return;
	}

	const socket = new WebSocket(buildWebSocketUrl(SLOT_AVAILABLE_WS_PATH));
	slotAvailabilitySocket = socket;

	socket.onmessage = (event) => {
		handleSlotAvailableMessage(event.data);
	};
	socket.onclose = () => {
		scheduleSlotAvailabilityReconnect();
	};
	socket.onerror = () => {
		try {
			socket.close();
		} catch (e) {}
	};
}

function initSlotAvailabilityListener() {
	closeSlotAvailabilityListener();
	if (!isUserSession()) return;
	slotAvailabilityEnabled = true;
	connectSlotAvailabilityListener();
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
	if (id === 'modal-booking') {
		prepareBookingModalForSlot(pendingBookingSlotId);
		pendingBookingSlotId = null;
	}
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

window.addEventListener('beforeunload', closeSlotAvailabilityListener);

// Enter to login
document.addEventListener('keydown', (e) => {
	if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') doLogin();
});

// Restore session on page load
document.addEventListener('DOMContentLoaded', initApp);