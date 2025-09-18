// Virtual Table implementation for very large datasets
class VirtualTable {
    constructor(containerId, data, columns, options = {}) {
        this.containerId = containerId;
        this.data = data;
        this.columns = columns;
        this.options = {
            rowHeight: 35,
            visibleRows: 20,
            bufferRows: 5,
            searchDelay: 300,
            ...options
        };
        
        this.filteredData = [...data];
        this.scrollTop = 0;
        this.startIndex = 0;
        this.endIndex = 0;
        this.searchTerm = '';
        this.sortColumn = null;
        this.sortDirection = 'asc';
        
        this.init();
    }

    init() {
        this.createStructure();
        this.bindEvents();
        this.render();
    }

    createStructure() {
        const container = document.getElementById(this.containerId);
        container.innerHTML = `
            <div class="virtual-table">
                <div class="virtual-table-controls mb-3">
                    <div class="row">
                        <div class="col-md-6">
                            <input type="text" id="virtualSearch" class="form-control" placeholder="Keresés...">
                        </div>
                        <div class="col-md-6 text-end">
                            <span class="text-muted">Összesen: <strong id="totalRows">${this.data.length}</strong> rekord</span>
                        </div>
                    </div>
                </div>
                <div class="virtual-table-container" style="height: ${(this.options.visibleRows + 1) * this.options.rowHeight}px; overflow: auto; border: 1px solid #dee2e6; border-radius: 8px;">
                    <div class="virtual-table-header" style="position: sticky; top: 0; z-index: 10; background: white; border-bottom: 2px solid #dee2e6;">
                        <div class="row g-0" style="height: ${this.options.rowHeight}px; align-items: center;">
                            ${this.columns.map((col, index) => `
                                <div class="col virtual-header-cell" data-column="${index}" style="padding: 8px; font-weight: 600; cursor: pointer; border-right: 1px solid #dee2e6;">
                                    ${col.title} <i class="bi bi-chevron-expand text-muted"></i>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="virtual-table-body" style="height: ${this.filteredData.length * this.options.rowHeight}px; position: relative;">
                        <div class="virtual-rows-container" style="position: absolute; width: 100%; will-change: transform;"></div>
                    </div>
                </div>
                <div class="virtual-table-info mt-2">
                    <small class="text-muted">
                        Megjelenítve: <span id="visibleRange">1-${Math.min(this.options.visibleRows, this.filteredData.length)}</span> / 
                        <span id="filteredCount">${this.filteredData.length}</span>
                    </small>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Search
        const searchInput = document.getElementById('virtualSearch');
        searchInput.addEventListener('input', window.dashboardUtils.debounce((e) => {
            this.search(e.target.value);
        }, this.options.searchDelay));

        // Scroll
        const container = document.querySelector(`#${this.containerId} .virtual-table-container`);
        container.addEventListener('scroll', window.dashboardUtils.throttle(() => {
            this.handleScroll();
        }, 16)); // ~60fps

        // Sort
        document.querySelectorAll(`#${this.containerId} .virtual-header-cell`).forEach(header => {
            header.addEventListener('click', (e) => {
                const column = parseInt(e.currentTarget.dataset.column);
                this.sort(column);
            });
        });
    }

    search(term) {
        this.searchTerm = term.toLowerCase();
        
        if (!term) {
            this.filteredData = [...this.data];
        } else {
            this.filteredData = this.data.filter(row => {
                return this.columns.some((col, index) => {
                    const value = row[index];
                    return value && value.toString().toLowerCase().includes(this.searchTerm);
                });
            });
        }

        this.updateUI();
        this.render();
    }

    sort(columnIndex) {
        if (this.sortColumn === columnIndex) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnIndex;
            this.sortDirection = 'asc';
        }

        this.filteredData.sort((a, b) => {
            const aVal = a[columnIndex];
            const bVal = b[columnIndex];
            
            let comparison = 0;
            if (aVal > bVal) comparison = 1;
            if (aVal < bVal) comparison = -1;
            
            return this.sortDirection === 'desc' ? -comparison : comparison;
        });

