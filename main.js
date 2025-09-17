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
        console.log('Dashboard inicializálása...');
        
        // Initialize storage with better error handling
        try {
            this.storageInitialized = await window.storageManager.init();
            console.log('Storage inicializálva:', this.storageInitialized);
        } catch (error) {
            console.error('Storage inicializálási hiba:', error);
            this.storageInitialized = false;
        }
        
        this.bindEvents();
        this.initStorageUI();
        this.updateUI();
        
        // Check for stored data and auto-load
        if (this.storageInitialized) {
            await this.checkAndLoadStoredData();
        } else {
            console.log('Storage not available, skipping auto-load');
        }
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
        const ready = this.storageInitialized && window.storageManager.db;
        
        if (!supported) {
            $('#storageControls').hide();
            return;
        }

        let statusText = 'Helyi tárhely: ';
        if (!ready) {
            statusText += 'inicializálás...';
        } else if (enabled) {
            statusText += 'aktív';
        } else {
            statusText += 'inaktív';
        }
        
        $('#storageStatus').text(statusText);
        $('#clearStorage').prop('disabled', !enabled || !ready);
        
        // Visual indicator for storage status
        const toggle = $('#storageToggle');
        if (!ready && enabled) {
            toggle.prop('disabled', true);
            setTimeout(() => {
                toggle.prop('disabled', false);
                this.updateStorageUI();
            }, 1000);
        } else {
            toggle.prop('disabled', false);
        }
    }

    // Load single year
    async loadYear(year) {
        if (this.loadPromises[year]) {
            console.log(`${year} már betöltés alatt...`);
            return this.loadPromises[year];
        }

        this.loadPromises[year] = this.performYearLoad(year, true);
        return this.loadPromises[year];
    }

    // Load all years
    async loadAllYears() {
        this.showPreloader('Összes adat betöltése...');
        
        try {
            let loadedCount = 0;
            const totalYears = this.years.length;
            
            for (const year of this.years) {
                if (!this.loadedYears.has(year)) {
                    console.log(`Betöltöm ${year}...`);
                    await this.performYearLoad(year, false);
                    loadedCount++;
                    this.updateProgress(Math.round((loadedCount / totalYears) * 100));
                    await this.delay(100);
                }
            }
            
            this.updateCombinedData();
            this.updateAnalytics();
            this.updateUI();
            
            setTimeout(() => {
                this.hidePreloader();
                this.showAlert(`${loadedCount} év sikeresen betöltve`, 'success');
            }, 300);
            
        } catch (error) {
            console.error('Hiba összes adat betöltésekor:', error);
            this.hidePreloader();
            this.showAlert('Hiba történt az adatok betöltésekor', 'error');
        }
    }

    async checkAndLoadStoredData() {
        if (!this.storageInitialized || !window.storageManager.isStorageEnabled()) {
            console.log('Storage not ready for auto-load');
            return;
        }

        try {
            console.log('Ellenőrzöm a tárolt adatokat...');
            const hasData = await window.storageManager.hasStoredData();
            console.log('Van tárolt adat:', hasData);
            
            if (hasData) {
                this.showAlert('Helyi adatok találva, automatikus betöltés...', 'info');
                await this.loadAllStoredData();
            } else {
                console.log('Nincs tárolt adat az automatikus betöltéshez');
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
        // Check storage first
        if (window.storageManager.isStorageEnabled() && window.storageManager.db) {
            try {
                console.log(`Próbálom betölteni ${year} adatokat helyi tárhelyről...`);
                const storedData = await window.storageManager.loadYearData(year);
                if (storedData && storedData.adatok && storedData.adatok.length > 0) {
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

                    console.log(`${year} sikeresen betöltve helyi tárhelyről (${storedData.adatok.length} rekord)`);
                    this.showAlert(`${year} betöltve helyi tárhelyről`, 'success');
                    return true;
                } else {
                    console.log(`Nincs használható adat ${year}-ra a helyi tárhelyen`);
                }
            } catch (error) {
                console.warn(`Hiba ${year} helyi betöltésekor:`, error);
            }
        }

        // Network fetch
        if (showPreloader) {
            this.showPreloader(`${year} adatok letöltése...`);
        }

        this.updateStatus(year, 'loading');
        $(`#load${year}`).prop('disabled', true);

        try {
            console.log(`Letöltöm ${year}.json fájlt...`);
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
            
            console.log(`${year}.json sikeresen letöltve: ${data.adatok.length} rekord`);
            this.updateProgress(70);
            
            // Save to storage
            if (window.storageManager.isStorageEnabled() && window.storageManager.db) {
                try {
                    console.log(`Mentés helyi tárhelyre: ${year}`);
                    const saveResult = await window.storageManager.saveYearData(year, data);
                    if (saveResult) {
                        console.log(`${year} adatok sikeresen mentve helyi tárhelyre`);
                    } else {
                        console.warn(`${year} adatok mentése helyi tárhelyre sikertelen`);
                    }
                } catch (saveError) {
                    console.error(`Hiba ${year} mentésekor:`, saveError);
                }
            }
            
            this.updateProgress(100);
            
            this.datasets[year] = data;
            this.loadedYears.add(year);
            
            this.updateStatus(year, 'loaded');
            
            await this.delay(50);
            this.processYearData(year);
            this.updateCombinedData();
            this.updateAnalytics();
            this.updateUI();
            
            if (showPreloader) {
                setTimeout(() => this.hidePreloader(), 300);
            }

            this.showAlert(`${year} sikeresen betöltve`, 'success');
            console.log(`${year} sikeresen betöltve és feldolgozva`);
            return true;
            
        } catch (error) {
            console.error(`Hiba ${year} betöltésekor:`, error);
            this.updateStatus(year, 'error');
            
            if (showPreloader) {
                this.hidePreloader();
            }
            
            this.showAlert(`Hiba: ${year} adatok betöltése sikertelen! (${error.message})`, 'error');
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
            await window.storageManager.clearAllData();
            localStorage.removeItem('felajanlasok_storage_enabled');
            
            this.datasets = {};
            this.loadedYears.clear();
            
            // Clear DataTables properly
            this.years.forEach(year => {
                this.updateStatus(year, '');
                $(`#stats${year}`).empty();
                if (this.dataTables[year]) {
                    try {
                        this.dataTables[year].destroy();
                    } catch (e) {
                        console.warn(`Error destroying DataTable for ${year}:`, e);
                    }
                    delete this.dataTables[year];
                }
                $(`#table${year}`).empty();
            });
            
            // Clear combined table
            if (this.dataTables.combined) {
                try {
                    this.dataTables.combined.destroy();
                } catch (e) {
                    console.warn('Error destroying combined DataTable:', e);
                }
                delete this.dataTables.combined;
            }
            $('#combinedTable').empty();
            $('#combinedStats').empty();
            
            // Clear analytics
            if (window.analyticsManager) {
                // Use the new reset method
                window.analyticsManager.resetAllData();
                
                // Clear analytics tables
                ['topRevenueTable', 'top100Table', 'specialTable'].forEach(tableId => {
                    if ($.fn.DataTable.isDataTable(`#${tableId}`)) {
                        try {
                            $(`#${tableId}`).DataTable().destroy();
                        } catch (e) {
                            console.warn(`Error destroying ${tableId}:`, e);
                        }
                    }
                    $(`#${tableId}`).empty();
                });
                $('#locationsContent').empty();
            }
            
            $('#storageToggle').prop('checked', false);
            window.storageManager.setStorageEnabled(false);
            this.updateStorageUI();
            this.updateUI();
            
            this.showAlert('Minden mentett adat törölve', 'success');
            
        } catch (error) {
            console.error('Hiba adatok törlésekor:', error);
            this.showAlert('Hiba történt az adatok törlésekor', 'error');
        }
    }

    // UI Helper methods
    updateStatus(year, status) {
        const indicator = $(`#status${year}`);
        indicator.removeClass('status-loaded status-loading status-error');
        if (status) {
            indicator.addClass(`status-${status}`);
        }
    }

    updateProgress(percent) {
        $('#progressFill').css('width', `${percent}%`);
        $('#preloaderPercent').text(`${percent}%`);
    }

    showPreloader(text = 'Betöltés...') {
        $('#preloaderText').text(text);
        $('#preloader').fadeIn(200);
        this.updateProgress(0);
    }

    hidePreloader() {
        $('#preloader').fadeOut(200);
    }

    showAlert(message, type = 'info') {
        const alertId = 'alert-' + Date.now();
        const alertClass = {
            success: 'alert-success',
            error: 'alert-danger',
            warning: 'alert-warning',
            info: 'alert-info'
        }[type] || 'alert-info';

        const alertHtml = `
            <div id="${alertId}" class="alert ${alertClass} alert-dismissible fade show" role="alert" style="min-width: 300px;">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        $('#alertContainer').append(alertHtml);

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            $(`#${alertId}`).alert('close');
        }, 5000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Data processing methods
    processYearData(year) {
        if (!this.datasets[year] || !this.datasets[year].adatok) return;

        const data = this.datasets[year].adatok;
        console.log(`Feldolgozom ${year} adatokat: ${data.length} rekord`);

        // Wait a moment to ensure DOM is ready
        setTimeout(() => {
            this.createYearTable(year, data);
            this.createYearStats(year, data);
        }, 100);
    }

    createYearTable(year, data) {
        const tableId = `table${year}`;
        
        // Destroy existing table
        if (this.dataTables[year]) {
            this.dataTables[year].destroy();
            delete this.dataTables[year];
        }
        
        // Clear table content
        $(`#${tableId}`).empty();

        // Check if table container exists and is visible
        const tableContainer = $(`#${tableId}`).closest('.table-container');
        if (tableContainer.length === 0) {
            console.warn(`Table container for ${year} not found`);
            return;
        }

        // Prepare table data
        const tableData = data.map(item => [
            item.n || '',  // név
            window.dashboardUtils.formatHungarianNumber(item.o || 0), // összeg
            item.f || 0,   // fő
            window.dashboardUtils.formatTaxNumber(item.a || ''), // adószám
            item.c || ''   // cím
        ]);

        // Create table structure
        $(`#${tableId}`).html(`
            <thead>
                <tr>
                    <th>Név</th>
                    <th>Összeg (Ft)</th>
                    <th>Létszám</th>
                    <th>Adószám</th>
                    <th>Cím</th>
                </tr>
            </thead>
        `);

        // Initialize DataTable with delay to ensure visibility
        setTimeout(() => {
            try {
                this.dataTables[year] = $(`#${tableId}`).DataTable({
                    ...window.dashboardUtils.getDataTableConfig(),
                    data: tableData,
                    columns: [
                        { title: "Név" },
                        { title: "Összeg (Ft)" },
                        { title: "Létszám" },
                        { title: "Adószám" },
                        { title: "Cím" }
                    ],
                    order: [[1, 'desc']],
                    deferRender: true,
                    responsive: true
                });
                console.log(`DataTable for ${year} created successfully`);
            } catch (error) {
                console.error(`Error creating DataTable for ${year}:`, error);
            }
        }, 50);
    }

    createYearStats(year, data) {
        const totalAmount = data.reduce((sum, item) => sum + (item.o || 0), 0);
        const totalPeople = data.reduce((sum, item) => sum + (item.f || 0), 0);
        const totalCompanies = data.length;
        const avgPerPerson = totalPeople > 0 ? totalAmount / totalPeople : 0;

        const statsHtml = `
            <div class="col-md-3 col-6 mb-3">
                <div class="stats-card">
                    <div class="stats-icon"><i class="bi bi-building"></i></div>
                    <div class="stats-label">Cégek száma</div>
                    <div class="stats-value">${window.dashboardUtils.formatHungarianNumber(totalCompanies)}</div>
                </div>
            </div>
            <div class="col-md-3 col-6 mb-3">
                <div class="stats-card">
                    <div class="stats-icon"><i class="bi bi-currency-dollar"></i></div>
                    <div class="stats-label">Összes összeg</div>
                    <div class="stats-value">${window.dashboardUtils.formatHungarianNumber(totalAmount)}</div>
                </div>
            </div>
            <div class="col-md-3 col-6 mb-3">
                <div class="stats-card">
                    <div class="stats-icon"><i class="bi bi-people"></i></div>
                    <div class="stats-label">Összes fő</div>
                    <div class="stats-value">${window.dashboardUtils.formatHungarianNumber(totalPeople)}</div>
                </div>
            </div>
            <div class="col-md-3 col-6 mb-3">
                <div class="stats-card">
                    <div class="stats-icon"><i class="bi bi-person"></i></div>
                    <div class="stats-label">Átlag / fő</div>
                    <div class="stats-value">${window.dashboardUtils.formatHungarianNumber(Math.round(avgPerPerson))}</div>
                </div>
            </div>
        `;

        $(`#stats${year}`).html(statsHtml);
    }

    updateCombinedData() {
        if (this.loadedYears.size === 0) return;

        const combinedData = {};
        
        // Combine data from all loaded years
        this.loadedYears.forEach(year => {
            if (this.datasets[year] && this.datasets[year].adatok) {
                this.datasets[year].adatok.forEach(item => {
                    const key = item.n || 'Unknown';
                    if (!combinedData[key]) {
                        combinedData[key] = {
                            name: key,
                            adoszam: item.a || '',
                            cim: item.c || '',
                            2023: { o: 0, f: 0 },
                            2024: { o: 0, f: 0 },
                            2025: { o: 0, f: 0 }
                        };
                    }
                    combinedData[key][year].o += item.o || 0;
                    combinedData[key][year].f += item.f || 0;
                });
            }
        });

        this.createCombinedTable(Object.values(combinedData));
        this.createCombinedStats(Object.values(combinedData));
    }

    createCombinedTable(data) {
        const tableId = 'combinedTable';
        
        if (this.dataTables.combined) {
            this.dataTables.combined.destroy();
            delete this.dataTables.combined;
        }
        
        $(`#${tableId}`).empty();

        const tableData = data.map(item => {
            const totalAmount = item[2023].o + item[2024].o + item[2025].o;
            const totalPeople = item[2023].f + item[2024].f + item[2025].f;
            const avgPerPerson = totalPeople > 0 ? totalAmount / totalPeople : 0;
            const yearlyIncome = window.dashboardUtils.calculateYearlyIncome(totalAmount, totalPeople);

            return [
                item.name,
                window.dashboardUtils.formatHungarianNumber(item[2023].o),
                item[2023].f,
                window.dashboardUtils.formatHungarianNumber(item[2024].o),
                item[2024].f,
                window.dashboardUtils.formatHungarianNumber(item[2025].o),
                item[2025].f,
                window.dashboardUtils.formatHungarianNumber(totalAmount),
                window.dashboardUtils.formatHungarianNumber(Math.round(avgPerPerson)),
                window.dashboardUtils.formatHungarianNumber(yearlyIncome),
                window.dashboardUtils.formatTaxNumber(item.adoszam),
                item.cim
            ];
        });

        $(`#${tableId}`).html(`
            <thead>
                <tr>
                    <th>Név</th>
                    <th>2023 összeg</th>
                    <th>2023 létszám</th>
                    <th>2024 összeg</th>
                    <th>2024 létszám</th>
                    <th>2025 összeg</th>
                    <th>2025 létszám</th>
                    <th>Összes összeg</th>
                    <th>Átlag/fő</th>
                    <th>Éves jövedelem/fő</th>
                    <th>Adószám</th>
                    <th>Cím</th>
                </tr>
            </thead>
        `);

        // Initialize with delay to ensure visibility
        setTimeout(() => {
            try {
                this.dataTables.combined = $(`#${tableId}`).DataTable({
                    ...window.dashboardUtils.getDataTableConfig(),
                    data: tableData,
                    columns: [
                        { title: "Név" },
                        { title: "2023 összeg" },
                        { title: "2023 létszám" },
                        { title: "2024 összeg" },
                        { title: "2024 létszám" },
                        { title: "2025 összeg" },
                        { title: "2025 létszám" },
                        { title: "Összes összeg" },
                        { title: "Átlag/fő" },
                        { title: "Éves jövedelem/fő" },
                        { title: "Adószám" },
                        { title: "Cím" }
                    ],
                    order: [[7, 'desc']],
                    scrollX: true,
                    deferRender: true,
                    responsive: true
                });
                console.log('Combined DataTable created successfully');
            } catch (error) {
                console.error('Error creating combined DataTable:', error);
            }
        }, 100);
    }

    createCombinedStats(data) {
        const totalStats = {
            companies: data.length,
            amount2023: 0,
            amount2024: 0,
            amount2025: 0,
            people2023: 0,
            people2024: 0,
            people2025: 0
        };

        data.forEach(item => {
            totalStats.amount2023 += item[2023].o;
            totalStats.amount2024 += item[2024].o;
            totalStats.amount2025 += item[2025].o;
            totalStats.people2023 += item[2023].f;
            totalStats.people2024 += item[2024].f;
            totalStats.people2025 += item[2025].f;
        });

        const totalAmount = totalStats.amount2023 + totalStats.amount2024 + totalStats.amount2025;
        const totalPeople = totalStats.people2023 + totalStats.people2024 + totalStats.people2025;

        const change2324 = totalStats.amount2023 > 0 ? 
            window.dashboardUtils.calculatePercentageChange(totalStats.amount2023, totalStats.amount2024) : 0;
        const change2425 = totalStats.amount2024 > 0 ? 
            window.dashboardUtils.calculatePercentageChange(totalStats.amount2024, totalStats.amount2025) : 0;

        const statsHtml = `
            <div class="col-md-2 col-6 mb-3">
                <div class="stats-card">
                    <div class="stats-icon"><i class="bi bi-building"></i></div>
                    <div class="stats-label">Összes cég</div>
                    <div class="stats-value">${window.dashboardUtils.formatHungarianNumber(totalStats.companies)}</div>
                </div>
            </div>
            <div class="col-md-2 col-6 mb-3">
                <div class="stats-card">
                    <div class="stats-icon"><i class="bi bi-currency-dollar"></i></div>
                    <div class="stats-label">3 év összesen</div>
                    <div class="stats-value">${window.dashboardUtils.formatHungarianNumber(totalAmount)}</div>
                </div>
            </div>
            <div class="col-md-2 col-6 mb-3">
                <div class="stats-card">
                    <div class="stats-icon"><i class="bi bi-people"></i></div>
                    <div class="stats-label">Összes fő</div>
                    <div class="stats-value">${window.dashboardUtils.formatHungarianNumber(totalPeople)}</div>
                </div>
            </div>
            <div class="col-md-2 col-6 mb-3">
                <div class="stats-card">
                    <div class="stats-icon"><i class="bi bi-calendar"></i></div>
                    <div class="stats-label">2023</div>
                    <div class="stats-value">${window.dashboardUtils.formatHungarianNumber(totalStats.amount2023)}</div>
                </div>
            </div>
            <div class="col-md-2 col-6 mb-3">
                <div class="stats-card">
                    <div class="stats-icon"><i class="bi bi-calendar2"></i></div>
                    <div class="stats-label">2024 <span class="change-${change2324 > 0 ? 'positive' : change2324 < 0 ? 'negative' : 'neutral'}">${change2324 > 0 ? '+' : ''}${change2324}%</span></div>
                    <div class="stats-value">${window.dashboardUtils.formatHungarianNumber(totalStats.amount2024)}</div>
                </div>
            </div>
            <div class="col-md-2 col-6 mb-3">
                <div class="stats-card">
                    <div class="stats-icon"><i class="bi bi-calendar3"></i></div>
                    <div class="stats-label">2025 <span class="change-${change2425 > 0 ? 'positive' : change2425 < 0 ? 'negative' : 'neutral'}">${change2425 > 0 ? '+' : ''}${change2425}%</span></div>
                    <div class="stats-value">${window.dashboardUtils.formatHungarianNumber(totalStats.amount2025)}</div>
                </div>
            </div>
        `;

        $('#combinedStats').html(statsHtml);
    }

    updateAnalytics() {
        if (window.analyticsManager && this.loadedYears.size > 0) {
            window.analyticsManager.updateAnalyticsView(this.datasets);
        }
    }

    updateUI() {
        // Update tab states based on loaded data
        this.years.forEach(year => {
            const tabButton = $(`#year${year}-tab`);
            if (this.loadedYears.has(year)) {
                tabButton.removeClass('disabled').prop('disabled', false);
            } else {
                tabButton.addClass('disabled').prop('disabled', true);
            }
        });

        // Enable analytics tab if any data is loaded
        const analyticsTab = $('#analytics-tab');
        if (this.loadedYears.size > 0) {
            analyticsTab.removeClass('disabled').prop('disabled', false);
        } else {
            analyticsTab.addClass('disabled').prop('disabled', true);
        }
    }
}

// Initialize when DOM is ready
$(document).ready(function() {
    console.log('DOM ready, creating dashboard instance...');
    window.dashboard = new DashboardManager();
});
