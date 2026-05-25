/**
 * Valora M - Main Application Controller
 * Handles UI routing, dynamic calculations, Supabase Cloud synchronization,
 * LocalStorage data fallbacks, and the mock Payment / White-label systems.
 */

// ==================== DATABASE CONFIGURATION ====================
// TODO: Replace these with your own Supabase API credentials when cloud SaaS setup is ready.
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const DEFAULT_USER_EMAIL = "testaccount@valoram.com";
const DEFAULT_TEST_PASSWORD = "ValoraM181920!!@";
const DEFAULT_TEST_COMPANY = "Valora M Test Store";
const ADMIN_EMAIL = "ellahlaine.b.muriera@gmail.com";
const ADMIN_PASSWORD = "ValoraMAdmin181920!!@";

let supabaseClient = null;
let isCloudActive = false;

// Initialize Supabase. Kapag wala pang credentials, mag-fo-fallback sa LocalStorage automatically.
try {
    if (SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY") {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        isCloudActive = true;
        console.log("🚀 Supabase Cloud Database Connected!");
    } else {
        console.log("ℹ️ Demo Mode: Using LocalStorage Database Fallback.");
    }
} catch (err) {
    console.error("Supabase connection failed. Falling back to LocalStorage.", err);
}

// ==================== STATE MANAGEMENT ====================
let currentUser = null;
let currentProfile = {
    company_name: "My Business",
    email: "",
    phone: "",
    address: "",
    logo_url: "",
    currency: "PHP",
    currency_symbol: "₱",
    default_tax_rate: 12.0,
    is_pro: false,
    invoice_count: 0,
    invoice_theme_color: "#6366f1"
};

let clients = [];
let invoices = [];
let currentInvoiceItems = []; // List of { id, description, quantity, unit_price }
let activeEditingInvoiceId = null;
let paymentSettings = {
    paymongoPublicKey: "",
    paymongoSecretKey: "",
    stripePublishableKey: "",
    stripeSecretKey: "",
    cardCheckoutUrl: "",
    gcashNumber: "0917-888-8888",
    payoutAccount: ""
};

// Default White-Label Settings (Naka-save sa LocalStorage para sa developer branding)
let whitelabelConfig = {
    appName: "Valora M",
    theme: "indigo"
};

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
    seedTestAccount();
    loadWhiteLabelSettings();
    initAppEventListeners();
    initSignaturePad();
    checkAuthSession();
    
    // Set default dates in invoice form
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("inv-date").value = today;
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById("inv-duedate").value = nextMonth.toISOString().split('T')[0];
});

function getLocalAccount(email) {
    const saved = localStorage.getItem(`valoram_account_${email}`);
    return saved ? JSON.parse(saved) : null;
}

function saveLocalAccount(account) {
    localStorage.setItem(`valoram_account_${account.email}`, JSON.stringify(account));
}

function createLocalSession(email) {
    const mockUser = {
        email,
        id: `mock-${email.replace(/[^a-zA-Z0-9]/g, '')}`,
        role: email === ADMIN_EMAIL ? "admin" : "customer"
    };
    localStorage.setItem("valoram_mock_user", JSON.stringify(mockUser));
    return mockUser;
}

function isAdminUser() {
    return currentUser && currentUser.email === ADMIN_EMAIL;
}

function seedTestAccount() {
    saveLocalAccount({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        company_name: "Valora M Admin"
    });

    if (!localStorage.getItem(`valoram_profile_${ADMIN_EMAIL}`)) {
        localStorage.setItem(`valoram_profile_${ADMIN_EMAIL}`, JSON.stringify({
            email: ADMIN_EMAIL,
            company_name: "Valora M Admin",
            phone: "",
            address: "",
            logo_url: "",
            currency: "PHP",
            currency_symbol: "PHP",
            default_tax_rate: 12.0,
            is_pro: true,
            invoice_count: 0,
            invoice_theme_color: "#0d9488",
            preferred_language: "en",
            plan: "Business Unlimited"
        }));
    }

    saveLocalAccount({
        email: DEFAULT_USER_EMAIL,
        password: DEFAULT_TEST_PASSWORD,
        company_name: DEFAULT_TEST_COMPANY
    });

    if (!localStorage.getItem(`valoram_profile_${DEFAULT_USER_EMAIL}`)) {
        localStorage.setItem(`valoram_profile_${DEFAULT_USER_EMAIL}`, JSON.stringify({
            email: DEFAULT_USER_EMAIL,
            company_name: DEFAULT_TEST_COMPANY,
            phone: "0917-123-4567",
            address: "Manila, Philippines",
            logo_url: "",
            currency: "PHP",
            currency_symbol: "PHP",
            default_tax_rate: 12.0,
            is_pro: true,
            invoice_count: 1,
            invoice_theme_color: "#0d9488",
            preferred_language: "en"
        }));
    }

    if (!localStorage.getItem("valoram_payment_settings")) {
        localStorage.setItem("valoram_payment_settings", JSON.stringify(paymentSettings));
    }

    const sampleClient = {
        id: "client-demo-001",
        name: "Sample Customer",
        email: "customer@example.com",
        phone: "0917-555-0101",
        address: "Quezon City, Philippines"
    };

    if (!localStorage.getItem(`valoram_clients_${DEFAULT_USER_EMAIL}`)) {
        localStorage.setItem(`valoram_clients_${DEFAULT_USER_EMAIL}`, JSON.stringify([sampleClient]));
    }

    if (!localStorage.getItem(`valoram_invoices_${DEFAULT_USER_EMAIL}`)) {
        localStorage.setItem(`valoram_invoices_${DEFAULT_USER_EMAIL}`, JSON.stringify([{
        id: "inv-demo-001",
        invoice_number: "INV-0001",
        client_id: sampleClient.id,
        type: "invoice",
        status: "Unpaid",
        issue_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        tax_rate: 12,
        discount: 0,
        notes: "Sample invoice only. You can edit or delete this.",
        subtotal: 1500,
        tax_amount: 180,
        total: 1680,
        signature_data_url: null,
        items: [
            { id: "item-demo-001", description: "Sample Product", quantity: 2, unit_price: 500 },
            { id: "item-demo-002", description: "Delivery Fee", quantity: 1, unit_price: 500 }
        ]
        }]));
    }
}

// Load the developer branding variables
function loadWhiteLabelSettings() {
    const saved = localStorage.getItem("valoram_whitelabel") || localStorage.getItem("billflow_whitelabel");
    if (saved) {
        whitelabelConfig = JSON.parse(saved);
        if (whitelabelConfig.appName && whitelabelConfig.appName.toLowerCase().startsWith("bill")) {
            whitelabelConfig.appName = "Valora M";
        }
        localStorage.setItem("valoram_whitelabel", JSON.stringify(whitelabelConfig));
        localStorage.removeItem("billflow_whitelabel");
    }
    applyWhiteLabel();
}

