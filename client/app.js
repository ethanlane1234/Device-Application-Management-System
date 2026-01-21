import express from 'express';
import { Config } from './app-modules/config.mjs';

console.log("Initalizing Server...");

const app = express(); // app
const path = '../../../';

Config.setup(app, path);