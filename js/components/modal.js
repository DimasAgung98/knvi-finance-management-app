window.app = window.app || {};

window.app.modal = {
    open(title, htmlContent) {
        const overlay = document.getElementById('global-modal');
        const titleEl = document.getElementById('modal-title');
        const bodyEl = document.getElementById('modal-body');

        if (overlay && titleEl && bodyEl) {
            titleEl.textContent = title;
            bodyEl.innerHTML = htmlContent;
            overlay.classList.add('active');
        }
    },

    close() {
        const overlay = document.getElementById('global-modal');
        if (overlay) {
            overlay.classList.remove('active');
            document.getElementById('modal-body').innerHTML = ''; // Clear content
        }
    }
};