function applyWhiteLabel() {
    // Update Document Title
    document.title = `${whitelabelConfig.appName} - Professional Invoicing SaaS`;
    
    // Update Branding texts
    document.getElementById("auth-app-name").innerText = whitelabelConfig.appName;
    document.getElementById("sidebar-app-name").innerText = whitelabelConfig.appName;
    document.getElementById("wl-app-name").value = whitelabelConfig.appName;
    
    // Update logo icon first letters
    const initial = whitelabelConfig.appName.charAt(0).toUpperCase();
    document.getElementById("auth-logo-icon").innerText = initial;
    document.getElementById("sidebar-logo-icon").innerText = initial;
    
    // Apply theme CSS class
    document.body.className = ""; // Reset
    document.body.classList.add(`theme-${whitelabelConfig.theme}`);
    
    // Update selected class in Settings panel
    document.querySelectorAll(".color-preset").forEach(el => {
        el.classList.remove("active");
        if (el.dataset.theme === whitelabelConfig.theme) {
            el.classList.add("active");
        }
    });
}

// Check user login session
async function checkAuthSession() {
    if (isCloudActive) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            setupAuthenticatedUser(session.user);
        } else {
            showAuthScreen();
        }
    } else {
        // Localstorage mock authentication session check
        const savedSession = localStorage.getItem("valoram_mock_user");
        if (savedSession) {
            setupAuthenticatedUser(JSON.parse(savedSession));
        } else {
            showAuthScreen();
        }
    }
}

// Switch between tab screens
function switchTab(tabId) {
    if (tabId === "admin-tab" && !isAdminUser()) {
        alert("Admin access is only available for the owner account.");
        return;
    }

    // Don't show premium features if user is on Free Tier and trying to write too many invoices
    if (tabId === "creator-tab" && !currentProfile.is_pro && invoices.length >= 5) {
        alert("Trial limit reached: Free accounts can create up to 5 invoices. Upgrade to Pro to continue.");
        switchTab("billing-tab");
        return;
    }

    // Manage active tab displays
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
    
    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.classList.add("active");
    
    const activeLink = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (activeLink) activeLink.classList.add("active");
    
    // Refresh tables on navigation
    if (tabId === "dashboard-tab") {
        renderDashboard();
    } else if (tabId === "invoices-tab") {
        renderInvoicesTable();
    } else if (tabId === "clients-tab") {
        renderClientsTable();
        populateClientDropdown();
    } else if (tabId === "creator-tab") {
        populateClientDropdown();
        if (!activeEditingInvoiceId) {
            resetCreatorForm();
        }
        setTimeout(resizeCanvas, 50);
    } else if (tabId === "billing-tab") {
        updateBillingTabUI();
    } else if (tabId === "admin-tab") {
        renderAdminDashboard();
    }
}

function updateAdminVisibility() {
    const adminNav = document.getElementById("admin-nav-item");
    if (adminNav) {
        adminNav.style.display = isAdminUser() ? "block" : "none";
    }
}

// Display auth form
function showAuthScreen() {
    document.getElementById("auth-container").style.display = "flex";
    document.getElementById("app-root").style.display = "none";
}

// Display dashboard/app
function showAppScreen() {
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("app-root").style.display = "flex";
    switchTab("dashboard-tab");
}

// Setup User Profile and Details
async function setupAuthenticatedUser(user) {
    currentUser = user;
    
    if (isCloudActive) {
        // Fetch profile details from Supabase cloud database
        let { data: profile, error } = await supabaseClient.from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
            
        if (error || !profile) {
            // Auto create missing profile row
            const newProfile = {
                id: user.id,
                email: user.email,
                company_name: "My Business",
                is_pro: false
            };
            await supabaseClient.from("profiles").insert(newProfile);
            currentProfile = newProfile;
        } else {
            currentProfile = profile;
        }
        
        // Fetch clients & invoices
        await fetchCloudData();
    } else {
        // Fetch profile details from local storage
        currentProfile = getLocalStorageProfile(user.email);
        loadLocalData();
    }
    
    // Update application-wide profile displays
    document.getElementById("user-display-email").innerText = currentProfile.email || currentUser.email;
    document.getElementById("user-avatar-char").innerText = (currentProfile.company_name || "M").charAt(0).toUpperCase();
    
    // Populate form fields
    document.getElementById("store-name").value = currentProfile.company_name;
    document.getElementById("store-email").value = currentProfile.email || "";
    document.getElementById("store-phone").value = currentProfile.phone || "";
    document.getElementById("store-address").value = currentProfile.address || "";
    document.getElementById("store-currency").value = currentProfile.currency || "PHP";
    document.getElementById("store-currency-symbol").value = currentProfile.currency_symbol || "₱";
    document.getElementById("inv-tax-rate").value = currentProfile.default_tax_rate;
    if (document.getElementById("preferred-language")) {
        document.getElementById("preferred-language").value = currentProfile.preferred_language || "en";
        document.getElementById("preferred-language").disabled = !currentProfile.is_pro;
    }
    
    // Apply logo preview if exists
    if (currentProfile.logo_url) {
        document.getElementById("settings-logo-preview").innerHTML = `<img src="${currentProfile.logo_url}" alt="Store logo">`;
        document.getElementById("preview-logo-box").innerHTML = `<img src="${currentProfile.logo_url}" alt="Store logo">`;
    }
    
    applyInvoiceThemeColor();
    updateUserTierUI();
    updateAdminVisibility();
    showAppScreen();
}

function getLocalStorageProfile(email) {
    const key = `valoram_profile_${email}`;
    const saved = localStorage.getItem(key);
    if (saved) {
        return JSON.parse(saved);
    }
    
    // Default fallback profile object
    return {
        email: email,
        company_name: "My Business",
        phone: "",
        address: "",
        logo_url: "",
        currency: "PHP",
        currency_symbol: "₱",
        default_tax_rate: 12.0,
        is_pro: false,
        invoice_count: 0,
        invoice_theme_color: "#6366f1"
    };
}

function saveLocalStorageProfile() {
    const key = `valoram_profile_${currentUser.email}`;
    localStorage.setItem(key, JSON.stringify(currentProfile));
}

function loadPaymentSettings() {
    const saved = localStorage.getItem("valoram_payment_settings");
    paymentSettings = saved ? { ...paymentSettings, ...JSON.parse(saved) } : paymentSettings;
}

