# Cost Manager – Microservices Backend

---

## Project Overview

This project is a Node.js-based Microservices backend system designed for managing users, costs, logs, and administrative metadata. Each service is implemented and deployed independently, following Microservices architecture principles, while sharing a single MongoDB Atlas cluster.

---

## Services

The system consists of four independent web services:

* **Users Service:** Manages users and user-related data.
* **Costs Service:** Manages costs and generates monthly reports using the **Computed Design Pattern**.
* **Admin (About) Service:** Provides administrative and system metadata.
* **Logs Service:** Tracks and stores HTTP request logs across the system using **Pino**.

---

## Architecture

**Microservices / Four-Processes Architecture**

This project follows a four-process architecture as required by the course specification. Each process is implemented as an independent Express application and deployed separately.

**Design Rationale:**
This architecture was chosen to improve scalability, separation of concerns, and independent development, testing, and deployment of each process.

* 4 independent Express applications (Users, Costs, Admin, Logs)
* Shared MongoDB Atlas database
* No tight coupling between services
* Each process can be deployed, scaled, and tested independently

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

## API Endpoints

### Users Service

**Base URL:** `https://cost-manager-restful-web-services-0y3y.onrender.com`

* `GET /api/users` – Get all users
* `GET /api/users/:id` – Get user details including total costs
* `POST /api/add` – Create a new user

---

### Costs Service

**Base URL:** `https://cost-manager-costs-service.onrender.com`

* `POST /api/add` – Add a new cost entry
* `GET /api/report` – Get computed monthly cost report
  **Query Parameters:** `id`, `year`, `month`

**Supported Cost Categories:**
food, health, housing, sports, education

**Computed Design Pattern:**
When a monthly report is requested for a past month, the report is cached and reused for future requests. Adding costs with dates that belong to the past is not allowed.

---

### Admin Service

**Base URL:** `https://cost-manager-admin-service.onrender.com`

* `GET /api/about` – System and developer metadata

**Developers Team Data:**
Developers information is not stored in the database and is either hardcoded or loaded from environment variables, as required.

---

### Logs Service

**Base URL:** `https://cost-manager-logs-service.onrender.com`

* `GET /api/logs` – Retrieve stored HTTP logs

**Logging Details:**

* All services use **Pino middleware** to log every incoming HTTP request
* Each request is persisted in MongoDB via the Logs Service
* Additional log entries are created when endpoints are accessed

---

## Tech Stack

* **Node.js** & **Express.js**
* **MongoDB Atlas** & **Mongoose**
* **Pino** (Logging)
* **Jest** & **Supertest** (Testing)

---

## Validation

All incoming requests are validated before being processed. Invalid requests return a JSON error object containing at least `id` and `message` properties.

---

## Installation and Setup

### Environment Variables

Each service requires a `.env` file with the following variable:

```
MONGODB_URI=your_mongodb_connection_string
```

---

### Running Services Locally

* **Users Service:** `node server.js`
* **Costs Service:** `node service.js`
* **Admin Service:** `node developer_service.js`
* **Logs Service:** `node logs_service.js`

---

## Testing

Run unit tests using Jest:

```
npm test
```

**Testing Scope:**

* Unit tests cover core REST API endpoints
* Tests validate expected HTTP status codes and JSON responses

---

## Author

Cost Manager Backend Project Team  
Asynchronous Server-Side Development Course
