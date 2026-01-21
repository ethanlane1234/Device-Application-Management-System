import { promises as fs } from 'fs';

export async function getFileTree(path, relativePath = '') {
    const entries = await fs.readdir(path, { withFileTypes: true });
    const children = await Promise.all(entries.map(async (entry) => {
        
        const fullPath = `${path}/${entry.name}`;
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        try {
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
        } catch (error) { // this lowkey bypasses permissions errors
            return {
                name: entry.name,
                type: 'access_denied',
                path: relPath
            }
        }
    }));
    return children;
}