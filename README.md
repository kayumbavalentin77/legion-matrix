# Guardian Console

# MILITARY PERSONNEL & RESOURCE MANAGEMENT SYSTEM

Build a professional, modern, secure, responsive **Military Personnel & Resource Management System** for managing personnel, equipment, vehicles, training, medical records, administrative operations, documents, and reports.

The application should look like a professional enterprise/government management platform, with a clean military-inspired interface, but **do not implement offensive combat functionality, weapon targeting, attack planning, or real-time enemy targeting**.

## 1. TECHNOLOGY STACK

Use:

* React.js

* TypeScript

* Tailwind CSS

* shadcn/ui

* Lucide React icons

* Supabase for authentication and database

* PostgreSQL

* Recharts for dashboards and statistics

* Leaflet/OpenStreetMap only for non-tactical administrative location visualization

* Responsive design for desktop, tablet and mobile

The application should be production-quality, modular, maintainable and easy to extend.

---

# 2. APPLICATION LAYOUT

Create a professional dashboard layout containing:

### Left Sidebar

Logo:

**MILITARY MANAGEMENT SYSTEM**

Navigation:

* Dashboard

* Admin

  * Manage Users

  * Soldier Registry

  * Equipment Registry

  * Physical Fitness

  * Medical Records

  * Reports

* Operations

  * Operation Planning

  * Mission Files

  * Documents

  * Mission Map

  * GPS Coordinates

* Intelligence

  * Reports

  * Intelligence Files

  * Threat Analysis

  * Map

* Vehicle Management

  * Vehicle Registration

  * Vehicle Status

  * Vehicle Maintenance

  * Vehicle Tracking

  * Fault Reports

* Equipment Management

  * Weapons Registry

  * Ammunition Inventory

  * Communication Equipment

  * General Inventory

* Settings

At the bottom:

* User profile

* Notifications

* Help

* Logout

The sidebar must be collapsible.

---

# 3. LOGIN PAGE

Create a modern professional login page.

Fields:

* Username / Email

* Password

* Remember me

* Login button

Features:

* Show/hide password

* Forgot password

* Authentication error messages

* Loading state

* Secure authentication

* Role-based access control

Design:

Dark professional military-inspired background with subtle geometric patterns.

Do not make the design overly aggressive.

---

# 4. DASHBOARD

Create a highly professional dashboard.

Display summary cards:

* Total Personnel

* Active Personnel

* Vehicles

* Equipment Items

* Documents

* Pending Maintenance

* Training Status

* Medical Cases

Create charts:

### Personnel Statistics

Bar chart showing personnel by unit.

### Fitness Statistics

Pie/donut chart:

* Excellent

* Good

* Average

* Needs Improvement

### Vehicle Status

Show:

* Operational

* Under Maintenance

* Out of Service

### Equipment Inventory

Show:

* Available

* Issued

* Under Maintenance

* Missing

### Recent Activities

Timeline containing:

* New personnel registered

* Equipment issued

* Vehicle maintenance completed

* Document uploaded

* Report created

Add quick-action buttons:

* Add Soldier

* Register Vehicle

* Add Equipment

* Upload Document

* Create Report

---

# 5. SOLDIER REGISTRY

Create a complete personnel management module.

Table columns:

* Service Number

* Full Name

* Rank

* Unit

* Gender

* Date of Birth

* Phone

* Status

* Date Joined

* Actions

Actions:

* View

* Edit

* Delete

* Print

* Export

Add search and filters:

* Name

* Service Number

* Rank

* Unit

* Status

Soldier profile should contain tabs:

### Personal Information

* Full Name

* Service Number

* Date of Birth

* Gender

* Nationality

* Contact

### Service Information

* Rank

* Unit

* Position

* Date Joined

* Service Status

### Training

* Course

* Date

* Result

* Instructor

### Fitness

* Test Date

* Running

* Push-ups

* Sit-ups

* Score

* Fitness Category

### Documents

* ID documents

* Certificates

* Training documents

---

# 6. MANAGE USERS

Create user administration.

Fields:

* Name

* Username

* Email

* Role

* Department

* Status

* Last Login

Roles:

* Super Admin

* Administrator

* Personnel Officer

* Logistics Officer

* Medical Officer

* Vehicle Officer

* Equipment Officer

* Viewer

Implement Role-Based Access Control.

Users should only access modules permitted by their roles.

---

# 7. EQUIPMENT REGISTRY

Create equipment management.

Categories:

* Weapons Registry

* Communication Equipment

* Protective Equipment

* Technical Equipment

* General Equipment

For each item:

* Equipment ID

* Name

* Category

* Serial Number

* Quantity

* Condition

* Location/Unit

* Assigned To

* Date Acquired

* Status

Statuses:

* Available

* Issued

* Under Maintenance

* Damaged

* Lost

* Retired

Include:

