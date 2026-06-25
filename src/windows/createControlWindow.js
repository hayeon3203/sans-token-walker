const { BrowserWindow } = require('electron');
const path = require('path');

function createControlWindow() {
  const controlWindow = new BrowserWindow({
    width: 340,
    height: 460,
    resizable: false,
    title: 'Sans Token Walker',
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload-control.js'),
      contextIsolation: true,
    },
  });

  controlWindow.setMenuBarVisibility(false);
  controlWindow.loadFile(path.join(__dirname, '../renderer/control/control.html'));

  // 트레이 상주 앱이므로 닫기 버튼은 숨기기만 한다 (종료는 트레이 메뉴에서).
  controlWindow.on('close', (e) => {
    if (!controlWindow.isQuitting) {
      e.preventDefault();
      controlWindow.hide();
    }
  });

  return controlWindow;
}

module.exports = { createControlWindow };
