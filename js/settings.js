// js/settings.js

(function(){
  const LS_KEY = 'pomonam.settings';

  function defaultSettings() {
    return {
      focusMin: 25,
      breakMin: 5,
      random: false,
      repeatCurrent: false,
      pauseOnBreak: true, // Thêm cài đặt này
      playlistUrl: 'https://www.youtube.com/watch?v=8d_-GCsWC1s&list=PLc9EiDwxHEDv50KBpo037SD9Fc0kxH0xV' // Thêm cài đặt này để lưu link playlist
    };
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultSettings();
      // Đảm bảo các cài đặt mới được thêm vào nếu người dùng có cài đặt cũ
      return Object.assign(defaultSettings(), JSON.parse(raw));
    } catch (e) {
      console.error("Error loading settings:", e);
      return defaultSettings();
    }
  }

  function saveSettings(s) {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  }

  function applySettingsToApp(s) {
    // Lưu các cài đặt Pomodoro vào một đối tượng toàn cục
    window.pomoSettings = {
      focusMin: s.focusMin,
      breakMin: s.breakMin,
      pauseOnBreak: s.pauseOnBreak
    };

    // Yêu cầu pomodoro.js tải lại cài đặt của nó
    if (window.pomodoro) {
        window.pomodoro.loadSettings();
        // Cập nhật hiển thị ngay lập tức nếu timer không chạy
        if (!window.pomodoro.isRunning) {
          window.pomodoro.updateDisplay();
        }
    }

    // Apply to YouTube playlist controller
    const randomCheckbox = document.getElementById('random-mode');
    if (randomCheckbox) {
      randomCheckbox.checked = !!s.random;
      // Không cần dispatchEvent('change') ở đây vì event listener của ytPlaylist đã xử lý
    }
    // Expose repeatCurrent flag globally for youtube.js to read
    window.ytSettings = window.ytSettings || {};
    window.ytSettings.repeatCurrent = !!s.repeatCurrent;

    // Cập nhật playlist URL vào input trong modal (chỉ khi modal chưa mở)
    const playlistUrlInput = document.getElementById('playlist-url');
    if (playlistUrlInput && !document.getElementById('settings-modal').classList.contains('active')) {
      playlistUrlInput.value = s.playlistUrl;
      // Không cần fetch ở đây, chỉ hiển thị giá trị đã lưu
    }
  }

  function openModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');

    // fill values
    const s = loadSettings();
    document.getElementById('modal-focus-min').value = s.focusMin;
    document.getElementById('modal-break-min').value = s.breakMin;
    document.getElementById('random-mode').checked = !!s.random;
    document.getElementById('modal-repeat').checked = !!s.repeatCurrent;
    document.getElementById('modal-pause-on-break').checked = !!s.pauseOnBreak;
    document.getElementById('playlist-url').value = s.playlistUrl; // Load saved playlist URL
  }

  function closeModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const overlay = modal && modal.querySelector('.settings-overlay');
    const saveBtn = document.getElementById('settings-save');
    const cancelBtn = document.getElementById('settings-cancel');

    // Initialize: apply persisted settings to app
    const initial = loadSettings();
    applySettingsToApp(initial);
  // Notify other modules that settings have been applied (useful for youtube.js to auto-load playlist)
  try { document.dispatchEvent(new CustomEvent('pomonam:settingsApplied', { detail: initial })); } catch (e) { /* noop */ }

    if (btn) btn.addEventListener('click', openModal);
    if (overlay) overlay.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (saveBtn) saveBtn.addEventListener('click', () => {
      const s = {
        focusMin: parseInt(document.getElementById('modal-focus-min').value, 10) || 25,
        breakMin: parseInt(document.getElementById('modal-break-min').value, 10) || 5,
        random: !!document.getElementById('random-mode').checked,
        repeatCurrent: !!document.getElementById('modal-repeat').checked,
        pauseOnBreak: !!document.getElementById('modal-pause-on-break').checked,
        playlistUrl: document.getElementById('playlist-url').value.trim() // Lưu playlist URL
      };
      saveSettings(s);
      applySettingsToApp(s); // Áp dụng cài đặt đã lưu
      // Notify other modules the settings changed (e.g., new playlist URL)
      try { document.dispatchEvent(new CustomEvent('pomonam:settingsApplied', { detail: s })); } catch (e) { /* noop */ }
      closeModal();
    });

    // allow ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });

    // Thêm event listener cho random-mode checkbox trong modal
    document.getElementById('random-mode').addEventListener('change', (e) => {
        if (window.ytPlaylist) {
            window.ytPlaylist.setRandomMode(e.target.checked);
        }
    });
  });

})();