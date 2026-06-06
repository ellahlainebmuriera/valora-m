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

const CURRENCY_SYMBOLS = {
    PHP: "\u20b1",
    USD: "$",
    EUR: "\u20ac",
    JPY: "\u00a5",
    GBP: "\u00a3",
    AUD: "A$",
    CAD: "C$",
    SGD: "S$",
    HKD: "HK$",
    CNY: "\u00a5",
    KRW: "\u20a9",
    INR: "\u20b9",
    THB: "\u0e3f",
    IDR: "Rp",
    MYR: "RM",
    VND: "\u20ab",
    AED: "AED"
};

const CURRENCY_ALIASES = {
    US: "USD",
    USA: "USD",
    DOLLAR: "USD",
    PH: "PHP",
    PESO: "PHP",
    YEN: "JPY"
};

const PROFILE_LOCK_MESSAGE = "Profile Lock active. Free and Starter tiers can only modify business profile settings once every 7 days. Upgrade to Pro or Business Plan to manage multiple stores instantly.";
const FREE_WEEKLY_INVOICE_LIMIT = 5;
const LIVE_LAUNCH_CONFIG = {
    active: false,
    launchDate: "",
    trialDays: 7
};
const PDF_EXPORT_LIBRARY_URL = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
const ACCOUNT_DELETE_FUNCTION_NAME = "delete-account";
const PAYMONGO_CHECKOUT_FUNCTION_NAME = "create-paymongo-checkout";
const PLAN_PROMO_PRICES = {
    "Starter Plan": 149,
    "Pro Unlimited Plan": 249,
    "Business Unlimited": 449
};

const BUSINESS_PROFILE_FIELDS = [
    "company_name",
    "email",
    "phone",
    "address",
    "logo_url",
    "currency",
    "currency_symbol",
    "default_tax_rate",
    "invoice_theme_color",
    "invoice_text_color",
    "preferred_language",
    "document_language",
    "app_interface_language",
    "custom_language_name",
    "print_layout",
    "app_appearance",
    "saved_signature_data_url",
    "save_signature_permission",
    "last_business_info_updated_at"
];

const PLAN_RATES = {
    "Standard Free Plan": { promoMonthly: 0, regularMonthly: 0 },
    "Starter Plan": { promoMonthly: 149, regularMonthly: 298 },
    "Pro Unlimited Plan": { promoMonthly: 249, regularMonthly: 498 },
    "Business Unlimited": { promoMonthly: 449, regularMonthly: 898 }
};

const PRICING_FEATURES = [
    { label: "Create Invoices & Estimates", allowed: ["Standard Free Plan", "Starter Plan", "Pro Unlimited Plan", "Business Unlimited"] },
    { label: "Customer Directory & Advanced History", allowed: ["Starter Plan", "Pro Unlimited Plan", "Business Unlimited"] },
    { label: "Print / Save as PDF", allowed: ["Starter Plan", "Pro Unlimited Plan", "Business Unlimited"] },
    { label: "Store Logo Upload", allowed: ["Pro Unlimited Plan", "Business Unlimited"] },
    { label: "Signature & Receipt Customization", allowed: ["Pro Unlimited Plan", "Business Unlimited"] },
    { label: "Multi-Store Business Profiles", allowed: ["Pro Unlimited Plan", "Business Unlimited"] },
    { label: "Expense Tracking & Net Profit", allowed: ["Pro Unlimited Plan", "Business Unlimited"] },
    { label: "Offline Mode & Item Catalog", allowed: ["Business Unlimited"] }
];

const TUTORIAL_STEPS = [
    {
        tab: "dashboard-tab",
        label: "Step 1 of 7",
        title: "Dashboard overview",
        body: "This is your business overview. You can track revenue, paid invoices, unpaid balance, expenses, net profit, and recent documents here.",
        focusTitle: "Best first habit",
        focusText: "Check the dashboard after creating invoices or adding expenses so you know where your business stands."
    },
    {
        tab: "settings-tab",
        label: "Step 2 of 7",
        title: "Set up your business profile",
        body: "Add your store name, address, phone, currency, receipt colors, print layout, and logo if your plan supports logo upload.",
        focusTitle: "Before creating documents",
        focusText: "Complete Settings first so every invoice already has the correct business identity."
    },
    {
        tab: "clients-tab",
        label: "Step 3 of 7",
        title: "Save your customers",
        body: "Add clients once, then reuse them whenever you create an invoice, estimate, delivery note, or purchase order.",
        focusTitle: "Time saver",
        focusText: "Client details appear automatically on the document preview after you select a saved client."
    },
    {
        tab: "creator-tab",
        label: "Step 4 of 7",
        title: "Create an invoice or estimate",
        body: "Choose the document type, enter line items, add tax, discount, shipping, notes, photos, and optional signatures.",
        focusTitle: "Live preview",
        focusText: "The right preview updates while you type, so you can check the final look before printing."
    },
    {
        tab: "invoices-tab",
        label: "Step 5 of 7",
        title: "Track document history",
        body: "Invoice History keeps your saved documents organized. Filter by status or date, edit records, and recover deleted invoices from Trash Bin.",
        focusTitle: "Payment tracking",
        focusText: "Update invoice status when a customer pays so the dashboard totals stay accurate."
    },
    {
        tab: "expenses-tab",
        label: "Step 6 of 7",
        title: "Track expenses and net profit",
        body: "Add business expenses so Valora EM can calculate profit, not just sales. This is useful for owners who want clearer reports.",
        focusTitle: "Upgrade note",
        focusText: "Expense Tracking is a premium business feature, but users can still learn where it lives."
    },
    {
        tab: "learning-tab",
        label: "Step 7 of 7",
        title: "Return to Learning anytime",
        body: "Use this Learning Center whenever you or your staff need a quick refresher on the app workflow.",
        focusTitle: "Support path",
        focusText: "For issues, use Bug Report. For ideas, use Feature Requests so the owner can review them."
    }
];

