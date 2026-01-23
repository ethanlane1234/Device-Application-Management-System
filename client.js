import { client } from "./app.ts";

// client
const client_device = new client(45697, "localhost", "localhost");
client_device.listen();