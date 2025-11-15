// js/youtube.js

class YouTubePlaylist {
  constructor() {
    // Read API key from Vite env (import.meta.env) when built with Vite,
    // fall back to global window.YOUTUBE_API_KEY for non-built/test scenarios.
    // Note: this file will be loaded as an ES module under Vite, so import.meta.env is available.
    this.API_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_YOUTUBE_API_KEY)
      ? import.meta.env.VITE_YOUTUBE_API_KEY
      : (typeof window !== 'undefined' && window.YOUTUBE_API_KEY ? window.YOUTUBE_API_KEY : '');
    if (!this.API_KEY) {
      console.warn('⚠️ YouTube API Key not found. Set VITE_YOUTUBE_API_KEY in build env or window.YOUTUBE_API_KEY before loading.');
    }

    this.playlistId = '';
    this.videoIds = []; // Mảng chứa { id, title }
    this.currentIndex = 0;
    this.isRandom = false;
    this.player = null;
    this.statusEl = document.getElementById('playlist-status');
    this.videoListEl = document.getElementById('video-list'); // Trong modal
    this.playerReady = false;
    this.currentSongTitleEl = document.getElementById('current-song-title'); // Thêm element hiển thị tên bài hát

    document.getElementById('fetch-btn').addEventListener('click', () => this.fetchPlaylist());
    document.getElementById('playlist-url').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Ngăn submit form nếu có
        this.fetchPlaylist();
      }
    });

    // Lắng nghe sự kiện change từ random-mode checkbox trong modal
    document.getElementById('random-mode').addEventListener('change', (e) => {
      this.setRandomMode(e.target.checked);
    });

    // Player control buttons (prev/next/seek)
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if (prevBtn) prevBtn.addEventListener('click', () => this.prevVideo());
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextVideo());

    // Listen for settings applied event (settings.js will dispatch on load/save)
    document.addEventListener('pomonam:settingsApplied', (e) => {
      const s = (e && e.detail) ? e.detail : {};
      if (s.playlistUrl) {
        const input = document.getElementById('playlist-url');
        if (input) input.value = s.playlistUrl;
        // If no playlist loaded yet, auto-fetch the saved playlist on startup
        if (!this.videoIds || this.videoIds.length === 0) {
          // small timeout to let UI settle
          setTimeout(() => this.fetchPlaylist(), 100);
        }
      }
    });
  }

  /**
   * Toggle between 1x and 2x playback speed. Updates button label.
   */
  async toggleDoubleSpeed(buttonEl) {
    if (!this.playerReady || !this.player) return;
    try {
      const current = this.player.getPlaybackRate ? this.player.getPlaybackRate() : 1;
      const target = (Math.abs(current - 2) < 0.1) ? 1 : 2;
      // Some videos may not support 2x; check available rates
      const avail = this.player.getAvailablePlaybackRates ? this.player.getAvailablePlaybackRates() : [];
      if (avail && avail.length && !avail.includes(target)) {
        // If 2 not available, try the highest available
        const max = Math.max(...avail);
        this.player.setPlaybackRate(max);
        if (buttonEl) buttonEl.textContent = max + 'x';
      } else {
        this.player.setPlaybackRate(target);
        if (buttonEl) buttonEl.textContent = target + 'x';
      }
    } catch (e) {
      console.warn('Failed to toggle speed', e);
    }
  }

  setPlaybackRate(rate) {
    if (!this.playerReady || !this.player) return;
    try {
      this.player.setPlaybackRate(rate);
      const btn = document.getElementById('speed-btn');
      if (btn) btn.textContent = rate + 'x';
    } catch (e) {
      console.warn('Failed to set playback rate', e);
    }
  }

  prevVideo() {
    if (!this.playerReady || this.videoIds.length === 0) return;

    if (this.isRandom) {
      // If random mode, just pick another random index
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * this.videoIds.length);
      } while (newIndex === this.currentIndex && this.videoIds.length > 1);
      this.currentIndex = newIndex;
    } else {
      this.currentIndex = (this.currentIndex - 1 + this.videoIds.length) % this.videoIds.length;
    }

    const id = this.videoIds[this.currentIndex]?.id;
    if (id) {
      this.player.loadVideoById(id);
      this.currentSongTitleEl.textContent = this.videoIds[this.currentIndex].title;
    }
  }

  /**
   * Seek relative seconds in the current video. Positive to forward, negative to back.
   */
  seekBy(seconds) {
    if (!this.playerReady || !this.player) return;
    try {
      const current = this.player.getCurrentTime();
      const duration = this.player.getDuration() || 0;
      let target = current + seconds;
      if (target < 0) target = 0;
      if (duration && target > duration) target = duration - 0.1;
      this.player.seekTo(target, true);
    } catch (e) {
      console.warn('Seek failed', e);
    }
  }

  async fetchPlaylist() {
    const url = document.getElementById('playlist-url').value.trim();
    if (!url) return this.showStatus('Nhập link playlist!', 'error');

    this.playlistId = this.extractPlaylistId(url);
    if (!this.playlistId) return this.showStatus('Link không hợp lệ!', 'error');

    this.showStatus('Đang lấy danh sách...', 'info');
    try {
      console.log('THis API Key: ', this.API_KEY);
        this.videoIds = await this.getPlaylistVideos(this.playlistId);
        if (this.videoIds.length === 0) return this.showStatus('Không tìm thấy video!', 'error');

        this.showStatus(`Tải ${this.videoIds.length} video thành công!`, 'success');
        this.renderVideoList();
        this.initPlayer(); // Khởi tạo player

        // Play video đầu tiên nếu có
        if (this.videoIds.length > 0) {
            this.playVideoAt(0);
        }

    } catch (error) {
        console.error('Lỗi khi lấy playlist:', error);
        this.showStatus(`Lỗi: ${error.message}`, 'error');
    }
  }

  extractPlaylistId(url) {
    const match = url.match(/(?:list=)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  async getPlaylistVideos(playlistId) {
    let videos = [];
    let nextPageToken = '';

    do {
      console.log('API Key being used:', this.API_KEY);

      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${this.API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        console.error('YouTube API Error:', data.error);
        throw new Error(data.error.message);
      }

      data.items.forEach(item => {
        if (item.snippet.resourceId?.videoId && item.snippet.title !== 'Private video') { // Lọc bỏ video riêng tư
          videos.push({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title
          });
        }
      });

      nextPageToken = data.nextPageToken || '';
    } while (nextPageToken);

    return videos;
  }

  renderVideoList() {
    this.videoListEl.innerHTML = '';
    this.videoIds.forEach((video, index) => {
      const btn = document.createElement('button');
      btn.textContent = `${index + 1}. ${video.title}`;
      btn.onclick = () => this.playVideoAt(index);
      this.videoListEl.appendChild(btn);
    });
  }

  initPlayer() {
    if (this.player) {
      // Nếu player đã tồn tại, thay đổi video mà không tạo lại player
      if (this.videoIds.length > 0) {
        this.player.loadVideoById(this.videoIds[0].id);
        this.currentSongTitleEl.textContent = this.videoIds[0].title;
      }
      return;
    }

    const createPlayer = () => {
      this.player = new YT.Player('player', {
        height: '100%', // Dùng 100% để player tự điều chỉnh theo div cha
        width: '100%', // Dùng 100% để player tự điều chỉnh theo div cha
        videoId: this.videoIds[0]?.id || '',
        playerVars: {
          'playsinline': 1,
          'enablejsapi': 1,
          'origin': window.location.origin,
          'autoplay': 1, // Thử autoplay
          'modestbranding': 1, // Loại bỏ logo YouTube
          'controls': 0 // Ẩn điều khiển mặc định của YouTube
        },
        events: {
          'onReady': (event) => {
            this.playerReady = true;
            if (this.videoIds.length > 0) {
                this.currentSongTitleEl.textContent = this.videoIds[0].title;
                // Thử play video
                try { event.target.playVideo(); } catch (e) { console.warn("Autoplay was prevented."); }
            }
            // Update speed button label if present
            try {
              const speedBtn = document.getElementById('speed-btn');
              if (speedBtn) {
                const rate = event.target.getPlaybackRate ? event.target.getPlaybackRate() : 1;
                speedBtn.textContent = (rate || 1) + 'x';
                speedBtn.disabled = false;
              }
            } catch (e) {
              /* ignore */
            }
          },
          'onStateChange': (event) => {
            if (event.data === YT.PlayerState.ENDED) {
              if (window.ytSettings && window.ytSettings.repeatCurrent) {
                const id = this.videoIds[this.currentIndex]?.id;
                if (id) {
                    this.player.loadVideoById(id); // Tải lại cùng video
                    this.currentSongTitleEl.textContent = this.videoIds[this.currentIndex].title;
                }
                return;
              }
              this.nextVideo();
            } else if (event.data === YT.PlayerState.PLAYING) {
                // Cập nhật tên bài hát khi video bắt đầu chơi
                if (this.videoIds[this.currentIndex]) {
                    this.currentSongTitleEl.textContent = this.videoIds[this.currentIndex].title;
                }
            }
          },
          'onError': (event) => {
            console.error('YouTube Player Error:', event.data);
            this.showStatus('Lỗi phát video!', 'error');
            this.nextVideo(); // Thử phát bài tiếp theo nếu lỗi
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      createPlayer();
    };

    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript.parentNode.insertBefore(tag, firstScript);
    }
  }

  playVideoAt(index) {
    if (!this.playerReady) {
      this.showStatus('Player đang khởi tạo...', 'info');
      // Thử lại sau 500ms
      setTimeout(() => this.playVideoAt(index), 500);
      return;
    }

    if (index >= 0 && index < this.videoIds.length) {
      this.currentIndex = index;
      this.player.loadVideoById(this.videoIds[index].id);
      this.currentSongTitleEl.textContent = this.videoIds[index].title; // Cập nhật tên bài hát
    } else {
        console.warn("Index ngoài phạm vi danh sách video.");
        this.showStatus("Không tìm thấy video này.", "error");
    }
  }

  nextVideo() {
    if (!this.playerReady || this.videoIds.length === 0) return;

    if (this.isRandom) {
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * this.videoIds.length);
      } while (newIndex === this.currentIndex && this.videoIds.length > 1); // Đảm bảo không lặp lại ngay nếu có nhiều hơn 1 bài
      this.currentIndex = newIndex;
    } else {
      this.currentIndex = (this.currentIndex + 1) % this.videoIds.length;
    }
    this.player.loadVideoById(this.videoIds[this.currentIndex].id);
    this.currentSongTitleEl.textContent = this.videoIds[this.currentIndex].title; // Cập nhật tên bài hát
  }

  play() {
    if (this.playerReady && this.player.getPlayerState() !== YT.PlayerState.PLAYING) {
      this.player.playVideo();
    }
  }

  pause() {
    if (this.playerReady && this.player.getPlayerState() !== YT.PlayerState.PAUSED) {
      this.player.pauseVideo();
    }
  }

  setRandomMode(random) {
    this.isRandom = random;
  }

  showStatus(message, type = 'info') {
    this.statusEl.textContent = message;
    this.statusEl.style.color = type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#FFC107';
  }
}

// Khởi động
const ytPlaylist = new YouTubePlaylist();

// Export cho Pomodoro
window.ytPlayer = {
  play: () => ytPlaylist.play(),
  pause: () => ytPlaylist.pause()
};

// Expose navigation for UI / external controls
window.ytPlayer.next = () => ytPlaylist.nextVideo();
window.ytPlayer.prev = () => ytPlaylist.prevVideo && ytPlaylist.prevVideo();
window.ytPlayer.seekForward = (sec = 10) => ytPlaylist.seekBy && ytPlaylist.seekBy(Math.abs(sec));
window.ytPlayer.seekBackward = (sec = 10) => ytPlaylist.seekBy && ytPlaylist.seekBy(-Math.abs(sec));
window.ytPlayer.setSpeed = (rate) => ytPlaylist.setPlaybackRate ? ytPlaylist.setPlaybackRate(rate) : null;
window.ytPlayer.toggle2x = () => ytPlaylist.toggleDoubleSpeed ? ytPlaylist.toggleDoubleSpeed(document.getElementById('speed-btn')) : null;