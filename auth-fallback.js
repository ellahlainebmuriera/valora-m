/**
 * Local account fallback for Valora M.
 * Keeps sign up and sign in working for the static hosted app.
 */
const VALORAM_TEST_EMAIL = "testaccount@valoram.com";
const VALORAM_TEST_PASSWORD = "ValoraM181920!!@";
const VALORAM_TEST_COMPANY = "Valora M Test Store";
const VALORAM_ADMIN_EMAIL = "ellahlaine.b.muriera@gmail.com";
const VALORAM_ADMIN_PASSWORD = "ValoraMAdmin181920!!@";

function valoramUserId(email) {
    return `mock-${email.replace(/[^a-zA-Z0-9]/g, "")}`;
}

function valoramSaveLocalAccount(email, password, companyName) {
    localStorage.setItem(`valoram_account_${email}`, JSON.stringify({
        email,
        password,
        company_name: companyName
    }));

    localStorage.setItem(`valoram_profile_${email}`, JSON.stringify({
        email,
        company_name: companyName,
        phone: "",
        address: "",
        logo_url: "",
        currency: "PHP",
        currency_symbol: "PHP",
        default_tax_rate: 12.0,
        is_pro: email === VALORAM_ADMIN_EMAIL,
        invoice_count: 0,
        invoice_theme_color: email === VALORAM_ADMIN_EMAIL ? "#0d9488" : "#6366f1",
        preferred_language: "en",
        plan: email === VALORAM_ADMIN_EMAIL ? "Business Unlimited" : "Standard Free"
    }));
}

function valoramLoginLocal(email) {
    const user = { email, id: valoramUserId(email) };
    localStorage.setItem("valoram_mock_user", JSON.stringify(user));

    if (typeof setupAuthenticatedUser === "function") {
        setupAuthenticatedUser(user);
        return;
    }

    const authContainer = document.getElementById("auth-container");
    const appRoot = document.getElementById("app-root");
    if (authContainer) authContainer.style.display = "none";
    if (appRoot) appRoot.style.display = "flex";
}

function valoramEnsureTestAccount() {
    valoramSaveLocalAccount(VALORAM_TEST_EMAIL, VALORAM_TEST_PASSWORD, VALORAM_TEST_COMPANY);
    valoramSaveLocalAccount(VALORAM_ADMIN_EMAIL, VALORAM_ADMIN_PASSWORD, "Valora M Admin");
}

function valoramSetDefaultAuthFields() {
    return;
}

