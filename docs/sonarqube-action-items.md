# SonarQube 対応指摘一覧

SonarQube の包括解析で検出した33件のコードスメルを個別に追跡した結果です。解析条件や全体指標は[静的解析レポート](sonarqube-analysis-report.md)を参照してください。

**初回解析の対象リビジョン:** `c6ee4cb83430912fe7ce7ccd6ba7977fbacea30d`
**プロファイル:** TypeScript `Sonar way comprehensive`

## 進捗

| 状態 | 件数 |
| --- | ---: |
| 未着手 | 0 |
| 対応中 | 0 |
| 完了 | 33 |
| 合計 | 33 |

2026年11月16日の修正後解析で、追跡対象33件はすべて解消し、未解決指摘は0件でした。Quality Gate も通過しています。

## 優先して確認

| ID | 状態 | 重要度 | ルール | 対象箇所 | 対応内容 |
| --- | --- | --- | --- | --- | --- |
| A11Y-01 | 完了 | Major | `typescript:S6819` | `src/app/components/ExitPanel.tsx:183` | `role="status"` を使う要素を `<output>` に置き換え、支援技術での読み上げを確認する。 |
| A11Y-02 | 完了 | Major | `typescript:S6819` | `src/app/components/ExitPanel.tsx:189` | `role="status"` を使う要素を `<output>` に置き換え、支援技術での読み上げを確認する。 |
| A11Y-03 | 完了 | Major | `typescript:S6819` | `src/app/components/ExitPanel.tsx:249` | `role="status"` を使う要素を `<output>` に置き換え、支援技術での読み上げを確認する。 |
| A11Y-04 | 完了 | Major | `typescript:S6819` | `src/app/components/ProjectionPanel.tsx:267` | `role="status"` を使う要素を `<output>` に置き換え、支援技術での読み上げを確認する。 |
| A11Y-05 | 完了 | Major | `typescript:S6819` | `src/app/components/ScenarioWorkspace.tsx:1255` | `role="status"` を使う要素を `<output>` に置き換え、支援技術での読み上げを確認する。 |
| A11Y-06 | 完了 | Major | `typescript:S6819` | `src/app/page.tsx:78` | `role="status"` を使う要素を `<output>` に置き換え、支援技術での読み上げを確認する。 |
| COMPLEXITY-01 | 完了 | Critical | `typescript:S3776` | `src/lib/propertyCsv.ts:84` | Cognitive Complexity 43 の関数を責務ごとに分割し、15以下を目指す。 |
| COMPLEXITY-02 | 完了 | Critical | `src/lib/scenarioComparison.ts:150` | Cognitive Complexity 34 の関数を責務ごとに分割し、15以下を目指す。 |

## その他の改善候補

| ID | 状態 | 重要度 | ルール | 対象箇所 | 対応内容 |
| --- | --- | --- | --- | --- | --- |
| TERNARY-01 | 完了 | Major | `typescript:S3358` | `src/app/components/ScenarioWorkspace.tsx:304` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| TERNARY-02 | 完了 | Major | `typescript:S3358` | `src/app/components/ScenarioWorkspace.tsx:305` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| TERNARY-03 | 完了 | Major | `typescript:S3358` | `src/app/components/ScenarioWorkspace.tsx:306` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| TERNARY-04 | 完了 | Major | `typescript:S3358` | `src/app/components/ScenarioWorkspace.tsx:307` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| TERNARY-05 | 完了 | Major | `typescript:S3358` | `src/app/components/ScenarioWorkspace.tsx:739` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| TERNARY-06 | 完了 | Major | `typescript:S3358` | `src/app/components/ScenarioWorkspace.tsx:740` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| TERNARY-07 | 完了 | Major | `typescript:S3358` | `src/app/components/ScenarioWorkspace.tsx:742` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| TERNARY-08 | 完了 | Major | `typescript:S3358` | `src/app/components/ScenarioWorkspace.tsx:743` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| TERNARY-09 | 完了 | Major | `typescript:S3358` | `src/app/components/ScenarioWorkspace.tsx:1118` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| TERNARY-10 | 完了 | Major | `typescript:S3358` | `src/app/components/ScenarioWorkspace.tsx:1120` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| TERNARY-11 | 完了 | Major | `typescript:S3358` | `src/app/components/ScenarioWorkspace.tsx:1122` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| TERNARY-12 | 完了 | Major | `typescript:S3358` | `src/app/components/WaterfallChart.tsx:87` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| TERNARY-13 | 完了 | Major | `typescript:S3358` | `src/app/components/WaterfallChart.tsx:89` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| TERNARY-14 | 完了 | Major | `typescript:S3358` | `src/app/page.tsx:80` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| TERNARY-15 | 完了 | Major | `typescript:S3358` | `src/app/page.tsx:92` | ネストした三項演算子を独立した変数・条件分岐にして表示ロジックを読みやすくする。 |
| PROPS-01 | 完了 | Minor | `typescript:S6759` | `src/app/components/ExitChart.tsx:20` | コンポーネントのprops型を読み取り専用にする。 |
| PROPS-02 | 完了 | Minor | `typescript:S6759` | `src/app/components/ExitPanel.tsx:40` | コンポーネントのprops型を読み取り専用にする。 |
| PROPS-03 | 完了 | Minor | `typescript:S6759` | `src/app/components/ProjectionCharts.tsx:21` | コンポーネントのprops型を読み取り専用にする。 |
| PROPS-04 | 完了 | Minor | `typescript:S6759` | `src/app/components/ProjectionPanel.tsx:38` | コンポーネントのprops型を読み取り専用にする。 |
| PROPS-05 | 完了 | Minor | `typescript:S6759` | `src/app/components/ScenarioComparisonChart.tsx:27` | コンポーネントのprops型を読み取り専用にする。 |
| PROPS-06 | 完了 | Minor | `typescript:S6759` | `src/app/components/ScenarioWorkspace.tsx:350` | コンポーネントのprops型を読み取り専用にする。 |
| PROPS-07 | 完了 | Minor | `typescript:S6759` | `src/app/components/WaterfallChart.tsx:12` | コンポーネントのprops型を読み取り専用にする。 |
| CLEANUP-01 | 完了 | Major | `typescript:S1854` | `src/app/components/ScenarioWorkspace.tsx:424` | 使用されていない `nextIndex` への代入を削除する。 |
| MODERN-01 | 完了 | Minor | `typescript:S7755` | `src/app/components/ProjectionPanel.tsx:78` | 配列末尾要素を `[array.length - 1]` で取得している箇所を `.at(-1)` に置き換える。 |
| UNICODE-01 | 完了 | Minor | `typescript:S7758` | `src/lib/propertyCsv.ts:85` | `charCodeAt()` を `codePointAt()` に置き換え、Unicodeコードポイントを扱う。 |
