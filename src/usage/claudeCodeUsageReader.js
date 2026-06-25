const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

function findJsonlFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findJsonlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      results.push(fullPath);
    }
  }
  return results;
}

function sumUsageFromLine(line) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return 0;
  }
  if (event.type !== 'assistant') return 0;

  const usage = event.message && event.message.usage;
  if (!usage) return 0;

  return (
    (usage.input_tokens || 0) +
    (usage.output_tokens || 0) +
    (usage.cache_creation_input_tokens || 0) +
    (usage.cache_read_input_tokens || 0)
  );
}

// filePath의 previousOffset 바이트 이후로 새로 추가된 부분만 읽어서
// 토큰 합계와 다음에 사용할 offset을 반환한다. 마지막 줄이 개행으로
// 끝나지 않았으면(아직 쓰는 중) 그 줄은 잘라서 다음 호출로 미룬다.
function readNewSegment(filePath, previousOffset) {
  const stat = fs.statSync(filePath);

  if (stat.size <= previousOffset) {
    // 줄어들었으면(파일이 새로 생성/잘림) 처음부터 다시 읽는다.
    const offset = stat.size < previousOffset ? 0 : previousOffset;
    if (offset === previousOffset) {
      return { tokens: 0, newOffset: previousOffset };
    }
    return readNewSegment(filePath, offset);
  }

  const length = stat.size - previousOffset;
  const buffer = Buffer.alloc(length);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, length, previousOffset);
  fs.closeSync(fd);

  const text = buffer.toString('utf8');
  const lines = text.split('\n');

  let consumedLength = text.length;
  if (!text.endsWith('\n')) {
    const incomplete = lines.pop();
    consumedLength -= Buffer.byteLength(incomplete, 'utf8');
  }

  let tokens = 0;
  for (const line of lines) {
    if (line.trim()) tokens += sumUsageFromLine(line);
  }

  return { tokens, newOffset: previousOffset + consumedLength };
}

module.exports = { PROJECTS_DIR, findJsonlFiles, readNewSegment };
