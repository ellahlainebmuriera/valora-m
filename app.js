/**
 * Valora EM - Main Application Controller
 * Handles UI routing, dynamic calculations, Supabase Cloud synchronization,
 * LocalStorage data fallbacks, and the mock Payment / White-label systems.
 */

// ==================== DATABASE CONFIGURATION ====================
// TODO: Replace these with your own Supabase API credentials when cloud SaaS setup is ready.
const SUPABASE_URL = "https://bdpcrsonguvxxuxnhpyy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4XOjRb8SC2Cw3vlKx5xukw_9OWGBA-_";
const DEFAULT_USER_EMAIL = "testaccount@valoraem.com";
const DEFAULT_TEST_PASSWORD = "ValoraEM181920!!@";
const DEFAULT_TEST_COMPANY = "Valora EM Test Store";
const ADMIN_EMAIL = "ellahlaine.b.muriera@gmail.com";
const ADMIN_PASSWORD = "ValoraEMAdmin181920!!@";

let supabaseClient = null;
let isCloudActive = false;
let isPasswordRecoverySession = false;

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
window.valoraemIsCloudActive = isCloudActive;
window.valoraemSupabaseClient = supabaseClient;

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
    invoice_theme_color: "#6366f1",
    invoice_text_color: "#1e293b",
    preferred_language: "en",
    custom_language_name: "",
    print_layout: "pdf",
    app_appearance: "dark",
    saved_signature_data_url: "",
    save_signature_permission: false
};

let clients = [];
let invoices = [];
let currentInvoiceItems = []; // List of { id, description, quantity, unit_price }
let currentDocumentPhotos = [];
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
    appName: "Valora EM",
    theme: "indigo"
};

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
    seedTestAccount();
    loadWhiteLabelSettings();
    initAppEventListeners();
    initSignaturePad();
    initPasswordRecoveryFlow();
    checkAuthSession();
    
    // Set default dates in invoice form
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("inv-date").value = today;
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById("inv-duedate").value = nextMonth.toISOString().split('T')[0];
});

function getLocalAccount(email) {
    const saved = localStorage.getItem(`valoraem_account_${email}`);
    return saved ? JSON.parse(saved) : null;
}

function saveLocalAccount(account) {
    localStorage.setItem(`valoraem_account_${account.email}`, JSON.stringify(account));
}

function createLocalSession(email) {
    const mockUser = {
        email,
        id: `mock-${email.replace(/[^a-zA-Z0-9]/g, '')}`,
        role: email === ADMIN_EMAIL ? "admin" : "customer"
    };
    localStorage.setItem("valoraem_mock_user", JSON.stringify(mockUser));
    return mockUser;
}

function isAdminUser() {
    return currentUser && currentUser.email === ADMIN_EMAIL;
}

function hasBusinessUnlimited() {
    return isAdminUser() || currentProfile.plan === "Business Unlimited";
}

function getCurrentPlanName() {
    if (isAdminUser()) return "Business Unlimited";
    if (currentProfile.plan) return currentProfile.plan;
    return currentProfile.is_pro ? "Pro Unlimited Plan" : "Standard Free Plan";
}

function hasLogoUploadAccess() {
    const planName = getCurrentPlanName();
    return isAdminUser() || planName === "Pro Unlimited Plan" || planName === "Business Unlimited";
}

function hasCloudConnection() {
    return isCloudActive && (!window.navigator || window.navigator.onLine !== false);
}

function setResetCodeStatus(message, isError = false) {
    const status = document.getElementById("reset-code-status");
    if (!status) return;
    status.innerText = message;
    status.style.display = "block";
    status.style.color = isError ? "var(--danger)" : "var(--accent)";
}

function getResetRedirectUrl() {
    return `${window.location.origin}${window.location.pathname}`;
}

function showPasswordResetForm() {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const resetForm = document.getElementById("reset-password-form");
    const toggleLogin = document.getElementById("auth-toggle-login");
    const toggleRegister = document.getElementById("auth-toggle-register");
    const toggleReset = document.getElementById("auth-toggle-reset");
    const toggleResetBack = document.getElementById("auth-toggle-reset-back");

    if (loginForm) loginForm.style.display = "none";
    if (registerForm) registerForm.style.display = "none";
    if (resetForm) resetForm.style.display = "block";
    if (toggleLogin) toggleLogin.style.display = "block";
    if (toggleRegister) toggleRegister.style.display = "none";
    if (toggleReset) toggleReset.style.display = "none";
    if (toggleResetBack) toggleResetBack.style.display = "block";

    configurePasswordResetForm();
}

function configurePasswordResetForm() {
    const codeGroup = document.getElementById("reset-code-group");
    const codeInput = document.getElementById("reset-code");
    const codeLabel = document.getElementById("reset-code-label");
    const codeNote = document.getElementById("reset-code-note");
    const sendButton = document.getElementById("send-reset-code-btn");
    const help = document.getElementById("reset-link-help");
    const submitButton = document.getElementById("reset-submit-btn");
    const emailInput = document.getElementById("reset-email");

    if (!codeGroup || !codeInput || !sendButton || !help || !submitButton) return;

    if (isCloudActive) {
        codeGroup.style.display = "block";
        if (codeLabel) codeLabel.innerText = "Password Reset Email";
        if (codeNote) codeNote.innerText = "For live Supabase accounts, use the password reset link from the latest email.";
        codeInput.style.display = "none";
        codeInput.required = false;
        codeInput.disabled = true;
        sendButton.innerText = "Send Reset Link";
        help.style.display = "block";
        help.innerText = isPasswordRecoverySession
            ? "Reset link verified. Type your new password, then click Save New Password."
            : "Click Send Reset Link, open the latest email from Supabase/Valora EM, then use the reset link before saving a new password.";
        submitButton.innerText = isPasswordRecoverySession ? "Save New Password" : "Save New Password After Opening Link";
        return;
    }

    codeGroup.style.display = "block";
    if (codeLabel) codeLabel.innerText = "Email Verification Code";
    if (codeNote) codeNote.innerText = "Live email codes require Supabase Auth or another email/OTP provider. In local preview, use code 123456.";
    codeInput.style.display = "block";
    codeInput.required = true;
    codeInput.disabled = false;
    sendButton.innerText = "Send Reset Code";
    help.style.display = "none";
    submitButton.innerText = "Reset Password";
    if (emailInput && !emailInput.value) emailInput.placeholder = "name@store.com";
}

