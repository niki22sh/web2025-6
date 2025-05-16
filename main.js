const { Command } = require('commander');
const path = require('path');
const express = require("express");
const fs = require("fs/promises");
const multer = require('multer');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

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

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notes Service API',
      version: '1.0.0',
      description: 'API для нотаток',
    },
    servers: [
      { url: `http://${options.host}:${options.port}` },
    ],
  },
  apis: ['main.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

/**
 * @swagger
 * /notes/{noteName}:
 *   get:
 *     summary: Повертає текст нотатки за іменем
 *     parameters:
 *       - in: path
 *         name: noteName
 *         schema:
 *           type: string
 *         required: true
 *         description: Імʼя нотатки
 *     responses:
 *       200:
 *         description: Текст нотатки
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       404:
 *         description: Нотатка не знайдена
 */
app.get('/notes/:noteName', async (req, res) => {
    const filePath = getNotePath(req.params.noteName);
    if (await fileExists(filePath)) {
        const data = await fs.readFile(filePath, 'utf-8');
        res.type('text/plain').send(data);
    } else {
        res.status(404).send('Not found');
    }
});

/**
 * @swagger
 * /notes/{noteName}:
 *   put:
 *     summary: Оновити текст існуючої нотатки
 *     parameters:
 *       - in: path
 *         name: noteName
 *         required: true
 *         schema:
 *           type: string
 *         description: Ім'я нотатки для оновлення
 *     requestBody:
 *       description: Новий текст нотатки у форматі plain text
 *       required: true
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *     responses:
 *       200:
 *         description: Нотатку оновлено
 *       404:
 *         description: Нотатка не знайдена
 */
app.put('/notes/:noteName', async (req, res) => {
    const filePath = getNotePath(req.params.noteName);

    if (await fileExists(filePath)) {
        await fs.writeFile(filePath, req.body, 'utf-8');
        res.status(200).send('Note updated');
    } else {
        res.status(404).send('Not found');
    }
})

/**
 * @swagger
 * /notes/{noteName}:
 *   delete:
 *     summary: Видалити нотатку за ім'ям
 *     parameters:
 *       - in: path
 *         name: noteName
 *         required: true
 *         schema:
 *           type: string
 *         description: Ім'я нотатки для видалення
 *     responses:
 *       200:
 *         description: Нотатку видалено
 *       404:
 *         description: Нотатка не знайдена
 */
app.delete('/notes/:noteName', async (req, res) => {
     const filePath = getNotePath(req.params.noteName);

     if (await fileExists(filePath)) {
         await fs.unlink(filePath)
         res.status(200).send('Deleted');
     } else{
         res.status(404).send('Not found');
     }
})

/**
 * @swagger
 * /notes:
 *   get:
 *     summary: Отримати список усіх нотаток
 *     responses:
 *       200:
 *         description: Список нотаток
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Ім'я нотатки
 *                   text:
 *                     type: string
 *                     description: Текст нотатки
 */
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

/**
 * @swagger
 * /write:
 *   post:
 *     summary: Створити нову нотатку
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - note_name
 *               - note
 *             properties:
 *               note_name:
 *                 type: string
 *                 description: Ім'я нотатки
 *               note:
 *                 type: string
 *                 description: Текст нотатки
 *     responses:
 *       201:
 *         description: Нотатку створено
 *       400:
 *         description: Нотатка з таким ім'ям вже існує
 */
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

/**
 * @swagger
 * /UploadForm.html:
 *   get:
 *     summary: Отримати UploadForm.html
 *     responses:
 *       200:
 *         description: UploadForm.html
 *         content:
 *           text/html:
 *             schema:
 *             type: string
 *       500:
 *         description: Internal Server Error
 */
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
