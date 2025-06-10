# InvoicePDF - Professional PDF Invoice Generation Service

A comprehensive PDF invoice generation service built with Next.js, Express.js, and MongoDB. This application demonstrates enterprise-grade architecture with asynchronous processing, real-time updates, and robust security measures.

## 🌟 Features

- **User Authentication**: Secure sign up and login system
- **Invoice Creation**: Intuitive form with line items and calculations
- **Asynchronous PDF Generation**: Background processing with real-time status updates
- **Real-time Updates**: Server-Sent Events for live status notifications
- **Rate Limiting**: 5 PDF generations per user per minute
- **Secure Downloads**: Authenticated download system with user isolation
- **Responsive Design**: Modern UI that works on all devices
- **Professional PDFs**: Clean, business-ready invoice templates

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pdf-invoice-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy the environment template
   cp .env.example .env.local
   
   # Edit .env.local with your actual values
   nano .env.local  # or use your preferred editor
   ```
   
   **Required Environment Variables:**
   ```env
   MONGODB_URI=your-actual-mongodb-connection-string
   JWT_SECRET=your-generated-jwt-secret-key
   NODE_ENV=development
   ```

4. **Generate a Secure JWT Secret**
   ```bash
   # Generate a cryptographically secure JWT secret
   node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
   ```
   Copy the output to your `.env.local` file.

5. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or use MongoDB Atlas (recommended for production)
   ```

6. **Run the application**
   ```bash
   # Start both frontend and backend
   npm run dev:full
   
   # Or run separately:
   # Frontend (Next.js): npm run dev
   # Backend (Express): npm run server
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### 🧪 Demo Account
For testing purposes, you can create a demo account through the registration form. 

## 🔐 Security Best Practices

### Environment Variables
- **Local Development**: Use `.env.local` (never commit this file!)
- **Production**: Set environment variables through your hosting platform
- **Staging**: Use separate environment files for each environment

### Secret Management
1. **JWT Secrets**: Generate cryptographically secure random strings (64+ characters)
2. **Database URLs**: Use connection strings with proper authentication
3. **API Keys**: Store in environment variables, never in code
4. **Passwords**: Hash with bcrypt, never store plaintext

### Production Deployment Security
```bash
# Generate production-ready secrets
node -e "console.log('Production JWT Secret:', require('crypto').randomBytes(64).toString('hex'))"
```

## 🏗️ Architectural Decisions

### 1. System Design & Architecture

**Question**: Describe the end-to-end flow from a user clicking "Generate PDF" to the file being ready. Is this process synchronous or asynchronous?

**Answer**: The PDF generation process is **fully asynchronous** and follows this flow:

1. **User Interaction**: User fills out the invoice form and clicks "Generate PDF"
2. **Immediate Response**: The invoice is instantly saved to MongoDB with status "processing" and appears in the dashboard
3. **Background Processing**: The actual PDF generation happens in a separate process using setTimeout (simulating a job queue)
4. **Real-time Updates**: Server-Sent Events push status updates to the frontend when processing completes
5. **Download Ready**: User receives notification and can download the secure PDF

**Why Asynchronous?**
- **User Experience**: UI never freezes during PDF generation
- **Scalability**: Server can handle multiple concurrent PDF generations
- **Resource Management**: Heavy operations don't block the main thread
- **Fault Tolerance**: Failed generations don't crash the entire application

### 2. Security & Robustness

**Question**: Explain how your system ensures User A cannot download an invoice belonging to User B. How did you implement rate-limiting?

**Security Measures**:

1. **User Isolation**:
   - Every invoice contains a userId field linking it to the creator
   - Download endpoint checks: `Invoice.findOne({ _id: invoiceId, userId: req.user.userId })`
   - JWT tokens ensure user identity verification
   - PDF files are stored with user-specific access controls

2. **Rate Limiting Implementation**:
   - Custom MongoDB-based rate limiter tracking user requests
   - 5 PDF generations per user per minute window
   - Rate limit data: `{ userId, count, resetTime }`
   - Sliding window resets automatically after 60 seconds
   - Returns HTTP 429 with time remaining when limit exceeded

3. **Additional Security**:
   - Passwords hashed with bcryptjs
   - JWTs with 24-hour expiration
   - CORS protection for API endpoints
   - Input validation and sanitization

**Scaling Considerations**:
- Rate limiting data could be moved to Redis for multi-server deployments
- JWT verification can be optimized with caching
- Database indexes on userId for fast lookups

### 3. Scalable Task Handling

**PDF Generation Strategy**:

1. **Background Processing**: Used setTimeout to simulate async job processing
2. **Status Tracking**: Database-driven status management (processing → ready/failed)
3. **Real-time Communication**: Server-Sent Events for instant status updates
4. **Error Handling**: Graceful failure handling with status updates

**Production Scaling Options**:
- **Job Queues**: Bull, BullMQ, or AWS SQS for distributed processing
- **Worker Processes**: Separate worker containers for PDF generation
- **Load Balancing**: Multiple server instances with shared MongoDB
- **Caching**: Redis for session management and rate limiting

## 📁 Project Structure

```
pdf-invoice-service/
├── Frontend/              # Next.js frontend application
│   ├── app/              # Next.js app directory
│   │   ├── auth/        # Authentication pages
│   │   ├── dashboard/   # Main dashboard
│   │   ├── globals.css  # Global styles
│   │   ├── layout.tsx   # Root layout
│   │   └── page.tsx     # Landing page
│   ├── components/      # React components
│   │   ├── ui/         # shadcn/ui components
│   │   └── InvoiceForm.tsx  # Invoice creation form
│   └── lib/            # Frontend utility functions
│
├── Backend/             # Express.js backend application
│   ├── src/            # Source code
│   │   ├── index.js    # Main server file
│   │   ├── routes/     # API routes
│   │   ├── models/     # Database models
│   │   ├── middleware/ # Custom middleware
│   │   └── utils/      # Backend utility functions
│   ├── pdfs/          # Generated PDF storage
│   └── .env.example   # Environment template
│
└── package.json        # Root dependencies and scripts
```

## 🛠️ Technology Stack

- **Frontend**: Next.js 13, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, JWT authentication
- **Database**: MongoDB with Mongoose ODM
- **PDF Generation**: react-pdf library
- **Real-time**: Server-Sent Events (SSE)
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Lucide React

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Invoices
- `GET /api/invoices` - List user's invoices
- `POST /api/invoices` - Create new invoice (rate limited)
- `GET /api/invoices/:id/download` - Download PDF (secure)

### Real-time
- `GET /api/sse` - Server-Sent Events stream

## 🔐 Security Features

1. **Authentication**: JWT-based with secure password hashing
2. **Authorization**: User-specific data access controls
3. **Rate Limiting**: 5 PDFs per user per minute
4. **Data Isolation**: Complete user data separation
5. **Secure Downloads**: Authenticated PDF access only
6. **Input Validation**: Comprehensive request validation
7. **Environment Security**: Proper secret management

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   # Set environment variables in your hosting platform
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/invoices
   JWT_SECRET=your-64-character-production-secret
   NODE_ENV=production
   ```

