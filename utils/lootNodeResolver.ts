
import { ITEM_LOOT_TREE_NODES } from '../data/itemLootTreeNodes';
import { ScumJson } from '../types';

interface LootNode {
    Name: string;
    Rarity?: string;
    Children?: LootNode[];
    [key: string]: any;
}

const DEFAULT_ROOT = ITEM_LOOT_TREE_NODES;

/**
 * Finds a node by its dot-notation path (e.g. "ItemLootTreeNodes.Military.Weapons")
 * Robustly handles spaces and / separators.
 */
export const findNodeByPath = (path: string, rootNode: any = DEFAULT_ROOT): LootNode | undefined => {
    if (!path) return undefined;
    
    // Normalize: split by . or /, trim each part, remove empty parts
    const parts = path.split(/[\.\/]/).map(s => s.trim()).filter(s => s.length > 0);
    
    if (parts.length === 0) return undefined;

    // Start at root
    let currentNode: LootNode = rootNode as LootNode;
    const rootName = currentNode.Name || "ItemLootTreeNodes";

    // Handle root prefix logic
    let startIndex = 0;
    
    // Case-insensitive check for root name to be robust
    if (parts[0].toLowerCase() === rootName.toLowerCase()) {
        // If the path is ONLY the root name
        if (parts.length === 1) return currentNode;
        startIndex = 1; // Skip root name in path traversal to look into Children
    }

    for (let i = startIndex; i < parts.length; i++) {
        const part = parts[i];
        if (!currentNode.Children) return undefined;
        
        // Use case-insensitive matching for children names to avoid user casing errors
        const nextNode = currentNode.Children.find(c => c.Name.toLowerCase() === part.toLowerCase());
        if (!nextNode) return undefined;
        
        currentNode = nextNode;
    }
    
    return currentNode;
};

/**
 * Fallback: Finds a node by its Name anywhere in the tree (Depth-First Search)
 */
export const findNodeByNameRecursive = (root: LootNode, name: string): LootNode | undefined => {
    const cleanName = name.trim().toLowerCase();
    if (root.Name.toLowerCase() === cleanName) return root;
    if (root.Children) {
        for (const child of root.Children) {
            const found = findNodeByNameRecursive(child, name); // pass original name to recursive call, clean inside
            if (found) return found;
        }
    }
    return undefined;
};

/**
 * Collects all leaf items under a specific node
 */
export const getLeafItemsWithRarity = (node: LootNode): { Id: string, Rarity: string }[] => {
    const leaves: { Id: string, Rarity: string }[] = [];
    
    const traverse = (n: LootNode) => {
        if (!n.Children || n.Children.length === 0) {
            // It's a leaf (Item)
            leaves.push({ Id: n.Name, Rarity: n.Rarity || 'Common' });
        } else {
            n.Children.forEach(traverse);
        }
    };

    traverse(node);
    return leaves;
};

/**
 * Compatibility wrapper for simple string arrays
 */
export const getLeafItems = (node: any): string[] => {
    return getLeafItemsWithRarity(node as LootNode).map(i => i.Id);
};

/**
 * Main Resolver: Takes a Node ID (path or name) and returns list of items
 * 
 * Update: Now accepts an optional `overrides` map. If the nodeId exists in overrides,
 * it returns the items defined in that override file instead of searching the tree.
 */
export const resolveNodeToItems = (nodeId: string, rootNode: any = DEFAULT_ROOT, overrides?: Record<string, ScumJson>): { Id: string, Rarity: string }[] => {
    if (!nodeId) return [];

    // 1. Check for File Override (Loot/Nodes/Override/{nodeId}.json)
    if (overrides) {
        // Check for exact match or filename match
        const overrideData = overrides[nodeId];
        if (overrideData) {
            const items: { Id: string, Rarity: string }[] = [];
            // Extract items from the override file
            if (overrideData.Items && Array.isArray(overrideData.Items)) {
                items.push(...overrideData.Items.map(i => ({ 
                    Id: i.Id || i.Name || "Unknown", 
                    Rarity: i.Rarity || 'Common' 
                })));
            }
            // We could also resolve Subpresets here recursively if needed, 
            // but usually visualizer just wants the direct items of this node.
            return items;
        }
    }
    
    // 2. Try exact path resolution (Preferred)
    let node = findNodeByPath(nodeId, rootNode);
    
    // 3. Fallback: Search by unique name if path fails
    if (!node) {
        node = findNodeByNameRecursive(rootNode as LootNode, nodeId);
    }

    if (!node) return [];
    return getLeafItemsWithRarity(node);
};
