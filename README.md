# Claude 토큰 모니터 (claude-usage-creeper)

바탕화면 위에 투명하게 떠 있다가, **Claude Code 토큰 사용률이 일정 구간(30/50/90/95/99%)을 넘을 때마다** 화면을 가로질러 캐릭터가 깃발(사용률 %)을 들고 지나가는 데스크탑 토이 앱입니다.

## 핵심 동작

- `~/.claude/projects/**/*.jsonl` (Claude Code가 남기는 대화 트랜스크립트)을 5초마다 읽어서, 새로 쌓인 토큰만 누적 반영합니다. API 키가 필요 없습니다.
- 사용자가 지정한 **목표 최대 토큰 수(Max)** 를 기준으로 사용률(%)을 계산합니다. (Anthropic은 "지금까지의 총 사용량" 단일 조회 엔드포인트를 제공하지 않기 때문에, 이렇게 직접 누적·계산하는 방식을 택했습니다.)
- 사용률이 30/50/90/95/99% 구간을 새로 넘을 때마다, 화면을 가로지르는 애니메이션이 자동으로 한 번 뜹니다. 한 번에 여러 구간을 동시에 넘어도 가장 높은 구간 하나만 보여줍니다.
- 구간마다 화면상 높이(고도)와 이동 속도가 다릅니다. 사용률이 높을수록 더 위쪽에서, 더 빠르게 지나갑니다.
- 트레이 아이콘으로 상주하며, 컨트롤 패널에서 Max 값 설정, 사용률 초기화, 구간별 테스트 트리거(애니메이션 미리보기)를 할 수 있습니다.

## 실행 방법

```bash
npm install
npm start
```

최초 `npm install` 시 `electron` 패키지의 설치 스크립트(바이너리 다운로드)가 환경에 따라 막혀 있을 수 있습니다. 이 경우:

```bash
npm approve-scripts electron
npm install
```

## 폴더 구조

```
src/
  config.js                       임계치(30/50/90/95/99), 구간별 고도/속도 매핑
  main.js                         메인 프로세스: 창 생성, 트레이, IPC, 동기화 타이머
  preload-overlay.js              오버레이 창에 노출되는 안전한 API
  preload-control.js              컨트롤 패널 창에 노출되는 안전한 API
  windows/
    createOverlayWindow.js        투명/클릭통과/항상위 풀스크린 오버레이 창
    createControlWindow.js        Max 설정 + 테스트 버튼이 있는 일반 창
  usage/
    usageStore.js                 토큰 누적·임계치 판정·electron-store 영속화
    claudeCodeUsageReader.js      ~/.claude/projects/**/*.jsonl 파서 (실제 사용량 소스)
    anthropicAdminClient.js       (선택) Anthropic Admin API로 보정하는 스텁
  renderer/
    overlay/                      걷기 애니메이션 (CSS steps() 스프라이트 시트)
    control/                      Max 입력, 누적/사용률 표시, 초기화·테스트 버튼
assets/
  sprites/sans-walk.png           4프레임 걷기 스프라이트 시트 (170x300 x4, 좌측 방향)
  tray-icon.png                   트레이 아이콘
```

## 사용률 계산 방식 (중요)

Anthropic API에는 "지금까지 누적된 총 토큰 사용량"을 한 번에 조회하는 엔드포인트가 없습니다. (Admin API의 `usage_report/messages`는 시간 구간별 리포트이고, 조직 관리자 키가 필요하며, Claude.ai 구독 사용량에는 적용되지 않습니다.)

대신 이 앱은 Claude Code가 로컬에 남기는 대화 트랜스크립트(`.jsonl`)에서 매 응답의 `usage` 필드(input/output/cache 토큰)를 직접 합산합니다. 동작 방식:

1. 각 `.jsonl` 파일을 어디까지 읽었는지(byte offset)를 저장해두고, 새로 추가된 부분만 읽어 중복 집계를 막습니다.
2. 앱을 처음 실행한 시점 이전의 과거 사용량은 세지 않고, 그 시점을 0%의 기준(baseline)으로 잡습니다.
3. 컨트롤 패널의 "사용률 초기화" 버튼을 누르면 이 기준점을 현재 시점으로 다시 당겨와서, 화면상 사용률만 0%로 되돌립니다 (내부에 쌓인 절대 누적량 자체는 사라지지 않습니다).

## 구간별 고도/속도 조정

`src/config.js`의 `ALTITUDE_RATIO`(화면 높이 비율, 0=위/1=아래)와 `SPEED_MS`(가로지르는 데 걸리는 시간)를 수정하면 됩니다. `THRESHOLDS` 배열의 구간을 추가/삭제할 때도 이 두 매핑에 동일한 키를 맞춰주면 됩니다.

## 스프라이트 출처에 대한 안내

`assets/sprites/sans-walk.png`는 Undertale(언더테일) 캐릭터 "산스"의 팬아트 스프라이트 시트에서 4프레임을 잘라낸 것입니다. 개인용 토이 프로젝트로는 보통 문제가 없지만, 공개 배포(릴리즈 빌드 배포, 스토어 등록 등)를 고려한다면 직접 그린 오리지널 픽셀아트로 교체하는 것을 권장합니다.
