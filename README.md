# ISO 24765 Chrome Translator

Chrome Translator APIとPlaywrightを使用してISO/IEC/IEEE 24765用語集を日本語に翻訳するプロジェクト。

## 概要

ISO/IEC/IEEE 24765 (Systems and software engineering vocabulary) の英語用語4,634語を、Chrome 138以上のTranslator APIを使用して高精度な日本語翻訳を実現します。

### 主な特徴

- **Chrome Translator API**: ブラウザネイティブの翻訳機能を活用
- **コンテキスト情報付与**: 専門用語として適切な翻訳のため、コンテキスト情報を付与
- **Playwright自動化**: ブラウザ操作の完全自動化
- **品質管理**: TypeScript/Node.jsベースの翻訳品質チェック
- **バッチ処理**: 大量データの効率的な処理

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js 24+
- **ブラウザ自動化**: Playwright
- **翻訳API**: Chrome 138以上のTranslator API
- **データ形式**: JSON

## 翻訳方式

### コンテキスト情報付与戦略

翻訳精度向上のため、全ての用語に以下のコンテキスト情報を付与：

```
システム・ソフトウェア開発の専門用語としての文脈における用語の説明：[翻訳対象テキスト]
```

翻訳後、このコンテキスト部分を削除して最終的な翻訳結果とします。

**例:**

- 入力: `"algorithm"`
- 翻訳用: `"システム・ソフトウェア開発の専門用語としての文脈における用語の説明：algorithm"`
- 結果: `"アルゴリズム"`

## 必要要件

- Node.js 24.0.0以上
- Chrome 138以上 (Translator API対応)
- 十分なメモリ (2MB JSONファイル処理用)

## 使用方法

### セットアップ

```bash
npm install
```

### 実行

```bash
npm start
```

### 翻訳結果

翻訳完了後、`output/iso24765-translated-terminology.json`に結果が保存されます。

## プロジェクト構成

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
│   ├── design.md               # 設計書
│   └── work-plan.md            # 作業計画
└── scripts/
    └── setup-chrome.ts         # Chrome環境セットアップ
```

## 開発情報

詳細な設計資料は[docs/design.md](docs/design.md)、作業計画は[docs/work-plan.md](docs/work-plan.md)を参照してください。
