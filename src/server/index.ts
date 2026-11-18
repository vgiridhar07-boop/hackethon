import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { directoryRouter } from './routes/directory';
import { geoRouter } from './routes/geo';
import { complaintsRouter } from './routes/complaints';
import { regionRoutes, regionContextMiddleware } from './routes/regionRoutes';
import { createAuthAndOfficerRouter } from '../controllers/authAndOfficerController';
import { createIsolatedPortalRouter } from '../controllers/isolatedPortalController';
import { authenticateRequest } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure persistent uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use(authenticateRequest);
app.use(regionContextMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    platform: 'Civic Helpline India API Gateway',
    timestamp: new Date().toISOString(),
    standards_compliance: ['DPDP Act 2023', 'GIGW 3.0', 'WCAG 2.1 AA', 'PostGIS 3.4 Spatial'],
  });
});

// Mount modular API v1 routers
app.use(regionRoutes);
app.use(createAuthAndOfficerRouter());
app.use(createIsolatedPortalRouter());
app.use('/api/v1/directory', directoryRouter);
app.use('/api/v1/geo', geoRouter);
app.use('/api/v1/complaints', complaintsRouter);

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Civic Helpline India Gateway] Listening on http://localhost:${PORT}`);
    console.log(`[API Specs] Active endpoints at /api/v1/directory, /api/v1/geo, /api/v1/complaints`);
  });
}

export default app;

