/* ################### NETWORKING LEVEL ################### */
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
    db: db = new db('./.db');
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
        // init db
        this.db.init_schema();
        const line: entry = new entry("server_id", "db_log","init_server");
        this.db.store_entry(line);
    }
    /**
     * Start listening for connections to the server on a specified port
     * @param port port to listen on
     */
    public listen(port: number) {
        const server = this.express.listen(port);
        this.setUpWSS(server); // setup WSS using server made by express
        }
    public app(): express.Express {
        return this.express;
    }
    /** 
     * @returns database associated with server instance
     */
    public getdb() {
        return this.db;
    }
    private setUpWSS(server: Server) {
        // store vars to access in wss
        const db = this.db;
        // setup webSocket Server
        this.wss = new WebSocketServer({server})
        this.wss.on('connection', function connection(ws) {
            ws.on('error', console.error);
            ws.on('message', function message(data: any) {
                try {
                    const message = JSON.parse(data);
                    // TODO - insert logic here about validating data
                    const programs: entry = new entry(message.client_id, message.table, JSON.stringify(message));
                    console.log("message recieved for table %s", message.table);
                    db.store_entry(programs);                    
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
            this.ws.send(JSON.stringify({client_id: client_id, table:"hello", message: "Hello Server", sys:"VOID", data:"VOID"}));
        });
        this.ws.addEventListener('close', (event: any) => {
            console.log('WS conn closed:', event.code, event.reason);
        });
        this.ws.addEventListener('error', (error: any) => {
            console.log('WS conn error:', error);
            this.ws.send(JSON.stringify({client_id: client_id, table:"error", message: "Error with message", sys:"VOID", data: error}));
        });
        this.ws.addEventListener('message', async (event: any) => {
            try {
                const message = JSON.parse(event.data);
                console.log('WS message recieved:', message);
                if (message.message === 'Periodic-Update') throw error; // not a periodic update request
                const installed_programs = await systemInfo.getInstalledPrograms();
                const disk_info = await systemInfo.getDiskInfo();
                this.ws.send(JSON.stringify(
                    {
                        client_id: client_id, 
                        table:"programs",
                        time: new Date().toISOString(),
                        message: 'Periodic-Update-response',
                        sys:{
                            memory: {
                            total: {bytes: systemInfo.getTotalMemory(), gb: systemInfo.getTotalMemory()/ Math.pow(1024, 3)},
                            free: {bytes: systemInfo.getFreeMemory(), gb: systemInfo.getTotalMemory() / Math.pow(1024, 3)},
                            disk: systemInfo.getDiskInfo(),
                            os: systemInfo.getOS(),
                            storage: disk_info
                            },
                        },
                        data: installed_programs
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
    public static getIP() {
        return new ipInfo().getIp()
    }    
    public getIp() {
        return this.ip;
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
    /**
     * Attempts to find the local IP prefix for the network the server is on.
     * @returns 
     */
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
    /**
     * formats a proper websocket address for both IPv4 and IPv6
     * @param addr 
     * @param port 
     * @returns websocket address
     */
    static formatHostForWS(addr: string, port: number) {
    if (net.isIPv6(addr)) {
        return `ws://[${addr}]:${port}`;
    }
    return `ws://${addr}:${port}`;
}
}
/* ################### SYSTEM LEVEL ################### */
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
        let newFile = "";
        const key = line.as_key();

        const lines = this.payload
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l.length > 0); // remove empties

        for (const l of lines) {
            const line_key = l.split(":").slice(0,2).join(":") + ":";
            if (line_key !== key) {
                newFile += l + "\r\n";
            }
        }

        newFile += line.as_string(); // already ends with newline
        this.payload = newFile; // replace file with updated values
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
    public as_string(): string {
        return `<${this.id}:${this.table}:${Array.isArray(this.data) ? this.data.join("***") : this.data.replaceAll(" ", "***")}>\n`;
    }
    public as_key(): string {
        return `<${this.id}:${this.table}:`;
    }
}
import os from 'os';
import { ChildProcess, exec } from 'child_process';
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
     * Use getDiskInfo as alternative
     * @returns a message saying its not implemented
     */
    public static getStorage() {
        return "not yet implemented";
    }
    /**
     * T
     * @returns 
     */
    public static async getDiskInfo() {
        try {
            const { stdout } = await execAsync(
                `powershell "Get-CimInstance Win32_DiskDrive | Select-Object Model, SerialNumber, Size | ConvertTo-Json -Depth 4"`
            );
            let disks = JSON.parse(stdout.trim());

            if (!Array.isArray(disks)) {
                disks = [disks];
            }

            return disks.map((d: any) => ({
                object_model: d.Model?.trim() ?? null,
                serialNumber: d.SerialNumber?.trim() ?? null,
                size: d.Size ? Number(d.Size) : null
            }));
        } catch (err) {
            console.error("failed to read disk:", err);
            return [];
        }
    }
    /**
     * gets installed programs 
     * (NOTE - this only works for windows devices)
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
/* ################### CONFIGURATION/SETUP LEVEL ################### */
import { input, select } from '@inquirer/prompts';
/**
 * Wizard for setting up environment
 */
class setupHelper {
    private static async setUpCLI(level: number) {
        // cancel
        if (level < 0) return {type:"", url: ""};
        // quick setup
        const $type = await select({
        message: 'Choose Wether this is a client device or the server:',
        choices: [
            {
            name: 'Client Device',
            value: '--client',
            description: 'Managed by server'
            },
            {
            name: 'Server Device',
            value: '--server',
            description: 'Manages client devices'
            }
        ],
        });
        const $question1 = $type === '--client' ?
        await select({
        message: 'Choose wether you know the IP of the device the server is hosted on:',
        choices: [
            {
            name: 'Yes',
            value: 'Y',
            description: 'yes'
            },
            {
            name: 'No',
            value: 'N',
            description: 'no'
            }
        ],
        }) : "";
        const host: string = $question1 === 'Y' ? "--client_hostname=" : "--client_hostname=";
        const url: string  = await input({ message: 'Enter the hostname/IP of server' });
        const $url: string = host+url;
        console.log($url)
        if (level < 1) return {type: $type, url:$url};
        // advanced setup
        const $SERVER_STARTUP_MSG: string = await input({ message: 'Enter server startup message' });
        const $PERIODIC_UPDATE: string = await select({
        message: 'Choose interval for sending bluk info to server:',
        choices: [
            {
            name: '1 second',
            value: "--periodic_update_time_msec=1000",
            description: '1 second | 1000 miliseconds'
            },
            {
            name: '5 seconds',
            value: "--periodic_update_time_msec=5000",
            description: '5 seconds | 5000 miliseconds'
            },
            {
            name: '10 seconds',
            value: "--periodic_update_time_msec=10000",
            description: '10 seconds | 10000 miliseconds'
            },
            {
            name: '15 seconds',
            value: "--periodic_update_time_msec=15000",
            description: '15 seconds | 15000 miliseconds'
            },
            {
            name: '30 seconds',
            value: "--periodic_update_time_msec=30000",
            description: '30 seconds | 30000 miliseconds'
            }, 
        ],
        })
        
        if (level < 2) return {type: $type, url:$url, SERVER_STARTUP_MSG:$SERVER_STARTUP_MSG, PERIODIC_UPDATE:$PERIODIC_UPDATE};
        // manual setup
        const $DUO_MODE: string = await select({
        message: 'Run Server in DUO mode (no effect if running a client):',
        choices: [
            {
            name: 'yes',
            value: "--duo_mode",
            description: 'yes'
            },
            {
            name: 'no',
            value: "",
            description: 'no'
            }
        ],
        })
        return {
            type: $type, 
            url:$url, 
            SERVER_STARTUP_MSG:$SERVER_STARTUP_MSG,
            PERIODIC_UPDATE:$PERIODIC_UPDATE, 
            DUO_MODE: $DUO_MODE};
    }
    private static async write($type?: string, $url?:string, $SERVER_STARTUP_MSG?: string, $PERIODIC_UPDATE?: string, $DUO_MODE?: string) {
        await fs.writeFile('./app-config.json', JSON.stringify(
            {
                type: $type,
                url: $url,
                SERVER_STARTUP_MSG: $SERVER_STARTUP_MSG,
                PERIODIC_UPDATE: $PERIODIC_UPDATE,
                DUO_MODE:$DUO_MODE
            }
        ));
    }
    /**
     * Quick option for minimal setup and fastest setup (mostly automated)
     * WORK IN PROGRESS
     */
    public static async fastSetupCLI() {
        const config_values = await this.setUpCLI(0);
        await this.write(config_values?.type, config_values?.url);
    }
    /**
     * placeholder for setup with more options and buttons to customize (lot of control)
     * WORK IN PROGRESS
     */
    public static async advancedSetupCLI() {
        const config_values = await this.setUpCLI(1);
        await this.write(config_values?.type, config_values?.url, config_values?.SERVER_STARTUP_MSG, config_values?.PERIODIC_UPDATE);        
    }
    /**
     * place holder until until I get to having an interface to set all possible options (full control)
     * WORK IN PROGRESS
     */
    public static async manualSetupCLI() {
        const config_values = await this.setUpCLI(2);
        await this.write(config_values?.type, config_values?.url, config_values?.SERVER_STARTUP_MSG, config_values?.PERIODIC_UPDATE, config_values?.DUO_MODE);
    }
}
/**
 * class for manipulating args from the process namesapce
 */
class argParser {
    /**
     * T
     * @returns 
     */
    public static parseArgs() {
        const args: Record<string, string | boolean> = {};
        const raw = process.argv.slice(2);

        for (let i = 0; i < raw.length; i++) {
            const el = raw[i];

            // Case: --key=value
            if (el.includes("=")) {
                const [key, value] = el.split("=");
                args[key] = value;
                continue;
            }

            // Case: --key value
            if (el.startsWith("--")) {
                const key = el;
                const next = raw[i + 1];

                if (next && !next.startsWith("--")) {
                    args[key] = next;
                    i++;
                } else {
                    args[key] = true;
                }

                continue;
            }
        }

        return args;
    }
}
/* ################### RUN LEVEL ################### */
/**
 * Start Quick Application Managemetn System (QAMS)
 * @argument --server (runs server application)
 * @argument --client (runs client application. This is enabled by default)
 * (if both --server and --client are present, --server superceeds --client)
 * @argument --config (runs setup wizard superceeding all above arguments)
 */
async function main() {
    if (process.argv.includes('--config')) {
        run_setup_wizard();
        return ;
    }
    run();
    return ;
}
/**
 * Runs Device application management system and applies args
 * @returns void
 */
function run() {
    // arg parser
    const ARGS = argParser.parseArgs();
    console.log(ARGS)
    // server args
    const SERVER_PORT: number = parseInt(String(ARGS["--port"])) || 45698;
    const SERVER_HOSTNAME: string = String(ARGS["--server_hostname"]) || "localhost";
    const SERVER_STARTUP_MSG: string = String(ARGS["--start_server_msg"]) || "cool beans";
    const SCAN_FOR_CLIENTS: boolean = ARGS["--port_scan_for_clients"] ? true : false;
    const PERIODIC_UPDATE_TIME_MSEC: number = parseInt(String(ARGS["--periodic_update_time_msec"])) || 5000; // NYI
    const DUO_MODE: boolean = ARGS["--duo_mode"] ? true : false; // NYI

    // client args
    const CLIENT_PORT = parseInt(String(ARGS.client_port)) || 45697;
    const CLIENT_HOSTNAME = String(ARGS["--client_hostname"]) || "";
    const CLIENT_ID = ARGS["--client_id"] || ipInfo.getIP() || "localhost";
    
    // launch application
    process.argv.includes('--server') ? host_server(SERVER_PORT, SERVER_HOSTNAME, SERVER_STARTUP_MSG, SCAN_FOR_CLIENTS, DUO_MODE) : host_client(CLIENT_PORT, CLIENT_HOSTNAME, CLIENT_ID);
    return ;
}
/**
 * Runs application as a client
 */
function host_client(client_port: number, client_hostname: string, client_id: string) {
    console.log({CLIENT_PORT:client_port, CLIENT_HOSTNAME:client_hostname, CLIENT_ID:client_id})
    const PORT = client_port; // should be one less than server port
    // client
    const client_device = new client(PORT, client_hostname, client_id);
    const http_server = client_device.listen(); // get the underlying http server
    console.log('client active ✅');
    
    
}
/**
 * Runs application as a server
 */
function host_server(server_port: number, server_hostname: string, server_startup_msg: string, scan_for_clients: boolean, duo_mode: boolean) {
    console.log({server_port:server_port, server_hostname: server_hostname, server_startup_msg: server_startup_msg, scan_for_clients:scan_for_clients, DUO_MODE: duo_mode})
    // server setup
    const PORT = server_port;
    const server = new myServer(PORT); // abstraction
    const app = server.app(); // express itself
    server.get(server_startup_msg); // message seen on server conn get(/) page
    // scan for clients
    const IP_SCAN_RANGE = new ipInfo().getLocalPrefix();
    // port scan LAN for clients
    if (scan_for_clients) {
        console.log(`address in block ${IP_SCAN_RANGE[0]}.${IP_SCAN_RANGE[1]}.${IP_SCAN_RANGE[2]}.1 - 255`);
        server.scanForClients(IP_SCAN_RANGE[0], IP_SCAN_RANGE[1], IP_SCAN_RANGE[2], 1, PORT);
    }
    // start listening for conns to server
    server.listen(PORT);
    console.log('server active ✅');
    // duo mode opt
    duo_mode ? exec(`start cmd /k "node app.ts "client_port=${server_port-1}" "client_hostname="localhost""`) && console.log("duo mode active: local client active ✅") : null;
}
import { readFileSync } from 'fs';
/**
 * Configures setup application setup through interfaces
 * pushing agruments into argv to modify application behavior
 * (so user does not have to interact with the code or type arguments manually)
 * @returns void
 */
async function run_setup_wizard() {
    if (process.argv.includes('--qs')) {
        // setup CLI
        await setupHelper.fastSetupCLI(); 
        console.log('app initalized...');
        const data = JSON.parse(readFileSync('./app-config.json', 'utf8'));
        // push args to argv
        Object.entries(data).forEach((el: [string, unknown], a: number) => {
            process.argv.push(String(el[1]));
       });
       console.log(process.argv)
       // run application
        run();
        return ;
    }
    if (process.argv.includes('--as')) {
        // setup CLI
        await setupHelper.advancedSetupCLI(); 
        console.log('app initalized...');
        const data = JSON.parse(readFileSync('./app-config.json', 'utf8'));
        // push args to argv
        Object.entries(data).forEach((el: [string, unknown], a: number) => {
            process.argv.push(String(el[1]));
        });
       console.log(process.argv)
       // run application
       run();
       return ;
    }
    if (process.argv.includes('--ms')) {
        // setup CLI
        await setupHelper.manualSetupCLI();
        console.log('app initalized...');
        const data = JSON.parse(readFileSync('./app-config.json', 'utf8'));
        // push args to argv
        Object.entries(data).forEach((el: [string, unknown], a: number) => {
            process.argv.push(String(el[1]));
       });
       console.log(process.argv);
       // run application
       run();
       return ;
    }
    console.log('setup mode not specified, use --qs, --as, --ms with --config\nExiting...');
    return ;
}
main(); // run application
export { myServer, client, manager, db, entry, ipInfo };