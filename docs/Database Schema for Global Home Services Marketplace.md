# Database Schema for Global Home Services Marketplace

This document outlines the database schema for a global home services marketplace, leveraging a hybrid approach with **Supabase (PostgreSQL)** for relational data and **Firebase (Firestore/Realtime Database)** for non-relational, real-time data needs.

## 1. Supabase (PostgreSQL) - Relational Schema

Supabase will host the core relational data, ensuring data integrity, complex querying capabilities, and robust security through PostgreSQL. This includes user profiles, service provider details, service catalog, booking management, payment records, and review history.

### 1.1. `users` Table
Stores information about customers.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the user.                  |
| `auth_id`          | `UUID`            | `UNIQUE`, `NOT NULL`                          | Foreign key to Supabase Auth user ID.            |
| `first_name`       | `VARCHAR(100)`    | `NOT NULL`                                    | User's first name.                               |
| `last_name`        | `VARCHAR(100)`    | `NOT NULL`                                    | User's last name.                                |
| `email`            | `VARCHAR(255)`    | `UNIQUE`, `NOT NULL`                          | User's email address.                            |
| `phone_number`     | `VARCHAR(20)`     | `UNIQUE`                                      | User's phone number.                             |
| `profile_picture_url`| `TEXT`            |                                               | URL to user's profile picture.                   |
| `default_address_id`| `UUID`            | `FOREIGN KEY` references `addresses(id)`      | Default address for the user.                    |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of user creation.                      |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |
| `preferences`      | `JSONB`           |                                               | JSON object for user preferences (e.g., preferred service times, professional gender). |

### 1.2. `service_providers` Table
Stores information about service professionals.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the service provider.      |
| `auth_id`          | `UUID`            | `UNIQUE`, `NOT NULL`                          | Foreign key to Supabase Auth user ID.            |
| `first_name`       | `VARCHAR(100)`    | `NOT NULL`                                    | Provider's first name.                           |
| `last_name`        | `VARCHAR(100)`    | `NOT NULL`                                    | Provider's last name.                            |
| `email`            | `VARCHAR(255)`    | `UNIQUE`, `NOT NULL`                          | Provider's email address.                        |
| `phone_number`     | `VARCHAR(20)`     | `UNIQUE`                                      | Provider's phone number.                         |
| `profile_picture_url`| `TEXT`            |                                               | URL to provider's profile picture.               |
| `bio`              | `TEXT`            |                                               | Short biography of the provider.                 |
| `average_rating`   | `NUMERIC(2,1)`    | `DEFAULT 0.0`                                 | Average rating from customers.                   |
| `total_reviews`    | `INT`             | `DEFAULT 0`                                   | Total number of reviews received.                |
| `is_verified`      | `BOOLEAN`         | `DEFAULT FALSE`                               | Indicates if the provider has passed verification. |
| `status`           | `VARCHAR(50)`     | `DEFAULT 'pending'`, `NOT NULL`               | Current status (e.g., 'pending', 'active', 'inactive', 'suspended'). |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of provider creation.                  |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |
| `geo_fences`       | `JSONB`           |                                               | JSON array of preferred work zones (e.g., postal codes, neighborhood IDs). |
| `skills`           | `JSONB`           |                                               | JSON array of skills and sub-skills.             |
| `certifications`   | `JSONB`           |                                               | JSON array of certifications.                    |

### 1.3. `addresses` Table
Stores physical addresses for users and service locations.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the address.               |
| `user_id`          | `UUID`            | `FOREIGN KEY` references `users(id)`          | User associated with this address.               |
| `address_line1`    | `VARCHAR(255)`    | `NOT NULL`                                    | Street address line 1.                           |
| `address_line2`    | `VARCHAR(255)`    |                                               | Street address line 2.                           |
| `city`             | `VARCHAR(100)`    | `NOT NULL`                                    | City.                                            |
| `state_province`   | `VARCHAR(100)`    | `NOT NULL`                                    | State or province.                               |
| `postal_code`      | `VARCHAR(20)`     | `NOT NULL`                                    | Postal code.                                     |
| `country`          | `VARCHAR(100)`    | `NOT NULL`                                    | Country.                                         |
| `latitude`         | `NUMERIC(10,7)`   |                                               | Latitude coordinate.                             |
| `longitude`        | `NUMERIC(10,7)`   |                                               | Longitude coordinate.                            |
| `is_default`       | `BOOLEAN`         | `DEFAULT FALSE`                               | Indicates if this is the user's default address. |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of address creation.                   |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |

