const { Command } = require('commander');
const path = require('path');
const express = require("express");

const program = new Command();

program
  .requiredOption('-h, --host <host>', 'server host')
  .requiredOption('-p, --port <port>', 'server port')
  .requiredOption('-c, --cache <path>', 'input file path');

program.parse(process.argv);
const options = program.opts();

const app = express();

app.get('/', (req, res) => {
    res.send("Server is working");
});

app.listen(options.port, options.host);
