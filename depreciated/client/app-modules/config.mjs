import { getFileTree } from "./files.mjs";
/**
 * Settings to be applied to the app
 * @param {*} app 
 */
function settings(app) {
    app.set('view engine', 'ejs'); // use ejs template engine
}
/**
 * middleware to be applied to the app
 * @param {*} app 
 * @returns 
 */
function middleware(app) {
    // app.use();
    return 0;
}
/**
 * get and post reponse routes for the app
 * @param {*} app 
 * @param {*} path 
 * @returns 
 */
async function reponses(app, path) {
    let files = await getFileTree(path); // preload file structure
    // dashboard
    app.get('/', async (req, res) => {
        res.render('index' , { tree: files });
    });

    // update file structure
    app.post('update-files', async (req, res) => {
        files = await getFileTree(path);
        res.status(200);
    });

    start(app); // start app after the other stuff is done
    return 0;
}
/**
 * have the app start listening for requests
 * @param {*} app 
 * @returns 
 */
function start(app) {
    // listen for connections
    app.listen(80, () => {
        console.log('Server Ready!\nListening on http://localhost');
    });
    return 0;
}
/**
 * configure the express server
 */
export class Config {
    static setup(app, path="") {
        settings(app);
        middleware(app);
        reponses(app, path);
        return 0;
    }
}