function savePaymentSettings() {
    paymentSettings = {
        paymongoPublicKey: document.getElementById("admin-paymongo-public").value.trim(),
        paymongoSecretKey: document.getElementById("admin-paymongo-secret").value.trim(),
        stripePublishableKey: document.getElementById("admin-stripe-public").value.trim(),
        stripeSecretKey: document.getElementById("admin-stripe-secret").value.trim(),
        cardCheckoutUrl: document.getElementById("admin-card-checkout-url").value.trim(),
        gcashNumber: document.getElementById("admin-gcash-number").value.trim(),
        payoutAccount: document.getElementById("admin-payout-account").value.trim()
    };
    localStorage.setItem("valoram_payment_settings", JSON.stringify(paymentSettings));
    alert("Admin payment settings saved locally. Connect these keys to the live checkout when Supabase/payment integration is ready.");
}

function getPaymentRecords() {
    return JSON.parse(localStorage.getItem("valoram_payment_records")) || [];
}

function savePaymentRecords(records) {
    localStorage.setItem("valoram_payment_records", JSON.stringify(records));
}

function recordPayment(plan, price, method) {
    const records = getPaymentRecords();
    records.push({
        id: `pay-${Date.now()}`,
        plan,
        price: Number(price) || 0,
        method,
        customer_email: currentUser?.email || "local-customer",
        created_at: new Date().toISOString()
    });
    savePaymentRecords(records);
}

// Fetch database records from Supabase
async function fetchCloudData() {
    try {
        // Fetch Clients
        const { data: dbClients } = await supabaseClient.from("clients").select("*").order("name");
        clients = dbClients || [];
        
        // Fetch Invoices
        const { data: dbInvoices } = await supabaseClient.from("invoices").select("*").order("created_at", { ascending: false });
        invoices = dbInvoices || [];
    } catch (err) {
        console.error("Error fetching cloud data:", err);
    }
}

// Fetch database records from LocalStorage
function loadLocalData() {
    const suffix = currentUser.email;
    clients = JSON.parse(localStorage.getItem(`valoram_clients_${suffix}`)) || [];
    invoices = JSON.parse(localStorage.getItem(`valoram_invoices_${suffix}`)) || [];
}

// Save database records to LocalStorage
function saveLocalData() {
    const suffix = currentUser.email;
    localStorage.setItem(`valoram_clients_${suffix}`, JSON.stringify(clients));
    localStorage.setItem(`valoram_invoices_${suffix}`, JSON.stringify(invoices));
}

// Update UI headers depending on Pro Status
function updateUserTierUI() {
    const tierDisplay = document.getElementById("user-display-tier");
    const currentTierStatus = document.getElementById("current-tier-status");
    const banner = document.getElementById("trial-warning-banner");
    
    if (isAdminUser()) {
        tierDisplay.innerText = "BUSINESS UNLIMITED";
        tierDisplay.style.color = "var(--accent)";
        tierDisplay.style.backgroundColor = "var(--accent-glow)";
        currentTierStatus.innerText = "BUSINESS UNLIMITED PLAN";
        currentTierStatus.style.color = "var(--accent)";
        if (banner) banner.style.display = "none";
    } else if (currentProfile.is_pro) {
        tierDisplay.innerText = "PRO ACCOUNT";
        tierDisplay.style.color = "var(--accent)";
        tierDisplay.style.backgroundColor = "var(--accent-glow)";
        currentTierStatus.innerText = "PRO UNLIMITED PLAN";
        currentTierStatus.style.color = "var(--accent)";
        if (banner) banner.style.display = "none";
    } else {
        tierDisplay.innerText = "FREE TRIAL";
        tierDisplay.style.color = "var(--warning)";
        tierDisplay.style.backgroundColor = "rgba(245, 158, 11, 0.15)";
        currentTierStatus.innerText = "STANDARD FREE PLAN";
        currentTierStatus.style.color = "var(--warning)";
        if (banner) banner.style.display = "flex";
    }
}

