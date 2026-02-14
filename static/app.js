const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    checkApiStatus();
});

async function checkApiStatus() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('api-status').textContent = `API Online v${data.version}`;
            document.getElementById('api-status').className = 'px-3 py-1 rounded-full text-xs font-medium status-working';
        } else {
            throw new Error('API offline');
        }
    } catch (e) {
        document.getElementById('api-status').textContent = 'API Offline';
        document.getElementById('api-status').className = 'px-3 py-1 rounded-full text-xs font-medium status-failed';
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('tab-active'));
    document.getElementById(`tab-${tabName}`).classList.add('tab-active');
}

switchTab('proxy');

async function checkProxies() {
    const input = document.getElementById('proxy-input').value.trim();
    if (!input) return;

    const proxies = input.split('\n').filter(p => p.trim());
    const btn = document.getElementById('proxy-btn');
    const resultsDiv = document.getElementById('proxy-results');
    const statsDiv = document.getElementById('proxy-stats');

    btn.disabled = true;
    btn.innerHTML = '<svg class="w-4 h-4 loading-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Проверка...';
    resultsDiv.classList.add('hidden');
    statsDiv.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/proxy/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proxies, timeout: 10 })
        });

        const results = await response.json();
        displayProxyResults(results);
    } catch (e) {
        alert('Ошибка: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Проверить';
    }
}

function displayProxyResults(results) {
    const resultsDiv = document.getElementById('proxy-results');
    const statsDiv = document.getElementById('proxy-stats');
    const workingCount = results.filter(r => r.status === 'working').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    document.getElementById('proxy-working').textContent = workingCount;
    document.getElementById('proxy-failed').textContent = failedCount;

    resultsDiv.innerHTML = results.map(r => `
        <div class="p-3 rounded-lg border ${r.status === 'working' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}">
            <div class="flex items-center justify-between">
                <code class="text-sm font-mono truncate max-w-[60%]">${r.proxy}</code>
                <div class="flex items-center gap-2">
                    ${r.response_time ? `<span class="text-xs text-gray-400">${r.response_time}s</span>` : ''}
                    <span class="px-2 py-1 rounded text-xs ${r.status === 'working' ? 'status-working' : 'status-failed'}">
                        ${r.status === 'working' ? 'Работает' : 'Не работает'}
                    </span>
                </div>
            </div>
            ${r.error ? `<p class="text-xs text-red-400 mt-1">${r.error}</p>` : ''}
        </div>
    `).join('');

    resultsDiv.classList.remove('hidden');
    statsDiv.classList.remove('hidden');
}

async function checkCookies() {
    const input = document.getElementById('cookie-input').value.trim();
    if (!input) return;

    const cookies = input.split('\n').filter(c => c.trim());
    const proxy = document.getElementById('cookie-proxy').value.trim() || null;
    const btn = document.getElementById('checker-btn');
    const resultsDiv = document.getElementById('checker-results');
    const statsDiv = document.getElementById('checker-stats');
    const detailsDiv = document.getElementById('checker-details');

    btn.disabled = true;
    btn.innerHTML = '<svg class="w-4 h-4 loading-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Проверка...';
    resultsDiv.classList.add('hidden');
    statsDiv.classList.add('hidden');
    detailsDiv.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/cookie/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookies, proxy, timeout: 10 })
        });

        const results = await response.json();
        displayCookieResults(results);
    } catch (e) {
        alert('Ошибка: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Проверить';
    }
}

function displayCookieResults(results) {
    const resultsDiv = document.getElementById('checker-results');
    const statsDiv = document.getElementById('checker-stats');
    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.filter(r => !r.valid).length;

    document.getElementById('checker-valid').textContent = validCount;
    document.getElementById('checker-invalid').textContent = invalidCount;

    resultsDiv.innerHTML = results.map((r, i) => `
        <div onclick="showCookieDetails(${i})" 
             class="p-3 rounded-lg border cursor-pointer transition-all ${r.valid ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10' : 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'}">
            <div class="flex items-center justify-between">
                <code class="text-sm font-mono truncate max-w-[70%]">${r.cookie.substring(0, 40)}...</code>
                <span class="px-2 py-1 rounded text-xs ${r.valid ? 'status-working' : 'status-failed'}">
                    ${r.valid ? 'Валид' : 'Невалид'}
                </span>
            </div>
            ${r.error ? `<p class="text-xs text-red-400 mt-1">${r.error}</p>` : ''}
            ${r.account?.username ? `<p class="text-xs text-green-400 mt-1">@${r.account.username}</p>` : ''}
        </div>
    `).join('');

    resultsDiv.classList.remove('hidden');
    statsDiv.classList.remove('hidden');
    window.cookieResults = results;
}

