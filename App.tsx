
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { getDirectoryHandle, scanDirectory, readFile, saveFile, moveFile, moveDirectory, renameEntry, deleteEntry, createDirectory, createJsonFile, ensureDirectoryPath, importFromDragDrop } from './services/fileSystem';
import { checkSession, logout } from './services/auth';

import { FileTree } from './components/FileTree';
import { VisualEditor } from './components/VisualEditor';
import { GeneralZoneModifiersEditor } from './components/GeneralZoneModifiersEditor';
import { ItemSpawningParametersEditor } from './components/ItemSpawningParametersEditor';
import { NodeLibraryEditor } from './components/NodeLibraryEditor';
import { ServerSettingsEditor } from './components/ServerSettingsEditor'; 
import { BulkImporter } from './components/BulkImporter';
import { ZonesVisualizer } from './components/ZonesVisualizer';
import { DiffView } from './components/DiffView';
import { LoginScreen } from './components/LoginScreen';
import { SettingsModal } from './components/SettingsModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TranslationManager } from './components/TranslationManager';

import { FileNode, ScumJson, ScumZoneRect, GeneralZoneModifiersJson } from './types';
import { SaveIcon, FolderIcon, EyeIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon, XMarkIcon, CubeIcon } from './components/Icons';
import { Toast } from './components/Toast';
import { LanguageProvider, useI18n } from './i18n';
import { SettingsProvider } from './SettingsContext';
import { stringToColor } from './utils/helpers';
import { flattenFileNodes, findFileNode } from './utils/treeUtils';
import { subscribeToTranslationUpdates } from './utils/itemTranslator';

import { CommandPalette } from './components/CommandPalette';
import { useAppStore } from './src/store';

const MAP_IMAGE_URL = 'https://github.com/RDRuinDream/SCUMMap/tree/main/Img/scummap.webp';

const AuthWrapper = () => {
  const { t } = useI18n();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const verify = async () => {
        const isAuth = await checkSession();
        setIsAuthenticated(isAuth);
        setIsLoadingAuth(false);
    };
    verify();
  }, []);

  const handleLogin = (success: boolean) => {
    if (success) setIsAuthenticated(true);
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
  };

  if (isLoadingAuth) {
     return (
         <div className="h-screen w-screen bg-[#02040a] flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 bg-aurora opacity-50"></div>
             <div className="w-16 h-16 border-4 border-scum-accent border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_30px_rgba(6,182,212,0.2)]"></div>
             <div className="text-scum-accent font-mono animate-pulse tracking-widest text-sm uppercase">{t('app.connecting')}</div>
         </div>
     );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AppContent onLogout={handleLogout} />;
};

export const App = () => {
  return (
    <SettingsProvider>
        <LanguageProvider>
            <AuthWrapper />
        </LanguageProvider>
    </SettingsProvider>
  );
};

