
import { FileNode } from '../types';

// --- Mock Implementation for Demo/Fallback Mode ---

export class MockFileHandle {
  kind = 'file' as const;
  name: string;
  private content: string;

  constructor(name: string, content: string = "") {
    this.name = name;
    this.content = content;
  }

  async getFile(): Promise<File> {
    return new File([this.content], this.name, { type: 'text/plain' });
  }

  async createWritable() {
    return {
      write: async (data: string) => { this.content = data; },
      close: async () => {}
    };
  }

  async isSameEntry(other: any): Promise<boolean> {
      return this === other;
  }
}

export class MockDirectoryHandle {
  kind = 'directory' as const;
  name: string;
  children: (MockFileHandle | MockDirectoryHandle)[];

  constructor(name: string, children: (MockFileHandle | MockDirectoryHandle)[] = []) {
    this.name = name;
    this.children = children;
  }

  async *values() {
    for (const child of this.children) {
      yield child;
    }
  }

  async getFileHandle(name: string, options?: { create?: boolean }) {
      let file = this.children.find(c => c.name === name && c.kind === 'file') as MockFileHandle;
      if (!file && options?.create) {
          file = new MockFileHandle(name, "");
          this.children.push(file);
      }
      if (!file) throw new Error("File not found");
      return file;
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
      let dir = this.children.find(c => c.name === name && c.kind === 'directory') as MockDirectoryHandle;
      if (!dir && options?.create) {
          dir = new MockDirectoryHandle(name);
          this.children.push(dir);
      }
      if (!dir) throw new Error("Directory not found");
      return dir;
  }

  async removeEntry(name: string) {
      this.children = this.children.filter(c => c.name !== name);
  }

  async isSameEntry(other: any): Promise<boolean> {
      return this === other;
  }
}

// Generate some cool demo data
export const generateDemoFileSystem = (): MockDirectoryHandle => {
    const weaponsJson = JSON.stringify({
        "Items": [
            { "Id": "Weapon_AK47", "Rarity": "Rare" },
            { "Id": "Weapon_M16A4", "Rarity": "Uncommon" },
            { "Id": "Ammo_7_62x39", "Rarity": "Common" }
        ],
        "Probability": 50,
        "QuantityMin": 1,
        "QuantityMax": 1
    }, null, 4);

    const foodJson = JSON.stringify({
        "Items": [
            { "Id": "Apple", "Rarity": "Common" },
            { "Id": "MRE_TunaSalad", "Rarity": "Uncommon" }
        ],
        "QuantityMin": 1,
        "QuantityMax": 3
    }, null, 4);

    const configJson = JSON.stringify({
        "FixedItems": ["Item_Map", "Item_Compass"],
        "AllowDuplicates": false
    }, null, 4);

    const zonesJson = JSON.stringify({
      "Zones": [
        {
          "TopLeft": "X=76275 Y=-770259.3805",
          "BottomRight": "X=-9450 Y=-834553.1279"
        }
      ]
    }, null, 4);

    return new MockDirectoryHandle("Loot", [
        new MockDirectoryHandle("Weapons", [
            new MockFileHandle("AssaultRifles.json", weaponsJson),
            new MockFileHandle("Zones.json", zonesJson) 
        ]),
        new MockDirectoryHandle("Food", [
            new MockFileHandle("Fruits.json", foodJson)
        ]),
        new MockFileHandle("GlobalConfig.json", configJson),
        new MockFileHandle("ServerSettings.ini", zonesJson)
    ]);
};

// --- Helper for HTML Input Upload & OS Drop ---

export const parseWebkitFiles = async (files: FileList): Promise<MockDirectoryHandle> => {
    const rootName = files[0]?.webkitRelativePath.split('/')[0] || "Upload";
    const rootHandle = new MockDirectoryHandle(rootName);
    await mergeWebkitFiles(rootHandle, files, true);
    return rootHandle;
};

export const mergeWebkitFiles = async (rootHandle: FileSystemDirectoryHandle | MockDirectoryHandle, files: FileList, skipRootCheck = false) => {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.name.endsWith('.json') && !file.name.endsWith('.ini')) continue;

        const pathParts = file.webkitRelativePath.split('/');
        let currentDir = rootHandle;
        const startIndex = skipRootCheck ? 1 : 0;

        for (let j = startIndex; j < pathParts.length - 1; j++) {
            const part = pathParts[j];
            // @ts-ignore
            currentDir = await currentDir.getDirectoryHandle(part, { create: true });
        }

        const fileName = pathParts[pathParts.length - 1];
        const content = await file.text();

        // @ts-ignore
        const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    }
};

