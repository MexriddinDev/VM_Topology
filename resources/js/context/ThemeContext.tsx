import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ThemeMode } from '../types';

interface ThemeContextValue {
    theme: ThemeMode;
    toggleTheme: () => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'dark',
    toggleTheme: () => {},
    isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('vserver-theme');
        return saved === 'light' ? 'light' : 'dark';
    });

    useEffect(() => {
        localStorage.setItem('vserver-theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
