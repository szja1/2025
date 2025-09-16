// Analytics data processing
window.analyticsManager = {
    topRevenueData: [],
    top100Data: [],
    locationsData: [],
    specialData: [],
    singleDonorData: [],

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
                
                let monthlyIncome2025 = 0;
                if (c[2025].f > 0) {
                    const avgOffer = c[2025].o / c[2025].f;
                    monthlyIncome2025 = (avgOffer / 0.0015) / 12;
                }
                
                const totalSum = c[2023].o + c[2024].o + c[2025].o;
                const totalCnt = c[2023].f + c[2024].f + c[2025].f;
                let avgMonthlyIncome = 0;
                if (totalCnt > 0) {
                    const avgOffer = totalSum / totalCnt;
                    avgMonthlyIncome = (avgOffer / 0.0015) / 12;
                }

                result.push([
                    c.name,
                    c[2023].o,
                    c[2023].f,
                    c[2024].o,
                    c[2024].f,
                    change2324,
                    c[2025].o,
                    c[2025].f,
                    change2425,
                    monthlyIncome2025,
                    avgMonthlyIncome,
                    totalSum
                ]);
            }
        });

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
        const locations = {};
        
        [2023, 2024, 2025].forEach(year => {
            if (datasets[year] && datasets[year].adatok) {
                datasets[year].adatok.forEach(d => {
                    const location = d.c || 'Ismeretlen';
                    if (!locations[location]) {
                        locations[location] = new Set();
                    }
                    locations[location].add(d.n);
                });
            }
        });

        // Filter locations with at least 2 companies
        const result = [];
        Object.entries(locations).forEach(([location, companies]) => {
            if (companies.size >= 2) {
                result.push([location, companies.size, Array.from(companies).join(', ')]);
            }
        });

        // Sort by company count
        result.sort((a, b) => b[1] - a[1]);
        
        this.locationsData = result;
        return result;
    },

    processSpecial: function(datasets) {
        const companies = {};
        
        [2023, 2024, 2025].forEach(year => {
            if (datasets[year] && datasets[year].adatok) {
                datasets[year].adatok.forEach(d => {
                    if (!companies[d.n]) {
                        companies[d.n] = {
                            name: d.n,
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

        // Filter companies with <5 employees and >1M revenue in any year
        const result = [];
        Object.values(companies).forEach(c => {
            let qualifies = false;
            [2023, 2024, 2025].forEach(year => {
                if (c[year].f > 0 && c[year].f < 5 && c[year].o > 1000000) {
                    qualifies = true;
                }
            });

            if (qualifies) {
                const totalSum = c[2023].o + c[2024].o + c[2025].o;
                result.push([
                    c.name,
                    c[2023].o,
                    c[2023].f,
                    c[2024].o,
                    c[2024].f,
                    c[2025].o,
                    c[2025].f,
                    totalSum
                ]);
            }
        });

        // Sort by total sum
        result.sort((a, b) => b[7] - a[7]);
        
        this.specialData = result;
        return result;
    },

    processSingleDonor: function(datasets) {
        if (!datasets[2025]) return [];

        const companies = {};
        
        [2023, 2024, 2025].forEach(year => {
            if (datasets[year] && datasets[year].adatok) {
                datasets[year].adatok.forEach(d => {
                    if (!companies[d.n]) {
                        companies[d.n] = {
                            name: d.n,
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

        // Filter companies with exactly 1 donor in 2025 and amount > 50000
        const result = [];
        Object.values(companies).forEach(c => {
            if (c[2025].f === 1 && c[2025].o > 50000) {
                result.push([
                    c.name,
                    c[2023].o,
                    c[2023].f,
                    c[2024].o,
                    c[2024].f,
                    c[2025].o,
                    c[2025].f
                ]);
            }
        });

        // Sort by 2025 amount
        result.sort((a, b) => b[5] - a[5]);
        
        this.singleDonorData = result;
        return result;
    },

    updateAnalyticsView: function(datasets) {
        this.processTopRevenue(datasets);
        this.processTop100(datasets);
        this.processLocations(datasets);
        this.processSpecial(datasets);
        this.processSingleDonor(datasets);

        this.updateTopRevenueTable();
        this.updateTop100Table();
        this.updateLocationsTable();
        this.updateSpecialTable();
        this.updateSingleDonorTable();
        this.updateCharts();
    },

    updateTopRevenueTable: function() {
        if ($('#topRevenueTable').hasClass('dataTable')) {
            $('#topRevenueTable').DataTable().destroy();
        }

        const tableData = this.topRevenueData.map(row => [
            row[0], // name
            window.dashboardUtils.formatHungarianNumber(row[1]), // 2023 sum
            row[2], // 2023 count
            window.dashboardUtils.formatHungarianNumber(row[3]), // 2024 sum
            row[4], // 2024 count
            this.formatPercentChange(row[5]), // 2024-2023 change
            window.dashboardUtils.formatHungarianNumber(row[6]), // 2025 sum
            row[7], // 2025 count
            this.formatPercentChange(row[8]), // 2025-2024 change
            window.dashboardUtils.formatHungarianNumber(Math.round(row[9])), // 2025 monthly income
            window.dashboardUtils.formatHungarianNumber(Math.round(row[10])), // avg monthly income
            window.dashboardUtils.formatHungarianNumber(row[11]) // 3 year total
        ]);

        $('#topRevenueTable').DataTable({
            ...window.dashboardUtils.getDataTableConfig(),
            data: tableData,
            columns: [
                { title: "Cégnév" },
                { title: "2023 összeg (Ft)" },
                { title: "2023 fő" },
                { title: "2024 összeg (Ft)" },
                { title: "2024 fő" },
                { title: "2024-2023 változás" },
                { title: "2025 összeg (Ft)" },
                { title: "2025 fő" },
                { title: "2025-2024 változás" },
                { title: "2025 havi jöv./fő (Ft)" },
                { title: "Átl. havi jöv./fő (Ft)" },
                { title: "3 év összesen (Ft)" }
            ],
            order: [[11, 'desc']]
        });
    },

    updateTop100Table: function() {
        if ($('#top100Table').hasClass('dataTable')) {
            $('#top100Table').DataTable().destroy();
        }

        const tableData = this.top100Data.map(row => [
            row[0], // name
            window.dashboardUtils.formatHungarianNumber(row[1]), // 2023
            window.dashboardUtils.formatHungarianNumber(row[2]), // 2024
            window.dashboardUtils.formatHungarianNumber(row[3]), // 2025
            this.formatChangeAmount(row[4]), // 2024-2023 change
            this.formatChangeAmount(row[5]), // 2025-2024 change
            window.dashboardUtils.formatHungarianNumber(row[6]) // 3 year total
        ]);

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
            order: [[3, 'desc']]
        });
    },

    updateLocationsTable: function() {
        if ($('#locationsTable').hasClass('dataTable')) {
            $('#locationsTable').DataTable().destroy();
        }

        const tableData = this.locationsData.map(row => [
            row[0], // location
            row[1], // company count
            row[2]  // company list
        ]);

        $('#locationsTable').DataTable({
            ...window.dashboardUtils.getDataTableConfig(),
            data: tableData,
            columns: [
                { title: "Székhely" },
                { title: "Cégek száma (db)" },
                { title: "Cégek listája" }
            ],
            order: [[1, 'desc']]
        });
    },

    updateSpecialTable: function() {
        if ($('#specialTable').hasClass('dataTable')) {
            $('#specialTable').DataTable().destroy();
        }

        const tableData = this.specialData.map(row => [
            row[0], // name
            window.dashboardUtils.formatHungarianNumber(row[1]), // 2023 sum
            row[2], // 2023 count
            window.dashboardUtils.formatHungarianNumber(row[3]), // 2024 sum
            row[4], // 2024 count
            window.dashboardUtils.formatHungarianNumber(row[5]), // 2025 sum
            row[6], // 2025 count
            window.dashboardUtils.formatHungarianNumber(row[7]) // total
        ]);

        $('#specialTable').DataTable({
            ...window.dashboardUtils.getDataTableConfig(),
            data: tableData,
            columns: [
                { title: "Cégnév" },
                { title: "2023 összeg (Ft)" },
                { title: "2023 fő" },
                { title: "2024 összeg (Ft)" },
                { title: "2024 fő" },
                { title: "2025 összeg (Ft)" },
                { title: "2025 fő" },
                { title: "3 év összesen (Ft)" }
            ],
            order: [[7, 'desc']]
        });
    },

    updateSingleDonorTable: function() {
        if ($('#singleDonorTable').hasClass('dataTable')) {
            $('#singleDonorTable').DataTable().destroy();
        }

        const tableData = this.singleDonorData.map(row => [
            row[0], // name
            window.dashboardUtils.formatHungarianNumber(row[1]), // 2023 sum
            row[2], // 2023 count
            window.dashboardUtils.formatHungarianNumber(row[3]), // 2024 sum
            row[4], // 2024 count
            window.dashboardUtils.formatHungarianNumber(row[5]), // 2025 sum
            row[6]  // 2025 count
        ]);

        $('#singleDonorTable').DataTable({
            ...window.dashboardUtils.getDataTableConfig(),
            data: tableData,
            columns: [
                { title: "Cégnév" },
                { title: "2023 összeg (Ft)" },
                { title: "2023 fő" },
                { title: "2024 összeg (Ft)" },
                { title: "2024 fő" },
                { title: "2025 összeg (Ft)" },
                { title: "2025 fő" }
            ],
            order: [[5, 'desc']]
        });
    },

    updateCharts: function() {
        // Revenue change chart
        const revenueCanvas = document.getElementById('revenueChangeChart');
        if (revenueCanvas && this.topRevenueData.length > 0) {
            window.chartUtils.createRevenueChangeChart(revenueCanvas, this.topRevenueData);
        }

        // Top 100 chart
        const top100Canvas = document.getElementById('top100Chart');
        if (top100Canvas && this.top100Data.length > 0) {
            window.chartUtils.createTop100Chart(top100Canvas, this.top100Data);
        }

        // Locations chart
        const locationsCanvas = document.getElementById('locationsChart');
        if (locationsCanvas && this.locationsData.length > 0) {
            window.chartUtils.createLocationsChart(locationsCanvas, this.locationsData);
        }
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
    }
};
