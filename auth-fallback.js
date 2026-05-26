/**
 * Local account fallback for Valora EM.
 * Keeps sign up and sign in working for the static hosted app.
 */
const valoraem_TEST_EMAIL = "testaccount@valoraem.com";
const valoraem_TEST_PASSWORD = "ValoraEM181920!!@";
const valoraem_TEST_COMPANY = "Valora EM Test Store";
const valoraem_ADMIN_EMAIL = "ellahlaine.b.muriera@gmail.com";
const valoraem_ADMIN_PASSWORD = "ValoraEMAdmin181920!!@";

function valoraemUserId(email) {
    return `mock-${email.replace(/[^a-zA-Z0-9]/g, "")}`;
}

function valoraemSaveLocalAccount(email, password, companyName) {
    localStorage.setItem(`valoraem_account_${email}`, JSON.stringify({
        email,
        password,
        company_name: companyName
    }));

    localStorage.setItem(`valoraem_profile_${email}`, JSON.stringify({
        email,
        company_name: companyName,
        phone: "",
        address: "",
        logo_url: "",
        currency: "PHP",
        currency_symbol: "PHP",
        default_tax_rate: 12.0,
        is_pro: email === valoraem_ADMIN_EMAIL,
        invoice_count: 0,
        invoice_theme_color: email === valoraem_ADMIN_EMAIL ? "#0d9488" : "#6366f1",
        preferred_language: "en",
        invoice_text_color: "#1e293b",
        print_layout: "pdf",
        app_appearance: "dark",
        saved_signature_data_url: "",
        save_signature_permission: false,
        plan: email === valoraem_ADMIN_EMAIL ? "Business Unlimited" : "Standard Free"
    }));
}

function valoraemLoginLocal(email) {
    const user = { email, id: valoraemUserId(email) };
    localStorage.setItem("valoraem_mock_user", JSON.stringify(user));

    if (typeof setupAuthenticatedUser === "function") {
        setupAuthenticatedUser(user);
        return;
    }

    const authContainer = document.getElementById("auth-container");
    const appRoot = document.getElementById("app-root");
    if (authContainer) authContainer.style.display = "none";
    if (appRoot) appRoot.style.display = "flex";
}

function valoraemEnsureTestAccount() {
    valoraemSaveLocalAccount(valoraem_TEST_EMAIL, valoraem_TEST_PASSWORD, valoraem_TEST_COMPANY);
    valoraemSaveLocalAccount(valoraem_ADMIN_EMAIL, valoraem_ADMIN_PASSWORD, "Valora EM Admin");
}

function valoraemSetDefaultAuthFields() {
    return;
}

function valoraemSetResetCodeStatus(message, isError = false) {
    const status = document.getElementById("reset-code-status");
    if (!status) return;
    status.innerText = message;
    status.style.display = "block";
    status.style.color = isError ? "var(--danger)" : "var(--accent)";
}

function valoraemSendResetCode() {
    const email = document.getElementById("reset-email")?.value.trim();
    if (!email) {
        valoraemSetResetCodeStatus("Please enter your email first.", true);
        return;
    }

    localStorage.setItem(`valoraem_reset_code_${email}`, "123456");
    const codeInput = document.getElementById("reset-code");
    if (codeInput) codeInput.value = "123456";
    valoraemSetResetCodeStatus("Reset code sent for local preview. Use code 123456.");
}

function valoraemAttachLocalAuthFallback() {
    valoraemEnsureTestAccount();
    valoraemSetDefaultAuthFields();

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
            if (window.valoraemIsCloudActive) return;
            event.stopImmediatePropagation();
            const email = document.getElementById("login-email")?.value.trim();
            const password = document.getElementById("login-password")?.value || "";
            const saved = localStorage.getItem(`valoraem_account_${email}`);
            const account = saved ? JSON.parse(saved) : null;

            if (!account && email !== valoraem_TEST_EMAIL && email !== valoraem_ADMIN_EMAIL) return;
            event.preventDefault();

            if (email === valoraem_TEST_EMAIL) valoraemEnsureTestAccount();
            if (email === valoraem_ADMIN_EMAIL) valoraemEnsureTestAccount();
            if ((account && account.password === password) || (email === valoraem_TEST_EMAIL && password === valoraem_TEST_PASSWORD) || (email === valoraem_ADMIN_EMAIL && password === valoraem_ADMIN_PASSWORD)) {
                valoraemLoginLocal(email);
            } else {
                alert("Incorrect email or password.");
            }
        }, true);
    }

    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", (event) => {
            if (window.valoraemIsCloudActive) return;
            event.stopImmediatePropagation();
            const company = document.getElementById("register-company")?.value.trim() || valoraem_TEST_COMPANY;
            const email = document.getElementById("register-email")?.value.trim();
            const password = document.getElementById("register-password")?.value || "";
            if (!email || password.length < 6) return;

            event.preventDefault();
            valoraemSaveLocalAccount(email, password, company);
            valoraemLoginLocal(email);
        }, true);
    }

    const resetForm = document.getElementById("reset-password-form");
    const resetCodeButton = document.getElementById("send-reset-code-btn");
    if (resetCodeButton) {
        resetCodeButton.addEventListener("click", (event) => {
            if (typeof sendPasswordResetCode === "function") return;
            event.preventDefault();
            event.stopImmediatePropagation();
            valoraemSendResetCode();
        }, true);
    }

    if (resetForm) {
        resetForm.addEventListener("submit", (event) => {
            if (window.valoraemIsCloudActive) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            const email = document.getElementById("reset-email")?.value.trim();
            const code = document.getElementById("reset-code")?.value.trim();
            const password = document.getElementById("reset-password")?.value || "";
            const saved = localStorage.getItem(`valoraem_account_${email}`);
            const account = saved ? JSON.parse(saved) : null;

            if (!account && email !== valoraem_TEST_EMAIL && email !== valoraem_ADMIN_EMAIL) {
                alert("No account exists for this email. Please sign up first.");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters.");
                return;
            }

            const expectedCode = localStorage.getItem(`valoraem_reset_code_${email}`) || "123456";
            if (code !== expectedCode) {
                alert("Please enter the verification code sent to your email. Local preview code: 123456.");
                return;
            }

            if (email === valoraem_TEST_EMAIL || email === valoraem_ADMIN_EMAIL) {
                valoraemEnsureTestAccount();
            }

            const latest = JSON.parse(localStorage.getItem(`valoraem_account_${email}`));
            latest.password = password;
            localStorage.setItem(`valoraem_account_${email}`, JSON.stringify(latest));
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
    document.addEventListener("DOMContentLoaded", valoraemAttachLocalAuthFallback);
} else {
    valoraemAttachLocalAuthFallback();
}
