import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Ensure directories exist
  const baseDir = path.join(__dirname, 'public');
  const categories = ['words', 'phrases', 'sentences'];
  categories.forEach(cat => {
    const dir = path.join(baseDir, 'english', cat);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const listFile = path.join(dir, 'list.json');
    if (!fs.existsSync(listFile)) fs.writeFileSync(listFile, JSON.stringify([]));
  });

  // Multer config for audio
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const voice = req.query.voice || 'default';
      const type = req.query.type || 'words';
      const dir = path.join(baseDir, 'audio', `${voice}_${type}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  });
  const upload = multer({ storage });

  // API: Upload JSON List
  app.post('/api/upload-json', (req, res) => {
    const { type, filename, content } = req.body;
    if (!type || !filename || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const dir = path.join(baseDir, 'english', type);
    const filePath = path.join(dir, filename);
    const listPath = path.join(dir, 'list.json');

    try {
      // Save the content
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2));

      // Update list.json
      const list = JSON.parse(fs.readFileSync(listPath, 'utf-8'));
      if (!list.includes(filename)) {
        list.push(filename);
        fs.writeFileSync(listPath, JSON.stringify(list, null, 2));
      }

      res.json({ success: true, message: `Saved ${filename} to ${type}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save file' });
    }
  });

  // API: Upload Audio
  app.post('/api/upload-audio', (req, res) => {
    upload.array('files')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: 'Audio files uploaded successfully' });
    });
  });

  // Serve static files from public directory
  app.use(express.static(path.join(__dirname, 'public')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
