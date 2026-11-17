'use client';

import {useSyncExternalStore} from 'react';
import {useDarkMode} from './DarkModeProvider';
import {focusVisibleClassName} from './controlStyles';

const emptySubscribe = () => () => {
};

export default function Header() {
    const {theme, setTheme} = useDarkMode();
    const isHydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
    const displayTheme = isHydrated ? theme : 'light';

    const handleThemeToggle = () => {
        if (theme === 'light') {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    };

    const getThemeIcon = () => {
        if (displayTheme === 'light') {
            return '☀️';
        } else {
            return '🌙';
        }
    };

    return (
        <header
            className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm
            dark:border-slate-700 dark:bg-slate-900/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                        <p className="text-xl font-semibold text-emerald-800 dark:text-emerald-200">
                            kodate
                        </p>
                    </div>

                    <div className="flex items-center">
                        <button
                            type="button"
                            onClick={handleThemeToggle}
                            aria-label="ダークモード"
                            aria-pressed={displayTheme === 'dark'}
                            className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium
                            text-slate-700 transition-colors duration-200 hover:bg-slate-100
                            ${focusVisibleClassName} dark:text-slate-300 dark:hover:bg-slate-800`}
                            title={`現在: ${displayTheme === 'light' ? 'ライトモード' : 'ダークモード'}`}
                        >
                            <span aria-hidden="true" className="text-lg">{getThemeIcon()}</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
