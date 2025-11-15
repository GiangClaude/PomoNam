// js/gif-controller.js

class PomoGIF {
  constructor() {
    this.gifElement = document.getElementById('pomo-gif');
    this.isBreak = false;
    this.isPlayingOneShot = false;

    this.gifConfig = {
      focus: {
        loop: [
          { file: 'VietBai1.gif', weight: 50 },
          { file: 'Ngu.gif',     weight: 20 },
          { file: 'SiNghi.gif',  weight: 30 },
          { file: 'QuayBut.gif',    weight: 15 },
        ],
        oneShot: [
          { file: 'ChopMat.gif',    weight: 30 },
        ]
      },
      break: {
        loop: [
          { file: 'BucBoi.gif',     weight: 50 },
          { file: 'ShareMuong.gif', weight: 30 },
          { file: 'Ngu.gif',        weight: 30 },
          { file: 'QuayBut.gif',    weight: 20 }
        ],
        oneShot: [
          { file: 'ChopMat.gif',    weight: 30 },
        ]
      }
    };

    this.minDelay = 7000;
    this.maxDelay = 14000;

    this.startLoop();
  }

  getWeightedRandom(list) {
    const total = list.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    for (const item of list) {
      if (r < item.weight) return item.file;
      r -= item.weight;
    }
    return list[list.length - 1].file;
  }

  playOneShot() {
    if (this.isPlayingOneShot) return;
    this.isPlayingOneShot = true;

    const config = this.isBreak ? this.gifConfig.break : this.gifConfig.focus;
    const gifFile = this.getWeightedRandom(config.oneShot);
    const duration = this.getGIFDuration(gifFile);

    this.gifElement.src = `/public/gifs/${gifFile}?t=${Date.now()}`;

    setTimeout(() => {
      this.isPlayingOneShot = false;
      this.playLoop();
    }, duration);
  }

  playLoop() {
    const config = this.isBreak ? this.gifConfig.break : this.gifConfig.focus;
    const gifFile = this.getWeightedRandom(config.loop);
    this.gifElement.src = `/public/gifs/${gifFile}?t=${Date.now()}`;
  }

  getGIFDuration(filename) {
    const d = { 'ChopMat.gif': 800, 'QuayBut.gif': 8000, 'ShareMuong.gif': 5000 };
    return d[filename] || 1000;
  }

  startLoop() {
    this.playLoop();
    const next = () => {
      const delay = Math.random() * (this.maxDelay - this.minDelay) + this.minDelay;
      setTimeout(() => {
        if (this.isPlayingOneShot) { next(); return; }
        const chance = this.isBreak ? 0.7 : 0.2;
        if (Math.random() < chance) this.playOneShot();
        else this.playLoop();
        next();
      }, delay);
    };
    next();
  }

  setBreakMode(isBreak) {
    this.isBreak = isBreak;
    if (!this.isPlayingOneShot) this.playLoop();
  }
}

// Expose instance to global scope so non-module code (e.g., pomodoro.js) can access it.
const pomoGIF = new PomoGIF();
if (typeof window !== 'undefined') window.pomoGIF = pomoGIF;