function showCookieDetails(index) {
    const result = window.cookieResults[index];
    const detailsDiv = document.getElementById('checker-details');

    if (!result.valid || !result.account) {
        detailsDiv.classList.add('hidden');
        return;
    }

    const acc = result.account;
    detailsDiv.innerHTML = `
        <h4 class="font-semibold mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            Информация об аккаунте
        </h4>
        <div class="grid grid-cols-2 gap-4">
            <div class="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                <p class="text-xs text-gray-400">Username</p>
                <p class="font-medium">${acc.username || '-'}</p>
            </div>
            <div class="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                <p class="text-xs text-gray-400">Display Name</p>
                <p class="font-medium">${acc.display_name || '-'}</p>
            </div>
            <div class="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <p class="text-xs text-gray-400">Robux</p>
                <p class="font-medium text-green-400">${acc.robux?.toLocaleString() || '0'}</p>
            </div>
            <div class="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <p class="text-xs text-gray-400">User ID</p>
                <p class="font-medium">${acc.user_id || '-'}</p>
            </div>
        </div>
        <div class="flex flex-wrap gap-2 mt-4">
            ${acc.premium ? '<span class="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Premium</span>' : ''}
            ${acc.has_pin ? '<span class="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">PIN</span>' : ''}
            ${acc.is_2fa_enabled ? '<span class="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">2FA</span>' : ''}
            ${acc.email_verified ? '<span class="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30">Email</span>' : ''}
            ${acc.can_trade ? '<span class="px-2 py-1 rounded text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Can Trade</span>' : ''}
        </div>
        <div class="grid grid-cols-3 gap-2 mt-4">
            <div class="p-2 rounded-lg bg-muted text-center">
                <p class="text-lg font-medium">${acc.friends_count?.toLocaleString() || '0'}</p>
                <p class="text-xs text-gray-400">Friends</p>
            </div>
            <div class="p-2 rounded-lg bg-muted text-center">
                <p class="text-lg font-medium">${acc.followers_count?.toLocaleString() || '0'}</p>
                <p class="text-xs text-gray-400">Followers</p>
            </div>
            <div class="p-2 rounded-lg bg-muted text-center">
                <p class="text-lg font-medium">${acc.groups_count?.toLocaleString() || '0'}</p>
                <p class="text-xs text-gray-400">Groups</p>
            </div>
        </div>
    `;
    detailsDiv.classList.remove('hidden');
}

let sorterFile = null;

function handleSorterFile(event) {
    sorterFile = event.target.files[0];
    document.getElementById('sorter-filename').textContent = sorterFile ? sorterFile.name : 'Нажмите для выбора файла';
}

async function sortCookies() {
    if (!sorterFile) {
        alert('Выберите файл');
        return;
    }

    const formData = new FormData();
    formData.append('file', sorterFile);
    formData.append('remove_duplicates', document.getElementById('sorter-dedup').checked);

    const btn = document.getElementById('sorter-btn');
    const resultsDiv = document.getElementById('sorter-results');

    btn.disabled = true;
    btn.innerHTML = '<svg class="w-4 h-4 loading-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Обработка...';

    try {
        const response = await fetch(`${API_BASE}/cookie/sort`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        displaySorterResults(result);
    } catch (e) {
        alert('Ошибка: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg> Сортировать';
    }
}

function displaySorterResults(result) {
    const resultsDiv = document.getElementById('sorter-results');
    const cookiesText = result.cookies.join('\n');
    const blob = new Blob([cookiesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    resultsDiv.innerHTML = `
        <div class="flex gap-4 mb-4">
            <div class="flex-1 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-center">
                <p class="text-2xl font-bold text-blue-400">${result.total_found}</p>
                <p class="text-xs text-gray-400">Найдено</p>
            </div>
            <div class="flex-1 p-3 rounded-lg bg-green-500/5 border border-green-500/20 text-center">
                <p class="text-2xl font-bold text-green-400">${result.unique_count}</p>
                <p class="text-xs text-gray-400">Уникальных</p>
            </div>
        </div>
        <a href="${url}" download="sorted_cookies_${Date.now()}.txt" 
           class="block w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-center transition-colors">
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Скачать (${result.cookies.length} куки)
        </a>
    `;
    resultsDiv.classList.remove('hidden');
}

async function refreshCookie() {
    const cookie = document.getElementById('refresher-input').value.trim();
    if (!cookie) return;

    const proxy = document.getElementById('refresher-proxy').value.trim() || null;
    const btn = document.getElementById('refresher-btn');
    const resultsDiv = document.getElementById('refresher-results');

    btn.disabled = true;
    btn.innerHTML = '<svg class="w-4 h-4 loading-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Обновление...';
    resultsDiv.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/cookie/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookie, proxy })
        });

        const result = await response.json();
        displayRefresherResults(result);
    } catch (e) {
        alert('Ошибка: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Обновить куки';
    }
}

