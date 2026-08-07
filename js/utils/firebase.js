import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Ensure config exists
if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.apiKey) {
    console.error("Firebase config is missing or invalid. Please check config.js");
} else {
    // Initialize Firebase
    const app = initializeApp(window.FIREBASE_CONFIG);
    const db = getFirestore(app);

    // Export to global scope for storage.js to use
    window.app = window.app || {};
    window.app.firebase = {
        app,
        db,
        doc,
        setDoc,
        getDoc,
        onSnapshot
    };

    console.log("Firebase initialized successfully.");

    // Trigger storage sync
    if (window.app.storage && window.app.storage.initFirebaseSync) {
        window.app.storage.initFirebaseSync();
    }
}
