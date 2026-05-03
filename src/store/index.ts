import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { FileNode } from '../../types';

interface AppState {
  // Config
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  
  // Non-serializable state
  dirHandle: FileSystemDirectoryHandle | null;
  setDirHandle: (handle: FileSystemDirectoryHandle | null) => void;
  
  // File tree basic state (used cross components)
  selectedPath: string | null;
  selectedPaths: string[];
  setSelectedPath: (path: string | null) => void;
  setSelectedPaths: (paths: string[]) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Serialized
        theme: 'dark',
        setTheme: (theme) => set({ theme }),

        // Non-serialized
        dirHandle: null,
        setDirHandle: (handle) => set({ dirHandle: handle }),
        selectedPath: null,
        selectedPaths: [],
        setSelectedPath: (path) => set({ selectedPath: path }),
        setSelectedPaths: (paths) => set({ selectedPaths: paths }),
      }),
      {
        name: 'scum-config-storage',
        partialize: (state) => ({ theme: state.theme }), 
      }
    )
  )
);
