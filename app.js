(function () {
    "use strict";

    const STORAGE_KEY = "money_journal_tracker_state_v1";
    const APP_NAME = "NuVora Journal";
    const APP_TAGLINE = "Your money, beautifully organized.";
    const APP_BYLINE = "by Valora-EM";
    const INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Gift", "Interest", "Other"];
    const EXPENSE_CATEGORIES = ["Food", "Transport", "Bills", "Home", "Health", "Shopping", "Learning", "Travel", "Other"];
    const SAVINGS_CATEGORIES = ["Emergency Fund", "Travel Fund", "Investing", "Home Fund", "Other"];
    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const SEASON_LABELS = {
        summer: "Summer accents",
        rainy: "Rainy season accents",
        ber: "Ber months accents",
        newyear: "New year accents",
        none: "Manual accents"
    };
    const THEME_COLORS = {
        feminine: "#fbf2f3",
        masculine: "#f2eee5",
        neutral: "#f8f2e8"
    };
    const MOTIFS = {
        feminine: ["moon", "flower", "star", "pearl", "cat", "dot"],
        masculine: ["mountain", "wave", "planet", "grid", "compass", "card"],
        neutral: ["shape", "dot", "star", "grid", "pearl", "shape"]
    };

    const defaultSettings = {
        style: "neutral",
        autoSeasonal: true,
        currency: "USD",
        reminderEnabled: true,
        reminderTime: "20:00",
        plannerName: APP_NAME
    };

    let state = loadState();
    let reminderTimer = null;
    let toastTimer = null;

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        document.getElementById("transaction-date").value = dateKey(new Date());
        document.getElementById("month-picker").value = monthKey(new Date());
        document.getElementById("year-picker").value = String(new Date().getFullYear());

        bindNavigation();
        bindForms();
        bindSettings();
        bindDelegatedActions();
        renderAll();
        scheduleReminder();
    }

    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (saved && Array.isArray(saved.transactions) && Array.isArray(saved.goals)) {
                const settings = { ...defaultSettings, ...(saved.settings || {}) };
                if (!settings.plannerName || settings.plannerName === "Money Journal" || settings.plannerName === "NuVora") {
                    settings.plannerName = APP_NAME;
                }
                return {
                    transactions: saved.transactions,
                    goals: saved.goals,
                    settings
                };
            }
        } catch (error) {
            console.warn("Could not load saved finance tracker state.", error);
        }

        return createSeedState();
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function createSeedState() {
        const now = new Date();
        const currentDay = now.getDate();
        const dateInMonth = (offset, day) => {
            const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
            const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
            const safeDay = offset === 0 ? Math.min(day, currentDay) : Math.min(day, lastDay);
            target.setDate(Math.max(1, safeDay));
            return dateKey(target);
        };

        const emergencyGoal = uid("goal");
        const travelGoal = uid("goal");
        const investGoal = uid("goal");

        return {
            settings: { ...defaultSettings },
            goals: [
                { id: emergencyGoal, name: "Emergency fund", target: 3000, saved: 860 },
                { id: travelGoal, name: "Coastal weekend", target: 1200, saved: 310 },
                { id: investGoal, name: "Starter investing", target: 2000, saved: 460 }
            ],
            transactions: [
                { id: uid("tx"), type: "income", amount: 3600, category: "Salary", date: dateInMonth(0, 1), note: "Monthly pay" },
                { id: uid("tx"), type: "expense", amount: 84.2, category: "Bills", date: dateInMonth(0, 2), note: "Utilities" },
                { id: uid("tx"), type: "expense", amount: 18.75, category: "Food", date: dateInMonth(0, currentDay), note: "Lunch" },
                { id: uid("tx"), type: "expense", amount: 9.4, category: "Transport", date: dateInMonth(0, currentDay), note: "Ride fare" },
                { id: uid("tx"), type: "savings", amount: 45, category: "Emergency Fund", date: dateInMonth(0, currentDay), note: "Daily transfer", goalId: emergencyGoal },
                { id: uid("tx"), type: "income", amount: 420, category: "Freelance", date: dateInMonth(-1, 12), note: "Design work" },
                { id: uid("tx"), type: "expense", amount: 210, category: "Shopping", date: dateInMonth(-1, 17), note: "Wardrobe refresh" },
                { id: uid("tx"), type: "savings", amount: 180, category: "Travel Fund", date: dateInMonth(-1, 22), note: "Trip fund", goalId: travelGoal },
                { id: uid("tx"), type: "income", amount: 3520, category: "Salary", date: dateInMonth(-2, 1), note: "Monthly pay" },
                { id: uid("tx"), type: "expense", amount: 620, category: "Home", date: dateInMonth(-2, 6), note: "Home supplies" },
                { id: uid("tx"), type: "savings", amount: 260, category: "Investing", date: dateInMonth(-2, 24), note: "Index fund", goalId: investGoal },
                { id: uid("tx"), type: "income", amount: 3450, category: "Salary", date: dateInMonth(-3, 1), note: "Monthly pay" },
                { id: uid("tx"), type: "expense", amount: 380, category: "Travel", date: dateInMonth(-3, 14), note: "Weekend break" },
                { id: uid("tx"), type: "savings", amount: 320, category: "Emergency Fund", date: dateInMonth(-3, 26), note: "Bonus save", goalId: emergencyGoal }
            ]
        };
    }

    function bindNavigation() {
        document.querySelectorAll("[data-screen]").forEach((button) => {
            button.addEventListener("click", () => switchScreen(button.dataset.screen));
        });
    }

    function bindForms() {
        document.getElementById("transaction-type").addEventListener("change", updateCategoryOptions);
        document.getElementById("transaction-form").addEventListener("submit", handleTransactionSubmit);
        document.getElementById("goal-form").addEventListener("submit", handleGoalSubmit);
        document.getElementById("month-picker").addEventListener("change", renderMonthly);
        document.getElementById("year-picker").addEventListener("change", renderYearly);
    }

    function bindSettings() {
        document.querySelectorAll("input[name='style-direction']").forEach((input) => {
            input.addEventListener("change", () => {
                if (!input.checked) return;
                state.settings.style = input.value;
                saveState();
                applyTheme();
                renderSettings();
                showToast("Theme updated");
            });
        });

        document.getElementById("auto-seasonal").addEventListener("change", (event) => {
            state.settings.autoSeasonal = event.target.checked;
            saveState();
            applyTheme();
            showToast(state.settings.autoSeasonal ? "Seasonal accents on" : "Seasonal accents off");
        });

        document.getElementById("reminder-enabled").addEventListener("change", (event) => {
            state.settings.reminderEnabled = event.target.checked;
            saveState();
            scheduleReminder();
            renderReminderLabel();
        });

        document.getElementById("reminder-time").addEventListener("change", (event) => {
            state.settings.reminderTime = event.target.value || "20:00";
            saveState();
            scheduleReminder();
            renderReminderLabel();
        });

        document.getElementById("currency-select").addEventListener("change", (event) => {
            state.settings.currency = event.target.value;
            saveState();
            renderAll();
        });

        document.getElementById("planner-name-input").addEventListener("input", (event) => {
            state.settings.plannerName = event.target.value.trim() || APP_NAME;
            saveState();
            renderHeader();
        });

        document.getElementById("notification-button").addEventListener("click", requestNotifications);
        document.getElementById("reset-demo-button").addEventListener("click", () => {
            state = createSeedState();
            saveState();
            document.getElementById("transaction-date").value = dateKey(new Date());
            document.getElementById("month-picker").value = monthKey(new Date());
            document.getElementById("year-picker").value = String(new Date().getFullYear());
            renderAll();
            scheduleReminder();
            showToast("Sample planner restored");
        });
    }

    function bindDelegatedActions() {
        document.addEventListener("click", (event) => {
            const deleteTx = event.target.closest("[data-delete-tx]");
            if (deleteTx) {
                deleteTransaction(deleteTx.dataset.deleteTx);
                return;
            }

            const deleteGoal = event.target.closest("[data-delete-goal]");
            if (deleteGoal) {
                removeGoal(deleteGoal.dataset.deleteGoal);
                return;
            }

            const fundGoal = event.target.closest("[data-fund-goal]");
            if (fundGoal) {
                prepareGoalContribution(fundGoal.dataset.fundGoal);
            }
        });
    }

    function handleTransactionSubmit(event) {
        event.preventDefault();

        const type = document.getElementById("transaction-type").value;
        const amount = Number(document.getElementById("transaction-amount").value);
        const date = document.getElementById("transaction-date").value;
        const category = document.getElementById("transaction-category").value;
        const note = document.getElementById("transaction-note").value.trim();
        const goalId = type === "savings" ? document.getElementById("transaction-goal").value : "";

        if (!amount || amount <= 0 || !date || !category) {
            showToast("Add an amount, date, and category");
            return;
        }

        const transaction = {
            id: uid("tx"),
            type,
            amount,
            date,
            category,
            note,
            goalId: goalId || undefined
        };

        state.transactions.push(transaction);

        if (type === "savings" && goalId) {
            const goal = state.goals.find((item) => item.id === goalId);
            if (goal) goal.saved = roundMoney(goal.saved + amount);
        }

        saveState();
        event.target.reset();
        document.getElementById("transaction-date").value = dateKey(new Date());
        document.getElementById("transaction-type").value = type;
        updateCategoryOptions();
        document.getElementById("transaction-amount").focus();
        renderAll();
        showToast("Transaction saved");
    }

    function handleGoalSubmit(event) {
        event.preventDefault();

        const name = document.getElementById("goal-name").value.trim();
        const target = Number(document.getElementById("goal-target").value);
        const saved = Number(document.getElementById("goal-saved").value || 0);

        if (!name || !target || target <= 0 || saved < 0) {
            showToast("Add a goal name and target");
            return;
        }

        state.goals.push({
            id: uid("goal"),
            name,
            target,
            saved: Math.min(roundMoney(saved), roundMoney(target))
        });

        saveState();
        event.target.reset();
        updateCategoryOptions();
        renderSavings();
        showToast("Savings goal saved");
    }

    function deleteTransaction(id) {
        const transaction = state.transactions.find((item) => item.id === id);
        if (!transaction) return;

        if (transaction.type === "savings" && transaction.goalId) {
            const goal = state.goals.find((item) => item.id === transaction.goalId);
            if (goal) goal.saved = Math.max(0, roundMoney(goal.saved - transaction.amount));
        }

        state.transactions = state.transactions.filter((item) => item.id !== id);
        saveState();
        renderAll();
        showToast("Transaction removed");
    }

    function removeGoal(id) {
        state.goals = state.goals.filter((goal) => goal.id !== id);
        state.transactions = state.transactions.map((transaction) => {
            if (transaction.goalId !== id) return transaction;
            const copy = { ...transaction };
            delete copy.goalId;
            return copy;
        });
        saveState();
        updateCategoryOptions();
        renderSavings();
        showToast("Goal removed");
    }

    function prepareGoalContribution(id) {
        switchScreen("home");
        document.getElementById("transaction-type").value = "savings";
        updateCategoryOptions();
        document.getElementById("transaction-goal").value = id;
        document.getElementById("transaction-date").value = dateKey(new Date());
        document.getElementById("transaction-amount").focus();
    }

    function switchScreen(screenName) {
        document.querySelectorAll(".screen").forEach((screen) => {
            screen.classList.toggle("active", screen.dataset.screenPanel === screenName);
        });
        document.querySelectorAll(".nav-tab").forEach((button) => {
            button.classList.toggle("active", button.dataset.screen === screenName);
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function renderAll() {
        applyTheme();
        updateCategoryOptions();
        renderHeader();
        renderHome();
        renderMonthly();
        renderYearly();
        renderSavings();
        renderSettings();
        renderReminderLabel();
    }

    function applyTheme() {
        const style = state.settings.style || "neutral";
        const season = state.settings.autoSeasonal ? getSeason(new Date()) : "none";
        document.body.dataset.style = style;
        document.body.dataset.season = season;
        document.querySelector("meta[name='theme-color']").setAttribute("content", THEME_COLORS[style] || THEME_COLORS.neutral);
        document.getElementById("season-label").textContent = SEASON_LABELS[season] || SEASON_LABELS.none;
        renderMotifs();
    }

    function renderMotifs() {
        const style = state.settings.style || "neutral";
        document.getElementById("motif-board").innerHTML = MOTIFS[style]
            .map((motif) => `<span class="motif ${motif}"></span>`)
            .join("");
    }

    function renderHeader() {
        const name = state.settings.plannerName || APP_NAME;
        document.getElementById("planner-title").textContent = name;
        document.getElementById("planner-tagline").textContent = APP_TAGLINE;
        document.getElementById("planner-byline").textContent = APP_BYLINE;
        document.getElementById("today-label").textContent = new Intl.DateTimeFormat(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric"
        }).format(new Date());
        document.title = `${name} | Personal Finance Planner`;
    }

    function renderHome() {
        const today = dateKey(new Date());
        const todayTransactions = state.transactions.filter((transaction) => transaction.date === today);
        const todayTotals = totals(todayTransactions);
        setMoney("today-income", todayTotals.income);
        setMoney("today-expenses", todayTotals.expense);
        setMoney("today-savings", todayTotals.savings);
        setMoney("today-remaining", todayTotals.remaining);
        setMoney("today-balance-pill", todayTotals.remaining);

        const currentMonth = monthKey(new Date());
        const monthlyTransactions = state.transactions.filter((transaction) => transaction.date.startsWith(currentMonth));
        const monthTotals = totals(monthlyTransactions);
        const monthMax = Math.max(monthTotals.income, monthTotals.expense, monthTotals.savings, 1);

        setMoney("home-month-income", monthTotals.income);
        setMoney("home-month-expenses", monthTotals.expense);
        setMoney("home-month-savings", monthTotals.savings);
        setMoney("home-month-remaining", monthTotals.remaining);
        setWidth("home-month-income-bar", percent(monthTotals.income, monthMax));
        setWidth("home-month-expense-bar", percent(monthTotals.expense, monthMax));
        setWidth("home-month-savings-bar", percent(monthTotals.savings, monthMax));

        const recent = sortTransactions(state.transactions).slice(0, 5);
        document.getElementById("recent-list").innerHTML = recent.length
            ? recent.map((transaction) => transactionMarkup(transaction, false)).join("")
            : emptyMarkup("No entries yet");
    }

    function renderMonthly() {
        const selectedMonth = document.getElementById("month-picker").value || monthKey(new Date());
        const transactions = sortTransactions(state.transactions.filter((transaction) => transaction.date.startsWith(selectedMonth)));
        const monthTotals = totals(transactions);

        setMoney("monthly-income", monthTotals.income);
        setMoney("monthly-expenses", monthTotals.expense);
        setMoney("monthly-savings", monthTotals.savings);
        setMoney("monthly-remaining", monthTotals.remaining);
        document.getElementById("monthly-transaction-count").textContent = entryCount(transactions.length);

        renderCategoryBreakdown(transactions);
        document.getElementById("monthly-transaction-list").innerHTML = transactions.length
            ? transactions.map((transaction) => transactionMarkup(transaction, true)).join("")
            : emptyMarkup("No transactions for this month");
    }

    function renderCategoryBreakdown(transactions) {
        const map = new Map();
        transactions.forEach((transaction) => {
            const key = `${transaction.type}:${transaction.category}`;
            const current = map.get(key) || { type: transaction.type, category: transaction.category, total: 0 };
            current.total += transaction.amount;
            map.set(key, current);
        });

        const groups = Array.from(map.values()).sort((a, b) => b.total - a.total);
        const total = groups.reduce((sum, group) => sum + group.total, 0) || 1;
        document.getElementById("category-count-label").textContent = `${groups.length} ${groups.length === 1 ? "category" : "categories"}`;
        document.getElementById("category-breakdown").innerHTML = groups.length
            ? groups.map((group) => {
                const width = percent(group.total, total);
                return `
                    <div class="category-row ${group.type}">
                        <div class="category-name"><i class="category-badge"></i><span>${escapeHTML(group.category)}</span></div>
                        <em>${formatMoney(group.total)}</em>
                        <div class="category-track"><b style="width: ${width}%"></b></div>
                    </div>
                `;
            }).join("")
            : emptyMarkup("No categories yet");
    }

    function renderYearly() {
        const year = Number(document.getElementById("year-picker").value) || new Date().getFullYear();
        const monthSummaries = MONTH_NAMES.map((name, index) => {
            const key = `${year}-${String(index + 1).padStart(2, "0")}`;
            const transactions = state.transactions.filter((transaction) => transaction.date.startsWith(key));
            return { name, key, ...totals(transactions) };
        });

        const yearlyTotals = totals(state.transactions.filter((transaction) => transaction.date.startsWith(String(year))));
        setMoney("yearly-income", yearlyTotals.income);
        setMoney("yearly-expenses", yearlyTotals.expense);
        setMoney("yearly-savings", yearlyTotals.savings);
        setMoney("yearly-remaining", yearlyTotals.remaining);

        const bestSavings = monthSummaries.reduce((best, item) => item.savings > best.savings ? item : best, monthSummaries[0]);
        const highestSpending = monthSummaries.reduce((best, item) => item.expense > best.expense ? item : best, monthSummaries[0]);

        document.getElementById("best-savings-month").textContent = bestSavings.savings > 0 ? bestSavings.name : "-";
        setMoney("best-savings-value", bestSavings.savings);
        document.getElementById("highest-spending-month").textContent = highestSpending.expense > 0 ? highestSpending.name : "-";
        setMoney("highest-spending-value", highestSpending.expense);

        const max = Math.max(...monthSummaries.flatMap((item) => [item.income, item.expense, item.savings]), 1);
        document.getElementById("year-chart").innerHTML = monthSummaries.map((item) => `
            <div class="year-row">
                <div class="month-name">${item.name}</div>
                <div class="year-bars" aria-label="${item.name} comparison">
                    <span class="income" style="width: ${percent(item.income, max)}%"></span>
                    <span class="expense" style="width: ${percent(item.expense, max)}%"></span>
                    <span class="savings" style="width: ${percent(item.savings, max)}%"></span>
                </div>
                <div class="month-total">${formatMoney(item.remaining)}</div>
            </div>
        `).join("");
    }

    function renderSavings() {
        const totalSaved = state.goals.reduce((sum, goal) => sum + goal.saved, 0);
        setMoney("goal-total-saved", totalSaved);

        document.getElementById("goals-list").innerHTML = state.goals.length
            ? state.goals.map((goal) => {
                const progress = Math.min(100, percent(goal.saved, goal.target));
                const remaining = Math.max(0, goal.target - goal.saved);
                return `
                    <article class="goal-card">
                        <div class="goal-top">
                            <div>
                                <p class="eyebrow">Goal</p>
                                <h3>${escapeHTML(goal.name)}</h3>
                            </div>
                            <button class="delete-button" type="button" data-delete-goal="${goal.id}" aria-label="Delete ${escapeAttribute(goal.name)}">x</button>
                        </div>
                        <div class="goal-progress"><b style="width: ${progress}%"></b></div>
                        <div class="goal-meta">
                            <em>${formatMoney(goal.saved)} saved</em>
                            <em>${formatMoney(remaining)} left</em>
                        </div>
                        <div class="goal-actions">
                            <button class="text-button" type="button" data-fund-goal="${goal.id}">Add saving</button>
                        </div>
                    </article>
                `;
            }).join("")
            : emptyMarkup("No savings goals yet");
    }

    function renderSettings() {
        document.querySelectorAll("input[name='style-direction']").forEach((input) => {
            input.checked = input.value === state.settings.style;
        });
        document.getElementById("auto-seasonal").checked = Boolean(state.settings.autoSeasonal);
        document.getElementById("reminder-enabled").checked = Boolean(state.settings.reminderEnabled);
        document.getElementById("reminder-time").value = state.settings.reminderTime || "20:00";
        document.getElementById("currency-select").value = state.settings.currency || "USD";
        document.getElementById("planner-name-input").value = state.settings.plannerName || APP_NAME;
    }

    function updateCategoryOptions() {
        const type = document.getElementById("transaction-type").value;
        const categorySelect = document.getElementById("transaction-category");
        const goalField = document.getElementById("transaction-goal-field");
        const goalSelect = document.getElementById("transaction-goal");
        const categories = type === "income" ? INCOME_CATEGORIES : type === "savings" ? SAVINGS_CATEGORIES : EXPENSE_CATEGORIES;

        categorySelect.innerHTML = categories.map((category) => `<option value="${escapeAttribute(category)}">${escapeHTML(category)}</option>`).join("");
        goalField.classList.toggle("is-hidden", type !== "savings");
        goalSelect.innerHTML = `<option value="">No linked goal</option>${state.goals.map((goal) => `<option value="${goal.id}">${escapeHTML(goal.name)}</option>`).join("")}`;
    }

    function totals(transactions) {
        const result = transactions.reduce((acc, transaction) => {
            acc[transaction.type] += Number(transaction.amount) || 0;
            return acc;
        }, { income: 0, expense: 0, savings: 0 });

        result.income = roundMoney(result.income);
        result.expense = roundMoney(result.expense);
        result.savings = roundMoney(result.savings);
        result.remaining = roundMoney(result.income - result.expense - result.savings);
        return result;
    }

    function transactionMarkup(transaction, showDelete) {
        const sign = transaction.type === "income" ? "+" : "-";
        const note = transaction.note ? ` - ${escapeHTML(transaction.note)}` : "";
        return `
            <article class="transaction-item ${transaction.type}">
                <i class="type-dot"></i>
                <div class="transaction-copy">
                    <strong>${escapeHTML(transaction.category)}</strong>
                    <span>${formatDateShort(transaction.date)}${note}</span>
                </div>
                <div class="transaction-amount">
                    <span>${sign}${formatMoney(transaction.amount)}</span>
                    ${showDelete ? `<button class="delete-button" type="button" data-delete-tx="${transaction.id}" aria-label="Delete transaction">x</button>` : ""}
                </div>
            </article>
        `;
    }

    function sortTransactions(transactions) {
        return [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    }

    function setMoney(id, value) {
        document.getElementById(id).textContent = formatMoney(value);
    }

    function setWidth(id, value) {
        document.getElementById(id).style.width = `${Math.max(0, Math.min(100, value))}%`;
    }

    function formatMoney(value) {
        const amount = Number(value) || 0;
        try {
            return new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: state.settings.currency || "USD",
                maximumFractionDigits: Number.isInteger(amount) ? 0 : 2
            }).format(amount);
        } catch (error) {
            return `${state.settings.currency || "USD"} ${amount.toFixed(2)}`;
        }
    }

    function formatDateShort(value) {
        const date = parseLocalDate(value);
        return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
    }

    function dateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function monthKey(date) {
        return dateKey(date).slice(0, 7);
    }

    function parseLocalDate(value) {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day);
    }

    function getSeason(date) {
        const month = date.getMonth();
        if (month === 0 || month === 1) return "newyear";
        if (month >= 2 && month <= 4) return "summer";
        if (month >= 5 && month <= 7) return "rainy";
        return "ber";
    }

    function percent(value, max) {
        return max <= 0 ? 0 : Math.round((value / max) * 100);
    }

    function roundMoney(value) {
        return Math.round((Number(value) || 0) * 100) / 100;
    }

    function uid(prefix) {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function entryCount(count) {
        return `${count} ${count === 1 ? "entry" : "entries"}`;
    }

    function emptyMarkup(text) {
        return `<div class="empty-state">${escapeHTML(text)}</div>`;
    }

    function escapeHTML(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHTML(value).replaceAll("`", "&#096;");
    }

    async function requestNotifications() {
        if (!("Notification" in window)) {
            showToast("Notifications are not available here");
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            state.settings.reminderEnabled = true;
            saveState();
            renderSettings();
            scheduleReminder();
            showToast("Notifications enabled");
        } else {
            showToast("Notifications not enabled");
        }
    }

    function scheduleReminder() {
        if (reminderTimer) clearTimeout(reminderTimer);
        if (!state.settings.reminderEnabled) return;

        const next = nextReminderDate();
        const delay = Math.min(Math.max(next.getTime() - Date.now(), 1000), 2147483647);
        reminderTimer = window.setTimeout(() => {
            showReminder();
            scheduleReminder();
        }, delay);
    }

    function nextReminderDate() {
        const [hour, minute] = (state.settings.reminderTime || "20:00").split(":").map(Number);
        const next = new Date();
        next.setHours(hour || 20, minute || 0, 0, 0);
        if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
        return next;
    }

    function showReminder() {
        const title = state.settings.plannerName || APP_NAME;
        const body = "Log today's money note.";
        if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
            new Notification(title, { body });
        } else {
            showToast(body);
        }
    }

    function renderReminderLabel() {
        const target = document.getElementById("next-reminder-label");
        if (!state.settings.reminderEnabled) {
            target.textContent = "Reminder off";
            return;
        }

        const next = nextReminderDate();
        target.textContent = `Next ${new Intl.DateTimeFormat(undefined, {
            hour: "numeric",
            minute: "2-digit"
        }).format(next)}`;
    }

    function showToast(message) {
        const toast = document.getElementById("toast");
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
    }
})();
