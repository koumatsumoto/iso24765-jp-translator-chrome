# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript/Node.js project that automatically translates English terminology lists from ISO/IEC/IEEE 24765 (Systems and software engineering vocabulary) to Japanese using AI agents. The project analyzes input English glossaries and generates appropriate Japanese translations with quality validation.

## Development Commands

### Build and Run

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the main application (scripts/main.ts)
- `npm run convert-to-jsonl` - Convert input/iso24765-terminology.json to output/iso24765-terminology.jsonl
- `npm run validate-jsonl` - Validate output/iso24765-terminology.jsonl against input JSON

### Code Quality

- `npm run fmt` - Format code with Prettier (printWidth: 150)

### TypeScript Execution

- This project uses `"type": "module"` so TypeScript files can be executed directly with Node.js
- Use `node scripts/filename.ts` to run TypeScript files directly (no tsx required)

### TypeScript Configuration

- Uses strict TypeScript configuration with ES2023 target
- NodeNext module resolution
- No emit mode (noEmit: true)
- Extensive strict type checking enabled
- Source files expected in `src/` directory (though currently in `scripts/`)

## Architecture

### Project Structure

- `scripts/main.ts` - Main entry point (currently minimal)
- TypeScript configuration optimized for Node.js with ES modules
- Prettier formatting with 150 character line width

### Technical Stack

- Node.js >= 24.0.0 required
- TypeScript 5.7+ with strict configuration
- ES modules (`"type": "module"`)
- Prettier for code formatting

## Development Notes

The project is currently in early development phase with minimal implementation. The main application logic is expected to be built out in the scripts directory or migrated to a proper src structure as indicated by the TypeScript configuration.

## Translation System Design

Refer to `docs/design.md` for detailed architecture and implementation plan for the ISO 24765 terminology translation system. The system processes 4,634 English terms by converting JSON to JSONL format for efficient streaming processing.

Refer to `docs/implementation-plan.md` for detailed work plan, timeline, and technical considerations for the 6-day implementation schedule.

## Translation Processing Guidelines

### Phase 2: Translation Processing (Manual Claude Execution)

When executing Phase 2 translation processing, follow the specific procedures outlined in `docs/implementation-plan.md` section 2.3:

- **Optimized batch processing**: Read `output/iso24765-terminology.jsonl` in batches of 50-100 lines for efficiency
- **Output files**:
  - Translated results: `output/iso24765-terminology-ja.jsonl`
  - Progress tracking: `progress/translation-progress.txt`
- **Translation rules**: Maintain system/software engineering terminology context with formal academic Japanese translation style
- **Resume capability**: Track progress to allow resuming from interruption point
- **Communication optimization**: Use large batch sizes to minimize AI communication overhead and maximize translation throughput
