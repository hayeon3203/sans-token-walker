// 선택 사항. Anthropic 조직 관리자(Admin) 권한이 있는 경우에만 쓸 수 있는 보정 경로다.
//
// 제약:
// - sk-ant-admin-... 형태의 Admin API 키가 필요하다. 일반 API 키(sk-ant-api03-...)로는 호출되지 않는다.
// - 이 엔드포인트는 "지금까지의 총 사용량" 단일 값이 아니라 시간 구간(bucket)별 리포트이므로,
//   원하는 기간(예: 이번 달 1일~오늘)을 지정해서 받은 뒤 합산해야 한다.
// - Claude.ai 구독 채팅 사용량에는 적용되지 않는다. API(종량제) 사용량 전용이다.
//
// 실시간 트리거 용도로는 맞지 않고, "주기적으로 한 번씩 실제 값과 로컬 누적값을 맞춰보는"
// 보정 배치 작업 정도로 쓰는 걸 추천한다.

async function fetchUsageReport({ adminApiKey, startingAt, endingAt, bucketWidth = '1d' }) {
  const url = new URL('https://api.anthropic.com/v1/organizations/usage_report/messages');
  url.searchParams.set('starting_at', startingAt);
  url.searchParams.set('ending_at', endingAt);
  url.searchParams.set('bucket_width', bucketWidth);

  const res = await fetch(url, {
    headers: {
      'x-api-key': adminApiKey,
      'anthropic-version': '2023-06-01',
    },
  });

  if (!res.ok) {
    throw new Error(`Usage report fetch failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return sumTokensFromReport(data);
}

function sumTokensFromReport(data) {
  let inputTokens = 0;
  let outputTokens = 0;

  for (const bucket of data.data ?? []) {
    for (const result of bucket.results ?? []) {
      inputTokens += result.uncached_input_tokens ?? 0;
      inputTokens += result.cache_read_input_tokens ?? 0;
      inputTokens += result.cache_creation_input_tokens ?? 0;
      outputTokens += result.output_tokens ?? 0;
    }
  }

  return { inputTokens, outputTokens, total: inputTokens + outputTokens };
}

module.exports = { fetchUsageReport };
