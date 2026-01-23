import express from 'express'; 

/**
 * An class to distinguish an express app from Function type
 */
class expressApp {
    express: Function
    constructor() {
        this.express = express();
    }
}
/**
 * Server to establish connection to client
 */
class myServer {
    app: expressApp;
    /**
     * Creates an server instance
     * @param app express application
     */
    constructor(express: expressApp) {
        this.app = express;
    }
}
/**
 * Client to connect to central server
 */
class client {
    id: string;
    port: number;
    hostname: string;
    constructor(port: number, hostname: string, id:string) {
        this.port = port;
        this.hostname = hostname;
        this.id = id;
    }
}
/**
 * Mange installed on clients
 */
class manager {
    constructor() {

    }
}
import fs from 'fs/promises';
/**
 * Custom minimal database
 */
class db {
    database: string;
    payload: string;
    constructor(database: string) {
        this.database = `./${database}`; // make database a path
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
    private async loadFile() {
        this.payload = await fs.readFile(this.database).then((data) => data.toString());
        console.log(this.payload)
    }
}
/**
 * Entry format helper for db class
 */
class entry {
    id: string;
    table: string;
    data: string;
    constructor(id: string, table: string, data: string) {
        this.id = id;
        this.table = table;
        this.data = data;
    }
    public as_string() {
        return `<${this.id}:${this.table}:${this.data.replace(" ", "***")}>\n`;
    }
}
async function main() {
    const a = new db('./database.db');
    a.init_schema();
    const x = new entry("app", "installs", "data2s");
    await a.store_entry(x);
}
main();