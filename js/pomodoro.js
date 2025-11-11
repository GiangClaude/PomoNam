// js/pomodoro.js
 // Giả sử gif-controller.js đã khởi tạo và gán vào window.pomoGIF

class PomodoroTimer {
  constructor() {
    this.display = document.getElementById('timer-display');
    this.phaseLabel = document.getElementById('phase-label'); // Vẫn giữ reference nhưng sẽ không hiển thị
    this.startBtn = document.getElementById('start-btn');
    this.resetBtn = document.getElementById('reset-btn'); // Đổi thành nút "KẾT THÚC"
    // Các input này giờ nằm trong modal, sẽ được load qua settings.js
    // this.focusInput = document.getElementById('focus-min');
    // this.breakInput = document.getElementById('break-min');
    // this.pauseVideoCheckbox = document.getElementById('pause-video-on-break');

    this.isRunning = false;
    this.isBreak = false;
    this.timeLeft = 0;
    this.timerId = null;

    this.startBtn.addEventListener('click', () => this.toggle());
    this.resetBtn.addEventListener('click', () => this.endSession()); // Đổi hành vi nút reset

    this.loadSettings(); // Tải cài đặt ban đầu từ localStorage thông qua settings.js
    this.updateDisplay();

    // Prepare break sound (play once when focus ends)
    try {
      this.breakSound = new Audio('/sounds/TimeBreak.mp3');
      this.breakSound.preload = 'auto';
      this.breakSound.loop = false;
      this.breakSound.volume = 0.95;
    } catch (e) {
      console.warn('Could not create break sound audio:', e);
      this.breakSound = null;
    }

    // Audio unlock flag
    this.audioUnlocked = false;
  }

  loadSettings() {
    // Lấy cài đặt từ đối tượng settings đã được settings.js tải vào window.pomoSettings
    // Nếu chưa có, dùng giá trị mặc định
    const currentSettings = window.pomoSettings || { focusMin: 25, breakMin: 5 };
    this.focusTime = (currentSettings.focusMin || 25) * 60;
    this.breakTime = (currentSettings.breakMin || 5) * 60;

    // Nếu không đang chạy, đặt lại thời gian về focusTime
    if (!this.isRunning) {
        this.timeLeft = this.focusTime;
    }
  }

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (this.isRunning) return;
    // Unlock audio on first user gesture (start button) to satisfy autoplay policies
    if (!this.audioUnlocked) {
      this._unlockAudio();
    }
    this.isRunning = true;
    this.startBtn.textContent = 'TẠM DỪNG';
    this.resetBtn.textContent = 'KẾT THÚC'; // Đảm bảo nút này hiển thị đúng khi bắt đầu

    this.timerId = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.updateDisplay();
      } else {
        this.switchPhase();
      }
    }, 1000);
  }

  _unlockAudio() {
    this.audioUnlocked = true;
    // Try to play and immediately pause the break sound to unlock audio on some browsers
    if (this.breakSound) {
      try {
        const p = this.breakSound.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            try { this.breakSound.pause(); this.breakSound.currentTime = 0; } catch (e) { /* ignore */ }
          }).catch(() => {
            // play was blocked; we'll still mark unlocked to avoid retry storms
          });
        }
      } catch (e) {
        // ignore
      }
    }
    // If there are other audio elements (e.g., from gif-controller), we could try to unlock them here too.
  }

  pause() {
    clearInterval(this.timerId);
    this.isRunning = false;
    this.startBtn.textContent = 'TIẾP TỤC';
  }

  endSession() { // Đổi tên từ reset thành endSession
    this.pause();
    this.isBreak = false;
    this.loadSettings(); // Tải lại cài đặt
    this.updateDisplay();
  if (window.pomoGIF) window.pomoGIF.setBreakMode(false); // GIF về focus
    this.startBtn.textContent = 'BẮT ĐẦU'; // Đặt lại text nút Start
    this.resetBtn.textContent = 'KẾT THÚC'; // Đặt lại text nút End
    if (window.ytPlayer) {
      window.ytPlayer.pause(); // Dừng video khi kết thúc
    }
  }

  switchPhase() {
    this.isBreak = !this.isBreak;
    this.timeLeft = this.isBreak ? this.breakTime : this.focusTime;
    this.updateDisplay();

    // Gọi GIF
  if (window.pomoGIF) window.pomoGIF.setBreakMode(this.isBreak);

    // Dừng/tiếp video, kiểm tra cài đặt từ settings.js
    if (window.ytPlayer && window.pomoSettings) {
      if (this.isBreak && window.pomoSettings.pauseOnBreak) {
        window.ytPlayer.pause();
      } else {
        window.ytPlayer.play();
      }
    }

    // If we've just switched into break (i.e., focus just ended), play the break sound once
    if (this.isBreak && this.breakSound) {
      try {
        // reset and play
        this.breakSound.pause();
        this.breakSound.currentTime = 0;
        const playPromise = this.breakSound.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(err => {
            // Autoplay might be blocked if user never interacted; log and ignore
            console.warn('Break sound play was blocked or failed:', err);
          });
        }
      } catch (err) {
        console.warn('Error when trying to play break sound:', err);
      }
    }
  }

  updateDisplay() {
    const mins = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
    const secs = (this.timeLeft % 60).toString().padStart(2, '0');
    this.display.textContent = `${mins}:${secs}`;
    // this.phaseLabel.textContent = this.isBreak ? 'NGHỈ NGƠI' : 'TẬP TRUNG'; // Ẩn nhãn pha
    // this.phaseLabel.style.color = this.isBreak ? '#FF9800' : '#4CAF50'; // Ẩn nhãn pha
  }
}

// Khởi động
const pomodoro = new PomodoroTimer();