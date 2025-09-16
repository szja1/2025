// Chart utilities and configurations
window.chartUtils = {
    defaultColors: [
        '#a8dadc', '#457b9d', '#1d3557', '#f1faee', '#264653',
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
        '#dda0dd', '#98d8c8', '#ffd93d', '#6c5ce7', '#fd79a8'
    ],

    createRevenueChangeChart: (canvas, data) => {
        const ctx = canvas.getContext('2d');
        
        // TOP 10 cég változása
        const top10 = data.slice(0, 10);
        const labels = top10.map(item => item[0].length > 20 ? item[0].substr(0, 20) + '...' : item[0]);
        const change2324 = top10.map(item => (item[5] * 100).toFixed(1));
        const change2425 = top10.map(item => (item[8] * 100).toFixed(1));

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '2024-2023 változás (%)',
                    data: change2324,
                    backgroundColor: 'rgba(168, 218, 220, 0.8)',
                    borderColor: 'rgba(168, 218, 220, 1)',
                    borderWidth: 1
                }, {
                    label: '2025-2024 változás (%)',
                    data: change2425,
                    backgroundColor: 'rgba(69, 123, 157, 0.8)',
                    borderColor: 'rgba(69, 123, 157, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Változás (%)'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45
                        }
                    }
                }
            }
        });
    },

    createTop100Chart: (canvas, data) => {
        const ctx = canvas.getContext('2d');
        
        // TOP 10 cég bevétel megoszlása
        const top10 = data.slice(0, 10);
        const labels = top10.map(item => item[0].length > 15 ? item[0].substr(0, 15) + '...' : item[0]);
        const values = top10.map(item => item[6]); // 3 év összesen

        return new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: window.chartUtils.defaultColors,
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 8
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${window.dashboardUtils.formatHungarianNumber(value)} Ft (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    createLocationsChart: (canvas, data) => {
        const ctx = canvas.getContext('2d');
        
        // Városok szerint cégek száma
        const locations = {};
        data.forEach(item => {
            const location = item[0];
            const companyCount = item[1];
            locations[location] = companyCount;
        });

        const sortedLocations = Object.entries(locations)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15); // TOP 15 város

        const labels = sortedLocations.map(item => item[0]);
        const values = sortedLocations.map(item => item[1]);

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: window.chartUtils.defaultColors,
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            padding: 6
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${value} cég (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    createYearlyTrendChart: (canvas, data) => {
        const ctx = canvas.getContext('2d');
        
        // Évenkénti trend minden cégre
        const yearlyData = {
            2023: data.reduce((sum, item) => sum + (item[1] || 0), 0),
            2024: data.reduce((sum, item) => sum + (item[3] || 0), 0),
            2025: data.reduce((sum, item) => sum + (item[5] || 0), 0)
        };

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['2023', '2024', '2025'],
                datasets: [{
                    label: 'Összes felajánlás (Ft)',
                    data: Object.values(yearlyData),
                    borderColor: 'rgba(69, 123, 157, 1)',
                    backgroundColor: 'rgba(69, 123, 157, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
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
                    }
                }
            }
        });
    }
};
