import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { videoRoutes } from './routes/video';
import { healthRoutes } from './routes/health';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files (temp uploads and generated clips)
app.use('/temp', express.static(path.join(__dirname, '../temp')));

// Routes
app.use('/api/video', videoRoutes);
app.use('/api/health', healthRoutes);

// Error handling middleware
app.use(
  (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.error('Error:', err);
    const status = err.status || 500;
    res.status(status).json({
      errorCode: err.errorCode || 'INTERNAL',
      message: err.message || 'Internal server error',
    });
  }
);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    errorCode: 'NOT_FOUND',
    message: 'Endpoint not found',
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
