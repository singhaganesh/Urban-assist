# Product Requirement Document (PRD): User-Side Web Application (V1)

## 1. Product Overview
The User-Side Web Application is the primary interface for customers to discover, book, and manage home services in the UK. The V1 focus is on providing a seamless, trust-inducing booking experience with a transparent manual-assignment model.

## 2. Target Audience
*   Homeowners and renters in the UK (initially London and South East).
*   Busy professionals seeking reliable, vetted home help.
*   Users who value fixed pricing and secure, easy booking.

## 3. Key Functional Requirements

### 3.1 Discovery & Search
*   **Search:** Keyword-based search for services (e.g., "Plumbing").
*   **Categories:** Browsing by primary categories (Cleaning, Electrical, etc.).
*   **Location Validation:** Postcode-based service availability check.

### 3.2 Booking Flow
*   **Service Selection:** Choose specific sub-services and quantities.
*   **Scheduling:** Select preferred date and time slots (Morning/Afternoon/Evening).
*   **Address Management:** Google Maps integrated address entry and saving.
*   **Job Details:** Text notes and photo upload for the professional.
*   **Price Estimation:** Real-time display of the estimated service fee.

### 3.3 Authentication & Profile
*   **Sign Up/Login:** Email/Password and Phone OTP verification.
*   **Profile Management:** Edit personal details and manage saved addresses.
*   **Payment Methods:** Securely add and manage Stripe payment cards.

### 3.4 Job Tracking & Management
*   **Dashboard:** Overview of upcoming and past bookings.
*   **Status Tracking:** Real-time status updates (Pending, Assigned, In-Progress, Completed).
*   **OTP for Task Start:** Display of a 4-digit code to be given to the professional.
*   **Completion & Payment:** Final payment trigger and invoice download.
*   **Reviews:** 5-star rating and text review system for completed jobs.

## 4. Non-Functional Requirements
*   **Performance:** Initial page load under 2 seconds.
*   **Security:** SSL/TLS encryption, secure Stripe integration, and GDPR compliance.
*   **Usability:** Mobile-responsive design for seamless booking on any device.

## 5. Success Metrics
*   **Conversion Rate:** Percentage of visitors who complete a booking.
*   **Customer Retention:** Percentage of users who rebook within 90 days.
*   **Average Rating:** Maintaining a 4.5+ star rating for services.
