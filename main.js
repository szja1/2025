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

        if (showPreloader) {
            this.showPreloader(`${year} adatok betöltése...`);
        }

        this.updateStatus(year, 'loading');
        $(`#load${year}`).prop('disabled', true);

        try {
            const response = await fetch(`${year}.json`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            this.updateProgress(30);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const data = await response.json();
            
            this.updateProgress(100);
            
            this.datasets[year] = data;
            this.loadedYears.add(year);
            
            this.updateStatus(year, 'loaded');
            this.processYearData(year);
            this.updateCombinedData();
            this.updateAnalytics();
            this.updateUI();
            
            if (showPreloader) {
                setTimeout(() => this.hidePreloader(), 300);
            }
            
        } catch (error) {
            console.error(`Hiba ${year} betöltésekor:`, error);
            this.updateStatus(year, 'error');
            if (showPreloader) {
                this.hidePreloader();
            }
            this.showAlert(`Hiba: ${year} adatok betöltése sikertelen!`);
        } finally {
            $(`#load${year}`).prop('disabled', false);
            delete this.loadPromises[year];
        }
    }

    async loadAllYears() {
        this.showPreloader('Összes adat betöltése...');
        
        const promises = this.years.map(year => this.loadYear(year, false));
        
        try {
            await Promise.all(promises);
            setTimeout(() => this.hidePreloader(), 200);
        } catch (error) {
            this.hidePreloader();
        }
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
        $('#preloaderPercent').text(`${percent}%`);
        $('#progressFill').css('width', `${percent}%`);
    }

    hidePreloader() {
        $('#preloader').hide();
    }

    processYearData(year) {
    const data = this.datasets[year];
    if (!data || !data.adatok) return;

    const adatok = data.adatok;
    const totalO = _.sumBy(adatok, 'o');
    const totalF = _.sumBy(adatok, 'f');
    const avgPerPerson = totalF > 0 ? Math.round(totalO / totalF) : 0;
    const avgYearlyIncome = totalF > 0 ? Math.round((totalO / totalF) / 0.0015) : 0;
    
    // Új dashboard kártyák kiszámítása
    const companiesAbove1M = adatok.filter(d => d.o > 1000000).length;
    const avgCompaniesPerEmployee = adatok.filter(d => d.f > 0).length > 0 ? 
        Math.round(totalO / adatok.filter(d => d.f > 0).length) : 0;
    const topCompaniesRevenue = adatok
        .sort((a, b) => b.o - a.o)
        .slice(0, 10)
        .reduce((sum, d) => sum + d.o, 0);

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
            const avgPerPerson = d.f > 0 ? Math.round(d.o / d.f) : 0;
            const yearlyIncome = d.f > 0 ? Math.round((d.o / d.f) * 100 / 0.15) : 0;
            
            return [
                d.i || '',
                d.n || '',
                d.o.toLocaleString('hu-HU'),
                d.f.toLocaleString('hu-HU'),
                avgPerPerson.toLocaleString('hu-HU'),
                yearlyIncome.toLocaleString('hu-HU'),
                window.dashboardUtils.formatTaxNumber(d.a),
                d.c || ''
            ];
        });

        if (this.dataTables[year]) {
            this.dataTables[year].destroy();
        }

        this.dataTables[year] = $(`#table${year}`).DataTable({
            ...window.dashboardUtils.getDataTableConfig(),
            data: tableData,
            columns: [
                { title: "Sorszám" },
                { title: "Név" },
                { title: "Összeg" },
                { title: "Létszám" },
                { title: "Átlag/fő" },
                { title: "Éves jövedelem/fő" },
                { title: "Adószám" },
                { title: "Cím" }
            ],
            order: [[2, 'desc']]
        });
    }

    updateCombinedData() {
    if (this.loadedYears.size === 0) return;

    const companies = {};
    
    this.years.forEach(year => {
        if (!this.datasets[year] || !this.datasets[year].adatok) return;
        
        this.datasets[year].adatok.forEach(d => {
            if (!companies[d.a]) {
                companies[d.a] = {
                    nev: d.n,
                    adoszam: d.a,
                    cim: d.c,
                    2023: { o: 0, f: 0 },
                    2024: { o: 0, f: 0 },
                    2025: { o: 0, f: 0 }
                };
            }
            companies[d.a][year].o += d.o;
            companies[d.a][year].f += d.f;
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

    if (this.dataTables.combined) {
        this.dataTables.combined.destroy();
    }
        this.dataTables.combined = $('#combinedTable').DataTable({
        ...window.dashboardUtils.getDataTableConfig(),
        data: rows,
        scrollX: true,
        columnDefs: [
            { responsivePriority: 1, targets: [0, 7] },
            { responsivePriority: 2, targets: [8, 9] },
            { className: 'none', targets: [10, 11] }
        ],
        order: [[7, 'desc']]
    });
}
    updateAnalytics() {
        if (this.loadedYears.size === 0) return;
        window.analyticsManager.updateAnalyticsView(this.datasets);
    }

    updateUI() {
        if (this.loadedYears.size === this.years.length) {
            $('#loadAll').html('<i class="bi bi-check-circle me-1"></i>Betöltve')
                .removeClass('btn-secondary').addClass('btn-success');
        }
    }

    showAlert(message) {
        const alertHtml = `
            <div class="alert alert-warning alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 280px;" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
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

    // Add touch gestures for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, {passive: true});
    
    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, {passive: true});
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            const tabs = ['combined', 'analytics', 'year2025', 'year2024', 'year2023'];
            const activeTab = $('.nav-link.active').attr('data-bs-target');
            if (!activeTab) return;
            
            const currentIndex = tabs.indexOf(activeTab.replace('#', ''));
            if (currentIndex === -1) return;
            
            let newIndex;
            if (diff > 0) { // Swipe left - next tab
                newIndex = (currentIndex + 1) % tabs.length;
            } else { // Swipe right - previous tab
                newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            }
            
            $(`button[data-bs-target="#${tabs[newIndex]}"]`).tab('show');
        }
    }

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
