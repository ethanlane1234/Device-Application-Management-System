import express from 'express';
import WebSocket, { WebSocketServer } from 'ws';
/**
 * Server to establish connection to client
 */
class myServer {
    express: express.Express;
    clients: client[] = [];
    client_count: number = 0;
    wss: WebSocketServer | undefined; // webSocketServer
    port: number;
    /**
     * Creates an server instance
     * @param express express application
     */
    constructor(port: number) {
        this.port = port;
        this.express = express();
        this.express.use(express.urlencoded({ extended: true }));
        this.express.use(express.json());
        this.express.post('/d', async (req) => {
            console.log(req.body)
        });
    }
    public listen(port: number) {
        const server = this.express.listen(port);
        this.setUpWSS(server); // setup WSS using server made by express
        }
    public app(): express.Express {
        return this.express;
    }
    private setUpWSS(server: Server) {
        // setup webSocket Server
        this.wss = new WebSocketServer({server})
        this.wss.on('connection', function connection(ws) {
            ws.on('error', console.error);
            ws.on('message', function message(data: any) {
                try {
                    const message = JSON.parse(data);
                    // TODO - insert logic here about validating data
                    console.dir(message, { depth: null });
                } catch (error) {
                    console.log('recieved data but failed to parse as JSON: %s', data);
                }
            });
            ws.send(JSON.stringify({ message: 'something'}));
            
            const intervalId = setInterval(() => {
                ws.send(JSON.stringify({ time: new Date().toISOString(), message: 'Periodic Update' }));
            }, 5000);

            ws.on('close', (event: any) => {
                console.log('client disconnected');
                clearInterval(intervalId);
            });
        });
    }
    public getWSS() {
        return this.wss;
    }
    public async get(text?: string) {
        this.express.get('/', async (req, res) => {
            // no duplicate client
            if (this.clients.find((c) => c.hostname === (req.ip ?? 'unknown').toString())) {
                res.send(
                    `
                    <html>
                    <head><title>Server is running</title></head>
                    <body><h1>Server is running</h1></body>
                    You have already connected as a client.
                    <ul>
                    ${this.clients.map((c) => `<li>${c.id} at ${c.hostname}:${c.port}</li>`).join('')}
                    </ul>
                    </html>
                    `
                );
                return;
            }
            // TODO make it so that only when a client visits the page does it count as being added
            this.client_count++;
            this.clients.push(new client(this.port-1, (req.ip ?? 'unknown').toString(), `client_${this.client_count}`));
            res.send(
                `
                <html>
                <head><title>Server is running</title></head>
                <body><h1>Server is running</h1></body>
                You are the <count>${this.client_count}</count>th client to attempt toconnect.
                ${text ? `<p>${text}</p>` : ''}
                client list:
                <ul>
                ${this.clients.map((c) => `<li>${c.id} at ${c.hostname}:${c.port}</li>`).join('')}
                </ul>
                </html>
                `
            );
        });
        
    }
    /**
     * DONT RUN THIS ON A NETWORK THAT CARES LIKE THE ONE YOU ARE ON PROBABLY RIGHT NOW.
     * it looks sus.
     * @param oct1 
     * @param oct2 
     * @param oct3 
     * @param oct4 
     * @param port 
     */
    public scanForClients(oct1: number, oct2: number, oct3:number, oct4:number, port: number) {
        for (let i = oct4;i < 255; i++) {
            const ip = `${oct1}.${oct2}.${oct3}.${i}`;
            console.log(`Scanning ${ip}:${port}`);
            fetch(`http://${ip}:${port}/`).then((res) => {
                if (res.ok) {
                    console.log(`Client found at ${ip}:${port}`);
                    this.clients.push(new client(port, ip, `client_${this.clients.length + 1}`));
                }
            }).catch((err) => {
                console.log(`No client at ${ip}:${port}`);
            });
        }
    }
}
import { Server } from 'http';
/**
 * Client to connect to central server
 */
