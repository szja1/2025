// Analytics data processing - JAVÍTOTT VERZIÓ
window.analyticsManager = {
    topRevenueData: [],
    top100Data: [],
    locationsData: [],
    specialData: [],
    charts: {}, // Chart instances storage
    
    // Kiemelt cégek adószámai
    specialTaxNumbers: ["19347215141", "19286031242", "18219612143"],

    processTopRevenue: function(datasets) {
        if (!datasets[2023] || !datasets[2024] || !datasets[2025]) return [];

        const companies = {};
        
        // Collect data from all years
        [2023, 2024, 2025].forEach(year => {
            if (datasets[year] && datasets[year].adatok) {
                datasets[year].adatok.forEach(d => {
                    if (!companies[d.n]) {
                        companies[d.n] = {
                            name: d.n,
                            adoszam: d.a,
                            cim: d.c,
                            2023: { o: 0, f: 0 },
                            2024: { o: 0, f: 0 },
                            2025: { o: 0, f: 0 }
                        };
                    }
                    companies[d.n][year].o += d.o;
                    companies[d.n][year].f += d.f;
                });
            }
        });

        // Filter companies with high monthly income per person in any year
        const result = [];
        Object.values(companies).forEach(c => {
            let qualifies = false;
            [2023, 2024, 2025].forEach(year => {
                if (c[year].f > 0) {
                    const avgOffer = c[year].o / c[year].f;
                    const estYearPerCapita = avgOffer / 0.0015;
                    const estMonthPerCapita = estYearPerCapita / 12;
                    if (estMonthPerCapita > 3000000) {
                        qualifies = true;
                    }
                }
            });

            if (qualifies) {
                const change2324 = c[2023].o > 0 ? (c[2024].o - c[2023].o) / c[2023].o : (c[2024].o > 0 ? 1 : 0);
                const change2425 = c[2024].o > 0 ? (c[2025].o - c[2024].o) / c[2024].o : (c[2025].o > 0 ? 1 : 0);
                
                // Átlagos éves bevétel számítás minden évre
                const avgYearlyRevenue2023 = c[2023].f > 0 ? (c[2023].o / c[2023].f) / 0.0015 : 0;
                const avgYearlyRevenue2024 = c[2024].f > 0 ? (c[2024].o / c[2024].f) / 0.0015 : 0;
                const avgYearlyRevenue2025 = c[2025].f > 0 ? (c[2025].o / c[2025].f) / 0.0015 : 0;
                
                const totalSum = c[2023].o + c[2024].o + c[2025].o;
                const totalCnt = c[2023].f + c[2024].f + c[2025].f;
                let totalAvgYearlyRevenue = 0;
                if (totalCnt > 0) {
                    totalAvgYearlyRevenue = (totalSum / totalCnt) / 0.0015;
                }

                result.push([
                    c.name,
                    c[2023].o,
                    c[2023].f,
                    avgYearlyRevenue2023,
                    c[2024].o,
                    c[2024].f,
                    change2324,
                    avgYearlyRevenue2024,
                    c[2025].o,
                    c[2025].f,
                    change2425,
                    avgYearlyRevenue2025,
                    totalSum,
                    totalAvgYearlyRevenue
                ]);
            }
        });

        // Sort by total sum
        result.sort((a, b) => b[12] - a[12]);
        
        this.topRevenueData = result;
        return result;
    },

    processTop100: function(datasets) {
        if (!datasets[2025]) return [];

        const companies = {};
        
        [2023, 2024, 2025].forEach(year => {
            if (datasets[year] && datasets[year].adatok) {
                datasets[year].adatok.forEach(d => {
                    if (!companies[d.n]) {
                        companies[d.n] = {
                            name: d.n,
                            2023: 0,
                            2024: 0,
                            2025: 0
                        };
                    }
                    companies[d.n][year] += d.o;
                });
            }
        });

        // Sort by 2025 revenue and take top 100
        const sorted = Object.values(companies)
            .sort((a, b) => b[2025] - a[2025])
            .slice(0, 100);

        const result = sorted.map(c => [
            c.name,
            c[2023],
            c[2024],
            c[2025],
            c[2024] - c[2023], // 2024-2023 change
            c[2025] - c[2024], // 2025-2024 change
            c[2023] + c[2024] + c[2025] // 3 year total
        ]);

        this.top100Data = result;
        return result;
    },

    processLocations: function(datasets) {
        const locationCompanies = {};
        const companyTotals = {};
        
        [2023, 2024, 2025].forEach(year => {
            if (datasets[year] && datasets[year].adatok) {
                datasets[year].adatok.forEach(d => {
                    const location = d.c || 'Ismeretlen';
                    const companyName = d.n;
                    
                    if (!locationCompanies[location]) {
                        locationCompanies[location] = {};
                    }
                    
                    if (!locationCompanies[location][companyName]) {
                        locationCompanies[location][companyName] = {
                            name: companyName,
                            location: location,
                            2023: 0,
                            2024: 0,
                            2025: 0
                        };
                    }
                    
                    locationCompanies[location][companyName][year] += d.o;
                    
                    // Company totals for sorting
                    if (!companyTotals[companyName]) {
                        companyTotals[companyName] = 0;
                    }
                    companyTotals[companyName] += d.o;
                });
            }
        });

        // Filter locations with at least 2 companies and prepare data
        const result = [];
        Object.entries(locationCompanies).forEach(([location, companies]) => {
            const companyList = Object.values(companies);
            if (companyList.length >= 2) {
                const locationTotal = companyList.reduce((sum, company) => 
                    sum + company[2023] + company[2024] + company[2025], 0);
                
                // Sort companies by total amount
                companyList.sort((a, b) => {
                    const totalA = a[2023] + a[2024] + a[2025];
                    const totalB = b[2023] + b[2024] + b[2025];
                    return totalB - totalA;
                });
                
                result.push({
                    location: location,
                    total: locationTotal,
                    companyCount: companyList.length,
                    companies: companyList
                });
            }
        });

        // Sort by total amount
        result.sort((a, b) => b.total - a.total);
        
        this.locationsData = result;
        return result;
    },

    processSpecial: function(datasets) {
        const companies = {};
        
        [2023, 2024, 2025].forEach(year => {
            if (datasets[year] && datasets[year].adatok) {
                datasets[year].adatok.forEach(d => {
                    const cleanTaxNumber = d.a.toString().replace(/\D/g, '');
                    if (this.specialTaxNumbers.includes(cleanTaxNumber)) {
                        if (!companies[d.n]) {
                            companies[d.n] = {
                                name: d.n,
                                taxNumber: d.a,
                                address: d.c,
                                2023: { o: 0, f: 0 },
                                2024: { o: 0, f: 0 },
                                2025: { o: 0, f: 0 }
                            };
                        }
                        companies[d.n][year].o += d.o;
                        companies[d.n][year].f += d.f;
                    }
                });
            }
        });

        const result = Object.values(companies).map(c => [
            c.name,
            c.taxNumber,
            c.address,
            c[2023].o,
            c[2023].f,
            c[2024].o,
            c[2024].f,
            c[2025].o,
            c[2025].f,
            c[2023].o + c[2024].o + c[2025].o // total
        ]);

        // Sort by total sum
        result.sort((a, b) => b[9] - a[9]);
        
        this.specialData = result;
        return result;
    },

    updateAnalyticsView: function(datasets) {
        this.processTopRevenue(datasets);
        this.processTop100(datasets);
        this.processLocations(datasets);
        this.processSpecial(datasets);

        // Delay table updates to ensure DOM is ready
        setTimeout(() => {
            this.updateTopRevenueTable();
            this.updateTop100Table();
            this.updateLocationsView();
            this.updateSpecialTable();
            this.updateCharts();
        }, 200);
    },

    updateTopRevenueTable: function() {
        if ($('#topRevenueTable').hasClass('dataTable')) {
            $('#topRevenueTable').DataTable().destroy();
        }
        $('#topRevenueTable').empty();

        const tableData = this.topRevenueData.map(row => [
            row[0], // name
            window.dashboardUtils.formatHungarianNumber(row[1]), // 2023 sum
            row[2], // 2023 count
            window.dashboardUtils.formatHungarianNumber(Math.round(row[3])), // 2023 avg yearly revenue
            window.dashboardUtils.formatHungarianNumber(row[4]), // 2024 sum
            row[5], // 2024 count
            this.formatPercentChange(row[6]), // 2024-2023 change
            window.dashboardUtils.formatHungarianNumber(Math.round(row[7])), // 2024 avg yearly revenue
            window.dashboardUtils.formatHungarianNumber(row[8]), // 2025 sum
            row[9], // 2025 count
            this.formatPercentChange(row[10]), // 2025-2024 change
            window.dashboardUtils.formatHungarianNumber(Math.round(row[11])), // 2025 avg yearly revenue
            window.dashboardUtils.formatHungarianNumber(row[12]), // 3 year total
            window.dashboardUtils.formatHungarianNumber(Math.round(row[13])) // total avg yearly revenue
        ]);

        setTimeout(() => {
            try {
                $('#topRevenueTable').DataTable({
                    ...window.dashboardUtils.getDataTableConfig(),
                    data: tableData,
                    columns: [
                        { title: "Cégnév" },
                        { title: "2023 összeg (Ft)" },
                        { title: "2023 fő" },
                        { title: "2023 átl. éves bevétel/fő" },
                        { title: "2024 összeg (Ft)" },
                        { title: "2024 fő" },
                        { title: "2024-2023 változás" },
                        { title: "2024 átl. éves bevétel/fő" },
                        { title: "2025 összeg (Ft)" },
                        { title: "2025 fő" },
                        { title: "2025-2024 változás" },
                        { title: "2025 átl. éves bevétel/fő" },
                        { title: "3 év összesen (Ft)" },
                        { title: "Össz. átl. éves bevétel/fő" }
                    ],
                    order: [[12, 'desc']],
                    scrollX: true,
                    deferRender: true
                });
            } catch (error) {
                console.error('Error creating top revenue table:', error);
            }
        }, 100);
    },

    updateTop100Table: function() {
        if ($('#top100Table').hasClass('dataTable')) {
            $('#top100Table').DataTable().destroy();
        }
        $('#top100Table').empty();

        const tableData = this.top100Data.map(row => [
            row[0], // name
            window.dashboardUtils.formatHungarianNumber(row[1]), // 2023
            window.dashboardUtils.formatHungarianNumber(row[2]), // 2024
            window.dashboardUtils.formatHungarianNumber(row[3]), // 2025
            this.formatChangeAmount(row[4]), // 2024-2023 change
            this.formatChangeAmount(row[5]), // 2025-2024 change
            window.dashboardUtils.formatHungarianNumber(row[6]) // 3 year total
        ]);

        setTimeout(() => {
            try {
                $('#top100Table').DataTable({
                    ...window.dashboardUtils.getDataTableConfig(),
                    data: tableData,
                    columns: [
                        { title: "Cégnév" },
                        { title: "2023 összeg (Ft)" },
                        { title: "2024 összeg (Ft)" },
                        { title: "2025 összeg (Ft)" },
                        { title: "2024-2023 változás (Ft)" },
                        { title: "2025-2024 változás (Ft)" },
                        { title: "3 év összesen (Ft)" }
                    ],
                    order: [[3, 'desc']],
                    deferRender: true
                });
            } catch (error) {
                console.error('Error creating top100 table:', error);
            }
        }, 150);
    },

    updateLocationsView: function() {
        let html = '';
        
        this.locationsData.forEach(locationData => {
            html += `
                <div class="location-group">
                    <div class="location-header">
                        ${locationData.location}
                        <span class="location-total">
                            ${locationData.companyCount} cég • 
                            ${window.dashboardUtils.formatHungarianNumber(locationData.total)} Ft
                        </span>
                    </div>
            `;
            
            locationData.companies.forEach(company => {
                const total = company[2023] + company[2024] + company[2025];
                html += `
                    <div class="company-item">
                        <div class="company-name">${company.name}</div>
                        <div class="company-amounts">
                            <div class="amount-year">
                                <div class="amount-label">2023</div>
                                <div class="amount-value">${window.dashboardUtils.formatHungarianNumber(company[2023])}</div>
                            </div>
                            <div class="amount-year">
                                <div class="amount-label">2024</div>
                                <div class="amount-value">${window.dashboardUtils.formatHungarianNumber(company[2024])}</div>
                            </div>
                            <div class="amount-year">
                                <div class="amount-label">2025</div>
                                <div class="amount-value">${window.dashboardUtils.formatHungarianNumber(company[2025])}</div>
                            </div>
                            <div class="amount-year">
                                <div class="amount-label">Összesen</div>
                                <div class="amount-value"><strong>${window.dashboardUtils.formatHungarianNumber(total)}</strong></div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        });
        
        $('#locationsContent').html(html);
    },

    updateSpecialTable: function() {
        if ($('#specialTable').hasClass('dataTable')) {
            $('#specialTable').DataTable().destroy();
        }
        $('#specialTable').empty();

        const tableData = this.specialData.map(row => [
            row[0], // name
            window.dashboardUtils.formatTaxNumber(row[1]), // tax number
            row[2], // address
            window.dashboardUtils.formatHungarianNumber(row[3]), // 2023 sum
            row[4], // 2023 count
            window.dashboardUtils.formatHungarianNumber(row[5]), // 2024 sum
            row[6], // 2024 count
            window.dashboardUtils.formatHungarianNumber(row[7]), // 2025 sum
            row[8], // 2025 count
            window.dashboardUtils.formatHungarianNumber(row[9]) // total
        ]);

        setTimeout(() => {
            try {
                $('#specialTable').DataTable({
                    ...window.dashboardUtils.getDataTableConfig(),
                    data: tableData,
                    columns: [
                        { title: "Cégnév" },
                        { title: "Adószám" },
                        { title: "Cím" },
                        { title: "2023 összeg (Ft)" },
                        { title: "2023 fő" },
                        { title: "2024 összeg (Ft)" },
                        { title: "2024 fő" },
                        { title: "2025 összeg (Ft)" },
                        { title: "2025 fő" },
                        { title: "3 év összesen (Ft)" }
                    ],
                    order: [[9, 'desc']],
                    deferRender: true
                });
            } catch (error) {
                console.error('Error creating special table:', error);
            }
        }, 200);
    },

    updateCharts: function() {
        // Destroy existing chart if it exists
        if (this.charts.top25Trend) {
            this.charts.top25Trend.destroy();
            delete this.charts.top25Trend;
        }

        // TOP 25 trend chart
        const top25Canvas = document.getElementById('top25TrendChart');
        if (top25Canvas && this.top100Data.length > 0) {
            // Wait a moment to ensure canvas is ready
            setTimeout(() => {
                this.createTop25TrendChart(top25Canvas);
            }, 300);
        }
    },

    createTop25TrendChart: function(canvas) {
        try {
            const ctx = canvas.getContext('2d');
            
            // Clear any existing chart
            if (this.charts.top25Trend) {
                this.charts.top25Trend.destroy();
                delete this.charts.top25Trend;
            }
            
            // Get top 25 companies
            const top25 = this.top100Data.slice(0, 25);
            
            const datasets = top25.map((company, index) => {
                const color = this.getChartColor(index);
                return {
                    label: company[0].length > 15 ? company[0].substr(0, 15) + '...' : company[0],
                    data: [company[1], company[2], company[3]], // 2023, 2024, 2025
                    borderColor: color,
                    backgroundColor: color + '20',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                };
            });

            this.charts.top25Trend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['2023', '2024', '2025'],
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false // Too many companies for legend
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${window.dashboardUtils.formatHungarianNumber(context.parsed.y)} Ft`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Összeg (Ft)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return window.dashboardUtils.formatHungarianNumber(value);
                                }
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Év'
                            }
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    }
                }
            });

            console.log('TOP 25 trend chart created successfully');
        } catch (error) {
            console.error('Error creating TOP 25 trend chart:', error);
        }
    },

    getChartColor: function(index) {
        const colors = [
            '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
            '#ef4444', '#8b5a2b', '#6b7280', '#ec4899', '#14b8a6',
            '#f97316', '#84cc16', '#a855f7', '#3b82f6', '#22c55e',
            '#eab308', '#dc2626', '#9333ea', '#0ea5e9', '#059669',
            '#d97706', '#65a30d', '#7c3aed', '#2563eb', '#16a34a'
        ];
        return colors[index % colors.length];
    },

    formatPercentChange: function(value) {
        const percent = (value * 100).toFixed(1);
        const className = value > 0 ? 'change-positive' : value < 0 ? 'change-negative' : 'change-neutral';
        const sign = value > 0 ? '+' : '';
        return `<span class="${className}">${sign}${percent}%</span>`;
    },

    formatChangeAmount: function(value) {
        const className = value > 0 ? 'change-positive' : value < 0 ? 'change-negative' : 'change-neutral';
        const sign = value > 0 ? '+' : '';
        return `<span class="${className}">${sign}${window.dashboardUtils.formatHungarianNumber(value)}</span>`;
    },

    // Destroy all charts when needed
    destroyAllCharts: function() {
        Object.keys(this.charts).forEach(chartKey => {
            try {
                if (this.charts[chartKey]) {
                    this.charts[chartKey].destroy();
                    delete this.charts[chartKey];
                }
            } catch (error) {
                console.warn(`Error destroying chart ${chartKey}:`, error);
            }
        });
        this.charts = {};
    },

    // Reset all data
    resetAllData: function() {
        this.topRevenueData = [];
        this.top100Data = [];
        this.locationsData = [];
        this.specialData = [];
        this.destroyAllCharts();
    }
};