async function initPasswordRecoveryFlow() {
    if (!isCloudActive || !supabaseClient?.auth) {
        configurePasswordResetForm();
        return;
    }

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const authType = hashParams.get("type") || queryParams.get("type");

    if (authType === "recovery") {
        isPasswordRecoverySession = true;
        showAuthScreen();
        showPasswordResetForm();
        setResetCodeStatus("Reset link verified. Enter your new password below.");
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event !== "PASSWORD_RECOVERY") return;
        isPasswordRecoverySession = true;
        showAuthScreen();
        showPasswordResetForm();
        if (session?.user?.email) {
            const emailInput = document.getElementById("reset-email");
            if (emailInput) emailInput.value = session.user.email;
        }
        setResetCodeStatus("Reset link verified. Enter your new password below.");
    });

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (isPasswordRecoverySession && session?.user?.email) {
            const emailInput = document.getElementById("reset-email");
            if (emailInput) emailInput.value = session.user.email;
        }
    } catch (error) {
        console.warn("Unable to read password recovery session.", error);
    }
}

async function sendPasswordResetCode() {
    const email = document.getElementById("reset-email")?.value.trim();
    const resetButton = document.getElementById("send-reset-code-btn");
    if (!email) {
        setResetCodeStatus("Please enter your email first.", true);
        return;
    }

    if (isCloudActive && supabaseClient?.auth?.resetPasswordForEmail) {
        if (resetButton) {
            resetButton.disabled = true;
            resetButton.innerText = "Sending...";
        }
        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: getResetRedirectUrl()
            });
            if (error) {
                setResetCodeStatus(`Could not send reset email: ${error.message}`, true);
                return;
            }
            setResetCodeStatus("Password reset link sent. Open the latest email, click the reset link, then enter your new password here.");
        } finally {
            if (resetButton) {
                resetButton.disabled = false;
                resetButton.innerText = "Send Reset Link";
            }
        }
        return;
    }

    localStorage.setItem(`valoraem_reset_code_${email}`, "123456");
    const codeInput = document.getElementById("reset-code");
    if (codeInput) codeInput.value = "123456";
    setResetCodeStatus("Reset code sent for local preview. Use code 123456.");
}