function valoramAttachLocalAuthFallback() {
    valoramEnsureTestAccount();
    valoramSetDefaultAuthFields();

    document.querySelectorAll(".toggle-auth-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const loginForm = document.getElementById("login-form");
            const registerForm = document.getElementById("register-form");
            const resetForm = document.getElementById("reset-password-form");
            const toggleLogin = document.getElementById("auth-toggle-login");
            const toggleRegister = document.getElementById("auth-toggle-register");
            const toggleReset = document.getElementById("auth-toggle-reset");
            const toggleResetBack = document.getElementById("auth-toggle-reset-back");
            const showingRegister = registerForm && registerForm.style.display !== "none";

            if (loginForm) loginForm.style.display = showingRegister ? "block" : "none";
            if (registerForm) registerForm.style.display = showingRegister ? "none" : "block";
            if (resetForm) resetForm.style.display = "none";
            if (toggleLogin) toggleLogin.style.display = showingRegister ? "block" : "none";
            if (toggleRegister) toggleRegister.style.display = showingRegister ? "none" : "block";
            if (toggleReset) toggleReset.style.display = showingRegister ? "block" : "none";
            if (toggleResetBack) toggleResetBack.style.display = "none";
        }, true);
    });

    document.querySelectorAll(".reset-auth-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const loginForm = document.getElementById("login-form");
            const registerForm = document.getElementById("register-form");
            const resetForm = document.getElementById("reset-password-form");
            const toggleLogin = document.getElementById("auth-toggle-login");
            const toggleRegister = document.getElementById("auth-toggle-register");
            const toggleReset = document.getElementById("auth-toggle-reset");
            const toggleResetBack = document.getElementById("auth-toggle-reset-back");
            const showingReset = resetForm && resetForm.style.display !== "none";

            if (loginForm) loginForm.style.display = showingReset ? "block" : "none";
            if (registerForm) registerForm.style.display = "none";
            if (resetForm) resetForm.style.display = showingReset ? "none" : "block";
            if (toggleLogin) toggleLogin.style.display = showingReset ? "block" : "none";
            if (toggleRegister) toggleRegister.style.display = "none";
            if (toggleReset) toggleReset.style.display = showingReset ? "block" : "none";
            if (toggleResetBack) toggleResetBack.style.display = showingReset ? "none" : "block";
        }, true);
    });

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", (event) => {
            event.stopImmediatePropagation();
            const email = document.getElementById("login-email")?.value.trim();
            const password = document.getElementById("login-password")?.value || "";
            const saved = localStorage.getItem(`valoram_account_${email}`);
            const account = saved ? JSON.parse(saved) : null;

            if (!account && email !== VALORAM_TEST_EMAIL && email !== VALORAM_ADMIN_EMAIL) return;
            event.preventDefault();

            if (email === VALORAM_TEST_EMAIL) valoramEnsureTestAccount();
            if (email === VALORAM_ADMIN_EMAIL) valoramEnsureTestAccount();
            if ((account && account.password === password) || (email === VALORAM_TEST_EMAIL && password === VALORAM_TEST_PASSWORD) || (email === VALORAM_ADMIN_EMAIL && password === VALORAM_ADMIN_PASSWORD)) {
                valoramLoginLocal(email);
            } else {
                alert("Incorrect email or password.");
            }
        }, true);
    }

    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", (event) => {
            event.stopImmediatePropagation();
            const company = document.getElementById("register-company")?.value.trim() || VALORAM_TEST_COMPANY;
            const email = document.getElementById("register-email")?.value.trim();
            const password = document.getElementById("register-password")?.value || "";
            if (!email || password.length < 6) return;

            event.preventDefault();
            valoramSaveLocalAccount(email, password, company);
            valoramLoginLocal(email);
        }, true);
    }

    const resetForm = document.getElementById("reset-password-form");
    if (resetForm) {
        resetForm.addEventListener("submit", (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const email = document.getElementById("reset-email")?.value.trim();
            const password = document.getElementById("reset-password")?.value || "";
            const saved = localStorage.getItem(`valoram_account_${email}`);
            const account = saved ? JSON.parse(saved) : null;

            if (!account && email !== VALORAM_TEST_EMAIL && email !== VALORAM_ADMIN_EMAIL) {
                alert("No account exists for this email. Please sign up first.");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters.");
                return;
            }

            if (email === VALORAM_TEST_EMAIL || email === VALORAM_ADMIN_EMAIL) {
                valoramEnsureTestAccount();
            }

            const latest = JSON.parse(localStorage.getItem(`valoram_account_${email}`));
            latest.password = password;
            localStorage.setItem(`valoram_account_${email}`, JSON.stringify(latest));
            alert("Password updated. You can now sign in with your new password.");

            document.getElementById("login-email").value = email;
            document.getElementById("login-password").value = "";
            document.getElementById("login-form").style.display = "block";
            document.getElementById("reset-password-form").style.display = "none";
            document.getElementById("auth-toggle-login").style.display = "block";
            document.getElementById("auth-toggle-register").style.display = "none";
            document.getElementById("auth-toggle-reset").style.display = "block";
            document.getElementById("auth-toggle-reset-back").style.display = "none";
        }, true);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", valoramAttachLocalAuthFallback);
} else {
    valoramAttachLocalAuthFallback();
}
