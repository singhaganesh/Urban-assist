# Implementation Plan: Provider Onboarding with Global Platform Pricing

This document outlines the detailed execution plan to build the provider registration and onboarding flow while transitioning the marketplace pricing model from **provider-defined custom rates** to **fixed, platform-managed global rates** for all services.

---

## 1. Architectural & Database Modifications

### 1.1. Database Schema Updates
We need to create a database migration script (e.g. `0009_global_pricing.sql` under [supabase/migrations/](file:///D:/Ganesh/work/Urban-assist/supabase/migrations)) that applies the following changes:

*   **Update `service_categories` Table:**
    *   Add a `price_pence` column (integer, in pence) to act as the global flat rate.
    *   Add a `duration_mins` column (integer, in minutes) to act as the global average duration.
    *   Remove `min_price_pence` and `max_price_pence` columns since price boundaries are no longer needed.
    *   *SQL Change:*
        ```sql
        ALTER TABLE service_categories ADD COLUMN price_pence integer NOT NULL DEFAULT 3500;
        ALTER TABLE service_categories ADD COLUMN duration_mins integer NOT NULL DEFAULT 60;
        ALTER TABLE service_categories DROP COLUMN min_price_pence;
        ALTER TABLE service_categories DROP COLUMN max_price_pence;
        ```
*   **Update `provider_services` Table:**
    *   Remove `price_pence` and `duration_mins` from the provider mapping. Providers will simply map themselves to a category without overriding these details.
    *   *SQL Change:*
        ```sql
        ALTER TABLE provider_services DROP COLUMN price_pence;
        ALTER TABLE provider_services DROP COLUMN duration_mins;
        ```

### 1.2. Update Seed Data
Modify the seed file [0004_seed.sql](file:///D:/Ganesh/work/Urban-assist/supabase/migrations/0004_seed.sql) to populate default flat rates and durations for all UK service categories (e.g., Home Cleaning at £30.00 / 120 mins; Boiler Repair at £90.00 / 60 mins).

---

## 2. Shared Library Refactoring (`packages/`)

### 2.1. Domain: Booking Service
Currently, the booking engine queries the provider's custom service price. We must refactor [booking-service.ts](file:///D:/Ganesh/work/Urban-assist/packages/domain/src/bookings/services/booking-service.ts#L22-L33) to retrieve the fixed category price:
*   **Locate file:** [booking-service.ts](file:///D:/Ganesh/work/Urban-assist/packages/domain/src/bookings/services/booking-service.ts)
*   **Code Adjustment:**
    *   Update the select query in `createBooking` to retrieve details from the category table:
        ```typescript
        const { data: svc, error: svcErr } = await admin
          .from('provider_services')
          .select('id, provider_id, category_id, service_categories(price_pence)')
          .eq('id', input.providerServiceId)
          .eq('is_active', true)
          .single();
        ```
    *   Pass the category's global price (`svc.service_categories.price_pence`) to the `quote()` builder instead of a custom provider service price.

### 2.2. Domain: Matching Engine
Update the candidate filter logic in [matching-engine.ts](file:///D:/Ganesh/work/Urban-assist/packages/domain/src/matching/services/matching-engine.ts#L83) to match candidates solely on geographic eligibility and active status in the selected category, without checking custom price limits.

---

## 3. Frontend App Alignment (`apps/`)

### 3.1. Provider Onboarding: Services Editor
Refactor the [ServicesEditor](file:///D:/Ganesh/work/Urban-assist/apps/provider/app/onboarding/services/services-editor.tsx) component:
*   **Remove Inputs:** Eliminate form fields for `Price (£)` and `Duration (mins)`.
*   **Simplified Toggle Design:** Present categories as a checklist of active services. Next to each category, show its flat, platform-set price and duration.
*   **Simplified DB Actions:**
    *   When the provider selects a category, insert a row into `provider_services` using only `provider_id` and `category_id`.
    *   When unchecked, delete the mapping row.

### 3.2. Customer Onboarding: Booking Flow
Align the customer's purchase panel in [book-flow.tsx](file:///D:/Ganesh/work/Urban-assist/apps/customer/app/(app)/book/[serviceId]/book-flow.tsx):
*   Verify that price quotes are displayed as flat rates.
*   Confirm that the billing details list reads directly from the category metadata.

---

## 4. Testing & Verification Plan

1.  **Database Reset:**
    ```powershell
    supabase db reset
    ```
2.  **Verify Seed Data:** Confirm `service_categories` contains the new `price_pence` and `duration_mins` fields.
3.  **Onboard a Provider:**
    *   Register a provider via `http://localhost:3001/login`.
    *   Upload verification documents.
    *   Open `http://localhost:3001/onboarding/services` and ensure categories are added using the simple toggle list without pricing fields.
4.  **Create a Customer Booking:**
    *   Log in to `http://localhost:3000`.
    *   Confirm bookings are quoted using the flat platform rate.
    *   Submit a booking and ensure the matching engine successfully assigns the provider to the booking.
