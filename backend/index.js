const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

console.log(PORT);
// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || '';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
});

// JWT secret
//Here we are setting the JWT secret for the authentication
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Invoice schema
const invoiceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientName: { type: String, required: true },
  clientEmail: { type: String, required: true },
  invoiceNumber: { type: String, required: true },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  lineItems: [{
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
  status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
  pdfPath: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

// Rate limiting schema
const rateLimitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  count: { type: Number, default: 0 },
  resetTime: { type: Date, required: true }
});

const RateLimit = mongoose.model('RateLimit', rateLimitSchema);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Rate limiting middleware
const checkRateLimit = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    let userRateLimit = await RateLimit.findOne({ userId });

    if (!userRateLimit) {
      userRateLimit = new RateLimit({
        userId,
        count: 0,
        resetTime: new Date(now.getTime() + 60000)
      });
    }

    // Reset count if time window has passed
    if (now > userRateLimit.resetTime) {
      userRateLimit.count = 0;
      userRateLimit.resetTime = new Date(now.getTime() + 60000);
    }

    if (userRateLimit.count >= 5) {
      const timeLeft = Math.ceil((userRateLimit.resetTime - now) / 1000);
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Try again in ' + timeLeft + ' seconds.' 
      });
    }

    userRateLimit.count += 1;
    await userRateLimit.save();

    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Routes

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ 
      message: 'User created successfully', 
      token,
      user: { id: user._id, email: user.email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ 
      message: 'Login successful', 
      token,
      user: { id: user._id, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invoice routes
app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const invoices = await Invoice.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/invoices', authenticateToken, checkRateLimit, async (req, res) => {
  try {
    const {
      clientName,
      clientEmail,
      invoiceNumber,
      issueDate,
      dueDate,
      lineItems,
      subtotal,
      tax,
      total
    } = req.body;

    const invoice = new Invoice({
      userId: req.user.userId,
      clientName,
      clientEmail,
      invoiceNumber,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      lineItems,
      subtotal,
      tax,
      total,
      status: 'processing'
    });

    await invoice.save();

    // Simulate PDF generation in background
    //Here we are simulating the PDF generation in background
    setTimeout(async () => {
      try {
        await generatePDF(invoice);
        
        // Send SSE update
        //Here we are sending the SSE update to the client for real time updates on ui for the invoice status
        sendSSEUpdate(req.user.userId, {
          type: 'invoice_ready',
          invoiceId: invoice._id,
          status: 'ready'
        });
      } catch (error) {
        console.error('PDF generation failed:', error);
        invoice.status = 'failed';
        await invoice.save();
        
        sendSSEUpdate(req.user.userId, {
          type: 'invoice_failed',
          invoiceId: invoice._id,
          status: 'failed'
        });
      }
    }, Math.random() * 5000 + 2000); // 2-7 seconds delay

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download route
//Here we are downloading the pdf file for the invoice
app.get('/api/invoices/:id/download', authenticateToken, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'ready' || !invoice.pdfPath) {
      return res.status(400).json({ error: 'PDF not ready for download' });
    }

    const pdfPath = path.join(__dirname, 'pdfs', invoice.pdfPath);
    
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SSE endpoint for real-time updates
const sseClients = new Map();

app.get('/api/sse', (req, res) => {
  // Get token from query parameter for SSE
  //Here we are getting the token from the query parameter for the SSE
  const token = req.query.authorization;
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const userId = user.userId.toString();
    sseClients.set(userId, res);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      sseClients.delete(userId);
    });

    req.on('error', () => {
      sseClients.delete(userId);
    });
  });
});

function sendSSEUpdate(userId, data) {
  const client = sseClients.get(userId.toString());
  if (client) {
    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('SSE write error:', error);
      sseClients.delete(userId.toString());
    }
  }
}

