
/* 
  Firebase sudah di-load via CDN di index.php, 
  jadi tidak perlu import module di sini.
  Semua akses menggunakan window.firebase, window.firebase.auth, window.firebase.firestore, dll.
  Pastikan urutan CDN: firebase-app.js, firebase-auth.js, firebase-firestore.js.
*/

/* ===== KONFIGURASI FIREBASE GLOBAL ===== */
if (!window.firebaseConfig) {
  window.firebaseConfig = {
    apiKey: "AIzaSyBrPNgQvncfr_0t4UipNY9ysqXB-R2kL7s",
    authDomain: "firelab-7db2c.firebaseapp.com",
    projectId: "firelab-7db2c",
    storageBucket: "firelab-7db2c.firebasestorage.app",
    messagingSenderId: "1086075670723",
    appId: "1:1086075670723:web:8c80890c2e2d951e52d276"
  };
}

/* ===== VARIABEL GLOBAL ===== */
window.pageCache = window.pageCache || {}; // Cache halaman untuk performa
window.overlayTimerInterval = null;
window.overlayTimerTimeout = null;
window.overlayTimerMax = 30;

/* ===== INISIALISASI FIRESTORE GLOBAL ===== */
window._firestore = null; // Firestore instance global

/* ===== FUNGSI LOG LOGIN/LOGOUT KE FIRESTORE ===== */
/**
 * Fungsi global untuk mencatat event login/logout ke Firestore.
 * Data yang disimpan: userId, action, email, timestamp.
 * @param {string} action - "login" atau "logout"
 * @param {object} user - objek user Firebase Auth (boleh null)
 */
window.logAuthEvent = async function(action, user) {
  // Validasi input action
  if (typeof action !== "string" || (action !== "login" && action !== "logout")) {
    console.warn("[logAuthEvent] Action tidak valid:", action);
    return;
  }
  // Validasi Firestore sudah siap
  if (!window._firestore) {
    console.warn("[logAuthEvent] Firestore belum diinisialisasi.");
    return;
  }
  // Validasi user (userId/email boleh null, tapi log warning jika null)
  let userId = null;
  let email = null;
  if (user && typeof user === "object") {
    userId = user.uid ? String(user.uid) : null;
    email = user.email ? String(user.email) : null;
  }
  if (!userId) {
    console.warn("[logAuthEvent] userId kosong, log tetap disimpan.");
  }
  // Data log yang disimpan ke Firestore
  const logData = {
    userId: userId,
    action: action,
    email: email,
    timestamp: new Date().toISOString() // Simpan dalam format ISO agar konsisten
  };
  try {
    // Gunakan window.firebase.firestore API dari CDN
    await window.firebase.firestore().collection("login_logs").add(logData);
    // Sukses, tidak perlu feedback ke user
    // Bisa tambahkan callback jika ingin
  } catch (e) {
    // Error log ke Firestore, hanya tampilkan di konsol
    console.error("[logAuthEvent] Gagal menulis log ke Firestore:", e);
    // Alternatif fallback: simpan log di localStorage jika Firestore gagal
    try {
      let fallbackLogs = [];
      const existing = localStorage.getItem("login_logs_fallback");
      if (existing) {
        fallbackLogs = JSON.parse(existing);
      }
      fallbackLogs.push(logData);
      localStorage.setItem("login_logs_fallback", JSON.stringify(fallbackLogs));
      console.warn("[logAuthEvent] Log disimpan ke localStorage sebagai fallback.");
    } catch (err) {
      console.error("[logAuthEvent] Gagal menyimpan log fallback di localStorage:", err);
    }
  }
};

