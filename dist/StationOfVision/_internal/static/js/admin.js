/**
 * Station of Vision - Admin Panel Script
 */

document.addEventListener('DOMContentLoaded', () => {
    let adminToken = localStorage.getItem('sov_admin_token') || '';
    let currentBrowserPath = '';

    // Screens
    const loginScreen = document.getElementById('loginScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    const loginForm = document.getElementById('loginForm');
    const adminPassword = document.getElementById('adminPassword');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');

    // Dashboard Elements
    const directoriesList = document.getElementById('directoriesList');
    const refreshDirsBtn = document.getElementById('refreshDirsBtn');
    const newDirPath = document.getElementById('newDirPath');
    const newDirName = document.getElementById('newDirName');
    const addDirectoryBtn = document.getElementById('addDirectoryBtn');
    const newAdminPassword = document.getElementById('newAdminPassword');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const toast = document.getElementById('toast');

    // File Browser Elements
    const browserModal = document.getElementById('browserModal');
    const browserModalBackdrop = document.getElementById('browserModalBackdrop');
    const closeBrowserModalBtn = document.getElementById('closeBrowserModalBtn');
    const openBrowserModalBtn = document.getElementById('openBrowserModalBtn');
    const cancelBrowserBtn = document.getElementById('cancelBrowserBtn');
    const selectCurrentFolderBtn = document.getElementById('selectCurrentFolderBtn');
    const browserCurrentPath = document.getElementById('browserCurrentPath');
    const browserItemsList = document.getElementById('browserItemsList');

    // ─── Authentication ───────────────────────────────────────────────
    function checkAuth() {
        if (adminToken) {
            loginScreen.classList.add('hidden');
            dashboardScreen.classList.remove('hidden');
            loadConfig();
        } else {
            loginScreen.classList.remove('hidden');
            dashboardScreen.classList.add('hidden');
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.classList.add('hidden');

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword.value })
            });

            if (!res.ok) throw new Error('Giriş başarısız');

            const data = await res.json();
            adminToken = data.token;
            localStorage.setItem('sov_admin_token', adminToken);
            adminPassword.value = '';
            checkAuth();
            showToast('Giriş başarılı!');
        } catch (err) {
            loginError.classList.remove('hidden');
        }
    });

    logoutBtn.addEventListener('click', () => {
        adminToken = '';
        localStorage.removeItem('sov_admin_token');
        checkAuth();
        showToast('Çıkış yapıldı.');
    });

    // ─── API Client Wrapper ───────────────────────────────────────────
    async function apiRequest(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
            ...(options.headers || {})
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            // Token expired or invalid
            adminToken = '';
            localStorage.removeItem('sov_admin_token');
            checkAuth();
            throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
        }

        return response;
    }

    // ─── Toast Notifications ──────────────────────────────────────────
    function showToast(message) {
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    // ─── Load Config & Directories ────────────────────────────────────
    async function loadConfig() {
        try {
            const res = await apiRequest('/api/admin/config');
            if (!res.ok) throw new Error('Ayar bilgisi alınamadı');
            const data = await res.json();
            renderDirectories(data.allowed_directories || []);
        } catch (err) {
            showToast(err.message);
        }
    }

    function renderDirectories(dirs) {
        directoriesList.innerHTML = '';

        if (dirs.length === 0) {
            directoriesList.innerHTML = `
                <div style="padding: 30px; text-align: center; color: var(--text-muted); background: var(--bg-panel); border-radius: var(--radius); border: 1px dashed var(--border);">
                    Henüz eklenmiş bir video dizini yok. Sağdaki panelden dizin ekleyin.
                </div>
            `;
            return;
        }

        dirs.forEach(dir => {
            const card = document.createElement('div');
            card.className = `directory-card ${dir.enabled ? '' : 'disabled'}`;
            card.innerHTML = `
                <div class="dir-info">
                    <div class="dir-header">
                        <span class="dir-name">${escapeHtml(dir.name)}</span>
                    </div>
                    <div class="dir-path" title="${escapeHtml(dir.path)}">${escapeHtml(dir.path)}</div>
                </div>
                <div class="dir-actions">
                    <label class="switch" title="Yayında / Gizli">
                        <input type="checkbox" class="toggle-dir-chk" ${dir.enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                    <button class="btn btn-danger btn-sm remove-dir-btn">Kaldır</button>
                </div>
            `;

            // Toggle switch event
            const toggleChk = card.querySelector('.toggle-dir-chk');
            toggleChk.addEventListener('change', async () => {
                await toggleDirectory(dir.path, toggleChk.checked);
            });

            // Remove button event
            const removeBtn = card.querySelector('.remove-dir-btn');
            removeBtn.addEventListener('click', async () => {
                if (confirm(`"${dir.name}" dizinini yayından kaldırmak istiyor musunuz?`)) {
                    await removeDirectory(dir.path);
                }
            });

            directoriesList.appendChild(card);
        });
    }

    // ─── Directory Operations ─────────────────────────────────────────
    async function toggleDirectory(path, enabled) {
        try {
            const res = await apiRequest('/api/admin/config', {
                method: 'POST',
                body: JSON.stringify({ action: 'toggle_directory', path, enabled })
            });
            if (res.ok) {
                showToast(enabled ? 'Dizin yayına alındı' : 'Dizin yayından gizlendi');
                loadConfig();
            }
        } catch (err) {
            showToast(err.message);
        }
    }

    async function removeDirectory(path) {
        try {
            const res = await apiRequest('/api/admin/config', {
                method: 'POST',
                body: JSON.stringify({ action: 'remove_directory', path })
            });
            if (res.ok) {
                showToast('Dizin başarıyla kaldırıldı');
                loadConfig();
            }
        } catch (err) {
            showToast(err.message);
        }
    }

    addDirectoryBtn.addEventListener('click', async () => {
        const path = newDirPath.value.trim();
        const name = newDirName.value.trim();

        if (!path) {
            showToast('Lütfen bir dizin yolu belirtin');
            return;
        }

        try {
            const res = await apiRequest('/api/admin/config', {
                method: 'POST',
                body: JSON.stringify({ action: 'add_directory', path, name })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Dizin başarıyla eklendi');
                newDirPath.value = '';
                newDirName.value = '';
                loadConfig();
            } else {
                showToast('Bu dizin zaten ekli!');
            }
        } catch (err) {
            showToast(err.message);
        }
    });

    refreshDirsBtn.addEventListener('click', () => {
        loadConfig();
        showToast('Liste yenilendi');
    });

    // ─── Change Password ──────────────────────────────────────────────
    changePasswordBtn.addEventListener('click', async () => {
        const newPw = newAdminPassword.value.trim();
        if (newPw.length < 4) {
            showToast('Şifre en az 4 karakter olmalıdır');
            return;
        }

        try {
            const res = await apiRequest('/api/admin/config', {
                method: 'POST',
                body: JSON.stringify({ action: 'change_password', new_password: newPw })
            });
            if (res.ok) {
                showToast('Şifre başarıyla güncellendi');
                newAdminPassword.value = '';
            }
        } catch (err) {
            showToast(err.message);
        }
    });

    // ─── File Browser Modal ───────────────────────────────────────────
    async function browsePath(targetPath = '') {
        try {
            const res = await apiRequest(`/api/admin/browse?path=${encodeURIComponent(targetPath)}`);
            if (!res.ok) throw new Error('Dizin okunamadı');
            const data = await res.json();
            
            currentBrowserPath = data.current;
            browserCurrentPath.textContent = data.current || 'Sürücüler (Bilgisayarım)';

            browserItemsList.innerHTML = '';

            // Parent Directory link if available
            if (data.parent !== null && data.parent !== undefined) {
                const parentItem = document.createElement('div');
                parentItem.className = 'browser-item parent-dir';
                parentItem.innerHTML = `<span>📁 .. (Üst Klasör)</span>`;
                parentItem.addEventListener('click', () => browsePath(data.parent));
                browserItemsList.appendChild(parentItem);
            }

            if (data.items.length === 0) {
                const emptyItem = document.createElement('div');
                emptyItem.style.padding = '12px';
                emptyItem.style.color = 'var(--text-muted)';
                emptyItem.textContent = 'Bu klasörde alt dizin bulunamadı.';
                browserItemsList.appendChild(emptyItem);
            }

            data.items.forEach(item => {
                const row = document.createElement('div');
                row.className = 'browser-item';
                row.innerHTML = `<span>📁 ${escapeHtml(item.name)}</span>`;
                row.addEventListener('click', () => {
                    browsePath(item.path);
                });
                browserItemsList.appendChild(row);
            });

        } catch (err) {
            showToast('Klasör taranırken hata: ' + err.message);
        }
    }

    openBrowserModalBtn.addEventListener('click', () => {
        browserModal.classList.add('open');
        browsePath(newDirPath.value.trim() || '');
    });

    function closeBrowserModal() {
        browserModal.classList.remove('open');
    }

    closeBrowserModalBtn.addEventListener('click', closeBrowserModal);
    browserModalBackdrop.addEventListener('click', closeBrowserModal);
    cancelBrowserBtn.addEventListener('click', closeBrowserModal);

    selectCurrentFolderBtn.addEventListener('click', () => {
        if (currentBrowserPath) {
            newDirPath.value = currentBrowserPath;
            // Set friendly name if empty
            if (!newDirName.value.trim()) {
                const parts = currentBrowserPath.replace(/[\\/]+$/, '').split(/[\\/]/);
                newDirName.value = parts[parts.length - 1] || 'Videolar';
            }
            closeBrowserModal();
            showToast('Dizin seçildi: ' + currentBrowserPath);
        } else {
            showToast('Lütfen bir klasör seçin');
        }
    });

    // Helper
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initial check
    checkAuth();
});
