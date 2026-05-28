(() => {
    let deferredInstallPrompt = null;
    let noticeTimer = null;

    function isStandaloneMode() {
        return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    }

    function isAppleMobile() {
        return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    }

    function updateInstallButtons() {
        document.querySelectorAll("[data-install-app]").forEach((button) => {
            button.hidden = false;
            if (isStandaloneMode()) {
                button.innerText = "App Installed";
                button.disabled = true;
                return;
            }
            button.disabled = false;
            button.innerText = deferredInstallPrompt ? "Install App" : "Install App";
        });
    }

    function showInstallNotice(message) {
        let notice = document.getElementById("pwa-install-notice");
        if (!notice) {
            notice = document.createElement("div");
            notice.id = "pwa-install-notice";
            notice.setAttribute("role", "status");
            notice.innerHTML = `
                <span id="pwa-install-notice-text"></span>
                <button type="button" aria-label="Dismiss install message">&times;</button>
            `;
            Object.assign(notice.style, {
                position: "fixed",
                left: "50%",
                bottom: "18px",
                transform: "translateX(-50%) translateY(16px)",
                zIndex: "9999",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                maxWidth: "min(92vw, 520px)",
                padding: "13px 16px",
                borderRadius: "14px",
                background: "rgba(15, 23, 42, 0.95)",
                color: "#ffffff",
                boxShadow: "0 18px 50px rgba(15, 23, 42, 0.28)",
                font: "600 13px/1.45 Inter, Arial, sans-serif",
                opacity: "0",
                pointerEvents: "none",
                transition: "opacity 0.2s ease, transform 0.2s ease"
            });
            const closeButton = notice.querySelector("button");
            Object.assign(closeButton.style, {
                width: "28px",
                height: "28px",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.08)",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "18px",
                lineHeight: "1"
            });
            closeButton.addEventListener("click", hideInstallNotice);
            document.body.appendChild(notice);
        }

        const text = document.getElementById("pwa-install-notice-text");
        if (text) text.innerText = message;
        clearTimeout(noticeTimer);
        requestAnimationFrame(() => {
            notice.style.opacity = "1";
            notice.style.transform = "translateX(-50%) translateY(0)";
            notice.style.pointerEvents = "auto";
        });
        noticeTimer = setTimeout(hideInstallNotice, 7000);
    }

    function hideInstallNotice() {
        const notice = document.getElementById("pwa-install-notice");
        if (!notice) return;
        notice.style.opacity = "0";
        notice.style.transform = "translateX(-50%) translateY(16px)";
        notice.style.pointerEvents = "none";
    }

    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        updateInstallButtons();
    });

    window.addEventListener("appinstalled", () => {
        deferredInstallPrompt = null;
        updateInstallButtons();
    });

    document.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-install-app]");
        if (!button) return;

        if (isStandaloneMode()) {
            showInstallNotice("Valora EM is already installed on this device.");
            return;
        }

        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
            updateInstallButtons();
            return;
        }

        if (isAppleMobile()) {
            showInstallNotice("On iPhone or iPad, open Valora EM in Safari, tap Share, then tap Add to Home Screen.");
            return;
        }

        showInstallNotice("Install is available from supported browsers like Chrome or Edge. Use the browser menu and choose Install app or Add to Home screen.");
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", updateInstallButtons);
    } else {
        updateInstallButtons();
    }
})();