const AppContent = ({ onLogout }: { onLogout: () => void }) => {
  const { t } = useI18n();
  // Simple URL Routing
  const searchParams = new URLSearchParams(window.location.search);
  const isTranslationView = searchParams.get('view') === 'translations';
  const translationType = searchParams.get('type') as 'items' | 'server' | 'files' || 'items';

  const [files, setFiles] = useState<FileNode[]>([]);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [openFiles, setOpenFiles] = useState<Record<string, string>>({}); 
  const [dirtyPaths, setDirtyPaths] = useState<string[]>([]);
  const [savedFiles, setSavedFiles] = useState<Record<string, string>>({}); 
  
  const [viewMode, setViewMode] = useState<'visual' | 'code' | 'diff'>('visual');
  const [showMap, setShowMap] = useState(false);
  const [highlightedPath, setHighlightedPath] = useState<string | null>(null);
  const [showImporter, setShowImporter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [uiVersion, setUiVersion] = useState(0); 

  const [globalClipboard, setGlobalClipboard] = useState<{ type: string, items: any[] } | null>(null);

  const [pickingZoneTarget, setPickingZoneTarget] = useState<{ path: string, index: number, subIndex?: number, type: 'Zones' | 'Modifier' } | null>(null);
  const [scrollToId, setScrollToId] = useState<string | null>(null);
  const [mapLayerFilter, setMapLayerFilter] = useState<'all' | 'zones' | 'modifiers'>('all');

  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);

  const [autoSave, setAutoSave] = useState(() => localStorage.getItem('scum_autosave') !== 'false');
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  
  const openFilesRef = useRef(openFiles);
  const filesRef = useRef(files);
  const autoSaveRef = useRef(autoSave);
  const selectedPathRef = useRef(selectedPath);

  useEffect(() => {
    const timer = setTimeout(() => {
        const loader = document.getElementById('initial-loader');
        if (loader) {
            requestAnimationFrame(() => {
                loader.style.opacity = '0';
                loader.style.pointerEvents = 'none'; 
                setTimeout(() => loader.remove(), 600); 
            });
        }
    }, 100); 
    return () => clearTimeout(timer);
  }, []);

  // Background Map Caching
  useEffect(() => {
      const cacheMap = async () => {
          if ('caches' in window) {
              try {
                  const cacheName = 'scum-map-cache-v1';
                  const cache = await caches.open(cacheName);
                  const match = await cache.match(MAP_IMAGE_URL);
                  if (!match) {
                      console.log("Pre-caching map image...");
                      await cache.add(MAP_IMAGE_URL);
                      console.log("Map image cached.");
                  }
              } catch (e) {
                  console.warn("Map pre-cache failed", e);
              }
          }
      };
      // Delay slightly to not block initial render
      const t = setTimeout(cacheMap, 2000);
      return () => clearTimeout(t);
  }, []);

  // Listen for Translation Updates from other tabs (or this tab)
  useEffect(() => {
      const unsubscribe = subscribeToTranslationUpdates(() => {
          console.log("Translations updated, refreshing UI...");
          setUiVersion(v => v + 1);
      });
      return () => unsubscribe();
  }, []);

  useEffect(() => { openFilesRef.current = openFiles; }, [openFiles]);
  useEffect(() => { filesRef.current = files; }, [files]);
  useEffect(() => { autoSaveRef.current = autoSave; }, [autoSave]);
  useEffect(() => { selectedPathRef.current = selectedPath; }, [selectedPath]);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
      if (isResizing) setSidebarWidth(Math.max(200, Math.min(800, e.clientX)));
  }, [isResizing]);

  useEffect(() => {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      return () => {
          window.removeEventListener("mousemove", resize);
          window.removeEventListener("mouseup", stopResizing);
      };
  }, [resize, stopResizing]);

  const [nodeLibrary, setNodeLibrary] = useState<any>(null);

  useEffect(() => {
      const stored = localStorage.getItem('scum_node_library');
      if (stored) {
          try { setNodeLibrary(JSON.parse(stored)); } catch(e) { console.error("Failed to load node library", e); }
      }
  }, []);

  const handleNodeLibraryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      try {
          setToastMsg({ msg: t('app.scanningNodes'), type: "info" });
          const nodes: any[] = [];
          const filesList = e.target.files;
          for (let i = 0; i < filesList.length; i++) {
              const file = filesList[i];
              if (file.name.endsWith('.json')) {
                  const text = await file.text();
                  try {
                      const json = JSON.parse(text);
                      if (json.Name || json.Children) nodes.push(json);
                  } catch(e) {}
              }
          }
          if (nodes.length === 0) { setToastMsg({ msg: t('app.noValidJson'), type: "error" }); return; }
          const newRoot = { Name: "ItemLootTreeNodes", Children: [] as any[] };
          nodes.forEach(node => {
              if (node.Name === "ItemLootTreeNodes" && Array.isArray(node.Children)) newRoot.Children.push(...node.Children);
              else newRoot.Children.push(node);
          });
          setNodeLibrary(newRoot);
          localStorage.setItem('scum_node_library', JSON.stringify(newRoot));
          setToastMsg({ msg: t('app.importedNodes', [nodes.length]), type: "success" });
      } catch(e) { setToastMsg({ msg: t('app.importFailed'), type: "error" }); }
  };

  const handleResetNodeLibrary = () => {
      if (confirm(t('common.confirmDelete'))) {
          localStorage.removeItem('scum_node_library');
          setNodeLibrary(null);
          setToastMsg({ msg: t('app.libReset'), type: "info" });
      }
  };

  const allFiles = useMemo(() => flattenFileNodes(files), [files]);

  // Conflict Detection: Scope-aware check
  const conflicts = useMemo(() => {
      const conflictMap = new Map<string, string[]>();
      const overridePath = 'Loot/Spawners/Presets/Override';
      
      const zoneScopes = new Set<string>();
      allFiles.forEach(f => {
          if (f.name === 'Zones.json' && f.path.startsWith(overridePath)) {
              const dir = f.path.substring(0, f.path.lastIndexOf('/'));
              zoneScopes.add(dir);
          }
      });

      const fileGroups = new Map<string, string[]>();

      allFiles.forEach(f => {
          if (f.kind === 'file' && f.name.endsWith('.json') && f.name !== 'Zones.json' && f.path.startsWith(overridePath)) {
              let scope = "GLOBAL";
              
              let walker = f.path;
              while (walker.includes('/')) {
                  walker = walker.substring(0, walker.lastIndexOf('/'));
                  if (walker.length < overridePath.length) break;
                  
                  if (zoneScopes.has(walker)) {
                      scope = walker;
                      break; 
                  }
              }

              const key = `${f.name}|${scope}`;
              const group = fileGroups.get(key) || [];
              group.push(f.path);
              fileGroups.set(key, group);
          }
      });

      fileGroups.forEach((paths) => {
          if (paths.length > 1) {
              paths.forEach(p => {
                  const others = paths.filter(other => {
                      if (p.includes('/')) {
                          const pParts = p.split('/');
                          const otherParts = other.split('/');
                          if (pParts.length === otherParts.length) {
                             const pName = pParts.pop();
                             const otherName = otherParts.pop();
                             return pParts.join('/') === otherParts.join('/') && pName === otherName;
                          }
                      }
                      return other !== p;
                  });
                  conflictMap.set(p, others);
              });
          }
      });

      return conflictMap;
  }, [allFiles]);

  const zoneColors = useMemo(() => {
      const colors: Record<string, string> = {};
      allFiles.forEach(node => {
          if (node.kind === 'file' && node.name === 'Zones.json') {
              const dirPath = node.path.substring(0, node.path.lastIndexOf('/'));
              const color = stringToColor(node.path);
              colors[dirPath] = color;
          }
      });
      return colors;
  }, [allFiles]);

  // Create a map of Node Overrides (files in loot/Nodes/Override)
  const nodeOverrides = useMemo(() => {
      const overrides: Record<string, ScumJson> = {};
      const overridePathPrefix = 'loot/Nodes/Override/';
      
      Object.entries(openFiles).forEach(([path, content]) => {
          if (path.includes('/Nodes/Override/') || path.startsWith(overridePathPrefix)) {
              // Extract just the filename without extension as the Node ID
              const parts = path.split('/');
              const fileName = parts.pop() || "";
              const id = fileName.replace('.json', '');
              
              // Only include if it looks like a node definition (has Items, etc)
              try {
                  const json = JSON.parse(content as string);
                  if (id) {
                      overrides[id] = json;
                  }
              } catch (e) {}
          }
      });
      return overrides;
  }, [openFiles]);

  const dependencyMap = useMemo(() => {
      const map: Record<string, string[]> = {};
      const allPaths = Object.keys(openFiles); 

      Object.entries(openFiles).forEach(([sourcePath, content]) => {
          try {
              const json = JSON.parse(content as string);
              if (json.Subpresets) {
                  json.Subpresets.forEach((sub: any) => {
                      if (sub.Id) {
                          const targetName = sub.Id;
                          const targetFileName = `${targetName}.json`;
                          
                          const parentDir = sourcePath.includes('/') ? sourcePath.substring(0, sourcePath.lastIndexOf('/')) : '';
                          const siblingPath = parentDir ? `${parentDir}/${targetFileName}` : targetFileName;

                          let finalTarget: string | undefined;

                          if (allPaths.includes(siblingPath)) {
                              finalTarget = siblingPath;
                          } else {
                              if (parentDir) {
                                  const descendantMatch = allPaths.find(p => 
                                      p.startsWith(`${parentDir}/`) && 
                                      p.endsWith(`/${targetFileName}`)
                                  );
                                  if (descendantMatch) {
                                      finalTarget = descendantMatch;
                                  }
                              }

                              if (!finalTarget) {
                                  finalTarget = allPaths.find(p => p.endsWith(`/${targetFileName}`) || p === targetFileName);
                              }
                          }

                          if (finalTarget) {
                              if (!map[finalTarget]) map[finalTarget] = [];
                              if (!map[finalTarget].includes(sourcePath)) map[finalTarget].push(sourcePath);
                          }
                      }
                  });
              }
          } catch (e) {}
      });
      return map;
  }, [openFiles]);

  const refreshFiles = async () => {
      if (dirHandle) {
          const nodes = await scanDirectory(dirHandle);
          setFiles(nodes);
      }
  };

  const preloadProjectFiles = async (nodes: FileNode[]) => {
      setToastMsg({ msg: t('common.loading'), type: 'info' });
      const allNodes = flattenFileNodes(nodes);
      // Load both .json and .ini files
      const textFiles = allNodes.filter(n => n.kind === 'file' && (n.name.endsWith('.json') || n.name.endsWith('.ini')));
      const newContent: Record<string, string> = {};
      const BATCH_SIZE = 50;
      for (let i = 0; i < textFiles.length; i += BATCH_SIZE) {
          const batch = textFiles.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(async (node) => {
              try {
                  const text = await readFile(node.handle as any);
                  newContent[node.path] = text;
              } catch (e) {}
          }));
          await new Promise(r => setTimeout(r, 0));
      }
      setOpenFiles(prev => ({ ...prev, ...newContent }));
      setSavedFiles(prev => ({ ...prev, ...newContent }));
      setToastMsg({ msg: t('app.projectLoaded'), type: 'success' });
  };

  const handleOpenFolder = async () => {
      try {
          const handle = await getDirectoryHandle();
          // @ts-ignore
          if (handle.isDemo) setIsDemo(true);
          setDirHandle(handle as any);
          const nodes = await scanDirectory(handle as any);
          setFiles(nodes);
          preloadProjectFiles(nodes);
          
          checkAndFixStructure(handle as any, nodes);
      } catch (e: any) {
          if (e.name !== 'AbortError') setToastMsg({ msg: t('common.error'), type: 'error' });
      }
  };

  const checkAndFixStructure = async (handle: FileSystemDirectoryHandle, nodes: FileNode[]) => {
      const required = [
          'loot/Spawners/Presets/Override',
          'loot/Nodes/Override',
          'loot/Items/Override'
      ];
      
      const missing = required.filter(path => !findFileNode(nodes, path));
      if (missing.length > 0) {
          setToastMsg({ msg: t('common.processing'), type: 'info' });
          try {
              await ensureDirectoryPath(handle, 'loot/Spawners/Presets/Override');
              await ensureDirectoryPath(handle, 'loot/Nodes/Override');
              await ensureDirectoryPath(handle, 'loot/Items/Override');
              
              const newNodes = await scanDirectory(handle as any);
              setFiles(newNodes);
              setToastMsg({ msg: "Directory Structure Auto-Generated", type: 'success' });
          } catch(e) {
              setToastMsg({ msg: "Failed to auto-generate structure", type: 'error' });
          }
      }
  };

  const handleCloseFolder = () => {
      setDirHandle(null); setFiles([]); setSelectedPath(null); setOpenFiles({});
      setDirtyPaths([]); setSavedFiles({}); setIsDemo(false); setHighlightedPath(null);
  };

  const getHandleByPath = (path: string, nodes: FileNode[]): any => {
      const node = findFileNode(nodes, path);
      return node ? node.handle : null;
  };

  const handleSelectFile = useCallback(async (node: FileNode) => {
      setSelectedPath(node.path);
      setScrollToId(null); 
      if (!openFiles[node.path]) {
          try {
              const content = await readFile(node.handle as any);
              setOpenFiles(prev => ({ ...prev, [node.path]: content }));
              setSavedFiles(prev => ({ ...prev, [node.path]: content }));
          } catch (e) { setToastMsg({ msg: t('app.readFailed') + ": " + node.name, type: 'error' }); }
      }
  }, [openFiles, t]);
  
  const handleNavigateByPath = useCallback((path: string) => {
      const node = findFileNode(files, path);
      if (node) handleSelectFile(node);
      else setToastMsg({ msg: t('app.fileNotFound') + ": " + path, type: 'error' });
  }, [files, handleSelectFile, t]);

  const performSave = useCallback(async (path: string) => {
      const currentOpenFiles = openFilesRef.current;
      const currentFiles = filesRef.current;
      const content = currentOpenFiles[path];
      const handle = getHandleByPath(path, currentFiles);
      if (handle) {
          try {
              await saveFile(handle, content);
              setDirtyPaths(prev => prev.filter(p => p !== path));
              setSavedFiles(prev => ({ ...prev, [path]: content }));
              if (!autoSaveRef.current) setToastMsg({ msg: t('app.savedSuccess'), type: 'success' });
          } catch (e) { setToastMsg({ msg: t('app.saveFailed') + ": " + path, type: 'error' }); }
      } else { setToastMsg({ msg: t('app.fileNotFound') + " (Save)", type: 'error' }); }
  }, [t]);

  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
      const handleKeyDown = async (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
              e.preventDefault();
              if (selectedPathRef.current) {
                  await performSave(selectedPathRef.current);
                  if (autoSaveRef.current) setToastMsg({ msg: t('app.savedSuccess'), type: 'success' });
              }
          }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
              e.preventDefault();
              setShowCommandPalette(open => !open);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performSave, t]);

  const handleSave = async () => { if (!selectedPath) return; await performSave(selectedPath); };

  const handleContentChange = useCallback((path: string, newContent: string) => {
      setOpenFiles(prev => ({ ...prev, [path]: newContent }));
      openFilesRef.current = { ...openFilesRef.current, [path]: newContent };
      setDirtyPaths(prev => { if (!prev.includes(path)) return [...prev, path]; return prev; });
      if (autoSaveRef.current) {
          if (saveTimers.current[path]) clearTimeout(saveTimers.current[path]);
          saveTimers.current[path] = setTimeout(() => { performSave(path); }, 1000);
      }
  }, [performSave]);

  const handleImport = (importedItems: any[], target: 'Items' | 'FixedItems' | 'Parameters') => {
      if (!selectedPath) return;
      try {
          const currentContent = openFiles[selectedPath];
          const json = JSON.parse(currentContent);
          if (target === 'Items') { if (!json.Items) json.Items = []; json.Items.push(...importedItems); } 
          else if (target === 'FixedItems') { if (!json.FixedItems) json.FixedItems = []; json.FixedItems.push(...importedItems); } 
          else if (target === 'Parameters') { if (!json.Parameters) json.Parameters = []; json.Parameters.push(...importedItems); }
          handleContentChange(selectedPath, JSON.stringify(json, null, 4));
          setShowImporter(false);
      } catch (e) { alert(t('app.noValidJson')); }
  };

  const handlePeekFile = useCallback(async (path: string): Promise<ScumJson | null> => {
      if (openFiles[path]) { try { return JSON.parse(openFiles[path]); } catch { return null; } }
      const handle = getHandleByPath(path, files);
      if (handle) {
          try {
              const text = await readFile(handle);
              setOpenFiles(prev => ({ ...prev, [path]: text }));
              setSavedFiles(prev => ({ ...prev, [path]: text }));
              return JSON.parse(text);
          } catch { return null; }
      }
      return null;
  }, [files, openFiles]);

  const handleSetReferencedFiles = useCallback((paths: string[]) => { setReferencedPaths(paths); }, []);
  const toggleAutoSave = () => { const newVal = !autoSave; setAutoSave(newVal); localStorage.setItem('scum_autosave', String(newVal)); };
  const [referencedPaths, setReferencedPaths] = useState<string[]>([]);

  const handleMoveNodes = async (sourcePaths: string[], targetPath: string) => {
      if (!dirHandle) return;
      const targetNode = findFileNode(files, targetPath);
      if (!targetNode || targetNode.kind !== 'directory') return;

      setToastMsg({ msg: t('common.processing'), type: 'info' });
      let successCount = 0;
      let failCount = 0;

      for (const sourcePath of sourcePaths) {
          const sourceNode = findFileNode(files, sourcePath);
          if (!sourceNode) continue;

          const srcDirParts = sourcePath.split('/');
          srcDirParts.pop();
          const srcDirPath = srcDirParts.join('/');
          const srcDirNode = srcDirPath ? findFileNode(files, srcDirPath) : { handle: dirHandle };

          if (srcDirNode) {
              if (srcDirPath === targetPath) continue;

              try {
                  if (sourceNode.kind === 'file') {
                      await moveFile(srcDirNode.handle as any, targetNode.handle as any, sourceNode.name);
                      if (openFiles[sourcePath]) {
                          const newPath = `${targetPath}/${sourceNode.name}`;
                          const content = openFiles[sourcePath];
                          setOpenFiles(prev => { const n = {...prev}; delete n[sourcePath]; n[newPath] = content; return n; });
                          if (selectedPath === sourcePath) setSelectedPath(newPath);
                          if (selectedPaths.includes(sourcePath)) {
                              setSelectedPaths(prev => prev.map(p => p === sourcePath ? newPath : p));
                          }
                      }
                  } else {
                      await moveDirectory(srcDirNode.handle as any, targetNode.handle as any, sourceNode.name);
                      const affectedPaths = Object.keys(openFiles).filter(p => p.startsWith(sourcePath + '/'));
                      if (affectedPaths.length > 0) {
                          setOpenFiles(prev => {
                              const n = {...prev};
                              affectedPaths.forEach(p => delete n[p]);
                              return n;
                          });
                          if (selectedPath && selectedPath.startsWith(sourcePath + '/')) setSelectedPath(null);
                          setSelectedPaths(prev => prev.filter(p => !p.startsWith(sourcePath + '/')));
                      }
                  }
                  successCount++;
              } catch (e) {
                  console.error(e);
                  failCount++;
              }
          }
      }

      await refreshFiles();
      if (failCount === 0) {
          setToastMsg({ msg: `Successfully moved ${successCount} items`, type: 'success' });
      } else {
          setToastMsg({ msg: `Moved ${successCount} items, ${failCount} failed`, type: 'info' });
      }
  };

  const handleDeleteNodes = async (paths: string[]) => {
      if (!dirHandle) return;
      setToastMsg({ msg: t('common.processing'), type: 'info' });
      let successCount = 0;
      let failCount = 0;

      for (const path of paths) {
          const parentParts = path.split('/');
          parentParts.pop();
          const parentPath = parentParts.join('/');
          const parentNode = parentPath ? findFileNode(files, parentPath) : { handle: dirHandle };
          const name = path.split('/').pop() || "";
          const node = findFileNode(files, path);

          if (parentNode) {
              try {
                  await deleteEntry(parentNode.handle as any, name);
                  if (selectedPath === path || (node?.kind === 'directory' && selectedPath?.startsWith(path + '/'))) {
                      setSelectedPath(null);
                  }
                  successCount++;
              } catch (e) {
                  failCount++;
              }
          }
      }

      setSelectedPaths(prev => prev.filter(p => !paths.includes(p)));
      await refreshFiles();
      if (failCount === 0) {
          setToastMsg({ msg: `Successfully deleted ${successCount} items`, type: 'success' });
      } else {
          setToastMsg({ msg: `Deleted ${successCount} items, ${failCount} failed`, type: 'info' });
      }
  };

  const handleRenameNode = async (path: string, newName: string, kind: 'file' | 'directory') => {
      if (!dirHandle) return;
      const parentParts = path.split('/');
      const oldName = parentParts.pop() || "";
      const parentPath = parentParts.join('/');
      const parentNode = parentPath ? findFileNode(files, parentPath) : { handle: dirHandle };

      if (parentNode) {
          try {
              await renameEntry(parentNode.handle as any, oldName, newName, kind);
              await refreshFiles();
              setToastMsg({ msg: "Renamed successfully", type: 'success' });
          } catch(e: any) { setToastMsg({ msg: "Rename failed: " + e.message, type: 'error' }); }
      }
  };

  const handleCreateFolder = async (pathWithNewName: string) => {
      if (!dirHandle) return;
      const parts = pathWithNewName.split('/');
      const newName = parts.pop() || "";
      const parentPath = parts.join('/');
      const parentNode = parentPath ? findFileNode(files, parentPath) : { handle: dirHandle };
      
      if (parentNode) {
          try {
              await createDirectory(parentNode.handle as any, newName);
              await refreshFiles();
          } catch(e) { setToastMsg({ msg: "Create folder failed", type: 'error' }); }
      }
  };

  const handleCreateFile = async (parentPath: string, fileName: string) => {
      if (!dirHandle) return;
      const parentNode = parentPath ? findFileNode(files, parentPath) : { handle: dirHandle };
      if (parentNode) {
          try {
              await createJsonFile(parentNode.handle as any, fileName);
              await refreshFiles();
          } catch(e) { setToastMsg({ msg: "Create file failed", type: 'error' }); }
      }
  };

  const handleImportDrop = async (items: DataTransferItemList, targetPath: string) => {
      if (!dirHandle) return;
      setToastMsg({ msg: t('common.processing'), type: 'info' });
      const targetNode = targetPath ? findFileNode(files, targetPath) : { handle: dirHandle };
      
      if (targetNode) {
          try {
              await importFromDragDrop(items, targetNode.handle as any);
              await refreshFiles();
              setToastMsg({ msg: "Import successful", type: 'success' });
          } catch(e: any) {
              console.error(e);
              setToastMsg({ msg: "Import failed: " + e.message, type: 'error' });
          }
      }
  };

  const handleBatchPaste = async (targetPaths: string[], section: string, dataToPaste: any[], isOverwrite: boolean) => {
      if (!dirHandle || targetPaths.length === 0) return;
      
      // If append mode, we must have data. If overwrite, empty data is allowed (clearing).
      if (dataToPaste.length === 0 && !isOverwrite) return;
      
      setToastMsg({ msg: t('common.processing'), type: 'info' });
      
      let successCount = 0;
      
      for (const path of targetPaths) {
          try {
              let content = openFilesRef.current[path];
              
              // If not open, read from disk
              if (!content) {
                  const node = findFileNode(filesRef.current, path);
                  if (node) {
                      content = await readFile(node.handle as any);
                  }
              }
              
              if (content) {
                  let json: any = {};
                  try { json = JSON.parse(content); } catch (e) { console.error(`Error parsing ${path}`); continue; }
                  
                  // Modify JSON based on section
                  if (['Items', 'Nodes', 'Subpresets', 'FixedItems', 'Zones'].includes(section)) {
                      if (!json[section]) json[section] = [];
                      
                      let payload = dataToPaste;

                      if (section === 'FixedItems') {
                          // Flatten {Id, Quantity} to string array
                          const flattened: string[] = [];
                          dataToPaste.forEach((item: any) => {
                              if (typeof item === 'string') {
                                  flattened.push(item);
                              } else if (item.Id && item.Quantity) {
                                  for (let i = 0; i < item.Quantity; i++) {
                                      flattened.push(item.Id);
                                  }
                              } else if (item.Id) {
                                  flattened.push(item.Id);
                              }
                          });
                          payload = flattened;
                      }

                      if (isOverwrite) {
                          json[section] = payload;
                      } else {
                          json[section].push(...payload);
                      }

                  } else if (section === 'Global') {
                      // Merge global object
                      const globalData = dataToPaste[0] || {};
                      
                      if (isOverwrite) {
                          // If overwrite is selected for Global, effectively we merge keys (replacing values).
                          // Special handling for PostSpawnActions to support array replacement
                          if (globalData.PostSpawnActions) {
                              json.PostSpawnActions = globalData.PostSpawnActions;
                          }
                          // Merge other scalar props
                          Object.assign(json, globalData);
                      } else {
                          // Append mode for Global primarily affects arrays like PostSpawnActions
                          // Scalar values are still overwritten/merged as they can't be "appended"
                          if (globalData.PostSpawnActions) {
                              if (!json.PostSpawnActions) json.PostSpawnActions = [];
                              // Avoid duplicates in append? Or just push? Default append behavior implies adding.
                              // Let's just push unique ones or allow duplicates as per user intent?
                              // Usually actions are unique per type, but let's just spread.
                              json.PostSpawnActions.push(...globalData.PostSpawnActions);
                              // Remove PostSpawnActions from globalData before merging to avoid overwriting the array ref
                              const { PostSpawnActions, ...rest } = globalData;
                              Object.assign(json, rest);
                          } else {
                              Object.assign(json, globalData);
                          }
                      }
                  }
                  
                  const newContent = JSON.stringify(json, null, 4);
                  
                  // Save back
                  const node = findFileNode(filesRef.current, path);
                  if (node) {
                      await saveFile(node.handle as any, newContent);
                      // Update open files state if it was open or we want to cache it
                      setOpenFiles(prev => ({ ...prev, [path]: newContent }));
                      // Mark as saved in our diff tracker too
                      setSavedFiles(prev => ({ ...prev, [path]: newContent }));
                      successCount++;
                  }
              }
          } catch (e) {
              console.error(`Failed to paste into ${path}`, e);
          }
      }
      
      if (successCount > 0) {
          setToastMsg({ msg: t('pasteModal.success', [successCount]), type: 'success' });
      }
  };

  const handleOpenZonePicker = (index: number) => {
      if (!selectedPath) return;
      setPickingZoneTarget({ path: selectedPath, index, type: 'Zones' });
      setShowMap(true);
  };

  const handleOpenModifierZonePicker = (modIndex: number, zoneIndex: number) => {
      if (!selectedPath) return;
      setPickingZoneTarget({ path: selectedPath, index: modIndex, subIndex: zoneIndex, type: 'Modifier' });
      setShowMap(true);
  };

  const handleZonePicked = (rect: { TopLeft: string, BottomRight: string }) => {
      if (!pickingZoneTarget) return;
      const { path, index, type, subIndex } = pickingZoneTarget;
      
      try {
          const content = openFiles[path];
          const json = JSON.parse(content);
          
          if (type === 'Zones' && json.Zones && json.Zones[index]) {
              json.Zones[index] = { ...json.Zones[index], ...rect };
              handleContentChange(path, JSON.stringify(json, null, 4));
              setToastMsg({ msg: t('app.savedSuccess'), type: 'success' });
          } else if (type === 'Modifier' && json.Modifiers && json.Modifiers[index]) {
              if (json.Modifiers[index].Zones && subIndex !== undefined && json.Modifiers[index].Zones[subIndex]) {
                   json.Modifiers[index].Zones[subIndex] = { ...json.Modifiers[index].Zones[subIndex], ...rect };
                   handleContentChange(path, JSON.stringify(json, null, 4));
                   setToastMsg({ msg: t('app.savedSuccess'), type: 'success' });
              }
          }
      } catch (e) {
          console.error("Failed to update zone", e);
          setToastMsg({ msg: t('common.error'), type: 'error' });
      }
      
      setPickingZoneTarget(null);
      setShowMap(false);
  };

  const handleZoneSelect = (path: string, index: number) => {
      handleNavigateByPath(path);
      setShowMap(false);
      setTimeout(() => { setScrollToId(`Zone #${index}`); }, 100);
  };

  const zoneData = useMemo(() => {
      const result: Record<string, { color: string, data: ScumZoneRect[] }> = {};
      Object.entries(openFiles).forEach(([path, content]) => {
          try {
              const json = JSON.parse(content as string);
              
              // 1. Standard Zones
              if (path.endsWith('Zones.json') || (json.Zones && Array.isArray(json.Zones) && json.Zones.length > 0)) {
                  const parentDir = path.substring(0, path.lastIndexOf('/'));
                  const color = zoneColors[parentDir] || stringToColor(path);
                  
                  const processed = (json.Zones || []).map((z: any, idx: number) => ({
                      ...z,
                      sourceType: 'standard',
                      sourcePath: path,
                      parentIndex: idx
                  }));
                  
                  if (result[path]) result[path].data.push(...processed);
                  else result[path] = { color, data: processed };
              }

              // 2. Modifier Zones
              if (json.Modifiers && Array.isArray(json.Modifiers)) {
                  json.Modifiers.forEach((mod: any, modIdx: number) => {
                      if (mod.Zones && Array.isArray(mod.Zones)) {
                          const multipliers: Record<string, number> = {};
                          ['SpawnerProbabilityMultiplier', 'ExamineSpawnerProbabilityMultiplier', 'ExamineSpawnerQuantityMultiplier'].forEach(k => {
                              if (mod[k] !== undefined) multipliers[k] = mod[k];
                          });

                          const processed = mod.Zones.filter((z: any) => z.TopLeft && z.BottomRight).map((z: any, zIdx: number) => ({
                              ...z,
                              sourceType: 'modifier',
                              sourcePath: path,
                              parentIndex: modIdx,
                              modifiers: multipliers
                          }));

                          if (processed.length > 0) {
                              const key = `${path}#mod_${modIdx}`;
                              result[key] = { color: '#06b6d4', data: processed };
                          }
                      }
                  });
              }

          } catch (e) {}
      });
      return result;
  }, [openFiles, zoneColors]);

  const currentFileContent = selectedPath ? openFiles[selectedPath] : "";
  const deferredFileContent = React.useDeferredValue(currentFileContent);

  const { parsedData, parseError } = useMemo(() => {
    let result: any = {};
    let error = false;
    const isServerSettingsLocal = selectedPath?.endsWith('ServerSettings.ini');
    
    if (!isServerSettingsLocal && deferredFileContent) {
        try { 
            result = JSON.parse(deferredFileContent); 
        } catch (e) { 
            error = true; 
        }
    }
    return { parsedData: result, parseError: error };
  }, [deferredFileContent, selectedPath]);

  const isServerSettings = selectedPath?.endsWith('ServerSettings.ini');

  const isGeneralModifiers = selectedPath?.endsWith('GeneralZoneModifiers.json') || (parsedData.Modifiers && !parsedData.Parameters);
  const isSpawningParameters = parsedData.Parameters && Array.isArray(parsedData.Parameters);
  
  // Detection for Node Library Files
  const isNodeLibrary = parsedData.Name === 'ItemLootTreeNodes';

  if (isTranslationView) {
      return (
          <div className="h-screen w-screen bg-[#02040a] relative overflow-hidden">
              <div className="absolute inset-0 bg-aurora opacity-50 pointer-events-none"></div>
              <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none"></div>
              {/* Back button here closes the window if opened as popup */}
              <TranslationManager onBack={() => window.close()} mode={translationType} />
          </div>
      );
  }

  return (
    <div className={`flex h-screen w-screen bg-[#02040a] text-gray-200 font-sans overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
        {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
        
        {showSettings && (
            <SettingsModal 
                onClose={() => setShowSettings(false)} 
                autoSave={autoSave}
                toggleAutoSave={toggleAutoSave}
                onResetNodeLibrary={handleResetNodeLibrary}
                onUploadNodeLibrary={handleNodeLibraryUpload}
                onTranslationsUpdate={() => setUiVersion(v => v + 1)}
                onOpenTranslationManager={() => { /* Handled in Modal now via new tab */ }}
            />
        )}

        {showMap && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-fade-in">
                <div className="w-full max-w-[90vw] h-[85vh] bg-[#0b1120] border border-scum-accent/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col relative animate-scale-in overflow-hidden ring-1 ring-white/10">
                    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0f172a]">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg text-scum-accent border border-scum-accent/20 ${pickingZoneTarget ? 'bg-scum-accent text-black animate-pulse' : 'bg-scum-accent/10'}`}>
                                <EyeIcon className="w-5 h-5" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-bold text-white tracking-wide">
                                        {pickingZoneTarget ? t('zone.pickingMode') : t('zone.visualizer')}
                                    </h3>
                                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                                        {pickingZoneTarget ? `${pickingZoneTarget.path.split('/').pop()} #${pickingZoneTarget.index + 1}` : `${Object.keys(zoneData).length} ${t('common.locs')}`}
                                    </span>
                                </div>

                                {/* Layer Filter Slider */}
                                {!pickingZoneTarget && (
                                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 ml-4 relative h-10 w-60">
                                        {/* Sliding Background */}
                                        <div 
                                            className="absolute top-1 bottom-1 bg-scum-accent/20 border border-scum-accent/30 rounded-lg transition-all duration-300 ease-out"
                                            style={{ 
                                                width: 'calc(33.33% - 4px)', 
                                                left: mapLayerFilter === 'all' ? '4px' : mapLayerFilter === 'zones' ? '33.33%' : '66.66%',
                                                marginLeft: mapLayerFilter === 'zones' ? '2px' : mapLayerFilter === 'modifiers' ? '-2px' : '0px'
                                            }}
                                        />
                                        <button 
                                            onClick={() => setMapLayerFilter('all')} 
                                            className={`flex-1 text-[10px] uppercase font-bold relative z-10 transition-colors ${mapLayerFilter === 'all' ? 'text-scum-accent' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            {t('zone.filterAll')}
                                        </button>
                                        <button 
                                            onClick={() => setMapLayerFilter('zones')} 
                                            className={`flex-1 text-[10px] uppercase font-bold relative z-10 transition-colors ${mapLayerFilter === 'zones' ? 'text-scum-accent' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            {t('zone.filterZones')}
                                        </button>
                                        <button 
                                            onClick={() => setMapLayerFilter('modifiers')} 
                                            className={`flex-1 text-[10px] uppercase font-bold relative z-10 transition-colors ${mapLayerFilter === 'modifiers' ? 'text-scum-accent' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            {t('zone.filterModifiers')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button 
                            onClick={() => { setShowMap(false); setPickingZoneTarget(null); }}
                            className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex-1 relative bg-[#02040a] overflow-hidden">
                        <ErrorBoundary>
                            <ZonesVisualizer 
                                zones={zoneData}
                                onHighlightFile={setHighlightedPath}
                                onNavigateToFile={(path) => {
                                    if (!pickingZoneTarget) handleNavigateByPath(path);
                                }}
                                onPeekFile={handlePeekFile}
                                isPickingMode={!!pickingZoneTarget}
                                onConfirmSelection={handleZonePicked}
                                onSelectZone={handleZoneSelect}
                                activeLayerFilter={mapLayerFilter}
                            />
                        </ErrorBoundary>
                    </div>
                </div>
            </div>
        )}
        
        <div 
            style={{ width: sidebarWidth }}
            className="flex flex-col border-r border-scum-700/30 bg-[#0b1120]/90 backdrop-blur-xl shrink-0 relative shadow-2xl z-20"
        >
             <div 
                className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-scum-accent z-50 transition-colors bg-transparent"
                onMouseDown={startResizing}
             />

             <div className="p-4 border-b border-scum-700/30 flex flex-col gap-3 bg-[#0f172a]/50 relative overflow-hidden">
                  <div className="flex items-center gap-2 text-scum-accent font-bold tracking-widest relative z-10">
                      <div className="w-3 h-3 rounded-full bg-scum-accent shadow-[0_0_10px_currentColor] animate-pulse"></div>
                      <span className="text-lg drop-shadow-md text-white font-mono">{t('app.titleShort')}</span>
                      {isDemo && <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/30 uppercase tracking-widest font-bold ml-auto">{t('app.demo')}</span>}
                  </div>
                  
                  {!dirHandle ? (
                      <div className="space-y-2 relative z-10">
                          <button onClick={handleOpenFolder} className="w-full py-2.5 bg-scum-accent/10 hover:bg-scum-accent text-scum-accent hover:text-black border border-scum-accent/30 font-bold rounded hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all text-xs flex items-center justify-center gap-2 active:scale-95 group">
                              <FolderIcon className="group-hover:scale-110 transition-transform" /> 
                              {t('explorer.selectFolder')}
                          </button>
                      </div>
                  ) : (
                      <div className="flex flex-col gap-2 relative z-10">
                          <div className="flex gap-2">
                             <button onClick={handleOpenFolder} className="flex-1 text-[10px] bg-scum-800 hover:bg-scum-700 text-gray-400 py-2 rounded transition-all border border-scum-700 hover:border-scum-500 uppercase tracking-wide font-bold">{t('explorer.changeFolder')}</button>
                             <button onClick={handleCloseFolder} className="flex-1 text-[10px] bg-red-900/10 hover:bg-red-900/30 text-red-400 py-2 rounded transition-all border border-red-900/30 hover:border-red-500/50 uppercase tracking-wide font-bold">{t('explorer.closeFolder')}</button>
                          </div>
                          <div className="flex gap-2">
                              <button onClick={refreshFiles} className="flex-1 text-[10px] bg-scum-800 hover:bg-scum-700 text-gray-400 py-1.5 rounded transition border border-scum-700 w-full hover:text-white flex justify-center items-center gap-1">
                                  <span className="opacity-50">●</span> {t('explorer.refresh')}
                              </button>
                          </div>
                      </div>
                  )}
             </div>
             
             <div className="flex-1 overflow-hidden relative bg-[#0b1120]" key={`tree-${uiVersion}`}>
                <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                <ErrorBoundary>
                    <FileTree 
                        nodes={files} 
                        onSelectFile={handleSelectFile} 
                        selectedPath={selectedPath} 
                        selectedPaths={selectedPaths}
                        onSelectPaths={setSelectedPaths}
                        onRefresh={refreshFiles}
                        dependencyMap={dependencyMap}
                        highlightedPath={highlightedPath}
                        dirtyPaths={dirtyPaths}
                        referencedPaths={referencedPaths}
                        zoneColors={zoneColors}
                        conflicts={conflicts}
                        onNavigate={handleNavigateByPath}
                        onPeekFile={handlePeekFile}
                        onMoveNodes={handleMoveNodes}
                        onDeleteNodes={handleDeleteNodes}
                        onRenameNode={handleRenameNode}
                        onCreateFolder={handleCreateFolder}
                        onCreateFile={handleCreateFile}
                        onImportDrop={handleImportDrop}
                    />
                </ErrorBoundary>
             </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 relative bg-[#02040a]/80 backdrop-blur-sm rounded-tl-2xl overflow-hidden">
             <div className="h-14 border-b border-scum-700/30 bg-[#0f172a]/90 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-30 shadow-lg rounded-tl-2xl">
                 <div className="flex items-center gap-4 min-w-0">
                     <span className={`font-mono text-sm whitespace-nowrap truncate transition-colors ${selectedPath ? 'text-scum-accent font-bold drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]' : 'text-gray-500'}`} title={selectedPath || ""}>
                         {selectedPath ? selectedPath.split('/').pop() : t('app.title')}
                     </span>
                     {dirtyPaths.includes(selectedPath || "") && (
                         <span className="text-[10px] text-yellow-500 border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.2)] font-bold tracking-wider">
                             {t('app.unsaved')}
                         </span>
                     )}
                 </div>
                 
                 <div className="flex items-center gap-3">
                     {selectedPath && (
                         <>
                             <div className="flex bg-scum-900 rounded-lg p-1 border border-scum-700/50 shadow-inner">
                                 <button 
                                    onClick={() => setViewMode('visual')} 
                                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'visual' ? 'bg-scum-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                                 >
                                     {t('editor.viewVisual')}
                                 </button>
                                 <button 
                                    onClick={() => setViewMode('code')} 
                                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'code' ? 'bg-scum-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                                 >
                                     {t('editor.viewCode')}
                                 </button>
                                 <button 
                                    onClick={() => setViewMode('diff')} 
                                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'diff' ? 'bg-scum-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                                 >
                                     {t('editor.viewDiff')}
                                 </button>
                             </div>

                             <button onClick={() => setShowImporter(!showImporter)} className={`p-2 rounded-lg transition-all border ${showImporter ? 'bg-scum-accent text-black border-scum-accent shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-scum-800 border-scum-700 text-gray-400 hover:text-white hover:border-scum-500'}`} title={t('btn.import')}>
                                 <span className="text-xs font-bold px-2">{t('btn.import')}</span>
                             </button>

                             {!autoSave && (
                                <button onClick={handleSave} className="p-2 bg-scum-accent/10 border border-scum-accent/30 text-scum-accent rounded-lg hover:bg-scum-accent hover:text-black transition-all active:scale-95 shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]" title={`${t('app.save')} (Ctrl+S)`}>
                                    <SaveIcon />
                                </button>
                             )}
                         </>
                     )}
                     <div className="h-8 w-px bg-scum-700/50 mx-1"></div>
                     
                     <button 
                        onClick={() => setShowSettings(true)} 
                        className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-scum-700" 
                        title={t('app.settings')}
                     >
                         <Cog6ToothIcon />
                     </button>
                     
                     <button onClick={onLogout} className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-900/30 hover:bg-red-900/20 hover:border-red-500/30 transition-all ml-1" title={t('app.logout')}>
                         <span className="text-xs font-bold text-red-500 group-hover:text-red-400 uppercase tracking-wide">{t('app.logout')}</span>
                         <ArrowRightOnRectangleIcon />
                     </button>
                 </div>
             </div>

             <div className="flex-1 flex overflow-hidden relative z-10">
                 <div className="flex-1 flex flex-col min-w-0 relative">
                     {showImporter && (
                         <div className="absolute top-0 left-0 w-full z-40 p-4 animate-slide-down">
                             <div className="w-full shadow-2xl ring-1 ring-black/50 rounded-xl bg-[#0b1120]/95 backdrop-blur-xl border border-scum-accent/20">
                                <BulkImporter onImport={handleImport} onSuccess={(msg) => setToastMsg({ msg, type: 'success' })} />
                             </div>
                         </div>
                     )}

                     {!selectedPath ? (
                         <div className="flex flex-col items-center justify-center h-full text-gray-500 animate-fade-in select-none">
                             <div className="relative mb-8 group">
                                <div className="absolute inset-0 bg-scum-accent/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-scum-800 to-scum-900 flex items-center justify-center border border-scum-700 shadow-2xl relative z-10 text-6xl opacity-30 group-hover:opacity-60 group-hover:scale-110 transition-all duration-500 ring-1 ring-white/5">
                                    📂
                                </div>
                             </div>
                             <h2 className="text-2xl font-bold text-gray-400 mb-3 tracking-widest uppercase drop-shadow-md">{t('editor.empty')}</h2>
                             <p className="text-xs text-gray-600 font-mono bg-black/20 px-3 py-1 rounded border border-white/5">{t('explorer.openFolder')}</p>
                         </div>
                     ) : (
                        <ErrorBoundary key={`${selectedPath}-${uiVersion}`}>
                            {viewMode === 'code' && (
                                <textarea 
                                    className="flex-1 bg-[#0b1120] text-gray-300 font-mono text-xs p-8 resize-none focus:outline-none custom-scrollbar leading-relaxed"
                                    value={currentFileContent}
                                    onChange={(e) => handleContentChange(selectedPath, e.target.value)}
                                    spellCheck={false}
                                />
                            )}
                            {viewMode === 'diff' && (
                                <DiffView original={savedFiles[selectedPath] || ""} modified={currentFileContent} />
                            )}
                            {viewMode === 'visual' && (
                                isServerSettings ? (
                                    <ServerSettingsEditor 
                                        content={currentFileContent}
                                        onChange={(newContent) => handleContentChange(selectedPath, newContent)}
                                    />
                                ) :
                                parseError ? (
                                    <div className="flex items-center justify-center h-full text-scum-danger flex-col gap-4 animate-pulse bg-red-900/5">
                                        <div className="text-6xl">⚠️</div>
                                        <div className="text-center">
                                            <span className="font-bold text-lg block mb-1">{t('editor.parseError')}</span>
                                            <span className="text-xs opacity-70 font-mono bg-black/30 px-2 py-1 rounded">{t('editor.fixSyntax')}</span>
                                        </div>
                                    </div>
                                ) : (
                                    isNodeLibrary ? (
                                        <NodeLibraryEditor 
                                            data={parsedData}
                                            onChange={(newData) => handleContentChange(selectedPath, JSON.stringify(newData, null, 4))}
                                        />
                                    ) : isSpawningParameters ? (
                                        <ItemSpawningParametersEditor
                                            data={parsedData}
                                            onChange={(newData) => handleContentChange(selectedPath, JSON.stringify(newData, null, 4))}
                                        />
                                    ) : isGeneralModifiers ? (
                                        <GeneralZoneModifiersEditor 
                                            data={parsedData}
                                            onChange={(newData) => handleContentChange(selectedPath, JSON.stringify(newData, null, 4))}
                                            onPickZone={handleOpenModifierZonePicker}
                                            onLocateOnMap={(idx, subIdx) => {
                                                const key = `${selectedPath}#mod_${idx}`;
                                                handleZoneSelect(key, subIdx || 0);
                                            }}
                                        />
                                    ) : (
                                        <VisualEditor 
                                            data={parsedData}
                                            onChange={(newData) => handleContentChange(selectedPath, JSON.stringify(newData, null, 4))}
                                            availableFiles={allFiles.filter(f => f.kind === 'file').map(f => f.path)}
                                            onPreviewFile={() => {}} 
                                            onNavigateToFile={handleNavigateByPath}
                                            onHighlightFile={setHighlightedPath}
                                            onPeekFile={handlePeekFile}
                                            fileName={selectedPath.split('/').pop() || ""}
                                            filePath={selectedPath}
                                            onSetReferencedFiles={handleSetReferencedFiles}
                                            nodeLibrary={nodeLibrary}
                                            onResetNodeLibrary={handleResetNodeLibrary}
                                            onUploadNodeLibrary={handleNodeLibraryUpload}
                                            clipboard={globalClipboard}
                                            onCopy={(type, items) => setGlobalClipboard({ type, items })}
                                            onPickZone={handleOpenZonePicker}
                                            scrollToId={scrollToId}
                                            nodeOverrides={nodeOverrides}
                                            onBatchPaste={handleBatchPaste}
                                        />
                                    )
                                )
                            )}
                        </ErrorBoundary>
                     )}
                 </div>
             </div>

             <div className="h-8 bg-[#0b1120] border-t border-scum-700/30 flex items-center justify-between px-4 text-[10px] text-gray-500 shrink-0 z-30">
                 <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${dirtyPaths.length > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                        <span className="font-mono">{dirtyPaths.length > 0 ? dirtyPaths.length + " " + t('app.unsavedFiles') : t('app.ready')}</span>
                     </div>
                 </div>
                 <div className="flex items-center gap-4">
                     {Object.keys(zoneData).length > 0 && (
                         <button 
                             onClick={() => setShowMap(true)}
                             className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${showMap ? 'text-scum-accent bg-scum-accent/10 font-bold' : 'hover:text-white hover:bg-white/5'}`}
                         >
                             <EyeIcon />
                             {t('editor.zones')} <span className="bg-white/10 px-1 rounded">{Object.keys(zoneData).length}</span>
                         </button>
                     )}
                 </div>
             </div>
        </div>
        <CommandPalette 
            open={showCommandPalette}
            onOpenChange={setShowCommandPalette}
            files={files}
            onSelectFile={handleNavigateByPath}
        />
    </div>
  );
};
