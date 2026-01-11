# Cost Manager – Microservices Backend

## Project Overview

This project is a **Node.js-based Microservices backend system** designed for managing users, costs, logs, and administrative metadata. Each service is implemented and deployed independently, following Microservices architecture principles, while sharing a single MongoDB Atlas cluster.

The system was built with scalability, separation of concerns, and observability in mind. It is suitable for academic projects as well as real-world backend service design.

---

## Services

The system consists of **four independent web services**:

1. **Users Service** – Manages users and user-related data.
2. **Costs Service** – Manages costs and generates monthly reports using the **Computed Design Pattern**.
3. **Admin (About) Service** – Provides administrative and system metadata endpoints.
4. **Logs Service** – Tracks and stores HTTP request logs across the system.

Each service:

* Runs as a **separate Node.js process**
* Is deployed independently on **Render**
* Connects to the same **MongoDB Atlas cluster**

---

## Architecture

* **Microservices Architecture**
* 4 independent Express applications
* Shared MongoDB Atlas database
* No tight coupling between services
* Each service can be deployed, scaled, and tested independently

```
Client
  │
  ├── Users Service
  ├── Costs Service
  ├── Admin Service
  └── Logs Service
        │
        └── MongoDB Atlas (Shared Cluster)
```

---

## Tech Stack

* **Node.js** – Runtime environment
* **Express.js** – Web framework
* **MongoDB Atlas** – Cloud database
* **Mongoose** – ODM for MongoDB
* **Pino** – High-performance logging (Logs Service)
* **Jest** – Testing framework

---

## API Endpoints

### Users Service

Base URL: `/users`

| Method | Endpoint     | Description       |
| ------ | ------------ | ----------------- |
| GET    | `/users`     | Get all users     |
| GET    | `/users/:id` | Get user by ID    |
| POST   | `/users`     | Create a new user |
| PUT    | `/users/:id` | Update user       |
| DELETE | `/users/:id` | Delete user       |

---

### Costs Service

Base URL: `/costs`

| Method | Endpoint         | Description                      |
| ------ | ---------------- | -------------------------------- |
| POST   | `/costs`         | Add a new cost entry             |
| GET    | `/costs`         | Get all costs                    |
| GET    | `/costs/monthly` | Get computed monthly cost report |

**Design Note:**

* Monthly reports are generated using the **Computed Design Pattern** rather than stored directly in the database.

---

### Admin (About) Service

Base URL: `/admin`

| Method | Endpoint       | Description                 |
| ------ | -------------- | --------------------------- |
| GET    | `/admin/about` | System and project metadata |

---

### Logs Service

Base URL: `/logs`

| Method | Endpoint | Description               |
| ------ | -------- | ------------------------- |
| GET    | `/logs`  | Retrieve stored HTTP logs |

**Logging Details:**

* Uses **Pino** middleware
* Logs every HTTP request
* Persists logs in MongoDB

---

## Installation and Setup

### Prerequisites

* Node.js (v18+ recommended)
* npm
* MongoDB Atlas cluster

---

### Environment Variables

Create a `.env` file in the root of each service:

```env
PORT=3000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/cost-manager
```

---

### Install Dependencies

From the root directory:

```bash
npm install
```

Repeat for each service if managed separately.

---

### Running Services Locally

Each service can be started independently:

```bash
node service.js
```

Or with nodemon:

```bash
npx nodemon service.js
```

---

### Running Tests

Tests are written using **Jest**:

```bash
npm test
```

Each service contains its own `*.test.js` files.

---

## Deployment

* Each service is deployed independently on **Render**
* Environment variables are configured per service
* All services connect to the same MongoDB Atlas cluster

---

## Notes

* The system follows best practices for service separation
* Logging is centralized via the Logs Service
* Monthly reports are computed dynamically for consistency

---

## Author

Cost Manager Backend Project Team  
Asynchronous Server-Side Development Course

