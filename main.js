const { Command } = require('commander');
const path = require('path');
const express = require("express");
const fs = require("fs/promises");
const multer = require('multer');

const program = new Command();

program
  .requiredOption('-h, --host <host>', 'server host')
  .requiredOption('-p, --port <port>', 'server port')
  .requiredOption('-c, --cache <path>', 'input file path');

program.parse(process.argv);
const options = program.opts();
const cacheDir = path.resolve(options.cache);

const app = express();
app.use(express.text());
const upload = multer();
async function directoryExists() {
  try {
    await fs.access(cacheDir);
  } catch {
    await fs.mkdir(cacheDir, { recursive: true });
  }
}

async function fileExists(path){
    try{
        await fs.access(path);
        return true;
    } catch{
        return false;
    }}

function getNotePath(noteName) {
  const safeName = path.basename(noteName);
  return path.join(cacheDir, safeName);
}

app.get('/notes/:noteName', async (req, res) => {
    const filePath = getNotePath(req.params.noteName);
    if (await fileExists(filePath)) {
        const data = await fs.readFile(filePath, 'utf-8');
        res.type('text/plain').send(data);
    } else {
        res.status(404).send('Not found');
    }
});

app.put('/notes/:noteName', async (req, res) => {
    const filePath = getNotePath(req.params.noteName);

    if (await fileExists(filePath)) {
        await fs.writeFile(filePath, req.body, 'utf-8');
        res.status(200).send('Note updated');
    } else {
        res.status(404).send('Not found');
    }
})

app.delete('/notes/:noteName', async (req, res) => {
     const filePath = getNotePath(req.params.noteName);

     if (await fileExists(filePath)) {
         await fs.unlink(filePath)
         res.status(200).send('Deleted');
     } else{
         res.status(404).send('Not found');
     }
})

app.get('/notes', async (req, res) => {
    try {
        const files = await fs.readdir(cacheDir);
        const notes = [];

        for (const file of files) {
            const filePath = path.join(cacheDir, file);
            const content = await fs.readFile(filePath, 'utf-8');

            notes.push({
                name: file,
                text: content
            });
        }
        res.status(200).json(notes);
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

app.post('/write', upload.none(), async (req, res) => {
    const { note_name, note } = req.body;
    const filePath = getNotePath(note_name);

    if (await fileExists(filePath)) {
        res.status(400).send('Bad request');
    } else {
        await fs.writeFile(filePath, note, "utf-8");
        res.status(201).send('Created');
    }
})

app.get('/UploadForm.html', async (req, res) => {
    try {
        const htmlPath = path.join('UploadForm.html');
        const htmlContent = await fs.readFile(htmlPath, 'utf-8');
        res.status(200).type('html').send(htmlContent);
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

app.listen(options.port, options.host, async () =>{
    await directoryExists(cacheDir);
    console.log(`Server running at http://${options.host}:${options.port}`);
});