const UI_TRANSLATIONS = {
    en: {
        sidebar: {
            dashboard: "Dashboard",
            learning: "Learning",
            createInvoice: "Create Invoice",
            invoiceHistory: "Invoice History",
            expenses: "Expenses",
            trashBin: "Trash Bin",
            clientsList: "Clients List",
            settings: "Settings",
            appearance: "Appearance",
            account: "Account",
            featureRequests: "Feature Requests",
            featureInbox: "Feature Inbox",
            bugReport: "Bug Report",
            offlineMode: "Offline Mode",
            admin: "Admin",
            subscription: "Subscription",
            logoutAccount: "Logout Account"
        },
        dashboard: {
            title: "SaaS Dashboard",
            subtitle: "Track invoices, clients, and business income from one simple dashboard.",
            quickStart: "Quick start",
            newUserTitle: "New to Valora EM?",
            newUserBody: "Take the short tutorial or open the Learning Center to see how to set up your store, create invoices, print PDFs, and track profit.",
            betaFeedback: "Beta feedback",
            feedbackTitle: "Help improve Valora EM before launch",
            feedbackBody: "Tell us what feels confusing, broken, or missing. Your message goes to the owner dashboard/feature inbox for review.",
            totalRevenue: "Total Revenue",
            totalPaid: "Total Paid",
            unpaidBalance: "Unpaid Balance",
            totalInvoices: "Total Invoices"
        },
        learning: {
            title: "Learning Center",
            subtitle: "Follow a simple guided path to learn Valora EM faster."
        },
        settings: {
            title: "Business Settings",
            subtitle: "Set up your store profile, currency, customer-facing identity, and saved item catalog.",
            businessDetails: "Business Details",
            saveStore: "Save Store Settings"
        },
        appearance: {
            title: "Appearance & Document Design",
            subtitle: "Control dark mode, app language, receipt language, colors, and print layout in one clean screen.",
            appTheme: "App Theme",
            themeHelp: "Choose how the dashboard looks for the logged-in user.",
            appAppearance: "App Appearance",
            darkMode: "Dark Mode",
            lightMode: "Light Mode",
            languageControls: "Language Controls",
            languageHelp: "App language is for the dashboard. Invoice/receipt language is for generated customer documents.",
            appLanguage: "App Interface Language",
            receiptLanguage: "Invoice / Receipt Language",
            receiptStyling: "Receipt & Print Styling",
            stylingHelp: "These settings affect the invoice/receipt preview and printed output, not the dashboard colors.",
            accentColor: "Receipt Accent Color",
            textColor: "Receipt Text Color",
            printLayout: "Print Layout",
            save: "Save Appearance Settings"
        },
        account: {
            title: "Account & Privacy",
            subtitle: "Manage privacy, deletion requests, and account-level data controls.",
            deleteTitle: "Delete Account / Data",
            deleteWarning: "After 7 days, your data will be permanently wiped. There is NO WAY to restore your account, even our admin/dev team cannot recover it.",
            deleteHelp: "Use the button below to open the deletion modal. You can choose the default 7-day grace period or explicitly request immediate permanent deletion.",
            deleteButton: "Delete Account",
            paymentPolicy: "Payment Data Policy",
            noCardStorage: "No local card storage",
            noCardStorageBody: "Valora EM does not store card numbers, expiry dates, CVCs, or wallet credentials.",
            manualRenewal: "Manual renewal by default",
            manualRenewalBody: "Paid plans do not auto-charge unless the user explicitly opts into EasyPay auto-renewal at checkout."
        },
        featureRequests: {
            title: "Feature Requests",
            subtitle: "Send ideas, bug reports, and improvement requests directly to the Valora EM owner.",
            sendTitle: "Send Feature Request",
            sendHelp: "Tell us what you want improved or added next.",
            label: "Feature Request",
            submit: "Send Feature Request",
            includeTitle: "What to include"
        },
        bugReport: {
            title: "Bug Report",
            subtitle: "Submit a support ticket and track replies from Valora EM support.",
            panelTitle: "In-App Bug Reporting System",
            help: "Send a new ticket with a subject and details, then check the conversation thread for responses.",
            create: "Create Ticket",
            sendReply: "Send Reply",
            noTickets: "No tickets yet.",
            selectTicket: "Select a ticket to view the conversation."
        },
        offline: {
            title: "Offline Mode",
            subtitle: "Create invoices and print PDFs even when internet is unstable.",
            panelTitle: "How offline access works"
        },
        admin: {
            title: "Owner Admin Dashboard",
            subtitle: "Track app revenue, customer upgrades, payment gateway settings, and support requests.",
            gatewayTab: "Dashboard & Gateway Settings",
            ticketsTab: "Bug Reports / Support Tickets",
            paymentsTitle: "Recent App Payments",
            featureInboxTitle: "Customer Feature Requests"
        },
        billing: {
            title: "Subscription",
            subtitle: "Choose the plan that matches your store workflow.",
            monthly: "Monthly",
            yearly: "Yearly"
        },
        creator: {
            saveInvoice: "Save Document",
            savePdf: "Save as PDF",
            printInvoice: "Print",
            addLineItem: "Add Line Item"
        },
        common: {
            beginTutorial: "Begin Tutorial",
            openLearningCenter: "Open Learning Center",
            newInvoiceEstimate: "New Invoice/Estimate",
            sendFeedback: "Send Feedback",
            viewPlans: "View Plans"
        },
        placeholders: {
            betaFeedback: "Example: The thermal print preview is hard to read on my phone.",
            featureRequest: "Example: Please add invoice reminder emails, customer read receipts, or automatic monthly reports.",
            ticketSubject: "Subject",
            ticketMessage: "Details: what happened, what page you were on, and what device you used.",
            ticketReply: "Write a reply...",
            customLanguage: "Type another document language if it is not listed"
        },
        messages: {
            appearanceSaved: "Appearance and document settings saved.",
            languageChanged: "App language updated. Click Save Appearance Settings to sync it to your account."
        }
    },
    fil: {
        sidebar: {
            dashboard: "Dashboard",
            learning: "Learning",
            createInvoice: "Gumawa ng Invoice",
            invoiceHistory: "History ng Invoice",
            expenses: "Mga Gastos",
            trashBin: "Basurahan",
            clientsList: "Listahan ng Kliyente",
            settings: "Mga Setting",
            appearance: "Hitsura",
            account: "Account",
            featureRequests: "Feature Requests",
            featureInbox: "Feature Inbox",
            bugReport: "Bug Report",
            offlineMode: "Offline Mode",
            admin: "Admin",
            subscription: "Subscription",
            logoutAccount: "Logout Account"
        },
        dashboard: {
            title: "Dashboard",
            subtitle: "Subaybayan ang invoices, clients, at kita ng negosyo sa isang simpleng dashboard.",
            quickStart: "Mabilisang simula",
            newUserTitle: "Bago sa Valora EM?",
            newUserBody: "Simulan ang maikling tutorial o buksan ang Learning Center para matutunan ang store setup, invoice creation, PDF printing, at profit tracking.",
            betaFeedback: "Beta feedback",
            feedbackTitle: "Tulungan pagandahin ang Valora EM bago ilaunch",
            feedbackBody: "Sabihin kung ano ang nakakalito, sira, o kulang. Mapupunta ang message sa owner dashboard/feature inbox.",
            totalRevenue: "Kabuuang Kita",
            totalPaid: "Nabayaran",
            unpaidBalance: "Hindi Pa Bayad",
            totalInvoices: "Kabuuang Invoices"
        },
        learning: {
            title: "Learning Center",
            subtitle: "Sundin ang simpleng guide para mas mabilis matutunan ang Valora EM."
        },
        settings: {
            title: "Business Settings",
            subtitle: "I-set up ang store profile, currency, customer identity, at saved item catalog.",
            businessDetails: "Detalye ng Negosyo",
            saveStore: "I-save ang Store Settings"
        },
        appearance: {
            title: "Hitsura at Disenyo ng Dokumento",
            subtitle: "Kontrolin ang dark mode, app language, receipt language, kulay, at print layout.",
            appTheme: "Tema ng App",
            themeHelp: "Piliin kung paano titingnan ang dashboard ng naka-login na user.",
            appAppearance: "App Appearance",
            darkMode: "Dark Mode",
            lightMode: "Light Mode",
            languageControls: "Language Controls",
            languageHelp: "Ang app language ay para sa dashboard. Ang invoice/receipt language ay para sa customer documents.",
            appLanguage: "App Interface Language",
            receiptLanguage: "Invoice / Receipt Language",
            receiptStyling: "Receipt at Print Styling",
            stylingHelp: "Ang settings na ito ay para sa invoice/receipt preview at print output, hindi dashboard colors.",
            accentColor: "Receipt Accent Color",
            textColor: "Receipt Text Color",
            printLayout: "Print Layout",
            save: "I-save ang Appearance Settings"
        },
        account: {
            title: "Account at Privacy",
            subtitle: "I-manage ang privacy, deletion requests, at account-level data controls.",
            deleteTitle: "Delete Account / Data",
            deleteWarning: "Pagkalipas ng 7 araw, permanenteng mabubura ang data mo. WALA nang paraan para ma-restore ito, kahit admin/dev team.",
            deleteHelp: "Gamitin ang button sa ibaba para buksan ang deletion modal. Pwede kang pumili ng 7-day grace period o immediate permanent deletion.",
            deleteButton: "Delete Account",
            paymentPolicy: "Payment Data Policy",
            noCardStorage: "Walang local card storage",
            noCardStorageBody: "Hindi nagse-save ang Valora EM ng card numbers, expiry dates, CVCs, o wallet credentials.",
            manualRenewal: "Manual renewal by default",
            manualRenewalBody: "Hindi automatic ang charge ng paid plans maliban kung pinili ng user ang EasyPay auto-renewal sa checkout."
        },
        featureRequests: {
            title: "Feature Requests",
            subtitle: "Magpadala ng ideas, bug reports, at improvement requests diretso sa Valora EM owner.",
            sendTitle: "Magpadala ng Feature Request",
            sendHelp: "Sabihin kung ano ang gusto mong ma-improve o maidagdag.",
            label: "Feature Request",
            submit: "Send Feature Request",
            includeTitle: "Ano ang isasama"
        },
        bugReport: {
            title: "Bug Report",
            subtitle: "Mag-submit ng support ticket at tingnan ang replies mula sa Valora EM support.",
            panelTitle: "In-App Bug Reporting System",
            help: "Gumawa ng ticket na may subject at details, tapos tingnan ang conversation thread para sa responses.",
            create: "Create Ticket",
            sendReply: "Send Reply",
            noTickets: "Wala pang tickets.",
            selectTicket: "Pumili ng ticket para makita ang conversation."
        },
        offline: {
            title: "Offline Mode",
            subtitle: "Gumawa ng invoices at mag-print ng PDFs kahit mahina ang internet.",
            panelTitle: "Paano gumagana ang offline access"
        },
        admin: {
            title: "Owner Admin Dashboard",
            subtitle: "Subaybayan ang app revenue, customer upgrades, payment settings, at support requests.",
            gatewayTab: "Dashboard at Gateway Settings",
            ticketsTab: "Bug Reports / Support Tickets",
            paymentsTitle: "Recent App Payments",
            featureInboxTitle: "Customer Feature Requests"
        },
        billing: {
            title: "Subscription",
            subtitle: "Piliin ang plan na bagay sa workflow ng store mo.",
            monthly: "Monthly",
            yearly: "Yearly"
        },
        creator: {
            saveInvoice: "I-save ang Dokumento",
            savePdf: "Save as PDF",
            printInvoice: "Print",
            addLineItem: "Magdagdag ng Line Item"
        },
        common: {
            beginTutorial: "Simulan ang Tutorial",
            openLearningCenter: "Buksan ang Learning Center",
            newInvoiceEstimate: "Bagong Invoice/Estimate",
            sendFeedback: "Send Feedback",
            viewPlans: "Tingnan ang Plans"
        },
        placeholders: {
            betaFeedback: "Halimbawa: Mahirap basahin ang thermal print preview sa phone ko.",
            featureRequest: "Halimbawa: Paki-add ang invoice reminder emails, customer read receipts, o automatic monthly reports.",
            ticketSubject: "Subject",
            ticketMessage: "Details: ano ang nangyari, anong page, at anong device ang ginamit mo.",
            ticketReply: "Sumulat ng reply...",
            customLanguage: "Mag-type ng ibang document language kung wala sa listahan"
        },
        messages: {
            appearanceSaved: "Na-save ang appearance at document settings.",
            languageChanged: "Na-update ang app language. I-click ang Save Appearance Settings para ma-sync sa account mo."
        }
    },
    es: {
        sidebar: {
            dashboard: "Panel",
            learning: "Aprendizaje",
            createInvoice: "Crear factura",
            invoiceHistory: "Historial de facturas",
            expenses: "Gastos",
            trashBin: "Papelera",
            clientsList: "Clientes",
            settings: "Configuracion",
            appearance: "Apariencia",
            account: "Cuenta",
            featureRequests: "Solicitudes",
            featureInbox: "Bandeja de solicitudes",
            bugReport: "Reportar error",
            offlineMode: "Modo sin conexion",
            admin: "Admin",
            subscription: "Suscripcion",
            logoutAccount: "Cerrar sesion"
        },
        dashboard: {
            title: "Panel SaaS",
            subtitle: "Controle facturas, clientes e ingresos del negocio desde un panel simple.",
            quickStart: "Inicio rapido",
            newUserTitle: "Nuevo en Valora EM?",
            newUserBody: "Tome el tutorial corto o abra el Centro de aprendizaje para configurar su tienda, crear facturas, imprimir PDF y ver ganancias.",
            betaFeedback: "Comentarios beta",
            feedbackTitle: "Ayude a mejorar Valora EM antes del lanzamiento",
            feedbackBody: "Cuente que resulta confuso, roto o faltante. Su mensaje ira al panel del propietario para revision.",
            totalRevenue: "Ingresos totales",
            totalPaid: "Total pagado",
            unpaidBalance: "Saldo pendiente",
            totalInvoices: "Facturas totales"
        },
        learning: {
            title: "Centro de aprendizaje",
            subtitle: "Siga una guia simple para aprender Valora EM mas rapido."
        },
        settings: {
            title: "Configuracion del negocio",
            subtitle: "Configure el perfil de la tienda, moneda, identidad para clientes y catalogo de articulos.",
            businessDetails: "Datos del negocio",
            saveStore: "Guardar configuracion"
        },
        appearance: {
            title: "Apariencia y diseno de documentos",
            subtitle: "Controle modo oscuro, idioma de la app, idioma de recibos, colores y diseno de impresion.",
            appTheme: "Tema de la app",
            themeHelp: "Elija como se vera el panel para el usuario conectado.",
            appAppearance: "Apariencia de la app",
            darkMode: "Modo oscuro",
            lightMode: "Modo claro",
            languageControls: "Controles de idioma",
            languageHelp: "El idioma de la app es para el panel. El idioma de factura/recibo es para documentos del cliente.",
            appLanguage: "Idioma de la interfaz",
            receiptLanguage: "Idioma de factura / recibo",
            receiptStyling: "Estilo de recibo e impresion",
            stylingHelp: "Estos ajustes afectan la vista previa y la impresion, no los colores del panel.",
            accentColor: "Color de acento del recibo",
            textColor: "Color del texto del recibo",
            printLayout: "Diseno de impresion",
            save: "Guardar apariencia"
        },
        account: {
            title: "Cuenta y privacidad",
            subtitle: "Administre privacidad, solicitudes de eliminacion y controles de datos de la cuenta.",
            deleteTitle: "Eliminar cuenta / datos",
            deleteWarning: "Despues de 7 dias, sus datos se borraran permanentemente. NO hay forma de restaurar su cuenta, ni siquiera por el equipo admin/dev.",
            deleteHelp: "Use el boton de abajo para abrir el modal de eliminacion. Puede elegir el periodo de gracia de 7 dias o eliminacion permanente inmediata.",
            deleteButton: "Eliminar cuenta",
            paymentPolicy: "Politica de datos de pago",
            noCardStorage: "Sin almacenamiento local de tarjetas",
            noCardStorageBody: "Valora EM no guarda numeros de tarjeta, fechas de vencimiento, CVC ni credenciales de billetera.",
            manualRenewal: "Renovacion manual por defecto",
            manualRenewalBody: "Los planes pagados no cobran automaticamente salvo que el usuario active EasyPay en el checkout."
        },
        featureRequests: {
            title: "Solicitudes de funciones",
            subtitle: "Envie ideas, errores y mejoras directamente al propietario de Valora EM.",
            sendTitle: "Enviar solicitud",
            sendHelp: "Cuente que desea mejorar o agregar.",
            label: "Solicitud de funcion",
            submit: "Enviar solicitud",
            includeTitle: "Que incluir"
        },
        bugReport: {
            title: "Reportar error",
            subtitle: "Envie un ticket de soporte y vea respuestas del equipo de Valora EM.",
            panelTitle: "Sistema de reportes en la app",
            help: "Cree un ticket con asunto y detalles, luego revise el hilo para ver respuestas.",
            create: "Crear ticket",
            sendReply: "Enviar respuesta",
            noTickets: "No hay tickets todavia.",
            selectTicket: "Seleccione un ticket para ver la conversacion."
        },
        offline: {
            title: "Modo sin conexion",
            subtitle: "Cree facturas e imprima PDF incluso con internet inestable.",
            panelTitle: "Como funciona el acceso sin conexion"
        },
        admin: {
            title: "Panel de propietario",
            subtitle: "Controle ingresos de la app, mejoras de clientes, ajustes de pago y soporte.",
            gatewayTab: "Panel y pasarelas de pago",
            ticketsTab: "Errores / tickets de soporte",
            paymentsTitle: "Pagos recientes",
            featureInboxTitle: "Solicitudes de clientes"
        },
        billing: {
            title: "Suscripcion",
            subtitle: "Elija el plan que se adapta al flujo de su tienda.",
            monthly: "Mensual",
            yearly: "Anual"
        },
        creator: {
            saveInvoice: "Guardar documento",
            printInvoice: "Imprimir / guardar PDF",
            addLineItem: "Agregar item"
        },
        common: {
            beginTutorial: "Iniciar tutorial",
            openLearningCenter: "Abrir aprendizaje",
            newInvoiceEstimate: "Nueva factura/cotizacion",
            sendFeedback: "Enviar comentario",
            viewPlans: "Ver planes"
        },
        placeholders: {
            betaFeedback: "Ejemplo: La vista termica es dificil de leer en mi telefono.",
            featureRequest: "Ejemplo: Agreguen recordatorios por email, recibos leidos o reportes mensuales.",
            ticketSubject: "Asunto",
            ticketMessage: "Detalles: que paso, en que pagina estaba y que dispositivo uso.",
            ticketReply: "Escriba una respuesta...",
            customLanguage: "Escriba otro idioma de documento si no esta en la lista"
        },
        messages: {
            appearanceSaved: "Apariencia y ajustes de documento guardados.",
            languageChanged: "Idioma de la app actualizado. Haga clic en Guardar apariencia para sincronizarlo."
        }
    },
    fr: {
        sidebar: {
            dashboard: "Tableau de bord",
            learning: "Apprentissage",
            createInvoice: "Creer une facture",
            invoiceHistory: "Historique des factures",
            expenses: "Depenses",
            trashBin: "Corbeille",
            clientsList: "Clients",
            settings: "Parametres",
            appearance: "Apparence",
            account: "Compte",
            featureRequests: "Demandes",
            featureInbox: "Boite de demandes",
            bugReport: "Signaler un bug",
            offlineMode: "Mode hors ligne",
            admin: "Admin",
            subscription: "Abonnement",
            logoutAccount: "Se deconnecter"
        },
        dashboard: {
            title: "Tableau de bord SaaS",
            subtitle: "Suivez les factures, les clients et les revenus depuis un tableau simple.",
            quickStart: "Demarrage rapide",
            newUserTitle: "Nouveau sur Valora EM ?",
            newUserBody: "Lancez le court tutoriel ou ouvrez le centre d'apprentissage pour configurer votre boutique, creer des factures, imprimer des PDF et suivre le profit.",
            betaFeedback: "Retour beta",
            feedbackTitle: "Aidez a ameliorer Valora EM avant le lancement",
            feedbackBody: "Dites-nous ce qui est confus, casse ou manquant. Votre message sera envoye au tableau proprietaire.",
            totalRevenue: "Revenus totaux",
            totalPaid: "Total paye",
            unpaidBalance: "Solde impaye",
            totalInvoices: "Total des factures"
        },
        learning: {
            title: "Centre d'apprentissage",
            subtitle: "Suivez un parcours simple pour apprendre Valora EM plus vite."
        },
        settings: {
            title: "Parametres de l'entreprise",
            subtitle: "Configurez le profil, la devise, l'identite client et le catalogue d'articles.",
            businessDetails: "Details de l'entreprise",
            saveStore: "Enregistrer les parametres"
        },
        appearance: {
            title: "Apparence et design des documents",
            subtitle: "Controlez le mode sombre, les langues, les couleurs et la mise en page d'impression.",
            appTheme: "Theme de l'app",
            themeHelp: "Choisissez l'apparence du tableau pour l'utilisateur connecte.",
            appAppearance: "Apparence de l'app",
            darkMode: "Mode sombre",
            lightMode: "Mode clair",
            languageControls: "Langues",
            languageHelp: "La langue de l'app concerne le tableau. La langue facture/recu concerne les documents clients.",
            appLanguage: "Langue de l'interface",
            receiptLanguage: "Langue facture / recu",
            receiptStyling: "Style recu et impression",
            stylingHelp: "Ces reglages affectent l'apercu et l'impression, pas les couleurs du tableau.",
            accentColor: "Couleur d'accent du recu",
            textColor: "Couleur du texte du recu",
            printLayout: "Mise en page d'impression",
            save: "Enregistrer l'apparence"
        },
        account: {
            title: "Compte et confidentialite",
            subtitle: "Gerez la confidentialite, les demandes de suppression et les controles de donnees.",
            deleteTitle: "Supprimer le compte / les donnees",
            deleteWarning: "Apres 7 jours, vos donnees seront supprimees definitivement. Il n'y a AUCUN moyen de restaurer le compte, meme pour l'equipe admin/dev.",
            deleteHelp: "Utilisez le bouton ci-dessous pour ouvrir la suppression. Choisissez 7 jours de delai ou suppression permanente immediate.",
            deleteButton: "Supprimer le compte",
            paymentPolicy: "Politique des donnees de paiement",
            noCardStorage: "Aucun stockage local de carte",
            noCardStorageBody: "Valora EM ne stocke pas les numeros de carte, dates d'expiration, CVC ou identifiants de portefeuille.",
            manualRenewal: "Renouvellement manuel par defaut",
            manualRenewalBody: "Les plans payants ne debitent pas automatiquement sauf si EasyPay est active au paiement."
        },
        featureRequests: {
            title: "Demandes de fonctions",
            subtitle: "Envoyez idees, bugs et ameliorations directement au proprietaire de Valora EM.",
            sendTitle: "Envoyer une demande",
            sendHelp: "Dites-nous ce que vous voulez ameliorer ou ajouter.",
            label: "Demande de fonction",
            submit: "Envoyer la demande",
            includeTitle: "Que faut-il inclure"
        },
        bugReport: {
            title: "Signaler un bug",
            subtitle: "Envoyez un ticket support et suivez les reponses de Valora EM.",
            panelTitle: "Systeme de signalement integre",
            help: "Creez un ticket avec sujet et details, puis consultez le fil de conversation.",
            create: "Creer un ticket",
            sendReply: "Envoyer la reponse",
            noTickets: "Aucun ticket pour le moment.",
            selectTicket: "Selectionnez un ticket pour voir la conversation."
        },
        offline: {
            title: "Mode hors ligne",
            subtitle: "Creez des factures et imprimez des PDF meme avec internet instable.",
            panelTitle: "Fonctionnement de l'acces hors ligne"
        },
        admin: {
            title: "Tableau de bord proprietaire",
            subtitle: "Suivez revenus, mises a niveau, parametres de paiement et support.",
            gatewayTab: "Tableau et passerelles",
            ticketsTab: "Bugs / tickets support",
            paymentsTitle: "Paiements recents",
            featureInboxTitle: "Demandes clients"
        },
        billing: {
            title: "Abonnement",
            subtitle: "Choisissez le plan adapte au flux de votre boutique.",
            monthly: "Mensuel",
            yearly: "Annuel"
        },
        creator: {
            saveInvoice: "Enregistrer le document",
            printInvoice: "Imprimer / enregistrer PDF",
            addLineItem: "Ajouter une ligne"
        },
        common: {
            beginTutorial: "Commencer le tutoriel",
            openLearningCenter: "Ouvrir l'apprentissage",
            newInvoiceEstimate: "Nouvelle facture/devis",
            sendFeedback: "Envoyer un retour",
            viewPlans: "Voir les plans"
        },
        placeholders: {
            betaFeedback: "Exemple : l'apercu thermique est difficile a lire sur mon telephone.",
            featureRequest: "Exemple : ajoutez des rappels email, recus lus ou rapports mensuels.",
            ticketSubject: "Sujet",
            ticketMessage: "Details : ce qui s'est passe, la page et l'appareil utilise.",
            ticketReply: "Ecrire une reponse...",
            customLanguage: "Tapez une autre langue de document si elle n'est pas listee"
        },
        messages: {
            appearanceSaved: "Apparence et parametres de document enregistres.",
            languageChanged: "Langue de l'app mise a jour. Cliquez sur Enregistrer l'apparence pour synchroniser."
        }
    },
    de: {
        sidebar: {
            dashboard: "Dashboard",
            learning: "Lernen",
            createInvoice: "Rechnung erstellen",
            invoiceHistory: "Rechnungsverlauf",
            expenses: "Ausgaben",
            trashBin: "Papierkorb",
            clientsList: "Kundenliste",
            settings: "Einstellungen",
            appearance: "Darstellung",
            account: "Konto",
            featureRequests: "Funktionswunsche",
            featureInbox: "Wunsch-Postfach",
            bugReport: "Fehler melden",
            offlineMode: "Offline-Modus",
            admin: "Admin",
            subscription: "Abonnement",
            logoutAccount: "Abmelden"
        },
        dashboard: {
            title: "SaaS Dashboard",
            subtitle: "Verfolgen Sie Rechnungen, Kunden und Einnahmen in einem einfachen Dashboard.",
            quickStart: "Schnellstart",
            newUserTitle: "Neu bei Valora EM?",
            newUserBody: "Starten Sie das kurze Tutorial oder offnen Sie das Lernzentrum, um Shop, Rechnungen, PDF-Druck und Gewinnverfolgung zu lernen.",
            betaFeedback: "Beta Feedback",
            feedbackTitle: "Helfen Sie, Valora EM vor dem Start zu verbessern",
            feedbackBody: "Sagen Sie uns, was verwirrend, defekt oder fehlend ist. Ihre Nachricht geht an das Owner Dashboard.",
            totalRevenue: "Gesamtumsatz",
            totalPaid: "Bezahlt gesamt",
            unpaidBalance: "Offener Saldo",
            totalInvoices: "Rechnungen gesamt"
        },
        learning: {
            title: "Lernzentrum",
            subtitle: "Folgen Sie einem einfachen Pfad, um Valora EM schneller zu lernen."
        },
        settings: {
            title: "Geschaftseinstellungen",
            subtitle: "Richten Sie Shop-Profil, Wahrung, Kundenidentitat und Artikelkatalog ein.",
            businessDetails: "Geschaftsdaten",
            saveStore: "Einstellungen speichern"
        },
        appearance: {
            title: "Darstellung und Dokumentdesign",
            subtitle: "Steuern Sie Dark Mode, App-Sprache, Belegsprache, Farben und Drucklayout.",
            appTheme: "App-Theme",
            themeHelp: "Wahlen Sie, wie das Dashboard fur den angemeldeten Benutzer aussieht.",
            appAppearance: "App-Darstellung",
            darkMode: "Dunkler Modus",
            lightMode: "Heller Modus",
            languageControls: "Sprachsteuerung",
            languageHelp: "Die App-Sprache gilt fur das Dashboard. Die Rechnungs-/Belegsprache gilt fur Kundendokumente.",
            appLanguage: "Sprache der Benutzeroberflache",
            receiptLanguage: "Rechnungs-/Belegsprache",
            receiptStyling: "Beleg- und Druckstil",
            stylingHelp: "Diese Einstellungen betreffen Vorschau und Druck, nicht die Dashboard-Farben.",
            accentColor: "Akzentfarbe des Belegs",
            textColor: "Textfarbe des Belegs",
            printLayout: "Drucklayout",
            save: "Darstellung speichern"
        },
        account: {
            title: "Konto und Datenschutz",
            subtitle: "Verwalten Sie Datenschutz, Loschanfragen und Kontodaten.",
            deleteTitle: "Konto / Daten loschen",
            deleteWarning: "Nach 7 Tagen werden Ihre Daten dauerhaft geloscht. Es gibt KEINE Moglichkeit zur Wiederherstellung, auch nicht durch Admin/Dev-Team.",
            deleteHelp: "Offnen Sie unten den Loschdialog. Wahlen Sie 7 Tage Schonfrist oder sofortige dauerhafte Loschung.",
            deleteButton: "Konto loschen",
            paymentPolicy: "Zahlungsdaten-Richtlinie",
            noCardStorage: "Keine lokale Kartenspeicherung",
            noCardStorageBody: "Valora EM speichert keine Kartennummern, Ablaufdaten, CVCs oder Wallet-Zugangsdaten.",
            manualRenewal: "Manuelle Verlangerung standardmassig",
            manualRenewalBody: "Bezahlte Plane belasten nicht automatisch, ausser EasyPay wird beim Checkout aktiviert."
        },
        featureRequests: {
            title: "Funktionswunsche",
            subtitle: "Senden Sie Ideen, Fehler und Verbesserungen direkt an den Valora EM Owner.",
            sendTitle: "Funktionswunsch senden",
            sendHelp: "Sagen Sie uns, was verbessert oder hinzugefugt werden soll.",
            label: "Funktionswunsch",
            submit: "Wunsch senden",
            includeTitle: "Was angeben"
        },
        bugReport: {
            title: "Fehler melden",
            subtitle: "Senden Sie ein Support-Ticket und verfolgen Sie Antworten von Valora EM.",
            panelTitle: "In-App Fehlermeldesystem",
            help: "Erstellen Sie ein Ticket mit Betreff und Details, dann verfolgen Sie den Verlauf.",
            create: "Ticket erstellen",
            sendReply: "Antwort senden",
            noTickets: "Noch keine Tickets.",
            selectTicket: "Wahlen Sie ein Ticket, um den Verlauf zu sehen."
        },
        offline: {
            title: "Offline-Modus",
            subtitle: "Erstellen Sie Rechnungen und drucken Sie PDFs auch bei instabilem Internet.",
            panelTitle: "So funktioniert Offline-Zugriff"
        },
        admin: {
            title: "Owner Admin Dashboard",
            subtitle: "Verfolgen Sie App-Umsatz, Kunden-Upgrades, Zahlungseinstellungen und Support.",
            gatewayTab: "Dashboard und Zahlungs-Gateways",
            ticketsTab: "Fehler / Support-Tickets",
            paymentsTitle: "Aktuelle App-Zahlungen",
            featureInboxTitle: "Kundenwunsche"
        },
        billing: {
            title: "Abonnement",
            subtitle: "Wahlen Sie den Plan, der zu Ihrem Shop passt.",
            monthly: "Monatlich",
            yearly: "Jahrlich"
        },
        creator: {
            saveInvoice: "Dokument speichern",
            printInvoice: "Drucken / PDF speichern",
            addLineItem: "Position hinzufugen"
        },
        common: {
            beginTutorial: "Tutorial starten",
            openLearningCenter: "Lernzentrum offnen",
            newInvoiceEstimate: "Neue Rechnung/Angebot",
            sendFeedback: "Feedback senden",
            viewPlans: "Plane ansehen"
        },
        placeholders: {
            betaFeedback: "Beispiel: Die Thermodruck-Vorschau ist auf meinem Telefon schwer lesbar.",
            featureRequest: "Beispiel: Bitte Erinnerungs-E-Mails, Lesebestatigungen oder Monatsberichte hinzufugen.",
            ticketSubject: "Betreff",
            ticketMessage: "Details: Was ist passiert, welche Seite und welches Gerat wurde verwendet.",
            ticketReply: "Antwort schreiben...",
            customLanguage: "Geben Sie eine andere Dokumentsprache ein, falls sie nicht aufgefuhrt ist"
        },
        messages: {
            appearanceSaved: "Darstellung und Dokumenteinstellungen gespeichert.",
            languageChanged: "App-Sprache aktualisiert. Klicken Sie auf Darstellung speichern, um zu synchronisieren."
        }
    },
    ja: {
        sidebar: {
            dashboard: "ダッシュボード",
            learning: "学習",
            createInvoice: "請求書を作成",
            invoiceHistory: "請求書履歴",
            expenses: "経費",
            trashBin: "ゴミ箱",
            clientsList: "顧客一覧",
            settings: "設定",
            appearance: "表示設定",
            account: "アカウント",
            featureRequests: "機能リクエスト",
            featureInbox: "リクエスト受信箱",
            bugReport: "不具合報告",
            offlineMode: "オフラインモード",
            admin: "管理者",
            subscription: "サブスクリプション",
            logoutAccount: "ログアウト"
        },
        dashboard: {
            title: "SaaS ダッシュボード",
            subtitle: "請求書、顧客、売上をひとつの画面で管理できます。",
            quickStart: "クイックスタート",
            newUserTitle: "Valora EM は初めてですか？",
            newUserBody: "短いチュートリアルまたは学習センターで、店舗設定、請求書作成、PDF印刷、利益確認を学べます。",
            betaFeedback: "ベータフィードバック",
            feedbackTitle: "正式公開前の Valora EM 改善にご協力ください",
            feedbackBody: "わかりにくい点、不具合、不足している機能をお知らせください。メッセージはオーナーダッシュボードに届きます。",
            totalRevenue: "総収益",
            totalPaid: "支払済み合計",
            unpaidBalance: "未払い残高",
            totalInvoices: "請求書合計"
        },
        learning: {
            title: "学習センター",
            subtitle: "シンプルなガイドで Valora EM をより早く学べます。"
        },
        settings: {
            title: "事業設定",
            subtitle: "店舗プロフィール、通貨、顧客向け情報、商品カタログを設定します。",
            businessDetails: "事業情報",
            saveStore: "店舗設定を保存"
        },
        appearance: {
            title: "表示と書類デザイン",
            subtitle: "ダークモード、アプリ言語、請求書言語、色、印刷レイアウトを設定します。",
            appTheme: "アプリテーマ",
            themeHelp: "ログイン中のユーザーに表示されるダッシュボードの見た目を選びます。",
            appAppearance: "アプリ表示",
            darkMode: "ダークモード",
            lightMode: "ライトモード",
            languageControls: "言語設定",
            languageHelp: "アプリ言語はダッシュボード用です。請求書/領収書言語は顧客向け書類用です。",
            appLanguage: "アプリ表示言語",
            receiptLanguage: "請求書 / 領収書の言語",
            receiptStyling: "領収書と印刷スタイル",
            stylingHelp: "これらの設定はプレビューと印刷に反映され、ダッシュボード色には影響しません。",
            accentColor: "領収書アクセントカラー",
            textColor: "領収書テキストカラー",
            printLayout: "印刷レイアウト",
            save: "表示設定を保存"
        },
        account: {
            title: "アカウントとプライバシー",
            subtitle: "プライバシー、削除依頼、アカウントデータ設定を管理します。",
            deleteTitle: "アカウント / データ削除",
            deleteWarning: "7日後、データは完全に削除されます。管理者や開発チームでも復元できません。",
            deleteHelp: "下のボタンで削除画面を開きます。7日間の猶予または即時完全削除を選べます。",
            deleteButton: "アカウントを削除",
            paymentPolicy: "支払いデータポリシー",
            noCardStorage: "カード情報をローカル保存しません",
            noCardStorageBody: "Valora EM はカード番号、有効期限、CVC、ウォレット認証情報を保存しません。",
            manualRenewal: "標準は手動更新",
            manualRenewalBody: "EasyPay 自動更新を明示的に選択しない限り、有料プランは自動課金されません。"
        },
        featureRequests: {
            title: "機能リクエスト",
            subtitle: "アイデア、不具合、改善要望を Valora EM オーナーへ直接送信します。",
            sendTitle: "機能リクエストを送信",
            sendHelp: "改善または追加してほしい内容を入力してください。",
            label: "機能リクエスト",
            submit: "リクエスト送信",
            includeTitle: "含める内容"
        },
        bugReport: {
            title: "不具合報告",
            subtitle: "サポートチケットを送信し、Valora EM からの返信を確認できます。",
            panelTitle: "アプリ内不具合報告システム",
            help: "件名と詳細を入力してチケットを作成し、会話スレッドで返信を確認します。",
            create: "チケット作成",
            sendReply: "返信を送信",
            noTickets: "チケットはまだありません。",
            selectTicket: "会話を見るにはチケットを選択してください。"
        },
        offline: {
            title: "オフラインモード",
            subtitle: "インターネットが不安定でも請求書作成とPDF印刷ができます。",
            panelTitle: "オフラインアクセスの仕組み"
        },
        admin: {
            title: "オーナー管理ダッシュボード",
            subtitle: "アプリ収益、顧客アップグレード、決済設定、サポートを管理します。",
            gatewayTab: "ダッシュボードと決済設定",
            ticketsTab: "不具合 / サポートチケット",
            paymentsTitle: "最近のアプリ支払い",
            featureInboxTitle: "顧客機能リクエスト"
        },
        billing: {
            title: "サブスクリプション",
            subtitle: "店舗の運用に合うプランを選択してください。",
            monthly: "月額",
            yearly: "年額"
        },
        creator: {
            saveInvoice: "書類を保存",
            printInvoice: "印刷 / PDF保存",
            addLineItem: "明細を追加"
        },
        common: {
            beginTutorial: "チュートリアル開始",
            openLearningCenter: "学習センターを開く",
            newInvoiceEstimate: "新規請求書/見積書",
            sendFeedback: "フィードバック送信",
            viewPlans: "プランを見る"
        },
        placeholders: {
            betaFeedback: "例：スマホでサーマル印刷プレビューが読みにくいです。",
            featureRequest: "例：請求リマインダー、既読確認、月次レポートを追加してください。",
            ticketSubject: "件名",
            ticketMessage: "詳細：何が起きたか、どのページか、使用した端末を入力してください。",
            ticketReply: "返信を書く...",
            customLanguage: "一覧にない書類言語を入力してください"
        },
        messages: {
            appearanceSaved: "表示と書類設定を保存しました。",
            languageChanged: "アプリ言語を更新しました。アカウントに同期するには表示設定を保存してください。"
        }
    },
    ko: {
        sidebar: {
            dashboard: "대시보드",
            learning: "학습",
            createInvoice: "인보이스 작성",
            invoiceHistory: "인보이스 기록",
            expenses: "비용",
            trashBin: "휴지통",
            clientsList: "고객 목록",
            settings: "설정",
            appearance: "화면 설정",
            account: "계정",
            featureRequests: "기능 요청",
            featureInbox: "요청함",
            bugReport: "버그 신고",
            offlineMode: "오프라인 모드",
            admin: "관리자",
            subscription: "구독",
            logoutAccount: "로그아웃"
        },
        dashboard: {
            title: "SaaS 대시보드",
            subtitle: "인보이스, 고객, 사업 수입을 하나의 간단한 대시보드에서 확인하세요.",
            quickStart: "빠른 시작",
            newUserTitle: "Valora EM이 처음인가요?",
            newUserBody: "짧은 튜토리얼이나 학습 센터에서 매장 설정, 인보이스 작성, PDF 인쇄, 수익 추적 방법을 배울 수 있습니다.",
            betaFeedback: "베타 피드백",
            feedbackTitle: "출시 전 Valora EM 개선을 도와주세요",
            feedbackBody: "헷갈리거나 고장났거나 부족한 부분을 알려주세요. 메시지는 관리자 대시보드로 전달됩니다.",
            totalRevenue: "총수익",
            totalPaid: "결제 완료",
            unpaidBalance: "미결제 잔액",
            totalInvoices: "총 인보이스"
        },
        learning: {
            title: "학습 센터",
            subtitle: "간단한 안내를 따라 Valora EM을 더 빠르게 익히세요."
        },
        settings: {
            title: "사업 설정",
            subtitle: "매장 프로필, 통화, 고객용 정보, 저장된 상품 카탈로그를 설정하세요.",
            businessDetails: "사업 정보",
            saveStore: "매장 설정 저장"
        },
        appearance: {
            title: "화면 및 문서 디자인",
            subtitle: "다크 모드, 앱 언어, 영수증 언어, 색상, 인쇄 레이아웃을 설정하세요.",
            appTheme: "앱 테마",
            themeHelp: "로그인한 사용자에게 보이는 대시보드 모양을 선택하세요.",
            appAppearance: "앱 표시",
            darkMode: "다크 모드",
            lightMode: "라이트 모드",
            languageControls: "언어 설정",
            languageHelp: "앱 언어는 대시보드용입니다. 인보이스/영수증 언어는 고객 문서용입니다.",
            appLanguage: "앱 인터페이스 언어",
            receiptLanguage: "인보이스 / 영수증 언어",
            receiptStyling: "영수증 및 인쇄 스타일",
            stylingHelp: "이 설정은 미리보기와 인쇄물에 적용되며 대시보드 색상에는 적용되지 않습니다.",
            accentColor: "영수증 강조 색상",
            textColor: "영수증 글자 색상",
            printLayout: "인쇄 레이아웃",
            save: "화면 설정 저장"
        },
        account: {
            title: "계정 및 개인정보",
            subtitle: "개인정보, 삭제 요청, 계정 데이터 설정을 관리하세요.",
            deleteTitle: "계정 / 데이터 삭제",
            deleteWarning: "7일 후 데이터가 영구 삭제됩니다. 관리자나 개발팀도 복구할 수 없습니다.",
            deleteHelp: "아래 버튼으로 삭제 모달을 열고 7일 유예 기간 또는 즉시 영구 삭제를 선택하세요.",
            deleteButton: "계정 삭제",
            paymentPolicy: "결제 데이터 정책",
            noCardStorage: "카드 정보 로컬 저장 없음",
            noCardStorageBody: "Valora EM은 카드 번호, 만료일, CVC, 지갑 인증 정보를 저장하지 않습니다.",
            manualRenewal: "기본은 수동 갱신",
            manualRenewalBody: "사용자가 결제 시 EasyPay 자동 갱신을 선택하지 않으면 유료 플랜은 자동 청구되지 않습니다."
        },
        featureRequests: {
            title: "기능 요청",
            subtitle: "아이디어, 버그, 개선 요청을 Valora EM 소유자에게 직접 보내세요.",
            sendTitle: "기능 요청 보내기",
            sendHelp: "개선하거나 추가하고 싶은 내용을 알려주세요.",
            label: "기능 요청",
            submit: "요청 보내기",
            includeTitle: "포함할 내용"
        },
        bugReport: {
            title: "버그 신고",
            subtitle: "지원 티켓을 제출하고 Valora EM 지원팀의 답변을 확인하세요.",
            panelTitle: "앱 내 버그 신고 시스템",
            help: "제목과 세부 내용을 입력해 티켓을 만들고 대화 스레드에서 답변을 확인하세요.",
            create: "티켓 만들기",
            sendReply: "답장 보내기",
            noTickets: "아직 티켓이 없습니다.",
            selectTicket: "대화를 보려면 티켓을 선택하세요."
        },
        offline: {
            title: "오프라인 모드",
            subtitle: "인터넷이 불안정해도 인보이스를 만들고 PDF를 인쇄할 수 있습니다.",
            panelTitle: "오프라인 접근 방식"
        },
        admin: {
            title: "소유자 관리자 대시보드",
            subtitle: "앱 수익, 고객 업그레이드, 결제 설정, 지원 요청을 관리하세요.",
            gatewayTab: "대시보드 및 결제 설정",
            ticketsTab: "버그 / 지원 티켓",
            paymentsTitle: "최근 앱 결제",
            featureInboxTitle: "고객 기능 요청"
        },
        billing: {
            title: "구독",
            subtitle: "매장 운영에 맞는 플랜을 선택하세요.",
            monthly: "월간",
            yearly: "연간"
        },
        creator: {
            saveInvoice: "문서 저장",
            printInvoice: "인쇄 / PDF 저장",
            addLineItem: "항목 추가"
        },
        common: {
            beginTutorial: "튜토리얼 시작",
            openLearningCenter: "학습 센터 열기",
            newInvoiceEstimate: "새 인보이스/견적서",
            sendFeedback: "피드백 보내기",
            viewPlans: "플랜 보기"
        },
        placeholders: {
            betaFeedback: "예: 휴대폰에서 열전사 인쇄 미리보기가 읽기 어렵습니다.",
            featureRequest: "예: 인보이스 알림 이메일, 고객 읽음 확인, 월간 보고서를 추가해주세요.",
            ticketSubject: "제목",
            ticketMessage: "세부 정보: 무슨 일이 있었는지, 어떤 페이지였는지, 어떤 기기를 사용했는지 적어주세요.",
            ticketReply: "답장을 입력하세요...",
            customLanguage: "목록에 없는 문서 언어를 입력하세요"
        },
        messages: {
            appearanceSaved: "화면 및 문서 설정이 저장되었습니다.",
            languageChanged: "앱 언어가 업데이트되었습니다. 계정에 동기화하려면 화면 설정 저장을 클릭하세요."
        }
    },
    zh: {
        sidebar: {
            dashboard: "仪表板",
            learning: "学习",
            createInvoice: "创建发票",
            invoiceHistory: "发票记录",
            expenses: "支出",
            trashBin: "回收站",
            clientsList: "客户列表",
            settings: "设置",
            appearance: "外观",
            account: "账户",
            featureRequests: "功能请求",
            featureInbox: "请求收件箱",
            bugReport: "错误报告",
            offlineMode: "离线模式",
            admin: "管理员",
            subscription: "订阅",
            logoutAccount: "退出登录"
        },
        dashboard: {
            title: "SaaS 仪表板",
            subtitle: "在一个简单的仪表板中跟踪发票、客户和业务收入。",
            quickStart: "快速开始",
            newUserTitle: "第一次使用 Valora EM？",
            newUserBody: "开始简短教程或打开学习中心，了解如何设置店铺、创建发票、打印 PDF 和跟踪利润。",
            betaFeedback: "测试反馈",
            feedbackTitle: "帮助我们在发布前改进 Valora EM",
            feedbackBody: "告诉我们哪些地方难懂、损坏或缺失。您的消息会发送到所有者仪表板。",
            totalRevenue: "总收入",
            totalPaid: "已付款总额",
            unpaidBalance: "未付余额",
            totalInvoices: "发票总数"
        },
        learning: {
            title: "学习中心",
            subtitle: "按照简单指南更快学会使用 Valora EM。"
        },
        settings: {
            title: "业务设置",
            subtitle: "设置店铺资料、货币、客户展示信息和商品目录。",
            businessDetails: "业务详情",
            saveStore: "保存店铺设置"
        },
        appearance: {
            title: "外观与文档设计",
            subtitle: "设置深色模式、应用语言、收据语言、颜色和打印布局。",
            appTheme: "应用主题",
            themeHelp: "选择登录用户看到的仪表板外观。",
            appAppearance: "应用外观",
            darkMode: "深色模式",
            lightMode: "浅色模式",
            languageControls: "语言设置",
            languageHelp: "应用语言用于仪表板。发票/收据语言用于客户文档。",
            appLanguage: "应用界面语言",
            receiptLanguage: "发票 / 收据语言",
            receiptStyling: "收据与打印样式",
            stylingHelp: "这些设置影响发票/收据预览和打印输出，不影响仪表板颜色。",
            accentColor: "收据强调色",
            textColor: "收据文字颜色",
            printLayout: "打印布局",
            save: "保存外观设置"
        },
        account: {
            title: "账户与隐私",
            subtitle: "管理隐私、删除请求和账户级数据控制。",
            deleteTitle: "删除账户 / 数据",
            deleteWarning: "7天后，您的数据将被永久删除。即使管理员或开发团队也无法恢复。",
            deleteHelp: "点击下方按钮打开删除窗口。您可以选择默认7天宽限期或立即永久删除。",
            deleteButton: "删除账户",
            paymentPolicy: "支付数据政策",
            noCardStorage: "不在本地保存银行卡信息",
            noCardStorageBody: "Valora EM 不保存卡号、有效期、CVC 或钱包凭证。",
            manualRenewal: "默认手动续费",
            manualRenewalBody: "除非用户在结账时明确启用 EasyPay 自动续费，否则付费计划不会自动扣款。"
        },
        featureRequests: {
            title: "功能请求",
            subtitle: "将想法、错误和改进建议直接发送给 Valora EM 所有者。",
            sendTitle: "发送功能请求",
            sendHelp: "告诉我们您想改进或添加什么。",
            label: "功能请求",
            submit: "发送请求",
            includeTitle: "应包含什么"
        },
        bugReport: {
            title: "错误报告",
            subtitle: "提交支持工单并查看 Valora EM 支持回复。",
            panelTitle: "应用内错误报告系统",
            help: "使用主题和详细信息创建工单，然后查看对话线程中的回复。",
            create: "创建工单",
            sendReply: "发送回复",
            noTickets: "还没有工单。",
            selectTicket: "选择一个工单以查看对话。"
        },
        offline: {
            title: "离线模式",
            subtitle: "即使网络不稳定，也可以创建发票并打印 PDF。",
            panelTitle: "离线访问如何工作"
        },
        admin: {
            title: "所有者管理仪表板",
            subtitle: "跟踪应用收入、客户升级、支付网关设置和支持请求。",
            gatewayTab: "仪表板与支付设置",
            ticketsTab: "错误 / 支持工单",
            paymentsTitle: "最近应用付款",
            featureInboxTitle: "客户功能请求"
        },
        billing: {
            title: "订阅",
            subtitle: "选择适合您店铺流程的计划。",
            monthly: "每月",
            yearly: "每年"
        },
        creator: {
            saveInvoice: "保存文档",
            printInvoice: "打印 / 保存 PDF",
            addLineItem: "添加项目"
        },
        common: {
            beginTutorial: "开始教程",
            openLearningCenter: "打开学习中心",
            newInvoiceEstimate: "新发票/估价单",
            sendFeedback: "发送反馈",
            viewPlans: "查看计划"
        },
        placeholders: {
            betaFeedback: "示例：手机上的热敏打印预览很难阅读。",
            featureRequest: "示例：请添加发票提醒邮件、客户已读回执或每月报告。",
            ticketSubject: "主题",
            ticketMessage: "详细信息：发生了什么、在哪个页面、使用了什么设备。",
            ticketReply: "写回复...",
            customLanguage: "如果列表中没有，请输入其他文档语言"
        },
        messages: {
            appearanceSaved: "外观和文档设置已保存。",
            languageChanged: "应用语言已更新。点击保存外观设置以同步到账户。"
        }
    },
    other: {}
};

