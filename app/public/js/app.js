// Token management
function getToken() {
	return localStorage.getItem('token');
}

function setToken(token) {
	localStorage.setItem('token', token);
}

function removeToken() {
	localStorage.removeItem('token');
	localStorage.removeItem('user');
}

function getUser() {
	const u = localStorage.getItem('user');
	return u ? JSON.parse(u) : null;
}

function setUser(user) {
	localStorage.setItem('user', JSON.stringify(user));
}

function isLoggedIn() {
	return !!getToken();
}

function logout() {
	removeToken();
	window.location.href = '/';
}

// Authenticated fetch
async function authFetch(url, options = {}) {
	const token = getToken();
	if (token) {
		options.headers = {
			...options.headers,
			Authorization: `Bearer ${token}`,
		};
	}
	return fetch(url, options);
}

// API helper
async function api(url, options = {}) {
	const res = await authFetch(url, options);
	const data = await res.json();
	return { ok: res.ok, status: res.status, data };
}

// Format views count
function formatViews(count) {
	if (!count) return '0 views';
	if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M views';
	if (count >= 1000) return (count / 1000).toFixed(1) + 'K views';
	return count + ' views';
}

// Format duration
function formatDuration(seconds) {
	if (!seconds) return '0:00';
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

// Format date
function formatDate(dateStr) {
	if (!dateStr) return '';
	const d = new Date(dateStr + 'Z');
	const now = new Date();
	const diff = now - d;
	const mins = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (mins < 1) return 'Baru saja';
	if (mins < 60) return `${mins} menit lalu`;
	if (hours < 24) return `${hours} jam lalu`;
	if (days < 30) return `${days} hari lalu`;
	return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Show alert
function showAlert(container, message, type = 'error') {
	const existing = container.querySelector('.alert');
	if (existing) existing.remove();

	const div = document.createElement('div');
	div.className = `alert alert-${type}`;
	div.textContent = message;
	container.prepend(div);

	if (type === 'success') {
		setTimeout(() => div.remove(), 3000);
	}
}

// Escape HTML
function escapeHtml(str) {
	const d = document.createElement('div');
	d.textContent = str || '';
	return d.innerHTML;
}

// Search handler
function doNavSearch(e) {
	if (e) e.preventDefault();
	const input = document.getElementById('nav-search-input');
	const q = input?.value?.trim();
	if (q) window.location.href = '/search?q=' + encodeURIComponent(q);
}

// Notification badge
async function loadNotifCount() {
	if (!isLoggedIn()) return;
	try {
		const { ok, data } = await api('/api/notifications/unread-count');
		if (ok && data.data?.count > 0) {
			const badge = document.getElementById('notif-badge');
			if (badge) {
				badge.textContent = data.data.count > 99 ? '99+' : data.data.count;
				badge.style.display = 'inline-flex';
			}
		}
	} catch {}
}

// Update navbar based on auth state
function updateNavbar() {
	const nav = document.querySelector('.navbar-nav');
	if (!nav) return;

	// Add search bar to navbar center
	const searchArea = document.querySelector('.navbar-search');
	if (!searchArea) {
		const search = document.createElement('form');
		search.className = 'navbar-search';
		search.onsubmit = (e) => doNavSearch(e);
		search.innerHTML = `
			<input type="text" id="nav-search-input" placeholder="Cari video..." class="nav-search-input">
			<button type="submit" class="btn btn-outline btn-sm">Cari</button>
		`;
		const navbar = document.querySelector('.navbar');
		if (navbar) navbar.insertBefore(search, nav);

		// Pre-fill search if on search page
		const urlQ = new URLSearchParams(window.location.search).get('q');
		if (urlQ) document.getElementById('nav-search-input').value = urlQ;
	}

	if (isLoggedIn()) {
		const user = getUser();
		nav.innerHTML = `
			<a href="/live" class="btn btn-outline btn-sm">Live</a>
			<a href="/notifications" class="btn btn-outline btn-sm" style="position:relative">
				Notif
				<span id="notif-badge" style="display:none; position:absolute; top:-4px; right:-4px; background:var(--accent); color:white; font-size:10px; width:18px; height:18px; border-radius:50%; align-items:center; justify-content:center;"></span>
			</a>
			<a href="/upload" class="btn btn-primary btn-sm">Upload</a>
			<a href="/profile" class="user-badge">${escapeHtml(user?.username || 'User')}</a>
			<button onclick="logout()" class="btn btn-outline btn-sm">Logout</button>
		`;
		loadNotifCount();
	} else {
		nav.innerHTML = `
			<a href="/login" class="btn btn-outline btn-sm">Login</a>
			<a href="/register" class="btn btn-primary btn-sm">Register</a>
		`;
	}
}

// Run on every page
document.addEventListener('DOMContentLoaded', updateNavbar);
