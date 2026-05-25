import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Custom WAF Middleware
import type { Request, Response, NextFunction } from 'express';

// ...

const wafMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const patterns = [
    /<script/i,
    /drop\s+table/i,
    /select\s+.*\s+from/i,
    /insert\s+into/i,
    /union\s+select/i,
    /--/i,
    /xp_cmdshell/i
  ];

  const checkValue = (val: unknown): boolean => {
    if (typeof val === 'string') {
      return patterns.some(pattern => pattern.test(val));
    }
    if (typeof val === 'object' && val !== null) {
      return Object.values(val).some(v => checkValue(v));
    }
    return false;
  };

  if (checkValue(req.query) || checkValue(req.body) || checkValue(req.params)) {
    console.warn(`[WAF] Blocked suspicious request from IP: ${req.ip}`);
    return res.status(403).json({ error: 'Comportamento suspeito detectado.' });
  }

  next();
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  noSniff: true,
  hidePoweredBy: true,
}));

app.use(wafMiddleware);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Specific limiter for Sync API (Throttling)
const syncLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many sync requests, slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/sync', syncLimiter);

// CORS seguro
app.use(cors({
  origin: process.env.FRONTEND_URL?.split(',') || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize services
async function start() {
  try {
    app.listen(PORT, () => {
      console.warn(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

