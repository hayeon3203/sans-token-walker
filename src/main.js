const { app, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const { createOverlayWindow } = require('./windows/createOverlayWindow');
const { createControlWindow } = require('./windows/createControlWindow');
const usageTracker = require('./usage/usageStore');
const { ALTITUDE_RATIO, SPEED_MS } = require('./config');

const SPAWN_STAGGER_MS = 1500;

let overlayWindow;
let controlWindow;
let tray;
let spawnQueue = [];
let isSpawning = false;

// 한 번의 폴링에서 여러 임계치(예: 30%, 50%)를 동시에 넘으면 threshold-crossed가
// 거의 같은 시점에 여러 번 발생한다. 큐에 쌓아두고 하나씩 순서대로 내보내서
// 화면에서 두 애니메이션이 겹쳐 보이는 걸 막는다.
function spawnWalker(percent) {
  spawnQueue.push(percent);
  processSpawnQueue();
}

function processSpawnQueue() {
  if (isSpawning || spawnQueue.length === 0 || !overlayWindow) return;

  isSpawning = true;
  const percent = spawnQueue.shift();
  const altitudeRatio = ALTITUDE_RATIO[percent] ?? 0.5;
  const speedMs = SPEED_MS[percent] ?? 6000;
  overlayWindow.webContents.send('spawn-walker', { percent, altitudeRatio, speedMs });

  setTimeout(() => {
    isSpawning = false;
    processSpawnQueue();
  }, SPAWN_STAGGER_MS);
}

app.whenReady().then(() => {
  overlayWindow = createOverlayWindow();
  controlWindow = createControlWindow();

  tray = new Tray(path.join(__dirname, '../assets/tray-icon.png'));
  tray.setToolTip('Claude 토큰 모니터');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '제어판 열기', click: () => controlWindow.show() },
      {
        label: '종료',
        click: () => {
          controlWindow.isQuitting = true;
          app.quit();
        },
      },
    ])
  );
  tray.on('click', () => controlWindow.show());

  ipcMain.handle('trigger-walker', (_e, percent) => {
    spawnWalker(percent);
  });

  ipcMain.handle('set-max-tokens', (_e, max) => {
    return usageTracker.setMaxTokens(max);
  });

  ipcMain.handle('reset-usage', () => usageTracker.resetAccumulation());

  ipcMain.handle('get-usage-state', () => usageTracker.getState());

  usageTracker.on('threshold-crossed', (percent) => spawnWalker(percent));
  usageTracker.on('state-changed', (state) => {
    controlWindow.webContents.send('usage-state-updated', state);
  });

  // Claude Code 트랜스크립트(~/.claude/projects/**/*.jsonl)를 주기적으로 읽어
  // 새로 쌓인 토큰만 반영한다. 시작 시 한 번 즉시 동기화하고, 이후 5초마다 갱신.
  usageTracker.syncClaudeCodeUsage();
  setInterval(() => usageTracker.syncClaudeCodeUsage(), 5000);
});

// Electron은 window-all-closed에서 app.quit()을 직접 호출하지 않으면 종료되지 않는다.
// 트레이 상주 앱이므로 아무 것도 하지 않고 그대로 둔다.
app.on('window-all-closed', () => {});
