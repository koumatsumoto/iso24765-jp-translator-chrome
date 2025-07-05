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

## 設計方針

### 1. データ変換方式

#### 問題点

- 51,030行の巨大ファイルは一度に処理できない
- JSONは配列形式で、部分読み込みが困難

#### 解決策

JSON配列を1行1エントリのJSON Lines形式に変換

```
{"number":"3.1","name":"1GL","definitions":[{"text":"first-generation language"}],"confer":["machine language"]}
{"number":"3.2","name":"2GL","definitions":[{"text":"second-generation language"}],"confer":["assembly language"]}
```

### 2. 翻訳処理アーキテクチャ

#### 段階的処理

1. **前処理**: JSON → JSONL変換
2. **翻訳処理**: 1行ずつ逐次処理
3. **後処理**: 翻訳済みデータの統合

#### 翻訳対象フィールド

- `name`: 用語名
- `alias`: 別名（存在する場合）
- `definitions[].text`: 定義文
- `confer`: 関連用語（存在する場合）
- `example`: 使用例（存在する場合）
- `note`: 注記（存在する場合）

### 3. 品質管理

#### 翻訳品質確保

- 専門用語の一貫性チェック
- 定義文の正確性検証
- 関連用語の整合性確認

#### エラーハンドリング

- 翻訳失敗時の再試行機能
- 処理中断時の再開機能
- 進捗状況の保存

## 実装計画

### Phase 1: データ変換

1. JSON → JSONL変換スクリプト作成
2. 変換後データの検証

### Phase 2: 翻訳エンジン

1. AI翻訳APIの統合
2. 翻訳ロジックの実装
3. 品質チェック機能

### Phase 3: 統合処理

1. 逐次処理システムの実装
2. 進捗管理機能
3. 結果出力機能

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js 24+
- **翻訳API**: OpenAI API または類似サービス
- **データ形式**: JSON Lines (JSONL)
- **処理方式**: ストリーミング処理

## ファイル構成

```
├── scripts/
│   ├── convert-to-jsonl.ts      # JSON → JSONL変換
│   ├── translate-terminology.ts # 翻訳処理
│   └── main.ts                  # メイン処理
├── input/
│   ├── iso24765-terminology.json
│   └── iso24765-terminology.jsonl  # 変換後
├── output/
│   ├── translated-terminology.jsonl
│   └── translated-terminology.json  # 最終出力
└── docs/
    └── design.md
```

## 進捗管理

処理状況を追跡するため、中間状態を保存する仕組みを実装する。

```json
{
  "total": 4634,
  "completed": 1500,
  "failed": 12,
  "lastProcessedId": "3.1500"
}
```
