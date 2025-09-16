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
            dom: 'Blfrtip',
            buttons: [
                {
                    extend: 'csv',
                    text: 'CSV'
                },
                {
                    extend: 'excel',
                    text: 'Excel'
                },
                {
                    extend: 'copy',
                    text: 'JSON',
                    action: function(e, dt, button, config) {
                        const data = dt.data().toArray();
                        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                        alert('JSON adatok vágólapra másolva!');
                    }
                }
            ],
            language: {
                url: "https://cdn.datatables.net/plug-ins/1.13.7/i18n/hu.json"
            }
        };
        
        return { ...defaultConfig, ...additionalConfig };
    }
};
