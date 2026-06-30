# Overall Platform Product Requirement Document (PRD): Global Home Services Marketplace (V1)

## 1. Executive Summary
This document defines the overarching vision and requirements for the V1 launch of the Global Home Services Marketplace. The platform aims to connect UK-based customers with trusted home service professionals through a managed marketplace model. The V1 strategy utilizes a **Zero-Cost MVP** approach for the first 1-2 months, prioritizing manual operations and free-tier infrastructure to validate the market before scaling.

## 2. Core Strategic Pillars (V1)
*   **Manual Assignment Model:** All job matching is handled manually by administrators to ensure quality and build operational knowledge.
*   **Zero-Cost Infrastructure:** Maximizing free tiers of Supabase, Firebase, and Vercel to minimize initial burn.
*   **UK Market Focus:** Initially launching in London and the South East with 5 core service categories.
*   **Trust & Security:** Prioritizing vetting, secure Stripe payments, and OTP-based task verification.

## 3. The Three-App Ecosystem

| Application | Primary Purpose | Key User |
| :--- | :--- | :--- |
| **User Web App** | Service discovery, booking, and management. | Customers |
| **Provider Web App** | Job acceptance, task execution, and earnings. | Professionals |
| **Admin Panel** | Manual matching, vetting, and platform control. | Operations Team |

## 4. High-Level Feature Matrix

### 4.1 Customer Experience
*   Postcode-validated service search.
*   Multi-step booking with scheduling and photo uploads.
*   Secure Stripe payment and invoice management.
*   OTP verification to start tasks and review system for completion.

### 4.2 Professional Experience
*   Comprehensive onboarding and document-based vetting.
*   Manual job assignment alerts with "Accept/Reject" capability.
*   OTP-based task starting and real-time status updates.
*   Earnings tracking and payout history.

### 4.3 Operational Control
*   Manual job matching engine with provider filtering.
*   Centralized vetting hub for partner approvals.
*   Financial oversight of revenue, commissions, and refunds.
*   Service catalog and pricing management.

## 5. Technical Foundations
*   **Backend:** Node.js (V1) for rapid iteration and serverless efficiency.
*   **Frontend:** Next.js 14+ for a unified, high-performance web experience.
*   **Database:** Supabase (PostgreSQL) for relational data and RLS security.
*   **Real-time:** Firebase for live job status and chat.
*   **Payments:** Stripe for all financial transactions.

## 6. Roadmap & Success
*   **Phase 1 (Month 1-2):** Launch Zero-Cost MVP, validate traffic, and prove the manual matching model.
*   **Phase 2 (Month 3-6):** Scale operations, transition to paid tiers as needed, and refine the product based on user feedback.
*   **Success Metric:** Achieving a stable, high-quality transaction volume with positive customer and partner feedback.

This overall PRD serves as the master blueprint for the Global Home Services Marketplace, ensuring alignment across all development, design, and operational efforts.
