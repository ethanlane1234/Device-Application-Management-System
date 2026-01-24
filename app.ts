import express from 'express';

/**
 * Server to establish connection to client
 */
class myServer {
    express: express.Express;
    clients: client[] = [];
    client_count: number = 0;
    /**
     * Creates an server instance
     * @param express express application
     */
    constructor() {
        this.express = express();
        this.express.use(express.urlencoded({ extended: true }));
        this.express.use(express.json());
        this.express.post('/d', async (req) => {
            console.log(req.body)
        });
    }
    public listen(port: number) {
        this.express.listen(port);
    }
    public app(): express.Express {
        return this.express;
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
            this.client_count++;
            this.clients.push(new client(45697, (req.ip ?? 'unknown').toString(), `client_${this.client_count}`));
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
    constructor(port: number, hostname: string, id:string) {
        this.port = port;
        this.hostname = hostname;
        this.main_server_addr = `http://${hostname}:${port+1}`;
        this.id = id;
        this.server = express();
        this.server.get('/', (req, res) => {
            res.send(`
            <html>
            <head><title>Client ${this.id} is running</title></head>
            <body><h1>Client ${this.id} is running</h1>
            <ip>${this.hostname}:${this.port}</ip>
            <reqip>${req.ip ?? 'unknown'}</reqip>
            </body>
            </html>
            `);
            this.main_server_addr = `http://${req.ip ?? 'unknown'}:${this.port+1}`; // assume server is on port + 1
        });
    }
    public listen() {
        this.server.listen(this.port, () => {
            console.log(`Client ${this.id} listening on port ${this.port}`);
        });
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
}
import { networkInterfaces } from 'os';
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
/**
 * testing stuff
 */
async function main() {
    const a = new db('./.db');
    a.init_schema();
    const x = new entry("app", "installs", "data2s.sql word.txt beans java script mirror.ts");
    await a.store_entry(x);
    console.log(await a.select(""));
}
// main();
export { myServer, client, manager, db, entry, ipInfo };