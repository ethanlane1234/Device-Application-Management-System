import { client } from "./app.ts";


const PORT = 45697; // should be one less than server port
// client
const client_device = new client(PORT, "localhost", "localhost");
client_device.listen();

for (let i=0;i < 1; i++) {client_device.sendMessageToServer(i);}