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

    // Load playlist URL đã lưu khi khởi tạo
    const initialSettings = window.pomoSettings || {}; // Lấy từ pomoSettings đã được settings.js load
    if (initialSettings.playlistUrl) {
      document.getElementById('playlist-url').value = initialSettings.playlistUrl;
      // Có thể tự động fetch playlist nếu muốn, nhưng hiện tại chỉ điền vào input
      // this.fetchPlaylist(); // Bỏ comment nếu muốn tự động load playlist khi tải trang
    }
  }

  async fetchPlaylist() {
    const url = document.getElementById('playlist-url').value.trim();
    if (!url) return this.showStatus('Nhập link playlist!', 'error');

    this.playlistId = this.extractPlaylistId(url);
    if (!this.playlistId) return this.showStatus('Link không hợp lệ!', 'error');

    this.showStatus('Đang lấy danh sách...', 'info');
    try {
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