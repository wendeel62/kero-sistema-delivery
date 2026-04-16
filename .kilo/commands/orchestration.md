# Orchestration Commands

This file defines the orchestration commands available in the Kero project.

## Build Commands

### *build
Execute full autonomous build cycle for a specific story.

Usage: *build {story-id}

### *build-autonomous  
Start autonomous build loop without story ID.

Usage: *build-autonomous

### *build-resume
Resume from last checkpoint.

Usage: *build-resume

## Development Modes

### *develop-yolo
Autonomous development without confirmation.

Usage: *develop-yolo

### *develop-interactive
Interactive development mode (default).

Usage: *develop-interactive

### *execute-subtask
Execute a single subtask.

Usage: *execute-subtask

## Execution Modes

- **ask** - Confirm each step (default)
- **auto** - Execute without confirmation  
- **explore** - Exploration mode without execution

Use with --auto flag or *yolo prefix.

