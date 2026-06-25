const maxInput = document.getElementById('maxTokens');
const accumulatedEl = document.getElementById('accumulated');
const maxEl = document.getElementById('max');
const percentEl = document.getElementById('percent');

function render(state) {
  accumulatedEl.textContent = state.accumulatedTokens.toLocaleString();
  maxEl.textContent = state.maxTokens.toLocaleString();
  percentEl.textContent = state.percent.toFixed(1);
}

async function refresh() {
  const state = await window.api.getState();
  render(state);
  maxInput.value = state.maxTokens;
}

document.getElementById('saveMax').addEventListener('click', async () => {
  const value = Number(maxInput.value);
  if (!Number.isFinite(value) || value <= 0) return;
  const state = await window.api.setMaxTokens(value);
  render(state);
});

document.getElementById('reset').addEventListener('click', async () => {
  const state = await window.api.resetUsage();
  render(state);
});

document.querySelectorAll('button[data-percent]').forEach((btn) => {
  btn.addEventListener('click', () => {
    window.api.triggerWalker(Number(btn.dataset.percent));
  });
});

window.api.onStateUpdate(render);
refresh();
