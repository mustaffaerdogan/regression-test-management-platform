# 🧪 Regression Test Management Platform

A comprehensive SaaS platform for managing regression test suites, test cases, and test execution runs. Built with modern web technologies to provide a seamless testing workflow.

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

### 🔐 Authentication & Authorization
- JWT-based authentication with secure token management
- Password hashing with bcrypt (10 salt rounds)
- Protected routes with middleware validation
- Session persistence with automatic restore
- Rate limiting for authentication endpoints

### 📦 Regression Set Management
- Create, read, update, and delete regression sets
- Platform support: Web, iOS, Android, TV
- Search and filter regression sets
- User-scoped data isolation

### 📝 Test Case Management
- Full CRUD operations for test cases
- **CSV Bulk Import** - Import multiple test cases at once
- Rich test case fields (preconditions, test data, steps, expected results)
- Status tracking (Pass, Fail, Not Executed)
- Duplicate detection during import

### 🚀 Test Run Execution
- Start test runs from regression sets
- Step-by-step execution interface
- Real-time progress tracking
- Pass/Fail/Skip status updates
- Run cancellation support
- Execution history with pagination

### 📊 Dashboard & Analytics
- Overview cards with key metrics
- Pass/Fail trend charts (7d, 30d, 90d, 180d, 365d)
- Platform distribution statistics
- Module failure analysis
- Slow test identification
- Recent runs summary

### 🎨 User Interface
- Modern, responsive design with Tailwind CSS
- Dark/Light mode support
- Mobile-friendly navigation with drawer sidebar
- Modal-based forms and dialogs
- Real-time loading states and error handling
- Toast notifications for user feedback

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.x
- **Language**: TypeScript 5.x
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Security**: Helmet, CORS, express-rate-limit
- **File Upload**: Multer (for CSV imports)
- **CSV Parsing**: csv-parse

### Frontend
- **Framework**: React 19.x
- **Build Tool**: Vite 7.x
- **Language**: TypeScript 5.x
- **Routing**: React Router v7
- **Styling**: Tailwind CSS 3.x
- **State Management**: React Context API

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.17 or higher (tested with Node 24)
- **npm** 10+ or **yarn**
- **MongoDB** 6+ (running locally or connection string)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/mustaffaerdogan/regression-test-management-platform.git
cd regression-test-management-platform
```

### 2. Install Dependencies

Install root, server, and client dependencies:

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 3. Configure Environment Variables

#### Backend Configuration (`server/.env`)

Copy the example file and configure:

```bash
# Windows
Copy-Item server\env.example server\.env

# Linux/Mac
cp server/env.example server/.env
```

Edit `server/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=regression_test_management
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
```

**⚠️ Important**: Change `JWT_SECRET` to a strong random string in production (minimum 32 characters).

#### Frontend Configuration (`client/.env`)

```bash
# Windows
Copy-Item client\env.example client\.env

# Linux/Mac
cp client/env.example client/.env
```

Edit `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 4. Verify MongoDB Connection

Ensure MongoDB is running:

```bash
# Check MongoDB status
mongosh --eval "db.adminCommand('ping')"
```

If using a remote MongoDB instance, update `MONGODB_URI` in `server/.env`.

## 🏃 Running the Application

### Development Mode (Recommended)

Run both server and client concurrently:

```bash
# From root directory
npm run dev
```

This starts:
- **Backend**: `http://localhost:5000`
- **Frontend**: `http://localhost:5173`

### Run Separately

#### Backend Only

```bash
cd server
npm run dev        # Development server with hot reload
npm run build      # Production build
npm start          # Run production build
npm run lint       # TypeScript type checking
```

#### Frontend Only

```bash
cd client
npm run dev        # Development server (http://localhost:5173)
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # ESLint check
```

## 📚 API Documentation

All API endpoints are prefixed with `/api`. Protected routes require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register a new user | ❌ |
| `POST` | `/api/auth/login` | Login and get JWT token | ❌ |
| `GET` | `/api/auth/me` | Get current user info | ✅ |

**Request Example (Register):**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response Example (Login):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### Regression Set Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/regression-sets` | List all regression sets (with filters) | ✅ |
| `POST` | `/api/regression-sets` | Create a new regression set | ✅ |
| `GET` | `/api/regression-sets/:id` | Get regression set by ID | ✅ |
| `PUT` | `/api/regression-sets/:id` | Update regression set | ✅ |
| `DELETE` | `/api/regression-sets/:id` | Delete regression set | ✅ |

**Query Parameters (GET /api/regression-sets):**
- `platform`: Filter by platform (Web, iOS, Android, TV)
- `search`: Search in name and description
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### Test Case Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/regression-sets/:id/test-cases` | List test cases for a regression set | ✅ |
| `POST` | `/api/regression-sets/:id/test-cases` | Create a test case | ✅ |
| `GET` | `/api/regression-sets/test-cases/:caseId` | Get test case by ID | ✅ |
| `PUT` | `/api/regression-sets/test-cases/:caseId` | Update test case | ✅ |
| `DELETE` | `/api/regression-sets/test-cases/:caseId` | Delete test case | ✅ |
| `POST` | `/api/regression-sets/:id/test-cases/import` | Import test cases from CSV | ✅ |

