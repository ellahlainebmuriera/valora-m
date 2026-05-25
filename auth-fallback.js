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
        is_pro: false,
        invoice_count: 0,
        invoice_theme_color: "#6366f1"
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
            const toggleLogin = document.getElementById("auth-toggle-login");
            const toggleRegister = document.getElementById("auth-toggle-register");
            const showingRegister = registerForm && registerForm.style.display !== "none";

            if (loginForm) loginForm.style.display = showingRegister ? "block" : "none";
            if (registerForm) registerForm.style.display = showingRegister ? "none" : "block";
            if (toggleLogin) toggleLogin.style.display = showingRegister ? "block" : "none";
            if (toggleRegister) toggleRegister.style.display = showingRegister ? "none" : "block";
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
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", valoramAttachLocalAuthFallback);
} else {
    valoramAttachLocalAuthFallback();
}
