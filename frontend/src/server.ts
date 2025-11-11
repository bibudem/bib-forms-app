import express from 'express';
import { join } from 'node:path';

const app = express();
const port =  4000;

// Servir les fichiers Angular compilés
const browserDistFolder = join(__dirname, '../browser'); // adapter si ton build est ailleurs
app.use(express.static(browserDistFolder, { index: 'index.html' }));

// Route fallback pour Angular SPA
app.get('*', (req, res) => {
  res.sendFile(join(browserDistFolder, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