/**
 * Handles DataTransferItems from Drag & Drop (OS level).
 * Recursively copies dropped folders/files into the target directory.
 */
export const importFromDragDrop = async (
    items: DataTransferItemList, 
    targetDirHandle: FileSystemDirectoryHandle | MockDirectoryHandle
) => {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
            // @ts-ignore - getAsFileSystemHandle is strictly not on DataTransferItem in some TS configs
            const handlePromise = (item as any).getAsFileSystemHandle ? (item as any).getAsFileSystemHandle() : null;
            if (handlePromise) {
                promises.push(handlePromise.then((handle: FileSystemHandle | null) => {
                    if (handle) return processHandle(handle, targetDirHandle);
                }));
            }
        }
    }
    await Promise.all(promises);
};

const processHandle = async (
    sourceHandle: FileSystemHandle, 
    parentTargetHandle: FileSystemDirectoryHandle | MockDirectoryHandle
) => {
    if (sourceHandle.kind === 'file') {
        const sourceFileHandle = sourceHandle as FileSystemFileHandle;
        // Allow JSON and INI files
        if (!sourceFileHandle.name.endsWith('.json') && !sourceFileHandle.name.endsWith('.ini')) return;

        const file = await sourceFileHandle.getFile();
        const content = await file.text();

        // @ts-ignore
        const targetFileHandle = await parentTargetHandle.getFileHandle(sourceFileHandle.name, { create: true });
        const writable = await targetFileHandle.createWritable();
        await writable.write(content);
        await writable.close();

    } else if (sourceHandle.kind === 'directory') {
        const sourceDirHandle = sourceHandle as FileSystemDirectoryHandle;
        // @ts-ignore
        const targetDirHandle = await parentTargetHandle.getDirectoryHandle(sourceDirHandle.name, { create: true });
        
        // Recursively process children
        // @ts-ignore
        for await (const entry of sourceDirHandle.values()) {
            await processHandle(entry, targetDirHandle);
        }
    }
};


// --- Main Service Functions ---

export const getDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | MockDirectoryHandle> => {
  try {
    if (!('showDirectoryPicker' in window)) {
        throw new Error("File System API not supported");
    }
    return await (window as any).showDirectoryPicker({ mode: 'readwrite' });
  } catch (error: any) {
    console.warn("Native File System Access failed, falling back to Demo Mode.", error);
    if (error.name === 'SecurityError' || error.name === 'ReferenceError' || error.message.includes('not supported') || error.message.includes('Cross origin')) {
         const demoHandle = generateDemoFileSystem();
         (demoHandle as any).isDemo = true;
         return demoHandle as any;
    }
    throw error;
  }
};

export const scanDirectory = async (dirHandle: FileSystemDirectoryHandle | MockDirectoryHandle, path = ""): Promise<FileNode[]> => {
  const entries: FileNode[] = [];
  // @ts-ignore
  for await (const entry of dirHandle.values()) {
    const newPath = path ? `${path}/${entry.name}` : entry.name;
    if (entry.kind === 'file') {
      if (entry.name.endsWith('.json') || entry.name.endsWith('.ini')) {
        entries.push({
          name: entry.name,
          kind: 'file',
          handle: entry as any,
          path: newPath
        });
      }
    } else if (entry.kind === 'directory') {
      const children = await scanDirectory(entry as any, newPath);
      entries.push({
        name: entry.name,
        kind: 'directory',
        handle: entry as any,
        path: newPath,
        children: children
      });
    }
  }
  return entries.sort((a, b) => {
    if (a.kind === b.kind) return a.name.localeCompare(b.name);
    return a.kind === 'directory' ? -1 : 1;
  });
};

export const readFile = async (fileHandle: FileSystemFileHandle | MockFileHandle): Promise<string> => {
  const file = await fileHandle.getFile();
  return await file.text();
};

export const saveFile = async (fileHandle: FileSystemFileHandle | MockFileHandle, content: string): Promise<void> => {
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
};