### 1.4. `services` Table
Defines the types of services offered on the platform.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the service.               |
| `name`             | `VARCHAR(255)`    | `UNIQUE`, `NOT NULL`                          | Name of the service (e.g., 'Plumbing Repair').   |
| `description`      | `TEXT`            |                                               | Detailed description of the service.             |
| `category_id`      | `UUID`            | `FOREIGN KEY` references `service_categories(id)`, `NOT NULL` | Category the service belongs to.                 |
| `base_price`       | `NUMERIC(10,2)`   | `NOT NULL`                                    | Base price for the service.                      |
| `pricing_model`    | `VARCHAR(50)`     | `NOT NULL`                                    | Pricing model (e.g., 'fixed', 'hourly', 'quote'). |
| `estimated_duration_min`| `INT`             |                                               | Estimated minimum duration in minutes.           |
| `estimated_duration_max`| `INT`             |                                               | Estimated maximum duration in minutes.           |
| `icon_url`         | `TEXT`            |                                               | URL to service icon.                             |
| `is_active`        | `BOOLEAN`         | `DEFAULT TRUE`                                | Whether the service is active on the platform.   |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of service creation.                   |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |

### 1.5. `service_categories` Table
Organizes services into categories.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the category.              |
| `name`             | `VARCHAR(255)`    | `UNIQUE`, `NOT NULL`                          | Name of the category (e.g., 'Home Cleaning').    |
| `description`      | `TEXT`            |                                               | Description of the category.                     |
| `parent_category_id`| `UUID`            | `FOREIGN KEY` references `service_categories(id)` | For hierarchical categories.                     |
| `icon_url`         | `TEXT`            |                                               | URL to category icon.                            |
| `is_active`        | `BOOLEAN`         | `DEFAULT TRUE`                                | Whether the category is active.                  |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of category creation.                  |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |

### 1.6. `provider_services` Table
Links service providers to the services they offer, including their specific pricing and availability.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the provider-service link. |
| `provider_id`      | `UUID`            | `FOREIGN KEY` references `service_providers(id)`, `NOT NULL` | Service provider ID.                             |
| `service_id`       | `UUID`            | `FOREIGN KEY` references `services(id)`, `NOT NULL` | Service ID.                                      |
| `price`            | `NUMERIC(10,2)`   |                                               | Provider's specific price for this service.      |
| `is_available`     | `BOOLEAN`         | `DEFAULT TRUE`                                | Whether the provider currently offers this service. |
| `custom_description`| `TEXT`            |                                               | Provider's custom description for the service.   |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of record creation.                    |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |
| `UNIQUE (provider_id, service_id)` |   |                                               | Ensures a provider offers a service only once.   |

