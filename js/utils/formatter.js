window.app = window.app || {};

window.app.formatter = {
    currency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    },

    percent(value) {
        return (value || 0).toFixed(2) + '%';
    },

    number(value) {
        return new Intl.NumberFormat('id-ID').format(value || 0);
    },

    // Handles real-time formatting in input fields (adds dots)
    formatInput(inputElement) {
        // Remove non-digit characters
        let value = inputElement.value.replace(/\D/g, '');
        if (!value) {
            inputElement.value = '';
            return;
        }
        // Format with dots
        inputElement.value = new Intl.NumberFormat('id-ID').format(parseInt(value, 10));
    },

    // Extracts raw integer value from a formatted string
    unformatInput(valueStr) {
        if (!valueStr) return 0;
        return parseInt(valueStr.toString().replace(/\D/g, ''), 10) || 0;
    }
};