class client {
    id: string;
    port: number;
    hostname: string;
    server: express.Express;
    main_server_addr: string;
    manager: manager = new manager();
    http_server: Server | undefined; // used to close server made by express
    websocket: socket | undefined; // after conn established use this
    found: boolean = false;
    /**
     * Setup basic communication protocol between client and server
     * By default sets up an api for accessing information about a client non persistantly.
     * @param port assume the server is running at +1 of the port specificied here for the client
     * @param hostname the hostname of the server
     * @param id the id of the client
     */
    constructor(port: number, hostname: string, id:string) {
        this.port = port;
        this.hostname = hostname;
        this.main_server_addr = `http://${hostname}:${port+1}`;
        this.id = id;
        this.server = express();
        this.found = this.hostname ? true : false;
        if (this.found) {
            this.socket();
            return; // don't setup server if main server found
        }
        this.server.get('/', (req, res) => {
            if (this.found) return; // dont send if already found
            res.send(`
            <html>
            <head><title>Client ${this.id} is running</title></head>
            <body><h1>Client ${this.id} is running</h1>
            <ip>${this.hostname}:${this.port}</ip>
            <reqip>${req.ip ?? 'unknown'}</reqip>
            </body>
            </html>
            `);
            this.hostname = req.ip ?? "";
            this.main_server_addr = `http://${this.hostname ?? 'unknown'}:${this.port+1}`; // assume server is on port + 1
            this.found = true; // TODO - add validation that it was found by our server and not something else
            this.close();
            this.socket();
        });
        this.server.get('/sys-info', async (req, res) => {
            res.json(
                {
                    memory: {
                        total: {bytes: systemInfo.getTotalMemory(), gb: systemInfo.getTotalMemory()/ Math.pow(1024, 3)},
                        free: {bytes: systemInfo.getFreeMemory(), gb: systemInfo.getTotalMemory() / Math.pow(1024, 3)}
                    },
                    os:systemInfo.getOS(),
                    storage:systemInfo.getStorage()
                }
            );
        });
        this.server.get('/sys-approve-program', async (req, res) => {
            const programs = req.body.program;
            programs.forEach((element: string) => {
                this.manager.approve_program(element);
            });
        });
        this.server.get('/sys-directive', async (req, res) => {
            // start execution of logic
        });
    }
    /**
     * @returns returns the manager instance for this client
     */
    public getManager() {
        return this.manager;
    }
    /**
     * @returns returns the http server created by listen
     */
    public listen() {
        return this.server.listen(this.port, () => {
            console.log(`Client ${this.id} listening on port ${this.port}`);
        });
    }
    /**
     * Calling this will make the sys-info api unavaible 
     * (the server should be replaced with a websockets connection)
     * Closes the server if the server was open to begin with.
     */
    public close() {
        this.http_server?.close();
    }
    public async sendMessageToServer(msg: string) {
        const data = {
            client_id: this.id,
            auth: "reserved for later use",
            storage: "reserved for later use",
            msg: msg
        };

        const params = new URLSearchParams();

        for (const key in data) {
            params.append(key, (data as unknown as Record<string, string>)[key]); // All values treated as strings
        }
        
        await fetch(`${this.main_server_addr}/d`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: JSON.stringify(data)
        });
    }
    /**
     * Start up websocket connection
     */
    public socket() {
        this.websocket = new socket(this.hostname, this.port+1); // assume sever is at port + 1
        this.websocket.setUpWS(this.id);
    }
}
import { error } from 'console';
/**
 * Creates a websocket to be used for client - server persistant communications
 */
