// Entry for Vite: import legacy global scripts so they run as modules.
// Minimal change: we import the existing JS files (they mainly register globals / listeners).

import '../js/gif-controller.js';
import '../js/pomodoro.js';
import '../js/youtube.js';
import '../js/settings.js';

// Exported handles (optional) for debug in dev console
export const __pomonam = {
  // scripts attach globals (e.g., window.ytPlayer, window.pomodoro)
};