const receiptTranslations = {
    en: {
        date: "Date",
        dueDate: "Due Date",
        billedTo: "Billed To",
        description: "Description",
        qty: "Qty",
        unitPrice: "Unit Price",
        total: "Total",
        subtotal: "Subtotal",
        tax: "Tax",
        discount: "Discount",
        shipping: "Shipping",
        grandTotal: "Grand Total",
        notes: "Payment Notes:",
        signature: "Authorized Signature",
        clientSignature: "Client Signature",
        walkIn: "Walk-in Customer"
    },
    fil: {
        date: "Petsa",
        dueDate: "Takdang Petsa",
        billedTo: "Para Kay",
        description: "Deskripsyon",
        qty: "Dami",
        unitPrice: "Presyo",
        total: "Kabuuan",
        subtotal: "Subtotal",
        tax: "Buwis",
        discount: "Diskwento",
        shipping: "Shipping",
        grandTotal: "Kabuuang Bayad",
        notes: "Payment Notes:",
        signature: "Pirma ng Awtorisado",
        clientSignature: "Pirma ng Kliyente",
        walkIn: "Walk-in Customer"
    },
    es: { date: "Fecha", dueDate: "Fecha de Vencimiento", billedTo: "Facturado A", description: "Descripcion", qty: "Cant.", unitPrice: "Precio Unitario", total: "Total", subtotal: "Subtotal", tax: "Impuesto", discount: "Descuento", shipping: "Envio", grandTotal: "Total General", notes: "Notas de Pago:", signature: "Firma Autorizada", clientSignature: "Firma del Cliente", walkIn: "Cliente" },
    fr: { date: "Date", dueDate: "Date D'echeance", billedTo: "Facture A", description: "Description", qty: "Qte", unitPrice: "Prix Unitaire", total: "Total", subtotal: "Sous-total", tax: "Taxe", discount: "Remise", shipping: "Livraison", grandTotal: "Total General", notes: "Notes de Paiement:", signature: "Signature Autorisee", clientSignature: "Signature Client", walkIn: "Client" },
    de: { date: "Datum", dueDate: "Falligkeitsdatum", billedTo: "Rechnung An", description: "Beschreibung", qty: "Menge", unitPrice: "Stuckpreis", total: "Gesamt", subtotal: "Zwischensumme", tax: "Steuer", discount: "Rabatt", shipping: "Versand", grandTotal: "Gesamtsumme", notes: "Zahlungshinweise:", signature: "Autorisierte Unterschrift", clientSignature: "Kundenunterschrift", walkIn: "Kunde" },
    it: { date: "Data", dueDate: "Scadenza", billedTo: "Fatturato A", description: "Descrizione", qty: "Qta", unitPrice: "Prezzo Unitario", total: "Totale", subtotal: "Subtotale", tax: "Imposta", discount: "Sconto", shipping: "Spedizione", grandTotal: "Totale Generale", notes: "Note di Pagamento:", signature: "Firma Autorizzata", clientSignature: "Firma Cliente", walkIn: "Cliente" },
    pt: { date: "Data", dueDate: "Vencimento", billedTo: "Faturado Para", description: "Descricao", qty: "Qtd", unitPrice: "Preco Unitario", total: "Total", subtotal: "Subtotal", tax: "Imposto", discount: "Desconto", shipping: "Envio", grandTotal: "Total Geral", notes: "Notas de Pagamento:", signature: "Assinatura Autorizada", clientSignature: "Assinatura do Cliente", walkIn: "Cliente" },
    id: { date: "Tanggal", dueDate: "Jatuh Tempo", billedTo: "Ditagihkan Kepada", description: "Deskripsi", qty: "Jumlah", unitPrice: "Harga Satuan", total: "Total", subtotal: "Subtotal", tax: "Pajak", discount: "Diskon", shipping: "Pengiriman", grandTotal: "Total Akhir", notes: "Catatan Pembayaran:", signature: "Tanda Tangan Resmi", clientSignature: "Tanda Tangan Klien", walkIn: "Pelanggan" },
    ms: { date: "Tarikh", dueDate: "Tarikh Akhir", billedTo: "Dibilkan Kepada", description: "Penerangan", qty: "Kuantiti", unitPrice: "Harga Unit", total: "Jumlah", subtotal: "Subtotal", tax: "Cukai", discount: "Diskaun", shipping: "Penghantaran", grandTotal: "Jumlah Besar", notes: "Nota Pembayaran:", signature: "Tandatangan Dibenarkan", clientSignature: "Tandatangan Pelanggan", walkIn: "Pelanggan" },
    vi: { date: "Ngay", dueDate: "Ngay Den Han", billedTo: "Lap Hoa Don Cho", description: "Mo Ta", qty: "SL", unitPrice: "Don Gia", total: "Tong", subtotal: "Tam Tinh", tax: "Thue", discount: "Giam Gia", shipping: "Van Chuyen", grandTotal: "Tong Cong", notes: "Ghi Chu Thanh Toan:", signature: "Chu Ky Uy Quyen", clientSignature: "Chu Ky Khach Hang", walkIn: "Khach Hang" },
    nl: { date: "Datum", dueDate: "Vervaldatum", billedTo: "Gefactureerd Aan", description: "Omschrijving", qty: "Aantal", unitPrice: "Eenheidsprijs", total: "Totaal", subtotal: "Subtotaal", tax: "Belasting", discount: "Korting", shipping: "Verzending", grandTotal: "Eindtotaal", notes: "Betalingsnotities:", signature: "Geautoriseerde Handtekening", clientSignature: "Klanthandtekening", walkIn: "Klant" },
    sv: { date: "Datum", dueDate: "Forfallodatum", billedTo: "Faktureras Till", description: "Beskrivning", qty: "Antal", unitPrice: "Enhetspris", total: "Totalt", subtotal: "Delsumma", tax: "Skatt", discount: "Rabatt", shipping: "Frakt", grandTotal: "Totalsumma", notes: "Betalningsnoteringar:", signature: "Auktoriserad Signatur", clientSignature: "Kundsignatur", walkIn: "Kund" },
    tr: { date: "Tarih", dueDate: "Vade Tarihi", billedTo: "Fatura Edilen", description: "Aciklama", qty: "Adet", unitPrice: "Birim Fiyat", total: "Toplam", subtotal: "Ara Toplam", tax: "Vergi", discount: "Indirim", shipping: "Kargo", grandTotal: "Genel Toplam", notes: "Odeme Notlari:", signature: "Yetkili Imza", clientSignature: "Musteri Imzasi", walkIn: "Musteri" },
    ru: { date: "Data", dueDate: "Srok Oplaty", billedTo: "Poluchatel", description: "Opisanie", qty: "Kol-vo", unitPrice: "Cena", total: "Itogo", subtotal: "Promezhutochno", tax: "Nalog", discount: "Skidka", shipping: "Dostavka", grandTotal: "Obshchaya Summa", notes: "Primechaniya k Oplate:", signature: "Upolnomochennaya Podpis", clientSignature: "Podpis Klienta", walkIn: "Klient" },
    ja: { date: "日付", dueDate: "支払期限", billedTo: "請求先", description: "内容", qty: "数量", unitPrice: "単価", total: "合計", subtotal: "小計", tax: "税", discount: "割引", shipping: "送料", grandTotal: "総合計", notes: "支払いメモ:", signature: "承認署名", clientSignature: "顧客署名", walkIn: "顧客" },
    ko: { date: "날짜", dueDate: "마감일", billedTo: "청구 대상", description: "설명", qty: "수량", unitPrice: "단가", total: "합계", subtotal: "소계", tax: "세금", discount: "할인", shipping: "배송비", grandTotal: "총합계", notes: "결제 메모:", signature: "승인 서명", clientSignature: "고객 서명", walkIn: "고객" },
    zh: { date: "日期", dueDate: "到期日", billedTo: "账单收件人", description: "说明", qty: "数量", unitPrice: "单价", total: "合计", subtotal: "小计", tax: "税费", discount: "折扣", shipping: "运费", grandTotal: "总计", notes: "付款备注:", signature: "授权签名", clientSignature: "客户签名", walkIn: "客户" },
    hi: { date: "तारीख", dueDate: "देय तारीख", billedTo: "बिल प्राप्तकर्ता", description: "विवरण", qty: "मात्रा", unitPrice: "इकाई मूल्य", total: "कुल", subtotal: "उप-योग", tax: "कर", discount: "छूट", shipping: "शिपिंग", grandTotal: "कुल योग", notes: "भुगतान नोट्स:", signature: "अधिकृत हस्ताक्षर", clientSignature: "ग्राहक हस्ताक्षर", walkIn: "ग्राहक" },
    ar: { date: "التاريخ", dueDate: "تاريخ الاستحقاق", billedTo: "الفاتورة إلى", description: "الوصف", qty: "الكمية", unitPrice: "سعر الوحدة", total: "الإجمالي", subtotal: "المجموع الفرعي", tax: "الضريبة", discount: "الخصم", shipping: "الشحن", grandTotal: "الإجمالي النهائي", notes: "ملاحظات الدفع:", signature: "التوقيع المعتمد", clientSignature: "توقيع العميل", walkIn: "عميل" },
    th: { date: "วันที่", dueDate: "วันครบกำหนด", billedTo: "เรียกเก็บเงินถึง", description: "รายละเอียด", qty: "จำนวน", unitPrice: "ราคาต่อหน่วย", total: "รวม", subtotal: "ยอดรวมย่อย", tax: "ภาษี", discount: "ส่วนลด", shipping: "ค่าจัดส่ง", grandTotal: "ยอดรวมทั้งหมด", notes: "หมายเหตุการชำระเงิน:", signature: "ลายเซ็นผู้อนุมัติ", clientSignature: "ลายเซ็นลูกค้า", walkIn: "ลูกค้า" },
    default: null
};
receiptTranslations.default = receiptTranslations.en;

const receiptLanguageMeta = {
    ar: { dir: "rtl", font: "'Noto Sans Arabic', var(--font-sans)" },
    hi: { dir: "ltr", font: "'Noto Sans Devanagari', var(--font-sans)" },
    ja: { dir: "ltr", font: "'Noto Sans JP', var(--font-sans)" },
    ko: { dir: "ltr", font: "'Noto Sans KR', var(--font-sans)" },
    th: { dir: "ltr", font: "'Noto Sans Thai', var(--font-sans)" },
    zh: { dir: "ltr", font: "'Noto Sans SC', var(--font-sans)" }
};

const documentTypeLabels = {
    invoice: "Invoice",
    estimate: "Estimate",
    "credit-note": "Credit Note",
    "delivery-note": "Delivery Note",
    "purchase-order": "Purchase Order"
};

function getReceiptText(key) {
    const lang = currentProfile.preferred_language || "en";
    const source = receiptTranslations[lang] || receiptTranslations.default;
    return source[key] || receiptTranslations.default[key] || key;
}