**CSV Import Format:**
```csv
Test Case ID,User Type,Platform,Module,Test Scenario,Test Case,Pre Conditions,Test Data,Test Step,Expected Result
TC-101,Registered,Web,Login,User can login,Correct email and password login,User must exist,email: test@test.com,1. open page 2. type email,Redirect to dashboard
```

**CSV Import Response:**
```json
{
  "success": true,
  "message": "18 test cases imported",
  "data": {
    "importedCount": 18,
    "skipped": [
      {
        "row": 3,
        "reason": "Duplicate Test Case ID: TC-101"
      }
    ]
  }
}
```

### Test Run Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/test-runs/start/:regressionSetId` | Start a new test run | ✅ |
| `GET` | `/api/test-runs/:runId` | Get run details with items | ✅ |
| `GET` | `/api/test-runs/:runId/next` | Get next unexecuted item | ✅ |
| `PUT` | `/api/test-runs/update-item/:itemId` | Update run item status | ✅ |
| `PUT` | `/api/test-runs/cancel/:runId` | Cancel a test run | ✅ |
| `GET` | `/api/test-runs/history` | Get run history with pagination | ✅ |

**Start Run Response:**
```json
{
  "success": true,
  "message": "Run started",
  "data": {
    "runId": "...",
    "totalCases": 25
  }
}
```

**Update Run Item Request:**
```json
{
  "status": "Pass",
  "actualResults": "Test passed successfully"
}
```

**History Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status (In Progress, Completed, Cancelled)
- `platform`: Filter by platform

### Dashboard Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/dashboard/overview` | Get dashboard overview metrics | ✅ |
| `GET` | `/api/dashboard/recent-runs` | Get recent test runs | ✅ |
| `GET` | `/api/dashboard/pass-fail-trend` | Get pass/fail trend data | ✅ |
| `GET` | `/api/dashboard/platform-stats` | Get platform distribution stats | ✅ |
| `GET` | `/api/dashboard/module-failures` | Get module failure statistics | ✅ |
| `GET` | `/api/dashboard/slow-tests` | Get slowest test cases | ✅ |

**Overview Response:**
```json
{
  "success": true,
  "message": "Dashboard overview fetched",
  "data": {
    "totalRegressionSets": 12,
    "totalTestCases": 284,
    "totalRuns": 45,
    "activeRuns": 3,
    "completedRuns": 38,
    "passRate": 82.5,
    "failRate": 12.4,
    "skippedRate": 5.1
  }
}
```

**Trend Query Parameters:**
- `range`: Time range (7d, 30d, 90d, 180d, 365d)
- `from`: Start date (ISO 8601)
- `to`: End date (ISO 8601)