export const createJsonFile = async (dirHandle: FileSystemDirectoryHandle | MockDirectoryHandle, name: string): Promise<void> => {
    // Basic validation, default to json if no extension
    let fileName = name;
    if (!fileName.includes('.')) fileName += '.json';
    
    await dirHandle.getFileHandle(fileName, { create: true });
};

export const createDirectory = async (dirHandle: FileSystemDirectoryHandle | MockDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle | MockDirectoryHandle> => {
    // @ts-ignore
    return await dirHandle.getDirectoryHandle(name, { create: true });
};

export const deleteEntry = async (dirHandle: FileSystemDirectoryHandle | MockDirectoryHandle, name: string): Promise<void> => {
    await dirHandle.removeEntry(name, { recursive: true });
};

// --- Advanced Operations (Move, Rename, EnsureStructure) ---

/**
 * Ensures a deep directory path exists. 
 * @param rootHandle The root folder handle
 * @param pathString e.g. "Loot/Spawners/Presets/Override"
 */
export const ensureDirectoryPath = async (rootHandle: FileSystemDirectoryHandle | MockDirectoryHandle, pathString: string) => {
    const parts = pathString.split('/').filter(p => p);
    let current = rootHandle;
    for (const part of parts) {
        // @ts-ignore
        current = await current.getDirectoryHandle(part, { create: true });
    }
};

/**
 * Renames an entry by copying content (if file) and deleting old.
 * Note: Directory renaming is complex recursively, focusing on File rename mainly.
 */
export const renameEntry = async (parentHandle: FileSystemDirectoryHandle | MockDirectoryHandle, oldName: string, newName: string, kind: 'file' | 'directory') => {
    if (oldName === newName) return;
    
    if (kind === 'file') {
        // @ts-ignore
        const oldHandle = await parentHandle.getFileHandle(oldName);
        const oldFile = await oldHandle.getFile();
        const content = await oldFile.text();
        
        // @ts-ignore
        const newHandle = await parentHandle.getFileHandle(newName, { create: true });
        const writable = await newHandle.createWritable();
        await writable.write(content);
        await writable.close();
        
        await parentHandle.removeEntry(oldName);
    } else {
        // Use moveDirectory for rename logic
        await moveDirectory(parentHandle, parentHandle, oldName, newName);
    }
};

/**
 * Recursively moves a directory.
 */
export const moveDirectory = async (
    sourceParent: FileSystemDirectoryHandle | MockDirectoryHandle,
    destParent: FileSystemDirectoryHandle | MockDirectoryHandle,
    dirName: string,
    newDirName?: string // Optional new name for rename-move support
) => {
    const targetName = newDirName || dirName;

    // Safety check: Don't move if source parent IS dest parent AND name is same
    if (await sourceParent.isSameEntry(destParent as any) && dirName === targetName) {
        return;
    }

    // 1. Get Source Handle
    // @ts-ignore
    const sourceHandle = await sourceParent.getDirectoryHandle(dirName);
    
    // 2. Create Destination Handle
    // @ts-ignore
    const destHandle = await destParent.getDirectoryHandle(targetName, { create: true });

    // 3. Iterate and move children
    // @ts-ignore
    for await (const entry of sourceHandle.values()) {
        if (entry.kind === 'file') {
            await moveFile(sourceHandle, destHandle, entry.name);
        } else if (entry.kind === 'directory') {
            await moveDirectory(sourceHandle, destHandle, entry.name);
        }
    }

    // 4. Delete Source Directory
    await sourceParent.removeEntry(dirName, { recursive: true });
};

/**
 * Moves a file from one directory handle to another.
 */
export const moveFile = async (
    sourceParent: FileSystemDirectoryHandle | MockDirectoryHandle, 
    destParent: FileSystemDirectoryHandle | MockDirectoryHandle, 
    fileName: string
) => {
    // Safety check: Don't move if source parent IS dest parent
    if (await sourceParent.isSameEntry(destParent as any)) {
        return;
    }

    // 1. Read
    // @ts-ignore
    const sourceHandle = await sourceParent.getFileHandle(fileName);
    const file = await sourceHandle.getFile();
    const content = await file.text();

    // 2. Write to new
    // @ts-ignore
    const destHandle = await destParent.getFileHandle(fileName, { create: true });
    const writable = await destHandle.createWritable();
    await writable.write(content);
    await writable.close();

    // 3. Delete old
    await sourceParent.removeEntry(fileName);
};