const UI_TEXT_BINDINGS = [
    { selector: '.nav-item[data-tab="dashboard-tab"] .nav-link', key: "sidebar.dashboard", preserveIcon: true },
    { selector: '.nav-item[data-tab="learning-tab"] .nav-link', key: "sidebar.learning", preserveIcon: true },
    { selector: '.nav-item[data-tab="creator-tab"] .nav-link', key: "sidebar.createInvoice", preserveIcon: true },
    { selector: '.nav-item[data-tab="invoices-tab"] .nav-link', key: "sidebar.invoiceHistory", preserveIcon: true },
    { selector: '.nav-item[data-tab="expenses-tab"] .nav-link', key: "sidebar.expenses", preserveIcon: true },
    { selector: '.nav-item[data-tab="trash-tab"] .nav-link', key: "sidebar.trashBin", preserveIcon: true },
    { selector: '.nav-item[data-tab="clients-tab"] .nav-link', key: "sidebar.clientsList", preserveIcon: true },
    { selector: '.nav-item[data-tab="settings-tab"] .nav-link', key: "sidebar.settings", preserveIcon: true },
    { selector: '.nav-item[data-tab="appearance-tab"] .nav-link', key: "sidebar.appearance", preserveIcon: true },
    { selector: '.nav-item[data-tab="account-tab"] .nav-link', key: "sidebar.account", preserveIcon: true },
    { selector: '.nav-item[data-tab="bug-report-tab"] .nav-link', key: "sidebar.bugReport", preserveIcon: true },
    { selector: '.nav-item[data-tab="offline-tab"] .nav-link', key: "sidebar.offlineMode", preserveIcon: true },
    { selector: '.nav-item[data-tab="admin-tab"] .nav-link', key: "sidebar.admin", preserveIcon: true },
    { selector: '.nav-item[data-tab="billing-tab"] .nav-link', key: "sidebar.subscription", preserveIcon: true },
    { selector: "#logout-btn", key: "sidebar.logoutAccount", preserveIcon: true },
    { selector: "#mobile-drawer-logout", key: "sidebar.logoutAccount" },
    { selector: "#dashboard-tab .tab-title-container h1", key: "dashboard.title" },
    { selector: "#dashboard-tab .tab-title-container p", key: "dashboard.subtitle" },
    { selector: ".dashboard-actions .btn-primary", key: "common.newInvoiceEstimate", preserveIcon: true },
    { selector: ".onboarding-banner .learning-kicker", key: "dashboard.quickStart" },
    { selector: ".onboarding-banner h3", key: "dashboard.newUserTitle" },
    { selector: ".onboarding-banner p", key: "dashboard.newUserBody" },
    { selector: "[data-tutorial-start]", key: "common.beginTutorial" },
    { selector: "[data-learning-go]", key: "common.openLearningCenter" },
    { selector: "#launch-notice-banner .btn", key: "common.viewPlans" },
    { selector: ".beta-feedback-card .learning-kicker", key: "dashboard.betaFeedback" },
    { selector: ".beta-feedback-card h3", key: "dashboard.feedbackTitle" },
    { selector: ".beta-feedback-card p", key: "dashboard.feedbackBody" },
    { selector: "#submit-beta-feedback-btn", key: "common.sendFeedback" },
    { selector: ".metrics-grid .metric-card:nth-child(1) .metric-title", key: "dashboard.totalRevenue" },
    { selector: ".metrics-grid .metric-card:nth-child(2) .metric-title", key: "dashboard.totalPaid" },
    { selector: ".metrics-grid .metric-card:nth-child(3) .metric-title", key: "dashboard.unpaidBalance" },
    { selector: ".metrics-grid .metric-card:nth-child(4) .metric-title", key: "dashboard.totalInvoices" },
    { selector: "#learning-tab .tab-title-container h1", key: "learning.title" },
    { selector: "#learning-tab .tab-title-container p", key: "learning.subtitle" },
    { selector: "#settings-tab .tab-title-container h1", key: "settings.title" },
    { selector: "#settings-tab .tab-title-container p", key: "settings.subtitle" },
    { selector: "#settings-tab .panel-title:first-of-type", key: "settings.businessDetails" },
    { selector: "#save-store-settings-btn", key: "settings.saveStore" },
    { selector: "#appearance-tab .tab-title-container h1", key: "appearance.title" },
    { selector: "#appearance-tab .tab-title-container p", key: "appearance.subtitle" },
    { selector: "#appearance-tab .panel-card:nth-child(1) .panel-title", key: "appearance.appTheme" },
    { selector: "#appearance-tab .panel-card:nth-child(1) p", key: "appearance.themeHelp" },
    { selector: 'label[for="app-appearance"]', key: "appearance.appAppearance" },
    { selector: '#app-appearance option[value="dark"]', key: "appearance.darkMode" },
    { selector: '#app-appearance option[value="light"]', key: "appearance.lightMode" },
    { selector: "#appearance-tab .panel-card:nth-child(2) .panel-title", key: "appearance.languageControls" },
    { selector: "#appearance-tab .panel-card:nth-child(2) > p", key: "appearance.languageHelp" },
    { selector: 'label[for="app-interface-language"]', key: "appearance.appLanguage" },
    { selector: 'label[for="preferred-language"]', key: "appearance.receiptLanguage" },
    { selector: "#appearance-tab .panel-card:nth-child(3) .panel-title", key: "appearance.receiptStyling" },
    { selector: "#appearance-tab .panel-card:nth-child(3) > p", key: "appearance.stylingHelp" },
    { selector: "#appearance-tab .panel-card:nth-child(3) .form-group > label", key: "appearance.accentColor" },
    { selector: 'label[for="invoice-text-color"]', key: "appearance.textColor" },
    { selector: 'label[for="print-layout"]', key: "appearance.printLayout" },
    { selector: "#save-appearance-settings-btn", key: "appearance.save" },
    { selector: "#account-tab .tab-title-container h1", key: "account.title" },
    { selector: "#account-tab .tab-title-container p", key: "account.subtitle" },
    { selector: "#account-tab .danger-zone-card .panel-title", key: "account.deleteTitle" },
    { selector: "#account-tab .danger-warning-box", key: "account.deleteWarning" },
    { selector: "#account-tab .danger-zone-card > p", key: "account.deleteHelp" },
    { selector: "#open-account-delete-modal-btn", key: "account.deleteButton" },
    { selector: "#account-tab .panel-card:nth-child(2) .panel-title", key: "account.paymentPolicy" },
    { selector: "#account-tab .panel-card:nth-child(2) .feature-list div:nth-child(1) strong", key: "account.noCardStorage" },
    { selector: "#account-tab .panel-card:nth-child(2) .feature-list div:nth-child(1) p", key: "account.noCardStorageBody" },
    { selector: "#account-tab .panel-card:nth-child(2) .feature-list div:nth-child(2) strong", key: "account.manualRenewal" },
    { selector: "#account-tab .panel-card:nth-child(2) .feature-list div:nth-child(2) p", key: "account.manualRenewalBody" },
    { selector: "#feature-requests-tab .tab-title-container h1", key: "featureRequests.title" },
    { selector: "#feature-requests-tab .tab-title-container p", key: "featureRequests.subtitle" },
    { selector: "#feature-requests-tab .feature-request-settings-card .panel-title", key: "featureRequests.sendTitle" },
    { selector: "#feature-requests-tab .feature-request-settings-card > p", key: "featureRequests.sendHelp" },
    { selector: 'label[for="feature-request-text"]', key: "featureRequests.label" },
    { selector: "#submit-feature-request-btn", key: "featureRequests.submit" },
    { selector: "#feature-requests-tab .panel-card:nth-child(2) .panel-title", key: "featureRequests.includeTitle" },
    { selector: "#bug-report-tab .tab-title-container h1", key: "bugReport.title" },
    { selector: "#bug-report-tab .tab-title-container p", key: "bugReport.subtitle" },
    { selector: "#bug-report-tab .support-tickets-card .panel-title", key: "bugReport.panelTitle" },
    { selector: "#bug-report-tab .support-tickets-card > p", key: "bugReport.help" },
    { selector: "#create-ticket-btn", key: "bugReport.create" },
    { selector: "#send-ticket-message-btn", key: "bugReport.sendReply" },
    { selector: "#offline-tab .tab-title-container h1", key: "offline.title" },
    { selector: "#offline-tab .tab-title-container p", key: "offline.subtitle" },
    { selector: "#offline-tab .panel-title", key: "offline.panelTitle" },
    { selector: "#admin-tab .tab-title-container h1", key: "admin.title" },
    { selector: "#admin-tab .tab-title-container p", key: "admin.subtitle" },
    { selector: '[data-admin-screen="admin-gateway-screen"]', key: "admin.gatewayTab" },
    { selector: '[data-admin-screen="admin-tickets-screen"]', key: "admin.ticketsTab" },
    { selector: "#admin-payments-table-container .panel-title", key: "admin.paymentsTitle" },
    { selector: "#billing-tab .tab-title-container h1", key: "billing.title" },
    { selector: "#billing-tab .tab-title-container p", key: "billing.subtitle" },
    { selector: '[data-billing-cycle="monthly"]', key: "billing.monthly" },
    { selector: '[data-billing-cycle="yearly"]', key: "billing.yearly" },
    { selector: "#save-invoice-btn", key: "creator.saveInvoice" },
    { selector: "#save-pdf-btn", key: "creator.savePdf", preserveIcon: true },
    { selector: "#print-invoice-btn", key: "creator.printInvoice", preserveIcon: true },
    { selector: "#add-line-item-btn", key: "creator.addLineItem" }
];

const UI_PLACEHOLDER_BINDINGS = [
    { selector: "#beta-feedback-text", key: "placeholders.betaFeedback" },
    { selector: "#feature-request-text", key: "placeholders.featureRequest" },
    { selector: "#ticket-subject", key: "placeholders.ticketSubject" },
    { selector: "#ticket-message", key: "placeholders.ticketMessage" },
    { selector: "#ticket-reply", key: "placeholders.ticketReply" },
    { selector: "#custom-language-name", key: "placeholders.customLanguage" }
];

function readTranslationValue(source, keyPath) {
    return keyPath.split(".").reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), source);
}

function getUiLanguageCode() {
    const code = currentProfile?.app_interface_language || "en";
    return UI_TRANSLATIONS[code] ? code : "en";
}

function getUiText(keyPath) {
    const language = getUiLanguageCode();
    const translated = readTranslationValue(UI_TRANSLATIONS[language], keyPath);
    if (translated !== undefined && translated !== "") return translated;
    const fallback = readTranslationValue(UI_TRANSLATIONS.en, keyPath);
    return fallback !== undefined ? fallback : keyPath;
}

function setElementTextPreservingIcon(element, text) {
    const childNodes = Array.from(element.childNodes);
    const textNodes = childNodes.filter((node) => node.nodeType === Node.TEXT_NODE);
    if (textNodes.length) {
        textNodes.forEach((node, index) => {
            node.textContent = index === textNodes.length - 1 ? ` ${text}` : "";
        });
        return;
    }
    element.appendChild(document.createTextNode(` ${text}`));
}

function localizeFeatureRequestNavLabel() {
    const featureRequestsNav = document.getElementById("feature-requests-nav-item");
    if (!featureRequestsNav) return;
    const label = featureRequestsNav.querySelector(".nav-link");
    if (!label) return;
    setElementTextPreservingIcon(label, getUiText(isAdminUser() ? "sidebar.featureInbox" : "sidebar.featureRequests"));
}

function applyInterfaceLanguage() {
    document.documentElement.lang = getUiLanguageCode();

    UI_TEXT_BINDINGS.forEach((binding) => {
        document.querySelectorAll(binding.selector).forEach((element) => {
            const text = getUiText(binding.key);
            if (binding.preserveIcon) {
                setElementTextPreservingIcon(element, text);
            } else {
                element.textContent = text;
            }
        });
    });

    UI_PLACEHOLDER_BINDINGS.forEach((binding) => {
        document.querySelectorAll(binding.selector).forEach((element) => {
            element.setAttribute("placeholder", getUiText(binding.key));
        });
    });

    localizeFeatureRequestNavLabel();
    renderMobileNavigation();
}

function normalizeCurrencyCode(code) {
    const normalized = String(code || "PHP").trim().toUpperCase();
    const mapped = CURRENCY_ALIASES[normalized] || normalized;
    return CURRENCY_SYMBOLS[mapped] ? mapped : "PHP";
}

function getCurrencySymbol(code) {
    return CURRENCY_SYMBOLS[normalizeCurrencyCode(code)] || CURRENCY_SYMBOLS.PHP;
}

function syncCurrencySymbolFromCode() {
    const currencySelect = document.getElementById("store-currency");
    const symbolInput = document.getElementById("store-currency-symbol");
    if (!currencySelect || !symbolInput) return;

    const code = normalizeCurrencyCode(currencySelect.value);
    currencySelect.value = code;
    symbolInput.value = getCurrencySymbol(code);
    symbolInput.readOnly = true;
    symbolInput.disabled = true;
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
    currency_symbol: getCurrencySymbol("PHP"),
    default_tax_rate: 12.0,
    is_pro: false,
    invoice_count: 0,
    invoice_theme_color: "#6366f1",
    invoice_text_color: "#1e293b",
    preferred_language: "en",
    document_language: "en",
    app_interface_language: "en",
    custom_language_name: "",
    print_layout: "pdf",
    app_appearance: "dark",
    saved_signature_data_url: "",
    save_signature_permission: false,
    last_business_info_updated_at: null,
    billing_cycle: "monthly",
    auto_renewal_enabled: false,
    billing_status: "manual",
    subscription_expires_at: null,
    is_deleted: false,
    deletion_requested_at: null,
    hard_delete_after: null
};

let clients = [];
let invoices = [];
let expenses = [];
let businessProfiles = [];
let activeBusinessProfileId = null;
let savedItems = [];
let supportTickets = [];
let ticketMessages = [];
let featureRequestsCache = [];
let activeTicketId = null;
let activeAdminTicketId = null;
let currentInvoiceItems = []; // List of { id, description, quantity, unit_price }
let currentDocumentPhotos = [];
let activeEditingInvoiceId = null;
let thermalEcoModeEnabled = false;
let billingCycle = "monthly";
let tutorialStepIndex = 0;
let tutorialIntroActive = false;
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
    enhancePricingFeatureIcons();
    initAppEventListeners();
    initSignaturePad();
    initPasswordRecoveryFlow();
    checkAuthSession();
    
    // Set default dates in invoice form
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("inv-date").value = today;
    const expenseDate = document.getElementById("expense-date");
    if (expenseDate) expenseDate.value = today;
    
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
    return isAdminUser() || getPlanCanonicalName(currentProfile.plan) === "Business Unlimited";
}

function getCurrentPlanName() {
    if (isAdminUser()) return "Business Unlimited";
    const canonicalPlan = getPlanCanonicalName(currentProfile.plan);
    if (canonicalPlan !== "Standard Free Plan") return canonicalPlan;
    return currentProfile.is_pro ? "Pro Unlimited Plan" : "Standard Free Plan";
}

function getPlanKey(planName) {
    return String(planName || "Standard Free Plan")
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getPlanCanonicalName(planName) {
    const key = getPlanKey(planName);
    if (key.includes("business")) return "Business Unlimited";
    if (key.includes("pro")) return "Pro Unlimited Plan";
    if (key.includes("starter")) return "Starter Plan";
    return "Standard Free Plan";
}

function isFreeOrStarterPlan() {
    const planName = getPlanCanonicalName(getCurrentPlanName());
    return !isAdminUser() && (planName === "Standard Free Plan" || planName === "Starter Plan");
}

function hasPaidSubscriptionAccess() {
    const planName = getPlanCanonicalName(getCurrentPlanName());
    return isAdminUser() || currentProfile.is_pro === true || planName !== "Standard Free Plan";
}

function hasUnlimitedInvoiceAccess() {
    return hasPaidSubscriptionAccess();
}

function getStartOfCurrentWeek(referenceDate = new Date()) {
    const start = new Date(referenceDate);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - daysFromMonday);
    return start;
}