/* ===== FUNGSI OVERLAY LOADER GLOBAL ===== */
window.showOverlay = function(timerMax = window.overlayTimerMax) {
  if (window.overlayTimerInterval) clearInterval(window.overlayTimerInterval);
  if (window.overlayTimerTimeout) clearTimeout(window.overlayTimerTimeout);

  let waktuBerjalan = 0;
  let batasWaktu = parseInt(timerMax, 10);
  if (isNaN(batasWaktu) || batasWaktu < 1) batasWaktu = window.overlayTimerMax;

  //$('#overlay-loader').removeClass('d-none').fadeIn();
  $('#overlay-timer').hide().text(waktuBerjalan);

  window.overlayTimerInterval = setInterval(() => {
    waktuBerjalan++;
    $('#overlay-timer').text(waktuBerjalan);

    // Tampilkan timer setelah 1 detik pertama
    if (waktuBerjalan === 1) {
      $('#overlay-timer').fadeIn();
    }

    if (waktuBerjalan >= batasWaktu) {
      window.hideOverlay();
    }
  }, 1000);

  // Timeout backup jika interval gagal
  window.overlayTimerTimeout = setTimeout(() => {
    window.hideOverlay();
  }, batasWaktu * 1000);
};

window.hideOverlay = function() {
  $('#overlay-loader').fadeOut('fast', function() {
    $(this).addClass('d-none');
  });
  if (window.overlayTimerInterval) {
    clearInterval(window.overlayTimerInterval);
    window.overlayTimerInterval = null;
  }
  if (window.overlayTimerTimeout) {
    clearTimeout(window.overlayTimerTimeout);
    window.overlayTimerTimeout = null;
  }
};

/* ===== FUNGSI LOAD PAGE (AJAX SPA) GLOBAL ===== */
window.loadPage = async function(url, containerId, options = {}) {
  if (typeof url !== 'string' || typeof containerId !== 'string') {
    console.error('Parameter url dan containerId harus berupa string.');
    return;
  }

  window.showOverlay(options.overlayTimeout || window.overlayTimerMax);

  let html = null;
  let useCache = options.cache !== false; // default true
  let pushHistory = options.pushHistory !== false; // default true

  try {
    if (useCache && window.pageCache[url]) {
      html = window.pageCache[url];
      $('#' + containerId).html(html);
      if (pushHistory) {
        //window.history.pushState({url, containerId}, '', '#' + url.replace(/[^a-zA-Z0-9]/g,''));
      }
      window.hideOverlay();
    } else {
      $.ajax({
        url: url,
        cache: false,
        success: function(response) {
          if (useCache) window.pageCache[url] = response;
          $('#' + containerId).html(response);
          if (pushHistory) {
           // window.history.pushState({url, containerId}, '', '#' + url.replace(/[^a-zA-Z0-9]/g,''));
          }
        },
        error: function(xhr) {
          $('#' + containerId).html(`
            <div class="alert alert-danger" role="alert">
              <i class="fa-solid fa-triangle-exclamation"></i> Gagal memuat halaman: ${xhr.statusText}
            </div>
          `);
        },
        complete: function() {
          window.hideOverlay();
        }
      });
    }
  } catch (err) {
    $('#' + containerId).html(`
      <div class="alert alert-danger" role="alert">
        <i class="fa-solid fa-triangle-exclamation"></i> ${err && err.message ? err.message : 'Terjadi kesalahan saat memuat halaman.'}
      </div>
    `);
    window.hideOverlay();
  }
};

/* ===== HANDLER HISTORY BROWSER GLOBAL ===== */
$(window).on('popstate', function(e) {
  if (e.originalEvent.state && e.originalEvent.state.url && e.originalEvent.state.containerId) {
    // window.loadPage(e.originalEvent.state.url, e.originalEvent.state.containerId, {cache:true, pushHistory:false});
  }
});

