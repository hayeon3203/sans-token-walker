const { BrowserWindow, screen } = require('electron');
const path = require('path');

function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().bounds;

  const overlayWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload-overlay.js'),
      contextIsolation: true,
    },
  });

  // 'screen-saver' 레벨이어야 전체화면 게임/영상 위에도 떠 있을 수 있다 (Windows 기준).
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  // 클릭이 오버레이를 그냥 통과해서 바탕화면/다른 창으로 전달되게 한다.
  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay/overlay.html'));

  return overlayWindow;
}

module.exports = { createOverlayWindow };
