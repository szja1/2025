// Chart utilities - csak a TOP 25 trend chart
window.chartUtils = {
    defaultColors: [
        '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
        '#ef4444', '#8b5a2b', '#6b7280', '#ec4899', '#14b8a6',
        '#f97316', '#84cc16', '#a855f7', '#3b82f6', '#22c55e',
        '#eab308', '#dc2626', '#9333ea', '#0ea5e9', '#059669',
        '#d97706', '#65a30d', '#7c3aed', '#2563eb', '#16a34a'
    ],

    getColor: function(index) {
        return this.defaultColors[index % this.defaultColors.length];
    }
};
