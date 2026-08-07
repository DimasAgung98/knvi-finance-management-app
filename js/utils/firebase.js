import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Ensure config exists
if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.apiKey) {
    console.error("Firebase config is missing or invalid. Please check config.js");
} else {
    // Initialize Firebase
    const app = initializeApp(window.FIREBASE_CONFIG);
    const db = getFirestore(app);
    const auth = getAuth(app);

    // Export to global scope for storage.js to use
    window.app = window.app || {};
    window.app.firebase = {
        app,
        db,
        auth,
        doc,
        setDoc,
        getDoc,
        onSnapshot
    };

    console.log("Firebase initialized successfully.");

    // Handle Auth State
    onAuthStateChanged(auth, (user) => {
        const loginContainer = document.getElementById('login-container');
        const appContainer = document.querySelector('.app-container');
        
        if (user) {
            // Logged in
            if(loginContainer) loginContainer.style.display = 'none';
            if(appContainer) appContainer.style.display = ''; // revert to CSS defined display (flex)
            
            // Trigger storage sync NOW
            if (window.app.storage && window.app.storage.initFirebaseSync) {
                window.app.storage.initFirebaseSync();
            }
        } else {
            // Logged out
            if(loginContainer) loginContainer.style.display = 'flex';
            if(appContainer) appContainer.style.display = 'none';
        }
    });

    window.app.login = async () => {
        const pin = document.getElementById('pin-input').value;
        if (pin.length < 4) {
            Swal.fire('Error', 'PIN terlalu pendek', 'error');
            return;
        }

        const btn = document.getElementById('btn-login');
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Verifying...';
        btn.disabled = true;

        try {
            await signInWithEmailAndPassword(auth, 'admin@kanovi.com', pin);
            Swal.fire({
                icon: 'success',
                title: 'Access Granted',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
            document.getElementById('pin-input').value = ''; // clear for next time
        } catch (err) {
            Swal.fire('Access Denied', 'PIN Salah!', 'error');
            document.getElementById('pin-input').value = '';
        } finally {
            btn.innerHTML = '<i class="ph ph-lock-key"></i> Unlock Dashboard';
            btn.disabled = false;
        }
    };
    
    window.app.logout = async () => {
        await signOut(auth);
    };
}
