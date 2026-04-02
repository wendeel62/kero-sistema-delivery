# Project Context: Kero Sistema Delivery

## Overview
**Kero Sistema Delivery** is a multi-tenant SaaS platform designed for delivery management, point of sale (PDV), and customer engagement. It provides a comprehensive suite of tools for restaurants and delivery businesses to manage orders, inventory, finances, and customer relationships.

## Tech Stack
- **Frontend**: React 19, TypeScript 5.9, Vite 8.
- **Styling**: Tailwind CSS 4 (Utility-first).
- **Backend/Database**: Supabase (PostgreSQL, Auth, Storage, Realtime).
- **Routing**: React Router v7.
- **Icons**: Material Symbols.

## Core Modules
- **Dashboard**: KPI visualization and business overview.
- **Pedidos (Order Management)**: Kanban-style board for tracking order flow (NOVO -> EM_PREPARO -> SAIU_PARA_ENTREGA -> ENTREGA).
- **PDV (Point of Sale)**: In-store sales management.
- **Cardápio Online**: Public-facing menu for customers to place orders.
- **Estoque (Inventory)**: Stock control and management.
- **Financeiro (Financial)**: Revenue and expense tracking.
- **Clientes (CRM)**: Customer database and history.
- **Entrega (Delivery)**: Logistics management for motoboys.
- **Agente IA**: AI-powered attendant and manager.
- **Cozinha (KDS)**: Kitchen Display System for order preparation.
- **Mesas**: QR Code-based ordering for dine-in.

## Key Architecture Patterns
### Multi-Tenancy (CRITICAL)
The system uses a shared database strategy where every table contains a `tenant_id` column.
- **Filter Rule**: Every query MUST include `.eq('tenant_id', tenantId)`.
- **Insert Rule**: Every insert MUST explicitly include the `tenant_id`.
- **Context**: `tenantId` is retrieved from the `AuthContext`.

### Realtime Updates
The system heavily relies on Supabase Realtime for live updates in the Kanban, PDV, and KDS modules, managed via the custom `useRealtime` hook.

## Project Structure
- `src/pages/`: Main route components.
- `src/components/`: Reusable UI elements.
- `src/contexts/`: Global state (Auth, etc.).
- `src/hooks/`: Custom React hooks.
- `src/lib/`: Client initializations (Supabase).
- `supabase/`: Database migrations and functions.

## Database Schema
The database is structured into several modules:
- **Core**: Authenticated users and tenants.
- **Products**: Categories, products, and variants (Sabores).
- **Orders**: Detailed order information, status history, and items.
- **Operational**: Tables for Mesa, Delivery, and Kitchen management.
- **Feedback**: NPS and customer reviews.
