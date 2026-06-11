/// <reference types="vite/client" />

interface Window {
    storage: {
        get(key: string): Promise<{ value: string } | null>;
        set(key: string, value: string): Promise<void>;
    };
}