class DashboardManager {
    constructor() {
        this.datasets = {};
        this.years = [2023, 2024, 2025];
        this.loadedYears = new Set();
        this.dataTables = {};
        this.loadPromises = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateUI();
    }

    bindEvents() {
        this.years.forEach(year => {
            $(`#load${year}`).on('click', () => this.loadYear(year));
        });
        $('#loadAll').on('click', () => this.loadAllYears());
    }

    async loadYear(year, showPreloader = true) {
        if (this.loadPromises[year]) {
            return this.loadPromises[year];
        }

        this.loadPromises[year] = this.performYearLoad(year, showPreloader);
        return this.loadPromises[year];
    }

    async performYearLoad(year, showPreloader) {
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

            console.log(`${year} sikeresen betöltve`);
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

    async loadAllYears() {
        this.showPreloader('Összes adat betöltése...');
        
        const results = [];
        
        // Load sequentially to avoid conflicts
        for (const year of this.years) {
            try {
                const result = await this.loadYear(year, false);
                results.push(result);
                this.updateProgress(33 + (this.years.indexOf(year) * 22));
            } catch (error) {
                console.error(`Hiba ${year} betöltésekor:`, error);
                results.push(false);
            }
        }
        
        setTimeout(() => {
            this.hidePreloader();
            const successCount = results.filter(r => r === true).length;
            if (successCount === this.years.length) {
                this.showAlert('Minden adat sikeresen betöltve!', 'success');
            } else if (successCount > 0) {
                this.showAlert(`${successCount}/${this.years.length} adat betöltve`, 'warning');
            } else {
                this.showAlert('Nem sikerült betölteni az adatokat!', 'error');
            }
        }, 200);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    updateStatus(year, status) {
        const statusEl = $(`#status${year}`);
        statusEl.removeClass('status-loaded status-loading status-error');
        statusEl.addClass(`status-${status}`);
    }

    showPreloader(text) {
        $('#preloaderText').text(text);
        $('#preloaderPercent').text('0%');
        $('#progressFill').css('width', '0%');
        $('#preloader').show();
    }

    updateProgress(percent) {
        const clampedPercent = Math.min(100, Math.max(0, percent));
        $('#preloaderPercent').text(`${Math.round(clampedPercent)}%`);
        $('#progressFill').css('width', `${clampedPercent}%`);
    }

    hidePreloader() {
        $('#preloader').hide();
    }

    processYearData(year) {
        const data = this.datasets[year];
        if (!data || !data.adatok) {
            console.warn(`Nincs adat a ${year} évhez`);
            return;
        }

        const adatok = data.adatok;
        const totalO = _.sumBy(adatok, 'o') || 0;
        const totalF = _.sumBy(adatok, 'f') || 0;
        const avgPerPerson = totalF > 0 ? Math.round(totalO / totalF) : 0;
        const avgYearlyIncome = totalF > 0 ? Math.round((totalO / totalF) / 0.0015) : 0;
        
        // Új dashboard kártyák kiszámítása
        const companiesAbove1M = adatok.filter(d => (d.o || 0) > 1000000).length;
        const avgCompaniesPerEmployee = adatok.filter(d => (d.f || 0) > 0).length > 0 ? 
            Math.round(totalO / adatok.filter(d => (d.f || 0) > 0).length) : 0;
        
        // Sort safely
        const sortedAdatok = [...adatok].sort((a, b) => (b.o || 0) - (a.o || 0));
        const topCompaniesRevenue = sortedAdatok
            .slice(0, 10)
            .reduce((sum, d) => sum + (d.o || 0), 0);

        const statsHtml = `
            <div class="col-6 col-lg-3">
                <div class="stats-card">
                    <div class="stats-icon">
                        <i class="bi bi-building"></i>
                    </div>
                    <div class="stats-label">Cégek száma</div>
                    <div class="stats-value">${adatok.length.toLocaleString('hu-HU')}</div>
                </div>
            </div>
            <div class="col-6 col-lg-3">
                <div class="stats-card">
                    <div class="stats-icon">
                        <i class="bi bi-currency-dollar"></i>
                    </div>
                    <div class="stats-label">Összes felajánlás</div>
                    <div class="stats-value">${totalO.toLocaleString('hu-HU')}</div>
                </div>
            </div>
            <div class="col-6 col-lg-3">
                <div class="stats-card">
                    <div class="stats-icon">
                        <i class="bi bi-people"></i>
                    </div>
                    <div class="stats-label">Felajánlók száma</div>
                    <div class="stats-value">${totalF.toLocaleString('hu-HU')}</div>
                </div>
            </div>
            <div class="col-6 col-lg-3">
                <div class="stats-card">
                    <div class="stats-icon">
                        <i class="bi bi-calculator"></i>
                    </div>
                    <div class="stats-label">Átlag/fő</div>
                    <div class="stats-value">${avgPerPerson.toLocaleString('hu-HU')}</div>
                </div>
            </div>
            <div class="col-6 col-lg-3">
                <div class="stats-card">
                    <div class="stats-icon">
                        <i class="bi bi-graph-up"></i>
                    </div>
                    <div class="stats-label">Éves jövedelem/fő</div>
                    <div class="stats-value">${avgYearlyIncome.toLocaleString('hu-HU')}</div>
                </div>
            </div>
            <div class="col-6 col-lg-3">
                <div class="stats-card">
                    <div class="stats-icon">
                        <i class="bi bi-trophy"></i>
                    </div>
                    <div class="stats-label">1M+ felajánlás</div>
                    <div class="stats-value">${companiesAbove1M.toLocaleString('hu-HU')}</div>
                </div>
            </div>
            <div class="col-6 col-lg-3">
                <div class="stats-card">
                    <div class="stats-icon">
                        <i class="bi bi-pie-chart"></i>
                    </div>
                    <div class="stats-label">Átlag/cég</div>
                    <div class="stats-value">${avgCompaniesPerEmployee.toLocaleString('hu-HU')}</div>
                </div>
            </div>
            <div class="col-6 col-lg-3">
                <div class="stats-card">
                    <div class="stats-icon">
                        <i class="bi bi-star"></i>
                    </div>
                    <div class="stats-label">TOP 10 bevétel</div>
                    <div class="stats-value">${topCompaniesRevenue.toLocaleString('hu-HU')}</div>
                </div>
            </div>
        `;

        $(`#stats${year}`).html(statsHtml);

        const tableData = adatok.map(d => {
            const o = d.o || 0;
            const f = d.f || 0;
            const avgPerPerson = f > 0 ? Math.round(o / f) : 0;
            const yearlyIncome = f > 0 ? Math.round((o / f) * 100 / 0.15) : 0;
            
            return [
                d.i || '',
                d.n || '',
                o.toLocaleString('hu-HU'),
                f.toLocaleString('hu-HU'),
                avgPerPerson.toLocaleString('hu-HU'),
                yearlyIncome.toLocaleString('hu-HU'),
                window.dashboardUtils.formatTaxNumber(d.a) || '',
                d.c || ''
            ];
        });

        // Safely destroy existing DataTable
        if ($.fn.DataTable.isDataTable(`#table${year}`)) {
            $(`#table${year}`).DataTable().destroy();
        }

        // Clear table content
        $(`#table${year}`).empty();

        this.dataTables[year] = $(`#table${year}`).DataTable({
            ...window.dashboardUtils.getDataTableConfig({
                order: [[2, 'desc']]
            }),
            data: tableData,
            columns: [
                { title: "Sorszám", width: "80px" },
                { title: "Név" },
                { title: "Összeg", width: "120px" },
                { title: "Létszám", width: "100px" },
                { title: "Átlag/fő", width: "120px" },
                { title: "Éves jövedelem/fő", width: "150px" },
                { title: "Adószám", width: "130px" },
                { title: "Cím" }
            ]
        });

        console.log(`${year} táblázat inicializálva`);
    }

    updateCombinedData() {
        if (this.loadedYears.size === 0) return;

        const companies = {};
        
        this.years.forEach(year => {
            if (!this.datasets[year] || !this.datasets[year].adatok) return;
            
            this.datasets[year].adatok.forEach(d => {
                const taxNumber = d.a || 'unknown';
                if (!companies[taxNumber]) {
                    companies[taxNumber] = {
                        nev: d.n || '',
                        adoszam: d.a || '',
                        cim: d.c || '',
                        2023: { o: 0, f: 0 },
                        2024: { o: 0, f: 0 },
                        2025: { o: 0, f: 0 }
                    };
                }
                companies[taxNumber][year].o += (d.o || 0);
                companies[taxNumber][year].f += (d.f || 0);
            });
        });

        const rows = Object.values(companies).map(c => {
            const totalO = c[2023].o + c[2024].o + c[2025].o;
            const totalF = c[2023].f + c[2024].f + c[2025].f;
            const avgPerPerson = totalF > 0 ? Math.round(totalO / totalF) : 0;
            const yearlyIncomePerPerson = totalF > 0 ? Math.round((totalO / totalF) * 100 / 0.15) : 0;

            return [
                c.nev,
                c[2023].o.toLocaleString('hu-HU'),
                c[2023].f.toLocaleString('hu-HU'),
                c[2024].o.toLocaleString('hu-HU'),
                c[2024].f.toLocaleString('hu-HU'),
                c[2025].o.toLocaleString('hu-HU'),
                c[2025].f.toLocaleString('hu-HU'),
                totalO.toLocaleString('hu-HU'),
                avgPerPerson.toLocaleString('hu-HU'),
                yearlyIncomePerPerson.toLocaleString('hu-HU'),
                window.dashboardUtils.formatTaxNumber(c.adoszam),
                c.cim
            ];
        });

        const totalCompanies = rows.length;
        const totalO = _.sumBy(Object.values(companies), c => c[2023].o + c[2024].o + c[2025].o);
        const totalF = _.sumBy(Object.values(companies), c => c[2023].f + c[2024].f + c[2025].f);
        const avgPerPerson = totalF > 0 ? Math.round(totalO / totalF) : 0;
        const avgYearlyIncome = totalF > 0 ? Math.round((totalO / totalF) / 0.0015) : 0;
        
        // Új kártyák az összesítőhöz
        const companiesAbove1M = Object.values(companies).filter(c => 
            (c[2023].o + c[2024].o + c[2025].o) > 1000000).length;
        const avgPerCompany = totalCompanies > 0 ? Math.round(totalO / totalCompanies) : 0;
        const growthCompanies = Object.values(companies).filter(c => 
            c[2025].o > c[2024].o && c[2024].o > c[2023].o).length;

        const combinedStatsHtml = `
            <div class="col-6 col-lg-3">
                <div class="stats-card">
                    <div class="stats-icon">
                        <i class="bi bi-building"></i>
                    </div>
                    <div class="stats-label">Összes cég</div>
                    <div class="stats-value">${totalCompanies.toLocaleString('hu-HU')}</div>
                </div>
            </div>
            <div class="col-6 col-lg-3">
                <div class="stats-card">
                    <div class="stats-icon">
                        <i class="bi bi-currency-dollar"></i>
                    </div>
                    <div class="stats-label">Összes felajánlás</div>
                    <div class="stats-value">${totalO.toLocaleString('hu-HU')}</div>
                </div>
            </div>
            <div class="col-6 col-lg-3">
                <div class="stats-card">
                    <div class="stats-icon">
                        <i class="bi bi-people"></i>
                </div>
                <div class="stats-label">Összes felajánló</div>
                <div class="stats-value">${totalF.toLocaleString('hu-HU')}</div>
            </div>
        </div>
        <div class="col-6 col-lg-3">
            <div class="stats-card">
                <div class="stats-icon">
                    <i class="bi bi-calculator"></i>
                </div>
                <div class="stats-label">Átlag/fő</div>
                <div class="stats-value">${avgPerPerson.toLocaleString('hu-HU')}</div>
            </div>
        </div>
        <div class="col-6 col-lg-3">
            <div class="stats-card">
                <div class="stats-icon">
                    <i class="bi bi-graph-up"></i>
                </div>
                <div class="stats-label">Átlagos éves jövedelem/fő</div>
                <div class="stats-value">${avgYearlyIncome.toLocaleString('hu-HU')}</div>
            </div>
        </div>
        <div class="col-6 col-lg-3">
            <div class="stats-card">
                <div class="stats-icon">
                    <i class="bi bi-trophy"></i>
                </div>
                <div class="stats-label">1M+ összesen</div>
                <div class="stats-value">${companiesAbove1M.toLocaleString('hu-HU')}</div>
            </div>
        </div>
        <div class="col-6 col-lg-3">
            <div class="stats-card">
                <div class="stats-icon">
                    <i class="bi bi-pie-chart"></i>
                </div>
                <div class="stats-label">Átlag/cég</div>
                <div class="stats-value">${avgPerCompany.toLocaleString('hu-HU')}</div>
            </div>
        </div>
        <div class="col-6 col-lg-3">
            <div class="stats-card">
                <div class="stats-icon">
                    <i class="bi bi-trending-up"></i>
                </div>
                <div class="stats-label">Növekvő cégek</div>
                <div class="stats-value">${growthCompanies.toLocaleString('hu-HU')}</div>
            </div>
        </div>
    `;

    $('#combinedStats').html(combinedStatsHtml);

    // Safely destroy existing DataTable
    if ($.fn.DataTable.isDataTable('#combinedTable')) {
        $('#combinedTable').DataTable().destroy();
    }

    // Clear table content
    $('#combinedTable').empty();

    this.dataTables.combined = $('#combinedTable').DataTable({
        ...window.dashboardUtils.getDataTableConfig({
            scrollX: true,
            responsive: false,
            order: [[7, 'desc']]
        }),
        data: rows,
        columns: [
            { title: "Név" },
            { title: "2023 összeg", width: "120px" },
            { title: "2023 létszám", width: "100px" },
            { title: "2024 összeg", width: "120px" },
            { title: "2024 létszám", width: "100px" },
            { title: "2025 összeg", width: "120px" },
            { title: "2025 létszám", width: "100px" },
            { title: "Összes összeg", width: "130px" },
            { title: "Átlag/fő", width: "100px" },
            { title: "Éves jövedelem/fő", width: "150px" },
            { title: "Adószám", width: "130px" },
            { title: "Cím" }
        ]
    });

    console.log('Összesített táblázat frissítve');
}

updateAnalytics() {
    if (this.loadedYears.size === 0) return;
    try {
        window.analyticsManager.updateAnalyticsView(this.datasets);
    } catch (error) {
        console.error('Hiba az analitika frissítésekor:', error);
    }
}

updateUI() {
    const loadedCount = this.loadedYears.size;
    const totalCount = this.years.length;
    
    if (loadedCount === totalCount) {
        $('#loadAll').html('<i class="bi bi-check-circle me-1"></i>Betöltve')
            .removeClass('btn-secondary').addClass('btn-success');
    } else if (loadedCount > 0) {
        $('#loadAll').html(`<i class="bi bi-clock me-1"></i>${loadedCount}/${totalCount}`)
            .removeClass('btn-secondary btn-success').addClass('btn-warning');
    }
}

showAlert(message, type = 'warning') {
    const iconMap = {
        success: 'check-circle',
        warning: 'exclamation-triangle',
        error: 'x-circle',
        info: 'info-circle'
    };

    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show position-fixed" 
             style="top: 20px; right: 20px; z-index: 9999; min-width: 280px;" role="alert">
            <i class="bi bi-${iconMap[type] || 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    $('body').append(alertHtml);
    
    setTimeout(() => {
        $('.alert').fadeOut(300, function() { $(this).remove(); });
    }, 4000);
}

getProcessedData(year) {
    return this.datasets[year];
}

getAllData() {
    return {
        datasets: this.datasets,
        loadedYears: Array.from(this.loadedYears)
    };
}

exportAllData() {
    const exportData = {
        exportDate: new Date().toISOString(),
        loadedYears: Array.from(this.loadedYears),
        data: this.datasets
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], 
        { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `felajanlasok_teljes_export_${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
}

// Initialize dashboard when DOM is ready
$(document).ready(function() {
window.dashboard = new DashboardManager();

// Add keyboard shortcuts for power users
$(document).keydown(function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.which) {
            case 49: // Ctrl+1 - Load 2023
                e.preventDefault();
                $('#load2023').click();
                break;
            case 50: // Ctrl+2 - Load 2024
                e.preventDefault();
                $('#load2024').click();
                break;
            case 51: // Ctrl+3 - Load 2025
                e.preventDefault();
                $('#load2025').click();
                break;
            case 65: // Ctrl+A - Load All
                e.preventDefault();
                $('#loadAll').click();
                break;
            case 69: // Ctrl+E - Export All
                e.preventDefault();
                if (window.dashboard.loadedYears.size > 0) {
                    window.dashboard.exportAllData();
                }
                break;
        }
    }
});

// Removed touch gesture functionality to avoid conflicts with table scrolling
// The swipe functionality was interfering with horizontal table navigation

// Add loading animation to buttons
$('.load-btn').on('click', function() {
    const $btn = $(this);
    const originalHtml = $btn.html();
    $btn.html('<i class="bi bi-hourglass-split me-1"></i>Betöltés...');
    
    setTimeout(() => {
        if (!$btn.prop('disabled')) {
            $btn.html(originalHtml);
        }
    }, 500);
});

// Auto-hide alerts on scroll (mobile UX)
let scrollTimeout;
$(window).on('scroll', function() {
    $('.alert').addClass('opacity-50');
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        $('.alert').removeClass('opacity-50');
    }, 1000);
});

// Performance monitoring
if ('performance' in window && 'measure' in window.performance) {
    window.performance.mark('dashboard-init-start');
    
    $(window).on('load', function() {
        window.performance.mark('dashboard-init-end');
        window.performance.measure('dashboard-init', 'dashboard-init-start', 'dashboard-init-end');
        
        const measure = window.performance.getEntriesByName('dashboard-init')[0];
        console.log(`Dashboard initialization took ${Math.round(measure.duration)}ms`);
    });
}

// Initialize Bootstrap tooltips if needed
const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
});
});

// Add service worker for offline functionality (optional)
if ('serviceWorker' in navigator && 'register' in navigator.serviceWorker) {
window.addEventListener('load', () => {
    console.log('Dashboard ready for offline enhancements');
});
}