* Search

* Filtering

* Pagination

* Add

* Edit

* View

* Delete

* Export CSV

* Print report

For weapons and ammunition, implement **inventory/accountability only**. Do not implement targeting, firing control, or operational weapon deployment.

---

# 8. PHYSICAL FITNESS

Create fitness management.

Features:

* Fitness test registration

* Soldier selection

* Test date

* Running result

* Push-ups

* Sit-ups

* Overall score

* Fitness category

Dashboard:

* Excellent

* Good

* Average

* Needs Improvement

Charts should show fitness trends over time.

---

# 9. MEDICAL RECORDS

Create a restricted medical records module.

Fields:

* Soldier

* Date

* Medical visit type

* Status

* Fitness restriction

* Return-to-duty date

* Medical notes

Use strict role permissions.

Only authorized medical personnel and administrators can access sensitive medical information.

Show medical statistics without exposing unnecessary personal details.

---

# 10. REPORTS

Create a professional reporting system.

Report categories:

* Personnel Report

* Equipment Report

* Vehicle Report

* Fitness Report

* Maintenance Report

* Inventory Report

* Training Report

* Medical Summary

Allow:

* Date filtering

* Unit filtering

* Category filtering

* Generate report

* Print

* Export CSV

* Export PDF

Create attractive printable report templates.

---

# 11. OPERATIONS / ADMINISTRATIVE PLANNING

Create an administrative planning module for recording and organizing missions/events.

Features:

* Create planning record

* Title

* Reference Number

* Unit

* Responsible Officer

* Start Date

* End Date

* Status

* Description

* Attached Documents

Statuses:

* Draft

* Pending Approval

* Approved

* Completed

* Archived

Do not implement attack planning, targeting, fire-control functions, or tactical recommendations.

---

# 12. MISSION FILES

Create document-based mission/event files.

Each file contains:

* Reference Number

* Title

* Unit

* Date

* Responsible Officer

* Status

* Description

* Attachments

Allow:

* Upload PDF

* Upload Word documents

* Upload images

* Download

* Preview

* Delete

* Search

* Filter

Create a professional document-management interface.

---

# 13. DOCUMENT MANAGEMENT

Create centralized document management.

Document fields:

* Document ID

* Title

* Category

* Author

* Unit

* Date

* Classification

* File

* Status

Classification examples:

* Public

* Internal

* Confidential

* Restricted

Implement access permissions according to user roles.

---

# 14. MAP MODULE

Create a map module for **administrative location visualization**.

Use:

* Leaflet

* OpenStreetMap

Features:

* Display unit locations

* Display vehicle administrative locations

* Display approved facility locations

* Search location

* Add location

* Latitude

* Longitude

Do not implement real-time enemy targeting, attack planning, fire-control, or tactical targeting.

For sensitive locations, use access controls and avoid exposing restricted data to unauthorized users.

---

# 15. INTELLIGENCE / SECURITY REPORTS

Create a security-information management module focused on reporting and analysis.

Sections:

### Security Reports

Fields:

* Report ID

* Date

* Source

* Location

* Category

* Description

* Reliability

* Status

* Attached Files

### Intelligence Files

Allow authorized users to:

* Upload files

* Categorize files

* Search files

* Filter files

* Archive files

### Threat Analysis

Create a dashboard for **high-level risk assessment**, not tactical targeting.

Display:

* Low Risk

* Medium Risk

* High Risk

* Critical

Use charts showing historical risk levels.

Do not generate tactical recommendations or targeting instructions.

---

# 16. VEHICLE MANAGEMENT

Create complete vehicle management.

### Vehicle Registration

Fields:

* Vehicle ID

* Registration Number

* Type

* Model

* Manufacturer

* Year

* Unit

* Driver

* Status

Statuses:

* Operational

* Maintenance

* Out of Service

* Reserved

### Vehicle Status

Dashboard showing vehicle availability.

### Vehicle Maintenance

Fields:

* Vehicle

* Maintenance Type

* Date

* Technician

* Cost

* Description

* Next Maintenance Date

* Status

### Vehicle Tracking

For privacy and safety, implement administrative location/status records rather than covert real-time tracking.

Show:

* Last recorded location

* Date

* Vehicle

* Status

### Fault Reports

Fields:

* Vehicle

* Fault Type

* Description

* Reported By

* Date

* Priority

* Status

---

# 17. AMMUNITION INVENTORY

Create an accountability-focused ammunition inventory module.

Fields:

* Item ID

* Type

* Batch Number

* Quantity

* Unit

* Storage Location

* Condition

* Expiry/Inspection Date

* Status

Functions:

* Add stock

* Issue stock

* Receive stock

* Adjust inventory

* View transaction history

* Generate inventory report

Every transaction must be logged.

Do not implement firing, targeting, or combat-use functionality.

---

# 18. COMMUNICATION EQUIPMENT

