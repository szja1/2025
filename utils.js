// Utility functions
window.dashboardUtils = {
    formatHungarianNumber: (number) => {
        return new Intl.NumberFormat('hu-HU').format(number);
    },
    
    formatHungarianCurrency: (amount) => {
        return new Intl.NumberFormat('hu-HU', {
            style: 'currency',
            currency: 'HUF',
            minimumFractionDigits: 0
        }).format(amount);
    },
    
    calculateYearlyIncome: (amount, people) => {
        if (people === 0) return 0;
        return Math.round((amount / people) * 100 / 0.15);
    },
    
    calculatePercentageChange: (oldValue, newValue) => {
        if (oldValue === 0) return newValue > 0 ? 100 : 0;
        return Math.round(((newValue - oldValue) / oldValue) * 100);
    },
    
    formatTaxNumber: (taxNumber) => {
        if (!taxNumber) return '';
        const cleaned = taxNumber.toString().replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `${cleaned.substr(0, 8)}-${cleaned.substr(8, 1)}-${cleaned.substr(9, 2)}`;
        }
        return taxNumber;
    },
    
    generateCSV: (data, filename = 'export.csv') => {
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
    },

    getDataTableConfig: (additionalConfig = {}) => {
        const defaultConfig = {
            pageLength: 25,
            lengthMenu: [[25, 50, 100, 500, -1], [25, 50, 100, 500, "Összes"]],
            responsive: true,
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"B>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            buttons: [
                {
                    extend: 'csv',
                    text: '<i class="bi bi-filetype-csv me-1"></i>CSV',
                    className: 'btn btn-outline-primary btn-sm'
                },
                {
                    extend: 'excel',
                    text: '<i class="bi bi-file-earmark-excel me-1"></i>Excel',
                    className: 'btn btn-outline-success btn-sm'
                },
                {
                    extend: 'copy',
                    text: '<i class="bi bi-clipboard me-1"></i>Másolás',
                    className: 'btn btn-outline-info btn-sm'
                }
            ],
            language: {
                url: "https://cdn.datatables.net/plug-ins/1.13.7/i18n/hu.json"
            }
        };
        
        return { ...defaultConfig, ...additionalConfig };
    }
};