// ==================== EVENT HANDLERS ====================
function initAppEventListeners() {
    // Auth Toggles
    document.querySelectorAll(".toggle-auth-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const loginForm = document.getElementById("login-form");
            const registerForm = document.getElementById("register-form");
            const toggleLogin = document.getElementById("auth-toggle-login");
            const toggleRegister = document.getElementById("auth-toggle-register");
            
            if (loginForm.style.display === "none") {
                loginForm.style.display = "block";
                registerForm.style.display = "none";
                toggleLogin.style.display = "block";
                toggleRegister.style.display = "none";
            } else {
                loginForm.style.display = "none";
                registerForm.style.display = "block";
                toggleLogin.style.display = "none";
                toggleRegister.style.display = "block";
            }
        });
    });

    // Login Submission
    document.getElementById("login-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;
        
        if (isCloudActive) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                alert(`Error: ${error.message}`);
            } else {
                setupAuthenticatedUser(data.user);
            }
        } else {
            // Local account login for static hosted mode.
            const localAccount = getLocalAccount(email);
            if (!localAccount) {
                alert("No account exists for this email. Please sign up first.");
                return;
            }
            if (password.length < 6) {
                alert("Password must be at least 6 characters.");
                return;
            }
            if (localAccount.password !== password) {
                alert("Incorrect email or password.");
                return;
            }
            setupAuthenticatedUser(createLocalSession(email));
        }
    });

    // Register Submission
    document.getElementById("register-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const company = document.getElementById("register-company").value.trim();
        const email = document.getElementById("register-email").value.trim();
        const password = document.getElementById("register-password").value;
        
        if (isCloudActive) {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { company_name: company }
                }
            });
            if (error) {
                alert(`Error: ${error.message}`);
            } else {
                alert("Sign up successful! Please check your email for confirmation (or proceed to sign in if enabled).");
                // Switch back to login form
                document.getElementById("login-form").style.display = "block";
                document.getElementById("register-form").style.display = "none";
                document.getElementById("auth-toggle-login").style.display = "block";
                document.getElementById("auth-toggle-register").style.display = "none";
            }
        } else {
            // Mock Register
            if (!company) {
                alert("Please enter a store or company name.");
                return;
            }
            if (password.length < 6) {
                alert("Password must be at least 6 characters.");
                return;
            }
            saveLocalAccount({ email, password, company_name: company });
            const newProfile = {
                email: email,
                company_name: company,
                is_pro: false,
                currency: "PHP",
                currency_symbol: "PHP",
                default_tax_rate: 12.0
            };
            localStorage.setItem(`valoram_profile_${email}`, JSON.stringify(newProfile));
            alert("Account created. Welcome to Valora M.");
            setupAuthenticatedUser(createLocalSession(email));
            return;
            if (password.length >= 6) {
                const mockUser = { email, id: `mock-${email.replace(/[^a-zA-Z0-9]/g, '')}` };
                // Initialize default profile
                const newProfile = {
                    email: email,
                    company_name: company,
                    is_pro: false,
                    currency: "PHP",
                    currency_symbol: "₱",
                    default_tax_rate: 12.0
                };
                localStorage.setItem(`valoram_profile_${email}`, JSON.stringify(newProfile));
                localStorage.setItem("valoram_mock_user", JSON.stringify(mockUser));
                setupAuthenticatedUser(mockUser);
            } else {
                alert("Password must be at least 6 characters.");
            }
        }
    });

    // Logout
    document.getElementById("logout-btn").addEventListener("click", async () => {
        if (isCloudActive) {
            await supabaseClient.auth.signOut();
        }
        localStorage.removeItem("valoram_mock_user");
        currentUser = null;
        showAuthScreen();
    });

    // Navigation item click links
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => {
            const tabId = item.dataset.tab;
            switchTab(tabId);
        });
    });

    // Store Settings Save
    document.getElementById("save-store-settings-btn").addEventListener("click", async () => {
        currentProfile.company_name = document.getElementById("store-name").value.trim();
        currentProfile.phone = document.getElementById("store-phone").value.trim();
        currentProfile.address = document.getElementById("store-address").value.trim();
        currentProfile.currency = document.getElementById("store-currency").value.trim();
        currentProfile.currency_symbol = document.getElementById("store-currency-symbol").value.trim();
        currentProfile.preferred_language = document.getElementById("preferred-language").value;
        
        if (isCloudActive) {
            const { error } = await supabaseClient.from("profiles")
                .update({
                    company_name: currentProfile.company_name,
                    phone: currentProfile.phone,
                    address: currentProfile.address,
                    currency: currentProfile.currency,
                    currency_symbol: currentProfile.currency_symbol,
                    preferred_language: currentProfile.preferred_language,
                    invoice_theme_color: currentProfile.invoice_theme_color
                })
                .eq("id", currentUser.id);
            if (error) alert("Error updating settings: " + error.message);
            else alert("Store details saved successfully!");
        } else {
            saveLocalStorageProfile();
            alert("Store details saved locally!");
        }
        
        // Refresh logos/previews
        document.getElementById("user-avatar-char").innerText = currentProfile.company_name.charAt(0).toUpperCase();
        updateInvoicePreview();
    });

    // Store Logo File Selection (Converts file to base64 DataURL for offline compatibility)
    document.getElementById("store-logo-file").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("Maximum size supported is 2MB.");
                return;
            }
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                const dataUrl = event.target.result;
                currentProfile.logo_url = dataUrl;
                
                // Show in Settings preview and live preview
                document.getElementById("settings-logo-preview").innerHTML = `<img src="${dataUrl}" alt="logo">`;
                document.getElementById("preview-logo-box").innerHTML = `<img src="${dataUrl}" alt="logo">`;
                
                // Save immediately
                if (isCloudActive) {
                    await supabaseClient.from("profiles").update({ logo_url: dataUrl }).eq("id", currentUser.id);
                } else {
                    saveLocalStorageProfile();
                }
            };
            reader.readAsDataURL(file);
        }
    });

    // Developer Branding Save
    document.getElementById("save-wl-settings-btn").addEventListener("click", () => {
        const customName = document.getElementById("wl-app-name").value.trim();
        if (customName) {
            whitelabelConfig.appName = customName;
            localStorage.setItem("valoram_whitelabel", JSON.stringify(whitelabelConfig));
            applyWhiteLabel();
            alert("Branding settings applied to the software successfully!");
        }
    });

    // Color preset selections
    document.querySelectorAll(".color-preset").forEach(btn => {
        btn.addEventListener("click", () => {
            whitelabelConfig.theme = btn.dataset.theme;
            // Update active states visual
            document.querySelectorAll(".color-preset").forEach(el => el.classList.remove("active"));
            btn.classList.add("active");
        });
    });

    // Add client form submission
    document.getElementById("new-client-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("client-name").value.trim();
        const email = document.getElementById("client-email").value.trim();
        const phone = document.getElementById("client-phone").value.trim();
        const address = document.getElementById("client-address").value.trim();
        
        const newClient = {
            name,
            email,
            phone,
            address
        };
        
        if (isCloudActive) {
            newClient.user_id = currentUser.id;
            const { data, error } = await supabaseClient.from("clients").insert(newClient).select();
            if (error) {
                alert("Error saving client: " + error.message);
                return;
            }
            if (data && data[0]) clients.push(data[0]);
        } else {
            newClient.id = `client-${Date.now()}`;
            clients.push(newClient);
            saveLocalData();
        }
        
        alert("Client added successfully to directory!");
        document.getElementById("new-client-form").reset();
        renderClientsTable();
        populateClientDropdown();
    });

    // Live update preview outputs on invoice inputs edit
    document.getElementById("inv-number").addEventListener("input", (e) => {
        document.getElementById("preview-inv-number").innerText = e.target.value;
    });
    document.getElementById("inv-type").addEventListener("change", (e) => {
        const type = e.target.value;
        document.getElementById("preview-doc-type-text").innerText = type === "invoice" ? "INVOICE" : "ESTIMATE";
        document.getElementById("creator-title").innerText = type === "invoice" ? "Invoice Creator" : "Estimate Creator";
    });
    document.getElementById("inv-date").addEventListener("change", (e) => {
        document.getElementById("preview-inv-date").innerText = e.target.value;
    });
    document.getElementById("inv-duedate").addEventListener("change", (e) => {
        document.getElementById("preview-inv-duedate").innerText = e.target.value;
    });
    document.getElementById("inv-client-select").addEventListener("change", (e) => {
        const clientId = e.target.value;
        const client = clients.find(c => c.id == clientId);
        if (client) {
            document.getElementById("preview-client-name").innerText = client.name;
            document.getElementById("preview-client-email").innerText = client.email || "No email";
            document.getElementById("preview-client-phone").innerText = client.phone || "No phone number";
            document.getElementById("preview-client-address").innerText = client.address || "No address";
        } else {
            document.getElementById("preview-client-name").innerText = "Walk-in Customer";
            document.getElementById("preview-client-email").innerText = "";
            document.getElementById("preview-client-phone").innerText = "";
            document.getElementById("preview-client-address").innerText = "";
        }
    });
    document.getElementById("inv-tax-rate").addEventListener("input", updateInvoicePreview);
    document.getElementById("inv-discount").addEventListener("input", updateInvoicePreview);
    document.getElementById("inv-notes").addEventListener("input", (e) => {
        document.getElementById("preview-notes-text").innerText = e.target.value;
    });

    // Add line item row click
    document.getElementById("add-line-item-btn").addEventListener("click", () => {
        addNewLineItem();
    });

    // Search inputs filtering
    document.getElementById("invoice-search-input").addEventListener("input", renderInvoicesTable);
    document.getElementById("invoice-filter-status").addEventListener("change", renderInvoicesTable);
    document.getElementById("client-search-input").addEventListener("input", renderClientsTable);

    // Save invoice click
    document.getElementById("save-invoice-btn").addEventListener("click", saveInvoiceToDatabase);

    // Print Invoice trigger
    document.getElementById("print-invoice-btn").addEventListener("click", () => {
        window.print();
    });

    // Subscription upgrading popup
    document.querySelectorAll(".checkout-plan-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const price = button.dataset.price || "249";
            const plan = button.dataset.plan || "Pro Unlimited";
            document.getElementById("payment-modal").dataset.plan = plan;
            document.getElementById("payment-modal").dataset.price = price;
            document.getElementById("payment-plan-name").innerText = plan;
            document.getElementById("payment-plan-amount").innerText = `PHP ${price}.00`;
            document.getElementById("submit-mock-payment-btn").innerText = `Pay PHP ${price}.00 Now`;
            document.getElementById("payment-modal").style.display = "flex";
        });
    });
    document.getElementById("close-payment-btn").addEventListener("click", () => {
        document.getElementById("payment-modal").style.display = "none";
    });

    // Payment Option Switching
    document.getElementById("pay-gcash-opt").addEventListener("click", () => {
        document.getElementById("pay-gcash-opt").classList.add("active");
        document.getElementById("pay-card-opt").classList.remove("active");
        document.getElementById("gcash-payment-details").style.display = "block";
        document.getElementById("card-payment-details").style.display = "none";
    });
    document.getElementById("pay-card-opt").addEventListener("click", () => {
        document.getElementById("pay-card-opt").classList.add("active");
        document.getElementById("pay-gcash-opt").classList.remove("active");
        document.getElementById("card-payment-details").style.display = "block";
        document.getElementById("gcash-payment-details").style.display = "none";
    });

    // Submit Payment Simulation
    document.getElementById("submit-mock-payment-btn").addEventListener("click", processMockPaymentUpgrade);

    document.getElementById("save-admin-payment-settings-btn").addEventListener("click", savePaymentSettings);
}

