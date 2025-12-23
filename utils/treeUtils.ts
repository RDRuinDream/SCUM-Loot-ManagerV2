
import { FileNode } from '../types';

/**
 * Flattens a tree of FileNodes into a single array of FileNodes.
 * Useful for searching or listing all files regardless of directory structure.
 */
export const flattenFileNodes = (nodes: FileNode[]): FileNode[] => {
    let result: FileNode[] = [];
    nodes.forEach(node => {
        result.push(node);
        if (node.kind === 'directory' && node.children) {
            result = result.concat(flattenFileNodes(node.children));
        }
    });
    return result;
};

/**
 * Finds a specific FileNode by its path within a tree of FileNodes.
 */
export const findFileNode = (nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
        if (node.path === path) return node;
        if (node.kind === 'directory' && node.children) {
            const found = findFileNode(node.children, path);
            if (found) return found;
        }
    }
    return null;
};
