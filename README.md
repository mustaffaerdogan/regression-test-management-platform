# 🧪 Regression Test Management Platform

A comprehensive SaaS platform for managing regression test suites, test cases, and test execution runs. Built with modern web technologies to provide a seamless testing workflow with AI integration and team collaboration.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Key Features](#-key-features)
- [Security](#-security)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🔐 Authentication & Profile
- JWT-based authentication with secure token management
- **User Profile Settings**: Dedicated page to update Name and Password
- Password hashing with bcrypt (10 salt rounds)
- Protected routes with middleware validation

### 📦 Regression Set Management
- Create, read, update, and delete regression sets
- Platform support: Web, iOS, Android, TV
- Team-scoped visibility with granular access control
- Team members can view and manage shared regression sets

### 👥 Team Collaboration & RBAC
- Create teams and invite members via secure invite codes
- **Member Management**: Admins can edit member roles (`Admin`, `QA Lead`, `Tester`, `Viewer`) or remove members
- Role-based access control for all team resources

### 🤖 AI Cases (Powered by LLM)
- **Jira Integration**: Automatically extract User Story and Acceptance Criteria from Jira task links
- Generate AI-backed test case suggestions based on requirements
- Normalized server-side output (max 3 test cases per request)
- Interactive selection and one-click regression set creation

### 📝 Test Case Management
- Full CRUD operations with rich fields (preconditions, steps, expected results)
- **CSV Bulk Import**: Import hundreds of test cases with duplicate detection
- Real-time validation and error reporting during import

### 🚀 Test Run Execution
- **Resume Capability**: Continue execution of in-progress runs from any device
- **Retest Logic**: Dedicated "Retest Failed & Skipped" feature to reset only problematic cases while preserving pass streaks
- **Per-Item Audit**: Every test case execution is tagged with the specific executor's identity
- **Excel Export**: Export professional test run reports with detailed results and execution logs
- Bulk mark remaining items as Pass/Fail/Skipped

### 📊 Dashboard & Analytics
- Overview cards with real-time pass/fail/skip rates
- Pass/Fail trend charts with configurable time ranges (7d to 365d)
- Platform distribution and module failure analytics
- Performance tracking to identify slow test cases

### 🎨 User Interface
- Modern, premium design with Tailwind CSS
- **Dynamic Status Badges**: Clearly color-coded results (Green: Pass, Red: Fail, Yellow: Skip)
- **Dark/Light Mode**: Full theme support with persistence
- Responsive, mobile-friendly layouts with sidebar navigation

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.x
- **Language**: TypeScript 5.x
- **Database**: MongoDB (Atlas) with Mongoose ODM
- **Integrations**: OpenAI API (for AI Cases), ExcelJS (for Exports)

### Frontend
- **Framework**: React 19.x
- **Build Tool**: Vite 7.x
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **State Management**: React Context API

## 📦 Prerequisites

Ensure you have the following installed:
- **Node.js** 18.17+
- **npm** 10+
- **MongoDB** (Local instance or **MongoDB Atlas** account)
- **OpenAI API Key** (Optional, for AI features)

## 🚀 Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/mustaffaerdogan/regression-test-management-platform.git
   cd regression-test-management-platform
   ```

2. **Install Dependencies**
   ```bash
   npm install && cd server && npm install && cd ../client && npm install
   ```

3. **Configure Environment Variables**
   - Copy `server/env.example` to `server/.env`
   - Copy `client/env.example` to `client/.env`

## ⚙️ Configuration

### Backend (`server/.env`)
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/db_name
JWT_SECRET=your-32-character-secret
OPENAI_API_KEY=your-key
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-token
```

### Frontend (`client/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## 🏃 Running the Application

### Development (Root)
```bash
npm run dev
```
Starts Backend at `5000` and Frontend at `5173`.

## 📚 API Documentation

### Authentication & Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login and get JWT |
| `PUT` | `/api/auth/profile` | Update profile (Name/Password) |

### Teams & Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/teams/:id/invite` | Invite via email |
| `PUT` | `/api/teams/:id/members/:userId/role` | Edit member role |

### Test Runs & Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/test-runs/:runId/retest` | Reset Fails/Skips for retest |
| `GET` | `/api/test-runs/:runId/export` | Export results to Excel |

## 🔒 Security
- **Data Protection**: Sensitive keys are never committed (enforced via `.gitignore`).
- **Audit Logs**: Every test execution step tracks the `executedBy` user ID.
- **RBAC**: Strict validation ensures only team owners/admins can modify membership or roles.

---
**Made with ❤️ for quality assurance teams**
For issues or suggestions, please open an issue on [GitHub](https://github.com/mustaffaerdogan/regression-test-management-platform/issues).
