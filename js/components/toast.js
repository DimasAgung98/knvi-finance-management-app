window.app = window.app || {};

// Configure default SweetAlert2 toast
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

window.app.toast = {
    // For small non-blocking notifications
    show(message, type = 'success') {
        Toast.fire({
            icon: type,
            title: message
        });
    },

    // For confirmation dialogs (delete, etc)
    async confirm(title, text, confirmButtonText = 'Yes, delete it!') {
        return Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--danger-color)',
            cancelButtonColor: 'var(--secondary-color)',
            confirmButtonText: confirmButtonText,
            customClass: {
                cancelButton: 'text-dark'
            }
        });
    }
};
