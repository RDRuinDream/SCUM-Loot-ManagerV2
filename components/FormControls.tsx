
import React, { useState, useEffect, useRef } from 'react';

interface BooleanToggleProps {
  label: string;
  value?: boolean;
  onChange: (val: boolean) => void;
  color?: 'cyan' | 'fuchsia';
  size?: 'sm' | 'md';
}

export const BooleanToggle = ({ label, value, onChange, color = 'cyan', size = 'md' }: BooleanToggleProps) => {
    // Style configurations
    const styles = {
        cyan: {
            activeBg: 'bg-scum-accent/10',
            activeBorder: 'border-scum-accent/50',
            activeShadow: 'shadow-[0_0_10px_rgba(6,182,212,0.1)]',
            textActive: 'text-scum-accent',
            toggleBg: 'bg-scum-accent',
        },
        fuchsia: {
            activeBg: 'bg-fuchsia-500/10',
            activeBorder: 'border-fuchsia-500/50',
            activeShadow: 'shadow-[0_0_10px_rgba(217,70,239,0.1)]',
            textActive: 'text-fuchsia-400',
            toggleBg: 'bg-fuchsia-500',
        }
    };

    const currentStyle = styles[color];
    const isSm = size === 'sm';

    return (
        <div 
            onClick={() => onChange(!value)}
            className={`
            flex items-center justify-between rounded-lg border cursor-pointer transition-all duration-200 select-none h-full
            ${isSm ? 'p-2' : 'p-3'}
            ${value 
                ? `${currentStyle.activeBg} ${currentStyle.activeBorder} ${currentStyle.activeShadow}` 
                : 'bg-scum-800/30 border-scum-700/50 hover:bg-scum-800/50'}
            `}
        >
            <span className={`font-bold uppercase tracking-wider ${isSm ? 'text-[10px]' : 'text-xs'} ${value ? currentStyle.textActive : 'text-gray-500'}`}>
                {label}
            </span>
            <div className={`rounded-full relative transition-colors duration-200 ${isSm ? 'w-7 h-4' : 'w-9 h-5'} ${value ? currentStyle.toggleBg : 'bg-gray-600'}`}>
                <div 
                    className={`absolute bg-white rounded-full shadow transition-transform duration-200 
                        ${isSm 
                            ? `top-0.5 w-3 h-3 ${value ? 'translate-x-3.5' : 'translate-x-0.5'}` 
                            : `top-1 w-3 h-3 ${value ? 'translate-x-5' : 'translate-x-1'}`}
                    `} 
                />
            </div>
        </div>
    );
};

export const TimeDurationInput = ({ value, onChange, className, placeholder }: { value: number, onChange: (val: number) => void, className?: string, placeholder?: string }) => {
    
    // Helper to format hours into d h m s string
    const formatTime = (val: number): string => {
        if (val === 0) return "0";
        if (!val) return "";
        
        const totalSeconds = Math.round(val * 3600);
        
        const days = Math.floor(totalSeconds / (24 * 3600));
        let rem = totalSeconds % (24 * 3600);
        
        const hours = Math.floor(rem / 3600);
        rem %= 3600;
        
        const minutes = Math.floor(rem / 60);
        const seconds = rem % 60;

        let parts: string[] = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0) parts.push(`${seconds}s`);
        
        if (parts.length === 0) {
             // Handle extremely small values that round to 0 seconds but are not 0
             if (val > 0) return `${val}h`;
             return "0";
        }
        
        return parts.join(' ');
    };

    const [text, setText] = useState(() => formatTime(value));
    const textRef = useRef(text);

    useEffect(() => {
        textRef.current = text;
    }, [text]);

    const parseToHours = (inputVal: string): number | null => {
        if (!inputVal) return 0;
        const str = inputVal.toLowerCase().replace(/\s/g, ''); 
        
        // Pure number -> assume hours (Documentation says "set here (in hours)")
        if (!isNaN(Number(str))) return parseFloat(str);

        let totalHours = 0;
        const regex = /([\d.]+)([dhms])/g;
        let match;
        let found = false;
        
        while ((match = regex.exec(str)) !== null) {
            found = true;
            const val = parseFloat(match[1]);
            const unit = match[2];
            
            if (unit === 'd') totalHours += val * 24;
            else if (unit === 'h') totalHours += val;
            else if (unit === 'm') totalHours += val / 60;
            else if (unit === 's') totalHours += val / 3600;
        }
        
        if (!found) return null;
        return totalHours;
    };

    useEffect(() => {
        const currentParsed = parseToHours(textRef.current);
        // Sync if external value changed significantly from what is currently typed
        if (currentParsed === null || Math.abs(currentParsed - value) > 0.000001) {
             setText(formatTime(value));
        }
    }, [value]);

    const commitChange = (inputVal: string) => {
        const hours = parseToHours(inputVal);
        
        if (hours !== null) {
            const rounded = Math.round(hours * 1000000) / 1000000;
            onChange(rounded);
            setText(formatTime(rounded)); // Enforce formatting on blur
        } else {
            setText(formatTime(value)); // Reset on invalid
        }
    };

    return (
        <input 
            type="text" 
            className={className} 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            onBlur={(e) => commitChange(e.target.value)}
            onKeyDown={(e) => {
                if(e.key === 'Enter') {
                    commitChange(e.currentTarget.value);
                    e.currentTarget.blur();
                }
            }}
            placeholder={placeholder}
            title="Base unit is Hours. Shortcuts: d (day), h (hour), m (min), s (sec). e.g. 1d 2h"
        />
    );
};
