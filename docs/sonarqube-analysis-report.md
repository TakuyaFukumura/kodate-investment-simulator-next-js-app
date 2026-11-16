# SonarQube 静的解析レポート

## 実施概要

| 項目 | 内容 |
| --- | --- |
| 再解析日 | 2026年11月16日 |
| 対象リビジョン | `c6ee4cb83430912fe7ce7ccd6ba7977fbacea30d` |
| 対象プロジェクト | `kodate-investment-simulator` |
| 解析対象 | `src/`（TypeScript、TSX、CSS） |
| SonarQube | Community Build 26.10.0.133078 |
| SonarScanner CLI | 8.1.0.6389（Docker） |
| TypeScript Quality Profile | `Sonar way comprehensive`（439ルール） |
| CSS Quality Profile | `Sonar way core`（25ルール） |
| カバレッジ入力 | Jest の `coverage/lcov.info` |
| 解析結果 | 成功 |

初回解析では `Sonar way core`（TypeScript 198ルール）が使われ、`typescript:S3776` が無効でした。その後の `Sonar way extended`（251ルール）でも `S6759` と `S6819` は無効だったため、対象ルールを含む `Sonar way comprehensive` に切り替えて再解析しました。選択した TypeScript プロファイルには BUG 93、CODE_SMELL 287、VULNERABILITY 59ルールが有効です。

## 包括プロファイルでの初回解析結果

| 指標 | 結果 |
| --- | ---: |
| Quality Gate | OK（新規指摘 0件） |
| バグ | 0 |
| 脆弱性 | 0 |
| セキュリティホットスポット | 0 |
| コードスメル・未解決指摘 | 33 |
| 内訳 | S3358: 15、S6759: 7、S6819: 6、S3776: 2、S1854: 1、S7755: 1、S7758: 1 |
| SonarQube カバレッジ | 86.5% |
| 重複行密度 | 0.0% |
| 非コメント行 | 3,836 |

指定されたルールはすべて有効で、次の指摘を検出しました。

| ルール | 件数・場所 | 内容 |
| --- | --- | --- |
| `typescript:S3776` | 2件: `src/lib/propertyCsv.ts:84`, `src/lib/scenarioComparison.ts:150` | Cognitive Complexity 43、34をそれぞれ15以下にする |
| `typescript:S6759` | 7件: `src/app/components/ExitChart.tsx:20`, `ExitPanel.tsx:40`, `ProjectionCharts.tsx:21`, `ProjectionPanel.tsx:38`, `ScenarioComparisonChart.tsx:27`, `ScenarioWorkspace.tsx:350`, `WaterfallChart.tsx:12` | コンポーネントのpropsを読み取り専用にする |
| `typescript:S6819` | 6件: `src/app/components/ExitPanel.tsx:183, 189, 249`, `ProjectionPanel.tsx:267`, `ScenarioWorkspace.tsx:1255`, `src/app/page.tsx:78` | `role="status"` の代わりに `<output>` を使う |
| `typescript:S7758` | 1件: `src/lib/propertyCsv.ts:85` | `charCodeAt()` の代わりに `codePointAt()` を使う |

その他の検出内容:

| ルール | 件数・場所 | 内容 |
| --- | --- | --- |
| `typescript:S3358` | 15件: `src/app/components/ScenarioWorkspace.tsx:304-307, 739-740, 742-743, 1118, 1120, 1122`; `src/app/components/WaterfallChart.tsx:87, 89`; `src/app/page.tsx:80, 92` | ネストした三項演算子を独立した式にする |
| `typescript:S1854` | 1件: `src/app/components/ScenarioWorkspace.tsx:424` | 使用されていない `nextIndex` への代入を削除する |
| `typescript:S7755` | 1件: `src/app/components/ProjectionPanel.tsx:78` | 配列末尾要素へのアクセスに `.at()` を使う |

Quality Gate の条件は `new_violations = 0` で、前回解析以降の新規指摘を判定します。既存の未解決指摘33件がある状態でも `OK` になるため、「指摘がない」ことを意味しません。

Jest の再実行結果は **10 suites / 81 tests 成功**です。Jest 全体のカバレッジは **statement 89.32% / branch 80.00% / function 89.20% / line 89.66%** でした。SonarQube のカバレッジ86.5%は `src/` に対する値です。

## 修正後の再解析結果

2026年11月16日に、対応一覧の33件を修正し、追加テストを含めて再解析しました（SonarQube タスク ID: `0e05132c-de55-4eb8-b9ff-29e4c416c5ba`）。

| 指標 | 結果 |
| --- | ---: |
| Quality Gate | OK |
| 未解決指摘 | 0 |
| バグ | 0 |
| 脆弱性 | 0 |
| セキュリティホットスポット | 0 |
| コードスメル | 0 |
| SonarQube カバレッジ | 88.6% |
| 新規コードカバレッジ | 89.1%（条件: 80%以上） |
| 新規重複行密度 | 0.0%（条件: 3%以下） |
| 新規指摘 | 0（条件: 0件） |

修正後の Jest は **10 suites / 84 tests 成功**で、全体カバレッジは **statement 91.24% / branch 82.34% / function 89.65% / line 91.71%** でした。`npm run build` は成功し、`npm run lint` はエラー0件・警告1件（生成済み `coverage/lcov-report/block-navigation.js` の不要な eslint-disable）でした。

Docker の Windows マウントでファイル時刻の警告が出て11ファイルの Git blame 情報を取得できませんでしたが、解析レポートのアップロードとサーバー側処理は成功し、上記の指摘数・Quality Gate が得られました。

## 再確認

SonarQube プロジェクトの TypeScript Quality Profile に `Sonar way comprehensive` を割り当て、必要なルールが有効であることを確認してから解析します。Jest のカバレッジを生成した後、リポジトリルートで Scanner CLI を実行してください。

```bash
npm test -- --coverage --runInBand
docker run --rm --add-host host.docker.internal:host-gateway \
  -e SONAR_HOST_URL=http://host.docker.internal:9000 \
  -e SONAR_TOKEN \
  -v "${PWD}:/usr/src" \
  sonarsource/sonar-scanner-cli:latest \
  -Dsonar.projectKey=kodate-investment-simulator \
  -Dsonar.projectName="Kodate Investment Simulator" \
  -Dsonar.projectVersion=0.2.0 \
  -Dsonar.sources=src \
  -Dsonar.tests=__tests__ \
  -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
  -Dsonar.sourceEncoding=UTF-8
```

ローカル SonarQube ダッシュボード: <http://localhost:9000/dashboard?id=kodate-investment-simulator>
