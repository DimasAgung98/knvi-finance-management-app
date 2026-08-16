window.app = window.app || {};

window.app.modal = {
    open(title, htmlContent, customMaxWidth) {
        const overlay = document.getElementById('global-modal');
        const titleEl = document.getElementById('modal-title');
        const bodyEl = document.getElementById('modal-body');
        const contentEl = document.querySelector('.modal-content');

        if (overlay && titleEl && bodyEl) {
            titleEl.textContent = title;
            bodyEl.innerHTML = htmlContent;
            
            if (contentEl) {
                contentEl.style.maxWidth = customMaxWidth || '500px';
            }

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
