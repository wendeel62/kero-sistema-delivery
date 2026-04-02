# Changelog: Kero Sistema Delivery

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-04-02
### Added
- `CONTEXT.md`: High-level project documentation and architecture overview.
- `CHANGELOG.md`: Track project evolution and recent changes.
- Installed **KERO Skill**: Orchestration system for the Kero SaaS (GESTOR -> PLATFORM -> SUBGESTOR).

## [0.1.0] - 2026-03-28
### Added
- Integrated "Sabores" (Flavors) module into the database and frontend.
- Database synchronization scripts (`db_sync.cjs`, `sync_all.mjs`).
### Fixed
- Schema mismatches between Supabase and the application.
- Resolved build-breaking syntax errors in the Kanban interface.
- Standardized UI with Kero Orange palette and consistent Tailwind CSS variables.

## [0.0.5] - 2026-03-27
### Changed
- Optimized Kanban order management interface for better responsiveness.
- Improved legibility of order cards across all screen sizes.
- Reviewed and standardized PDV, Estoque, and Sidebar components.

## [0.0.1] - 2026-03-25
### Added
- Initial project setup with React 19, Vite, and Tailwind CSS 4.
- Supabase integration for multi-tenant delivery management.
- Basic routes for Dashboard, Pedidos, PDV, and Menu.
- Project structure defining components, pages, and hooks.
