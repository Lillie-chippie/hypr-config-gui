// ============================================================================
// GLOBAL STATE
// ============================================================================

let keybindsData = [];
let hypridleData = [];
let wallpapersData = [];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds}s`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `${seconds}s (${minutes} min)`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${seconds}s (${hours}h ${minutes}m)`;
    }
}

// ============================================================================
// TAB SWITCHING
// ============================================================================

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;

        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // Load data for the active tab
        if (tabName === 'keybinds') loadKeybinds();
        if (tabName === 'hypridle') loadHypridle();
        if (tabName === 'wallpapers') loadWallpapers();
    });
});

// ============================================================================
// KEYBINDS
// ============================================================================

let deletedKeybindIds = new Set();
let recordingCard = null;
let autoSaveTimeout = null;

// Comprehensive list of Hyprland dispatchers
const HYPRLAND_DISPATCHERS = [
    { value: 'exec', label: 'exec - Execute command', needsParam: true },
    { value: 'execr', label: 'execr - Execute raw command', needsParam: true },

    // Window Management
    { value: 'killactive', label: 'killactive - Close active window' },
    { value: 'forcekillactive', label: 'forcekillactive - Force kill active window' },
    { value: 'closewindow', label: 'closewindow - Close window', needsParam: true },
    { value: 'killwindow', label: 'killwindow - Kill window', needsParam: true },
    { value: 'togglefloating', label: 'togglefloating - Toggle floating' },
    { value: 'setfloating', label: 'setfloating - Set floating' },
    { value: 'settiled', label: 'settiled - Set tiled' },
    { value: 'fullscreen', label: 'fullscreen - Toggle fullscreen', needsParam: false },
    { value: 'pin', label: 'pin - Pin window' },
    { value: 'movefocus', label: 'movefocus - Move focus', needsParam: true },
    { value: 'movewindow', label: 'movewindow - Move window', needsParam: true },
    { value: 'swapwindow', label: 'swapwindow - Swap window', needsParam: true },
    { value: 'centerwindow', label: 'centerwindow - Center window' },
    { value: 'resizeactive', label: 'resizeactive - Resize active', needsParam: true },
    { value: 'moveactive', label: 'moveactive - Move active', needsParam: true },
    { value: 'cyclenext', label: 'cyclenext - Cycle next window', needsParam: false },
    { value: 'swapnext', label: 'swapnext - Swap next', needsParam: false },
    { value: 'focuswindow', label: 'focuswindow - Focus window', needsParam: true },
    { value: 'bringactivetotop', label: 'bringactivetotop - Bring to top' },
    { value: 'alterzorder', label: 'alterzorder - Alter z-order', needsParam: true },
    { value: 'toggleopaque', label: 'toggleopaque - Toggle opaque' },

    // Workspace Management
    { value: 'workspace', label: 'workspace - Switch workspace', needsParam: true },
    { value: 'movetoworkspace', label: 'movetoworkspace - Move to workspace', needsParam: true },
    { value: 'movetoworkspacesilent', label: 'movetoworkspacesilent - Move silent', needsParam: true },
    { value: 'togglespecialworkspace', label: 'togglespecialworkspace - Toggle special', needsParam: false },
    { value: 'movecurrentworkspacetomonitor', label: 'movecurrentworkspacetomonitor', needsParam: true },
    { value: 'focusworkspaceoncurrentmonitor', label: 'focusworkspaceoncurrentmonitor', needsParam: true },
    { value: 'moveworkspacetomonitor', label: 'moveworkspacetomonitor', needsParam: true },
    { value: 'swapactiveworkspaces', label: 'swapactiveworkspaces - Swap workspaces', needsParam: true },

    // Monitor Control
    { value: 'focusmonitor', label: 'focusmonitor - Focus monitor', needsParam: true },
    { value: 'movecursortocorner', label: 'movecursortocorner', needsParam: true },
    { value: 'movecursor', label: 'movecursor - Move cursor', needsParam: true },

    // Group Management
    { value: 'togglegroup', label: 'togglegroup - Toggle group' },
    { value: 'changegroupactive', label: 'changegroupactive', needsParam: true },
    { value: 'lockgroups', label: 'lockgroups - Lock groups', needsParam: true },
    { value: 'lockactivegroup', label: 'lockactivegroup', needsParam: true },
    { value: 'moveintogroup', label: 'moveintogroup', needsParam: true },
    { value: 'moveoutofgroup', label: 'moveoutofgroup' },
    { value: 'movewindoworgroup', label: 'movewindoworgroup', needsParam: true },
    { value: 'movegroupwindow', label: 'movegroupwindow', needsParam: false },

    // System
    { value: 'exit', label: 'exit - Exit Hyprland' },
    { value: 'forcerendererreload', label: 'forcerendererreload' },
    { value: 'dpms', label: 'dpms - Display power', needsParam: true },
    { value: 'pass', label: 'pass - Pass key', needsParam: true },
    { value: 'sendshortcut', label: 'sendshortcut', needsParam: true },
    { value: 'submap', label: 'submap - Change submap', needsParam: true },
    { value: 'global', label: 'global - Global shortcut', needsParam: true },
];