### Status Endpoint

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/status` | Health check endpoint | ❌ |

## 📁 Project Structure

```
regression-test-management-platform/
├── server/                      # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── config/              # Configuration (MongoDB connection)
│   │   ├── controllers/         # Route controllers
│   │   │   ├── auth.controller.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── regressionSet.controller.ts
│   │   │   ├── testCase.controller.ts
│   │   │   ├── testCaseImport.controller.ts
│   │   │   └── testRun.controller.ts
│   │   ├── middleware/          # Express middleware
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   ├── uploadCsv.ts
│   │   │   └── validate.middleware.ts
│   │   ├── models/              # Mongoose models
│   │   │   ├── User.model.ts
│   │   │   ├── RegressionSet.model.ts
│   │   │   ├── TestCase.model.ts
│   │   │   ├── Run.ts
│   │   │   └── RunItem.ts
│   │   ├── routes/              # API routes
│   │   │   ├── auth.routes.ts
│   │   │   ├── regressionSet.routes.ts
│   │   │   ├── testRun.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   └── index.ts
│   │   ├── types/               # TypeScript type definitions
│   │   │   └── express.d.ts
│   │   ├── utils/               # Utility functions
│   │   │   └── generateToken.ts
│   │   ├── validation/          # Express-validator schemas
│   │   │   ├── regressionSet.validation.ts
│   │   │   ├── testCase.validation.ts
│   │   │   ├── testRun.validation.ts
│   │   │   └── dashboard.validation.ts
│   │   ├── app.ts               # Express app configuration
│   │   └── server.ts            # Server entry point
│   ├── dist/                    # Compiled TypeScript output
│   ├── .env                     # Environment variables
│   └── package.json
│
├── client/                       # Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── api/                 # API client functions
│   │   │   ├── auth.ts
│   │   │   ├── regressionSets.ts
│   │   │   ├── testRuns.ts
│   │   │   └── dashboard.ts
│   │   ├── components/          # Reusable components
│   │   │   ├── Button.tsx
│   │   │   ├── FormInput.tsx
│   │   │   ├── RegressionSetCard.tsx
│   │   │   ├── RegressionSetFormModal.tsx
│   │   │   ├── TestCaseFormModal.tsx
│   │   │   ├── TestCaseTable.tsx
│   │   │   └── ...
│   │   ├── context/             # React Context providers
│   │   │   ├── AuthContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   └── useTheme.ts
│   │   ├── layouts/              # Layout components
│   │   │   ├── PublicLayout.tsx
│   │   │   └── ProtectedLayout.tsx
│   │   ├── pages/                # Page components
│   │   │   ├── Landing.tsx
│   │   │   ├── Auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   └── Register.tsx
│   │   │   ├── Dashboard/
│   │   │   │   └── DashboardPage.tsx
│   │   │   ├── RegressionSets/
│   │   │   │   ├── RegressionSetListPage.tsx
│   │   │   │   ├── RegressionSetDetailPage.tsx
│   │   │   │   └── components/
│   │   │   │       └── ImportCsvModal.tsx
│   │   │   └── TestRuns/
│   │   │       ├── TestRunHistoryPage.tsx
│   │   │       ├── TestRunDetailPage.tsx
│   │   │       └── TestRunExecutePage.tsx
│   │   ├── router/               # React Router configuration
│   │   │   └── index.tsx
│   │   ├── types/                # TypeScript type definitions
│   │   │   ├── user.ts
│   │   │   ├── regression.ts
│   │   │   ├── testRun.ts
│   │   │   └── dashboard.ts
│   │   ├── App.tsx               # Main React component
│   │   └── main.tsx               # Entry point
│   ├── dist/                     # Vite build output
│   ├── .env                      # Environment variables
│   └── package.json
│
└── package.json                   # Root package.json (monorepo scripts)
```

## 🎯 Key Features

### 1. Regression Set Management
- Create regression sets for different platforms (Web, iOS, Android, TV)
- Organize test cases by regression set
- Search and filter regression sets
- Full CRUD operations with ownership validation

### 2. Test Case Management
- Create detailed test cases with:
  - Test Case ID, User Type, Platform, Module
  - Test Scenario, Test Case description
  - Pre Conditions, Test Data, Test Steps
  - Expected Results, Actual Results
  - Status tracking (Pass, Fail, Not Executed)
- **CSV Bulk Import**: Upload CSV files to import multiple test cases at once
- Duplicate detection and validation during import
- Skip invalid rows with detailed error messages

### 3. Test Run Execution
- Start test runs from regression sets
- Step-by-step execution interface
- Real-time progress tracking
- Update test case status (Pass, Fail, Skip) with actual results
- Cancel running tests
- View execution history with filters

### 4. Dashboard Analytics
- **Overview**: Total regression sets, test cases, runs, and pass rates
- **Recent Runs**: Latest test run summaries
- **Pass/Fail Trend**: Time-series data for trends (7d to 365d)
- **Platform Stats**: Distribution of tests across platforms
- **Module Failures**: Identify modules with highest failure rates
- **Slow Tests**: Find test cases taking the longest to execute

### 5. User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark Mode**: Toggle between light and dark themes
- **Modal Forms**: Clean modal-based forms for create/edit operations
- **Loading States**: Visual feedback during API calls
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Success/error feedback

## 🔒 Security

### Authentication & Authorization
- JWT tokens with 7-day expiration
- Password hashing with bcrypt (10 salt rounds)
- Protected routes with middleware validation
- Resource ownership checks (users can only access their own data)

### API Security
- Rate limiting on authentication endpoints
- CORS configuration for allowed origins
- Helmet.js for HTTP header security
- Input validation with express-validator
- File upload restrictions (CSV only, 2MB max)

### Best Practices
- Environment variables for sensitive data
- No sensitive data in version control
- Type-safe code with TypeScript
- Error handling without exposing internals

## 💻 Development

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- Consistent code formatting
- Component-based architecture

### Adding New Features

1. **Backend**:
   - Create model in `server/src/models/`
   - Add controller in `server/src/controllers/`
   - Define routes in `server/src/routes/`
   - Add validation in `server/src/validation/`

2. **Frontend**:
   - Create API client in `client/src/api/`
   - Add types in `client/src/types/`
   - Create components in `client/src/components/`
   - Add pages in `client/src/pages/`
   - Update router in `client/src/router/`

### Testing

```bash
# Type checking
cd server && npm run lint
cd client && npm run lint
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by best practices in SaaS development
- Designed for scalability and maintainability

---

**Made with ❤️ for quality assurance teams**

For issues, questions, or suggestions, please open an issue on [GitHub](https://github.com/mustaffaerdogan/regression-test-management-platform/issues).
