
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ChartMode = 'bar' | 'pie';

interface SettingsContextType {
  chartMode: ChartMode;
  setChartMode: (mode: ChartMode) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chartMode, setChartMode] = useState<ChartMode>(() => {
    return (localStorage.getItem('scum_chart_mode') as ChartMode) || 'bar';
  });

  useEffect(() => {
    localStorage.setItem('scum_chart_mode', chartMode);
  }, [chartMode]);

  return (
    <SettingsContext.Provider value={{ chartMode, setChartMode }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
};
