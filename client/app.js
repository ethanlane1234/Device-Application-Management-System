import express from 'express';
import { getFileStructure, getAllFiles, getFileTree } from './app-modules/files.mjs';

const app = express();

app.set('view engine', 'ejs');

app.get('/', async (req, res) => {
    res.render('index' , { tree: await getFileTree('../../') });
});

app.listen(80);