function getInvoiceCreatedDate(invoice) {
    const explicitDate = invoice.created_at || invoice.createdAt || invoice.saved_at;
    if (explicitDate) {
        const parsed = new Date(explicitDate);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const idTimestamp = String(invoice.id || "").match(/^inv-(\d{10,})/);
    if (idTimestamp) {
        const parsed = new Date(Number(idTimestamp[1]));
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const fallbackDate = invoice.issue_date ? new Date(invoice.issue_date) : null;
    return fallbackDate && !Number.isNaN(fallbackDate.getTime()) ? fallbackDate : null;
}

function getFreeInvoicesCreatedThisWeek() {
    const start = getStartOfCurrentWeek();
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    return getActiveInvoices().filter((invoice) => {
        const createdDate = getInvoiceCreatedDate(invoice);
        return createdDate && createdDate >= start && createdDate < end;
    }).length;
}

function isFreeInvoiceLimitReached() {
    return !hasUnlimitedInvoiceAccess() && getFreeInvoicesCreatedThisWeek() >= FREE_WEEKLY_INVOICE_LIMIT;
}

function getBusinessProfileLimit() {
    const planName = getPlanCanonicalName(getCurrentPlanName());
    if (isAdminUser() || planName === "Business Unlimited") return Infinity;
    if (planName === "Pro Unlimited Plan") return 2;
    return 1;
}

function hasLogoUploadAccess() {
    const planName = getPlanCanonicalName(getCurrentPlanName());
    return isAdminUser() || planName === "Pro Unlimited Plan" || planName === "Business Unlimited";
}

function hasSignatureAccess() {
    const planName = getPlanCanonicalName(getCurrentPlanName());
    return isAdminUser() || planName === "Pro Unlimited Plan" || planName === "Business Unlimited";
}

function hasCatalogAccess() {
    return isAdminUser() || getPlanCanonicalName(getCurrentPlanName()) === "Business Unlimited";
}

function hasExpenseAccess() {
    const planName = getPlanCanonicalName(getCurrentPlanName());
    return isAdminUser() || planName === "Pro Unlimited Plan" || planName === "Business Unlimited";
}

function getSubscriptionExpiryDate(cycle = "monthly") {
    const expiry = new Date();
    if (cycle === "yearly") {
        expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
        expiry.setMonth(expiry.getMonth() + 1);
    }
    return expiry.toISOString();
}

function hasCloudConnection() {
    return isCloudActive && (!window.navigator || window.navigator.onLine !== false);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function createToast(message, isError = false) {
    const toast = document.createElement("div");
    toast.className = `toast-message ${isError ? "toast-error" : "toast-success"}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("visible"), 20);
    setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 250);
    }, 4200);
}

function enhancePricingFeatureIcons() {
    const checkSvg = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
    `;
    const lockedSvg = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
        </svg>
    `;
    document.querySelectorAll(".plan-features .feature-icon").forEach((icon) => {
        const locked = icon.closest("li")?.classList.contains("locked");
        icon.innerHTML = locked ? lockedSvg : checkSvg;
    });
}

function formatCurrency(amount) {
    return `${currentProfile.currency_symbol}${(Number(amount) || 0).toFixed(2)}`;
}

function logSupabaseError(context, error, payload = null) {
    console.error(`Supabase Error Details (${context}):`, {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        payload
    });
}

function isMissingSchemaColumnError(error, columnName) {
    const text = [
        error?.message,
        error?.details,
        error?.hint,
        error?.code
    ].filter(Boolean).join(" ").toLowerCase();

    return text.includes(columnName.toLowerCase()) && (
        text.includes("schema cache") ||
        text.includes("could not find") ||
        text.includes("column")
    );
}

function withoutKeys(source, keys) {
    const clone = { ...source };
    keys.forEach((key) => delete clone[key]);
    return clone;
}

async function updateCloudProfileSettings(payload) {
    const optionalProfileColumns = [
        "last_business_info_updated_at",
        "document_language",
        "app_interface_language",
        "auto_renewal_enabled",
        "billing_status",
        "subscription_expires_at",
        "is_deleted",
        "deletion_requested_at",
        "hard_delete_after",
        "deletion_type"
    ];
    let workingPayload = { ...payload };
    let error = null;

    for (let attempt = 0; attempt <= optionalProfileColumns.length; attempt += 1) {
        const result = await supabaseClient
            .from("profiles")
            .update(workingPayload)
            .eq("id", currentUser.id);
        error = result.error;
        if (!error) break;

        const missingColumn = optionalProfileColumns.find((column) => isMissingSchemaColumnError(error, column) && column in workingPayload);
        if (!missingColumn) break;
        logSupabaseError(`profiles update missing optional column ${missingColumn}`, error, workingPayload);
        workingPayload = withoutKeys(workingPayload, [missingColumn]);
    }

    return { error };
}

async function saveCloudInvoiceRecord(invoiceData) {
    let payload = { ...invoiceData };
    let result;

    if (activeEditingInvoiceId) {
        result = await supabaseClient
            .from("invoices")
            .update(payload)
            .eq("id", activeEditingInvoiceId);
    } else {
        result = await supabaseClient
            .from("invoices")
            .insert(payload)
            .select();
    }

    if (result.error && isMissingSchemaColumnError(result.error, "business_profile_id")) {
        logSupabaseError("invoices save missing optional business profile column", result.error, payload);
        payload = withoutKeys(payload, ["business_profile_id"]);
        result = activeEditingInvoiceId
            ? await supabaseClient.from("invoices").update(payload).eq("id", activeEditingInvoiceId)
            : await supabaseClient.from("invoices").insert(payload).select();
    }

    return result;
}

async function insertCloudExpenseRecord(expenseData) {
    let payload = { ...expenseData, user_id: currentUser.id };
    let result = await supabaseClient.from("expenses").insert(payload).select();

    if (result.error && isMissingSchemaColumnError(result.error, "business_profile_id")) {
        logSupabaseError("expenses insert missing optional business profile column", result.error, payload);
        payload = withoutKeys(payload, ["business_profile_id"]);
        result = await supabaseClient.from("expenses").insert(payload).select();
    }

    return result;
}

async function insertCloudClientRecord(clientData) {
    const cloudUser = await getAuthenticatedCloudUser();
    if (!cloudUser?.id) {
        return {
            data: null,
            error: {
                message: "No active Supabase session. Please sign out, sign in again, then add the client."
            }
        };
    }

    const profileReady = await ensureCloudUserProfile(cloudUser);
    if (!profileReady) {
        return {
            data: null,
            error: {
                message: "Your user profile is not ready yet. Please sign out and sign in again."
            }
        };
    }

    const payload = {
        ...clientData,
        user_id: cloudUser.id
    };

    const { data, error } = await supabaseClient
        .from("clients")
        .insert(payload)
        .select();

    if (error) {
        logSupabaseError("clients insert", error, payload);
    }

    return { data, error };
}

async function getAuthenticatedCloudUser() {
    if (!hasCloudConnection() || !supabaseClient?.auth?.getUser) return currentUser;
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data?.user) {
        logSupabaseError("auth.getUser", error || { message: "No authenticated Supabase user session." });
        alert(`Failed: ${error?.message || "No authenticated user session. Please sign out and sign in again."}`);
        return null;
    }
    currentUser = data.user;
    return data.user;
}

async function ensureCloudUserProfile(user) {
    if (!hasCloudConnection() || !user?.id) return false;

    const { data: existingProfile, error: lookupError } = await supabaseClient
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

    if (lookupError) {
        logSupabaseError("profiles lookup before ticket insert", lookupError, { user_id: user.id });
        alert(`Failed: ${lookupError.message}`);
        return false;
    }

    if (existingProfile?.id) return true;

    const profilePayload = {
        id: user.id,
        email: user.email || currentProfile.email || "",
        company_name: currentProfile.company_name || "My Business",
        is_pro: !!currentProfile.is_pro,
        plan: currentProfile.plan || "Standard Free Plan"
    };

    const { error: insertError } = await supabaseClient
        .from("profiles")
        .insert([profilePayload]);

    if (insertError) {
        logSupabaseError("profiles insert before ticket insert", insertError, profilePayload);
        alert(`Failed: ${insertError.message}`);
        return false;
    }

    return true;
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
    const lang = currentProfile.document_language || currentProfile.preferred_language || "en";
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
            currency_symbol: getCurrencySymbol("PHP"),
            default_tax_rate: 12.0,
            is_pro: true,
            invoice_count: 0,
            invoice_theme_color: "#0d9488",
            invoice_text_color: "#1e293b",
            preferred_language: "en",
            document_language: "en",
            app_interface_language: "en",
            custom_language_name: "",
            print_layout: "pdf",
            app_appearance: "dark",
            saved_signature_data_url: "",
            save_signature_permission: false,
            plan: "Business Unlimited",
            auto_renewal_enabled: false,
            billing_status: "manual"
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
            currency_symbol: getCurrencySymbol("PHP"),
            default_tax_rate: 12.0,
            is_pro: true,
            invoice_count: 1,
            invoice_theme_color: "#0d9488",
            invoice_text_color: "#1e293b",
            preferred_language: "en",
            document_language: "en",
            app_interface_language: "en",
            custom_language_name: "",
            print_layout: "pdf",
            app_appearance: "dark",
            saved_signature_data_url: "",
            save_signature_permission: false,
            auto_renewal_enabled: false,
            billing_status: "manual"
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
        if (whitelabelConfig.appName !== "Valora EM") {
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
    if ((tabId === "admin-tab" || tabId === "admin-feature-inbox-tab" || tabId === "admin-tickets-tab") && !isAdminUser()) {
        alert("Admin access is only available for the owner account.");
        return;
    }

    const requestedTabId = tabId;
    const displayTabId = tabId === "admin-tickets-tab" ? "admin-tab" : tabId;

    // Free users stop at five documents; paid plans are unlimited.
    const tutorialOpen = document.getElementById("tutorial-modal")?.style.display === "flex";
    if (tabId === "creator-tab" && !tutorialOpen && isFreeInvoiceLimitReached()) {
        showInvoiceLimitUpgradeModal();
        return;
    }

    // Manage active tab displays
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
    
    const activeTab = document.getElementById(displayTabId);
    if (activeTab) activeTab.classList.add("active");
    
    const activeLink = document.querySelector(`.nav-item[data-tab="${requestedTabId}"]`);
    if (activeLink) activeLink.classList.add("active");
    
    // Refresh tables on navigation
    if (tabId === "dashboard-tab") {
        renderDashboard();
    } else if (tabId === "invoices-tab") {
        renderInvoicesTable();
    } else if (tabId === "expenses-tab") {
        renderExpensesTable();
    } else if (tabId === "trash-tab") {
        renderTrashBin();
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
        showAdminScreen("admin-gateway-screen");
        renderAdminDashboard();
    } else if (tabId === "admin-tickets-tab") {
        showAdminScreen("admin-tickets-screen");
    } else if (tabId === "admin-feature-inbox-tab") {
        renderAdminFeatureInbox();
    } else if (tabId === "feature-requests-tab") {
        updateUnreadBadges();
    } else if (tabId === "bug-report-tab") {
        renderSupportTickets();
    }
    closeMobileDrawer();
}

function updateAdminVisibility() {
    const adminNav = document.getElementById("admin-nav-item");
    if (adminNav) {
        adminNav.style.display = isAdminUser() ? "block" : "none";
    }

    const ownerBrandingCard = document.getElementById("owner-branding-card");
    if (ownerBrandingCard) {
        ownerBrandingCard.style.display = isAdminUser() ? "flex" : "none";
    }

    const featureRequestsNav = document.getElementById("feature-requests-nav-item");
    if (featureRequestsNav) {
        featureRequestsNav.dataset.tab = isAdminUser() ? "admin-feature-inbox-tab" : "feature-requests-tab";
        localizeFeatureRequestNavLabel();
    }

    const bugReportNav = document.getElementById("bug-report-nav-item");
    if (bugReportNav) {
        bugReportNav.dataset.tab = isAdminUser() ? "admin-tickets-tab" : "bug-report-tab";
    }
    renderMobileNavigation();
}

function showAdminScreen(screenId) {
    document.querySelectorAll(".admin-screen").forEach((screen) => {
        screen.classList.toggle("active", screen.id === screenId);
    });
    document.querySelectorAll("[data-admin-screen]").forEach((button) => {
        button.classList.toggle("active", button.dataset.adminScreen === screenId);
    });
    if (screenId === "admin-tickets-screen") {
        renderAdminTickets();
    } else if (screenId === "admin-gateway-screen") {
        renderAdminDashboard();
    }
}

function openMobileDrawer() {
    const overlay = document.getElementById("mobile-drawer-overlay");
    if (!overlay) return;
    renderMobileNavigation();
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("mobile-drawer-open");
}

function closeMobileDrawer() {
    const overlay = document.getElementById("mobile-drawer-overlay");
    if (!overlay) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mobile-drawer-open");
}

function renderMobileNavigation() {
    const source = document.querySelector(".sidebar .nav-menu");
    const target = document.getElementById("mobile-nav-menu");
    if (!source || !target) return;

    target.innerHTML = "";
    source.querySelectorAll(".nav-item").forEach((item) => {
        if (item.style.display === "none") return;
        const clone = item.cloneNode(true);
        clone.removeAttribute("id");
        clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
        clone.addEventListener("click", () => {
            switchTab(clone.dataset.tab);
            closeMobileDrawer();
        });
        target.appendChild(clone);
    });
}

function getTutorialStorageKey() {
    const identifier = currentUser?.id || currentUser?.email || "guest";
    return `valoraem_tutorial_seen_${identifier}`;
}

function markTutorialSeen() {
    localStorage.setItem(getTutorialStorageKey(), "true");
}

function maybeShowOnboardingPrompt() {
    if (!currentUser || localStorage.getItem(getTutorialStorageKey()) === "true") return;
    showTutorialIntro();
}

function showTutorialModal() {
    const modal = document.getElementById("tutorial-modal");
    if (!modal) return;
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
}

function hideTutorialModal() {
    const modal = document.getElementById("tutorial-modal");
    if (!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
}

function showTutorialIntro() {
    tutorialIntroActive = true;
    tutorialStepIndex = 0;
    showTutorialModal();
    updateTutorialContent({
        label: "Welcome",
        title: "Welcome to Valora EM",
        body: "Would you like a quick guided tour before you start creating invoices?",
        focusTitle: "What you will learn",
        focusText: "Business setup, clients, invoice creation, printing, history, expenses, and support.",
        progress: 0,
        primaryText: "Begin Tutorial",
        backVisible: false
    });
}

function updateTutorialContent({ label, title, body, focusTitle, focusText, progress, primaryText, backVisible }) {
    const labelEl = document.getElementById("tutorial-step-label");
    const titleEl = document.getElementById("tutorial-title");
    const bodyEl = document.getElementById("tutorial-body");
    const focusTitleEl = document.getElementById("tutorial-focus-title");
    const focusTextEl = document.getElementById("tutorial-focus-text");
    const progressEl = document.getElementById("tutorial-progress-fill");
    const primaryBtn = document.getElementById("tutorial-primary-btn");
    const backBtn = document.getElementById("tutorial-back-btn");

    if (labelEl) labelEl.innerText = label;
    if (titleEl) titleEl.innerText = title;
    if (bodyEl) bodyEl.innerText = body;
    if (focusTitleEl) focusTitleEl.innerText = focusTitle;
    if (focusTextEl) focusTextEl.innerText = focusText;
    if (progressEl) progressEl.style.width = `${progress}%`;
    if (primaryBtn) primaryBtn.innerText = primaryText;
    if (backBtn) backBtn.style.display = backVisible ? "inline-flex" : "none";
}

function startTutorial() {
    tutorialIntroActive = false;
    tutorialStepIndex = 0;
    renderTutorialStep();
}

function renderTutorialStep() {
    const step = TUTORIAL_STEPS[tutorialStepIndex];
    if (!step) return;
    showTutorialModal();
    switchTab(step.tab);

    const isLastStep = tutorialStepIndex === TUTORIAL_STEPS.length - 1;
    const progress = Math.round(((tutorialStepIndex + 1) / TUTORIAL_STEPS.length) * 100);
    updateTutorialContent({
        label: step.label,
        title: step.title,
        body: step.body,
        focusTitle: step.focusTitle,
        focusText: step.focusText,
        progress,
        primaryText: isLastStep ? "Finish Tutorial" : "Next",
        backVisible: tutorialStepIndex > 0
    });
}

function nextTutorialStep() {
    if (tutorialIntroActive) {
        startTutorial();
        return;
    }

    if (tutorialStepIndex >= TUTORIAL_STEPS.length - 1) {
        finishTutorial();
        return;
    }

    tutorialStepIndex += 1;
    renderTutorialStep();
}

function previousTutorialStep() {
    if (tutorialIntroActive || tutorialStepIndex === 0) {
        showTutorialIntro();
        return;
    }

    tutorialStepIndex -= 1;
    renderTutorialStep();
}

function skipTutorial() {
    markTutorialSeen();
    hideTutorialModal();
}

function finishTutorial() {
    markTutorialSeen();
    hideTutorialModal();
    switchTab("learning-tab");
}

function restartTutorial() {
    localStorage.removeItem(getTutorialStorageKey());
    showTutorialIntro();
}

function showInvoiceLimitUpgradeModal() {
    const modal = document.getElementById("invoice-limit-modal");
    if (!modal) {
        createToast("Weekly limit reached. Free accounts can create up to 5 invoices per week.", true);
        return;
    }
    const countEl = document.getElementById("invoice-limit-count");
    if (countEl) countEl.innerText = getFreeInvoicesCreatedThisWeek();
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
}

function hideInvoiceLimitUpgradeModal() {
    const modal = document.getElementById("invoice-limit-modal");
    if (!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
}

function showAccountDeleteModal() {
    const modal = document.getElementById("account-delete-modal");
    if (!modal) return;
    const confirmInput = document.getElementById("delete-confirm-text");
    const immediateCheckbox = document.getElementById("immediate-delete-checkbox");
    if (confirmInput) confirmInput.value = "";
    if (immediateCheckbox) immediateCheckbox.checked = false;
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
}

function hideAccountDeleteModal() {
    const modal = document.getElementById("account-delete-modal");
    if (!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
}

function clearLocalUserData(email = currentUser?.email) {
    if (!email) return;
    [
        `valoraem_account_${email}`,
        `valoraem_profile_${email}`,
        `valoraem_clients_${email}`,
        `valoraem_invoices_${email}`,
        `valoraem_expenses_${email}`,
        `valoraem_business_profiles_${email}`,
        `valoraem_saved_items_${email}`,
        `valoraem_active_business_profile_${email}`,
        `valoraem_tutorial_seen_${currentUser?.id || email}`
    ].forEach((key) => localStorage.removeItem(key));
}

async function insertAccountDeletionRequest(payload) {
    if (!hasCloudConnection()) return { error: null };
    let { error } = await supabaseClient.from("account_deletion_requests").insert(payload);
    if (error && /does not exist|schema cache|relation/i.test(`${error.message} ${error.details || ""}`)) {
        logSupabaseError("account_deletion_requests table missing", error, payload);
        error = null;
    }
    return { error };
}

async function markProfileForDeletion(payload) {
    if (!hasCloudConnection()) return { error: null };
    const { error } = await updateCloudProfileSettings(payload);
    return { error };
}

async function invokeImmediateAccountPurge() {
    if (!hasCloudConnection() || !currentUser?.id || !supabaseClient?.functions?.invoke) {
        return { error: null, skipped: true };
    }

    const { data, error } = await supabaseClient.functions.invoke(ACCOUNT_DELETE_FUNCTION_NAME, {
        body: {
            confirm: "DELETE",
            deletion_type: "immediate"
        }
    });
    return { data, error };
}

function clearSupabaseBrowserSessionTokens() {
    try {
        Object.keys(localStorage)
            .filter((key) => key.startsWith("sb-") || key.includes("supabase.auth.token"))
            .forEach((key) => localStorage.removeItem(key));
        Object.keys(sessionStorage)
            .filter((key) => key.startsWith("sb-") || key.includes("supabase.auth.token"))
            .forEach((key) => sessionStorage.removeItem(key));
    } catch (err) {
        console.warn("Unable to clear every browser auth token:", err);
    }
}

async function destroySessionAndRedirectToLanding() {
    try {
        if (hasCloudConnection()) {
            await supabaseClient.auth.signOut({ scope: "local" });
        }
    } catch (err) {
        console.warn("Sign-out during account deletion skipped:", err);
    }
    localStorage.removeItem("valoraem_mock_user");
    clearSupabaseBrowserSessionTokens();
    currentUser = null;
    window.location.replace("index.html");
}

async function submitAccountDeletionRequest() {
    const confirmText = document.getElementById("delete-confirm-text")?.value.trim();
    const immediate = !!document.getElementById("immediate-delete-checkbox")?.checked;
    if (confirmText !== "DELETE") {
        createToast("Please type DELETE to confirm this account deletion request.", true);
        return;
    }

    const now = new Date();
    const hardDeleteDate = immediate ? now : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const deletionPayload = {
        is_deleted: true,
        deletion_requested_at: now.toISOString(),
        hard_delete_after: hardDeleteDate.toISOString(),
        deletion_type: immediate ? "immediate" : "soft_7_day"
    };

    if (hasCloudConnection()) {
        const requestPayload = {
            user_id: currentUser.id,
            customer_email: currentUser.email,
            deletion_type: deletionPayload.deletion_type,
            requested_at: deletionPayload.deletion_requested_at,
            hard_delete_after: deletionPayload.hard_delete_after,
            status: immediate ? "PENDING_IMMEDIATE_PURGE" : "SOFT_DELETE_PENDING"
        };
        const requestResult = await insertAccountDeletionRequest(requestPayload);
        if (requestResult.error) {
            logSupabaseError("account deletion request insert", requestResult.error, requestPayload);
            createToast(`Deletion request could not be saved: ${requestResult.error.message}`, true);
            return;
        }

        const profileResult = await markProfileForDeletion(deletionPayload);
        if (profileResult.error) {
            logSupabaseError("profile deletion flag update", profileResult.error, deletionPayload);
            createToast(`Deletion flag could not be saved: ${profileResult.error.message}`, true);
            return;
        }

        if (immediate) {
            const purgeResult = await invokeImmediateAccountPurge();
            if (purgeResult.error) {
                logSupabaseError("immediate account purge edge function", purgeResult.error);
            }
        }
    }

    currentProfile = { ...currentProfile, ...deletionPayload };
    saveLocalStorageProfile();
    if (immediate) clearLocalUserData(currentUser.email);
    hideAccountDeleteModal();
    createToast(immediate
        ? "Your account deletion request has been processed. You will be logged out immediately."
        : "Account deletion scheduled. You have 7 days before permanent deletion.");
    await destroySessionAndRedirectToLanding();
}

// Display auth form
function showAuthScreen() {
    hideTutorialModal();
    hideInvoiceLimitUpgradeModal();
    hideAccountDeleteModal();
    document.getElementById("auth-container").style.display = "flex";
    document.getElementById("app-root").style.display = "none";
}

// Display dashboard/app
function showAppScreen() {
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("app-root").style.display = "flex";
    switchTab("dashboard-tab");
    renderLaunchNotification();
    setTimeout(maybeShowOnboardingPrompt, 350);
}

function getLaunchState() {
    const stored = localStorage.getItem("valoraem_live_launch_notice");
    if (stored) {
        try {
            return { ...LIVE_LAUNCH_CONFIG, ...JSON.parse(stored) };
        } catch (err) {
            console.warn("Invalid launch notice config ignored:", err);
        }
    }
    return LIVE_LAUNCH_CONFIG;
}

function renderLaunchNotification() {
    const banner = document.getElementById("launch-notice-banner");
    if (!banner) return;

    const launchState = getLaunchState();
    if (!launchState.active) {
        banner.style.display = "none";
        return;
    }

    const launchDate = launchState.launchDate ? new Date(launchState.launchDate) : new Date();
    const trialEnd = new Date(launchDate);
    trialEnd.setDate(trialEnd.getDate() + (Number(launchState.trialDays) || 7));
    const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000));
    const text = document.getElementById("launch-notice-text");
    if (text) {
        text.innerText = `Beta accounts now have ${daysLeft} day${daysLeft === 1 ? "" : "s"} left in the launch trial. Upgrade manually before ${trialEnd.toLocaleDateString()} to keep premium access.`;
    }
    banner.style.display = "grid";
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
            const { error: insertProfileError } = await supabaseClient.from("profiles").insert([newProfile]);
            if (insertProfileError) {
                logSupabaseError("profiles insert during sign-in setup", insertProfileError, newProfile);
            }
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

    ensureBusinessProfiles();
    
    // Update application-wide profile displays
    document.getElementById("user-display-email").innerText = currentProfile.email || currentUser.email;
    document.getElementById("user-avatar-char").innerText = (currentProfile.company_name || "M").charAt(0).toUpperCase();
    
    // Populate form fields
    document.getElementById("store-name").value = currentProfile.company_name;
    document.getElementById("store-email").value = currentProfile.email || "";
    document.getElementById("store-phone").value = currentProfile.phone || "";
    document.getElementById("store-address").value = currentProfile.address || "";
    currentProfile.currency = normalizeCurrencyCode(currentProfile.currency);
    currentProfile.currency_symbol = getCurrencySymbol(currentProfile.currency);
    document.getElementById("store-currency").value = currentProfile.currency;
    document.getElementById("store-currency-symbol").value = currentProfile.currency_symbol || getCurrencySymbol("PHP");
    syncCurrencySymbolFromCode();
    document.getElementById("inv-tax-rate").value = currentProfile.default_tax_rate;
    syncLanguageControls();
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
    populateBusinessProfileSwitcher();
    renderSavedItemsUI();
    renderLogoAccessUI();
    renderSignatureAccessUI();
    applyInvoiceThemeColor();
    updateUserTierUI();
    updateAdminVisibility();
    applyInterfaceLanguage();
    showAppScreen();
    handlePaymentReturnNotice();
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
        currency_symbol: getCurrencySymbol("PHP"),
        default_tax_rate: 12.0,
        is_pro: false,
        invoice_count: 0,
        invoice_theme_color: "#6366f1",
        invoice_text_color: "#1e293b",
        preferred_language: "en",
        document_language: "en",
        app_interface_language: "en",
        custom_language_name: "",
        print_layout: "pdf",
        app_appearance: "dark",
        saved_signature_data_url: "",
        save_signature_permission: false,
        auto_renewal_enabled: false,
        billing_status: "manual",
        subscription_expires_at: null,
        is_deleted: false,
        deletion_requested_at: null,
        hard_delete_after: null
    };
}

function applyAppearance() {
    const mode = currentProfile.app_appearance || "dark";
    document.body.classList.toggle("theme-light", mode === "light");
    document.documentElement.dataset.theme = mode === "light" ? "light" : "dark";
    document.body.dataset.theme = mode === "light" ? "light" : "dark";
    const appearanceSelect = document.getElementById("app-appearance");
    if (appearanceSelect) appearanceSelect.value = mode;
}

function syncLanguageControls() {
    const appLanguage = currentProfile.app_interface_language || "en";
    const documentLanguage = currentProfile.document_language || currentProfile.preferred_language || "en";
    const appLanguageSelect = document.getElementById("app-interface-language");
    const documentLanguageSelect = document.getElementById("preferred-language");
    const customLanguageInput = document.getElementById("custom-language-name");

    currentProfile.app_interface_language = appLanguage;
    currentProfile.document_language = documentLanguage;
    currentProfile.preferred_language = documentLanguage;

    if (appLanguageSelect) appLanguageSelect.value = appLanguage;
    if (documentLanguageSelect) documentLanguageSelect.value = documentLanguage;
    if (customLanguageInput) customLanguageInput.value = currentProfile.custom_language_name || "";
}

async function saveAppearanceSettings() {
    currentProfile.app_appearance = document.getElementById("app-appearance")?.value || "dark";
    currentProfile.app_interface_language = document.getElementById("app-interface-language")?.value || "en";
    currentProfile.document_language = document.getElementById("preferred-language")?.value || "en";
    currentProfile.preferred_language = currentProfile.document_language;
    currentProfile.custom_language_name = document.getElementById("custom-language-name")?.value.trim() || "";
    currentProfile.invoice_text_color = document.getElementById("invoice-text-color")?.value || "#1e293b";
    currentProfile.print_layout = document.getElementById("print-layout")?.value || "pdf";

    const updatedBusinessProfile = syncActiveBusinessProfileFromCurrentForm();
    if (updatedBusinessProfile) {
        updatedBusinessProfile.app_appearance = currentProfile.app_appearance;
        updatedBusinessProfile.app_interface_language = currentProfile.app_interface_language;
        updatedBusinessProfile.document_language = currentProfile.document_language;
        updatedBusinessProfile.preferred_language = currentProfile.document_language;
        updatedBusinessProfile.custom_language_name = currentProfile.custom_language_name;
        updatedBusinessProfile.invoice_theme_color = currentProfile.invoice_theme_color;
        updatedBusinessProfile.invoice_text_color = currentProfile.invoice_text_color;
        updatedBusinessProfile.print_layout = currentProfile.print_layout;
    }

    if (hasCloudConnection()) {
        const { error } = await updateCloudProfileSettings({
            app_appearance: currentProfile.app_appearance,
            app_interface_language: currentProfile.app_interface_language,
            document_language: currentProfile.document_language,
            preferred_language: currentProfile.preferred_language,
            custom_language_name: currentProfile.custom_language_name,
            invoice_theme_color: currentProfile.invoice_theme_color,
            invoice_text_color: currentProfile.invoice_text_color,
            print_layout: currentProfile.print_layout
        });
        if (error) {
            logSupabaseError("appearance settings update", error);
            createToast(`Appearance settings could not sync: ${error.message}`, true);
            return;
        }
        await persistActiveBusinessProfile();
    } else {
        await persistActiveBusinessProfile();
        saveLocalStorageProfile();
    }

    applyAppearance();
    applyInterfaceLanguage();
    applyInvoiceThemeColor();
    updateInvoicePreview();
    createToast(getUiText("messages.appearanceSaved"));
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

function renderSignatureAccessUI() {
    const allowed = hasSignatureAccess();
    const section = document.getElementById("signature-section");
    if (section) section.classList.toggle("signature-locked", !allowed);

    [
        "signature-canvas",
        "clear-signature-btn",
        "show-signature-checkbox",
        "printed-name",
        "request-client-signature-checkbox",
        "save-signature-permission-checkbox"
    ].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.disabled = !allowed;
    });

    if (!allowed) {
        clearSignature();
        const showSignature = document.getElementById("show-signature-checkbox");
        const saveSignature = document.getElementById("save-signature-permission-checkbox");
        const requestClientSignature = document.getElementById("request-client-signature-checkbox");
        if (showSignature) showSignature.checked = false;
        if (saveSignature) saveSignature.checked = false;
        if (requestClientSignature) requestClientSignature.checked = false;
        updateSignaturePreview();
    }
}

function saveLocalStorageProfile() {
    const key = `valoraem_profile_${currentUser.email}`;
    localStorage.setItem(key, JSON.stringify(currentProfile));
}

function getLocalBusinessProfilesKey() {
    return `valoraem_business_profiles_${currentUser.email}`;
}

function getLocalSavedItemsKey() {
    return `valoraem_saved_items_${currentUser.email}`;
}

function getLocalExpensesKey() {
    return `valoraem_expenses_${currentUser.email}`;
}

function getLocalTicketsKey() {
    return "valoraem_support_tickets";
}

function getLocalTicketMessagesKey() {
    return "valoraem_ticket_messages";
}

function normalizeBusinessProfile(profile = {}) {
    const id = profile.id || profile.business_profile_id || `biz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return {
        id,
        user_id: profile.user_id || currentUser?.id || null,
        created_at: profile.created_at || new Date().toISOString(),
        company_name: profile.company_name || currentProfile.company_name || "My Business",
        email: profile.email || currentProfile.email || currentUser?.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
        logo_url: profile.logo_url || "",
        currency: normalizeCurrencyCode(profile.currency || currentProfile.currency || "PHP"),
        currency_symbol: getCurrencySymbol(profile.currency || currentProfile.currency || "PHP"),
        default_tax_rate: Number(profile.default_tax_rate ?? currentProfile.default_tax_rate ?? 12),
        invoice_theme_color: profile.invoice_theme_color || currentProfile.invoice_theme_color || "#6366f1",
        invoice_text_color: profile.invoice_text_color || currentProfile.invoice_text_color || "#1e293b",
        preferred_language: profile.document_language || profile.preferred_language || currentProfile.document_language || currentProfile.preferred_language || "en",
        document_language: profile.document_language || profile.preferred_language || currentProfile.document_language || currentProfile.preferred_language || "en",
        app_interface_language: profile.app_interface_language || currentProfile.app_interface_language || "en",
        custom_language_name: profile.custom_language_name || currentProfile.custom_language_name || "",
        print_layout: profile.print_layout || currentProfile.print_layout || "pdf",
        app_appearance: profile.app_appearance || currentProfile.app_appearance || "dark",
        saved_signature_data_url: profile.saved_signature_data_url || "",
        save_signature_permission: !!profile.save_signature_permission,
        last_business_info_updated_at: profile.last_business_info_updated_at || null
    };
}

function getActiveBusinessProfile() {
    if (!businessProfiles.length) return null;
    return businessProfiles.find((profile) => profile.id === activeBusinessProfileId) || businessProfiles[0];
}

function applyBusinessProfileToCurrentProfile(profile) {
    if (!profile) return;
    BUSINESS_PROFILE_FIELDS.forEach((field) => {
        if (field in profile) currentProfile[field] = profile[field];
    });
    currentProfile.currency = normalizeCurrencyCode(currentProfile.currency);
    currentProfile.currency_symbol = getCurrencySymbol(currentProfile.currency);
}

function syncActiveBusinessProfileFromCurrentForm() {
    const profile = getActiveBusinessProfile();
    if (!profile) return null;

    profile.company_name = document.getElementById("store-name")?.value.trim() || "My Business";
    profile.email = document.getElementById("store-email")?.value.trim() || currentUser?.email || "";
    profile.phone = document.getElementById("store-phone")?.value.trim() || "";
    profile.address = document.getElementById("store-address")?.value.trim() || "";
    profile.currency = normalizeCurrencyCode(document.getElementById("store-currency")?.value || "PHP");
    profile.currency_symbol = getCurrencySymbol(profile.currency);
    profile.default_tax_rate = parseFloat(document.getElementById("inv-tax-rate")?.value) || currentProfile.default_tax_rate || 12;
    profile.app_interface_language = document.getElementById("app-interface-language")?.value || "en";
    profile.document_language = document.getElementById("preferred-language")?.value || "en";
    profile.preferred_language = profile.document_language;
    profile.custom_language_name = document.getElementById("custom-language-name")?.value.trim() || "";
    profile.invoice_theme_color = currentProfile.invoice_theme_color || profile.invoice_theme_color || "#6366f1";
    profile.invoice_text_color = document.getElementById("invoice-text-color")?.value || "#1e293b";
    profile.print_layout = document.getElementById("print-layout")?.value || "pdf";
    profile.app_appearance = document.getElementById("app-appearance")?.value || "dark";
    profile.logo_url = currentProfile.logo_url || profile.logo_url || "";
    profile.saved_signature_data_url = currentProfile.saved_signature_data_url || profile.saved_signature_data_url || "";
    profile.save_signature_permission = !!currentProfile.save_signature_permission;
    return profile;
}

function ensureBusinessProfiles() {
    businessProfiles = (businessProfiles || []).map(normalizeBusinessProfile);
    if (!businessProfiles.length) {
        businessProfiles = [normalizeBusinessProfile({ id: "primary-store" })];
    }

    const savedActiveId = currentUser ? localStorage.getItem(`valoraem_active_business_profile_${currentUser.email}`) : null;
    activeBusinessProfileId = activeBusinessProfileId || savedActiveId || businessProfiles[0].id;
    if (!businessProfiles.some((profile) => profile.id === activeBusinessProfileId)) {
        activeBusinessProfileId = businessProfiles[0].id;
    }

    if (currentUser) {
        localStorage.setItem(`valoraem_active_business_profile_${currentUser.email}`, activeBusinessProfileId);
    }

    applyBusinessProfileToCurrentProfile(getActiveBusinessProfile());
}

function populateBusinessProfileSwitcher() {
    const select = document.getElementById("business-profile-select");
    const addButton = document.getElementById("add-business-profile-btn");
    const note = document.getElementById("business-profile-limit-note");
    if (!select) return;

    const limit = getBusinessProfileLimit();
    select.innerHTML = "";
    businessProfiles.forEach((profile) => {
        const option = document.createElement("option");
        option.value = profile.id;
        option.textContent = profile.company_name || "My Business";
        select.appendChild(option);
    });
    select.value = activeBusinessProfileId;
    select.disabled = businessProfiles.length <= 1 && limit <= 1;

    if (addButton) {
        addButton.disabled = businessProfiles.length >= limit;
        addButton.innerText = limit === Infinity ? "+ Add Store" : `+ Add Store (${businessProfiles.length}/${limit})`;
    }

    if (note) {
        const limitText = limit === Infinity ? "Unlimited business profiles on Business Unlimited." : `${businessProfiles.length}/${limit} business profile slots used.`;
        note.innerText = `${limitText} Free and Starter can only edit business details once every 7 days.`;
    }
}

function applyActiveBusinessProfileToForms() {
    const profile = getActiveBusinessProfile();
    if (!profile) return;
    applyBusinessProfileToCurrentProfile(profile);

    document.getElementById("store-name").value = currentProfile.company_name || "My Business";
    document.getElementById("store-email").value = currentProfile.email || "";
    document.getElementById("store-phone").value = currentProfile.phone || "";
    document.getElementById("store-address").value = currentProfile.address || "";
    document.getElementById("store-currency").value = currentProfile.currency || "PHP";
    syncCurrencySymbolFromCode();
    syncLanguageControls();
    if (document.getElementById("invoice-text-color")) document.getElementById("invoice-text-color").value = currentProfile.invoice_text_color || "#1e293b";
    if (document.getElementById("print-layout")) document.getElementById("print-layout").value = currentProfile.print_layout || "pdf";
    if (document.getElementById("creator-print-layout")) document.getElementById("creator-print-layout").value = currentProfile.print_layout || "pdf";
    if (document.getElementById("app-appearance")) document.getElementById("app-appearance").value = currentProfile.app_appearance || "dark";

    document.getElementById("user-avatar-char").innerText = (currentProfile.company_name || "M").charAt(0).toUpperCase();
    populateBusinessProfileSwitcher();
    renderLogoAccessUI();
    applyAppearance();
    applyInvoiceThemeColor();
    renderSavedItemsUI();
    updateInvoicePreview();
}

function isBusinessProfileLocked(profile) {
    if (!isFreeOrStarterPlan()) return false;
    if (!profile?.last_business_info_updated_at) return false;
    const lastUpdate = new Date(profile.last_business_info_updated_at);
    if (Number.isNaN(lastUpdate.getTime())) return false;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - lastUpdate.getTime() < sevenDaysMs;
}

async function persistActiveBusinessProfile() {
    const profile = getActiveBusinessProfile();
    if (!profile) return;

    if (hasCloudConnection()) {
        const payload = { ...profile, user_id: currentUser.id };
        let { error } = await supabaseClient
            .from("business_profiles")
            .upsert(payload, { onConflict: "id" });
        if (error && (isMissingSchemaColumnError(error, "document_language") || isMissingSchemaColumnError(error, "app_interface_language"))) {
            const fallbackPayload = withoutKeys(payload, ["document_language", "app_interface_language"]);
            const fallbackResult = await supabaseClient
                .from("business_profiles")
                .upsert(fallbackPayload, { onConflict: "id" });
            error = fallbackResult.error;
        }
        if (error) {
            console.warn("Business profile cloud save skipped:", error.message);
        }
    }

    saveLocalData();
}

async function addBusinessProfile() {
    const limit = getBusinessProfileLimit();
    if (businessProfiles.length >= limit) {
        alert("Your current plan can only manage one business profile. Upgrade to Pro or Business to add more stores.");
        return;
    }

    const name = window.prompt("Business profile name", "New Store");
    if (!name) return;

    const profile = normalizeBusinessProfile({
        id: `biz-${Date.now()}`,
        company_name: name,
        email: currentUser?.email || ""
    });
    businessProfiles.push(profile);
    activeBusinessProfileId = profile.id;
    localStorage.setItem(`valoraem_active_business_profile_${currentUser.email}`, activeBusinessProfileId);
    await persistActiveBusinessProfile();
    applyActiveBusinessProfileToForms();
}

function loadPaymentSettings() {
    const saved = localStorage.getItem("valoraem_payment_settings");
    paymentSettings = saved ? { ...paymentSettings, ...JSON.parse(saved) } : paymentSettings;
}

function savePaymentSettings() {
    paymentSettings = {
        paymongoPublicKey: document.getElementById("admin-paymongo-public").value.trim(),
        paymongoSecretKey: "",
        stripePublishableKey: document.getElementById("admin-stripe-public").value.trim(),
        stripeSecretKey: "",
        cardCheckoutUrl: document.getElementById("admin-card-checkout-url").value.trim(),
        gcashNumber: document.getElementById("admin-gcash-number").value.trim(),
        payoutAccount: document.getElementById("admin-payout-account").value.trim()
    };
    localStorage.setItem("valoraem_payment_settings", JSON.stringify(paymentSettings));
    alert("Admin payment settings saved. Secret keys must stay in PayMongo/Supabase backend settings, not in this browser app.");
}

function getLocalPaymentRecords() {
    return JSON.parse(localStorage.getItem("valoraem_payment_records")) || [];
}

function savePaymentRecords(records) {
    localStorage.setItem("valoraem_payment_records", JSON.stringify(records));
}

function getPlanActivationAmount(planName) {
    return PLAN_PROMO_PRICES[getPlanCanonicalName(planName)] || 0;
}

function getManualSubscriptionExpiry(months = 1) {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + Math.max(1, Number(months) || 1));
    return expiry.toISOString();
}

async function activateVerifiedUserPlan() {
    if (!isAdminUser()) {
        createToast("Only the owner admin account can activate paid plans.", true);
        return;
    }
    if (!hasCloudConnection()) {
        createToast("Supabase connection is required to activate a user's plan.", true);
        return;
    }

    const email = document.getElementById("admin-activate-email")?.value.trim().toLowerCase();
    const plan = getPlanCanonicalName(document.getElementById("admin-activate-plan")?.value);
    const months = Number(document.getElementById("admin-activate-months")?.value) || 1;
    const reference = document.getElementById("admin-payment-reference")?.value.trim();

    if (!email || !email.includes("@")) {
        createToast("Enter the customer's account email first.", true);
        return;
    }
    if (!reference) {
        createToast("Enter the PayMongo reference or payment ID after verifying payment.", true);
        return;
    }
    if (plan === "Standard Free Plan") {
        createToast("Select a paid plan to activate.", true);
        return;
    }

    const { data, error } = await supabaseClient.rpc("admin_activate_user_plan", {
        target_email: email,
        target_plan: plan,
        access_months: Math.max(1, Math.min(24, months)),
        payment_reference: reference
    });

    if (error) {
        logSupabaseError("admin_activate_user_plan rpc", error, { email, plan, months, reference });
        const errorText = [error.message, error.details, error.hint, error.code].filter(Boolean).join(" ");
        if (errorText.toLowerCase().includes("admin_activate_user_plan")) {
            createToast("Admin activation is not installed yet. Run SUPABASE_ADMIN_ACTIVATION.sql in Supabase SQL Editor first.", true);
        } else {
            createToast(`Activation failed: ${error.message}`, true);
        }
        return;
    }

    const activationRow = Array.isArray(data) ? data[0] : data;
    const expiresAt = activationRow?.subscription_expires_at || getManualSubscriptionExpiry(months);
    createToast(`${plan} activated for ${email} until ${new Date(expiresAt).toLocaleDateString()}.`);

    document.getElementById("admin-activate-email").value = "";
    document.getElementById("admin-payment-reference").value = "";
    await renderAdminDashboard();
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
                billing_mode: record.billing_mode || "Manual Renewal",
                auto_renewal_enabled: !!record.auto_renewal_enabled,
                customer_email: record.customer_email,
                created_at: record.created_at,
                status: record.status || "paid"
            }));
        }
        console.error("Unable to load app payments:", error);
    }
    return getLocalPaymentRecords();
}

