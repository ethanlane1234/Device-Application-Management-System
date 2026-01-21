import { promises as fs } from 'fs';
import { get } from 'http';

// get file structure

export async function getFileStructure(path) {
    const entries = await fs.readdir(path, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
        const fullPath = `${path}/${entry.name}`;
        if (entry.isDirectory()) {
            return { name: entry.name, type: 'directory', path: fullPath };
        } else {
            return { name: entry.name, type: 'file', path: fullPath };
        }
    }));
    return files;
}

export async function getAllFiles(path) {
    let allFiles = [];
    const entries = await fs.readdir(path, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = `${path}/${entry.name}`;
        if (entry.isDirectory()) {
            allFiles = allFiles.concat(await getAllFiles(fullPath));
        } else {
            allFiles.push(fullPath);
        }
    }
    return allFiles;
}

export async function getFileTree(path, relativePath = '') {
    const entries = await fs.readdir(path, { withFileTypes: true });
    const children = await Promise.all(entries.map(async (entry) => {
        const fullPath = `${path}/${entry.name}`;
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            return {
                name: entry.name,
                type: 'directory',
                path: relPath,
                children: await getFileTree(fullPath, relPath)
            };
        } else {
            return {
                name: entry.name,
                type: 'file',
                path: relPath
            };
        }
    }));
    return children;
}