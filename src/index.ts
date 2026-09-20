import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Load env vars before importing modules that depend on them
dotenv.config();
import path from 'path';
import fs from 'fs';
import apiRouter from './router';
import { uploadsDir } from './uploads';

const app = express();
const PORT = process.env.PORT || 5001;

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api', apiRouter);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Chomok Fashion Backend is healthy and running', port: PORT });
});

app.listen(PORT, () => {
  console.log(`[Chomok Fashion] Server is running on port ${PORT}`);
});
