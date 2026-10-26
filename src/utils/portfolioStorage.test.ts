import { describe, expect, it } from 'vitest';
import { createPortfolioPersistence, PORTFOLIO_STORAGE_KEY, StorageConflictError, type StorageAdapter, type StorageLock } from './portfolioStorage';

function fixture(initial: string | null = 'original') {
    let value = initial;
    let queue = Promise.resolve();
    const lock: StorageLock = action => {
        const result = queue.then(action);
        queue = result.then(() => undefined, () => undefined);
        return result;
    };
    const storage: StorageAdapter = {
        async get(key) { expect(key).toBe(PORTFOLIO_STORAGE_KEY); return value === null ? null : { value }; },
        async set(key, next) { expect(key).toBe(PORTFOLIO_STORAGE_KEY); value = next; },
        async remove(key) { expect(key).toBe(PORTFOLIO_STORAGE_KEY); value = null; },
    };
    return { storage, lock, current: () => value, open: () => createPortfolioPersistence(storage, lock) };
}

describe('protected portfolio persistence', () => {
    it('requires loading and preserves the exact legacy data until saving', async () => {
        const environment = fixture('{"p":[],"t":[],"v":[]}');
        const session = environment.open();
        await expect(session.save('new')).rejects.toThrow(/chargée/);
        expect(await session.read()).toEqual({ value: '{"p":[],"t":[],"v":[]}' });
        expect(environment.current()).toBe('{"p":[],"t":[],"v":[]}');
        await session.save('new');
        expect(environment.current()).toBe('new');
        expect(session.hasExternalChange('new')).toBe(false);
    });

    it('supports an empty store and successive writes by the same tab', async () => {
        const environment = fixture(null);
        const session = environment.open();
        expect(await session.read()).toBeNull();
        await Promise.all([session.save('first'), session.save('second')]);
        expect(environment.current()).toBe('second');
    });

    it('does not let a stale tab overwrite another tab', async () => {
        const environment = fixture();
        const first = environment.open();
        const second = environment.open();
        await Promise.all([first.read(), second.read()]);
        await first.save('original + 50');
        expect(second.hasExternalChange(environment.current())).toBe(true);
        await expect(second.save('original + 25')).rejects.toBeInstanceOf(StorageConflictError);
        expect(environment.current()).toBe('original + 50');
        await second.read();
        await second.save('original + 50 + 25');
        expect(environment.current()).toBe('original + 50 + 25');
    });

    it('serializes simultaneous writes across tabs and only accepts one revision', async () => {
        const environment = fixture();
        const first = environment.open();
        const second = environment.open();
        await Promise.all([first.read(), second.read()]);
        const results = await Promise.allSettled([first.save('first'), second.save('second')]);
        expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected']);
        expect(environment.current()).toBe('first');
    });

    it('surfaces failed writes without advancing the revision and permits retry', async () => {
        const environment = fixture();
        const session = environment.open();
        await session.read();
        const set = environment.storage.set;
        environment.storage.set = async () => { throw new Error('QuotaExceededError'); };
        await expect(session.save('unsaved')).rejects.toThrow('QuotaExceededError');
        expect(environment.current()).toBe('original');
        expect(session.hasExternalChange('original')).toBe(false);
        environment.storage.set = set;
        await session.save('unsaved');
        expect(environment.current()).toBe('unsaved');
    });

    it('does not write when locking is unavailable', async () => {
        const environment = fixture();
        const session = createPortfolioPersistence(environment.storage, async () => { throw new Error('lock denied'); });
        await session.read();
        await expect(session.save('unsafe')).rejects.toThrow('lock denied');
        expect(environment.current()).toBe('original');
    });

    it('protects removals from conflicts and preserves data when removal fails', async () => {
        const environment = fixture();
        const first = environment.open();
        const second = environment.open();
        await Promise.all([first.read(), second.read()]);
        await first.save('latest');
        await expect(second.remove()).rejects.toBeInstanceOf(StorageConflictError);
        environment.storage.remove = async () => { throw new Error('remove denied'); };
        await expect(first.remove()).rejects.toThrow('remove denied');
        expect(environment.current()).toBe('latest');
    });

    it('detects an external clear and permits removal of the loaded revision', async () => {
        const environment = fixture();
        const session = environment.open();
        await session.read();
        expect(session.hasExternalChange(null)).toBe(true);
        await session.remove();
        expect(environment.current()).toBeNull();
        expect(session.hasExternalChange(null)).toBe(false);
    });
});