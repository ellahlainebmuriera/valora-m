(() => {
    let deferredInstallPrompt = null;

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
            alert("Valora EM is already installed on this device.");
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
            alert("On iPhone or iPad: open Valora EM in Safari, tap Share, then tap Add to Home Screen.");
            return;
        }

        alert("If the install prompt does not open yet, open Valora EM in Chrome after the Vercel deployment finishes, then use the browser menu and choose Install app or Add to Home screen.");
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", updateInstallButtons);
    } else {
        updateInstallButtons();
    }
})();
