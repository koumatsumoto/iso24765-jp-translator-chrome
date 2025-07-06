# ISO 24765 用語翻訳システム 設計書

## 概要

ISO/IEC/IEEE 24765 (Systems and software engineering vocabulary) の英語用語約4,634語を日本語に翻訳するシステムの設計書。

## 現状分析

### 入力ファイル分析

- **ファイル名**: `input/iso24765-terminology.json`
- **サイズ**: 2.0MB
- **行数**: 51,030行
- **用語数**: 4,634語
- **フォーマット**: JSON配列形式

### データ構造

```json
{
  "number": "3.1",
  "name": "用語名",
  "alias": ["別名1", "別名2"],
  "definitions": [
    {
      "text": "定義文",
      "reference": "参照文献（オプション）"
    }
  ],
  "confer": ["関連用語1", "関連用語2"],
  "example": "使用例（オプション）",
  "note": "注記（オプション）"
}
```

```typescript
interface Word {
  number: string;
  name: string;
  alias?: [string, ...string[]];
  definitions: {
    text: string;
    reference?: string | undefined;
  }[];
  confer?: [string, ...string[]];
  example?: string | undefined;
  note?: string | undefined;
}
```

## 設計方針

### 翻訳方式

#### 方針

- Chrome のみサポートしている Translator API を利用する。
  - [MDN Translator](https://developer.mozilla.org/en-US/docs/Web/API/Translator)
- Playwrightを用いてChromeを操作して、用語データの翻訳を行う。
- 翻訳精度向上のため、コンテキスト情報を付与した翻訳を実施する。

#### 翻訳対象フィールド

- `name`: 用語名
- `alias`: 別名（存在する場合）
- `definitions[].text`: 定義文
- `confer`: 関連用語（存在する場合）
- `example`: 使用例（存在する場合）
- `note`: 注記（存在する場合）

#### コンテキスト情報付与戦略

全ての翻訳対象テキストに対して、以下のフォーマットでコンテキスト情報を付与する：

```
システム・ソフトウェア開発の専門用語としての文脈における用語の説明：[翻訳対象テキスト]
```

翻訳後、このコンテキスト部分を削除して最終的な翻訳結果とする。

**例:**

- 入力: `"algorithm"`
- 翻訳用テキスト: `"システム・ソフトウェア開発の専門用語としての文脈における用語の説明：algorithm"`
- 翻訳結果: `"システム・ソフトウェア開発の専門用語としての文脈における用語の説明：アルゴリズム"`
- 最終結果: `"アルゴリズム"`

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js 24+
- **ブラウザ自動化**: Playwright
- **翻訳API**: Chrome 138以上のTranslator API
- **データ形式**: JSON

## 実装アーキテクチャ

### 処理フロー

1. **データ読み込み**: `input/iso24765-terminology.json`から用語データを読み込み
2. **Playwright起動**: Chrome WebDriverを起動し、Translator APIを有効化
3. **翻訳処理**:
   - 各用語の翻訳対象フィールドにコンテキスト情報を付与
   - Chrome Translator APIで翻訳実行
   - 翻訳結果からコンテキスト情報を削除
4. **データ保存**: 翻訳結果を`output/iso24765-translated-terminology.json`に保存
5. **品質チェック**: 翻訳結果の検証とレポート生成

### 翻訳処理詳細

#### バッチ処理

- 4,634語の一括処理のため、適切なバッチサイズで分割処理
- レート制限対応とメモリ使用量の最適化
- 進捗表示とエラーハンドリング

#### エラーハンドリング

- 翻訳API接続エラー
- 個別用語の翻訳失敗
- リトライ機能とログ出力

#### 品質管理

- 翻訳前後のデータ整合性チェック
- 必須フィールドの検証
- 翻訳漏れの検出

## ファイル構成

```
├── src/
│   ├── main.ts                 # メインエントリポイント
│   ├── types.ts                # 型定義
│   ├── translator.ts           # Chrome Translator API操作
│   ├── browser.ts              # Playwright操作
│   ├── processor.ts            # 翻訳処理ロジック
│   └── validator.ts            # 品質チェック
├── input/
│   └── iso24765-terminology.json
├── output/
│   └── iso24765-translated-terminology.json
├── docs/
│   ├── design.md
│   └── work-plan.md
└── scripts/
    └── setup-chrome.ts         # Chrome環境セットアップ
```

## 実装スケジュール

### Phase 1: 基盤実装

- Playwright + Chrome Translator API の統合
- 基本的な翻訳処理パイプライン
- コンテキスト情報付与機能

### Phase 2: 品質向上

- バッチ処理の最適化
- エラーハンドリングの強化
- 品質チェック機能

### Phase 3: 完成・テスト

- 全用語の翻訳実行
- 翻訳結果の検証
- ドキュメント整備
