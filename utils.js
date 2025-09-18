// Optimalized Utility functions - GYORSÍTOTT VERZIÓ
window.dashboardUtils = {
    // Cache formatters for better performance
    _hungarianFormatter: new Intl.NumberFormat('hu-HU'),
    _currencyFormatter: new Intl.NumberFormat('hu-HU', {
        style: 'currency',
        currency: 'HUF',
        minimumFractionDigits: 0
    }),

    // Cache for formatted numbers to avoid re-computation
    _formatCache: new Map(),
    _maxCacheSize: 10000,

    formatHungarianNumber: function(number) {
        // Use cached result if available
        if (this._formatCache.has(number)) {
            return this._formatCache.get(number);
        }

        const formatted = this._hungarianFormatter.format(number);
        
        // Cache result if cache not too large
        if (this._formatCache.size < this._maxCacheSize) {
            this._formatCache.set(number, formatted);
        }

        return formatted;
    },
    
    formatHungarianCurrency: function(amount) {
        return this._currencyFormatter.format(amount);
    },
    
    calculateYearlyIncome: function(amount, people) {
        if (people === 0) return 0;
        return Math.round((amount / people) * 100 / 0.15);
    },
    
    calculatePercentageChange: function(oldValue, newValue) {
        if (oldValue === 0) return newValue > 0 ? 100 : 0;
        return Math.round(((newValue - oldValue) / oldValue) * 100);
    },
    
    // Optimized tax number formatting with cache
    _taxNumberCache: new Map(),
    
    formatTaxNumber: function(taxNumber) {
        if (!taxNumber) return '';
        
        // Check cache first
        if (this._taxNumberCache.has(taxNumber)) {
            return this._taxNumberCache.get(taxNumber);
        }

        const cleaned = taxNumber.toString().replace(/\D/g, '');
        let formatted;
        
        if (cleaned.length === 11) {
            formatted = `${cleaned.substr(0, 8)}-${cleaned.substr(8, 1)}-${cleaned.substr(9, 2)}`;
        } else {
            formatted = taxNumber.toString();
        }

        // Cache result
        if (this._taxNumberCache.size < this._maxCacheSize) {
            this._taxNumberCache.set(taxNumber, formatted);
        }

        return formatted;
    },
    
    generateCSV: function(data, filename = 'export.csv') {
        const csvContent = data.map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Cleanup
    },

    // Optimized DataTable config for large datasets
    getOptimizedDataTableConfig: function(additionalConfig = {}) {
        const defaultConfig = {
            pageLength: 50, // Show more rows per page for better performance
            lengthMenu: [[25, 50, 100, 500, 1000], [25, 50, 100, 500, 1000]],
            processing: true, // Show processing indicator
            deferRender: true, // Only render visible rows
            responsive: {
                details: {
                    type: 'column',
                    target: 0
                }
            },
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"B>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            buttons: [
                {
                    extend: 'csv',
                    text: '<i class="bi bi-filetype-csv me-1"></i>CSV',
                    className: 'btn btn-outline-primary btn-sm',
                    exportOptions: {
                        columns: ':visible'
                    }
                },
                {
                    extend: 'excel',
                    text: '<i class="bi bi-file-earmark-excel me-1"></i>Excel',
                    className: 'btn btn-outline-success btn-sm',
                    exportOptions: {
                        columns: ':visible'
                    }
                },
                {
                    extend: 'copy',
                    text: '<i class="bi bi-clipboard me-1"></i>Másolás',
                    className: 'btn btn-outline-info btn-sm',
                    exportOptions: {
                        columns: ':visible'
                    }
                }
            ],
            language: {
                url: "https://cdn.datatables.net/plug-ins/1.13.7/i18n/hu.json",
                processing: "Adatok feldolgozása...",
                lengthMenu: "_MENU_ sor megjelenítése",
                info: "_START_ - _END_ / _TOTAL_ rekord",
                infoEmpty: "Nincs megjeleníthető rekord",
                infoFiltered: "(_MAX_ rekordból szűrve)",
                search: "Keresés:",
                paginate: {
                    first: "Első",
                    last: "Utolsó",
                    next: "Következő",
                    previous: "Előző"
                }
            },
            // Performance optimizations
            searchDelay: 400, // Debounce search for better performance
            search: {
                smart: true,
                regex: false,
                caseInsensitive: true
            },
            // Callback to clear caches periodically
            drawCallback: function(settings) {
                // Clear format caches if they get too large
                if (window.dashboardUtils._formatCache.size > 15000) {
                    window.dashboardUtils._formatCache.clear();
                }
                if (window.dashboardUtils._taxNumberCache.size > 5000) {
                    window.dashboardUtils._taxNumberCache.clear();
                }
            }
        };
        
        return { ...defaultConfig, ...additionalConfig };
    },

    // Performance monitoring utilities
    performanceMonitor: {
        timers: new Map(),
        
        start: function(label) {
            this.timers.set(label, performance.now());
        },
        
        end: function(label) {
            const start = this.timers.get(label);
            if (start) {
                const duration = performance.now() - start;
                console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
                this.timers.delete(label);
                return duration;
            }
            return 0;
        }
    },

    // Batch processing for large datasets
    batchProcess: function(data, processor, batchSize = 1000, callback = null) {
        return new Promise((resolve) => {
            const results = [];
            let index = 0;
            
            const processBatch = () => {
                const batch = data.slice(index, index + batchSize);
                const batchResults = batch.map(processor);
                results.push(...batchResults);
                
                index += batchSize;
                
                if (callback) {
                    callback(Math.min(index / data.length, 1) * 100); // Progress percentage
                }
                
                if (index < data.length) {
                    // Process next batch asynchronously
                    setTimeout(processBatch, 0);
                } else {
                    resolve(results);
                }
            };
            
            processBatch();
        });
    },

    // Memory cleanup utilities
    cleanup: function() {
        this._formatCache.clear();
        this._taxNumberCache.clear();
        console.log('🧹 Cache cleared for memory optimization');
    },

    // Debounce function for search and other operations
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function for scroll events
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },

    // Get memory usage info (if available)
    getMemoryUsage: function() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100
            };
        }
        return null;
    }
};
