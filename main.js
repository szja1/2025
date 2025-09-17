class DashboardManager {
    constructor() {
        this.datasets = {};
        this.years = [2023, 2024, 2025];
        this.loadedYears = new Set();
        this.dataTables = {};
        this.loadPromises = {};
        this.storageInitialized = false;
        this.init();
    }

    async init() {
        // Initialize storage
        this.storageInitialized = await window.storageManager.init();
        
        this.bindEvents();
        this.initStorageUI();
        this.updateUI();
        
        // Check for stored data and auto-load
        await this.checkAndLoadStoredData();
    }

    bindEvents() {
        this.years.forEach(year => {
            $(`#load${year}`).on('click', () => this.loadYear(year));
        });
        $('#loadAll').on('click', () => this.loadAllYears());
        $('#clearStorage').on('click', () => this.clearAllStoredData());
        $('#storageToggle').on('change', (e) => this.toggleStorage(e.target.checked));
    }

    initStorageUI() {
        const storageEnabled = window.storageManager.isStorageEnabled();
        $('#storageToggle').prop('checked', storageEnabled);
        this.updateStorageUI();
    }

    updateStorageUI() {
        const enabled = window.storageManager.isStorageEnabled();
        const supported = window.storageManager.isIndexedDBSupported();
        
        if (!supported) {
            $('#storageControls').hide();
            return;
        }

        $('#storageStatus').text(enabled ? 'Helyi tárolás aktív' : 'Helyi tárolás inaktív');
        $('#clearStorage').prop('disabled', !enabled);
    }

    async checkAndLoadStoredData() {
        if (!this.storageInitialized || !window.storageManager.isStorageEnabled()) {
            return;
        }

        try {
            const hasData = await window.storageManager.hasStoredData();
            if (hasData) {
                this.showAlert('Helyi adatok találva, automatikus betöltés...', 'info');
                await this.loadAllStoredData();
            }
        } catch (error) {
            console.error('Hiba stored adatok ellenőrzésekor:', error);
        }
    }

    async loadAllStoredData() {
        this.showPreloader('Helyi adatok betöltése...');

        try {
            const storedData = await window.storageManager.getAllStoredData();
            let loadedCount = 0;

            for (const year of this.years) {
                if (storedData[year]) {
                    this.datasets[year] = storedData[year];
                    this.loadedYears.add(year);
                    this.updateStatus(year, 'loaded');
                    this.processYearData(year);
                    loadedCount++;
                    this.updateProgress(33 + (loadedCount * 22));
                }
            }

            this.updateCombinedData();
            this.updateAnalytics();
            this.updateUI();

            setTimeout(() => {
                this.hidePreloader();
                this.showAlert(`${loadedCount} év helyi adatai betöltve`, 'success');
            }, 300);

        } catch (error) {
            this.hidePreloader();
            console.error('Hiba stored adatok betöltésekor:', error);
            this.showAlert('Hiba a helyi adatok betöltésekor', 'error');
        }
    }

    async performYearLoad(year, showPreloader) {
        // First try to load from storage if enabled
        if (window.storageManager.isStorageEnabled()) {
            try {
                const storedData = await window.storageManager.loadYearData(year);
                if (storedData) {
                    this.datasets[year] = storedData;
                    this.loadedYears.add(year);
                    this.updateStatus(year, 'loaded');
                    
                    if (showPreloader) {
                        this.updateProgress(100);
                    }
                    
                    await this.delay(50);
                    this.processYearData(year);
                    this.updateCombinedData();
                    this.updateAnalytics();
                    this.updateUI();
                    
                    if (showPreloader) {
                        setTimeout(() => this.hidePreloader(), 300);
                    }

                    console.log(`${year} betöltve helyi tárolóból`);
                    return true;
                }
            } catch (error) {
                console.warn(`Hiba ${year} helyi betöltésekor:`, error);
                // Continue with network fetch
            }
        }

        // Network fetch
        if (showPreloader) {
            this.showPreloader(`${year} adatok betöltése...`);
        }

        this.updateStatus(year, 'loading');
        $(`#load${year}`).prop('disabled', true);

        try {
            const response = await fetch(`${year}.json`);
            if (!response.ok) {
                throw new Error(`HTTP hiba: ${response.status} - ${response.statusText}`);
            }
            
            this.updateProgress(30);
            await this.delay(100);
            
            const data = await response.json();
            
            if (!data || !data.adatok || !Array.isArray(data.adatok)) {
                throw new Error(`Érvénytelen adat formátum: ${year}.json`);
            }
            
            this.updateProgress(70);
            
            // Save to storage if enabled
            if (window.storageManager.isStorageEnabled()) {
                await window.storageManager.saveYearData(year, data);
            }
            
            this.updateProgress(100);
            
            this.datasets[year] = data;
            this.loadedYears.add(year);
            
            this.updateStatus(year, 'loaded');
            
            // Process data after successful load
            await this.delay(50);
            this.processYearData(year);
            this.updateCombinedData();
            this.updateAnalytics();
            this.updateUI();
            
            if (showPreloader) {
                setTimeout(() => this.hidePreloader(), 300);
            }

            console.log(`${year} sikeresen betöltve és mentve`);
            return true;
            
        } catch (error) {
            console.error(`Hiba ${year} betöltésekor:`, error);
            this.updateStatus(year, 'error');
            
            if (showPreloader) {
                this.hidePreloader();
            }
            
            this.showAlert(`Hiba: ${year} adatok betöltése sikertelen! (${error.message})`);
            return false;
            
        } finally {
            $(`#load${year}`).prop('disabled', false);
            delete this.loadPromises[year];
        }
    }

    toggleStorage(enabled) {
        window.storageManager.setStorageEnabled(enabled);
        this.updateStorageUI();
        
        if (enabled) {
            this.showAlert('Helyi tárolás bekapcsolva', 'success');
        } else {
            this.showAlert('Helyi tárolás kikapcsolva, adatok törölve', 'info');
        }
    }

    async clearAllStoredData() {
        try {
            // Clear IndexedDB
            await window.storageManager.clearAllData();
            
            // Clear localStorage
            localStorage.removeItem('felajanlasok_storage_enabled');
            
            // Clear current data
            this.datasets = {};
            this.loadedYears.clear();
            
            // Clear UI
            this.years.forEach(year => {
                this.updateStatus(year, '');
                $(`#stats${year}`).empty();
                if (this.dataTables[year]) {
                    this.dataTables[year].destroy();
                    delete this.dataTables[year];
                }
                $(`#table${year}`).empty();
            });
            
            if (this.dataTables.combined) {
                this.dataTables.combined.destroy();
                delete this.dataTables.combined;
            }
            $('#combinedTable').empty();
            $('#combinedStats').empty();
            
            // Reset storage toggle
            $('#storageToggle').prop('checked', false);
            window.storageManager.setStorageEnabled(false);
            this.updateStorageUI();
            this.updateUI();
            
            // Clear analytics
            if (window.analyticsManager) {
                window.analyticsManager.topRevenueData = [];
                window.analyticsManager.top100Data = [];
                window.analyticsManager.locationsData = [];
                window.analyticsManager.specialData = [];
                
                // Clear analytics tables
                ['topRevenueTable', 'top100Table', 'specialTable'].forEach(tableId => {
                    if ($.fn.DataTable.isDataTable(`#${tableId}`)) {
                        $(`#${tableId}`).DataTable().destroy();
                    }
                    $(`#${tableId}`).empty();
                });
                $('#locationsContent').empty();
            }
            
            this.showAlert('Minden mentett adat törölve', 'success');
            
        } catch (error) {
            console.error('Hiba adatok törlésekor:', error);
            this.showAlert('Hiba történt az adatok törlésekor', 'error');
        }
    }

    // ... rest of the methods remain the same
}