function seedTestAccount() {
    saveLocalAccount({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        company_name: "Valora EM Admin"
    });

    if (!localStorage.getItem(`valoraem_profile_${ADMIN_EMAIL}`)) {
        localStorage.setItem(`valoraem_profile_${ADMIN_EMAIL}`, JSON.stringify({
            email: ADMIN_EMAIL,
            company_name: "Valora EM Admin",
            phone: "",
            address: "",
            logo_url: "",
            currency: "PHP",
            currency_symbol: "PHP",
            default_tax_rate: 12.0,
            is_pro: true,
            invoice_count: 0,
            invoice_theme_color: "#0d9488",
            invoice_text_color: "#1e293b",
            preferred_language: "en",
            custom_language_name: "",
            print_layout: "pdf",
            app_appearance: "dark",
            saved_signature_data_url: "",
            save_signature_permission: false,
            plan: "Business Unlimited"
        }));
    }

    saveLocalAccount({
        email: DEFAULT_USER_EMAIL,
        password: DEFAULT_TEST_PASSWORD,
        company_name: DEFAULT_TEST_COMPANY
    });

    if (!localStorage.getItem(`valoraem_profile_${DEFAULT_USER_EMAIL}`)) {
        localStorage.setItem(`valoraem_profile_${DEFAULT_USER_EMAIL}`, JSON.stringify({
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
            invoice_text_color: "#1e293b",
            preferred_language: "en",
            custom_language_name: "",
            print_layout: "pdf",
            app_appearance: "dark",
            saved_signature_data_url: "",
            save_signature_permission: false
        }));
    }

    if (!localStorage.getItem("valoraem_payment_settings")) {
        localStorage.setItem("valoraem_payment_settings", JSON.stringify(paymentSettings));
    }

    const sampleClient = {
        id: "client-demo-001",
        name: "Sample Customer",
        email: "customer@example.com",
        phone: "0917-555-0101",
        address: "Quezon City, Philippines"
    };

    if (!localStorage.getItem(`valoraem_clients_${DEFAULT_USER_EMAIL}`)) {
        localStorage.setItem(`valoraem_clients_${DEFAULT_USER_EMAIL}`, JSON.stringify([sampleClient]));
    }

    if (!localStorage.getItem(`valoraem_invoices_${DEFAULT_USER_EMAIL}`)) {
        localStorage.setItem(`valoraem_invoices_${DEFAULT_USER_EMAIL}`, JSON.stringify([{
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
    const saved = localStorage.getItem("valoraem_whitelabel") || localStorage.getItem("billflow_whitelabel");
    if (saved) {
        whitelabelConfig = JSON.parse(saved);
        if (whitelabelConfig.appName && whitelabelConfig.appName.toLowerCase().startsWith("bill")) {
            whitelabelConfig.appName = "Valora EM";
        }
        localStorage.setItem("valoraem_whitelabel", JSON.stringify(whitelabelConfig));
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
    const appearanceClass = document.body.classList.contains("theme-light") ? "theme-light" : "";
    document.body.className = appearanceClass;
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
    if (isPasswordRecoverySession) {
        showAuthScreen();
        showPasswordResetForm();
        return;
    }

    if (isCloudActive) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            setupAuthenticatedUser(session.user);
        } else {
            showAuthScreen();
        }
    } else {
        // Localstorage mock authentication session check
        const savedSession = localStorage.getItem("valoraem_mock_user");
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
        alert("Trial limit reached: Free accounts can create up to 5 invoices. Please subscribe to continue.");
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

    const featureRequestsNav = document.getElementById("feature-requests-nav-item");
    if (featureRequestsNav) {
        featureRequestsNav.dataset.tab = isAdminUser() ? "admin-tab" : "feature-requests-tab";
        const label = featureRequestsNav.querySelector(".nav-link");
        if (label) {
            let textNode = Array.from(label.childNodes).find((node) => node.nodeType === 3 && node.textContent.trim());
            if (!textNode) {
                textNode = document.createTextNode("");
                label.appendChild(textNode);
            }
            textNode.textContent = isAdminUser() ? " Feature Inbox" : " Feature Requests";
        }
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

async function logoutCurrentUser() {
    if (isCloudActive) {
        await supabaseClient.auth.signOut();
    }
    localStorage.removeItem("valoraem_mock_user");
    currentUser = null;
    showAuthScreen();
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
        document.getElementById("preferred-language").disabled = !hasBusinessUnlimited();
    }
    if (document.getElementById("custom-language-name")) {
        document.getElementById("custom-language-name").value = currentProfile.custom_language_name || "";
        document.getElementById("custom-language-name").disabled = !hasBusinessUnlimited();
    }
    if (document.getElementById("invoice-text-color")) {
        document.getElementById("invoice-text-color").value = currentProfile.invoice_text_color || "#1e293b";
    }
    if (document.getElementById("print-layout")) {
        document.getElementById("print-layout").value = currentProfile.print_layout || "pdf";
    }
    if (document.getElementById("creator-print-layout")) {
        document.getElementById("creator-print-layout").value = currentProfile.print_layout || "pdf";
    }
    if (document.getElementById("app-appearance")) {
        document.getElementById("app-appearance").value = currentProfile.app_appearance || "dark";
    }
    if (document.getElementById("save-signature-permission-checkbox")) {
        document.getElementById("save-signature-permission-checkbox").checked = !!currentProfile.save_signature_permission;
    }
    
    applyAppearance();
    renderLogoAccessUI();
    applyInvoiceThemeColor();
    updateUserTierUI();
    updateAdminVisibility();
    showAppScreen();
}

function getLocalStorageProfile(email) {
    const key = `valoraem_profile_${email}`;
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
        invoice_theme_color: "#6366f1",
        invoice_text_color: "#1e293b",
        preferred_language: "en",
        custom_language_name: "",
        print_layout: "pdf",
        app_appearance: "dark",
        saved_signature_data_url: "",
        save_signature_permission: false
    };
}

function applyAppearance() {
    const mode = currentProfile.app_appearance || "dark";
    document.body.classList.toggle("theme-light", mode === "light");
    const appearanceSelect = document.getElementById("app-appearance");
    if (appearanceSelect) appearanceSelect.value = mode;
}

function renderLogoAccessUI() {
    const allowed = hasLogoUploadAccess();
    const uploadGroup = document.getElementById("logo-upload-group");
    const lockedNote = document.getElementById("logo-locked-note");
    const logoFile = document.getElementById("store-logo-file");
    const settingsLogo = document.getElementById("settings-logo-preview");
    const previewLogo = document.getElementById("preview-logo-box");
    const logoUrl = allowed ? currentProfile.logo_url : "";

    if (uploadGroup) uploadGroup.classList.toggle("feature-locked", !allowed);
    if (lockedNote) lockedNote.style.display = allowed ? "none" : "block";
    if (logoFile) logoFile.disabled = !allowed;

    if (settingsLogo) {
        settingsLogo.innerHTML = logoUrl ? `<img src="${logoUrl}" alt="Store logo">` : "<span>LOGO</span>";
    }

    if (previewLogo) {
        previewLogo.style.display = allowed ? "flex" : "none";
        previewLogo.innerHTML = logoUrl ? `<img src="${logoUrl}" alt="Store logo">` : "<span>LOGO</span>";
    }
}

function saveLocalStorageProfile() {
    const key = `valoraem_profile_${currentUser.email}`;
    localStorage.setItem(key, JSON.stringify(currentProfile));
}

function loadPaymentSettings() {
    const saved = localStorage.getItem("valoraem_payment_settings");
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
    localStorage.setItem("valoraem_payment_settings", JSON.stringify(paymentSettings));
    alert("Admin payment settings saved. Connect these keys to the live checkout when the payment integration is ready.");
}

function getLocalPaymentRecords() {
    return JSON.parse(localStorage.getItem("valoraem_payment_records")) || [];
}

function savePaymentRecords(records) {
    localStorage.setItem("valoraem_payment_records", JSON.stringify(records));
}

async function getPaymentRecords() {
    if (isCloudActive) {
        const query = isAdminUser()
            ? supabaseClient.from("app_payments").select("*").order("created_at", { ascending: false })
            : supabaseClient.from("app_payments").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false });
        const { data, error } = await query;
        if (!error && data) {
            return data.map((record) => ({
                id: record.id,
                plan: record.plan,
                price: Number(record.amount) || 0,
                method: record.method,
                customer_email: record.customer_email,
                created_at: record.created_at,
                status: record.status || "paid"
            }));
        }
        console.error("Unable to load app payments:", error);
    }
    return getLocalPaymentRecords();
}

async function recordPayment(plan, price, method) {
    const record = {
        id: `pay-${Date.now()}`,
        plan,
        price: Number(price) || 0,
        method,
        customer_email: currentUser?.email || "local-customer",
        created_at: new Date().toISOString()
    };

    if (isCloudActive) {
        const { error } = await supabaseClient.from("app_payments").insert({
            user_id: currentUser.id,
            customer_email: currentUser.email,
            plan,
            method,
            amount: Number(price) || 0,
            status: "paid"
        });
        if (error) {
            console.error("Unable to save cloud payment record:", error);
        }
    }

    const records = getLocalPaymentRecords();
    records.push(record);
    savePaymentRecords(records);
}

function getFeatureRequests() {
    return JSON.parse(localStorage.getItem("valoraem_feature_requests")) || [];
}

function saveFeatureRequests(requests) {
    localStorage.setItem("valoraem_feature_requests", JSON.stringify(requests));
}

async function getAdminFeatureRequests() {
    if (hasCloudConnection()) {
        const { data, error } = await supabaseClient
            .from("feature_requests")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error && data) {
            return data.map((request) => ({
                id: request.id,
                customer_email: request.customer_email || "Unknown customer",
                text: request.request_text || "",
                created_at: request.created_at
            }));
        }

        console.error("Unable to load cloud feature requests:", error);
    }

    return getFeatureRequests();
}

async function submitFeatureRequest() {
    const textarea = document.getElementById("feature-request-text");
    const text = textarea.value.trim();
    if (!text) {
        alert("Please type your feature request first.");
        return;
    }

    const request = {
        id: `req-${Date.now()}`,
        customer_email: currentUser?.email || "local-customer",
        text,
        created_at: new Date().toISOString()
    };

    if (hasCloudConnection()) {
        const { error } = await supabaseClient.from("feature_requests").insert({
            user_id: currentUser.id,
            customer_email: currentUser.email,
            request_text: text
        });

        if (error) {
            console.error("Unable to submit cloud feature request:", error);
            alert("Unable to send the feature request to the admin dashboard right now. Please try again when your connection is stable.");
            return;
        }
    } else if (isCloudActive) {
        alert("You are offline. Please reconnect before sending a feature request to the admin dashboard.");
        return;
    }

    const requests = getFeatureRequests();
    requests.push(request);
    saveFeatureRequests(requests);
    textarea.value = "";
    alert("Feature request sent to the admin dashboard.");
}

function handleDocumentPhotos(event) {
    const files = Array.from(event.target.files || []).slice(0, 4);
    if (!files.length) return;
    currentDocumentPhotos = [];

    let loaded = 0;
    files.forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        if (file.size > 2 * 1024 * 1024) {
            alert(`${file.name} is too large. Maximum image size is 2MB.`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            currentDocumentPhotos.push(loadEvent.target.result);
            loaded += 1;
            if (loaded === files.length || currentDocumentPhotos.length === files.length) {
                renderDocumentPhotos();
            }
        };
        reader.readAsDataURL(file);
    });
}

function renderDocumentPhotos() {
    const container = document.getElementById("preview-photo-container");
    if (!container) return;

    if (!currentDocumentPhotos.length) {
        container.style.display = "none";
        container.innerHTML = "";
        return;
    }

    container.style.display = "grid";
    container.innerHTML = currentDocumentPhotos
        .map((src) => `<img src="${src}" alt="Attached document photo">`)
        .join("");
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
    clients = JSON.parse(localStorage.getItem(`valoraem_clients_${suffix}`)) || [];
    invoices = JSON.parse(localStorage.getItem(`valoraem_invoices_${suffix}`)) || [];
}

// Save database records to LocalStorage
function saveLocalData() {
    const suffix = currentUser.email;
    localStorage.setItem(`valoraem_clients_${suffix}`, JSON.stringify(clients));
    localStorage.setItem(`valoraem_invoices_${suffix}`, JSON.stringify(invoices));
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
        const planName = getCurrentPlanName();
        tierDisplay.innerText = planName.toUpperCase();
        tierDisplay.style.color = "var(--accent)";
        tierDisplay.style.backgroundColor = "var(--accent-glow)";
        currentTierStatus.innerText = planName.toUpperCase();
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

    renderLogoAccessUI();
}

// ==================== EVENT HANDLERS ====================
function initAppEventListeners() {
    document.querySelectorAll(".password-toggle").forEach((button) => {
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.target);
            if (!input) return;
            input.type = input.type === "password" ? "text" : "password";
            button.innerText = input.type === "password" ? "Show" : "Hide";
        });
    });

    document.querySelectorAll(".auth-provider-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const provider = button.dataset.provider;
            if (!isCloudActive) {
                alert("Supabase is not connected yet. Please add your Supabase URL and anon key in app.js first.");
                return;
            }

            if (provider === "google") {
                const { error } = await supabaseClient.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                        redirectTo: `${window.location.origin}/app.html`
                    }
                });
                if (error) {
                    alert(`Google login error: ${error.message}`);
                }
                return;
            }

            if (provider === "phone") {
                const phone = window.prompt("Enter your phone number with country code. Example: +639171234567");
                if (!phone) return;
                const { error } = await supabaseClient.auth.signInWithOtp({ phone });
                if (error) {
                    alert(`Phone OTP error: ${error.message}`);
                    return;
                }
                alert("OTP sent. Phone OTP verification screen will be added next after SMS provider setup.");
            }
        });
    });

    const resetCodeButton = document.getElementById("send-reset-code-btn");
    if (resetCodeButton) {
        resetCodeButton.addEventListener("click", sendPasswordResetCode);
    }

    document.getElementById("reset-password-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        let email = document.getElementById("reset-email").value.trim();
        const code = document.getElementById("reset-code").value.trim();
        const password = document.getElementById("reset-password").value;

        if (password.length < 6) {
            setResetCodeStatus("Password must be at least 6 characters.", true);
            return;
        }

        if (isCloudActive) {
            if (!email && isPasswordRecoverySession) {
                const { data: { session } } = await supabaseClient.auth.getSession();
                email = session?.user?.email || "";
                if (email) document.getElementById("reset-email").value = email;
            }
            if (!email) {
                setResetCodeStatus("Please enter your email first.", true);
                return;
            }

            if (!isPasswordRecoverySession) {
                if (!code) {
                    setResetCodeStatus("Please open the latest password reset email and click the reset link first.", true);
                    return;
                }

                const { error: verifyError } = await supabaseClient.auth.verifyOtp({
                    email,
                    token: code,
                    type: "recovery"
                });
                if (verifyError) {
                    setResetCodeStatus("That code was rejected by Supabase. Please use the reset link from the latest email instead.", true);
                    return;
                }
                isPasswordRecoverySession = true;
            }

            const { error: updateError } = await supabaseClient.auth.updateUser({ password });
            if (updateError) {
                setResetCodeStatus(`Could not update password: ${updateError.message}`, true);
                return;
            }

            setResetCodeStatus("Password updated. You can now sign in with your new password.");
            await supabaseClient.auth.signOut();
            document.getElementById("login-email").value = email;
            document.getElementById("login-password").value = "";
            document.getElementById("login-form").style.display = "block";
            document.getElementById("reset-password-form").style.display = "none";
            document.getElementById("auth-toggle-login").style.display = "block";
            document.getElementById("auth-toggle-register").style.display = "none";
            document.getElementById("auth-toggle-reset").style.display = "block";
            document.getElementById("auth-toggle-reset-back").style.display = "none";
            return;
        }

        if (!email) {
            setResetCodeStatus("Please enter your email first.", true);
            return;
        }

        if (!code) {
            setResetCodeStatus("Please enter the reset code.", true);
            return;
        }

        const expectedCode = localStorage.getItem(`valoraem_reset_code_${email}`) || "123456";
        if (code !== expectedCode) {
            setResetCodeStatus("Invalid reset code. Local preview code is 123456.", true);
            return;
        }
        const localAccount = getLocalAccount(email);
        if (!localAccount) {
            setResetCodeStatus("No account exists for this email. Please sign up first.", true);
            return;
        }
        saveLocalAccount({ ...localAccount, password });
        setResetCodeStatus("Password updated. You can now sign in with your new password.");
    });

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
                alert("Account created. You can now sign in.");
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
                phone: document.getElementById("register-phone").value.trim(),
                is_pro: false,
                currency: "PHP",
                currency_symbol: "PHP",
                default_tax_rate: 12.0,
                app_appearance: "dark",
                preferred_language: "en",
                print_layout: "pdf"
            };
            localStorage.setItem(`valoraem_profile_${email}`, JSON.stringify(newProfile));
            alert("Account created. Confirmation email will be sent automatically after live email integration is connected.");
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
                localStorage.setItem(`valoraem_profile_${email}`, JSON.stringify(newProfile));
                localStorage.setItem("valoraem_mock_user", JSON.stringify(mockUser));
                setupAuthenticatedUser(mockUser);
            } else {
                alert("Password must be at least 6 characters.");
            }
        }
    });

    // Logout
    document.getElementById("logout-btn").addEventListener("click", async () => {
        await logoutCurrentUser();
    });
    document.getElementById("mobile-logout-nav").addEventListener("click", logoutCurrentUser);

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
        currentProfile.preferred_language = hasBusinessUnlimited() ? document.getElementById("preferred-language").value : "en";
        currentProfile.custom_language_name = hasBusinessUnlimited() ? document.getElementById("custom-language-name").value.trim() : "";
        currentProfile.invoice_text_color = document.getElementById("invoice-text-color").value || "#1e293b";
        currentProfile.print_layout = document.getElementById("print-layout").value || "pdf";
        currentProfile.app_appearance = document.getElementById("app-appearance").value || "dark";
        
        if (isCloudActive) {
            const { error } = await supabaseClient.from("profiles")
                .update({
                    company_name: currentProfile.company_name,
                    phone: currentProfile.phone,
                    address: currentProfile.address,
                    currency: currentProfile.currency,
                    currency_symbol: currentProfile.currency_symbol,
                    preferred_language: currentProfile.preferred_language,
                    custom_language_name: currentProfile.custom_language_name,
                    invoice_theme_color: currentProfile.invoice_theme_color,
                    invoice_text_color: currentProfile.invoice_text_color,
                    print_layout: currentProfile.print_layout,
                    app_appearance: currentProfile.app_appearance
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
        applyAppearance();
        renderLogoAccessUI();
        applyInvoiceThemeColor();
        updateInvoicePreview();
    });

    // Store Logo File Selection (Converts file to base64 DataURL for offline compatibility)
    document.getElementById("store-logo-file").addEventListener("change", (e) => {
        if (!hasLogoUploadAccess()) {
            e.target.value = "";
            alert("Logo upload is available on Pro Unlimited and Business Unlimited plans.");
            return;
        }

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
                renderLogoAccessUI();
                
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
            localStorage.setItem("valoraem_whitelabel", JSON.stringify(whitelabelConfig));
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
        const label = documentTypeLabels[type] || "Invoice";
        document.getElementById("preview-doc-type-text").innerText = label.toUpperCase();
        document.getElementById("creator-title").innerText = `${label} Creator`;
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
    document.getElementById("inv-shipping").addEventListener("input", updateInvoicePreview);
    document.getElementById("inv-notes").addEventListener("input", (e) => {
        document.getElementById("preview-notes-text").innerText = e.target.value;
    });
    document.getElementById("printed-name").addEventListener("input", updateSignaturePreview);
    document.getElementById("request-client-signature-checkbox").addEventListener("change", updateSignaturePreview);
    document.getElementById("creator-print-layout").addEventListener("change", (event) => {
        currentProfile.print_layout = event.target.value || "pdf";
        if (document.getElementById("print-layout")) document.getElementById("print-layout").value = currentProfile.print_layout;
        applyInvoiceThemeColor();
    });
    document.getElementById("document-photo-file").addEventListener("change", handleDocumentPhotos);

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
    document.getElementById("submit-feature-request-btn").addEventListener("click", submitFeatureRequest);
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
    applyReceiptLanguage();
    
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
    const shipping = parseFloat(document.getElementById("inv-shipping").value) || 0;
    
    const taxAmount = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxAmount + shipping - discount;
    
    // Write calculations to Preview
    document.getElementById("preview-subtotal").innerText = `${currentProfile.currency_symbol}${subtotal.toFixed(2)}`;
    document.getElementById("preview-tax-label").innerText = `${getReceiptText("tax")} (${taxRate}%)`;
    document.getElementById("preview-tax-amount").innerText = `${currentProfile.currency_symbol}${taxAmount.toFixed(2)}`;
    document.getElementById("preview-discount-val").innerText = `${currentProfile.currency_symbol}${discount.toFixed(2)}`;
    document.getElementById("preview-shipping-val").innerText = `${currentProfile.currency_symbol}${shipping.toFixed(2)}`;
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
    document.getElementById("inv-shipping").value = "0";
    document.getElementById("inv-notes").value = "";
    document.getElementById("printed-name").value = "";
    document.getElementById("request-client-signature-checkbox").checked = false;
    currentDocumentPhotos = [];
    renderDocumentPhotos();
    
    // Clear signature and state
    clearSignature();
    if (document.getElementById("show-signature-checkbox")) {
        const hasSavedSignature = !!(currentProfile.save_signature_permission && currentProfile.saved_signature_data_url);
        document.getElementById("show-signature-checkbox").checked = hasSavedSignature;
        document.getElementById("preview-signature-container").style.display = hasSavedSignature ? "flex" : "none";
        document.getElementById("save-signature-permission-checkbox").checked = !!currentProfile.save_signature_permission;
        if (hasSavedSignature) {
            const img = new Image();
            img.onload = () => {
                sigCtx.drawImage(img, 0, 0);
                updateSignaturePreview();
            };
            img.src = currentProfile.saved_signature_data_url;
        }
    }
    
    // Load default tax
    document.getElementById("inv-tax-rate").value = currentProfile.default_tax_rate;
    
    // Clear preview labels
    document.getElementById("preview-inv-number").innerText = document.getElementById("inv-number").value;
    applyReceiptLanguage();
    document.getElementById("preview-doc-type-text").innerText = "INVOICE";
    document.getElementById("creator-title").innerText = "Invoice Creator";
    document.getElementById("preview-client-name").innerText = "Walk-in Customer";
    document.getElementById("preview-client-email").innerText = "";
    document.getElementById("preview-client-phone").innerText = "";
    document.getElementById("preview-client-address").innerText = "";
    
    addNewLineItem("Product Sale / Professional Service", 1, 1000);
}

function isNetworkSaveError(error) {
    const message = String(error?.message || error || "").toLowerCase();
    return error instanceof TypeError || message.includes("failed to fetch") || message.includes("network");
}

function saveInvoiceLocally(invoiceData) {
    if (activeEditingInvoiceId) {
        const index = invoices.findIndex(i => i.id === activeEditingInvoiceId);
        if (index !== -1) {
            invoices[index] = { ...invoiceData, id: activeEditingInvoiceId, items: currentInvoiceItems };
            saveLocalData();
            saveLocalStorageProfile();
            return activeEditingInvoiceId;
        }
    }

    const newId = invoiceData.id || `inv-${Date.now()}`;
    invoices.push({ ...invoiceData, id: newId, items: currentInvoiceItems });
    saveLocalData();
    saveLocalStorageProfile();
    return newId;
}

// Save invoice to database (with checks on account tier limits)
async function saveInvoiceToDatabase() {
    // Check trial limits
    if (!currentProfile.is_pro && invoices.length >= 5 && !activeEditingInvoiceId) {
        alert("Trial limit reached: Free accounts can create up to 5 invoices. Please subscribe to continue.");
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
    const shipping = parseFloat(document.getElementById("inv-shipping").value) || 0;
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
    const total = subtotal + taxAmount + shipping - discount;
    
    // Check signature data URL
    const hasSignature = document.getElementById("show-signature-checkbox").checked;
    const signatureCanvas = document.getElementById("signature-canvas");
    const signatureUrl = (hasSignature && !isCanvasBlank(signatureCanvas)) ? signatureCanvas.toDataURL() : null;
    const saveSignaturePermission = document.getElementById("save-signature-permission-checkbox").checked;
    currentProfile.save_signature_permission = saveSignaturePermission;
    currentProfile.saved_signature_data_url = saveSignaturePermission && signatureUrl ? signatureUrl : "";
    const printedName = document.getElementById("printed-name").value.trim();
    const requestClientSignature = document.getElementById("request-client-signature-checkbox").checked;

    const invoiceData = {
        invoice_number: invoiceNumber,
        client_id: clientId || null,
        type,
        status,
        issue_date: issueDate,
        due_date: dueDate || null,
        tax_rate: taxRate,
        discount,
        shipping,
        notes,
        subtotal,
        tax_amount: taxAmount,
        total,
        signature_data_url: signatureUrl,
        printed_name: printedName,
        request_client_signature: requestClientSignature,
        photo_data_urls: currentDocumentPhotos
    };
    
    if (isCloudActive && !hasCloudConnection()) {
        saveInvoiceLocally(invoiceData);
        alert("You are offline, so this document was saved on this device. It will stay available here until cloud sync is available.");
        activeEditingInvoiceId = null;
        switchTab("invoices-tab");
        return;
    }

    if (isCloudActive) {
        invoiceData.user_id = currentUser.id;
        try {
            await supabaseClient.from("profiles").update({
                save_signature_permission: currentProfile.save_signature_permission,
                saved_signature_data_url: currentProfile.saved_signature_data_url
            }).eq("id", currentUser.id);
            
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
        } catch (error) {
            if (!isNetworkSaveError(error)) {
                alert("Error saving: " + (error.message || error));
                return;
            }

            saveInvoiceLocally(invoiceData);
            alert("Cloud is unreachable right now, so this document was saved on this device instead of showing an error.");
            activeEditingInvoiceId = null;
            switchTab("invoices-tab");
            return;
        }
    } else {
        saveInvoiceLocally(invoiceData);
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
    document.getElementById("inv-shipping").value = inv.shipping || 0;
    document.getElementById("inv-notes").value = inv.notes || "";
    document.getElementById("printed-name").value = inv.printed_name || "";
    document.getElementById("request-client-signature-checkbox").checked = !!inv.request_client_signature;
    currentDocumentPhotos = inv.photo_data_urls || [];
    renderDocumentPhotos();

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
    document.getElementById("creator-title").innerText = `Edit ${documentTypeLabels[inv.type] || "Document"}`;
    
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
    const line = document.getElementById("billing-invoice-count-line");
    if (line) {
        line.innerHTML = currentProfile.is_pro
            ? `Total documents created: <span id="billing-invoice-count">${invoices.length}</span>`
            : `Invoices Used: <span id="billing-invoice-count">${invoices.length}</span> / 5 free limits.`;
    }
}

async function renderAdminDashboard() {
    if (!isAdminUser()) return;

    loadPaymentSettings();

    const records = await getPaymentRecords();
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
    } else {
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

    const requestsBody = document.querySelector("#admin-feature-requests-table tbody");
    if (requestsBody) {
        const requests = await getAdminFeatureRequests();
        requestsBody.innerHTML = "";
        if (requests.length === 0) {
            requestsBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No feature requests yet.</td></tr>';
        } else {
            requests.forEach((request) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${new Date(request.created_at).toLocaleString()}</td>
                    <td>${request.customer_email}</td>
                    <td>${request.text}</td>
                `;
                requestsBody.appendChild(row);
            });
        }
    }
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
    currentProfile.plan = paymentModal.dataset.plan || "Pro Unlimited Plan";
    await recordPayment(
        paymentModal.dataset.plan || "Pro Unlimited Plan",
        paymentModal.dataset.price || 249,
        gcashActive ? "GCash" : "Card"
    );
    
    if (isCloudActive) {
        await supabaseClient.from("profiles").update({ is_pro: true, plan: currentProfile.plan }).eq("id", currentUser.id);
    } else {
        saveLocalStorageProfile();
    }
    
    // Visual success alerts
    overlay.style.display = "none";
    document.getElementById("payment-modal").style.display = "none";
    alert(`Success! Your subscription is now active. A payment receipt email will be sent automatically after live email/payment integration is connected.`);
    
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
        updateSignaturePreview();
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

    const receiptTextColor = document.getElementById("invoice-text-color");
    if (receiptTextColor) {
        receiptTextColor.addEventListener("input", (event) => {
            currentProfile.invoice_text_color = event.target.value || "#1e293b";
            applyInvoiceThemeColor();
        });
    }

    const printLayout = document.getElementById("print-layout");
    if (printLayout) {
        printLayout.addEventListener("change", (event) => {
            currentProfile.print_layout = event.target.value || "pdf";
            if (document.getElementById("creator-print-layout")) document.getElementById("creator-print-layout").value = currentProfile.print_layout;
            applyInvoiceThemeColor();
        });
    }

    const languageSelect = document.getElementById("preferred-language");
    if (languageSelect) {
        languageSelect.addEventListener("change", (event) => {
            currentProfile.preferred_language = event.target.value || "en";
            updateInvoicePreview();
        });
    }

    const appearanceSelect = document.getElementById("app-appearance");
    if (appearanceSelect) {
        appearanceSelect.addEventListener("change", (event) => {
            currentProfile.app_appearance = event.target.value || "dark";
            applyAppearance();
        });
    }
}

function applyReceiptLanguage() {
    const lang = currentProfile.preferred_language || "en";
    const meta = receiptLanguageMeta[lang] || { dir: "ltr", font: "var(--font-sans)" };
    const printable = document.getElementById("invoice-printable-area");
    if (printable) {
        printable.setAttribute("dir", meta.dir);
        printable.style.fontFamily = meta.font;
    }

    const mapping = {
        "preview-date-label": "date",
        "preview-due-date-label": "dueDate",
        "preview-billed-to-label": "billedTo",
        "preview-description-label": "description",
        "preview-qty-label": "qty",
        "preview-unit-price-label": "unitPrice",
        "preview-total-label": "total",
        "preview-subtotal-label": "subtotal",
        "preview-discount-label": "discount",
        "preview-shipping-label": "shipping",
        "preview-grand-total-label": "grandTotal",
        "preview-notes-label": "notes",
        "preview-authorized-label": "signature",
        "preview-client-signature-label": "clientSignature"
    };

    Object.entries(mapping).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = getReceiptText(key);
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
    const showSignature = document.getElementById("show-signature-checkbox")?.checked;
    if (!blank && showSignature) {
        img.src = dataUrl;
        img.style.display = "block";
    } else {
        img.src = "";
        img.style.display = "none";
    }

    const signatureContainer = document.getElementById("preview-signature-container");
    if (signatureContainer) signatureContainer.style.display = showSignature ? "flex" : "none";

    const printedName = document.getElementById("printed-name")?.value.trim() || "";
    const printedNameEl = document.getElementById("preview-printed-name");
    if (printedNameEl) {
        printedNameEl.innerText = printedName;
        printedNameEl.style.display = printedName && showSignature ? "block" : "none";
    }

    const clientSignature = document.getElementById("request-client-signature-checkbox")?.checked;
    const clientSignatureBox = document.getElementById("preview-client-signature-container");
    if (clientSignatureBox) clientSignatureBox.style.display = clientSignature ? "flex" : "none";
}

function isCanvasBlank(canvas) {
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
}

function applyInvoiceThemeColor() {
    const color = currentProfile.invoice_theme_color || "#6366f1";
    const textColor = currentProfile.invoice_text_color || "#1e293b";
    const printLayout = currentProfile.print_layout || "pdf";
    const thermal = printLayout.startsWith("thermal");
    const printable = document.getElementById("invoice-printable-area");
    if (printable) {
        printable.style.setProperty('--invoice-accent', thermal ? "#000000" : color);
        printable.style.setProperty('--invoice-text', thermal ? "#000000" : textColor);
        printable.classList.remove("print-layout-pdf", "print-layout-thermal-80", "print-layout-thermal-58");
        printable.classList.add(`print-layout-${printLayout}`);
    }
    
    // Apply selected class to settings presets
    document.querySelectorAll(".invoice-color-preset").forEach(el => {
        el.classList.remove("active");
        if (el.dataset.color === color) {
            el.classList.add("active");
        }
    });

    const textColorInput = document.getElementById("invoice-text-color");
    if (textColorInput) textColorInput.value = textColor;

    const printLayoutSelect = document.getElementById("print-layout");
    if (printLayoutSelect) printLayoutSelect.value = printLayout;

    const creatorPrintLayoutSelect = document.getElementById("creator-print-layout");
    if (creatorPrintLayoutSelect) creatorPrintLayoutSelect.value = printLayout;
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
    savePaymentSettings,
    sendPasswordResetCode,
    configurePasswordResetForm,
    showPasswordResetForm,
    submitFeatureRequest
});
