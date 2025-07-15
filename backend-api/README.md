# File Upload API Backend

Backend API service for the file upload system, built with Express.js and TypeScript.

## Features

- JWT-based authentication
- Request validation using express-validator
- CORS and security headers configuration
- Comprehensive error handling
- Structured logging with Winston
- Integration tests with Jest and Supertest

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration values, especially:
   - `JWT_SECRET`: Use a strong, random secret key
   - `REDIS_HOST`, `REDIS_PORT`: Redis connection details
   - `CORS_ORIGIN`: Frontend application URL

## Development

Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3001` by default.

## Testing

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get current user profile (requires auth)
- `POST /api/v1/auth/verify` - Verify JWT token (requires auth)

### Upload (Protected)

- `GET /api/v1/upload/health` - Upload service health check

### System

- `GET /health` - Server health check

## Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Test Users

For development/testing, the following users are available:

- Email: `user@example.com`, Password: `password123`, Role: `user`
- Email: `admin@example.com`, Password: `admin123`, Role: `admin`

## Error Handling

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {},
    "timestamp": "2023-01-01T00:00:00.000Z",
    "requestId": "unique-request-id"
  }
}
```

## Security Features

- Helmet.js for security headers
- CORS configuration
- JWT token validation
- Request validation and sanitization
- Structured error responses (no sensitive data leakage)

## Logging

The application uses Winston for structured logging. Logs include:
- Request/response logging
- Authentication events
- Error tracking with stack traces
- Performance metrics

In production, logs are written to files in the `logs/` directory.