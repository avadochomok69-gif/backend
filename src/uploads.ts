import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// ESM-safe __dirname equivalent (works for CommonJS too)
const uploadsDir = path.join(process.cwd(), 'uploads');
export { uploadsDir };
