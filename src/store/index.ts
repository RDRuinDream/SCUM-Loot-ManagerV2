import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { FileNode } from '../types';

interface AppState {
  fileNodes: FileNode[];
  selectedPath: string | null;
  selectedPaths: string[];
  theme: 'dark' | 'light' | 'system';
  
  // Actions
  setFileNodes: (nodes: FileNode[]) => void;
  selectFile: (path: string) => void;
  setSelection: (paths: string[]) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        fileNodes: [],
        selectedPath: null,
        selectedPaths: [],
        theme: 'dark',
        
        setFileNodes: (nodes) => set({ fileNodes: nodes }),
        selectFile: (path) => set({ selectedPath: path }),
        setSelection: (paths) => set({ selectedPaths: paths }),
        setTheme: (theme) => set({ theme }),
      }),
      {
        name: 'scum-config-storage',
        partialize: (state) => ({ theme: state.theme }), // Only persist UI prefs
      }
    )
  )
);