### 1.7. `bookings` Table
Manages service appointments.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the booking.               |
| `user_id`          | `UUID`            | `FOREIGN KEY` references `users(id)`, `NOT NULL` | Customer who made the booking.                   |
| `provider_id`      | `UUID`            | `FOREIGN KEY` references `service_providers(id)` | Service provider assigned to the booking.        |
| `service_id`       | `UUID`            | `FOREIGN KEY` references `services(id)`, `NOT NULL` | Service booked.                                  |
| `address_id`       | `UUID`            | `FOREIGN KEY` references `addresses(id)`, `NOT NULL` | Service location.                                |
| `scheduled_start_time`| `TIMESTAMP WITH TIME ZONE` | `NOT NULL`                                    | Planned start time of the service.               |
| `scheduled_end_time`| `TIMESTAMP WITH TIME ZONE` | `NOT NULL`                                    | Planned end time of the service.                 |
| `actual_start_time`| `TIMESTAMP WITH TIME ZONE` |                                               | Actual start time of the service.                |
| `actual_end_time`  | `TIMESTAMP WITH TIME ZONE` |                                               | Actual end time of the service.                  |
| `status`           | `VARCHAR(50)`     | `NOT NULL`                                    | Booking status (e.g., 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'). |
| `total_amount`     | `NUMERIC(10,2)`   | `NOT NULL`                                    | Total amount charged for the service.            |
| `currency`         | `VARCHAR(3)`      | `NOT NULL`                                    | Currency code (e.g., 'USD', 'INR').              |
| `notes`            | `TEXT`            |                                               | Any special instructions or notes from the user. |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of booking creation.                   |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |

### 1.8. `payments` Table
Records all payment transactions.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the payment.               |
| `booking_id`       | `UUID`            | `FOREIGN KEY` references `bookings(id)`, `UNIQUE`, `NOT NULL` | Associated booking ID.                           |
| `user_id`          | `UUID`            | `FOREIGN KEY` references `users(id)`, `NOT NULL` | Customer who made the payment.                   |
| `provider_id`      | `UUID`            | `FOREIGN KEY` references `service_providers(id)` | Provider receiving payment (for payouts).        |
| `amount`           | `NUMERIC(10,2)`   | `NOT NULL`                                    | Amount of the payment.                           |
| `currency`         | `VARCHAR(3)`      | `NOT NULL`                                    | Currency code.                                   |
| `status`           | `VARCHAR(50)`     | `NOT NULL`                                    | Payment status (e.g., 'pending', 'completed', 'failed', 'refunded'). |
| `payment_method`   | `VARCHAR(50)`     |                                               | Method used for payment (e.g., 'credit_card', 'wallet'). |
| `transaction_id`   | `VARCHAR(255)`    | `UNIQUE`                                      | External payment gateway transaction ID.         |
| `platform_fee`     | `NUMERIC(10,2)`   | `DEFAULT 0.00`                                | Fee taken by the platform.                       |
| `provider_payout`  | `NUMERIC(10,2)`   | `DEFAULT 0.00`                                | Amount paid out to the provider.                 |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of payment creation.                   |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |

### 1.9. `reviews` Table
Stores customer reviews and ratings for service providers.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the review.                |
| `booking_id`       | `UUID`            | `FOREIGN KEY` references `bookings(id)`, `UNIQUE`, `NOT NULL` | Associated booking ID.                           |
| `user_id`          | `UUID`            | `FOREIGN KEY` references `users(id)`, `NOT NULL` | Customer who wrote the review.                   |
| `provider_id`      | `UUID`            | `FOREIGN KEY` references `service_providers(id)`, `NOT NULL` | Service provider being reviewed.                 |
| `rating`           | `INT`             | `NOT NULL`, `CHECK (rating >= 1 AND rating <= 5)` | Rating from 1 to 5 stars.                        |
| `comment`          | `TEXT`            |                                               | Textual comment from the customer.               |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of review creation.                    |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |

### 1.10. `provider_availability` Table
Manages the schedule and availability of service providers.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the availability slot.     |
| `provider_id`      | `UUID`            | `FOREIGN KEY` references `service_providers(id)`, `NOT NULL` | Service provider ID.                             |
| `start_time`       | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`                                    | Start time of the availability slot.             |
| `end_time`         | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`                                    | End time of the availability slot.               |
| `is_available`     | `BOOLEAN`         | `DEFAULT TRUE`                                | Whether the provider is available during this slot. |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of record creation.                    |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |

### 1.11. `admin_users` Table
Stores information about platform administrators.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the admin user.            |
| `auth_id`          | `UUID`            | `UNIQUE`, `NOT NULL`                          | Foreign key to Supabase Auth user ID.            |
| `first_name`       | `VARCHAR(100)`    | `NOT NULL`                                    | Admin's first name.                              |
| `last_name`        | `VARCHAR(100)`    | `NOT NULL`                                    | Admin's last name.                               |
| `email`            | `VARCHAR(255)`    | `UNIQUE`, `NOT NULL`                          | Admin's email address.                           |
| `role`             | `VARCHAR(50)`     | `NOT NULL`                                    | Role of the admin (e.g., 'super_admin', 'operations', 'support'). |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of admin creation.                     |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |

### 1.12. `settings` Table
Stores global platform settings and configurations.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `key`              | `VARCHAR(255)`    | `PRIMARY KEY`, `NOT NULL`                     | Setting key (e.g., 'platform_commission_rate').  |
| `value`            | `TEXT`            |                                               | Setting value.                                   |
| `type`             | `VARCHAR(50)`     | `NOT NULL`                                    | Data type of the setting (e.g., 'numeric', 'string', 'json'). |
| `description`      | `TEXT`            |                                               | Description of the setting.                      |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |

### 1.13. `notifications` Table
Stores notifications for users and providers.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the notification.          |
| `recipient_id`     | `UUID`            | `NOT NULL`                                    | ID of the user or provider receiving the notification. |
| `recipient_type`   | `VARCHAR(50)`     | `NOT NULL`                                    | Type of recipient ('user' or 'provider').        |
| `title`            | `VARCHAR(255)`    | `NOT NULL`                                    | Notification title.                              |
| `message`          | `TEXT`            | `NOT NULL`                                    | Notification message.                            |
| `type`             | `VARCHAR(50)`     |                                               | Type of notification (e.g., 'booking_update', 'payment_received', 'promotion'). |
| `read`             | `BOOLEAN`         | `DEFAULT FALSE`                               | Whether the notification has been read.          |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of notification creation.              |

### 1.14. `disputes` Table
Manages disputes between users and providers.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the dispute.               |
| `booking_id`       | `UUID`            | `FOREIGN KEY` references `bookings(id)`, `UNIQUE`, `NOT NULL` | Associated booking ID.                           |
| `reported_by_user_id`| `UUID`            | `FOREIGN KEY` references `users(id)`          | User who reported the dispute.                   |
| `reported_by_provider_id`| `UUID`            | `FOREIGN KEY` references `service_providers(id)` | Provider who reported the dispute.               |
| `reason`           | `TEXT`            | `NOT NULL`                                    | Reason for the dispute.                          |
| `status`           | `VARCHAR(50)`     | `DEFAULT 'open'`, `NOT NULL`                  | Dispute status (e.g., 'open', 'in_review', 'resolved', 'closed'). |
| `resolution`       | `TEXT`            |                                               | Outcome of the dispute.                          |
| `resolved_by_admin_id`| `UUID`            | `FOREIGN KEY` references `admin_users(id)`    | Admin who resolved the dispute.                  |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of dispute creation.                   |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |

### 1.15. `promotions` Table
Manages promotional offers and discounts.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the promotion.             |
| `code`             | `VARCHAR(50)`     | `UNIQUE`                                      | Promotional code.                                |
| `description`      | `TEXT`            |                                               | Description of the promotion.                    |
| `discount_type`    | `VARCHAR(50)`     | `NOT NULL`                                    | Type of discount (e.g., 'percentage', 'fixed_amount'). |
| `discount_value`   | `NUMERIC(10,2)`   | `NOT NULL`                                    | Value of the discount.                           |
| `min_order_amount` | `NUMERIC(10,2)`   |                                               | Minimum order amount to apply promotion.         |
| `max_discount_amount`| `NUMERIC(10,2)`   |                                               | Maximum discount amount.                         |
| `start_date`       | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`                                    | Start date of the promotion.                     |
| `end_date`         | `TIMESTAMP WITH TIME ZONE` | `NOT NULL`                                    | End date of the promotion.                       |
| `usage_limit`      | `INT`             |                                               | Total number of times the promotion can be used. |
| `per_user_limit`   | `INT`             |                                               | Number of times a single user can use the promotion. |
| `is_active`        | `BOOLEAN`         | `DEFAULT TRUE`                                | Whether the promotion is active.                 |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of promotion creation.                 |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |

### 1.16. `user_promotions` Table
Tracks promotion usage by users.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the user promotion record. |
| `user_id`          | `UUID`            | `FOREIGN KEY` references `users(id)`, `NOT NULL` | User ID.                                         |
| `promotion_id`     | `UUID`            | `FOREIGN KEY` references `promotions(id)`, `NOT NULL` | Promotion ID.                                    |
| `usage_count`      | `INT`             | `DEFAULT 0`                                   | Number of times the user has used this promotion. |
| `last_used_at`     | `TIMESTAMP WITH TIME ZONE` |                                               | Timestamp of last usage.                         |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of record creation.                    |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |
| `UNIQUE (user_id, promotion_id)` |   |                                               | Ensures a user has one record per promotion.     |

### 1.17. `provider_skills` Table
Detailed mapping of provider skills and their verification status.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the provider skill.        |
| `provider_id`      | `UUID`            | `FOREIGN KEY` references `service_providers(id)`, `NOT NULL` | Service provider ID.                             |
| `skill_name`       | `VARCHAR(255)`    | `NOT NULL`                                    | Name of the skill (e.g., 'AC Repair (Split)').   |
| `is_verified`      | `BOOLEAN`         | `DEFAULT FALSE`                               | Whether the skill has been verified.             |
| `verification_date`| `DATE`            |                                               | Date of skill verification.                      |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of record creation.                    |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |
| `UNIQUE (provider_id, skill_name)` |   |                                               | Ensures a provider has one record per skill.     |

### 1.18. `provider_certifications` Table
Detailed mapping of provider certifications and their validity.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the provider certification. |
| `provider_id`      | `UUID`            | `FOREIGN KEY` references `service_providers(id)`, `NOT NULL` | Service provider ID.                             |
| `certification_name`| `VARCHAR(255)`    | `NOT NULL`                                    | Name of the certification.                       |
| `issuing_authority`| `VARCHAR(255)`    |                                               | Authority that issued the certification.         |
| `issue_date`       | `DATE`            |                                               | Date the certification was issued.               |
| `expiry_date`      | `DATE`            |                                               | Date the certification expires.                  |
| `document_url`     | `TEXT`            |                                               | URL to the certification document.               |
| `is_verified`      | `BOOLEAN`         | `DEFAULT FALSE`                               | Whether the certification has been verified.     |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of record creation.                    |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |
| `UNIQUE (provider_id, certification_name)` |   |                                               | Ensures a provider has one record per certification. |

### 1.19. `geo_fences` Table
Stores geographical boundaries for service areas.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the geo-fence.             |
| `name`             | `VARCHAR(255)`    | `NOT NULL`                                    | Name of the geo-fence (e.g., 'Downtown NYC').    |
| `polygon_data`     | `GEOMETRY(Polygon, 4326)` | `NOT NULL`                                    | Geographical polygon data (PostGIS).             |
| `country_code`     | `VARCHAR(2)`      | `NOT NULL`                                    | ISO 3166-1 alpha-2 country code.                 |
| `city`             | `VARCHAR(100)`    |                                               | City associated with the geo-fence.              |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of geo-fence creation.                 |
| `updated_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of last update.                        |

### 1.20. `provider_geo_fences` Table
Links service providers to their preferred geo-fences.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the provider-geo-fence link. |
| `provider_id`      | `UUID`            | `FOREIGN KEY` references `service_providers(id)`, `NOT NULL` | Service provider ID.                             |
| `geo_fence_id`     | `UUID`            | `FOREIGN KEY` references `geo_fences(id)`, `NOT NULL` | Geo-fence ID.                                    |
| `created_at`       | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of record creation.                    |
| `UNIQUE (provider_id, geo_fence_id)` |   |                                               | Ensures a provider has one record per geo-fence. |

### 1.21. `ml_model_performance` Table
Tracks the performance metrics of machine learning models.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the performance record.    |
| `model_name`       | `VARCHAR(255)`    | `NOT NULL`                                    | Name of the ML model (e.g., 'JobDurationPrediction'). |
| `metric_name`      | `VARCHAR(255)`    | `NOT NULL`                                    | Name of the performance metric (e.g., 'MAE', 'Accuracy'). |
| `metric_value`     | `NUMERIC(10,4)`   | `NOT NULL`                                    | Value of the performance metric.                 |
| `timestamp`        | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp when the metric was recorded.          |
| `version`          | `VARCHAR(50)`     |                                               | Version of the ML model.                         |
| `notes`            | `TEXT`            |                                               | Any additional notes or context.                 |

### 1.22. `dispatch_engine_logs` Table
Logs events and decisions made by the dispatch engine.

| Column Name        | Data Type         | Constraints                                   | Description                                      |
|--------------------|-------------------|-----------------------------------------------|--------------------------------------------------|
| `id`               | `UUID`            | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`    | Unique identifier for the log entry.             |
| `booking_id`       | `UUID`            | `FOREIGN KEY` references `bookings(id)`       | Associated booking ID.                           |
| `event_type`       | `VARCHAR(100)`    | `NOT NULL`                                    | Type of event (e.g., 'lead_broadcast', 'provider_accepted', 'auto_assigned'). |
| `event_details`    | `JSONB`           |                                               | JSON object with details of the event (e.g., list of providers broadcasted, match scores). |
| `timestamp`        | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP`                   | Timestamp of the event.                          |


## 2. Firebase (Firestore/Realtime Database) - Non-Relational Schema

Firebase will be used for data that requires real-time updates, flexible schema, and high scalability, such as chat messages, real-time location tracking, and dynamic user/provider states. We will primarily use Firestore for its structured document model and real-time capabilities.

### 2.1. `chats` Collection (Firestore)
Stores real-time chat messages between users and providers.

| Field Name         | Data Type         | Description                                      |
|--------------------|-------------------|--------------------------------------------------|
| `id`               | `string`          | Unique identifier for the chat document.         |
| `booking_id`       | `string`          | Reference to the associated Supabase booking ID. |
| `participants`     | `array<string>`   | Array of user_id and provider_id.                |
| `created_at`       | `timestamp`       | Timestamp of chat creation.                      |
| `last_message_at`  | `timestamp`       | Timestamp of the last message in the chat.       |

#### 2.1.1. `messages` Sub-collection (under each `chat` document)

| Field Name         | Data Type         | Description                                      |
|--------------------|-------------------|--------------------------------------------------|
| `id`               | `string`          | Unique identifier for the message.               |
| `chat_id`          | `string`          | Parent chat document ID.                         |
| `sender_id`        | `string`          | ID of the sender (user or provider).             |
| `sender_type`      | `string`          | Type of sender (‘user’ or ‘provider’).        |
| `text`             | `string`          | Content of the message.                          |
| `image_url`        | `string`          | Optional: URL to an image attachment.            |
| `sent_at`          | `timestamp`       | Timestamp when the message was sent.             |
| `read_by`          | `array<string>`   | Array of participant IDs who have read the message. |

### 2.2. `realtime_locations` Collection (Firestore)
Stores real-time location updates for active service providers during a job.

| Field Name         | Data Type         | Description                                      |
|--------------------|-------------------|--------------------------------------------------|
| `provider_id`      | `string`          | Unique identifier for the service provider.      |
| `booking_id`       | `string`          | Current active booking ID for the provider.      |
| `latitude`         | `number`          | Current latitude of the provider.                |
| `longitude`        | `number`          | Current longitude of the provider.               |
| `timestamp`        | `timestamp`       | Timestamp of the location update.                |
| `speed`            | `number`          | Optional: Current speed of the provider.         |

### 2.3. `provider_status` Collection (Firestore)
Stores dynamic, real-time status of service providers (e.g., online/offline, current job).

| Field Name         | Data Type         | Description                                      |
|--------------------|-------------------|--------------------------------------------------|
| `provider_id`      | `string`          | Unique identifier for the service provider.      |
| `is_online`        | `boolean`         | Indicates if the provider is currently online.   |
| `current_booking_id`| `string`          | ID of the booking currently being serviced.      |
| `last_active_at`   | `timestamp`       | Timestamp of last activity.                      |
| `current_location` | `geopoint`        | Real-time location (latitude, longitude).        |

### 2.4. `notifications_queue` Collection (Firestore)
For immediate, real-time notifications that might not require full relational integrity or can be ephemeral.

| Field Name         | Data Type         | Description                                      |
|--------------------|-------------------|--------------------------------------------------|
| `id`               | `string`          | Unique identifier for the notification.          |
| `recipient_id`     | `string`          | ID of the user or provider receiving the notification. |
| `recipient_type`   | `string`          | Type of recipient (‘user’ or ‘provider’).        |
| `title`            | `string`          | Notification title.                              |
| `message`          | `string`          | Notification message.                            |
| `type`             | `string`          | Type of notification (e.g., ‘booking_update’, ‘chat_message’). |
| `created_at`       | `timestamp`       | Timestamp of notification creation.              |
| `is_read`          | `boolean`         | Whether the notification has been read.          |

### 2.5. `app_settings` Collection (Firestore)
Stores dynamic application settings that can be updated in real-time without a database migration.

| Field Name         | Data Type         | Description                                      |
|--------------------|-------------------|--------------------------------------------------|
| `setting_name`     | `string`          | Name of the setting (e.g., ‘surge_multiplier’, ‘maintenance_mode’). |
| `value`            | `any`             | Value of the setting (can be string, number, boolean, map). |
| `updated_at`       | `timestamp`       | Timestamp of last update.                        |

## 3. Data Synchronization and Cross-Platform Integration Strategies

To ensure data consistency and leverage the strengths of both Supabase and Firebase, a robust synchronization and integration strategy is essential. Supabase will serve as the primary source of truth for core business logic and relational data, while Firebase will handle real-time, high-velocity data.

### 3.1. Authentication Integration

**Supabase Auth** will be the primary authentication provider for the entire platform. Upon user registration or login via Supabase Auth, the `auth_id` (UUID) generated by Supabase will be consistently used as the identifier for users and service providers across both Supabase (e.g., `users.auth_id`, `service_providers.auth_id`) and Firebase (e.g., `chats.participants`, `realtime_locations.provider_id`). This ensures a single source of identity management.

### 3.2. Supabase to Firebase Synchronization (Relational to Non-Relational)

Changes in critical relational data within Supabase need to be reflected in Firebase for real-time features. This will primarily be achieved using **Supabase Webhooks** or **PostgreSQL Triggers** combined with **Supabase Edge Functions** or external serverless functions (e.g., Firebase Cloud Functions).

| Data Flow Trigger                               | Supabase Source Table       | Firebase Target Collection    | Purpose                                                              |
|-------------------------------------------------|-----------------------------|-------------------------------|----------------------------------------------------------------------|
| **New User/Provider Registration**              | `users`, `service_providers`| `user_profiles` (Firestore)   | Create basic user/provider profiles in Firebase for quick lookup and real-time status. |
| **Booking Status Updates**                      | `bookings`                  | `booking_updates` (Firestore) | Real-time updates on booking status (e.g., 'confirmed', 'in_progress') for user/provider apps. |
| **Provider Availability Changes**               | `provider_availability`     | `provider_status` (Firestore) | Reflect provider's online/offline status and current availability.   |
| **Service Catalog Updates**                     | `services`, `service_categories` | `service_catalog` (Firestore) | Provide real-time access to service listings for quick search and display. |
| **Admin Settings Changes**                      | `settings`                  | `app_settings` (Firestore)    | Propagate global app settings for dynamic client-side configuration. |

**Mechanism**: A PostgreSQL trigger on relevant Supabase tables will invoke a Supabase Edge Function (or a Firebase Cloud Function via a webhook). This function will then write the updated data to the corresponding Firebase collection.

### 3.3. Firebase to Supabase Synchronization (Non-Relational to Relational/Archival)

Real-time data generated in Firebase needs to be persisted or aggregated back into Supabase for analytical purposes, historical records, and maintaining the primary source of truth for certain entities.

| Data Flow Trigger                               | Firebase Source Collection  | Supabase Target Table         | Purpose                                                              |
|-------------------------------------------------|-----------------------------|-------------------------------|----------------------------------------------------------------------|
| **New Chat Messages**                           | `chats/messages`            | `chat_history` (Supabase)     | Archive chat conversations for historical records, compliance, and analytics. |
| **Real-time Location Updates**                  | `realtime_locations`        | `location_history` (Supabase) | Store historical location data for route optimization analysis and dispute resolution. |
| **Provider Status Changes**                     | `provider_status`           | `provider_logs` (Supabase)    | Log provider online/offline events and job assignments for performance analysis. |
| **Ephemeral Notifications**                     | `notifications_queue`       | (No direct sync)              | Ephemeral notifications are handled in Firebase and do not require long-term storage in Supabase. |

**Mechanism**: Firebase Cloud Functions will be primarily used to listen for changes in specific Firebase collections. Upon a relevant event (e.g., new chat message, location update), the Cloud Function will process the data and write it to the appropriate Supabase table via the Supabase API or a direct database connection (if secure and necessary).

### 3.4. Data Consistency and Conflict Resolution

*   **Eventual Consistency**: Given the distributed nature, the system will aim for eventual consistency. Critical operations (e.g., booking creation, payment processing) will be handled primarily by Supabase to ensure ACID properties.
*   **Idempotent Operations**: All synchronization operations will be designed to be idempotent to prevent data duplication or corruption in case of retries or network issues.
*   **Error Handling & Logging**: Robust error handling and logging will be implemented for all synchronization mechanisms to monitor data flow and quickly identify and resolve discrepancies.
*   **Data Validation**: Data validation will occur at both the client-side and server-side (Supabase Row Level Security, Firebase Security Rules, and Cloud Functions) to ensure data integrity before persistence.
