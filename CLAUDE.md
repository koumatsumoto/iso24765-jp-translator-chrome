# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript/Node.js project that automatically translates English terminology lists from ISO/IEC/IEEE 24765 (Systems and software engineering vocabulary) to Japanese using Chrome Translator API and Playwright. The project processes 4,634 English terms with context-aware translation strategy for high-quality Japanese translations.

## Development Commands

### Build and Run

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the main translation application (src/main.ts)

### Code Quality

- `npm run fmt` - Format code with Prettier (printWidth: 150)

### TypeScript Execution

- This project uses `"type": "module"` so TypeScript files can be executed directly with Node.js
- Use `node src/filename.ts` to run TypeScript files directly (no tsx required)

### Chrome Setup

- Chrome 138+ required for Translator API
- Playwright will handle Chrome automation

### TypeScript Configuration

- Uses strict TypeScript configuration with ES2023 target
- NodeNext module resolution
- No emit mode (noEmit: true)
- Extensive strict type checking enabled
- Source files expected in `src/` directory

## Architecture

### Project Structure

- `src/main.ts` - Main entry point (currently minimal)
- TypeScript configuration optimized for Node.js with ES modules
- Prettier formatting with 150 character line width

### Technical Stack

- Node.js >= 24.0.0 required
- TypeScript 5.7+ with strict configuration
- ES modules (`"type": "module"`)
- Playwright for browser automation
- Chrome 138+ for Translator API
- Prettier for code formatting

## Translation System Architecture

### Core Components

- `src/main.ts` - Main entry point and orchestration
- `src/translator.ts` - Chrome Translator API operations
- `src/browser.ts` - Playwright browser automation
- `src/processor.ts` - Translation processing logic
- `src/validator.ts` - Quality assurance and validation
- `src/types.ts` - TypeScript type definitions

### Key Features

- **Context-aware Translation**: Adds professional context to improve accuracy
- **Batch Processing**: Handles 4,634 terms efficiently
- **Quality Validation**: Ensures translation integrity
- **Error Handling**: Robust error recovery and logging

### Context Strategy

All translations use the format:

```
システム・ソフトウェア開発の専門用語としての文脈における用語の説明：[term]
```

This context is added before translation and removed from final results.

## Translation System Design

Refer to `docs/design.md` for detailed architecture and `docs/work-plan.md` for implementation plan. The system processes 4,634 English terms with Chrome Translator API integration.