class socket {
    ws: WebSocket;
    constructor(addr: string, port: number ) {
        const url = ipInfo.formatHostForWS(addr, port);
        console.log(url);
        this.ws = new WebSocket(url); // replace http with ws
    }
    /**
     * 
     * @param client_id
     */
    public setUpWS(client_id: string) {
        this.ws.addEventListener('open', (event: any) => {
            console.log('WS conn established!');
            this.ws.send(JSON.stringify({message: "Hello Server"}));
        });
        this.ws.addEventListener('close', (event: any) => {
            console.log('WS conn closed:', event.code, event.reason);
        });
        this.ws.addEventListener('error', (error: any) => {
            console.log('WS conn error:', error);
            this.ws.send(JSON.stringify({message: "Error with message", recieved:error}));
        });
        this.ws.addEventListener('message', async (event: any) => {
            try {
                const message = JSON.parse(event.data);
                console.log('WS message recieved:', message);
                if (message.message === 'Periodic-Update') throw error; // not a periodic update request
                const installed_programs = await systemInfo.getInstalledPrograms()
                this.ws.send(JSON.stringify(
                    {
                        client_id: client_id,
                        time: new Date().toISOString(),
                        message: 'Periodic-Update-response',
                        sys:{
                            memory: {
                            total: {bytes: systemInfo.getTotalMemory(), gb: systemInfo.getTotalMemory()/ Math.pow(1024, 3)},
                            free: {bytes: systemInfo.getFreeMemory(), gb: systemInfo.getTotalMemory() / Math.pow(1024, 3)},
                            os:systemInfo.getOS(),
                            storage:systemInfo.getStorage()
                        },
                        data: installed_programs
                        }
                    }
                ));
            } catch (error) {
                console.log('WS message recieved, but failed to validate:', event.data);
            } 
        });
    }
    public getWS() {
        return this.ws;
    }
}
import { networkInterfaces } from 'os';
import net from 'net';
class ipInfo {
    ip: string;
    constructor() {
        this.ip = this.getDeviceIP();
    }    
    private getDeviceIP(): string {
        const interfaces = networkInterfaces();
        let x = { address: '', family: '', mac: '', netmask: '' };
        for (const interfaceName in interfaces) {
        const addresses = interfaces[interfaceName] || [];
        addresses.forEach((address) => {
            if (address.family === 'IPv4' && !address.internal) {
            x = address;
            }
        });
        }
        return x.address;
    }
    public getLocalPrefix(): number[] {
        const parts = this.ip.split('.').map((part) => parseInt(part, 10));
        // 10.0.0.x - 10.255.255.x
        if (parts[0] === 10) return [parts[0],parts[1], parts[2]]; // [1-2] subnet? (I think thats the word)
        // 172.16.0.x - 172.31.0.x - 172.16.255.x - 172.31.255.x
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return [parts[0], parts[1], parts[2]]; // [2] subnet? (I think thats the word)
        // 192.168.x.x
        if (parts[0] === 192 && parts[1] === 168) return [parts[0], parts[1], parts[2]]; // [2] subnet? (I think thats the word)
        // error
        return [0,0,0,0];
    }
    static formatHostForWS(addr: string, port: number) {
    if (net.isIPv6(addr)) {
        return `ws://[${addr}]:${port}`;
    }
    return `ws://${addr}:${port}`;
}
}

/**
 * Mange installed on clients
 */
class manager {
    approved_programs: string[];
    client_programs: Map<string, string[]>;
    constructor() {
        this.approved_programs = [];
        this.client_programs = new Map();
    }
    /**
     * T
     * @param program 
     */
    public approve_program(program: string) {
        this.approved_programs.push(program);
    }
    /**
     * T
     * @param program 
     */
    public revoke_program(program: string) {
        this.approved_programs = this.approved_programs.filter((p) => p !== program);
    }
    /**
     * T
     * @param program 
     */
    public assign_program(client_id: string, program: string) {
        if (!this.client_programs.has(client_id)) {
            this.client_programs.set(client_id, []);
        }
        this.client_programs.get(client_id)?.push(program);
    }
    /**
     * T
     * @param program 
     */
    public get_client_programs(client_id: string): string[] | undefined {
        return this.client_programs.get(client_id);
    }
    /**
     * T
     * @param program 
     */
    public get_approved_programs(): string[] {
        return this.approved_programs;
    }
    /**
     * T
     * @param program 
     */
    public is_program_approved(program: string): boolean {
        return this.approved_programs.includes(program);
    }
}
import fs from 'fs/promises';
/**
 * Custom minimal database
 */