2. **Frontend**: Deploy to Vercel
   ```bash
   npm run build
   vercel --prod
   ```

3. **Backend**: Deploy to Render, Railway, Heroku or DigitalOcean
   ```bash
   npm start
   ```

4. **Database**: Use MongoDB Atlas for production

### Security Checklist for Production
- [ ] Environment variables set properly
- [ ] No secrets in codebase
- [ ] Strong JWT secret (64+ characters)
- [ ] Database authentication enabled
- [ ] HTTPS enabled
- [ ] CORS configured properly
- [ ] Rate limiting active
- [ ] Input validation implemented

## 🧪 Testing

```bash
# Run frontend tests
npm run test

# Run backend tests
npm run test:server

# E2E tests
npm run test:e2e
```

## 📈 Performance Considerations

- **Database Indexing**: Indexes on userId and createdAt fields
- **PDF Caching**: Generated PDFs cached until user deletion
- **Connection Pooling**: MongoDB connection optimization
- **Rate Limiting**: Prevents system abuse and overload
- **Lazy Loading**: Components loaded on demand

## 🚨 Security Troubleshooting

### If GitHub Detects Secrets:
1. **Immediately rotate** any exposed credentials
2. **Remove secrets** from commit history using `git filter-branch` or BFG Repo-Cleaner
3. **Update environment variables** in all environments
4. **Review access logs** for unauthorized usage

### Remove Secrets from Git History:
```bash
# WARNING: This rewrites history - coordinate with team first!
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch path/to/file/with/secrets' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (dangerous - use with caution!)
git push origin --force --all
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. **Never commit secrets**: Always use environment variables
4. Run security checks: `npm run security-audit`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Security Guidelines for Contributors
- Use `.env.local` for local development
- Never commit API keys, passwords, or tokens
- Use placeholder values in documentation
- Run `git secrets --scan` before pushing

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- **Never include secrets in issue descriptions**

---

Built with ❤️ and 🔐 security in mind for modern businesses that value efficiency and reliability.