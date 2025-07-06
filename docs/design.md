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

#### 翻訳対象フィールド

- `name`: 用語名
- `alias`: 別名（存在する場合）
- `definitions[].text`: 定義文
- `confer`: 関連用語（存在する場合）
- `example`: 使用例（存在する場合）
- `note`: 注記（存在する場合）

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js 24+
- **翻訳API**: Chrome 138以上のTranslator API
- **データ形式**: JSON

## ファイル構成

```
├── src/
│   ├── main.ts
│   └── types.ts
├── input/
│   └── iso24765-terminology.json
├── output/
│   └── iso24765-translated-terminology.json
└── docs/
    └── design.md
```