async function recordPayment(plan, price, method, options = {}) {
    const billingMode = options.autoRenewalEnabled ? "EasyPay Auto-Renewal" : "Manual Renewal";
    const record = {
        id: `pay-${Date.now()}`,
        plan,
        price: Number(price) || 0,
        method,
        billing_mode: billingMode,
        auto_renewal_enabled: !!options.autoRenewalEnabled,
        customer_email: currentUser?.email || "local-customer",
        created_at: new Date().toISOString()
    };

    if (hasCloudConnection()) {
        const paymentPayload = {
            user_id: currentUser.id,
            customer_email: currentUser.email,
            plan,
            method,
            amount: Number(price) || 0,
            status: "paid",
            billing_mode: billingMode,
            auto_renewal_enabled: !!options.autoRenewalEnabled
        };
        let { error } = await supabaseClient.from("app_payments").insert(paymentPayload);
        if (error && (isMissingSchemaColumnError(error, "billing_mode") || isMissingSchemaColumnError(error, "auto_renewal_enabled"))) {
            logSupabaseError("app_payments insert missing beta billing columns", error, paymentPayload);
            const fallbackPayload = withoutKeys(paymentPayload, ["billing_mode", "auto_renewal_enabled"]);
            const fallback = await supabaseClient.from("app_payments").insert(fallbackPayload);
            error = fallback.error;
        }
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
            featureRequestsCache = data
                .filter((request) => !request.is_deleted)
                .map((request) => ({
                id: request.id,
                customer_email: request.customer_email || "Unknown customer",
                text: request.request_text || "",
                created_at: request.created_at,
                is_read_by_admin: request.is_read_by_admin !== false
            }));
            return featureRequestsCache;
        }

        console.error("Unable to load cloud feature requests:", error);
    }

    featureRequestsCache = getFeatureRequests().filter((request) => !request.is_deleted);
    return featureRequestsCache;
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
        created_at: new Date().toISOString(),
        is_read_by_admin: false,
        is_deleted: false
    };

    if (hasCloudConnection()) {
        const requestPayload = {
            user_id: currentUser.id,
            customer_email: currentUser.email,
            request_text: text,
            is_read_by_admin: false,
            is_deleted: false
        };
        let { error } = await supabaseClient.from("feature_requests").insert(requestPayload);
        if (error && (isMissingSchemaColumnError(error, "is_read_by_admin") || isMissingSchemaColumnError(error, "is_deleted"))) {
            logSupabaseError("feature_requests insert missing inbox columns", error, requestPayload);
            const fallbackPayload = withoutKeys(requestPayload, ["is_read_by_admin", "is_deleted"]);
            const fallback = await supabaseClient.from("feature_requests").insert(fallbackPayload);
            error = fallback.error;
        }

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
    updateUnreadBadges();
    textarea.value = "";
    alert("Feature request sent to the admin dashboard.");
}

async function submitBetaFeedback() {
    const textarea = document.getElementById("beta-feedback-text");
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) {
        createToast("Please type your beta feedback first.", true);
        return;
    }

    const requestText = `[Beta Feedback] ${text}`;
    const request = {
        id: `feedback-${Date.now()}`,
        customer_email: currentUser?.email || "local-customer",
        text: requestText,
        created_at: new Date().toISOString(),
        is_read_by_admin: false,
        is_deleted: false
    };

    if (hasCloudConnection()) {
        const feedbackPayload = {
            user_id: currentUser.id,
            customer_email: currentUser.email,
            request_text: requestText,
            is_read_by_admin: false,
            is_deleted: false
        };
        let { error } = await supabaseClient.from("feature_requests").insert(feedbackPayload);
        if (error && (isMissingSchemaColumnError(error, "is_read_by_admin") || isMissingSchemaColumnError(error, "is_deleted"))) {
            logSupabaseError("beta feedback insert missing inbox columns", error, feedbackPayload);
            const fallbackPayload = withoutKeys(feedbackPayload, ["is_read_by_admin", "is_deleted"]);
            const fallback = await supabaseClient.from("feature_requests").insert(fallbackPayload);
            error = fallback.error;
        }

        if (error) {
            logSupabaseError("beta feedback insert", error, request);
            createToast(`Feedback could not sync to Supabase: ${error.message}`, true);
            return;
        }
    } else if (isCloudActive) {
        createToast("You are offline. Please reconnect before sending beta feedback.", true);
        return;
    }

    const requests = getFeatureRequests();
    requests.push(request);
    saveFeatureRequests(requests);
    updateUnreadBadges();
    textarea.value = "";
    createToast("Beta feedback sent. Thank you for testing Valora EM.");
}

function handleDocumentPhotos(event) {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 4);
    if (!files.length) return;
    currentDocumentPhotos = [];

    let loaded = 0;
    files.forEach((file) => {
        if (file.size > 2 * 1024 * 1024) {
            alert(`${file.name} is too large. Maximum image size is 2MB.`);
            loaded += 1;
            if (loaded === files.length) renderDocumentPhotos();
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

function resetDocumentPhotoInput() {
    const input = document.getElementById("document-photo-file");
    if (input) input.value = "";
}

function removeDocumentPhoto(index) {
    currentDocumentPhotos.splice(index, 1);
    resetDocumentPhotoInput();
    renderDocumentPhotos();
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
        .map((src, index) => `
            <div class="invoice-photo-preview-item invoice-attachment-wrapper">
                <img src="${src}" alt="Attached document photo">
                <button class="invoice-photo-remove-btn" type="button" onclick="removeDocumentPhoto(${index})" aria-label="Remove attached photo">&times;</button>
            </div>
        `)
        .join("");
}

function prepareDocumentOutput() {
    const creatorLayout = document.getElementById("creator-print-layout");
    if (creatorLayout) {
        currentProfile.print_layout = creatorLayout.value || currentProfile.print_layout || "pdf";
    }
    const settingsLayout = document.getElementById("print-layout");
    if (settingsLayout) settingsLayout.value = currentProfile.print_layout || "pdf";
    applyReceiptLanguage();
    updateInvoicePreview();
    applyInvoiceThemeColor();
}

function sanitizeFileName(value) {
    return String(value || "Valora-EM-document")
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 90);
}

function getInvoicePdfFileName() {
    const number = document.getElementById("inv-number")?.value || "document";
    const type = documentTypeLabels[document.getElementById("inv-type")?.value] || "Document";
    return `${sanitizeFileName(`Valora-EM-${type}-${number}`)}.pdf`;
}

function getCurrentSignatureExportUrl() {
    const showSignature = document.getElementById("show-signature-checkbox")?.checked;
    if (!showSignature) return "";
    if (sigCanvas && !isCanvasBlank(sigCanvas)) {
        return sigCanvas.toDataURL();
    }
    const previewImage = document.getElementById("preview-signature-img");
    return previewImage?.src || "";
}

function buildCleanInvoiceExportElement() {
    const layout = currentProfile.print_layout || "pdf";
    const thermal58 = layout === "thermal-58";
    const thermal80 = layout === "thermal-80";
    const lang = currentProfile.document_language || currentProfile.preferred_language || "en";
    const meta = receiptLanguageMeta[lang] || { dir: "ltr", font: "var(--font-sans)" };
    const invoiceNumber = document.getElementById("inv-number")?.value.trim() || "INV-0001";
    const documentType = documentTypeLabels[document.getElementById("inv-type")?.value] || "Invoice";
    const issueDate = document.getElementById("inv-date")?.value || "";
    const dueDate = document.getElementById("inv-duedate")?.value || "";
    const clientId = document.getElementById("inv-client-select")?.value || "";
    const client = clients.find((item) => String(item.id) === String(clientId));
    const notes = document.getElementById("inv-notes")?.value || "";
    const taxRate = parseFloat(document.getElementById("inv-tax-rate")?.value) || 0;
    const discount = parseFloat(document.getElementById("inv-discount")?.value) || 0;
    const shipping = parseFloat(document.getElementById("inv-shipping")?.value) || 0;

    let subtotal = 0;
    const itemRows = currentInvoiceItems.map((item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        const rowTotal = quantity * unitPrice;
        subtotal += rowTotal;
        return `
            <div class="invoice-render-line-row" style="display: grid; grid-template-columns: minmax(0, 1fr) 46px 82px 86px; align-items: start; width: 100%; position: static !important; page-break-inside: avoid !important; break-inside: avoid !important; border-bottom: 1px solid #f1f5f9;">
                <div style="padding: 12px; font-size: 13px; position: static !important; overflow: visible !important; overflow-wrap: anywhere;"><strong>${escapeHtml(item.description || "Description")}</strong></div>
                <div style="padding: 12px 8px; font-size: 13px; text-align: center; position: static !important; overflow: visible !important;">${escapeHtml(quantity)}</div>
                <div style="padding: 12px 8px; font-size: 13px; text-align: right; position: static !important; overflow: visible !important; white-space: nowrap;">${formatCurrency(unitPrice)}</div>
                <div style="padding: 12px 8px; font-size: 13px; text-align: right; font-weight: 600; position: static !important; overflow: visible !important; white-space: nowrap;">${formatCurrency(rowTotal)}</div>
            </div>
        `;
    }).join("") || `
        <div class="invoice-render-line-row" style="display: grid; grid-template-columns: minmax(0, 1fr) 46px 82px 86px; align-items: start; width: 100%; position: static !important; page-break-inside: avoid !important; break-inside: avoid !important; border-bottom: 1px solid #f1f5f9;">
            <div style="padding: 12px; font-size: 13px; position: static !important; overflow: visible !important;"><strong>${escapeHtml(getReceiptText("description"))}</strong></div>
            <div style="padding: 12px 8px; font-size: 13px; text-align: center; position: static !important; overflow: visible !important;">0</div>
            <div style="padding: 12px 8px; font-size: 13px; text-align: right; position: static !important; overflow: visible !important; white-space: nowrap;">${formatCurrency(0)}</div>
            <div style="padding: 12px 8px; font-size: 13px; text-align: right; font-weight: 600; position: static !important; overflow: visible !important; white-space: nowrap;">${formatCurrency(0)}</div>
        </div>
    `;

    const taxAmount = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxAmount + shipping - discount;
    const logoHtml = currentProfile.logo_url
        ? `<img src="${escapeHtml(currentProfile.logo_url)}" alt="Store logo">`
        : `<span>LOGO</span>`;
    const storeDetails = [
        currentProfile.address ? escapeHtml(currentProfile.address) : "",
        currentProfile.phone ? `Phone: ${escapeHtml(currentProfile.phone)}` : "",
        currentProfile.email ? `Email: ${escapeHtml(currentProfile.email)}` : ""
    ].filter(Boolean).join("<br>");
    const signatureUrl = getCurrentSignatureExportUrl();
    const printedName = document.getElementById("printed-name")?.value.trim() || "";
    const requestClientSignature = document.getElementById("request-client-signature-checkbox")?.checked;
    const photosHtml = currentDocumentPhotos.length
        ? `<div class="invoice-render-attachments invoice-attachment-wrapper" style="display: block; width: 100%; margin-top: 16px; text-align: left; position: static !important; page-break-inside: avoid !important; break-inside: avoid !important;">
            ${currentDocumentPhotos.map((src) => `
                <div class="invoice-render-attachment invoice-attachment-wrapper" style="display: block; width: 180px; margin: 0 0 10px 0; position: static !important; page-break-inside: avoid !important; break-inside: avoid !important;">
                    <img src="${escapeHtml(src)}" alt="Attached document photo" style="display: block; width: 180px !important; height: 100px !important; max-width: 180px !important; max-height: 100px !important; object-fit: cover !important; border: 1px solid #e2e8f0; border-radius: 6px; position: static !important;">
                </div>
            `).join("")}
        </div>`
        : "";
    const signatureHtml = signatureUrl
        ? `<div class="invoice-render-signature" style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; margin-top: 20px; position: static !important; page-break-inside: avoid !important; break-inside: avoid !important;">
            <img src="${escapeHtml(signatureUrl)}" alt="Authorized Signature" style="display: block; max-width: 180px; max-height: 70px; object-fit: contain; position: static !important;">
            ${printedName ? `<strong style="font-size: 12px;">${escapeHtml(printedName)}</strong>` : ""}
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">${escapeHtml(getReceiptText("signature"))}</span>
        </div>`
        : "";
    const clientSignatureHtml = requestClientSignature
        ? `<div class="invoice-render-signature" style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; margin-top: 20px; position: static !important; page-break-inside: avoid !important; break-inside: avoid !important;">
            <div style="width: 180px; border-bottom: 1px solid #94a3b8; height: 34px;"></div>
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">${escapeHtml(getReceiptText("clientSignature"))}</span>
        </div>`
        : "";

    const exportElement = document.createElement("div");
    exportElement.id = "invoice-render-root";
    exportElement.className = `invoice-render-root invoice-export-document print-layout-${layout}`;
    exportElement.dataset.exportFlow = "pdf-grid-v36";
    exportElement.setAttribute("dir", meta.dir);
    exportElement.style.fontFamily = meta.font;
    exportElement.style.width = thermal58 ? "58mm" : thermal80 ? "80mm" : "180mm";
    exportElement.style.maxWidth = thermal58 ? "58mm" : thermal80 ? "80mm" : "180mm";
    exportElement.style.boxSizing = "border-box";
    exportElement.style.display = "block";
    exportElement.style.position = "static";
    exportElement.style.float = "none";
    exportElement.style.clear = "both";
    exportElement.style.overflow = "visible";
    exportElement.style.margin = "0 auto";
    exportElement.style.backgroundColor = "#ffffff";
    exportElement.style.backgroundImage = "none";
    exportElement.style.color = currentProfile.invoice_text_color || "#1e293b";
    exportElement.innerHTML = `
        <div class="invoice-render-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; width: 100%; margin-bottom: 30px; position: static !important;">
            <div class="invoice-render-vendor" style="position: static !important; min-width: 0; flex: 1;">
                <div class="invoice-render-logo" style="width: 60px; height: 60px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #64748b; position: static !important;">${logoHtml}</div>
                <h3 style="margin: 12px 0 4px; font-weight: 700; font-size: 18px;">${escapeHtml(currentProfile.company_name || "My Business")}</h3>
                <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin: 0 0 18px;">${storeDetails || "Add address & contact details in Settings"}</p>
                <strong style="display: block; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; margin-bottom: 4px;">${escapeHtml(getReceiptText("billedTo"))}</strong>
                <p style="font-size: 13px; margin: 0;"><strong>${escapeHtml(client?.name || getReceiptText("walkIn"))}</strong></p>
                <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin: 3px 0 0;">
                    ${escapeHtml(client?.email || "")}${client?.email ? "<br>" : ""}
                    ${escapeHtml(client?.phone || "")}${client?.phone ? "<br>" : ""}
                    ${escapeHtml(client?.address || "")}
                </p>
            </div>
            <div class="invoice-render-meta" style="text-align: right; position: static !important; width: 175px; min-width: 175px; flex: 0 0 175px; overflow: visible !important; white-space: nowrap;">
                <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 800; color: ${escapeHtml(currentProfile.invoice_theme_color || "#6366f1")};">${escapeHtml(documentType.toUpperCase())}</h1>
                <p style="font-size: 13px; font-weight: 700; margin: 0 0 8px;">${escapeHtml(invoiceNumber)}</p>
                <p style="font-size: 12px; color: #64748b; margin: 3px 0;">${escapeHtml(getReceiptText("date"))}: ${escapeHtml(issueDate)}</p>
                <p style="font-size: 12px; color: #64748b; margin: 3px 0;">${escapeHtml(getReceiptText("dueDate"))}: ${escapeHtml(dueDate)}</p>
            </div>
        </div>

        <div class="invoice-render-lines-block" style="display: block; width: 100%; clear: both; position: static !important; page-break-inside: auto !important; break-inside: auto !important; overflow: visible !important;">
            <div class="invoice-render-lines-header" style="display: grid; grid-template-columns: minmax(0, 1fr) 46px 82px 86px; align-items: start; width: 100%; background: #f8fafc; border-bottom: 2px solid ${escapeHtml(currentProfile.invoice_theme_color || "#6366f1")}; position: static !important; page-break-inside: avoid !important; break-inside: avoid !important;">
                <div style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; color: #475569; overflow: visible !important;">${escapeHtml(getReceiptText("description"))}</div>
                <div style="padding: 10px 8px; text-align: center; font-size: 12px; font-weight: 700; color: #475569; overflow: visible !important;">${escapeHtml(getReceiptText("qty"))}</div>
                <div style="padding: 10px 8px; text-align: right; font-size: 12px; font-weight: 700; color: #475569; overflow: visible !important; white-space: nowrap;">${escapeHtml(getReceiptText("unitPrice"))}</div>
                <div style="padding: 10px 8px; text-align: right; font-size: 12px; font-weight: 700; color: #475569; overflow: visible !important; white-space: nowrap;">${escapeHtml(getReceiptText("total"))}</div>
            </div>
            <div class="invoice-render-lines-body" style="display: block; width: 100%; position: static !important; page-break-inside: auto !important; break-inside: auto !important; overflow: visible !important;">${itemRows}</div>
        </div>

        <div class="invoice-render-footer" style="display: block; width: 100%; margin-top: 20px; position: static !important; clear: both; page-break-inside: auto !important; break-inside: auto !important;">
            <div class="invoice-render-totals" style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; border-top: 2px solid #e2e8f0; padding-top: 15px; position: static !important;">
                <div style="display: flex; width: 200px; justify-content: space-between; font-size: 13px;"><span>${escapeHtml(getReceiptText("subtotal"))}</span><span>${formatCurrency(subtotal)}</span></div>
                <div style="display: flex; width: 200px; justify-content: space-between; font-size: 13px;"><span>${escapeHtml(getReceiptText("tax"))} (${taxRate}%)</span><span>${formatCurrency(taxAmount)}</span></div>
                <div style="display: flex; width: 200px; justify-content: space-between; font-size: 13px;"><span>${escapeHtml(getReceiptText("discount"))}</span><span>${formatCurrency(discount)}</span></div>
                <div style="display: flex; width: 200px; justify-content: space-between; font-size: 13px;"><span>${escapeHtml(getReceiptText("shipping"))}</span><span>${formatCurrency(shipping)}</span></div>
                <div style="display: flex; width: 200px; justify-content: space-between; font-size: 16px; font-weight: 700; border-top: 1px solid #e2e8f0; padding-top: 6px; color: #0f172a;"><span>${escapeHtml(getReceiptText("grandTotal"))}</span><span>${formatCurrency(grandTotal)}</span></div>
            </div>
            <div class="invoice-render-notes" style="margin-top: 15px; border-top: 1px solid #f1f5f9; padding-top: 12px; font-size: 11px; color: #64748b; line-height: 1.4; position: static !important; page-break-inside: avoid !important; break-inside: avoid !important;">
                <strong>${escapeHtml(getReceiptText("notes"))}</strong>
                <p>${escapeHtml(notes || "Enter notes here.")}</p>
            </div>
            ${photosHtml}
            ${signatureHtml}
            ${clientSignatureHtml}
        </div>
    `;
    return exportElement;
}

function normalizeInvoiceExportElement(root) {
    if (!root) return root;

    root.style.position = "static";
    root.style.float = "none";
    root.style.clear = "both";
    root.style.overflow = "visible";
    root.style.transform = "none";
    root.style.boxSizing = "border-box";
    root.style.backgroundImage = "none";

    root.querySelectorAll("*").forEach((element) => {
        element.style.position = "static";
        element.style.float = "none";
        element.style.clear = "none";
        element.style.transform = "none";
        element.style.inset = "auto";
        element.style.top = "auto";
        element.style.right = "auto";
        element.style.bottom = "auto";
        element.style.left = "auto";
        element.style.zIndex = "auto";
        element.style.overflow = "visible";
        element.style.boxSizing = "border-box";
        element.style.maxWidth = "100%";
        element.style.backgroundImage = "none";
    });

    const header = root.querySelector(".invoice-render-header");
    if (header) {
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "flex-start";
        header.style.gap = "18px";
        header.style.width = "100%";
        header.style.marginBottom = "30px";
        header.style.pageBreakInside = "avoid";
        header.style.breakInside = "avoid";
    }

    const vendor = root.querySelector(".invoice-render-vendor");
    if (vendor) {
        vendor.style.flex = "1 1 auto";
        vendor.style.minWidth = "0";
        vendor.style.overflow = "visible";
    }

    const meta = root.querySelector(".invoice-render-meta");
    if (meta) {
        meta.style.textAlign = "right";
        meta.style.width = "175px";
        meta.style.minWidth = "175px";
        meta.style.maxWidth = "175px";
        meta.style.flex = "0 0 175px";
        meta.style.whiteSpace = "nowrap";
        meta.style.overflow = "visible";
    }

    const linesBlock = root.querySelector(".invoice-render-lines-block");
    if (linesBlock) {
        linesBlock.style.display = "block";
        linesBlock.style.width = "100%";
        linesBlock.style.clear = "both";
        linesBlock.style.pageBreakInside = "auto";
        linesBlock.style.breakInside = "auto";
        linesBlock.style.overflow = "visible";
    }

    root.querySelectorAll(".invoice-render-lines-header, .invoice-render-line-row").forEach((row) => {
        row.style.display = "grid";
        row.style.gridTemplateColumns = "minmax(0, 1fr) 46px 82px 86px";
        row.style.alignItems = "start";
        row.style.width = "100%";
        row.style.pageBreakInside = "avoid";
        row.style.breakInside = "avoid";
        row.style.overflow = "visible";
    });

    const linesBody = root.querySelector(".invoice-render-lines-body");
    if (linesBody) {
        linesBody.style.display = "block";
        linesBody.style.width = "100%";
        linesBody.style.pageBreakInside = "auto";
        linesBody.style.breakInside = "auto";
        linesBody.style.overflow = "visible";
    }

    const footer = root.querySelector(".invoice-render-footer");
    const attachments = root.querySelector(".invoice-render-attachments");
    if (footer) {
        footer.style.display = "block";
        footer.style.width = "100%";
        footer.style.clear = "both";
        footer.style.marginTop = "20px";
        footer.style.pageBreakInside = "auto";
        footer.style.breakInside = "auto";
        footer.style.overflow = "visible";
        if (linesBlock && footer.previousElementSibling !== linesBlock) {
            linesBlock.insertAdjacentElement("afterend", footer);
        }
        if (attachments && attachments.parentElement !== footer) {
            footer.appendChild(attachments);
        }
    }

    root.querySelectorAll(".invoice-render-totals, .invoice-render-notes, .invoice-render-attachments, .invoice-render-attachment, .invoice-render-signature").forEach((block) => {
        block.style.pageBreakInside = "avoid";
        block.style.breakInside = "avoid";
        block.style.overflow = "visible";
    });

    root.querySelectorAll(".invoice-render-attachment img").forEach((img) => {
        img.style.display = "block";
        img.style.width = "180px";
        img.style.height = "100px";
        img.style.maxWidth = "180px";
        img.style.maxHeight = "100px";
        img.style.objectFit = "cover";
        img.style.overflow = "visible";
    });

    return root;
}

function clonePrintableInvoiceElement() {
    return normalizeInvoiceExportElement(buildCleanInvoiceExportElement());
}

function waitForInvoiceImages(root) {
    const images = Array.from(root.querySelectorAll("img")).filter((img) => img.src && !img.complete);
    return Promise.all(images.map((img) => new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
    })));
}

