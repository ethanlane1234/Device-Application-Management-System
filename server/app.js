import { db, myServer, ipInfo } from './app.ts';

const server = new myServer(); // abstraction
const app = server.app(); // express itself
const database = new db('./database.db'); // database
const PORT = 80;

server.get();
const IP_SCAN_RANGE = new ipInfo().getLocalPrefix();
server.scanForClients(IP_SCAN_RANGE[0], IP_SCAN_RANGE[1], IP_SCAN_RANGE[2], 1, PORT);
server.listen(45698);