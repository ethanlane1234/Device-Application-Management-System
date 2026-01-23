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
/**
 * Custom minimal database
 */
class db {
    database: string;
    file: File;
    constructor(database: string, file: File) {
        this.database = database;
        this.file = file;
    }
}