function loadPdfExportLibrary() {
    if (window.html2pdf) return Promise.resolve(window.html2pdf);
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${PDF_EXPORT_LIBRARY_URL}"]`);
        if (existing) {
            existing.addEventListener("load", () => resolve(window.html2pdf));
            existing.addEventListener("error", reject);
            return;
        }
        const script = document.createElement("script");
        script.src = PDF_EXPORT_LIBRARY_URL;
        script.async = true;
        script.onload = () => window.html2pdf ? resolve(window.html2pdf) : reject(new Error("PDF library did not initialize."));
        script.onerror = () => reject(new Error("PDF library could not be loaded."));
        document.head.appendChild(script);
    });
}

function getPdfExportOptions(fileName) {
    const layout = currentProfile.print_layout || "pdf";
    const thermal58 = layout === "thermal-58";
    const thermal80 = layout === "thermal-80";
    const scale = Math.min(2, Math.max(1.4, window.devicePixelRatio || 1.6));

    return {
        filename: fileName,
        margin: thermal58 || thermal80 ? [3, 3, 3, 3] : [10, 10, 10, 12],
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
            scale,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            scrollX: 0,
            scrollY: 0,
            ignoreElements: (element) => element?.hasAttribute?.("data-html2canvas-ignore") || element?.classList?.contains("invoice-photo-remove-btn")
        },
        jsPDF: {
            unit: "mm",
            format: thermal58 ? [58, 297] : thermal80 ? [80, 297] : "a4",
            orientation: "portrait",
            compress: true
        },
        pagebreak: {
            mode: ["css"],
            before: [".pdf-page-break-before"],
            avoid: [
                ".invoice-render-header",
                ".invoice-render-lines-header",
                ".invoice-render-line-row",
                ".invoice-render-totals",
                ".invoice-render-notes",
                ".invoice-render-attachments",
                ".invoice-render-attachment",
                ".invoice-render-signature"
            ]
        }
    };
}

function createPdfExportStage(clone) {
    const stage = document.createElement("div");
    stage.className = "pdf-export-stage";
    stage.setAttribute("aria-hidden", "true");
    stage.appendChild(clone);
    document.body.appendChild(stage);
    return stage;
}

function isMobilePdfOpenPreferred() {
    const ua = navigator.userAgent || "";
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return isiOS || /Android|Mobile|CriOS|FxiOS|EdgiOS/i.test(ua);
}

function openReservedPdfWindow(fileName) {
    try {
        const win = window.open("", "_blank");
        if (!win) return null;
        win.opener = null;
        win.document.write(`<!doctype html><title>${fileName}</title><body style="font-family:sans-serif;padding:24px;">Preparing PDF...</body>`);
        win.document.close();
        return win;
    } catch (err) {
        return null;
    }
}

function openPdfBlobInNewTab(blob, fileName, reservedWindow = null) {
    const url = URL.createObjectURL(blob);
    const releaseUrl = () => setTimeout(() => URL.revokeObjectURL(url), 60000);
    try {
        if (reservedWindow && !reservedWindow.closed) {
            reservedWindow.location.href = url;
            releaseUrl();
            return true;
        }
        const opened = window.open(url, "_blank");
        if (opened) {
            opened.opener = null;
            releaseUrl();
            return true;
        }
    } catch (err) {
        console.warn("PDF new-tab fallback failed:", err);
    }
    releaseUrl();
    return false;
}

function triggerPdfDownload(blob, fileName) {
    try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.rel = "noopener";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return true;
    } catch (err) {
        console.warn("PDF direct download failed:", err);
        return false;
    }
}

function getStylesheetHref() {
    const stylesheet = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((link) => link.href.includes("styles.css"));
    return stylesheet ? stylesheet.href : `${window.location.origin}/styles.css`;
}

function openPrintableInvoiceWindow(reservedWindow = null) {
    const clone = clonePrintableInvoiceElement();
    if (!clone) return false;
    const fileName = getInvoicePdfFileName();
    const stylesheetHref = getStylesheetHref();
    const target = reservedWindow && !reservedWindow.closed ? reservedWindow : window.open("", "_blank");
    if (!target) return false;
    target.opener = null;
    target.document.open();
    target.document.write(`
        <!doctype html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${fileName}</title>
            <link rel="stylesheet" href="${stylesheetHref}">
            <style>
                body { margin: 0; padding: 16px; background: #ffffff; }
                #invoice-render-root,
                #invoice-render-root * {
                    position: static !important;
                    float: none !important;
                }
                #invoice-render-root {
                    box-shadow: none !important;
                    margin: 0 auto !important;
                    display: block !important;
                    overflow: visible !important;
                    clear: both !important;
                }
                .invoice-render-header,
                .invoice-render-lines-header,
                .invoice-render-line-row,
                .invoice-render-totals,
                .invoice-render-notes,
                .invoice-render-attachments,
                .invoice-render-attachment,
                .invoice-render-signature {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                    -webkit-column-break-inside: avoid !important;
                }
                .invoice-render-lines-block,
                .invoice-render-lines-body,
                .invoice-render-footer {
                    break-inside: auto !important;
                    page-break-inside: auto !important;
                    -webkit-column-break-inside: auto !important;
                }
                .invoice-render-lines-header,
                .invoice-render-line-row {
                    display: grid !important;
                    grid-template-columns: minmax(0, 1fr) 46px 82px 86px !important;
                    align-items: start !important;
                    width: 100% !important;
                    overflow: visible !important;
                }
                .invoice-render-attachment img {
                    width: 180px !important;
                    height: 100px !important;
                    max-width: 180px !important;
                    max-height: 100px !important;
                    object-fit: cover !important;
                }
                .invoice-photo-remove-btn, [data-html2canvas-ignore] { display: none !important; }
                @media print {
                    body { padding: 0 !important; }
                    #invoice-render-root { border: 0 !important; box-shadow: none !important; display: block !important; overflow: visible !important; }
                }
            </style>
        </head>
        <body>
            ${clone.outerHTML}
            <script>
                window.addEventListener("load", function () {
                    setTimeout(function () { window.print(); }, 300);
                });
            <\/script>
        </body>
        </html>
    `);
    target.document.close();
    return true;
}

function printInvoiceDocument() {
    prepareDocumentOutput();
    setTimeout(() => {
        if (!openPrintableInvoiceWindow()) {
            window.print();
        }
    }, 80);
}

async function saveInvoiceAsPdf() {
    prepareDocumentOutput();
    const fileName = getInvoicePdfFileName();
    const preferNewTab = isMobilePdfOpenPreferred();
    const reservedWindow = preferNewTab ? openReservedPdfWindow(fileName) : null;
    let stage = null;

    try {
        await loadPdfExportLibrary();
        const clone = clonePrintableInvoiceElement();
        if (!clone) throw new Error("Invoice preview is not available.");
        stage = createPdfExportStage(clone);
        await waitForInvoiceImages(stage);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const blob = await window.html2pdf()
            .set(getPdfExportOptions(fileName))
            .from(clone)
            .outputPdf("blob");

        if (preferNewTab) {
            if (openPdfBlobInNewTab(blob, fileName, reservedWindow)) {
                createToast("PDF opened in a new tab. Use Share, Save to Files, or Print if your browser asks.");
                return;
            }
        }

        if (triggerPdfDownload(blob, fileName)) {
            if (reservedWindow && !reservedWindow.closed) reservedWindow.close();
            createToast("PDF download started.");
            return;
        }

        if (openPdfBlobInNewTab(blob, fileName, reservedWindow)) {
            createToast("PDF opened in a new tab because the download was blocked.");
            return;
        }

        throw new Error("Browser blocked the PDF download and new-tab fallback.");
    } catch (err) {
        console.warn("PDF export fallback:", err);
        if (openPrintableInvoiceWindow(reservedWindow)) {
            createToast("PDF download was blocked, so a printable invoice opened in a new tab. Choose Save as PDF from the browser print dialog.");
        } else {
            createToast("Unable to open the PDF fallback. Please use the Print button and choose Save as PDF.", true);
        }
    } finally {
        if (stage) stage.remove();
    }
}

async function handleLogoFile(file) {
    if (!hasLogoUploadAccess()) {
        alert("Logo upload is available on Pro Unlimited and Business Unlimited plans.");
        return;
    }
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        alert("Please upload an image file.");
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        alert("Maximum size supported is 2MB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        currentProfile.logo_url = event.target.result;
        renderLogoAccessUI();

        if (isCloudActive) {
            await supabaseClient.from("profiles").update({ logo_url: currentProfile.logo_url }).eq("id", currentUser.id);
        } else {
            saveLocalStorageProfile();
        }
    };
    reader.readAsDataURL(file);
}

function initDropZone(dropZoneId, inputId, onFiles) {
    const dropZone = document.getElementById(dropZoneId);
    const input = document.getElementById(inputId);
    if (!dropZone || !input) return;

    dropZone.addEventListener("click", (event) => {
        if (event.target !== input && event.target.tagName !== "BUTTON") {
            input.click();
        }
    });

    ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.add("drag-over");
        });
    });

    ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropZone.classList.remove("drag-over");
        });
    });

    dropZone.addEventListener("drop", (event) => {
        const files = Array.from(event.dataTransfer?.files || []);
        if (files.length) onFiles(files);
    });
}

function getStoreSavedItems(profileId = activeBusinessProfileId) {
    return savedItems.filter((item) => item.business_profile_id === profileId);
}

function renderSavedItemsDatalist() {
    const datalist = document.getElementById("saved-items-datalist");
    if (!datalist) return;
    datalist.innerHTML = getStoreSavedItems()
        .map((item) => `<option value="${escapeHtml(item.name)}">${currentProfile.currency_symbol}${Number(item.unit_price || 0).toFixed(2)}</option>`)
        .join("");
}

function renderSavedItemsUI() {
    renderSavedItemsDatalist();
    const tbody = document.querySelector("#saved-items-table tbody");
    const status = document.getElementById("catalog-access-note");
    const itemName = document.getElementById("catalog-item-name");
    const itemPrice = document.getElementById("catalog-item-price");
    const saveButton = document.getElementById("save-catalog-item-btn");
    const cloneCheckbox = document.getElementById("clone-catalog-checkbox");
    const allowed = hasCatalogAccess();

    [itemName, itemPrice, saveButton, cloneCheckbox].forEach((element) => {
        if (element) element.disabled = !allowed;
    });
    if (status) {
        status.innerText = allowed
            ? "Saved items are attached to the active business profile."
            : "Item catalog is available on Business Unlimited because it syncs across store profiles.";
    }
    if (!tbody) return;

    const items = getStoreSavedItems();
    tbody.innerHTML = "";
    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No saved items for this store yet.</td></tr>';
        return;
    }

    items.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(item.name)}</td>
            <td>${currentProfile.currency_symbol}${Number(item.unit_price || 0).toFixed(2)}</td>
            <td style="text-align: right;">
                <button class="btn btn-sm btn-secondary btn-danger" onclick="deleteCatalogItem('${item.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function saveCatalogItem() {
    if (!hasCatalogAccess()) {
        alert("Item catalog is available on Business Unlimited.");
        return;
    }

    const name = document.getElementById("catalog-item-name").value.trim();
    const price = parseFloat(document.getElementById("catalog-item-price").value) || 0;
    const cloneAcrossStores = document.getElementById("clone-catalog-checkbox").checked;
    if (!name) {
        alert("Please enter an item name.");
        return;
    }

    const targetProfiles = cloneAcrossStores ? businessProfiles : [getActiveBusinessProfile()];
    const newItems = targetProfiles.filter(Boolean).map((profile) => ({
        id: `saved-${Date.now()}-${profile.id}-${Math.random().toString(36).slice(2, 6)}`,
        user_id: currentUser.id,
        business_profile_id: profile.id,
        name,
        unit_price: price,
        created_at: new Date().toISOString()
    }));

    savedItems = savedItems.filter((item) => !newItems.some((newItem) =>
        newItem.business_profile_id === item.business_profile_id &&
        item.name.toLowerCase() === name.toLowerCase()
    ));
    savedItems.push(...newItems);

    if (hasCloudConnection()) {
        const { error } = await supabaseClient.from("saved_items").upsert(newItems, { onConflict: "business_profile_id,name" });
        if (error) console.warn("Saved item cloud save skipped:", error.message);
    }

    saveLocalData();
    document.getElementById("catalog-item-name").value = "";
    document.getElementById("catalog-item-price").value = "";
    renderSavedItemsUI();
    createToast("Catalog item saved.");
}

async function deleteCatalogItem(id) {
    savedItems = savedItems.filter((item) => item.id !== id);
    if (hasCloudConnection()) {
        await supabaseClient.from("saved_items").delete().eq("id", id);
    }
    saveLocalData();
    renderSavedItemsUI();
}

function maybeApplySavedItem(itemId, description) {
    const item = getStoreSavedItems().find((savedItem) => savedItem.name.toLowerCase() === String(description || "").trim().toLowerCase());
    if (!item) return;
    const invoiceItem = currentInvoiceItems.find((line) => line.id === itemId);
    if (!invoiceItem) return;
    invoiceItem.unit_price = Number(item.unit_price) || 0;
    const priceInput = document.querySelector(`[data-item-price="${itemId}"]`);
    const rowTotal = document.querySelector(`[data-row-total="${itemId}"]`);
    if (priceInput) priceInput.value = invoiceItem.unit_price;
    if (rowTotal) rowTotal.innerText = `${currentProfile.currency_symbol}${(invoiceItem.quantity * invoiceItem.unit_price).toFixed(2)}`;
    updateInvoicePreview();
}

async function fetchSupportTickets() {
    if (!hasCloudConnection()) return;
    const ticketsQuery = isAdminUser()
        ? supabaseClient.from("tickets").select("*").order("created_at", { ascending: false })
        : supabaseClient.from("tickets").select("*").order("created_at", { ascending: false });
    const { data: dbTickets, error: ticketsError } = await ticketsQuery;
    if (!ticketsError && dbTickets) {
        supportTickets = dbTickets.filter((ticket) => isAdminUser() ? !ticket.deleted_by_admin : !ticket.deleted_by_user);
    } else if (ticketsError) {
        logSupabaseError("tickets select", ticketsError);
    }

    const { data: dbMessages, error: messagesError } = await supabaseClient
        .from("ticket_messages")
        .select("*")
        .order("created_at", { ascending: true });
    if (!messagesError && dbMessages) {
        ticketMessages = dbMessages;
    } else if (messagesError) {
        logSupabaseError("ticket_messages select", messagesError);
    }
}

function getVisibleTickets() {
    const visible = isAdminUser()
        ? supportTickets.filter((ticket) => !ticket.deleted_by_admin)
        : supportTickets.filter((ticket) => !ticket.deleted_by_user && (ticket.user_id === currentUser.id || ticket.customer_email === currentUser.email));
    return visible;
}

function isTicketMessageUnread(message, adminMode = false) {
    if (adminMode) {
        return !message.is_admin_reply && message.is_read_by_admin === false;
    }
    return !!message.is_admin_reply && message.is_read_by_user === false;
}

function getUnreadTicketMessageCount(adminMode = false) {
    const visibleTicketIds = new Set(getVisibleTickets().map((ticket) => ticket.id));
    return ticketMessages.filter((message) => (
        visibleTicketIds.has(message.ticket_id) &&
        isTicketMessageUnread(message, adminMode)
    )).length;
}

function ticketHasUnreadMessages(ticketId, adminMode = false) {
    return ticketMessages.some((message) => (
        message.ticket_id === ticketId &&
        isTicketMessageUnread(message, adminMode)
    ));
}

function setUnreadBadge(key, count) {
    document.querySelectorAll(`[data-unread-badge="${key}"], #${key}-badge`).forEach((badge) => {
        badge.innerText = count > 99 ? "99+" : String(count);
        badge.style.display = count > 0 ? "inline-flex" : "none";
    });
}

function updateUnreadBadges() {
    const featureCount = isAdminUser()
        ? featureRequestsCache.filter((request) => !request.is_deleted && request.is_read_by_admin === false).length
        : 0;
    const bugCount = getUnreadTicketMessageCount(isAdminUser());
    setUnreadBadge("feature-requests", featureCount);
    setUnreadBadge("bug-report", bugCount);
}

async function markFeatureRequestsRead(requestIds) {
    if (!isAdminUser() || !requestIds.length) return;
    featureRequestsCache = featureRequestsCache.map((request) => (
        requestIds.includes(request.id) ? { ...request, is_read_by_admin: true } : request
    ));
    updateUnreadBadges();

    if (hasCloudConnection()) {
        const { error } = await supabaseClient
            .from("feature_requests")
            .update({ is_read_by_admin: true })
            .in("id", requestIds);
        if (error) logSupabaseError("feature_requests mark read", error, { requestIds });
    } else {
        saveFeatureRequests(featureRequestsCache);
    }
}

async function markTicketRead(ticketId, adminMode = false) {
    const unreadMessages = ticketMessages.filter((message) => (
        message.ticket_id === ticketId &&
        isTicketMessageUnread(message, adminMode)
    ));
    if (!unreadMessages.length) return;

    const messageIds = unreadMessages.map((message) => message.id);
    const readField = adminMode ? "is_read_by_admin" : "is_read_by_user";
    unreadMessages.forEach((message) => {
        message[readField] = true;
    });
    updateUnreadBadges();

    if (hasCloudConnection()) {
        const { error } = await supabaseClient
            .from("ticket_messages")
            .update({ [readField]: true })
            .in("id", messageIds);
        if (error) {
            logSupabaseError("ticket_messages mark read", error, { ticketId, messageIds, readField });
        }
    } else {
        saveLocalData();
    }
}

async function deleteSupportTicket(ticketId, adminMode = false) {
    if (!ticketId) return;
    if (!confirm("Permanently delete this bug report and its conversation?")) return;

    if (hasCloudConnection()) {
        const { data, error } = await supabaseClient
            .from("tickets")
            .delete()
            .eq("id", ticketId)
            .select("id");
        if (error) {
            logSupabaseError("tickets delete", error, { ticketId, adminMode });
            createToast(`Could not delete report: ${error.message}`, true);
            return;
        }
        if (!data?.length) {
            createToast("Delete permission is not active yet. Run SUPABASE_REPORT_DELETE_FIX.sql in Supabase.", true);
            return;
        }
    }

    supportTickets = supportTickets.filter((ticket) => ticket.id !== ticketId);
    ticketMessages = ticketMessages.filter((message) => message.ticket_id !== ticketId);
    if (activeTicketId === ticketId) activeTicketId = null;
    if (activeAdminTicketId === ticketId) activeAdminTicketId = null;
    saveLocalData();
    adminMode ? renderAdminTickets() : renderSupportTickets();
    updateUnreadBadges();
    createToast("Bug report deleted.");
}

async function deleteFeatureRequest(requestId) {
    if (!isAdminUser() || !requestId) return;
    if (!confirm("Permanently delete this feedback or feature request?")) return;

    if (hasCloudConnection()) {
        const { data, error } = await supabaseClient
            .from("feature_requests")
            .delete()
            .eq("id", requestId)
            .select("id");
        if (error) {
            logSupabaseError("feature_requests delete", error, { requestId });
            createToast(`Could not delete feedback: ${error.message}`, true);
            return;
        }
        if (!data?.length) {
            createToast("Delete permission is not active yet. Run SUPABASE_REPORT_DELETE_FIX.sql in Supabase.", true);
            return;
        }
    }

    featureRequestsCache = featureRequestsCache.filter((request) => request.id !== requestId);
    saveFeatureRequests(featureRequestsCache);
    renderAdminFeatureInbox();
    updateUnreadBadges();
    createToast("Feedback deleted.");
}

