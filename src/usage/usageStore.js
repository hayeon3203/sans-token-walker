const Store = require('electron-store');
const { EventEmitter } = require('events');
const { THRESHOLDS } = require('../config');
const { PROJECTS_DIR, findJsonlFiles, readNewSegment } = require('./claudeCodeUsageReader');

const store = new Store({
  defaults: {
    maxTokens: 1_000_000,
    accumulatedTokens: 0,
    triggeredThresholds: [],
    // Claude Code 트랜스크립트(.jsonl) 동기화 상태
    absoluteTotalTokens: 0, // 지금까지 읽은 전체 토큰 누적합 (영속, 항상 증가만 함)
    baselineTokens: null, // 화면에 보여줄 0%의 기준점. null이면 "아직 한 번도 동기화 안 됨"
    fileOffsets: {}, // { [jsonl 절대경로]: 마지막까지 읽은 byte offset }
  },
});

class UsageTracker extends EventEmitter {
  getState() {
    const maxTokens = store.get('maxTokens');
    const accumulatedTokens = store.get('accumulatedTokens');
    const percent = maxTokens > 0 ? (accumulatedTokens / maxTokens) * 100 : 0;
    return { maxTokens, accumulatedTokens, percent };
  }

  setMaxTokens(maxTokens) {
    store.set('maxTokens', Math.max(1, Math.floor(maxTokens)));
    // Max가 바뀌면 같은 % 구간이라도 의미가 달라지므로 트리거 기록을 초기화한다.
    store.set('triggeredThresholds', []);
    const state = this.getState();
    this.emit('state-changed', state);
    return state;
  }

  // 수동/가상 누적용 (테스트나 다른 소스 연동 시 사용). Claude Code 자동 동기화와는
  // 별개의 경로이므로, 이 함수를 쓰면 absoluteTotalTokens가 아니라 accumulatedTokens에
  // 직접 더해진다.
  recordUsage(inputTokens, outputTokens) {
    const next = store.get('accumulatedTokens') + inputTokens + outputTokens;
    store.set('accumulatedTokens', next);

    const state = this.getState();
    this._checkThresholds(state.percent);
    this.emit('state-changed', state);
    return state;
  }

  // Claude Code의 ~/.claude/projects/**/*.jsonl 을 읽어서 새로 추가된 토큰만 반영한다.
  // 파일별 offset을 영속화해두기 때문에 앱을 재시작해도 중복 집계되지 않는다.
  syncClaudeCodeUsage() {
    const offsets = { ...store.get('fileOffsets') };
    let newTokens = 0;

    for (const filePath of findJsonlFiles(PROJECTS_DIR)) {
      const previousOffset = offsets[filePath] || 0;
      const { tokens, newOffset } = readNewSegment(filePath, previousOffset);
      offsets[filePath] = newOffset;
      newTokens += tokens;
    }

    store.set('fileOffsets', offsets);

    const absoluteTotal = store.get('absoluteTotalTokens') + newTokens;
    store.set('absoluteTotalTokens', absoluteTotal);

    let baseline = store.get('baselineTokens');
    if (baseline === null) {
      // 최초 동기화: 설치 이전의 과거 사용량은 카운트하지 않고 지금부터 측정 시작.
      baseline = absoluteTotal;
      store.set('baselineTokens', baseline);
    }

    store.set('accumulatedTokens', Math.max(0, absoluteTotal - baseline));

    const state = this.getState();
    this._checkThresholds(state.percent);
    this.emit('state-changed', state);
    return state;
  }

  // 화면에 보이는 사용률만 0으로 되돌린다. (지금까지 읽은 절대 누적량 자체는 보존됨)
  resetAccumulation() {
    store.set('baselineTokens', store.get('absoluteTotalTokens'));
    store.set('accumulatedTokens', 0);
    store.set('triggeredThresholds', []);
    const state = this.getState();
    this.emit('state-changed', state);
    return state;
  }

  // 한 번의 동기화에서 여러 구간(예: 30%, 50%)을 동시에 넘는 경우, 전부 다 띄우지 않고
  // 그 중 가장 높은 구간 하나만 애니메이션으로 보여준다. 나머지는 "이미 지나간 구간"으로만
  // 기록해서 나중에 따로 다시 튀어나오지 않게 한다.
  _checkThresholds(percent) {
    const triggered = store.get('triggeredThresholds');
    const newlyCrossed = THRESHOLDS.filter((t) => percent >= t && !triggered.includes(t));
    if (newlyCrossed.length === 0) return;

    store.set('triggeredThresholds', [...triggered, ...newlyCrossed]);
    this.emit('threshold-crossed', Math.max(...newlyCrossed));
  }
}

module.exports = new UsageTracker();