function displayRefresherResults(result) {
    const resultsDiv = document.getElementById('refresher-results');

    if (result.success && result.new_cookie) {
        resultsDiv.innerHTML = `
            <div class="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                <div class="flex items-center gap-2 mb-3">
                    <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    <span class="font-medium">Успешно обновлено!</span>
                </div>
                <p class="text-sm text-gray-400 mb-2">Новый куки:</p>
                <div class="relative">
                    <code class="block p-3 rounded-lg bg-black/50 font-mono text-xs break-all pr-12">${result.new_cookie}</code>
                    <button onclick="navigator.clipboard.writeText('${result.new_cookie}')" class="absolute top-1/2 right-2 -translate-y-1/2 p-2 hover:bg-white/10 rounded transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </button>
                </div>
            </div>
        `;
    } else {
        resultsDiv.innerHTML = `
            <div class="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                <div class="flex items-center gap-2 mb-2">
                    <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    <span class="font-medium">Не удалось обновить</span>
                </div>
                ${result.error ? `<p class="text-sm text-red-400">${result.error}</p>` : ''}
            </div>
        `;
    }
    resultsDiv.classList.remove('hidden');
}

async function parseGamepasses() {
    const placeId = document.getElementById('parser-placeid').value;
    if (!placeId) return;

    const btn = document.getElementById('parser-gp-btn');
    const resultsDiv = document.getElementById('parser-results');

    btn.disabled = true;
    btn.innerHTML = '<svg class="w-4 h-4 loading-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Загрузка...';

    try {
        const response = await fetch(`${API_BASE}/place/gamepasses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ place_id: parseInt(placeId) })
        });

        const result = await response.json();
        displayParserResults(result, 'gamepasses');
    } catch (e) {
        alert('Ошибка: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Геймпассы';
    }
}

async function parseBadges() {
    const placeId = document.getElementById('parser-placeid').value;
    if (!placeId) return;

    const btn = document.getElementById('parser-badge-btn');
    const resultsDiv = document.getElementById('parser-results');

    btn.disabled = true;
    btn.innerHTML = '<svg class="w-4 h-4 loading-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Загрузка...';

    try {
        const response = await fetch(`${API_BASE}/place/badges`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ place_id: parseInt(placeId) })
        });

        const result = await response.json();
        displayParserResults(result, 'badges');
    } catch (e) {
        alert('Ошибка: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Бейджи';
    }
}

function displayParserResults(result, type) {
    const resultsDiv = document.getElementById('parser-results');
    const items = type === 'gamepasses' ? result.gamepasses : result.badges;
    const title = type === 'gamepasses' ? 'Геймпассы' : 'Бейджи';

    if (result.error) {
        resultsDiv.innerHTML = `<div class="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-red-400">${result.error}</div>`;
        resultsDiv.classList.remove('hidden');
        return;
    }

    if (items.length === 0) {
        resultsDiv.innerHTML = `<div class="p-3 rounded-lg bg-muted text-gray-400 text-center">У плейса нет ${type === 'gamepasses' ? 'геймпассов' : 'бейджей'}</div>`;
        resultsDiv.classList.remove('hidden');
        return;
    }

    const itemsText = items.map(i => `${i.id} | ${i.name}${i.price !== undefined ? ` | ${i.price || 'Free'}` : ''}`).join('\n');
    const blob = new Blob([itemsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    resultsDiv.innerHTML = `
        <div class="mb-3">
            <p class="text-sm text-gray-400">Плейс: <span class="text-white">${result.place_name || 'Unknown'}</span></p>
            <p class="text-sm text-gray-400">${title}: <span class="text-white">${items.length}</span></p>
        </div>
        <a href="${url}" download="${type}_${result.place_id}.txt" 
           class="block w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-center transition-colors mb-3">
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Скачать список
        </a>
        <div class="max-h-64 overflow-y-auto space-y-2">
            ${items.map(item => `
                <div class="p-3 rounded-lg bg-muted flex items-center justify-between">
                    <div>
                        <p class="font-medium text-sm">${item.name}</p>
                        <p class="text-xs text-gray-400">ID: ${item.id}</p>
                    </div>
                    ${item.price !== undefined ? `<span class="px-2 py-1 rounded text-xs border border-purple-500/30">${item.price ? item.price + ' R$' : 'Free'}</span>` : ''}
                </div>
            `).join('')}
        </div>
    `;
    resultsDiv.classList.remove('hidden');
}
