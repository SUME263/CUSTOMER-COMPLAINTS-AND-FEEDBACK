# Customer Complaints and Feedback Handling System
A full-stack prototype developed for the **COMP1682 Computing Project**. The system provides a structured web-based platform for customers to submit and track complaints, while authorised staff manage cases through assignment, status updates, case notes, notifications, and reporting.

The prototype is designed around a financial institution serving civil servants and defence force personnel in Zambia.

## Project Overview
The Customer Complaints and Feedback Handling System supports the complete complaint-handling workflow:

Customer submits complaint
        ↓
Complaint receives reference number
        ↓
Assigner / Monitor reviews complaint
        ↓
Complaint assigned to staff member
        ↓
Staff reviews and handles complaint
        ↓
Staff updates status and adds case notes
        ↓
Assigner monitors progress
        ↓
Complaint resolved / closed
        ↓
Customer can track complaint status and updates
```

## Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript
* Responsive web interface

### Backend

* Node.js
* Express.js
* SQLite
* JWT authentication
* Role-based access control

### Database

The system uses SQLite with key entities including:

* Users
* Complaints
* Complaint logs
* Notifications
* Notification settings

## System Roles

The system currently supports three main roles.

| Role                   | Main Responsibilities                                               |
| ---------------------- | ------------------------------------------------------------------- |
| **Customer**           | Submit complaints and track complaint progress                      |
| **Staff**              | Handle assigned complaints, update statuses and add case notes      |
| **Assigner / Monitor** | Monitor the complaint queue and assign/reassign complaints to staff |
| **Administrator**      | Manage users, system settings, reports and administrative functions |

## Implemented Features

### Customer

* Submit a complaint without creating an account
* Provide:

  * Full name
  * NRC number
  * Phone number
  * Email address
  * Complaint category
  * Complaint description
* Receive a unique complaint reference number
* Track a complaint using its reference number
* View complaint status and customer-facing updates

### Staff

* Secure staff login
* View the complaint queue
* Filter complaints
* View assigned complaints through **My Assigned Cases**
* View customer details:

  * Name
  * NRC number
  * Phone
  * Email
* View complaint description
* View assigned staff member
* Update complaint status
* Add customer-facing case notes
* View complete case history
* Receive assignment notifications
* Mark notifications as read
* Configure notification preferences

Staff members cannot assign or reassign complaints.

### Assigner / Monitor

* Secure login
* View the overall complaint queue
* Filter complaints by:

  * Status
  * Category
  * Assignment
* View complete complaint details
* View customer contact information
* View complaint descriptions
* View assigned staff member
* View case history
* Assign complaints to active staff members
* Reassign complaints to another staff member
* Monitor complaint progress
* Receive system notifications
* Configure notification preferences

The Assigner / Monitor role does not update complaint statuses or post customer-facing case notes.

### Administrator

* Administrator authentication
* Compliance overview
* Complaint reporting
* User account management
* Activate and suspend staff accounts
* System settings
* Access to the complaint management workflow

## Complaint Lifecycle

Complaints follow the following status workflow:

```text
Open
  ↓
In Progress
  ↓
Resolved
  ↓
Closed
```

Status changes are recorded in the complaint history.

Each complaint can contain multiple case-history entries recording actions and notes associated with the complaint.

## Assignment Workflow

Assignment is separated from complaint handling.

```text
Assigner / Administrator
          ↓
Select complaint
          ↓
Select active staff member
          ↓
Assign / Reassign
          ↓
Staff receives notification
          ↓
Staff handles complaint
```

Staff members do not have permission to assign or reassign complaints.

## Notifications

The notification system currently supports:

* Complaint assignment notifications
* Unread notification count
* Notification sidebar indicator
* Notification listing
* Mark notification as read
* Role-based notification access
* Notification preferences

When an Assigner or Administrator assigns a complaint to a staff member, the assigned staff member receives an in-system notification.

## Security and Access Control

The backend uses JWT-based authentication and role-based authorisation.

Access to protected functionality is controlled by role.

Examples:

* Staff cannot assign complaints.
* Staff cannot access the staff-assignee list.
* Assigner users cannot update complaint statuses.
* Assigner users can assign and reassign complaints.
* Administrator users have administrative privileges.

Unauthorised API requests are rejected by the backend rather than relying only on frontend restrictions.

## Project Structure

```text
CUSTOMER-COMPLAINTS-AND-FEEDBACK/
│
├── frontend/
│   ├── *.html
│   ├── css/
│   └── js/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── ...
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## Running the Project

### 1. Start the Backend

Open a terminal in the project directory:

```powershell
cd backend
```

Install dependencies:

```powershell
npm install
```

Create the environment file from the example:

```powershell
cp .env.example .env
```

Seed the database:

```powershell
npm run seed
```

Start the backend:

```powershell
npm start
```

The API runs on:

```text
http://localhost:4000
```

### 2. Start the Frontend

Open another terminal:

```powershell
cd frontend
```

Serve the frontend using a static server:

```powershell
npx serve .
```

Alternatively:

```powershell
python -m http.server 5500
```

Open the URL provided by the static server.

The frontend API configuration is located in:

```text
frontend/js/api.js
```

The API base URL should point to the backend:

```text
http://localhost:4000/api
```

## Demo Accounts

The seed data creates demonstration accounts for testing the different roles.

| Role               | Example Account |
| ------------------ | --------------- |
| Staff              | B. Tembo        |
| Staff              | C. Zulu         |
| Assigner / Monitor | A. Phiri        |
| Administrator      | S. Mwape        |

Passwords are defined in the project's seed data and should not be committed as production credentials.

## Testing Completed

The following workflows have been tested during development:

* Customer complaint submission
* NRC-based customer identification
* Complaint tracking
* Staff login
* Staff complaint queue
* My Assigned Cases
* Customer contact information display
* Staff status updates
* Staff case notes
* Case history
* Assigner complaint monitoring
* Complaint assignment
* Complaint reassignment
* Assignment notifications
* Unread notification count
* Marking notifications as read
* Role-based access restrictions
* Administrator functions

## Current Development Status

### Completed

* Customer complaint submission
* NRC identification
* Complaint tracking
* Staff complaint management
* My Assigned Cases
* Assigner / Monitor role
* Complaint assignment and reassignment
* Case history
* In-system notifications
* Notification settings
* Role-based access control
* Administrative user management
* Reports and compliance overview
* Core end-to-end workflow testing

### Remaining Development Work

The following areas remain part of the development process:

* UI and layout refinement
* Mobile responsiveness review
* Cross-page visual consistency
* Code cleanup and documentation
* Additional testing and user acceptance testing
* Final project documentation and evaluation

## Academic Context

This project was developed as part of the **COMP1682 Computing Project**.

The system demonstrates the application of:

* Full-stack web development
* Database design
* REST API development
* Authentication and authorisation
* Role-based access control
* Complaint lifecycle management
* Notification systems
* User interface design
* Software testing
