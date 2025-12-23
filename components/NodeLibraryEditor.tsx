
import React, { useState, useMemo } from 'react';
import { LootNodeCard } from './visual/LootNodeCard';
import { ItemProbabilityBar } from './ItemProbabilityBar';
import { useI18n } from '../i18n';
import { RARITY_WEIGHTS } from '../types';
import { PlusIcon, FolderIcon, CubeIcon } from './Icons';

interface NodeLibraryEditorProps {
    data: any;
    onChange: (newData: any) => void;
}

export const NodeLibraryEditor: React.FC<NodeLibraryEditorProps> = ({ data, onChange }) => {
    const { t } = useI18n();
    const [selectedPath, setSelectedPath] = useState<number[]>([]);

    // --- Helpers to mutate tree ---
    const updateNodeByPath = (root: any, path: number[], updater: (node: any) => any): any => {
        if (path.length === 0) {
            return updater({ ...root });
        }
        const newRoot = { ...root };
        if (!newRoot.Children) newRoot.Children = [];
        const [currentIndex, ...restPath] = path;
        
        if (currentIndex >= 0 && currentIndex < newRoot.Children.length) {
            newRoot.Children = [...newRoot.Children]; // Copy array
            newRoot.Children[currentIndex] = updateNodeByPath(newRoot.Children[currentIndex], restPath, updater);
        }
        return newRoot;
    };

    const deleteNodeByPath = (root: any, path: number[]): any => {
        if (path.length === 0) return null; 
        
        const newRoot = { ...root };
        const parentPath = path.slice(0, -1);
        const targetIndex = path[path.length - 1];

        const parentUpdater = (node: any) => {
            if (!node.Children) return node;
            const newChildren = [...node.Children];
            newChildren.splice(targetIndex, 1);
            return { ...node, Children: newChildren };
        };

        return updateNodeByPath(newRoot, parentPath, parentUpdater);
    };

    const addChildToNode = (root: any, path: number[], isNode: boolean): any => {
        const updater = (node: any) => {
            const newChildren = node.Children ? [...node.Children] : [];
            if (isNode) {
                newChildren.push({ Name: "New Node", Rarity: "Common", Children: [] });
            } else {
                newChildren.push({ Name: "New_Item", Rarity: "Common" });
            }
            return { ...node, Children: newChildren };
        };
        return updateNodeByPath(root, path, updater);
    };

    // --- Derived State ---
    const resolveNode = (root: any, path: number[]) => {
        let current = root;
        for (const idx of path) {
            if (current && current.Children && Array.isArray(current.Children) && current.Children[idx]) {
                current = current.Children[idx];
            } else {
                return null;
            }
        }
        return current;
    };

    const selectedNode = useMemo(() => resolveNode(data, selectedPath) || data, [data, selectedPath]);

    // --- Handlers ---
    const handleSelect = (node: any, path: number[]) => {
        setSelectedPath(path);
    };

    const handleUpdate = (path: number[], field: string, value: any) => {
        const newData = updateNodeByPath(data, path, (node) => ({ ...node, [field]: value }));
        onChange(newData);
    };

    const handleDelete = (path: number[]) => {
        if (path.length === 0) return;
        if (confirm(t('common.confirmDelete'))) {
            const newData = deleteNodeByPath(data, path);
            onChange(newData);
            if (JSON.stringify(path) === JSON.stringify(selectedPath)) {
                 setSelectedPath([]);
            }
        }
    };

    const handleAddChild = (path: number[], isNode: boolean) => {
        const newData = addChildToNode(data, path, isNode);
        onChange(newData);
    };

    const handleAddRootChild = (isNode: boolean) => {
        const newData = addChildToNode(data, [], isNode);
        onChange(newData);
    };

    // --- Statistics Calculation (Recursive) ---
    const effectiveStats = useMemo(() => {
        if (!selectedNode) return undefined;

        const itemProbabilities: Map<string, number> = new Map();

        // Calculate probability of reaching each leaf item relative to selectedNode
        // currentP: probability of reaching 'node' assuming we are at 'selectedNode' (starts at 1.0)
        const distribute = (node: any, currentP: number) => {
            if (Array.isArray(node.Children) && node.Children.length > 0) {
                // Calculate total weight of children
                let totalW = 0;
                node.Children.forEach((child: any) => {
                    totalW += (RARITY_WEIGHTS[child.Rarity || 'Common'] || 0);
                });
                
                // If totalW is 0 (all ExtremelyRare or errors?), prevent division by zero
                if (totalW === 0) totalW = 1;

                node.Children.forEach((child: any) => {
                    const w = RARITY_WEIGHTS[child.Rarity || 'Common'] || 0;
                    const p = currentP * (w / totalW);
                    distribute(child, p);
                });
            } else if (!Array.isArray(node.Children)) {
                // Leaf Item
                // Just add its probability
                const name = node.Name || "Unknown";
                itemProbabilities.set(name, (itemProbabilities.get(name) || 0) + currentP);
            }
        };

        // If selectedNode is a Leaf, it's 100% itself
        if (!Array.isArray(selectedNode.Children)) {
             itemProbabilities.set(selectedNode.Name, 1.0);
        } else {
             distribute(selectedNode, 1.0);
        }

        if (itemProbabilities.size === 0) return undefined;

        return Array.from(itemProbabilities.entries())
            .map(([id, p]) => ({ id, percent: p * 100, rarity: 'Mix' }))
            .sort((a, b) => b.percent - a.percent);

    }, [selectedNode]); 

    return (
        <div className="flex h-full font-mono text-sm relative w-full overflow-hidden bg-[#0b1120]">
            <div className="flex-1 flex flex-col min-w-0 p-6 max-w-5xl mx-auto w-full">
                
                {/* Header & Stats */}
                <div className="mb-6 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_currentColor]"></span>
                            {t('library.title')} Editor
                        </h2>
                        
                        <div className="flex gap-2">
                            <button onClick={() => handleAddRootChild(true)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded-lg hover:bg-indigo-500 hover:text-white transition-all text-xs font-bold shadow-lg shadow-indigo-500/10 active:scale-95">
                                <FolderIcon className="w-3.5 h-3.5" /> New Group
                            </button>
                            <button onClick={() => handleAddRootChild(false)} className="flex items-center gap-2 px-3 py-1.5 bg-scum-accent/10 text-scum-accent border border-scum-accent/30 rounded-lg hover:bg-scum-accent hover:text-black transition-all text-xs font-bold shadow-lg shadow-scum-accent/10 active:scale-95">
                                <CubeIcon className="w-3.5 h-3.5" /> New Item
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-scum-900/50 rounded-xl border border-scum-700/50 p-1 backdrop-blur-sm">
                        <div className="p-3 border-b border-white/5 mb-3 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-400 flex items-center gap-2">
                                {t('editor.selected')}: 
                                {selectedNode ? (
                                    <span className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                        {selectedNode.Name}
                                    </span>
                                ) : (
                                    <span className="text-gray-600 italic">None</span>
                                )}
                            </span>
                            {selectedPath.length > 0 && (
                                <button onClick={() => setSelectedPath([])} className="text-[10px] text-indigo-400 hover:text-white transition-colors underline decoration-dotted">
                                    Show Root Stats
                                </button>
                            )}
                        </div>
                        <ItemProbabilityBar 
                            items={[]} 
                            type="Item"
                            customStats={effectiveStats}
                        />
                    </div>
                </div>

                {/* Tree View - Rendering Children Directly */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 animate-slide-up">
                    <div className="space-y-1">
                        {data.Children?.map((child: any, idx: number) => (
                            <LootNodeCard 
                                key={idx}
                                node={child} 
                                path={[idx]} 
                                onSelect={handleSelect} 
                                selectedPathStr={JSON.stringify(selectedPath)}
                                onUpdate={handleUpdate}
                                onDelete={handleDelete}
                                onAddChild={handleAddChild}
                            />
                        ))}
                        {(!data.Children || data.Children.length === 0) && (
                            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-800 rounded-xl text-gray-600">
                                <span className="text-4xl opacity-20 mb-2">📂</span>
                                <span className="text-sm">Library is empty</span>
                                <span className="text-[10px] mt-1">Add a group or item to start</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