/* ===== FUNGSI GLOBAL INISIALISASI ULANG FIREBASE, FIRESTORE & AUTH STATE ===== */
window.initFirebaseApp = function(config, redirect = true) {
  if (!config || typeof config !== 'object' || !config.apiKey) {
    console.error('Konfigurasi Firebase tidak valid.');
    $('#main-app-container').html(`
      <div class="alert alert-danger" role="alert">
        <i class="fa-solid fa-triangle-exclamation"></i> Konfigurasi Firebase tidak valid.
      </div>
    `);
    return;
  }

  // Hapus instance Firebase lama jika ada (untuk re-init)
  try {
    if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
      window.firebase.apps.forEach(function(app) {
        try {
          if (typeof app.delete === 'function') app.delete();
        } catch (e) {}
      });
    }
  } catch (e) {}

  let app;
  try {
    console.log('[initFirebaseApp] Memulai inisialisasi Firebase...');
    // Inisialisasi Firebase App via CDN
    app = window.firebase.initializeApp(config);

    // Inisialisasi Auth via CDN
    const auth = window.firebase.auth();

    // Inisialisasi Firestore secara global via CDN
    try {
      window._firestore = window.firebase.firestore();
      console.log('[initFirebaseApp] Firestore berhasil diinisialisasi.');
    } catch (e) {
      window._firestore = null;
      console.error('[initFirebaseApp] Gagal inisialisasi Firestore:', e);
    }

    console.log('[initFirebaseApp] Firebase berhasil diinisialisasi:', app);

    setTimeout(function() {
      console.log('[initFirebaseApp] Mengirim event firebaseReady...');
      window.dispatchEvent(new CustomEvent('firebaseReady', {
        detail: {
          auth: auth,
          // signInWithEmailAndPassword pada CDN: window.firebase.auth().signInWithEmailAndPassword
          signInWithEmailAndPassword: (auth && typeof auth.signInWithEmailAndPassword === 'function') 
            ? auth.signInWithEmailAndPassword.bind(auth) 
            : null
        }
      }));
      window._firebaseAuthReady = { 
        auth: auth, 
        signInWithEmailAndPassword: (auth && typeof auth.signInWithEmailAndPassword === 'function') 
          ? auth.signInWithEmailAndPassword.bind(auth) 
          : null
      };
      console.log('[initFirebaseApp] Event firebaseReady terkirim');
    }, 100);

    if (redirect) {
      if (window._firebaseAuthStateUnsub) {
        try { window._firebaseAuthStateUnsub(); } catch (e) {}
      }
      /* 
        Tambahkan flag sederhana agar tidak terjadi double request/redirect 
        saat onAuthStateChanged dipanggil berkali-kali dalam waktu singkat.
      */
      if (typeof window._firebaseAuthRedirecting === 'undefined') {
        window._firebaseAuthRedirecting = false;
      }
      // onAuthStateChanged pada CDN: window.firebase.auth().onAuthStateChanged
      window._firebaseAuthStateUnsub = auth.onAuthStateChanged(function(user) {
        console.log('[initFirebaseApp] Auth state berubah:', user ? 'User terautentikasi' : 'User tidak terautentikasi');
        setTimeout(function() {
          // Cegah double request/redirect dengan flag
          if (window._firebaseAuthRedirecting) {
            console.log('[initFirebaseApp] Redirect sedang berlangsung, abaikan request ganda.');
            return;
          }
          const currentPage = window.location.hash.replace(/^#/, '');
          if (user && currentPage !== 'dashboard.html') {
            window._firebaseAuthRedirecting = true;
            window.loadPage('dashboard.html', 'main-app-container');
            setTimeout(function() { window._firebaseAuthRedirecting = false; }, 1500); // Reset flag setelah 1.5 detik
          } else if (!user && currentPage !== 'login.html') {
            window._firebaseAuthRedirecting = true;
            window.loadPage('login.html', 'main-app-container');
            setTimeout(function() { window._firebaseAuthRedirecting = false; }, 1500); // Reset flag setelah 1.5 detik
          }
        }, 200);
      });
    }

  } catch (e) {
    console.error('[initFirebaseApp] Error saat inisialisasi Firebase:', e);
    $('#main-app-container').html(`
      <div class="alert alert-danger" role="alert">
        <i class="fa-solid fa-triangle-exclamation"></i> Gagal menginisialisasi Firebase: ${e && e.message ? e.message : 'Terjadi kesalahan.'}
      </div>
    `);
  }
};

// Inisialisasi pertama kali saat aplikasi dimuat
window.initFirebaseApp(window.firebaseConfig);

/* Debug: Monitor event firebaseReady */
window.addEventListener('firebaseReady', (e) => {
  console.log('Event firebaseReady diterima di index.php');
});
