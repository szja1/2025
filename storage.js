// IndexedDB storage manager
class StorageManager {
    constructor() {
        this.dbName = 'FelajanlasokDB';
        this.version = 1;
        this.db = null;
        this.storageEnabled = localStorage.getItem('felajanlasok_storage_enabled') === 'true';
    }

    async init() {
        if (!this.isIndexedDBSupported()) {
            console.warn('IndexedDB nem támogatott');
            return false;
        }

        try {
            this.db = await this.openDatabase();
            return true;
        } catch (error) {
            console.error('IndexedDB inicializálási hiba:', error);
            return false;
        }
    }

    isIndexedDBSupported() {
        return 'indexedDB' in window;
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores for each year
                ['2023', '2024', '2025'].forEach(year => {
                    if (!db.objectStoreNames.contains(`data${year}`)) {
                        const store = db.createObjectStore(`data${year}`, { 
                            keyPath: 'id',
                            autoIncrement: true 
                        });
                        
                        // Create indexes
                        store.createIndex('adoszam', 'a', { unique: false });
                        store.createIndex('nev', 'n', { unique: false });
                        store.createIndex('osszeg', 'o', { unique: false });
                        store.createIndex('letszam', 'f', { unique: false });
                    }
                });

                // Metadata store
                if (!db.objectStoreNames.contains('metadata')) {
                    const metaStore = db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }

    async saveYearData(year, data) {
        if (!this.storageEnabled || !this.db) return false;

        try {
            const transaction = this.db.transaction([`data${year}`, 'metadata'], 'readwrite');
            const store = transaction.objectStore(`data${year}`);
            const metaStore = transaction.objectStore('metadata');

            // Clear existing data
            await store.clear();

            // Save new data
            if (data && data.adatok && Array.isArray(data.adatok)) {
                for (const item of data.adatok) {
                    await store.add(item);
                }
            }

            // Save metadata
            await metaStore.put({
                key: `lastUpdate${year}`,
                value: new Date().toISOString()
            });

            await transaction.complete;
            console.log(`${year} adatok mentve IndexedDB-be`);
            return true;
        } catch (error) {
            console.error(`Hiba ${year} mentésekor:`, error);
            return false;
        }
    }

    async loadYearData(year) {
        if (!this.db) return null;

        try {
            const transaction = this.db.transaction([`data${year}`], 'readonly');
            const store = transaction.objectStore(`data${year}`);
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const data = request.result;
                    if (data && data.length > 0) {
                        resolve({ adatok: data });
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`Hiba ${year} betöltésekor:`, error);
            return null;
        }
    }

    async hasStoredData() {
        if (!this.db) return false;

        try {
            const years = ['2023', '2024', '2025'];
            const promises = years.map(year => this.loadYearData(year));
            const results = await Promise.all(promises);
            
            return results.some(data => data !== null);
        } catch (error) {
            console.error('Hiba stored data ellenőrzésekor:', error);
            return false;
        }
    }

    async getAllStoredData() {
        if (!this.db) return {};

        try {
            const data = {};
            const years = ['2023', '2024', '2025'];
            
            for (const year of years) {
                const yearData = await this.loadYearData(year);
                if (yearData) {
                    data[year] = yearData;
                }
            }
            
            return data;
        } catch (error) {
            console.error('Hiba összes adat betöltésekor:', error);
            return {};
        }
    }

    async getMetadata(key) {
        if (!this.db) return null;

        try {
            const transaction = this.db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.get(key);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const result = request.result;
                    resolve(result ? result.value : null);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Metadata lekérési hiba:', error);
            return null;
        }
    }

    async clearAllData() {
        if (!this.db) return false;

        try {
            const years = ['2023', '2024', '2025'];
            const transaction = this.db.transaction([...years.map(y => `data${y}`), 'metadata'], 'readwrite');

            // Clear all year data
            for (const year of years) {
                const store = transaction.objectStore(`data${year}`);
                await store.clear();
            }

            // Clear metadata
            const metaStore = transaction.objectStore('metadata');
            await metaStore.clear();

            await transaction.complete;
            console.log('Összes IndexedDB adat törölve');
            return true;
        } catch (error) {
            console.error('Hiba adatok törlésekor:', error);
            return false;
        }
    }

    async deleteDatabase() {
        try {
            if (this.db) {
                this.db.close();
                this.db = null;
            }

            return new Promise((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(this.dbName);
                deleteReq.onsuccess = () => {
                    console.log('IndexedDB adatbázis törölve');
                    resolve(true);
                };
                deleteReq.onerror = () => reject(deleteReq.error);
                deleteReq.onblocked = () => {
                    console.warn('IndexedDB törlése blokkolva');
                    resolve(false);
                };
            });
        } catch (error) {
            console.error('Hiba adatbázis törlésekor:', error);
            return false;
        }
    }

    setStorageEnabled(enabled) {
        this.storageEnabled = enabled;
        localStorage.setItem('felajanlasok_storage_enabled', enabled.toString());
        
        if (!enabled) {
            // If disabled, clear all stored data
            this.clearAllData();
        }
    }

    isStorageEnabled() {
        return this.storageEnabled;
    }
}

// Global storage manager instance
window.storageManager = new StorageManager();