class db {
    database: string; // this should be a file path
    payload: string;
    constructor(database: string) {
        this.database = `${database}`;
        this.payload = "";
        
        
    }
    public async init_schema() {
        fs.appendFile(this.database, ""); // create file if not exists
        const line = new entry("logger", "db_log", "init");
        await this.store_entry(line);
    }
    public async store_entry(line: entry) {
        // load file
        await this.loadFile();
        // insertition logic
        this.payload = this.payload.replaceAll(line.as_string(), ""); // remove dups
        this.payload += line.as_string(); // add entry
        // commit changes
        await this.commit_entry();
    }
    private async commit_entry() {
        await fs.writeFile(this.database, this.payload);
    }
    private async loadFile(query?: boolean) {
        const data = await fs.readFile(this.database).then((data) => data.toString());
        if (query === true) return data; // return for query
        this.payload = data; // Load into payload
    }
    /**
     * selects entries from db
     * @returns database entries
     */
    public async select(table?: string): Promise<entry[]> {
        
        const results = await this.loadFile(true).then((data) => {
            const lines = (data || "").split("\n").filter((line) => line.trim().length > 0 && (table ? line.includes(`:${table}:`) : true));
            return lines.map((line) => {
                const content = line.slice(1, -1).split(":");
                return new entry(content[0], content[1], content[2].split("***"));
            });
        });

        return results;
    }
}
/**
 * Entry format helper for db class
 */
class entry {
    id: string;
    table: string;
    data: string | string[];
    constructor(id: string, table: string, data: string | string[]) {
        this.id = id;
        this.table = table;
        this.data = data;
    }
    public as_string() {
        return `<${this.id}:${this.table}:${Array.isArray(this.data) ? this.data.join("***") : this.data.replaceAll(" ", "***")}>\n`;
    }
}
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
interface InstalledProgram {
    key: string;
    DisplayName?: string;
    DisplayVersion?: string;
    Publisher?: string;
    InstallLocation?: string;
    [key: string]: string | undefined;
}
/**
 * class contains functions that gather system information
 */
class systemInfo {
    
    /**
     * 
     * @returns operating system name
     */
    public static getOS() {
        return os.type();
    }
    /**
     * 
     * @returns free memory in bytes
     */
    public static getFreeMemory() {
        return os.freemem();
    }
    /**
     * 
     * @returns total memory in bytes
     */
    public static getTotalMemory() {
        return os.totalmem();
    }
    /**
     * Not implemented yet
     * @returns a message saying its not implemented
     */
    public static getStorage() {
        return "not yet implemented";
    }
    /**
     * 
     */
    public static async getInstalledPrograms(): Promise<InstalledProgram[]> {
        try {
            const { stdout } = await execAsync(
                'reg query HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s'
            );

            const blocks = stdout
                .split(/\r?\n\r?\n/)     // split by blank lines
                .map(b => b.trim())
                .filter(b => b.length > 0);

            const programs: InstalledProgram[] = [];

            for (const block of blocks) {
                const lines = block.split(/\r?\n/);

                const entry: InstalledProgram = { key: lines[0] };

                for (const line of lines.slice(1)) {
                    const match = line.trim().match(/^(\S+)\s+REG_\S+\s+(.*)$/);
                    if (match) {
                        const [, name, value] = match;
                        entry[name] = value;
                    }
                }

                if (entry.DisplayName) {
                    programs.push(entry);
                }
            }

            return programs;

        } catch (err) {
            console.error("Failed to read installed programs:", err);
            return [];
        }
    }
}
/**
 * testing stuff
 */
async function main() {
    
}
async function host_client() {
    const PORT = 45697; // should be one less than server port
    // client
    const client_device = new client(PORT, "localhost", "localhost");
    const http_server = client_device.listen(); // get the underlying http server
}
async function host_server() {
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
}
// main();
export { myServer, client, manager, db, entry, ipInfo };