async function loadKeybinds() {
    try {
        const response = await fetch('/api/keybinds');
        const data = await response.json();
        keybindsData = data;
        deletedKeybindIds.clear();
        renderKeybinds();
    } catch (error) {
        showNotification('Error loading keybinds: ' + error.message, 'error');
    }
}

function renderKeybinds(filter = '') {
    const grid = document.getElementById('keybinds-grid');
    grid.innerHTML = '';

    const filtered = keybindsData.filter(kb => {
        // Skip deleted items
        if (kb.id !== undefined && deletedKeybindIds.has(kb.id)) return false;

        const searchText = filter.toLowerCase();
        return (kb.category || '').toLowerCase().includes(searchText) ||
            (kb.key || '').toLowerCase().includes(searchText) ||
            (kb.action || '').toLowerCase().includes(searchText) ||
            (kb.command || '').toLowerCase().includes(searchText);
    });

    filtered.forEach((kb, index) => {
        const card = document.createElement('div');
        card.className = 'keybind-card';
        card.dataset.index = keybindsData.indexOf(kb);

        // Build current keybind display
        let currentKeybind = '';
        if (kb.modifier || kb.key) {
            const modifiers = (kb.modifier || '').split(' ').filter(m => m);
            const key = kb.key || '';

            currentKeybind = `
                <div class="keybind-current">
                    ${modifiers.map(mod => `<span class="key-badge modifier">${mod}</span>`).join('')}
                    ${key ? `<span class="key-badge">${key}</span>` : ''}
                </div>
            `;
        } else {
            currentKeybind = '<div class="keybind-empty">Not set</div>';
        }

        // Get action display name
        const actionDisplay = kb.action || 'Unknown';
        const commandDisplay = kb.command ? ` → ${kb.command}` : '';

        // Build dispatcher dropdown options
        const dispatcherOptions = HYPRLAND_DISPATCHERS.map(d =>
            `<option value="${d.value}" ${kb.action === d.value ? 'selected' : ''}>${d.label}</option>`
        ).join('');

        card.innerHTML = `
            <button class="keybind-delete-btn" onclick="deleteKeybind(${keybindsData.indexOf(kb)})">🗑️</button>
            <div class="keybind-category">${kb.category || 'Custom'}</div>
            <div class="keybind-action">${actionDisplay}${commandDisplay}</div>
            ${currentKeybind}
            <button class="keybind-set-btn" onclick="startRecording(${keybindsData.indexOf(kb)})">
                🎮 Press to Set Keybind
            </button>
            <div class="keybind-details">
                <div class="keybind-detail-row">
                    <span class="keybind-detail-label">Action:</span>
                    <select class="keybind-detail-select" 
                           onchange="updateKeybindField(${keybindsData.indexOf(kb)}, 'action', this.value)">
                        ${dispatcherOptions}
                    </select>
                </div>
                <div class="keybind-detail-row">
                    <span class="keybind-detail-label">Command:</span>
                    <input type="text" class="keybind-detail-input" 
                           value="${kb.command || ''}"
                           placeholder="e.g., kitty, 1, l, etc."
                           onchange="updateKeybindField(${keybindsData.indexOf(kb)}, 'command', this.value)">
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

function startRecording(index) {
    if (recordingCard !== null) {
        stopRecording();
    }

    recordingCard = index;
    const cards = document.querySelectorAll('.keybind-card');
    const card = cards[Array.from(cards).findIndex(c => parseInt(c.dataset.index) === index)];
    const btn = card.querySelector('.keybind-set-btn');

    card.classList.add('recording');
    btn.classList.add('recording');
    btn.textContent = '⏺ Press your keys now...';

    // Add global keydown listener
    document.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(e) {
    e.preventDefault();
    e.stopPropagation();

    if (recordingCard === null) return;

    // Stop on Escape
    if (e.key === 'Escape') {
        stopRecording();
        return;
    }

    // Capture modifiers
    const modifiers = [];
    if (e.metaKey) modifiers.push('SUPER');
    if (e.ctrlKey) modifiers.push('CTRL');
    if (e.altKey) modifiers.push('ALT');
    if (e.shiftKey) modifiers.push('SHIFT');

    // Get the main key
    let key = e.key;

    // Normalize key names for Hyprland
    if (key === ' ') key = 'SPACE';
    if (key === 'Enter') key = 'RETURN';
    if (key === 'ArrowUp') key = 'UP';
    if (key === 'ArrowDown') key = 'DOWN';
    if (key === 'ArrowLeft') key = 'LEFT';
    if (key === 'ArrowRight') key = 'RIGHT';
    if (key.length === 1) key = key.toUpperCase();

    // Don't record just modifiers
    if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
        return;
    }

    // Update the keybind
    const kb = keybindsData[recordingCard];
    kb.modifier = modifiers.join(' ');
    kb.key = key;

    stopRecording();
    renderKeybinds(document.getElementById('keybind-search').value);

    // Auto-save after 1 second
    scheduleAutoSave();
}

function stopRecording() {
    if (recordingCard !== null) {
        const cards = document.querySelectorAll('.keybind-card');
        cards.forEach(card => {
            card.classList.remove('recording');
            const btn = card.querySelector('.keybind-set-btn');
            if (btn) {
                btn.classList.remove('recording');
                btn.textContent = '🎮 Press to Set Keybind';
            }
        });
        recordingCard = null;
    }
    document.removeEventListener('keydown', handleKeyDown);
}

function updateKeybindField(index, field, value) {
    if (keybindsData[index]) {
        keybindsData[index][field] = value;
        scheduleAutoSave();
    }
}

function deleteKeybind(index) {
    const kb = keybindsData[index];
    if (kb.id !== undefined) {
        deletedKeybindIds.add(kb.id);
    } else {
        keybindsData.splice(index, 1);
    }
    renderKeybinds(document.getElementById('keybind-search').value);
    scheduleAutoSave();
}

function scheduleAutoSave() {
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    autoSaveTimeout = setTimeout(() => {
        saveKeybinds();
    }, 1000);
}

async function saveKeybinds() {
    try {
        const existingUpdates = keybindsData.filter(kb => kb.id !== undefined && !deletedKeybindIds.has(kb.id));
        const newKeybinds = keybindsData.filter(kb => kb.id === undefined);
        const deletedIds = Array.from(deletedKeybindIds);

        const response = await fetch('/api/keybinds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                keybinds: existingUpdates,
                deleted_ids: deletedIds,
                new_keybinds: newKeybinds
            })
        });

        if (response.ok) {
            showNotification('✅ Keybinds saved!', 'success');
            loadKeybinds(); // Reload to get fresh IDs
        } else {
            throw new Error('Failed to save keybinds');
        }
    } catch (error) {
        showNotification('❌ Error saving: ' + error.message, 'error');
    }
}

document.getElementById('add-keybind').addEventListener('click', () => {
    keybindsData.push({
        type: 'bind',
        category: 'Custom',
        modifier: '',
        key: '',
        action: 'exec',
        command: ''
    });
    renderKeybinds(document.getElementById('keybind-search').value);

    // Scroll to bottom
    const grid = document.getElementById('keybinds-grid');
    setTimeout(() => {
        grid.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
});

document.getElementById('keybind-search').addEventListener('input', (e) => {
    renderKeybinds(e.target.value);
});

// ============================================================================
// HYPRIDLE
// ============================================================================

const timeoutMapping = {
    'screen_dim': 'screen-dim',
    'keyboard_backlight': 'keyboard-backlight',
    'lock': 'lock',
    'screen_off': 'screen-off',
    'suspend': 'suspend'
};

async function loadHypridle() {
    try {
        const response = await fetch('/api/hypridle');
        hypridleData = await response.json();

        // Update sliders
        hypridleData.forEach(listener => {
            const sliderId = timeoutMapping[listener.type];
            if (sliderId) {
                const slider = document.getElementById(sliderId);
                const valueSpan = document.getElementById(`${sliderId}-value`);
                if (slider && valueSpan) {
                    slider.value = listener.timeout;
                    valueSpan.textContent = formatTime(listener.timeout);
                }
            }
        });
    } catch (error) {
        showNotification('Error loading hypridle config: ' + error.message, 'error');
    }
}

// Update slider values in real-time
Object.values(timeoutMapping).forEach(sliderId => {
    const slider = document.getElementById(sliderId);
    const valueSpan = document.getElementById(`${sliderId}-value`);

    if (slider && valueSpan) {
        slider.addEventListener('input', (e) => {
            valueSpan.textContent = formatTime(parseInt(e.target.value));
        });
    }
});

// Preset configurations
const presets = {
    'power-saver': {
        'screen-dim': 60,
        'keyboard-backlight': 60,
        'lock': 120,
        'screen-off': 150,
        'suspend': 300
    },
    'balanced': {
        'screen-dim': 150,
        'keyboard-backlight': 150,
        'lock': 300,
        'screen-off': 330,
        'suspend': 1800
    },
    'performance': {
        'screen-dim': 300,
        'keyboard-backlight': 300,
        'lock': 600,
        'screen-off': 630,
        'suspend': 3600
    }
};

document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
        const preset = presets[btn.dataset.preset];
        Object.entries(preset).forEach(([sliderId, value]) => {
            const slider = document.getElementById(sliderId);
            const valueSpan = document.getElementById(`${sliderId}-value`);
            if (slider && valueSpan) {
                slider.value = value;
                valueSpan.textContent = formatTime(value);
            }
        });
        showNotification(`Applied ${btn.dataset.preset} preset`, 'success');
    });
});

document.getElementById('save-hypridle').addEventListener('click', async () => {
    try {
        const listeners = [];

        Object.entries(timeoutMapping).forEach(([type, sliderId]) => {
            const slider = document.getElementById(sliderId);
            if (slider) {
                listeners.push({
                    type: type,
                    timeout: parseInt(slider.value)
                });
            }
        });

        const response = await fetch('/api/hypridle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listeners })
        });

        if (response.ok) {
            showNotification('✅ Hypridle timeouts saved and applied!', 'success');
        } else {
            throw new Error('Failed to save hypridle config');
        }
    } catch (error) {
        showNotification('❌ Error saving hypridle config: ' + error.message, 'error');
    }
});

// ============================================================================
// WALLPAPERS
// ============================================================================

async function loadWallpapers() {
    try {
        const response = await fetch('/api/wallpapers');
        const data = await response.json();
        wallpapersData = data.wallpapers;
        renderWallpapers(data.current);
    } catch (error) {
        showNotification('Error loading wallpapers: ' + error.message, 'error');
    }
}

function renderWallpapers(currentWallpaper) {
    const grid = document.getElementById('wallpapers-grid');
    grid.innerHTML = '';

    if (wallpapersData.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No wallpapers found. Upload one to get started!</p>';
        return;
    }

    wallpapersData.forEach(wallpaper => {
        const isActive = wallpaper.name === currentWallpaper;
        const card = document.createElement('div');
        card.className = `wallpaper-card ${isActive ? 'active' : ''}`;
        card.innerHTML = `
            ${isActive ? '<div class="active-badge">✓ Active</div>' : ''}
            <img src="/api/wallpapers/preview/${wallpaper.name}" alt="${wallpaper.name}">
            <div class="wallpaper-info">
                <div class="wallpaper-name">${wallpaper.name}</div>
                <div class="wallpaper-actions">
                    ${!isActive ? `<button class="btn btn-primary" onclick="setWallpaper('${wallpaper.name}')">Set Active</button>` : ''}
                    <button class="btn btn-danger" onclick="deleteWallpaper('${wallpaper.name}')">Delete</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

async function setWallpaper(name) {
    try {
        const response = await fetch('/api/wallpapers/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        if (response.ok) {
            showNotification(`✅ Wallpaper "${name}" set successfully!`, 'success');
            loadWallpapers();
        } else {
            throw new Error('Failed to set wallpaper');
        }
    } catch (error) {
        showNotification('❌ Error setting wallpaper: ' + error.message, 'error');
    }
}

async function deleteWallpaper(name) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
        return;
    }

    try {
        const response = await fetch('/api/wallpapers/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        if (response.ok) {
            showNotification(`✅ Wallpaper "${name}" deleted`, 'success');
            loadWallpapers();
        } else {
            throw new Error('Failed to delete wallpaper');
        }
    } catch (error) {
        showNotification('❌ Error deleting wallpaper: ' + error.message, 'error');
    }
}

document.getElementById('wallpaper-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/wallpapers/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            showNotification(`✅ Wallpaper "${file.name}" uploaded!`, 'success');
            loadWallpapers();
            e.target.value = ''; // Reset input
        } else {
            throw new Error('Failed to upload wallpaper');
        }
    } catch (error) {
        showNotification('❌ Error uploading wallpaper: ' + error.message, 'error');
    }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// Load initial data
loadKeybinds();
