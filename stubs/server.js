import { db, myServer, ipInfo, client } from '../app.ts';

const PORT = 45698;
const server = new myServer(PORT); // abstraction
const app = server.app(); // express itself
const database = new db('./database.db'); // database


server.get("cool beans");
// scan for clients
const IP_SCAN_RANGE = new ipInfo().getLocalPrefix();
console.log(`address in block ${IP_SCAN_RANGE[0]}.${IP_SCAN_RANGE[1]}.${IP_SCAN_RANGE[2]}.1 - 255`);
// server.scanForClients(IP_SCAN_RANGE[0], IP_SCAN_RANGE[1], IP_SCAN_RANGE[2], 1, PORT);

server.listen(PORT);

