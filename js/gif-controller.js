// js/gif-controller.js

class PomoGIF {
  constructor() {
    this.gifElement = document.getElementById('pomo-gif');
    this.isBreak = false;
    this.isPlayingOneShot = false;

    this.gifConfig = {
      focus: {
        loop: [
          { file: 'VietBai1.gif', weight: 80 },
          { file: 'Ngu.gif',     weight: 15 },
          { file: 'SiNghi.gif',  weight: 5 },
          { file: 'QuayBut.gif',    weight: 5 },
        ],
        oneShot: [
          { file: 'ChopMat.gif',    weight: 10 },
        ]
      },
      break: {
        loop: [
          { file: 'BucBoi.gif',     weight: 50 },
          { file: 'ShareMuong.gif', weight: 30 },
          { file: 'Ngu.gif',        weight: 20 },
          { file: 'QuayBut.gif',    weight: 30 }
        ],
        oneShot: [
          { file: 'ChopMat.gif',    weight: 40 },
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

    this.gifElement.src = `gifs/${gifFile}?t=${Date.now()}`;

    setTimeout(() => {
      this.isPlayingOneShot = false;
      this.playLoop();
    }, duration);
  }

  playLoop() {
    const config = this.isBreak ? this.gifConfig.break : this.gifConfig.focus;
    const gifFile = this.getWeightedRandom(config.loop);
    this.gifElement.src = `gifs/${gifFile}?t=${Date.now()}`;
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

const pomoGIF = new PomoGIF();