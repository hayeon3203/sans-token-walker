const stage = document.getElementById('stage');

window.overlayApi.onSpawnWalker(({ percent, altitudeRatio, speedMs }) => {
  spawnWalkerUnit(percent, altitudeRatio, speedMs);
});

function spawnWalkerUnit(percent, altitudeRatio, speedMs) {
  const unit = document.createElement('div');
  unit.className = 'walker-unit';
  unit.style.top = `${altitudeRatio * 100}%`;
  unit.style.left = '100%';
  unit.style.animation = `walker-fly-across ${speedMs}ms linear forwards`;

  const flag = document.createElement('div');
  flag.className = 'walker-flag';
  flag.textContent = `${percent}%`;

  const sprite = document.createElement('div');
  sprite.className = 'walker-sprite';

  unit.append(flag, sprite);
  stage.appendChild(unit);

  unit.addEventListener('animationend', (e) => {
    // walker-walk-cycle(걷기 모션)도 같은 엘리먼트에서 animationend를 발생시키므로
    // 화면을 가로지르는 walker-fly-across가 끝났을 때만 제거한다.
    if (e.animationName === 'walker-fly-across') {
      unit.remove();
    }
  });
}