Manage communication equipment such as:

* Radios

* Batteries

* Antennas

* Chargers

* Headsets

* Accessories

Fields:

* Equipment ID

* Type

* Serial Number

* Condition

* Assigned Unit

* Assigned Personnel

* Status

* Maintenance Date

---

# 19. INVENTORY MANAGEMENT

Create general inventory.

Features:

* Item registration

* Stock-in

* Stock-out

* Transfers

* Current stock

* Minimum stock level

* Low-stock alerts

* Inventory history

Dashboard should show:

* Total Items

* Low Stock

* Out of Stock

* Recently Added

* Recently Issued

---

# 20. NOTIFICATIONS

Create notification system.

Notifications for:

* Low inventory

* Vehicle maintenance due

* Equipment maintenance due

* Expiring documents

* Pending approvals

* New reports

* New users

Show notification badge in the top navigation.

---

# 21. AUDIT LOG

Create a complete audit trail.

Record:

* User

* Action

* Module

* Record

* Date

* IP Address

* Description

Examples:

* User created

* Soldier updated

* Equipment issued

* Vehicle registered

* Document uploaded

* Report generated

Audit logs should be read-only for normal administrators.

---

# 22. SETTINGS

Create:

### General Settings

* Organization Name

* Logo

* Contact Information

* Time Zone

* Language

### User Settings

* Profile

* Password

* Notification preferences

### System Settings

* Roles

* Permissions

* Units

* Ranks

* Equipment Categories

* Vehicle Categories

---

# 23. DATABASE DESIGN

Create a normalized PostgreSQL/Supabase database.

Main tables:

* users

* roles

* permissions

* units

* soldiers

* soldier_documents

* fitness_records

* medical_records

* training_records

* equipment

* equipment_assignments

* ammunition_inventory

* ammunition_transactions

* vehicles

* vehicle_maintenance

* vehicle_faults

* vehicle_locations

* operations

* mission_files

* documents

* security_reports

* intelligence_files

* threat_assessments

* inventory

* inventory_transactions

* notifications

* audit_logs

* system_settings

Use UUID primary keys.

Use foreign keys and appropriate indexes.

Implement created_at and updated_at timestamps.

---

# 24. SECURITY

Implement:

* Supabase Authentication

* Row Level Security

* Role-Based Access Control

* Secure password handling

* Protected routes

* Session management

* Audit logging

* Input validation

* File upload restrictions

* Access control for sensitive records

Medical records and restricted documents must have stricter permissions.

Never expose sensitive information to unauthorized users.

---

# 25. UI/UX DESIGN

Use a modern professional interface.

Design requirements:

* Dark sidebar

* Clean white/light dashboard background

* Professional military-inspired accent colors

* Rounded cards

* Subtle shadows

* Clear typography

* Responsive tables

* Professional charts

* Status badges

* Modal forms

* Confirmation dialogs

* Toast notifications

Use icons from Lucide React.

Avoid excessive animations.

The interface must look like a real enterprise management application rather than a simple student template.

---

# 26. RESPONSIVE DESIGN

The application must work perfectly on:

* Desktop

* Laptop

* Tablet

* Android phone

On mobile:

* Sidebar becomes a drawer

* Tables become horizontally scrollable or card-based

* Dashboard cards stack vertically

* Forms become single-column

---

# 27. SEARCH AND FILTER SYSTEM

Every major module should have:

* Global search

* Module-specific search

* Filters

* Sorting

* Pagination

* Date range

* Status filters

Search should update results smoothly without reloading the entire application.

---

# 28. SAMPLE DATA

Create realistic demo data for development.

Include:

* 20+ soldiers

* Multiple ranks

* Multiple units

* 15+ equipment records

* 10+ vehicles

* Fitness records

* Maintenance records

* Documents

* Inventory records

* Reports

Clearly mark demo data as sample data.

---

# 29. DASHBOARD VISUALIZATION

Use Recharts to create:

* Personnel growth chart

* Equipment distribution chart

* Vehicle status chart

* Fitness statistics

* Maintenance trends

* Inventory levels

* Security risk trends

Charts should have legends, tooltips and responsive sizing.

---

# 30. FINAL REQUIREMENT

Build the application as a complete working system, not just a UI prototype.

Ensure:

* Navigation works

* Forms work

* CRUD operations work

* Authentication works

* Database relationships work

* Search works

* Filters work

* Reports work

* File uploads work

* Permissions work

* Audit logs work

* Dashboard statistics update from database

Create reusable components and clean folder architecture.

Use professional empty states, loading states, error states and success notifications throughout the application.

The final result should look like a **high-quality enterprise Military Personnel, Logistics & Resource Management System** suitable for demonstration, academic presentation, or further development.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://legion-matrix.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3ebb3f4f-73d9-4034-b791-420e1c2127e6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitLab and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