function renderTicketList(containerId, adminMode = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const tickets = adminMode ? supportTickets.filter((ticket) => !ticket.deleted_by_admin) : getVisibleTickets();
    const selectedId = adminMode ? activeAdminTicketId : activeTicketId;
    if (!tickets.length) {
        container.innerHTML = '<div class="ticket-empty">No tickets yet.</div>';
        return;
    }

    container.innerHTML = tickets.map((ticket) => `
        <div class="ticket-list-item ${ticket.id === selectedId ? "active" : ""} ${ticketHasUnreadMessages(ticket.id, adminMode) ? "unread" : ""}">
            <button class="ticket-list-main" type="button" onclick="${adminMode ? "selectAdminTicket" : "selectTicket"}('${ticket.id}')">
                <strong>${escapeHtml(ticket.subject)}</strong>
                ${adminMode
                    ? `<span class="ticket-list-meta">
                        <span>${escapeHtml(ticket.customer_email || "Unknown user")}</span>
                        <span>${new Date(ticket.created_at).toLocaleString()}</span>
                        <span class="ticket-status-badge ${ticket.status === "RESOLVED" ? "resolved" : ""}">${ticket.status}</span>
                    </span>`
                    : `<span>${new Date(ticket.created_at).toLocaleString()} - ${ticket.status}</span>`}
            </button>
            <button class="ticket-delete-btn" type="button" onclick="deleteSupportTicket('${ticket.id}', ${adminMode})" title="Delete ticket">Delete</button>
        </div>
    `).join("");
}

function renderTicketThread(ticketId, threadId, replyBoxId, statusButtonId = null) {
    const thread = document.getElementById(threadId);
    const replyBox = document.getElementById(replyBoxId);
    const statusButton = statusButtonId ? document.getElementById(statusButtonId) : null;
    if (!thread) return;
    const ticket = supportTickets.find((item) => item.id === ticketId);
    if (!ticket) {
        thread.innerHTML = '<div class="ticket-empty">Select a ticket to view the conversation.</div>';
        if (replyBox) replyBox.disabled = true;
        if (statusButton) statusButton.disabled = true;
        return;
    }

    const messages = ticketMessages.filter((message) => message.ticket_id === ticketId);
    thread.innerHTML = messages.map((message) => `
        <div class="ticket-message ${message.is_admin_reply ? "admin-reply" : ""}">
            <span>${message.is_admin_reply ? "Valora EM Support" : escapeHtml(ticket.customer_email || "Customer")}</span>
            <p>${escapeHtml(message.message)}</p>
        </div>
    `).join("") || '<div class="ticket-empty">No messages yet.</div>';
    if (replyBox) replyBox.disabled = ticket.status === "RESOLVED";
    if (statusButton) statusButton.disabled = ticket.status === "RESOLVED";
}

async function createSupportTicket() {
    const subjectInput = document.getElementById("ticket-subject");
    const messageInput = document.getElementById("ticket-message");
    const subject = subjectInput.value.trim();
    const message = messageInput.value.trim();
    if (!subject || !message) {
        alert("Please enter both subject and message.");
        return;
    }

    const cloudUser = hasCloudConnection() ? await getAuthenticatedCloudUser() : currentUser;
    if (!cloudUser?.id) {
        alert("Failed: Missing authenticated user ID. Please sign out and sign in again.");
        return;
    }

    const customerEmail = cloudUser.email || currentUser?.email || currentProfile.email || "";
    const ticket = {
        id: `ticket-${Date.now()}`,
        user_id: cloudUser.id,
        customer_email: customerEmail,
        subject,
        status: "OPEN",
        created_at: new Date().toISOString(),
        is_read_by_admin: false,
        is_read_by_user: true,
        deleted_by_admin: false,
        deleted_by_user: false
    };
    const firstMessage = {
        id: `msg-${Date.now()}`,
        ticket_id: ticket.id,
        sender_id: cloudUser.id,
        message,
        is_admin_reply: false,
        is_read_by_admin: false,
        is_read_by_user: true,
        created_at: new Date().toISOString()
    };

    if (hasCloudConnection()) {
        const profileReady = await ensureCloudUserProfile(cloudUser);
        if (!profileReady) return;

        const ticketPayload = {
            user_id: cloudUser.id,
            customer_email: customerEmail,
            subject,
            status: "OPEN",
            is_read_by_admin: false,
            is_read_by_user: true,
            deleted_by_admin: false,
            deleted_by_user: false
        };
        let { data, error } = await supabaseClient
            .from("tickets")
            .insert([ticketPayload])
            .select("id,user_id,customer_email,subject,status,created_at")
            .single();
        if (error && (
            isMissingSchemaColumnError(error, "is_read_by_admin") ||
            isMissingSchemaColumnError(error, "is_read_by_user") ||
            isMissingSchemaColumnError(error, "deleted_by_admin") ||
            isMissingSchemaColumnError(error, "deleted_by_user")
        )) {
            logSupabaseError("tickets insert missing inbox columns", error, ticketPayload);
            const fallbackPayload = withoutKeys(ticketPayload, ["is_read_by_admin", "is_read_by_user", "deleted_by_admin", "deleted_by_user"]);
            const fallback = await supabaseClient
                .from("tickets")
                .insert([fallbackPayload])
                .select("id,user_id,customer_email,subject,status,created_at")
                .single();
            data = fallback.data;
            error = fallback.error;
        }
        if (error) {
            logSupabaseError("tickets insert", error, ticketPayload);
            alert(`Failed: ${error.message}`);
            return;
        }
        Object.assign(ticket, data);
        firstMessage.ticket_id = ticket.id;
        const messagePayload = {
            ticket_id: ticket.id,
            sender_id: cloudUser.id,
            message,
            is_admin_reply: false,
            is_read_by_admin: false,
            is_read_by_user: true
        };
        let { data: savedMessage, error: messageError } = await supabaseClient
            .from("ticket_messages")
            .insert([messagePayload])
            .select("id,ticket_id,sender_id,message,is_admin_reply,is_read_by_admin,is_read_by_user,created_at")
            .single();
        if (messageError && (
            isMissingSchemaColumnError(messageError, "is_read_by_admin") ||
            isMissingSchemaColumnError(messageError, "is_read_by_user")
        )) {
            logSupabaseError("ticket_messages insert missing unread columns", messageError, messagePayload);
            const fallbackPayload = withoutKeys(messagePayload, ["is_read_by_admin", "is_read_by_user"]);
            const fallback = await supabaseClient
                .from("ticket_messages")
                .insert([fallbackPayload])
                .select("id,ticket_id,sender_id,message,is_admin_reply,created_at")
                .single();
            savedMessage = fallback.data;
            messageError = fallback.error;
        }
        if (messageError) {
            logSupabaseError("ticket_messages insert", messageError, messagePayload);
            alert(`Ticket created, but message failed: ${messageError.message}`);
            return;
        }
        Object.assign(firstMessage, savedMessage);
    }

    supportTickets.unshift(ticket);
    ticketMessages.push(firstMessage);
    activeTicketId = ticket.id;
    saveLocalData();
    updateUnreadBadges();
    subjectInput.value = "";
    messageInput.value = "";
    renderSupportTickets();
    createToast("Ticket sent to Valora EM support.");
}

async function selectTicket(id) {
    activeTicketId = id;
    await markTicketRead(id, false);
    renderSupportTickets();
}

async function selectAdminTicket(id) {
    activeAdminTicketId = id;
    await markTicketRead(id, true);
    renderAdminTickets();
}

async function sendTicketMessage(adminMode = false) {
    const ticketId = adminMode ? activeAdminTicketId : activeTicketId;
    const input = document.getElementById(adminMode ? "admin-ticket-reply" : "ticket-reply");
    const message = input?.value.trim();
    if (!ticketId || !message) {
        alert("Please select a ticket and type a message.");
        return;
    }

    const cloudUser = hasCloudConnection() ? await getAuthenticatedCloudUser() : currentUser;
    if (!cloudUser?.id) {
        alert("Failed: Missing authenticated user ID. Please sign out and sign in again.");
        return;
    }

    const messageRecord = {
        id: `msg-${Date.now()}`,
        ticket_id: ticketId,
        sender_id: cloudUser.id,
        message,
        is_admin_reply: adminMode,
        is_read_by_admin: adminMode,
        is_read_by_user: !adminMode,
        created_at: new Date().toISOString()
    };

    if (hasCloudConnection()) {
        const replyPayload = {
            ticket_id: ticketId,
            sender_id: cloudUser.id,
            message,
            is_admin_reply: adminMode,
            is_read_by_admin: adminMode,
            is_read_by_user: !adminMode
        };
        let { error } = await supabaseClient.from("ticket_messages").insert([replyPayload]);
        if (error && (
            isMissingSchemaColumnError(error, "is_read_by_admin") ||
            isMissingSchemaColumnError(error, "is_read_by_user")
        )) {
            logSupabaseError("ticket_messages reply missing unread columns", error, replyPayload);
            const fallbackPayload = withoutKeys(replyPayload, ["is_read_by_admin", "is_read_by_user"]);
            const fallback = await supabaseClient.from("ticket_messages").insert([fallbackPayload]);
            error = fallback.error;
        }
        if (error) {
            logSupabaseError("ticket_messages reply insert", error, replyPayload);
            alert(`Failed: ${error.message}`);
            return;
        }
    }

    ticketMessages.push(messageRecord);
    input.value = "";
    saveLocalData();
    updateUnreadBadges();
    adminMode ? renderAdminTickets() : renderSupportTickets();
}

async function updateTicketStatus(status) {
    if (!activeAdminTicketId) return;
    const ticket = supportTickets.find((item) => item.id === activeAdminTicketId);
    if (!ticket) return;
    ticket.status = status;
    ticket.is_read_by_admin = true;
    if (hasCloudConnection()) {
        const updatePayload = { status, is_read_by_admin: true };
        let { error } = await supabaseClient.from("tickets").update(updatePayload).eq("id", activeAdminTicketId);
        if (error && isMissingSchemaColumnError(error, "is_read_by_admin")) {
            logSupabaseError("tickets status update missing inbox column", error, updatePayload);
            const fallback = await supabaseClient.from("tickets").update({ status }).eq("id", activeAdminTicketId);
            error = fallback.error;
        }
        if (error) {
            logSupabaseError("tickets status update", error, { id: activeAdminTicketId, status });
            alert(`Failed: ${error.message}`);
            return;
        }
    }
    saveLocalData();
    renderAdminTickets();
}

async function renderSupportTickets() {
    if (hasCloudConnection()) await fetchSupportTickets();
    const tickets = getVisibleTickets();
    if (!activeTicketId && tickets.length) activeTicketId = tickets[0].id;
    if (activeTicketId) await markTicketRead(activeTicketId, false);
    renderTicketList("ticket-list", false);
    renderTicketThread(activeTicketId, "ticket-thread-messages", "ticket-reply");
    updateUnreadBadges();
}

async function renderAdminTickets() {
    if (!isAdminUser()) return;
    if (hasCloudConnection()) await fetchSupportTickets();
    const tickets = supportTickets.filter((ticket) => !ticket.deleted_by_admin);
    if (!activeAdminTicketId && tickets.length) activeAdminTicketId = tickets[0].id;
    if (activeAdminTicketId) await markTicketRead(activeAdminTicketId, true);
    renderTicketList("admin-ticket-list", true);
    renderTicketThread(activeAdminTicketId, "admin-ticket-thread-messages", "admin-ticket-reply", "admin-resolve-ticket-btn");
    updateUnreadBadges();
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

        const { data: dbExpenses, error: expensesError } = await supabaseClient
            .from("expenses")
            .select("*")
            .order("expense_date", { ascending: false });
        if (!expensesError && dbExpenses) {
            expenses = dbExpenses;
        } else if (expensesError) {
            console.warn("Expenses table not ready yet:", expensesError.message);
            expenses = [];
        }

        const { data: dbBusinessProfiles, error: businessProfileError } = await supabaseClient
            .from("business_profiles")
            .select("*")
            .order("created_at", { ascending: true });
        if (!businessProfileError && dbBusinessProfiles) {
            businessProfiles = dbBusinessProfiles;
        } else if (businessProfileError) {
            console.warn("Business profiles table not ready yet:", businessProfileError.message);
        }

        const { data: dbSavedItems, error: savedItemsError } = await supabaseClient
            .from("saved_items")
            .select("*")
            .order("name", { ascending: true });
        if (!savedItemsError && dbSavedItems) {
            savedItems = dbSavedItems;
        } else if (savedItemsError) {
            console.warn("Saved items table not ready yet:", savedItemsError.message);
        }

        await fetchSupportTickets();
        if (isAdminUser()) await getAdminFeatureRequests();
        updateUnreadBadges();
    } catch (err) {
        console.error("Error fetching cloud data:", err);
    }
}

// Fetch database records from LocalStorage
function loadLocalData() {
    const suffix = currentUser.email;
    clients = JSON.parse(localStorage.getItem(`valoraem_clients_${suffix}`)) || [];
    invoices = JSON.parse(localStorage.getItem(`valoraem_invoices_${suffix}`)) || [];
    expenses = JSON.parse(localStorage.getItem(getLocalExpensesKey())) || [];
    businessProfiles = JSON.parse(localStorage.getItem(getLocalBusinessProfilesKey())) || [];
    savedItems = JSON.parse(localStorage.getItem(getLocalSavedItemsKey())) || [];
    supportTickets = JSON.parse(localStorage.getItem(getLocalTicketsKey())) || [];
    ticketMessages = JSON.parse(localStorage.getItem(getLocalTicketMessagesKey())) || [];
    featureRequestsCache = getFeatureRequests().filter((request) => !request.is_deleted);
    updateUnreadBadges();
}

// Save database records to LocalStorage
function saveLocalData() {
    const suffix = currentUser.email;
    localStorage.setItem(`valoraem_clients_${suffix}`, JSON.stringify(clients));
    localStorage.setItem(`valoraem_invoices_${suffix}`, JSON.stringify(invoices));
    localStorage.setItem(getLocalExpensesKey(), JSON.stringify(expenses));
    localStorage.setItem(getLocalBusinessProfilesKey(), JSON.stringify(businessProfiles));
    localStorage.setItem(getLocalSavedItemsKey(), JSON.stringify(savedItems));
    localStorage.setItem(getLocalTicketsKey(), JSON.stringify(supportTickets));
    localStorage.setItem(getLocalTicketMessagesKey(), JSON.stringify(ticketMessages));
}

function getActiveInvoices() {
    return invoices.filter((invoice) => !invoice.is_deleted);
}

function getDeletedInvoices() {
    return invoices.filter((invoice) => invoice.is_deleted);
}

function getInvoiceDate(invoice) {
    return invoice.issue_date || invoice.created_at || "";
}

function isDateInRange(dateValue, startDate, endDate) {
    if (!dateValue) return false;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return false;
    if (startDate && date < startDate) return false;
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (date > end) return false;
    }
    return true;
}

function getPresetDateRange(preset) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (preset === "today") {
        return { start, end: now };
    }
    if (preset === "month") {
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    }
    if (preset === "last30") {
        const last30 = new Date(now);
        last30.setDate(now.getDate() - 30);
        last30.setHours(0, 0, 0, 0);
        return { start: last30, end: now };
    }
    if (preset === "year") {
        return { start: new Date(now.getFullYear(), 0, 1), end: now };
    }
    return { start: null, end: null };
}

function getDashboardFilteredInvoices() {
    const range = getDashboardDateRange();
    if (!range.start && !range.end) return getActiveInvoices();
    return getActiveInvoices().filter((invoice) => isDateInRange(getInvoiceDate(invoice), range.start, range.end));
}

// Update UI headers depending on Pro Status
function updateUserTierUI() {
    const tierDisplay = document.getElementById("user-display-tier");
    const currentTierStatus = document.getElementById("current-tier-status");
    const banner = document.getElementById("trial-warning-banner");
    
    if (isAdminUser() || hasPaidSubscriptionAccess()) {
        const planName = getPlanCanonicalName(getCurrentPlanName());
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
    renderSignatureAccessUI();
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
                currency_symbol: getCurrencySymbol("PHP"),
                default_tax_rate: 12.0,
                app_appearance: "dark",
                preferred_language: "en",
                document_language: "en",
                app_interface_language: "en",
                auto_renewal_enabled: false,
                billing_status: "manual",
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
    const mobileLogoutNav = document.getElementById("mobile-logout-nav");
    if (mobileLogoutNav) {
        mobileLogoutNav.addEventListener("click", logoutCurrentUser);
    }
    document.getElementById("mobile-menu-btn").addEventListener("click", openMobileDrawer);
    document.getElementById("mobile-drawer-close").addEventListener("click", closeMobileDrawer);
    document.getElementById("mobile-drawer-logout").addEventListener("click", async () => {
        await logoutCurrentUser();
        closeMobileDrawer();
    });
    document.getElementById("mobile-drawer-overlay").addEventListener("click", (event) => {
        if (event.target.id === "mobile-drawer-overlay") closeMobileDrawer();
    });
    renderMobileNavigation();

    const tutorialPrimaryBtn = document.getElementById("tutorial-primary-btn");
    if (tutorialPrimaryBtn) tutorialPrimaryBtn.addEventListener("click", nextTutorialStep);

    const tutorialBackBtn = document.getElementById("tutorial-back-btn");
    if (tutorialBackBtn) tutorialBackBtn.addEventListener("click", previousTutorialStep);

    const tutorialSkipBtn = document.getElementById("tutorial-skip-btn");
    if (tutorialSkipBtn) tutorialSkipBtn.addEventListener("click", skipTutorial);

    const tutorialCloseBtn = document.getElementById("tutorial-close-btn");
    if (tutorialCloseBtn) tutorialCloseBtn.addEventListener("click", skipTutorial);

    const learningStartBtn = document.getElementById("learning-start-tutorial-btn");
    if (learningStartBtn) learningStartBtn.addEventListener("click", restartTutorial);

    document.querySelectorAll("[data-tutorial-start]").forEach((button) => {
        button.addEventListener("click", restartTutorial);
    });

    document.querySelectorAll("[data-learning-go]").forEach((button) => {
        button.addEventListener("click", () => switchTab(button.dataset.learningGo));
    });

    const invoiceLimitCloseBtn = document.getElementById("invoice-limit-close-btn");
    if (invoiceLimitCloseBtn) invoiceLimitCloseBtn.addEventListener("click", hideInvoiceLimitUpgradeModal);

    const invoiceLimitUpgradeBtn = document.getElementById("invoice-limit-upgrade-btn");
    if (invoiceLimitUpgradeBtn) {
        invoiceLimitUpgradeBtn.addEventListener("click", () => {
            hideInvoiceLimitUpgradeModal();
            switchTab("billing-tab");
        });
    }

    // Navigation item click links
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => {
            const tabId = item.dataset.tab;
            switchTab(tabId);
        });
    });

    document.getElementById("store-currency").addEventListener("change", (event) => {
        currentProfile.currency = normalizeCurrencyCode(event.target.value);
        currentProfile.currency_symbol = getCurrencySymbol(currentProfile.currency);
        event.target.value = currentProfile.currency;
        syncCurrencySymbolFromCode();
        renderDashboard();
        renderEditorItems();
        renderInvoicesTable();
        updateInvoicePreview();
    });

    document.getElementById("business-profile-select").addEventListener("change", (event) => {
        activeBusinessProfileId = event.target.value;
        localStorage.setItem(`valoraem_active_business_profile_${currentUser.email}`, activeBusinessProfileId);
        applyActiveBusinessProfileToForms();
    });
    document.getElementById("add-business-profile-btn").addEventListener("click", addBusinessProfile);
    document.getElementById("save-catalog-item-btn").addEventListener("click", saveCatalogItem);
    document.getElementById("create-ticket-btn").addEventListener("click", createSupportTicket);
    document.getElementById("send-ticket-message-btn").addEventListener("click", () => sendTicketMessage(false));
    document.getElementById("admin-send-ticket-message-btn").addEventListener("click", () => sendTicketMessage(true));
    document.getElementById("admin-resolve-ticket-btn").addEventListener("click", () => updateTicketStatus("RESOLVED"));

    document.querySelectorAll("[data-billing-cycle]").forEach((button) => {
        button.addEventListener("click", () => {
            billingCycle = button.dataset.billingCycle || "monthly";
            updatePricingDisplay();
        });
    });

    document.querySelectorAll("[data-admin-screen]").forEach((button) => {
        button.addEventListener("click", () => {
            showAdminScreen(button.dataset.adminScreen);
        });
    });

    // Store Settings Save
    document.getElementById("save-store-settings-btn").addEventListener("click", async () => {
        const activeProfile = getActiveBusinessProfile();
        if (isBusinessProfileLocked(activeProfile)) {
            createToast(PROFILE_LOCK_MESSAGE, true);
            return;
        }

        currentProfile.company_name = document.getElementById("store-name").value.trim();
        currentProfile.email = document.getElementById("store-email").value.trim();
        currentProfile.phone = document.getElementById("store-phone").value.trim();
        currentProfile.address = document.getElementById("store-address").value.trim();
        currentProfile.currency = normalizeCurrencyCode(document.getElementById("store-currency").value);
        currentProfile.currency_symbol = getCurrencySymbol(currentProfile.currency);
        syncCurrencySymbolFromCode();
        currentProfile.app_interface_language = document.getElementById("app-interface-language")?.value || "en";
        currentProfile.document_language = document.getElementById("preferred-language")?.value || "en";
        currentProfile.preferred_language = currentProfile.document_language;
        currentProfile.custom_language_name = document.getElementById("custom-language-name")?.value.trim() || "";
        currentProfile.invoice_text_color = document.getElementById("invoice-text-color").value || "#1e293b";
        currentProfile.print_layout = document.getElementById("print-layout").value || "pdf";
        currentProfile.app_appearance = document.getElementById("app-appearance").value || "dark";
        currentProfile.last_business_info_updated_at = new Date().toISOString();
        const updatedBusinessProfile = syncActiveBusinessProfileFromCurrentForm();
        if (updatedBusinessProfile) {
            updatedBusinessProfile.last_business_info_updated_at = currentProfile.last_business_info_updated_at;
        }
        
        if (hasCloudConnection()) {
            const profilePayload = {
                company_name: currentProfile.company_name,
                email: currentProfile.email,
                phone: currentProfile.phone,
                address: currentProfile.address,
                currency: currentProfile.currency,
                currency_symbol: currentProfile.currency_symbol,
                preferred_language: currentProfile.preferred_language,
                document_language: currentProfile.document_language,
                app_interface_language: currentProfile.app_interface_language,
                custom_language_name: currentProfile.custom_language_name,
                invoice_theme_color: currentProfile.invoice_theme_color,
                invoice_text_color: currentProfile.invoice_text_color,
                print_layout: currentProfile.print_layout,
                app_appearance: currentProfile.app_appearance,
                last_business_info_updated_at: currentProfile.last_business_info_updated_at
            };
            const { error } = await updateCloudProfileSettings(profilePayload);
            if (error) alert("Error updating settings: " + error.message);
            else {
                await persistActiveBusinessProfile();
                alert("Store details saved successfully!");
            }
        } else {
            await persistActiveBusinessProfile();
            saveLocalStorageProfile();
            alert("Store details saved locally!");
        }
        
        // Refresh logos/previews
        document.getElementById("user-avatar-char").innerText = currentProfile.company_name.charAt(0).toUpperCase();
        applyAppearance();
        applyInterfaceLanguage();
        populateBusinessProfileSwitcher();
        renderLogoAccessUI();
        applyInvoiceThemeColor();
        updateInvoicePreview();
    });

    // Store Logo File Selection (Converts file to base64 DataURL for offline compatibility)
    document.getElementById("store-logo-file").addEventListener("change", (e) => {
        handleLogoFile(e.target.files[0]);
    });

    initDropZone("logo-drop-zone", "store-logo-file", (files) => handleLogoFile(files[0]));
    initDropZone("document-photo-drop-zone", "document-photo-file", (files) => handleDocumentPhotos({ target: { files } }));

    // Developer Branding Save
    document.getElementById("save-wl-settings-btn").addEventListener("click", () => {
        if (!isAdminUser()) {
            alert("Owner branding settings are only available to the Valora EM admin account.");
            return;
        }

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
        
        if (hasCloudConnection()) {
            const { data, error } = await insertCloudClientRecord(newClient);
            if (error) {
                newClient.id = `client-${Date.now()}`;
                newClient.user_id = currentUser?.id || null;
                clients.push(newClient);
                saveLocalData();
                createToast("Client saved on this device. Supabase blocked cloud sync; run the clients RLS policy fix in SQL Editor.", true);
            } else if (data && data[0]) {
                clients.push(data[0]);
            }
        } else {
            newClient.id = `client-${Date.now()}`;
            clients.push(newClient);
            saveLocalData();
        }
        
        createToast("Client added successfully to directory.");
        document.getElementById("new-client-form").reset();
        renderClientsTable();
        populateClientDropdown();
    });

    document.getElementById("new-expense-form").addEventListener("submit", saveExpenseToDatabase);

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
    document.getElementById("thermal-eco-mode-toggle").addEventListener("change", (event) => {
        thermalEcoModeEnabled = event.target.checked;
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
    document.getElementById("invoice-filter-start").addEventListener("change", renderInvoicesTable);
    document.getElementById("invoice-filter-end").addEventListener("change", renderInvoicesTable);
    document.getElementById("client-search-input").addEventListener("input", renderClientsTable);
    document.getElementById("expense-search-input").addEventListener("input", renderExpensesTable);
    document.getElementById("expense-filter-category").addEventListener("change", renderExpensesTable);

    document.getElementById("dashboard-date-filter").addEventListener("change", () => {
        const custom = document.getElementById("dashboard-date-filter").value === "custom";
        document.getElementById("dashboard-custom-start").style.display = custom ? "block" : "none";
        document.getElementById("dashboard-custom-end").style.display = custom ? "block" : "none";
        renderDashboard();
    });
    document.getElementById("dashboard-custom-start").addEventListener("change", renderDashboard);
    document.getElementById("dashboard-custom-end").addEventListener("change", renderDashboard);

    // Save invoice click
    document.getElementById("save-invoice-btn").addEventListener("click", saveInvoiceToDatabase);

    // Save PDF trigger
    document.getElementById("save-pdf-btn").addEventListener("click", saveInvoiceAsPdf);

    // Print Invoice trigger
    document.getElementById("print-invoice-btn").addEventListener("click", printInvoiceDocument);

    window.addEventListener("beforeprint", prepareDocumentOutput);
    window.addEventListener("afterprint", applyInvoiceThemeColor);

    // Subscription upgrading popup
    document.querySelectorAll(".checkout-plan-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const price = button.dataset.price || "249";
            const regularPrice = button.dataset.regularPrice || price;
            const cycle = button.dataset.billingCycle || billingCycle;
            const plan = button.dataset.plan || "Pro Unlimited";
            if (cycle !== "monthly") {
                createToast("Automatic PayMongo checkout is currently monthly only. Please switch to Monthly billing.", true);
                return;
            }
            document.getElementById("payment-modal").dataset.plan = plan;
            document.getElementById("payment-modal").dataset.price = price;
            document.getElementById("payment-modal").dataset.regularPrice = regularPrice;
            document.getElementById("payment-modal").dataset.billingCycle = cycle;
            document.getElementById("payment-plan-name").innerText = plan;
            document.getElementById("payment-plan-amount").innerText = `PHP ${Number(price).toLocaleString("en-PH")}.00 ${cycle === "yearly" ? "/ Year" : "/ Month"}`;
            const easyPayCheckbox = document.getElementById("enable-easypay-checkbox");
            if (easyPayCheckbox) easyPayCheckbox.checked = false;
            document.getElementById("submit-mock-payment-btn").innerText = `Continue to QR Secure Checkout - PHP ${Number(price).toLocaleString("en-PH")}.00`;
            document.getElementById("payment-modal").style.display = "flex";
        });
    });
    document.getElementById("close-payment-btn").addEventListener("click", () => {
        document.getElementById("payment-modal").style.display = "none";
    });

    // Create tracked PayMongo Hosted Checkout.
    document.getElementById("submit-mock-payment-btn").addEventListener("click", processMockPaymentUpgrade);

    document.getElementById("save-admin-payment-settings-btn").addEventListener("click", savePaymentSettings);
    document.getElementById("admin-activate-plan-btn")?.addEventListener("click", activateVerifiedUserPlan);
    document.getElementById("submit-feature-request-btn").addEventListener("click", submitFeatureRequest);
    document.getElementById("submit-beta-feedback-btn").addEventListener("click", submitBetaFeedback);
    document.getElementById("save-appearance-settings-btn").addEventListener("click", saveAppearanceSettings);
    document.getElementById("open-account-delete-modal-btn").addEventListener("click", showAccountDeleteModal);
    document.getElementById("close-account-delete-modal-btn").addEventListener("click", hideAccountDeleteModal);
    document.getElementById("confirm-account-delete-btn").addEventListener("click", submitAccountDeletionRequest);
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

