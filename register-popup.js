// ============= DSSPL Registration Popup Component =============
// This file creates and manages the registration popup modal across all pages.

(function() {
    // Create popup HTML
    const popupHTML = `
    <div class="register-popup-overlay" id="registerPopup">
        <div class="register-popup-card">
            <button class="popup-close-btn" onclick="closeRegisterPopup()">&times;</button>
            <div class="popup-icon-circle">
                <i class="ri-trophy-fill"></i>
            </div>
            <h2>DSSPL 2026</h2>
            <p class="popup-subtitle">Dev Sanskriti Sports Premier League</p>
            <div class="popup-divider"></div>
            <div class="popup-info-grid">
                <div class="popup-info-item">
                    <i class="ri-calendar-event-fill"></i>
                    <div>
                        <span class="popup-label">Event Date</span>
                        <span class="popup-value">July - August 2026</span>
                    </div>
                </div>
                <div class="popup-info-item">
                    <i class="ri-map-pin-fill"></i>
                    <div>
                        <span class="popup-label">Venue</span>
                        <span class="popup-value">DSVV Campus, Haridwar</span>
                    </div>
                </div>
                <div class="popup-info-item">
                    <i class="ri-football-fill"></i>
                    <div>
                        <span class="popup-label">Sports</span>
                        <span class="popup-value">10+ Categories</span>
                    </div>
                </div>
                <div class="popup-info-item">
                    <i class="ri-team-fill"></i>
                    <div>
                        <span class="popup-label">Teams</span>
                        <span class="popup-value">7 Mandals Competing</span>
                    </div>
                </div>
            </div>
            <p class="popup-message">Register now to represent your Mandal and compete for glory!</p>
            <button class="popup-register-btn" onclick="redirectToRegistration()">
                <i class="ri-arrow-right-up-line"></i> Proceed to Registration
            </button>
            <p class="popup-footer-note">You will be redirected to the official registration portal</p>
        </div>
    </div>`;

    // Create popup CSS
    const popupCSS = `
    .register-popup-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0, 15, 40, 0.7);
        backdrop-filter: blur(8px);
        z-index: 9999;
        justify-content: center;
        align-items: center;
        animation: popupFadeIn 0.3s ease;
    }

    .register-popup-overlay.active {
        display: flex;
    }

    @keyframes popupFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes popupSlideUp {
        from { transform: translateY(40px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
    }

    .register-popup-card {
        background: var(--surface-color, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 28px;
        padding: 40px 36px 30px;
        width: 90%;
        max-width: 440px;
        text-align: center;
        position: relative;
        animation: popupSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
    }

    .popup-close-btn {
        position: absolute;
        top: 14px;
        right: 18px;
        background: none;
        border: none;
        font-size: 28px;
        color: var(--text-muted, #888);
        cursor: pointer;
        transition: all 0.2s;
        line-height: 1;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .popup-close-btn:hover {
        background: rgba(0,0,0,0.08);
        color: var(--text-color, #333);
        transform: rotate(90deg);
    }

    .popup-icon-circle {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ffbc01, #ff8400);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 18px;
        box-shadow: 0 8px 25px rgba(255, 132, 0, 0.35);
        animation: popupPulse 2s ease-in-out infinite;
    }

    @keyframes popupPulse {
        0%, 100% { box-shadow: 0 8px 25px rgba(255, 132, 0, 0.35); }
        50% { box-shadow: 0 8px 35px rgba(255, 132, 0, 0.55); }
    }

    .popup-icon-circle i {
        font-size: 34px;
        color: #003E8A;
    }

    .register-popup-card h2 {
        font-size: 26px;
        font-weight: 800;
        color: var(--heading-color, #0b1a30);
        margin-bottom: 4px;
        letter-spacing: 1px;
    }

    .popup-subtitle {
        font-size: 13px;
        color: var(--text-muted, #64748b);
        font-weight: 500;
        margin-bottom: 16px;
    }

    .popup-divider {
        width: 50px;
        height: 3px;
        background: linear-gradient(90deg, #ffbc01, #ff8400);
        border-radius: 10px;
        margin: 0 auto 20px;
    }

    .popup-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
        text-align: left;
    }

    .popup-info-item {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--surface-alt, #f7f9ff);
        border: 1px solid var(--border-light, #eef2f5);
        border-radius: 14px;
        padding: 10px 12px;
        transition: all 0.25s;
    }

    .popup-info-item:hover {
        border-color: rgba(255, 188, 1, 0.4);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }

    .popup-info-item i {
        font-size: 22px;
        color: #ff8400;
        flex-shrink: 0;
    }

    .popup-label {
        display: block;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--text-muted, #888);
        letter-spacing: 0.5px;
    }

    .popup-value {
        display: block;
        font-size: 13px;
        font-weight: 700;
        color: var(--heading-color, #0b1a30);
    }

    .popup-message {
        font-size: 14px;
        color: var(--text-muted, #64748b);
        margin-bottom: 18px;
        line-height: 1.5;
    }

    .popup-register-btn {
        width: 100%;
        padding: 14px 24px;
        border: none;
        border-radius: 16px;
        background: linear-gradient(135deg, #003E8A, #001944);
        color: white;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        letter-spacing: 0.5px;
    }

    .popup-register-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(0, 62, 138, 0.4);
        background: linear-gradient(135deg, #004db3, #002866);
    }

    .popup-register-btn:active {
        transform: translateY(0);
    }

    .popup-register-btn i {
        font-size: 20px;
        transition: transform 0.3s;
    }

    .popup-register-btn:hover i {
        transform: translate(3px, -3px);
    }

    .popup-footer-note {
        font-size: 11px;
        color: var(--text-muted, #aaa);
        margin-top: 12px;
    }

    @media (max-width: 480px) {
        .register-popup-card {
            padding: 30px 22px 24px;
            border-radius: 22px;
        }

        .popup-info-grid {
            grid-template-columns: 1fr;
        }

        .popup-icon-circle {
            width: 60px;
            height: 60px;
        }

        .popup-icon-circle i {
            font-size: 28px;
        }

        .register-popup-card h2 {
            font-size: 22px;
        }
    }`;

    // Inject CSS
    const styleEl = document.createElement('style');
    styleEl.textContent = popupCSS;
    document.head.appendChild(styleEl);

    // Inject HTML
    document.body.insertAdjacentHTML('beforeend', popupHTML);

    // Attach overlay close
    document.getElementById('registerPopup').addEventListener('click', function(e) {
        if (e.target === this) closeRegisterPopup();
    });

    // Escape key close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeRegisterPopup();
    });
})();

// Global functions
function showRegisterPopup() {
    const popup = document.getElementById('registerPopup');
    popup.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeRegisterPopup() {
    const popup = document.getElementById('registerPopup');
    popup.classList.remove('active');
    document.body.style.overflow = '';
}

function redirectToRegistration() {
    window.open('https://srs-self-eight.vercel.app/', '_blank');
    closeRegisterPopup();
}

// Auto-show popup once per session — HOME PAGE ONLY
function isHomePage() {
    const path = window.location.pathname.toLowerCase();
    // Matches: "/", "", "index.html", or local/server paths ending with "/index.html"
    return path === '/' || path === '' || path.endsWith('/index.html') || path.endsWith('\\index.html');
}

function initAutoPopup() {
    // Only auto-show on the home page
    if (!isHomePage()) return;

    // Check if popup has already been shown in this session
    if (!sessionStorage.getItem('dsspl_popup_shown')) {
        // Add a slight delay so it doesn't pop up instantly before rendering
        setTimeout(() => {
            showRegisterPopup();
            // Mark as shown for this session
            sessionStorage.setItem('dsspl_popup_shown', 'true');
        }, 1500);
    }
}

// Ensure the popup triggers reliably regardless of when the script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoPopup);
} else {
    initAutoPopup();
}
