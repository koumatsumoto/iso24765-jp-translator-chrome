# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript/Node.js project that automatically translates English terminology lists from ISO/IEC/IEEE 24765 (Systems and software engineering vocabulary) to Japanese using AI agents. The project analyzes input English glossaries and generates appropriate Japanese translations with quality validation.

## Development Commands

### Build and Run

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the main application (scripts/main.ts)

### Code Quality

- `npm run fmt` - Format code with Prettier (printWidth: 150)

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