// ==================== RENDERING LOGIC ====================

// Populate customer selector dropdown
function populateClientDropdown() {
    const select = document.getElementById("inv-client-select");
    const currentVal = select.value;
    
    select.innerHTML = '<option value="">-- Select Client --</option>';
    clients.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
    
    select.value = currentVal;
}

// Render clients directory database
function renderClientsTable() {
    const tbody = document.querySelector("#clients-table tbody");
    const query = document.getElementById("client-search-input").value.toLowerCase();
    
    tbody.innerHTML = "";
    const filtered = clients.filter(c => c.name.toLowerCase().includes(query) || (c.email && c.email.toLowerCase().includes(query)));
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No clients found.</td></tr>';
        return;
    }
    
    filtered.forEach(c => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${c.name}</strong></td>
            <td>
                <div>${c.email || '<span style="color: var(--text-muted);">No email</span>'}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${c.phone || ''}</div>
            </td>
            <td style="text-align: right;">
                <button class="btn btn-sm btn-secondary btn-danger" onclick="deleteClient('${c.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Delete customer
async function deleteClient(id) {
    if (!confirm("Are you sure you want to delete this client?")) return;
    
    if (isCloudActive) {
        const { error } = await supabaseClient.from("clients").delete().eq("id", id);
        if (error) {
            alert("Error: " + error.message);
            return;
        }
        clients = clients.filter(c => c.id !== id);
    } else {
        clients = clients.filter(c => c.id !== id);
        saveLocalData();
    }
    renderClientsTable();
    populateClientDropdown();
}

// Add blank item line in Creator Form
function addNewLineItem(description = "", quantity = 1, unit_price = 0) {
    const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    currentInvoiceItems.push({ id, description, quantity, unit_price });
    renderEditorItems();
    updateInvoicePreview();
}

// Render dynamic items editor table
function renderEditorItems() {
    const tbody = document.getElementById("invoice-items-body");
    tbody.innerHTML = "";
    
    currentInvoiceItems.forEach((item, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <input type="text" value="${item.description}" placeholder="Description of item/service..." 
                    oninput="updateItemField('${item.id}', 'description', this.value)">
            </td>
            <td>
                <input type="number" value="${item.quantity}" min="0.1" step="any" style="text-align: center;"
                    oninput="updateItemField('${item.id}', 'quantity', parseFloat(this.value) || 0)">
            </td>
            <td>
                <input type="number" value="${item.unit_price}" min="0" step="any"
                    oninput="updateItemField('${item.id}', 'unit_price', parseFloat(this.value) || 0)">
            </td>
            <td data-row-total="${item.id}" style="text-align: right; font-weight: 600; padding-right: 10px;">
                ${currentProfile.currency_symbol}${(item.quantity * item.unit_price).toFixed(2)}
            </td>
            <td>
                <button class="btn-remove-item" onclick="removeItemRow('${item.id}')" title="Delete Row">
                    &times;
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateItemField(itemId, field, value) {
    const item = currentInvoiceItems.find(i => i.id === itemId);
    if (item) {
        item[field] = value;
        const rowTotal = document.querySelector(`[data-row-total="${itemId}"]`);
        if (rowTotal) {
            rowTotal.innerText = `${currentProfile.currency_symbol}${(item.quantity * item.unit_price).toFixed(2)}`;
        }
        updateInvoicePreview();
    }
}

function removeItemRow(itemId) {
    currentInvoiceItems = currentInvoiceItems.filter(i => i.id !== itemId);
    renderEditorItems();
    updateInvoicePreview();
}

// Dynamic invoice math calculator & live visual rendering
function updateInvoicePreview() {
    let subtotal = 0;
    
    // Render dynamic rows to preview layout
    const previewBody = document.getElementById("preview-items-body");
    previewBody.innerHTML = "";
    
    currentInvoiceItems.forEach(item => {
        const rowTotal = item.quantity * item.unit_price;
        subtotal += rowTotal;
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${item.description || "Description"}</strong></td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">${currentProfile.currency_symbol}${item.unit_price.toFixed(2)}</td>
            <td style="text-align: right; font-weight: 600;">${currentProfile.currency_symbol}${rowTotal.toFixed(2)}</td>
        `;
        previewBody.appendChild(row);
    });
    
    // Tax & Discounts calculations
    const taxRate = parseFloat(document.getElementById("inv-tax-rate").value) || 0;
    const discount = parseFloat(document.getElementById("inv-discount").value) || 0;
    
    const taxAmount = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxAmount - discount;
    
    // Write calculations to Preview
    document.getElementById("preview-subtotal").innerText = `${currentProfile.currency_symbol}${subtotal.toFixed(2)}`;
    document.getElementById("preview-tax-label").innerText = `Tax (${taxRate}%)`;
    document.getElementById("preview-tax-amount").innerText = `${currentProfile.currency_symbol}${taxAmount.toFixed(2)}`;
    document.getElementById("preview-discount-val").innerText = `${currentProfile.currency_symbol}${discount.toFixed(2)}`;
    document.getElementById("preview-grand-total").innerText = `${currentProfile.currency_symbol}${grandTotal.toFixed(2)}`;
    
    // Load store physical configuration settings to preview
    document.getElementById("preview-store-name").innerText = currentProfile.company_name;
    document.getElementById("preview-store-details").innerHTML = `
        ${currentProfile.address ? currentProfile.address + '<br>' : ''}
        ${currentProfile.phone ? 'Phone: ' + currentProfile.phone + ' | ' : ''}
        ${currentProfile.email ? 'Email: ' + currentProfile.email : ''}
    `;
}

// Reset creator form state
function resetCreatorForm() {
    activeEditingInvoiceId = null;
    currentInvoiceItems = [];
    
    // Generate next invoice number
    const maxNum = invoices.reduce((max, inv) => {
        const matches = inv.invoice_number.match(/\d+/);
        if (matches) {
            const num = parseInt(matches[0]);
            return num > max ? num : max;
        }
        return max;
    }, 0);
    
    document.getElementById("inv-number").value = `INV-${String(maxNum + 1).padStart(4, '0')}`;
    document.getElementById("inv-type").value = "invoice";
    document.getElementById("inv-status").value = "Unpaid";
    document.getElementById("inv-client-select").value = "";
    document.getElementById("inv-discount").value = "0";
    document.getElementById("inv-notes").value = "";
    
    // Clear signature and state
    clearSignature();
    if (document.getElementById("show-signature-checkbox")) {
        document.getElementById("show-signature-checkbox").checked = true;
        document.getElementById("preview-signature-container").style.display = "flex";
    }
    
    // Load default tax
    document.getElementById("inv-tax-rate").value = currentProfile.default_tax_rate;
    
    // Clear preview labels
    document.getElementById("preview-inv-number").innerText = document.getElementById("inv-number").value;
    document.getElementById("preview-doc-type-text").innerText = "INVOICE";
    document.getElementById("creator-title").innerText = "Invoice Creator";
    document.getElementById("preview-client-name").innerText = "Walk-in Customer";
    document.getElementById("preview-client-email").innerText = "";
    document.getElementById("preview-client-phone").innerText = "";
    document.getElementById("preview-client-address").innerText = "";
    
    addNewLineItem("Product Sale / Professional Service", 1, 1000);
}

// Save invoice to database (with checks on account tier limits)
async function saveInvoiceToDatabase() {
    // Check trial limits
    if (!currentProfile.is_pro && invoices.length >= 5 && !activeEditingInvoiceId) {
        alert("Trial limit reached: Free accounts can create up to 5 invoices. Upgrade to Pro to continue.");
        switchTab("billing-tab");
        return;
    }
    
    const invoiceNumber = document.getElementById("inv-number").value.trim();
    const clientId = document.getElementById("inv-client-select").value;
    const type = document.getElementById("inv-type").value;
    const status = document.getElementById("inv-status").value;
    const issueDate = document.getElementById("inv-date").value;
    const dueDate = document.getElementById("inv-duedate").value;
    const taxRate = parseFloat(document.getElementById("inv-tax-rate").value) || 0;
    const discount = parseFloat(document.getElementById("inv-discount").value) || 0;
    const notes = document.getElementById("inv-notes").value;
    
    if (!invoiceNumber) {
        alert("Please enter an invoice or estimate number.");
        return;
    }
    
    if (currentInvoiceItems.length === 0) {
        alert("Please add at least one line item to the invoice.");
        return;
    }
    
    // Subtotal math
    let subtotal = 0;
    currentInvoiceItems.forEach(i => subtotal += (i.quantity * i.unit_price));
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - discount;
    
    // Check signature data URL
    const hasSignature = document.getElementById("show-signature-checkbox").checked;
    const signatureCanvas = document.getElementById("signature-canvas");
    const signatureUrl = (hasSignature && !isCanvasBlank(signatureCanvas)) ? signatureCanvas.toDataURL() : null;

    const invoiceData = {
        invoice_number: invoiceNumber,
        client_id: clientId || null,
        type,
        status,
        issue_date: issueDate,
        due_date: dueDate || null,
        tax_rate: taxRate,
        discount,
        notes,
        subtotal,
        tax_amount: taxAmount,
        total,
        signature_data_url: signatureUrl
    };
    
    if (isCloudActive) {
        invoiceData.user_id = currentUser.id;
        
        let invResultId = null;
        if (activeEditingInvoiceId) {
            // Update
            const { error } = await supabaseClient.from("invoices").update(invoiceData).eq("id", activeEditingInvoiceId);
            if (error) {
                alert("Error saving: " + error.message);
                return;
            }
            invResultId = activeEditingInvoiceId;
            // Delete old items to recreate
            await supabaseClient.from("invoice_items").delete().eq("invoice_id", activeEditingInvoiceId);
        } else {
            // Insert
            const { data, error } = await supabaseClient.from("invoices").insert(invoiceData).select();
            if (error) {
                alert("Error saving: " + error.message);
                return;
            }
            invResultId = data[0].id;
        }
        
        // Write Invoice Items to Supabase cloud
        const dbItems = currentInvoiceItems.map(item => ({
            invoice_id: invResultId,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price
        }));
        
        const { error: itemsErr } = await supabaseClient.from("invoice_items").insert(dbItems);
        if (itemsErr) {
            alert("Error writing invoice items: " + itemsErr.message);
            return;
        }
        
        await fetchCloudData();
    } else {
        // LocalStorage logic
        if (activeEditingInvoiceId) {
            // Update
            const index = invoices.findIndex(i => i.id === activeEditingInvoiceId);
            if (index !== -1) {
                invoices[index] = { ...invoiceData, id: activeEditingInvoiceId, items: currentInvoiceItems };
            }
        } else {
            // Insert
            const newId = `inv-${Date.now()}`;
            invoices.push({ ...invoiceData, id: newId, items: currentInvoiceItems });
        }
        saveLocalData();
    }
    
    alert("Invoice saved successfully to records!");
    activeEditingInvoiceId = null;
    switchTab("invoices-tab");
}

// Render invoice history table list
function renderInvoicesTable() {
    const tbody = document.querySelector("#all-invoices-table tbody");
    const query = document.getElementById("invoice-search-input").value.toLowerCase();
    const filterStatus = document.getElementById("invoice-filter-status").value;
    
    tbody.innerHTML = "";
    
    let filtered = invoices.filter(inv => {
        // Get client name
        const client = clients.find(c => c.id == inv.client_id);
        const clientName = client ? client.name.toLowerCase() : "walk-in customer";
        const matchesQuery = inv.invoice_number.toLowerCase().includes(query) || clientName.includes(query);
        const matchesStatus = filterStatus ? inv.status === filterStatus : true;
        return matchesQuery && matchesStatus;
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No invoices found.</td></tr>';
        return;
    }
    
    filtered.forEach(inv => {
        const client = clients.find(c => c.id == inv.client_id);
        const clientName = client ? client.name : '<span style="color: var(--text-muted);">Walk-in</span>';
        
        let statusClass = "badge-draft";
        if (inv.status === "Paid") statusClass = "badge-paid";
        else if (inv.status === "Unpaid") statusClass = "badge-unpaid";
        else if (inv.status === "Overdue") statusClass = "badge-overdue";
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${inv.invoice_number}</strong></td>
            <td>${clientName}</td>
            <td>${inv.issue_date}</td>
            <td><span class="badge ${statusClass}">${inv.status}</span></td>
            <td><span style="text-transform: capitalize;">${inv.type}</span></td>
            <td style="font-weight: 700;">${currentProfile.currency_symbol}${parseFloat(inv.total).toFixed(2)}</td>
            <td style="text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                <button class="btn btn-sm btn-secondary" onclick="editInvoice('${inv.id}')">View/Edit</button>
                <button class="btn btn-sm btn-secondary btn-danger" onclick="deleteInvoice('${inv.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Edit invoice row
async function editInvoice(id) {
    const inv = invoices.find(i => i.id == id);
    if (!inv) return;
    
    activeEditingInvoiceId = inv.id;
    
    document.getElementById("inv-number").value = inv.invoice_number;
    document.getElementById("inv-type").value = inv.type;
    document.getElementById("inv-status").value = inv.status;
    document.getElementById("inv-date").value = inv.issue_date;
    document.getElementById("inv-duedate").value = inv.due_date || "";
    document.getElementById("inv-client-select").value = inv.client_id || "";
    document.getElementById("inv-tax-rate").value = inv.tax_rate;
    document.getElementById("inv-discount").value = inv.discount;
    document.getElementById("inv-notes").value = inv.notes || "";

    // Load signature
    clearSignature();
    if (inv.signature_data_url) {
        document.getElementById("show-signature-checkbox").checked = true;
        document.getElementById("preview-signature-container").style.display = "flex";
        
        // Draw saved signature dataUrl back onto canvas
        const img = new Image();
        img.onload = () => {
            sigCtx.drawImage(img, 0, 0);
            updateSignaturePreview();
        };
        img.src = inv.signature_data_url;
    } else {
        document.getElementById("show-signature-checkbox").checked = false;
        document.getElementById("preview-signature-container").style.display = "none";
    }
    
    // Load Items list
    if (isCloudActive) {
        const { data: dbItems } = await supabaseClient.from("invoice_items").select("*").eq("invoice_id", id);
        currentInvoiceItems = (dbItems || []).map(item => ({
            id: item.id,
            description: item.description,
            quantity: parseFloat(item.quantity),
            unit_price: parseFloat(item.unit_price)
        }));
    } else {
        currentInvoiceItems = inv.items || [];
    }
    
    // Change UI state
    document.getElementById("creator-title").innerText = inv.type === "invoice" ? "Edit Invoice" : "Edit Estimate";
    
    switchTab("creator-tab");
    renderEditorItems();
    updateInvoicePreview();
    
    // Manually trigger client selector display preview
    document.getElementById("inv-client-select").dispatchEvent(new Event('change'));
}

// Delete invoice row
async function deleteInvoice(id) {
    if (!confirm("Do you want to permanently delete this invoice record?")) return;
    
    if (isCloudActive) {
        const { error } = await supabaseClient.from("invoices").delete().eq("id", id);
        if (error) {
            alert("Error: " + error.message);
            return;
        }
        invoices = invoices.filter(i => i.id !== id);
    } else {
        invoices = invoices.filter(i => i.id !== id);
        saveLocalData();
    }
    
    renderInvoicesTable();
}

// Load stats metrics on Dashboard tab
function renderDashboard() {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    
    invoices.forEach(inv => {
        const total = parseFloat(inv.total) || 0;
        if (inv.status === "Paid") {
            totalPaid += total;
            totalRevenue += total;
        } else if (inv.status === "Unpaid" || inv.status === "Overdue") {
            totalUnpaid += total;
            totalRevenue += total;
        }
    });
    
    document.getElementById("dash-total-revenue").innerText = `${currentProfile.currency_symbol}${totalRevenue.toFixed(2)}`;
    document.getElementById("dash-total-paid").innerText = `${currentProfile.currency_symbol}${totalPaid.toFixed(2)}`;
    document.getElementById("dash-total-unpaid").innerText = `${currentProfile.currency_symbol}${totalUnpaid.toFixed(2)}`;
    document.getElementById("dash-total-count").innerText = invoices.length;
    
    // Render recent invoices (Limit to first 5)
    const tbody = document.querySelector("#recent-invoices-table tbody");
    tbody.innerHTML = "";
    
    const limit = invoices.slice(0, 5);
    if (limit.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No recent invoices. Click create below.</td></tr>';
        return;
    }
    
    limit.forEach(inv => {
        const client = clients.find(c => c.id == inv.client_id);
        const clientName = client ? client.name : '<span style="color: var(--text-muted);">Walk-in</span>';
        
        let statusClass = "badge-draft";
        if (inv.status === "Paid") statusClass = "badge-paid";
        else if (inv.status === "Unpaid") statusClass = "badge-unpaid";
        else if (inv.status === "Overdue") statusClass = "badge-overdue";
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${inv.invoice_number}</strong></td>
            <td>${clientName}</td>
            <td>${inv.issue_date}</td>
            <td><span class="badge ${statusClass}">${inv.status}</span></td>
            <td><span style="text-transform: capitalize;">${inv.type}</span></td>
            <td style="font-weight: 700;">${currentProfile.currency_symbol}${parseFloat(inv.total).toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Update billing view stats
function updateBillingTabUI() {
    document.getElementById("billing-invoice-count").innerText = invoices.length;
}

function renderAdminDashboard() {
    if (!isAdminUser()) return;

    loadPaymentSettings();

    const records = getPaymentRecords();
    const totalRevenue = records.reduce((sum, record) => sum + (Number(record.price) || 0), 0);
    const monthlyRevenue = records
        .filter((record) => record.created_at && record.created_at.slice(0, 7) === new Date().toISOString().slice(0, 7))
        .reduce((sum, record) => sum + (Number(record.price) || 0), 0);

    document.getElementById("admin-total-revenue").innerText = `PHP ${totalRevenue.toFixed(2)}`;
    document.getElementById("admin-monthly-revenue").innerText = `PHP ${monthlyRevenue.toFixed(2)}`;
    document.getElementById("admin-payment-count").innerText = records.length;
    document.getElementById("admin-customer-count").innerText = new Set(records.map((record) => record.customer_email)).size;

    document.getElementById("admin-paymongo-public").value = paymentSettings.paymongoPublicKey || "";
    document.getElementById("admin-paymongo-secret").value = paymentSettings.paymongoSecretKey || "";
    document.getElementById("admin-stripe-public").value = paymentSettings.stripePublishableKey || "";
    document.getElementById("admin-stripe-secret").value = paymentSettings.stripeSecretKey || "";
    document.getElementById("admin-card-checkout-url").value = paymentSettings.cardCheckoutUrl || "";
    document.getElementById("admin-gcash-number").value = paymentSettings.gcashNumber || "";
    document.getElementById("admin-payout-account").value = paymentSettings.payoutAccount || "";

    const tbody = document.querySelector("#admin-payments-table tbody");
    tbody.innerHTML = "";
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No payments recorded yet.</td></tr>';
        return;
    }

    records.slice().reverse().forEach((record) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${new Date(record.created_at).toLocaleString()}</td>
            <td>${record.customer_email}</td>
            <td>${record.plan}</td>
            <td>${record.method}</td>
            <td style="font-weight: 700;">PHP ${(Number(record.price) || 0).toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

// ==================== MOCK PAYMENT GATEWAY PROCESSOR ====================
async function processMockPaymentUpgrade() {
    const gcashActive = document.getElementById("pay-gcash-opt").classList.contains("active");
    const accountNum = gcashActive 
        ? document.getElementById("payment-phone").value.trim()
        : document.getElementById("card-num").value.trim();
        
    if (!accountNum) {
        alert("Please enter payment account details.");
        return;
    }
    
    // Show spinner inside payment modal to simulate gateway handshake
    const overlay = document.getElementById("payment-processing-overlay");
    overlay.style.display = "flex";
    
    // Wait for 2.5 seconds mock processing time
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Update DB status to PRO
    currentProfile.is_pro = true;
    const paymentModal = document.getElementById("payment-modal");
    recordPayment(
        paymentModal.dataset.plan || "Pro Unlimited Plan",
        paymentModal.dataset.price || 249,
        gcashActive ? "GCash" : "Card"
    );
    
    if (isCloudActive) {
        await supabaseClient.from("profiles").update({ is_pro: true }).eq("id", currentUser.id);
    } else {
        saveLocalStorageProfile();
    }
    
    // Visual success alerts
    overlay.style.display = "none";
    document.getElementById("payment-modal").style.display = "none";
    alert("Success! Thank you for your purchase. Your account is now upgraded to Pro Unlimited.");
    
    // Refresh GUI details
    updateUserTierUI();
    switchTab("dashboard-tab");
}

// ==================== SIGNATURE & THEME ACCESSORIES ====================
let sigCanvas, sigCtx, sigDrawing = false;

function initSignaturePad() {
    sigCanvas = document.getElementById("signature-canvas");
    if (!sigCanvas) return;
    sigCtx = sigCanvas.getContext("2d");
    
    // Clear button event
    document.getElementById("clear-signature-btn").addEventListener("click", clearSignature);
    
    // Display checkbox event
    document.getElementById("show-signature-checkbox").addEventListener("change", (e) => {
        const show = e.target.checked;
        document.getElementById("preview-signature-container").style.display = show ? "flex" : "none";
    });

    // Mouse drawing events
    sigCanvas.addEventListener("mousedown", startDrawing);
    sigCanvas.addEventListener("mousemove", draw);
    sigCanvas.addEventListener("mouseup", stopDrawing);
    sigCanvas.addEventListener("mouseout", stopDrawing);
    
    // Touch drawing events
    sigCanvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousedown", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        sigCanvas.dispatchEvent(mouseEvent);
    }, { passive: false });
    
    sigCanvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousemove", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        sigCanvas.dispatchEvent(mouseEvent);
    }, { passive: false });
    
    sigCanvas.addEventListener("touchend", (e) => {
        const mouseEvent = new MouseEvent("mouseup", {});
        sigCanvas.dispatchEvent(mouseEvent);
    });

    // Invoice custom brand colors selector event listeners
    document.querySelectorAll(".invoice-color-preset").forEach(btn => {
        btn.addEventListener("click", () => {
            currentProfile.invoice_theme_color = btn.dataset.color;
            applyInvoiceThemeColor();
        });
    });
}

function resizeCanvas() {
    if (!sigCanvas) return;
    const rect = sigCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    // Save current drawing to restore it after resize resets canvas
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = sigCanvas.width;
    tempCanvas.height = sigCanvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(sigCanvas, 0, 0);
    
    sigCanvas.width = rect.width;
    sigCanvas.height = rect.height;
    
    // Restore drawing styles
    sigCtx.lineWidth = 3;
    sigCtx.lineCap = "round";
    sigCtx.strokeStyle = "#1e293b";
    
    // Restore drawing image
    sigCtx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
}

function startDrawing(e) {
    sigDrawing = true;
    const pos = getMousePos(sigCanvas, e);
    sigCtx.beginPath();
    sigCtx.moveTo(pos.x, pos.y);
}

function draw(e) {
    if (!sigDrawing) return;
    const pos = getMousePos(sigCanvas, e);
    sigCtx.lineTo(pos.x, pos.y);
    sigCtx.stroke();
}

function stopDrawing() {
    if (sigDrawing) {
        sigDrawing = false;
        sigCtx.closePath();
        updateSignaturePreview();
    }
}

function getMousePos(canvasDom, e) {
    const rect = canvasDom.getBoundingClientRect();
    const scaleX = canvasDom.width / rect.width;
    const scaleY = canvasDom.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function clearSignature() {
    if (!sigCtx) return;
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    const img = document.getElementById("preview-signature-img");
    img.src = "";
    img.style.display = "none";
}

function updateSignaturePreview() {
    if (!sigCanvas) return;
    const dataUrl = sigCanvas.toDataURL();
    const blank = isCanvasBlank(sigCanvas);
    const img = document.getElementById("preview-signature-img");
    if (!blank) {
        img.src = dataUrl;
        img.style.display = "block";
    } else {
        img.src = "";
        img.style.display = "none";
    }
}

function isCanvasBlank(canvas) {
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
}

function applyInvoiceThemeColor() {
    const color = currentProfile.invoice_theme_color || "#6366f1";
    const printable = document.getElementById("invoice-printable-area");
    if (printable) {
        printable.style.setProperty('--invoice-accent', color);
    }
    
    // Apply selected class to settings presets
    document.querySelectorAll(".invoice-color-preset").forEach(el => {
        el.classList.remove("active");
        if (el.dataset.color === color) {
            el.classList.add("active");
        }
    });
}

Object.assign(window, {
    switchTab,
    resetCreatorForm,
    deleteClient,
    addNewLineItem,
    updateItemField,
    removeItemRow,
    saveInvoiceToDatabase,
    editInvoice,
    deleteInvoice,
    setupAuthenticatedUser,
    renderAdminDashboard,
    savePaymentSettings
});
