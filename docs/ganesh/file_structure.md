# Urban Assist Monorepo: File Structure & Purpose Documentation

This document explains the file structure of the **Urban Assist** codebase, detailing the purpose and necessity of each key directory and configuration file.

---

## 1. Monorepo Configuration & Root Files

Located at the root of the workspace ([Urban-assist/](file:///D:/Ganesh/work/Urban-assist)), these files manage the monorepo structure, dependencies, compiler options, and global styles.

*   **[pnpm-workspace.yaml](file:///D:/Ganesh/work/Urban-assist/pnpm-workspace.yaml)**
    *   *Purpose:* Defines the workspace root and lists the folders that contain projects/packages (`apps/*` and `packages/*`).
    *   *Why needed:* Allows `pnpm` to treat the project as a monorepo, enabling cross-package imports (e.g. importing `@urban-assist/ui` inside `apps/customer`) without publishing packages to a registry.
*   **[pnpm-lock.yaml](file:///D:/Ganesh/work/Urban-assist/pnpm-lock.yaml)**
    *   *Purpose:* Lockfile that records the exact versions of dependencies installed across all apps and packages.
    *   *Why needed:* Ensures reproducible builds across different development machines and CI/CD pipelines.
*   **[package.json](file:///D:/Ganesh/work/Urban-assist/package.json)**
    *   *Purpose:* Lists devDependencies used workspace-wide (such as ESLint, Prettier, and TypeScript) and defines global task scripts.
    *   *Why needed:* Enables running tasks across the entire monorepo simultaneously, such as building all apps (`pnpm build`) or running specific local dev instances (`pnpm dev:customer`).
*   **[tsconfig.base.json](file:///D:/Ganesh/work/Urban-assist/tsconfig.base.json)**
    *   *Purpose:* Parent TypeScript configuration containing shared compiler rules (e.g. strict type checks, module resolutions).
    *   *Why needed:* Avoids duplicate configurations in each app/package's `tsconfig.json` by letting them inherit from this base configuration.
*   **.env.example**
    *   *Purpose:* A template mapping all required environment variables (Stripe keys, Supabase credentials, Upstash details).
    *   *Why needed:* Serves as a guide for developers to create local `.env` configuration files without leaking sensitive API secrets to Git.

---

## 2. Applications Directory (`apps/`)

Contains the frontend web applications built using Next.js 14.

*   **[apps/customer/](file:///D:/Ganesh/work/Urban-assist/apps/customer)**
    *   *Purpose:* Next.js web application for customers to find services and manage active bookings.
    *   *Why needed:* Serves as the primary consumer-facing web application. Key routes include:
        *   [app/(app)/page.tsx](file:///D:/Ganesh/work/Urban-assist/apps/customer/app/(app)/page.tsx): Main services directory search catalog page.
        *   [app/(app)/book/[serviceId]/book-flow.tsx](file:///D:/Ganesh/work/Urban-assist/apps/customer/app/(app)/book/[serviceId]/book-flow.tsx): Wizard component for postcodes validation, scheduling, and Stripe Card Checkout.
        *   [app/(app)/bookings/[id]/booking-detail.tsx](file:///D:/Ganesh/work/Urban-assist/apps/customer/app/(app)/bookings/[id]/booking-detail.tsx): Detail view with live booking tracking (uses Supabase Realtime) and messaging chat window.
*   **[apps/provider/](file:///D:/Ganesh/work/Urban-assist/apps/provider)**
    *   *Purpose:* Next.js web application for service professionals.
    *   *Why needed:* Allows providers to onboard, verify profiles, accept work orders, and receive payouts. Key files include:
        *   [app/(app)/dashboard.tsx](file:///D:/Ganesh/work/Urban-assist/apps/provider/app/(app)/dashboard.tsx): Main dashboard with online/offline toggle, stats panel, and job lists.
        *   [app/(app)/offer-card.tsx](file:///D:/Ganesh/work/Urban-assist/apps/provider/app/(app)/offer-card.tsx): Active job proposal card featuring a live countdown timer.
        *   [app/onboarding/kyc-uploader.tsx](file:///D:/Ganesh/work/Urban-assist/apps/provider/app/onboarding/kyc-uploader.tsx): Documents submission portal (ID, Insurance, Certifications) to trigger background KYC audits.
*   **[apps/admin/](file:///D:/Ganesh/work/Urban-assist/apps/admin)**
    *   *Purpose:* Next.js operations panel for marketplace managers.
    *   *Why needed:* Used by admins to manage service provider profiles, review KYC queues, assign unmatched bookings, and resolve tickets.

---

## 3. Shared Library Packages (`packages/`)

Reusable NPM packages shared across `apps/`. Decoupling libraries makes code maintainable and testable.

*   **[packages/auth/](file:///D:/Ganesh/work/Urban-assist/packages/auth)**
    *   *Purpose:* Role-Based Access Control (RBAC) validations and Route Guards.
    *   *Why needed:* Contains guards like [requireRole](file:///D:/Ganesh/work/Urban-assist/packages/auth/src/guards/require-role.ts) to restrict API routes and Next.js views based on user roles (`customer`, `provider`, `admin`).
*   **[packages/db/](file:///D:/Ganesh/work/Urban-assist/packages/db)**
    *   *Purpose:* Supabase client configurations and Database Types.
    *   *Why needed:* Generates client abstractions depending on runtime environments:
        *   [src/client/server.ts](file:///D:/Ganesh/work/Urban-assist/packages/db/src/client/server.ts): Cookie-bound client for Next.js SSR/API routes.
        *   [src/client/browser.ts](file:///D:/Ganesh/work/Urban-assist/packages/db/src/client/browser.ts): Client for Next.js browser components.
        *   [src/client/service-role.ts](file:///D:/Ganesh/work/Urban-assist/packages/db/src/client/service-role.ts): Privileged client to bypass Row-Level Security (RLS) policies during background tasks.
        *   [src/types/generated.ts](file:///D:/Ganesh/work/Urban-assist/packages/db/src/types/generated.ts): Database schemas typed directly from the PostgreSQL engine.
*   **[packages/domain/](file:///D:/Ganesh/work/Urban-assist/packages/domain)**
    *   *Purpose:* Domain business logic layer.
    *   *Why needed:* Decouples business rules from Next.js routes. Contains logic for:
        *   [src/bookings/services/booking-service.ts](file:///D:/Ganesh/work/Urban-assist/packages/domain/src/bookings/services/booking-service.ts): Functions for booking creation, payment logging, cash verification, and job completions.
        *   [src/matching/services/matching-engine.ts](file:///D:/Ganesh/work/Urban-assist/packages/domain/src/matching/services/matching-engine.ts): Distance scoring and provider sorting heuristics for job match offers.
        *   [src/providers/services/kyc-service.ts](file:///D:/Ganesh/work/Urban-assist/packages/domain/src/providers/services/kyc-service.ts): Validates provider documents to approve/reject onboarding requests.
*   **[packages/integrations/](file:///D:/Ganesh/work/Urban-assist/packages/integrations)**
    *   *Purpose:* Gateways and client wrappers for external systems.
    *   *Why needed:* Connects the domain services to third-party services:
        *   [src/stripe/client.ts](file:///D:/Ganesh/work/Urban-assist/packages/integrations/src/stripe/client.ts): Handles Stripe Payment Intent creation.
        *   [src/stripe/payouts.ts](file:///D:/Ganesh/work/Urban-assist/packages/integrations/src/stripe/payouts.ts): Manages Stripe Connect Express onboardings and payout transfers.
        *   [src/redis/client.ts](file:///D:/Ganesh/work/Urban-assist/packages/integrations/src/redis/client.ts): Upstash Redis client with a local, in-memory mock fallback to simplify developer setup.
        *   [src/postcode/lookup.ts](file:///D:/Ganesh/work/Urban-assist/packages/integrations/src/postcode/lookup.ts): Validates UK postcodes and maps them to coordinates.
*   **[packages/ui/](file:///D:/Ganesh/work/Urban-assist/packages/ui)**
    *   *Purpose:* Centralized UI components and shared design assets.
    *   *Why needed:* Implements the project's design system using Tailwind presets:
        *   [src/primitives.tsx](file:///D:/Ganesh/work/Urban-assist/packages/ui/src/primitives.tsx): Common visual elements like buttons, inputs, labels, cards, and badges.
        *   [src/live-status-track.tsx](file:///D:/Ganesh/work/Urban-assist/packages/ui/src/live-status-track.tsx): Progress bar tracking booking milestones (finding, matched, on the way, arrived, in progress, completed).
*   **[packages/utils/](file:///D:/Ganesh/work/Urban-assist/packages/utils)**
    *   *Purpose:* Core utilities, formatting functions, and system constants.
    *   *Why needed:* Houses low-level helpers like currency/date formattings (`pence`, `ukDateTime`), postcode regex patterns, and deterministic OTP generation algorithms ([format.ts](file:///D:/Ganesh/work/Urban-assist/packages/utils/src/format.ts)).

---

## 4. Database Setup & Edge Services (`supabase/`)

Manages the database schema and background worker scripts.

*   **[supabase/migrations/](file:///D:/Ganesh/work/Urban-assist/supabase/migrations)**
    *   *Purpose:* Incremental SQL scripts representing database versions.
    *   *Why needed:* Used by the Supabase CLI to push schema modifications, RLS policies, trigger procedures, and initial seed categories to the database.
*   **[supabase/functions/match-cascade/](file:///D:/Ganesh/work/Urban-assist/supabase/functions/match-cascade)**
    *   *Purpose:* Deno Edge Function matching scheduler.
    *   *Why needed:* Runs every minute via a database cron job. It scans for pending job offers, marks expired entries, and cascades the job to the next nearby professional.
*   **[supabase/functions/notification-dispatch/](file:///D:/Ganesh/work/Urban-assist/supabase/functions/notification-dispatch)**
    *   *Purpose:* Deno Edge Function notification queue dispatcher.
    *   *Why needed:* Reads pending messages from Redis queues and dispatches them as push notifications using the Firebase FCM API.
*   **[supabase/bootstrap.sql](file:///D:/Ganesh/work/Urban-assist/supabase/bootstrap.sql)**
    *   *Purpose:* A single, compiled SQL file containing the entire database structure.
    *   *Why needed:* Serves as a reference file for developers to review database schemas at a glance.

---

## 5. Documentation (`docs/`)

*   **[docs/ganesh/file_structure.md](file:///D:/Ganesh/work/Urban-assist/docs/ganesh/file_structure.md)**
    *   *Purpose:* This file, providing an explanation of directories and codebase architecture.
*   **Other Markdown Docs** (PRDs, Security outlines, implementation milestones, database details).