// PDF generation function
//Here we are generating the pdf file for the invoice
async function generatePDF(invoice) {
  const React = await import('react');
  const { Document, Page, Text, View, StyleSheet, pdf } = await import('@react-pdf/renderer');
  
  // Define styles
  const styles = StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#FFFFFF',
      padding: 30,
    },
    header: {
      fontSize: 24,
      marginBottom: 20,
      fontWeight: 'bold',
    },
    section: {
      margin: 10,
      padding: 10,
      flexGrow: 1,
    },
    invoiceDetails: {
      fontSize: 12,
      marginBottom: 20,
    },
    clientSection: {
      marginBottom: 30,
    },
    clientTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    clientInfo: {
      fontSize: 12,
    },
    table: {
      display: 'table',
      width: 'auto',
      borderStyle: 'solid',
      borderWidth: 1,
      borderRightWidth: 0,
      borderBottomWidth: 0,
    },
    tableRow: {
      margin: 'auto',
      flexDirection: 'row',
    },
    tableHeader: {
      backgroundColor: '#f0f0f0',
    },
    tableCol: {
      width: '25%',
      borderStyle: 'solid',
      borderWidth: 1,
      borderLeftWidth: 0,
      borderTopWidth: 0,
    },
    tableCell: {
      margin: 'auto',
      marginTop: 5,
      marginBottom: 5,
      fontSize: 10,
    },
    tableCellHeader: {
      margin: 'auto',
      marginTop: 5,
      marginBottom: 5,
      fontSize: 10,
      fontWeight: 'bold',
    },
    totalsSection: {
      marginTop: 20,
      alignItems: 'flex-end',
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: 200,
      marginBottom: 5,
    },
    totalLabel: {
      fontSize: 12,
    },
    totalAmount: {
      fontSize: 12,
    },
    grandTotal: {
      fontSize: 14,
      fontWeight: 'bold',
    },
  });

  // Create PDF document component
  const InvoiceDocument = () => (
    React.default.createElement(Document, null,
      React.default.createElement(Page, { size: 'A4', style: styles.page },
        // Header
        React.default.createElement(Text, { style: styles.header }, 'INVOICE'),
        
        // Invoice details
        React.default.createElement(View, { style: styles.invoiceDetails },
          React.default.createElement(Text, null, `Invoice #: ${invoice.invoiceNumber}`),
          React.default.createElement(Text, null, `Issue Date: ${invoice.issueDate.toLocaleDateString()}`),
          React.default.createElement(Text, null, `Due Date: ${invoice.dueDate.toLocaleDateString()}`)
        ),
        
        // Client details
        React.default.createElement(View, { style: styles.clientSection },
          React.default.createElement(Text, { style: styles.clientTitle }, 'Bill To:'),
          React.default.createElement(Text, { style: styles.clientInfo }, invoice.clientName),
          React.default.createElement(Text, { style: styles.clientInfo }, invoice.clientEmail)
        ),
        
        // Line items table
        React.default.createElement(View, { style: styles.table },
          // Table header
          React.default.createElement(View, { style: [styles.tableRow, styles.tableHeader] },
            React.default.createElement(View, { style: styles.tableCol },
              React.default.createElement(Text, { style: styles.tableCellHeader }, 'Description')
            ),
            React.default.createElement(View, { style: styles.tableCol },
              React.default.createElement(Text, { style: styles.tableCellHeader }, 'Qty')
            ),
            React.default.createElement(View, { style: styles.tableCol },
              React.default.createElement(Text, { style: styles.tableCellHeader }, 'Rate')
            ),
            React.default.createElement(View, { style: styles.tableCol },
              React.default.createElement(Text, { style: styles.tableCellHeader }, 'Amount')
            )
          ),
          // Table rows
          ...invoice.lineItems.map(item =>
            React.default.createElement(View, { style: styles.tableRow, key: item._id },
              React.default.createElement(View, { style: styles.tableCol },
                React.default.createElement(Text, { style: styles.tableCell }, item.description)
              ),
              React.default.createElement(View, { style: styles.tableCol },
                React.default.createElement(Text, { style: styles.tableCell }, item.quantity.toString())
              ),
              React.default.createElement(View, { style: styles.tableCol },
                React.default.createElement(Text, { style: styles.tableCell }, `$${item.rate.toFixed(2)}`)
              ),
              React.default.createElement(View, { style: styles.tableCol },
                React.default.createElement(Text, { style: styles.tableCell }, `$${item.amount.toFixed(2)}`)
              )
            )
          )
        ),
        
        // Totals
        React.default.createElement(View, { style: styles.totalsSection },
          React.default.createElement(View, { style: styles.totalRow },
            React.default.createElement(Text, { style: styles.totalLabel }, 'Subtotal:'),
            React.default.createElement(Text, { style: styles.totalAmount }, `$${invoice.subtotal.toFixed(2)}`)
          ),
          React.default.createElement(View, { style: styles.totalRow },
            React.default.createElement(Text, { style: styles.totalLabel }, 'Tax:'),
            React.default.createElement(Text, { style: styles.totalAmount }, `$${invoice.tax.toFixed(2)}`)
          ),
          React.default.createElement(View, { style: styles.totalRow },
            React.default.createElement(Text, { style: styles.grandTotal }, 'Total:'),
            React.default.createElement(Text, { style: styles.grandTotal }, `$${invoice.total.toFixed(2)}`)
          )
        )
      )
    )
  );
  
  // Ensure pdfs directory exists
  const pdfsDir = path.join(__dirname, 'pdfs');
  if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
  }
  
  // Generate PDF
  const filename = `invoice-${invoice._id}.pdf`;
  const filepath = path.join(pdfsDir, filename);
  
  try {
    const stream = await pdf(React.default.createElement(InvoiceDocument)).toBlob();
    const arrayBuffer = await stream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filepath, buffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    // Fallback method
    const pdfStream = pdf(React.default.createElement(InvoiceDocument));
    const chunks = [];
    
    await new Promise((resolve, reject) => {
      pdfStream.on('data', (chunk) => chunks.push(chunk));
      pdfStream.on('end', () => resolve());
      pdfStream.on('error', reject);
    });
    
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(filepath, buffer);
  }
  
  // Update invoice with PDF path
  invoice.pdfPath = filename;
  invoice.status = 'ready';
  await invoice.save();
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