function getExpenseDate(expense) {
    return expense.expense_date || expense.created_at || "";
}

function getDashboardDateRange() {
    const preset = document.getElementById("dashboard-date-filter")?.value || "all";
    if (preset === "all") return { start: null, end: null };

    const customStart = document.getElementById("dashboard-custom-start")?.value;
    const customEnd = document.getElementById("dashboard-custom-end")?.value;
    return preset === "custom"
        ? { start: customStart ? new Date(customStart) : null, end: customEnd ? new Date(customEnd) : null }
        : getPresetDateRange(preset);
}

function getDashboardFilteredExpenses() {
    const range = getDashboardDateRange();
    if (!range.start && !range.end) return expenses;
    return expenses.filter((expense) => isDateInRange(getExpenseDate(expense), range.start, range.end));
}

function getFilteredExpenses() {
    const query = document.getElementById("expense-search-input")?.value.toLowerCase() || "";
    const category = document.getElementById("expense-filter-category")?.value || "";

    return expenses.filter((expense) => {
        const haystack = [
            expense.category,
            expense.description,
            expense.vendor,
            expense.notes
        ].join(" ").toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const matchesCategory = !category || expense.category === category;
        return matchesQuery && matchesCategory;
    });
}

function getTopExpenseCategory(sourceExpenses) {
    const totals = sourceExpenses.reduce((acc, expense) => {
        const key = expense.category || "Other";
        acc[key] = (acc[key] || 0) + (Number(expense.amount) || 0);
        return acc;
    }, {});
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return sorted.length ? sorted[0][0] : "None";
}

async function saveExpenseToDatabase(event) {
    event.preventDefault();
    if (!hasExpenseAccess()) {
        alert("Expense Tracking is available on Pro Unlimited and Business Unlimited plans.");
        switchTab("billing-tab");
        return;
    }

    const expenseDate = document.getElementById("expense-date").value;
    const category = document.getElementById("expense-category").value;
    const vendor = document.getElementById("expense-vendor").value.trim();
    const description = document.getElementById("expense-description").value.trim();
    const amount = parseFloat(document.getElementById("expense-amount").value) || 0;
    const notes = document.getElementById("expense-notes").value.trim();

    if (!description || amount <= 0) {
        alert("Please enter an expense description and amount.");
        return;
    }

    const expenseData = {
        expense_date: expenseDate,
        category,
        vendor,
        description,
        amount,
        notes,
        business_profile_id: activeBusinessProfileId || null
    };

    if (hasCloudConnection()) {
        const { data, error } = await insertCloudExpenseRecord(expenseData);
        if (error) {
            logSupabaseError("expenses insert", error, expenseData);
            alert(`Failed: ${error.message}`);
            return;
        }
        if (data && data[0]) expenses.unshift(data[0]);
    } else {
        expenses.unshift({
            ...expenseData,
            id: `expense-${Date.now()}`,
            user_id: currentUser?.id || null,
            created_at: new Date().toISOString()
        });
        saveLocalData();
    }

    document.getElementById("new-expense-form").reset();
    document.getElementById("expense-date").value = new Date().toISOString().split("T")[0];
    createToast("Expense saved. Net profit dashboard updated.");
    renderExpensesTable();
    renderDashboard();
}

function renderExpensesTable() {
    const tbody = document.querySelector("#expenses-table tbody");
    if (!tbody) return;
    const allowed = hasExpenseAccess();
    const lockedNote = document.getElementById("expense-locked-note");
    if (lockedNote) lockedNote.style.display = allowed ? "none" : "flex";
    document.querySelectorAll("#new-expense-form input, #new-expense-form select, #new-expense-form textarea, #new-expense-form button")
        .forEach((element) => {
            element.disabled = !allowed;
        });

    const filtered = getFilteredExpenses();
    const total = filtered.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    document.getElementById("expenses-total-value").innerText = formatCurrency(total);
    document.getElementById("expenses-entry-count").innerText = filtered.length;
    document.getElementById("expenses-top-category").innerText = getTopExpenseCategory(filtered);

    tbody.innerHTML = "";
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No expenses found.</td></tr>';
        return;
    }

    filtered.forEach((expense) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(getExpenseDate(expense))}</td>
            <td>${escapeHtml(expense.category || "Other")}</td>
            <td><strong>${escapeHtml(expense.description || "Expense")}</strong></td>
            <td>${escapeHtml(expense.vendor || "-")}</td>
            <td style="font-weight: 700;">${formatCurrency(expense.amount)}</td>
            <td style="text-align: right;">
                <button class="btn btn-sm btn-secondary btn-danger" onclick="deleteExpense('${expense.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function deleteExpense(id) {
    if (!hasExpenseAccess()) {
        alert("Expense Tracking is available on Pro Unlimited and Business Unlimited plans.");
        return;
    }

    if (!confirm("Delete this expense record?")) return;

    if (hasCloudConnection()) {
        const { error } = await supabaseClient.from("expenses").delete().eq("id", id);
        if (error) {
            logSupabaseError("expenses delete", error, { id });
            alert(`Failed: ${error.message}`);
            return;
        }
    }

    expenses = expenses.filter((expense) => expense.id !== id);
    saveLocalData();
    renderExpensesTable();
    renderDashboard();
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
    renderSavedItemsDatalist();
    
    currentInvoiceItems.forEach((item, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <input type="text" value="${escapeHtml(item.description)}" list="saved-items-datalist" placeholder="Description of item/service..." 
                    oninput="updateItemField('${item.id}', 'description', this.value); maybeApplySavedItem('${item.id}', this.value)">
            </td>
            <td>
                <input type="number" value="${item.quantity}" min="0.1" step="any" style="text-align: center;"
                    oninput="updateItemField('${item.id}', 'quantity', parseFloat(this.value) || 0)">
            </td>
            <td>
                <input type="number" value="${item.unit_price}" min="0" step="any" data-item-price="${item.id}"
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
    resetDocumentPhotoInput();
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
            invoices[index] = {
                ...invoiceData,
                id: activeEditingInvoiceId,
                created_at: invoices[index].created_at || invoiceData.created_at || new Date().toISOString(),
                items: currentInvoiceItems
            };
            saveLocalData();
            saveLocalStorageProfile();
            return activeEditingInvoiceId;
        }
    }

    const newId = invoiceData.id || `inv-${Date.now()}`;
    invoices.push({
        ...invoiceData,
        id: newId,
        created_at: invoiceData.created_at || new Date().toISOString(),
        items: currentInvoiceItems
    });
    saveLocalData();
    saveLocalStorageProfile();
    return newId;
}

// Save invoice to database (with checks on account tier limits)
async function saveInvoiceToDatabase() {
    // Check trial limits
    if (isFreeInvoiceLimitReached() && !activeEditingInvoiceId) {
        showInvoiceLimitUpgradeModal();
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
    const signatureAllowed = hasSignatureAccess();
    const hasSignature = signatureAllowed && document.getElementById("show-signature-checkbox").checked;
    const signatureCanvas = document.getElementById("signature-canvas");
    const signatureUrl = (hasSignature && !isCanvasBlank(signatureCanvas)) ? signatureCanvas.toDataURL() : null;
    const saveSignaturePermission = signatureAllowed && document.getElementById("save-signature-permission-checkbox").checked;
    currentProfile.save_signature_permission = saveSignaturePermission;
    currentProfile.saved_signature_data_url = saveSignaturePermission && signatureUrl ? signatureUrl : "";
    const printedName = document.getElementById("printed-name").value.trim();
    const requestClientSignature = signatureAllowed && document.getElementById("request-client-signature-checkbox").checked;

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
        photo_data_urls: currentDocumentPhotos,
        business_profile_id: activeBusinessProfileId,
        is_deleted: false,
        deleted_at: null
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
                const { error } = await saveCloudInvoiceRecord(invoiceData);
                if (error) {
                    alert("Error saving: " + error.message);
                    return;
                }
                invResultId = activeEditingInvoiceId;
                // Delete old items to recreate
                await supabaseClient.from("invoice_items").delete().eq("invoice_id", activeEditingInvoiceId);
            } else {
                // Insert
                const { data, error } = await saveCloudInvoiceRecord(invoiceData);
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
    const startDateValue = document.getElementById("invoice-filter-start").value;
    const endDateValue = document.getElementById("invoice-filter-end").value;
    const startDate = startDateValue ? new Date(startDateValue) : null;
    const endDate = endDateValue ? new Date(endDateValue) : null;
    
    tbody.innerHTML = "";
    
    let filtered = getActiveInvoices().filter(inv => {
        // Get client name
        const client = clients.find(c => c.id == inv.client_id);
        const clientName = client ? client.name.toLowerCase() : "walk-in customer";
        const matchesQuery = inv.invoice_number.toLowerCase().includes(query) || clientName.includes(query);
        const matchesStatus = filterStatus ? inv.status === filterStatus : true;
        const matchesDate = startDate || endDate ? isDateInRange(getInvoiceDate(inv), startDate, endDate) : true;
        return matchesQuery && matchesStatus && matchesDate;
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
                <button class="btn btn-sm btn-secondary btn-danger" onclick="deleteInvoice('${inv.id}')">Trash</button>
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
    if (inv.business_profile_id && businessProfiles.some((profile) => profile.id === inv.business_profile_id)) {
        activeBusinessProfileId = inv.business_profile_id;
        applyActiveBusinessProfileToForms();
    }
    
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
    if (!confirm("Move this invoice to Trash Bin? You can recover it within 30 days.")) return;
    const deletedAt = new Date().toISOString();
    
    if (isCloudActive) {
        const { error } = await supabaseClient
            .from("invoices")
            .update({ is_deleted: true, deleted_at: deletedAt })
            .eq("id", id);
        if (error) {
            alert("Error: " + error.message);
            return;
        }
        invoices = invoices.map(i => i.id === id ? { ...i, is_deleted: true, deleted_at: deletedAt } : i);
    } else {
        invoices = invoices.map(i => i.id === id ? { ...i, is_deleted: true, deleted_at: deletedAt } : i);
        saveLocalData();
    }
    
    renderInvoicesTable();
    renderDashboard();
    renderTrashBin();
}

async function restoreInvoice(id) {
    if (isCloudActive) {
        const { error } = await supabaseClient
            .from("invoices")
            .update({ is_deleted: false, deleted_at: null })
            .eq("id", id);
        if (error) {
            alert("Error: " + error.message);
            return;
        }
    }

    invoices = invoices.map(i => i.id === id ? { ...i, is_deleted: false, deleted_at: null } : i);
    saveLocalData();
    renderTrashBin();
    renderInvoicesTable();
    renderDashboard();
}

async function permanentlyDeleteInvoice(id) {
    if (!confirm("Permanently delete this invoice? This cannot be undone.")) return;

    if (isCloudActive) {
        await supabaseClient.from("invoice_items").delete().eq("invoice_id", id);
        const { error } = await supabaseClient.from("invoices").delete().eq("id", id);
        if (error) {
            alert("Error: " + error.message);
            return;
        }
    }

    invoices = invoices.filter(i => i.id !== id);
    saveLocalData();
    renderTrashBin();
    renderDashboard();
}

function renderTrashBin() {
    const tbody = document.querySelector("#trash-invoices-table tbody");
    if (!tbody) return;

    const deleted = getDeletedInvoices();
    tbody.innerHTML = "";

    if (deleted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Trash bin is empty.</td></tr>';
        return;
    }

    deleted.forEach((inv) => {
        const client = clients.find(c => c.id == inv.client_id);
        const clientName = client ? client.name : '<span style="color: var(--text-muted);">Walk-in</span>';
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${inv.invoice_number}</strong></td>
            <td>${clientName}</td>
            <td>${inv.deleted_at ? new Date(inv.deleted_at).toLocaleString() : "Recently deleted"}</td>
            <td style="font-weight: 700;">${currentProfile.currency_symbol}${parseFloat(inv.total).toFixed(2)}</td>
            <td style="text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                <button class="btn btn-sm btn-secondary" onclick="restoreInvoice('${inv.id}')">Recover</button>
                <button class="btn btn-sm btn-secondary btn-danger" onclick="permanentlyDeleteInvoice('${inv.id}')">Delete Forever</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load stats metrics on Dashboard tab
function renderDashboard() {
    renderLaunchNotification();
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    const dashboardInvoices = getDashboardFilteredInvoices();
    const dashboardExpenses = getDashboardFilteredExpenses();
    const totalExpenses = dashboardExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    
    dashboardInvoices.forEach(inv => {
        const total = parseFloat(inv.total) || 0;
        if (inv.status === "Paid") {
            totalPaid += total;
            totalRevenue += total;
        } else if (inv.status === "Unpaid" || inv.status === "Overdue") {
            totalUnpaid += total;
            totalRevenue += total;
        }
    });
    const netProfit = totalPaid - totalExpenses;
    const profitMargin = totalPaid > 0 ? (netProfit / totalPaid) * 100 : 0;
    
    document.getElementById("dash-total-revenue").innerText = formatCurrency(totalRevenue);
    document.getElementById("dash-total-paid").innerText = formatCurrency(totalPaid);
    document.getElementById("dash-total-unpaid").innerText = formatCurrency(totalUnpaid);
    document.getElementById("dash-total-count").innerText = dashboardInvoices.length;
    document.getElementById("dash-total-expenses").innerText = formatCurrency(totalExpenses);
    document.getElementById("dash-net-profit").innerText = formatCurrency(netProfit);
    document.getElementById("dash-profit-margin").innerText = `${profitMargin.toFixed(1)}%`;
    
    // Render recent invoices (Limit to first 5)
    const tbody = document.querySelector("#recent-invoices-table tbody");
    tbody.innerHTML = "";
    
    const limit = dashboardInvoices.slice(0, 5);
    if (limit.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No recent invoices. Click create below.</td></tr>';
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
            <td style="text-align: right;">
                <button class="icon-action danger" onclick="deleteInvoice('${inv.id}')" title="Move to Trash">&#128465;</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update billing view stats
function getPlanPrice(planName, cycle = billingCycle) {
    const rates = PLAN_RATES[getPlanCanonicalName(planName)] || PLAN_RATES["Standard Free Plan"];
    const multiplier = cycle === "yearly" ? 12 : 1;
    return {
        promo: rates.promoMonthly * multiplier,
        regular: rates.regularMonthly * multiplier,
        suffix: cycle === "yearly" ? " / Year" : " / Month"
    };
}

function updatePricingDisplay() {
    document.querySelectorAll("[data-billing-cycle]").forEach((button) => {
        button.classList.toggle("active", button.dataset.billingCycle === billingCycle);
    });

    document.querySelectorAll("[data-plan-price]").forEach((priceEl) => {
        const planName = priceEl.dataset.planPrice;
        const rate = getPlanPrice(planName);
        priceEl.innerHTML = `PHP ${rate.promo.toLocaleString("en-PH")}<span>${rate.suffix}</span>`;
        document.querySelectorAll(`[data-plan-action="${planName}"]`).forEach((button) => {
            button.dataset.price = String(rate.promo);
            button.dataset.regularPrice = String(rate.regular);
            button.dataset.billingCycle = billingCycle;
        });
    });

    document.querySelectorAll("[data-regular-rate]").forEach((regularEl) => {
        const rate = getPlanPrice(regularEl.dataset.regularRate);
        regularEl.classList.toggle("free-rate", rate.regular === 0);
        regularEl.innerText = rate.regular === 0 ? "Free forever." : `PHP ${rate.regular.toLocaleString("en-PH")}${rate.suffix}`;
    });
}

function updateBillingTabUI() {
    const activeInvoiceCount = getActiveInvoices().length;
    const weeklyInvoiceCount = getFreeInvoicesCreatedThisWeek();
    document.getElementById("billing-invoice-count").innerText = hasUnlimitedInvoiceAccess() ? activeInvoiceCount : weeklyInvoiceCount;
    const currentPlan = getPlanCanonicalName(getCurrentPlanName());
    const currentPlanKey = getPlanKey(currentPlan);
    const line = document.getElementById("billing-invoice-count-line");
    if (line) {
        line.innerHTML = hasUnlimitedInvoiceAccess()
            ? `Total documents created: <span id="billing-invoice-count">${activeInvoiceCount}</span>`
            : `Invoices Used This Week: <span id="billing-invoice-count">${weeklyInvoiceCount}</span> / ${FREE_WEEKLY_INVOICE_LIMIT} limits.`;
    }

    document.querySelectorAll("[data-plan-card]").forEach((card) => {
        card.classList.toggle("active-plan-card", getPlanKey(card.dataset.planCard) === currentPlanKey);
    });

    document.querySelectorAll("[data-plan-action]").forEach((button) => {
        const planName = button.dataset.planAction;
        const isActivePlan = getPlanKey(planName) === currentPlanKey;
        button.disabled = isActivePlan || (planName === "Standard Free Plan" && hasPaidSubscriptionAccess());
        button.classList.toggle("checkout-plan-btn", !isActivePlan && planName !== "Standard Free Plan");

        if (isActivePlan) {
            button.innerText = "Active Plan";
        } else if (planName === "Standard Free Plan") {
            button.innerText = hasPaidSubscriptionAccess() ? "Downgrade" : "Free Plan";
        } else if (planName === "Starter Plan") {
            button.innerText = "Choose Starter";
        } else if (planName === "Pro Unlimited Plan") {
            button.innerText = "Choose Pro";
        } else if (planName === "Business Unlimited") {
            button.innerText = "Choose Business";
        }
    });

    updatePricingDisplay();
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
    document.getElementById("admin-paymongo-secret").value = "";
    document.getElementById("admin-stripe-public").value = paymentSettings.stripePublishableKey || "";
    document.getElementById("admin-stripe-secret").value = "";
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
                <td>${record.method}<br><span style="color: var(--text-muted); font-size: 11px;">${record.billing_mode || "Manual Renewal"}</span></td>
                <td style="font-weight: 700;">PHP ${(Number(record.price) || 0).toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

async function renderFeatureRequestsTable(tableSelector) {
    const requestsBody = document.querySelector(tableSelector);
    if (requestsBody) {
        const requests = await getAdminFeatureRequests();
        requestsBody.innerHTML = "";
        if (requests.length === 0) {
            requestsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No feature requests yet.</td></tr>';
        } else {
            const unreadIds = [];
            requests.forEach((request) => {
                if (request.is_read_by_admin === false) unreadIds.push(request.id);
                const row = document.createElement("tr");
                row.className = request.is_read_by_admin === false ? "feature-request-unread" : "";
                row.innerHTML = `
                    <td>${new Date(request.created_at).toLocaleString()}</td>
                    <td>${escapeHtml(request.customer_email)}</td>
                    <td>${escapeHtml(request.text)}</td>
                    <td style="text-align: right;">
                        <button class="feature-delete-btn" type="button" onclick="deleteFeatureRequest('${request.id}')">Delete</button>
                    </td>
                `;
                requestsBody.appendChild(row);
            });
            if (unreadIds.length) await markFeatureRequestsRead(unreadIds);
        }
    }
}

async function renderAdminFeatureInbox() {
    if (!isAdminUser()) return;
    await renderFeatureRequestsTable("#feature-inbox-table tbody");
    updateUnreadBadges();
}

// ==================== AUTOMATIC PAYMONGO CHECKOUT PROCESSOR ====================
async function processMockPaymentUpgrade() {
    const paymentModal = document.getElementById("payment-modal");
    const plan = paymentModal?.dataset.plan || "Pro Unlimited Plan";
    const billingCycle = paymentModal?.dataset.billingCycle || "monthly";

    if (!currentUser?.email) {
        createToast("Please sign in before subscribing.", true);
        return;
    }

    if (!hasCloudConnection() || !supabaseClient?.functions?.invoke) {
        createToast("Automatic checkout needs Supabase online connection. Please try again when online.", true);
        return;
    }

    const overlay = document.getElementById("payment-processing-overlay");
    if (overlay) overlay.style.display = "flex";

    try {
        const { data, error } = await supabaseClient.functions.invoke(PAYMONGO_CHECKOUT_FUNCTION_NAME, {
            body: {
                plan,
                billing_cycle: billingCycle
            }
        });

        if (error) {
            logSupabaseError("create-paymongo-checkout function", error, { plan, billingCycle });
            createToast(`Checkout failed: ${error.message || "Could not create PayMongo checkout."}`, true);
            if (overlay) overlay.style.display = "none";
            return;
        }

        const checkoutUrl = data?.checkout_url;
        if (!checkoutUrl) {
            createToast("Checkout failed: PayMongo did not return a checkout link.", true);
            if (overlay) overlay.style.display = "none";
            return;
        }

        localStorage.setItem("valoraem_pending_payment", JSON.stringify({
            plan,
            price: paymentModal?.dataset.price || "",
            reference_number: data?.reference_number || "",
            order_id: data?.order_id || "",
            checkoutUrl,
            customer_email: currentUser?.email || "",
            created_at: new Date().toISOString(),
            status: "pending_paymongo_payment"
        }));

        createToast("Opening PayMongo checkout. Your plan will activate automatically after payment.");
        setTimeout(() => {
            window.location.href = checkoutUrl;
        }, 450);
    } catch (err) {
        console.error("Unable to start PayMongo checkout:", err);
        createToast("Checkout failed. Please try again or contact Valora EM support.", true);
        if (overlay) overlay.style.display = "none";
    }
}

function handlePaymentReturnNotice() {
    if (!window.location?.search) return;
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    if (!paymentStatus) return;

    if (paymentStatus === "success") {
        createToast("Payment completed. Your plan will activate automatically once PayMongo confirms it.");
    } else if (paymentStatus === "cancelled") {
        createToast("Checkout was cancelled. You can choose a plan again anytime.", true);
    }

    if (window.history?.replaceState) {
        window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}`);
    }
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
            currentProfile.document_language = event.target.value || "en";
            currentProfile.preferred_language = currentProfile.document_language;
            updateInvoicePreview();
        });
    }

    const appLanguageSelect = document.getElementById("app-interface-language");
    if (appLanguageSelect) {
        appLanguageSelect.addEventListener("change", (event) => {
            currentProfile.app_interface_language = event.target.value || "en";
            applyInterfaceLanguage();
            createToast(getUiText("messages.languageChanged"));
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
    const lang = currentProfile.document_language || currentProfile.preferred_language || "en";
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
    if (!hasSignatureAccess()) return;
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
    const showSignature = hasSignatureAccess() && document.getElementById("show-signature-checkbox")?.checked;
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

    const clientSignature = hasSignatureAccess() && document.getElementById("request-client-signature-checkbox")?.checked;
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
    const previewContainer = document.querySelector(".invoice-preview-container");
    const previewModeLabel = document.getElementById("preview-mode-label");
    const ecoToggle = document.getElementById("thermal-eco-mode-toggle");
    if (ecoToggle) ecoToggle.checked = thermalEcoModeEnabled;

    if (printable) {
        printable.style.setProperty('--invoice-accent', thermal ? "#000000" : color);
        printable.style.setProperty('--invoice-text', thermal ? "#000000" : textColor);
        printable.classList.remove("print-layout-pdf", "print-layout-thermal-80", "print-layout-thermal-58");
        printable.classList.add(`print-layout-${printLayout}`);
        printable.classList.toggle("thermal-eco-mode", thermalEcoModeEnabled);
    }

    if (previewContainer) {
        previewContainer.classList.toggle("thermal-preview", thermal);
        previewContainer.classList.toggle("thermal-eco-mode", thermalEcoModeEnabled);
    }

    if (previewModeLabel) {
        const baseLabel = thermal ? "\ud83d\udcdf Thermal Receipt Preview" : "\ud83d\udcc4 PDF / A4 Layout Preview";
        previewModeLabel.textContent = thermalEcoModeEnabled ? `${baseLabel} - Eco Mode` : baseLabel;
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
    deleteExpense,
    restoreInvoice,
    permanentlyDeleteInvoice,
    setupAuthenticatedUser,
    renderAdminDashboard,
    renderAdminFeatureInbox,
    renderTrashBin,
    savePaymentSettings,
    activateVerifiedUserPlan,
    sendPasswordResetCode,
    configurePasswordResetForm,
    showPasswordResetForm,
    submitFeatureRequest,
    submitBetaFeedback,
    removeDocumentPhoto,
    saveInvoiceAsPdf,
    printInvoiceDocument,
    showAccountDeleteModal,
    submitAccountDeletionRequest,
    addBusinessProfile,
    saveCatalogItem,
    deleteCatalogItem,
    maybeApplySavedItem,
    createSupportTicket,
    selectTicket,
    selectAdminTicket,
    deleteSupportTicket,
    deleteFeatureRequest,
    sendTicketMessage,
    updateTicketStatus,
    restartTutorial,
    showTutorialIntro,
    applyInterfaceLanguage
});