        this.updateSortIcons();
        this.render();
    }

    updateSortIcons() {
        document.querySelectorAll(`#${this.containerId} .virtual-header-cell i`).forEach((icon, index) => {
            if (index === this.sortColumn) {
                icon.className = this.sortDirection === 'asc' ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
            } else {
                icon.className = 'bi bi-chevron-expand text-muted';
            }
        });
    }

    handleScroll() {
        const container = document.querySelector(`#${this.containerId} .virtual-table-container`);
        this.scrollTop = container.scrollTop;
        this.render();
    }

    render() {
        const containerHeight = this.options.visibleRows * this.options.rowHeight;
        const startIndex = Math.floor(this.scrollTop / this.options.rowHeight);
        const endIndex = Math.min(
            startIndex + this.options.visibleRows + this.options.bufferRows * 2,
            this.filteredData.length
        );

        this.startIndex = Math.max(0, startIndex - this.options.bufferRows);
        this.endIndex = endIndex;

        const visibleData = this.filteredData.slice(this.startIndex, this.endIndex);
        const offsetY = this.startIndex * this.options.rowHeight;

        const rowsHtml = visibleData.map((row, index) => {
            const actualIndex = this.startIndex + index;
            const isEven = actualIndex % 2 === 0;
            
            return `
                <div class="virtual-row ${isEven ? 'bg-white' : 'bg-light'}" 
                     style="height: ${this.options.rowHeight}px; display: flex; align-items: center; border-bottom: 1px solid #f0f0f0;"
                     data-index="${actualIndex}">
                    ${row.map((cell, cellIndex) => `
                        <div class="virtual-cell col" style="padding: 8px; border-right: 1px solid #f0f0f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${cell || ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');

        const container = document.querySelector(`#${this.containerId} .virtual-rows-container`);
        container.style.transform = `translateY(${offsetY}px)`;
        container.innerHTML = rowsHtml;

        // Update body height
        const body = document.querySelector(`#${this.containerId} .virtual-table-body`);
        body.style.height = `${this.filteredData.length * this.options.rowHeight}px`;

        this.updateVisibleRange();
    }

    updateUI() {
        document.getElementById('totalRows').textContent = this.data.length;
        document.getElementById('filteredCount').textContent = this.filteredData.length;
    }

    updateVisibleRange() {
        const start = this.startIndex + 1;
        const end = Math.min(this.endIndex, this.filteredData.length);
        document.getElementById('visibleRange').textContent = `${start}-${end}`;
    }

    // Public API methods
    setData(newData) {
        this.data = newData;
        this.filteredData = [...newData];
        this.updateUI();
        this.render();
    }

    refresh() {
        this.render();
    }

    destroy() {
        const container = document.getElementById(this.containerId);
        container.innerHTML = '';
    }

    // Export visible data
    export(format = 'csv') {
        const headers = this.columns.map(col => col.title);
        const rows = [headers, ...this.filteredData];
        
        if (format === 'csv') {
            window.dashboardUtils.generateCSV(rows, 'virtual-table-export.csv');
        }
    }
}

// Helper function to convert regular table data to virtual table
window.createVirtualTable = function(containerId, data, columns, options = {}) {
    return new VirtualTable(containerId, data, columns, options);
};

// Alternative DataTable configuration for extreme cases
window.dashboardUtils.getServerSideDataTableConfig = function(ajaxUrl, additionalConfig = {}) {
    return {
        processing: true,
        serverSide: true,
        ajax: {
            url: ajaxUrl,
            type: 'POST',
            data: function(d) {
                // Custom parameters can be added here
                return d;
            }
        },
        pageLength: 100,
        lengthMenu: [[50, 100, 250, 500], [50, 100, 250, 500]],
        responsive: true,
        deferRender: true,
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
             '<"row"<"col-sm-12"tr>>' +
             '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        language: {
            url: "https://cdn.datatables.net/plug-ins/1.13.7/i18n/hu.json",
            processing: "Adatok betöltése..."
        },
        ...additionalConfig
    };
};
