// TrackIt Frontend Application
// APP_JS_VERSION 2025-09-20-01
class TrackItApp {
    constructor() {
        // Auto-detect API URL: use current origin in production, localhost in development
        this.apiUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:5026' 
            : window.location.origin;
        console.log('=== API URL CONFIGURED ===');
        console.log('Hostname:', window.location.hostname);
        console.log('API URL:', this.apiUrl);
        // Frontend currency display system (base stored in DB = USD)
        this.ratesFromUSD = { USD: 1, EGP: 49.00, SAR: 3.75 }; // placeholder static rates
        this.supportedDisplayCurrencies = Object.keys(this.ratesFromUSD);
        this.displayCurrency = localStorage.getItem('trackit:displayCurrency') || 'USD';
        if (!this.supportedDisplayCurrencies.includes(this.displayCurrency)) this.displayCurrency = 'USD';
    // Normalize stored values; treat 'undefined'/'null' as absent
    const rawToken = localStorage.getItem('authToken');
    this.token = rawToken && rawToken !== 'undefined' && rawToken !== 'null' ? rawToken : null;
    const rawUser = localStorage.getItem('currentUser');
    this.currentUser = rawUser && rawUser !== 'undefined' && rawUser !== 'null' ? rawUser : null;
    this._inFlight = 0; // track global in-flight API calls
        
        this.init();
    }

    init() {
        // Initialize event listeners
        this.setupEventListeners();
        // Currency selector (if already rendered)
        const curSel = document.getElementById('displayCurrencySelect');
        if (curSel) curSel.value = this.displayCurrency;

        // Apply saved theme preference early
        const savedTheme = localStorage.getItem('trackit:theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('theme-dark');
            const icon = document.getElementById('themeToggleIcon');
            if (icon) { icon.classList.remove('bi-moon-stars'); icon.classList.add('bi-sun'); }
        }
        
        // Debug token loading
        console.log('=== INIT DEBUG ===');
        console.log('Token from localStorage:', localStorage.getItem('authToken'));
        console.log('Current token in class:', this.token);
        
        console.log('APP_JS_VERSION: 2025-09-16-02');
        // Check if user is already logged in
        if (this.token && typeof this.token === 'string' && this.token.trim().length > 10) {
            console.log('Token exists, showing dashboard');
            this.showDashboard();
            this.loadDashboardData();
        } else {
            console.log('No token, staying on auth page');
        }
        
        // Set current date-time for transaction form
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        const transactionDateField = document.getElementById('transactionDate');
        if (transactionDateField) {
            transactionDateField.value = localDateTime;
        }
    }

    setupEventListeners() {
        // Auth forms
    document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Quick forms
        document.getElementById('quickTransactionForm').addEventListener('submit', (e) => this.handleQuickTransaction(e));
        document.getElementById('quickCategoryForm').addEventListener('submit', (e) => this.handleQuickCategory(e));
        
        // Modal forms
        document.getElementById('addTransactionForm').addEventListener('submit', (e) => e.preventDefault());
        document.getElementById('addCategoryForm').addEventListener('submit', (e) => e.preventDefault());
        document.getElementById('addWalletForm').addEventListener('submit', (e) => e.preventDefault());
    }

    // Authentication Methods
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch(`${this.apiUrl}/User/Login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ Username: username, Password: password })
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok && data && (data.data || data.Data)) {
                const payload = data.data || data.Data;
                this.token = payload.token || payload.Token;
                this.currentUser = payload.username || payload.Username || username;
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('currentUser', this.currentUser);
                
                console.log('=== LOGIN SUCCESS DEBUG ===');
                console.log('Received token:', this.token ? 'Token received' : 'No token');
                console.log('Token length:', this.token ? this.token.length : 0);
                console.log('Current user:', this.currentUser);
                console.log('Token stored in localStorage:', localStorage.getItem('authToken') ? 'Yes' : 'No');
                
                this.showToast(data.message || data.Message || 'Login successful!', 'success');
                this.showDashboard();
                this.loadDashboardData();
            } else {
                console.error('Login failed:', data);
                this.showToast((data && (data.message || data.Message)) || 'Login failed', 'error');
            }
        } catch (error) {
            this.showToast('Network error. Please try again.', 'error');
            console.error('Login error:', error);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        try {
            const response = await fetch(`${this.apiUrl}/User/Register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ Username: username, Email: email, Password: password })
            });
            
            let data;
            try { data = await response.json(); } catch { /* fallback later */ }
            if (response.ok) {
                this.showToast((data && (data.message || data.Message)) || 'Registration successful! Please login.', 'success');
                this.showLogin();
                // Clear registration form
                document.getElementById('registerForm').reset();
            } else {
                let errorMessage = (data && (data.message || data.Message)) || (await response.text()) || 'Registration failed';
                this.showToast(errorMessage, 'error');
            }
        } catch (error) {
            this.showToast('Network error. Please try again.', 'error');
            console.error('Registration error:', error);
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
        
        this.showToast('Logged out successfully', 'info');
    }

    // UI Methods
    showLogin() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.querySelector('#authTabs .nav-link.active').classList.remove('active');
        document.querySelector('#authTabs .nav-link').classList.add('active');
    }

    showRegister() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.querySelector('#authTabs .nav-link.active').classList.remove('active');
        document.querySelectorAll('#authTabs .nav-link')[1].classList.add('active');
    }

    showDashboard() {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        document.getElementById('userInfo').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('username').textContent = this.currentUser;
        // Restore last active tab (default to transactions)
        const lastTab = localStorage.getItem('trackit:lastTab') || 'transactions';
        this.showTab(lastTab);
    }

    showTab(tabName, ev) {
        console.log('Switching to tab:', tabName); // Debug log
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Remove active class from all nav links
        document.querySelectorAll('#mainTabs .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show selected tab and mark nav as active
        document.getElementById(`${tabName}Tab`).style.display = 'block';
        const target = ev?.target || window.event?.target;
        if (target && target.classList) {
            target.classList.add('active');
        } else {
            // Fallback: set active based on onclick attribute containing tabName
            const links = Array.from(document.querySelectorAll('#mainTabs .nav-link'));
            const link = links.find(a => (a.getAttribute('onclick') || '').includes(`'${tabName}'`));
            if (link) link.classList.add('active');
        }
        // Persist active tab
        localStorage.setItem('trackit:lastTab', tabName);
        
        // Load data for the selected tab
        switch(tabName) {
            case 'transactions':
                this.loadTransactions();
                break;
            case 'categories':
                console.log('Loading categories for tab...'); // Debug log
                this.loadCategories();
                break;
            case 'wallets':
                console.log('Loading wallets for tab...'); // Debug log
                this.loadWallets();
                break;
        }
        
        // Also repopulate dropdowns when switching tabs
        setTimeout(() => {
            this.populateDropdowns();
        }, 1000); // Give time for data to load
    }

    // Data Loading Methods
    async loadDashboardData() {
        console.log('Loading dashboard data (sequential to ensure totals)...');
        // Load wallets first so we can compute fallback balance
        await Promise.all([
            this.loadTransactions(),
            this.loadCategories(),
            this.loadWallets()
        ]);
        // Now load stats (which will call total balance endpoint)
        await this.loadStats();
        // Fallback: if totalBalance element still shows placeholder / old value and we have wallets, compute locally
        const balanceEl = document.getElementById('totalBalance');
        if (balanceEl && this.wallets && this.wallets.length > 0 && /6,700\.00/.test(balanceEl.textContent)) {
            const sum = this.wallets.reduce((acc,w)=>acc + (w.Balance || w.balance || 0),0);
            balanceEl.textContent = this.formatCurrency(sum);
            console.log('Applied fallback computed balance:', balanceEl.textContent);
        }
        console.log('Dashboard data loaded, populating dropdowns...');
        this.populateDropdowns();
    }

    async loadTransactions() {
        try {
            console.log('=== LOADING TRANSACTIONS DEBUG ===');
            const resp = await this.apiCall('/Transaction/GetTransactions');
            console.log('Transactions apiCall status:', resp.status, 'ok:', resp.ok);
            if (resp.ok) {
                const transactions = resp.Data || resp.data || [];
                console.log('Extracted transactions:', transactions?.length || 0);
                this.currentTransactions = transactions;
                // Snapshot base list for local filtering pipeline
                this._allTransactionsBase = [...transactions];
                if (this._searchText || (this._activeCategoryIds && this._activeCategoryIds.size)) {
                    this.applyLocalFilters();
                } else {
                    this.renderTransactions(transactions);
                }
            } else {
                console.error('Transactions API Error:', resp.status, resp.raw || resp.error);
                this.showToast(`Failed to load transactions${resp.status ? `: ${resp.status}` : ''}`, 'error');
            }
        } catch (error) {
            console.error('Network error loading transactions:', error);
            this.showToast('Network error loading transactions', 'error');
        }
    }

    async loadCategories() {
        try {
            console.log('=== LOADING CATEGORIES DEBUG ===');
            const resp = await this.apiCall('/Category/GetCategory');
            console.log('Categories apiCall status:', resp.status, 'ok:', resp.ok);
            if (resp.ok) {
                const categories = resp.Data || resp.data || [];
                console.log('Extracted categories count:', categories?.length || 0);
                this.categories = categories;
                this.renderCategories(categories);
            } else {
                console.error('Categories API Error:', resp.status, resp.raw || resp.error);
                this.showToast(`Failed to load categories${resp.status ? `: ${resp.status}` : ''}`, 'error');
            }
        } catch (error) {
            console.error('Network error loading categories:', error);
            this.showToast('Network error loading categories', 'error');
        }
    }

    async loadWallets() {
        try {
            console.log('=== LOADING WALLETS DEBUG ===');
            const resp = await this.apiCall('/Wallet/GetWallets');
            console.log('Wallets apiCall status:', resp.status, 'ok:', resp.ok);
            if (resp.ok) {
                const wallets = resp.Data || resp.data || [];
                console.log('Extracted wallets count:', wallets?.length || 0);
                this.wallets = wallets;
                this.renderWallets(wallets);
            } else {
                console.error('Wallets API Error:', resp.status, resp.raw || resp.error);
                this.showToast(`Failed to load wallets${resp.status ? `: ${resp.status}` : ''}`, 'error');
            }
        } catch (error) {
            console.error('Network error loading wallets:', error);
            this.showToast('Network error loading wallets', 'error');
        }
    }

    async loadStats() {
        // Load real total balance from API
        await this.loadTotalBalance();

        // Calculate income/expenses from currentTransactions
        let income = 0;
        let expenses = 0;
        if (Array.isArray(this.currentTransactions)) {
            for (const t of this.currentTransactions) {
                const amount = t.Amount ?? t.amount ?? 0;
                if (amount >= 0) income += amount; else expenses += Math.abs(amount);
            }
        }
        document.getElementById('totalIncome').textContent = this.formatDisplay(income);
        document.getElementById('totalExpenses').textContent = this.formatDisplay(expenses);
    }

    async loadTotalBalance() {
        console.log('=== LOADING TOTAL BALANCE (apiCall) ===');
        const resp = await this.apiCall('/Wallet/GetTotalBalance');
        console.log('Total balance raw response:', resp);
        const value = typeof resp.Data === 'number' ? resp.Data : (typeof resp.data === 'number' ? resp.data : null);
        if (resp.ok && value !== null) {
            const formatted = this.formatDisplay(value);
            document.getElementById('totalBalance').textContent = formatted;
            console.log('Updated total balance display:', formatted);
        } else if (resp.ok && (resp.Data === undefined && resp.data === undefined)) {
            // Treat empty as zero
            document.getElementById('totalBalance').textContent = this.formatDisplay(0);
            console.log('Total balance defaulted to 0');
        } else {
            console.warn('Total balance API problem, attempting wallet sum fallback');
            if (this.wallets && this.wallets.length) {
                const sum = this.wallets.reduce((acc,w)=>acc + (w.Balance || w.balance || 0),0);
                document.getElementById('totalBalance').textContent = this.formatDisplay(sum);
                console.log('Fallback wallet sum used:', sum);
            }
        }
        console.log('=== END LOADING TOTAL BALANCE ===');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    // === Currency helpers ===
    convertFromUSD(amountUSD, target) { const r = this.ratesFromUSD[target] || 1; return amountUSD * r; }
    convertToUSD(amountDisplay, currency) { if (currency === 'USD') return amountDisplay; const r = this.ratesFromUSD[currency]; return r ? amountDisplay / r : amountDisplay; }
    formatDisplay(amountUSD) {
        const cur = this.displayCurrency;
        const val = this.convertFromUSD(amountUSD, cur);
        try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(val); } catch { return val.toFixed(2)+' '+cur; }
    }
    changeDisplayCurrency(code) {
        if (!this.supportedDisplayCurrencies.includes(code)) return;
        this.displayCurrency = code;
        localStorage.setItem('trackit:displayCurrency', code);
        // Re-render views
        if (this.wallets) this.renderWallets(this.wallets);
        if (this.currentTransactions) this.renderTransactions(this.currentTransactions);
        // Reformat stats
        this.loadStats();
    }

    // Rendering Methods
    renderTransactions(transactions) {
        const container = document.getElementById('transactionsList');
        if (!container) return;
        if (!transactions || transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-receipt"></i>
                    <h5>No transactions yet</h5>
                    <p>Start by adding your first transaction!</p>
                </div>`;
            return;
        }
        // Group by calendar date (YYYY-MM-DD), newest first
        const groups = {};
        for (const t of transactions) {
            const raw = t.Date || t.date;
            const d = new Date(raw);
            const key = isNaN(d) ? 'Unknown' : d.toISOString().slice(0,10);
            (groups[key] ||= []).push(t);
        }
        const keys = Object.keys(groups).sort((a,b)=> b.localeCompare(a));
        container.innerHTML = keys.map(key => {
            const pretty = key === 'Unknown' ? 'Unknown Date' : new Date(key+'T00:00:00').toLocaleDateString();
            const items = groups[key].map(t => {
                const categoryId = t.CategoryId || t.categoryId;
                const category = this.categories?.find(c => (c.Id || c.id) === categoryId);
                const categoryName = category ? (category.Name || category.name) : 'Unknown Category';
                const walletName = `Wallet ${(t.WalletId || t.walletId) ?? ''}`; // Placeholder until backend provides wallet names
                const name = t.Name || t.name;
                const amount = t.Amount || t.amount || 0; // USD base
                const dateVal = t.Date || t.date;
                const desc = t.Description || t.description;
                const id = t.Id || t.id;
                const dispAmt = this.formatDisplay(amount);
                return `
                <div class="transaction-item ${amount >= 0 ? 'income':'expense'} fade-in">
                  <div class="d-flex justify-content-between align-items-center">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-1">
                            <strong class="me-2">${name}</strong>
                            <span class="category-badge">${categoryName}</span>
                        </div>
                        <small class="text-muted">
                            ${new Date(dateVal).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • ${walletName}
                        </small>
                        ${desc ? `<div class=\"text-muted small mt-1\">${desc}</div>` : ''}
                    </div>
                    <div class="text-end">
                        <div class="fw-bold ${amount >= 0 ? 'text-success':'text-danger'}" title="${amount.toFixed(2)} USD">${amount >= 0 ? '' : ''}${dispAmt}</div>
                        <div class="btn-group btn-group-sm mt-1">
                            <button class="btn btn-outline-primary btn-sm" onclick="app.editTransaction(${id})"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-outline-danger btn-sm" onclick="app.deleteTransaction(${id})"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                  </div>
                </div>`;
            }).join('');
            return `<div class="mb-3">
                <div class="d-flex align-items-center mb-1">
                  <button class="btn btn-sm btn-light me-2" onclick="toggleDateGroup('${key}')" id="dg-btn-${key}"><i class="bi bi-chevron-up" id="dg-icon-${key}"></i></button>
                  <h6 class="mb-0">${pretty}</h6><span class="badge bg-secondary ms-2">${groups[key].length}</span>
                </div>
                <div id="dg-body-${key}">${items}</div>
            </div>`;
        }).join('');
    }

    // Date filter for transactions
    async filterByDate() {
    const start = (document.getElementById('filterStartDate')?.value || '').trim();
    const end   = (document.getElementById('filterEndDate')?.value || '').trim();
    if (start && end && new Date(end) < new Date(start)) { this.showToast('End date cannot be earlier than start date.', 'error'); return; }
    await this.fetchFilteredTransactions({ startDate:start||null, endDate:end||null });
}

    clearTransactionFilter() {
        const bar = document.getElementById('transactionsFilterBar');
        if (bar) bar.style.display = 'none';
        // Clear any wallet/date filters
        const startEl = document.getElementById('filterStartDate');
        const endEl = document.getElementById('filterEndDate');
        if (startEl) startEl.value = '';
        if (endEl) endEl.value = '';
        if (this._allTransactionsBackup) {
            this.currentTransactions = this._allTransactionsBackup;
            this.renderTransactions(this.currentTransactions);
            this._allTransactionsBackup = null;
        } else if (this._dateFilterBackup) {
            this.currentTransactions = this._dateFilterBackup;
            this.renderTransactions(this.currentTransactions);
            this._dateFilterBackup = null;
        } else {
            this.loadTransactions();
        }
    }

    renderCategories(categories) {
        const container = document.getElementById('categoriesList');
        if (!container) return;
        if (!categories || categories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-tags"></i>
                    <h5>No categories yet</h5>
                    <p>Create categories to organize your transactions!</p>
                </div>`;
            return;
        }
        container.innerHTML = categories.map(cat => {
            const id = cat.id || cat.Id; const name = cat.name || cat.Name;
            return `<div class="category-item" id="category-${id}">
                <div class="name">${name}</div>
                <div class="actions">
                    <button class="icon-btn" title="Edit" onclick="app.editCategory(${id})"><i class="bi bi-pencil"></i></button>
                    <button class="icon-btn danger" title="Delete" onclick="app.deleteCategory(${id})"><i class="bi bi-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    }

    renderWallets(wallets) {
        const container = document.getElementById('walletsList');
        
        if (!wallets || wallets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-wallet"></i>
                    <h5>No wallets yet</h5>
                    <p>Add your first wallet to start tracking your finances!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = wallets.map(wallet => {
            const id = wallet.id || wallet.Id;
            const name = wallet.name || wallet.Name;
            const balanceUSD = (wallet.balance || wallet.Balance || 0);
            const balanceDisp = this.formatDisplay(balanceUSD);
            return `
            <div class="wallet-card" id="wallet-${id}" tabindex="0">
                <div class="d-flex align-items-start gap-2">
                    <div class="flex-grow-1">
                        <h5 class="mb-1">${name}</h5>
                        <div class="balance" title="${balanceUSD.toFixed(2)} USD">${balanceDisp}</div>
                    </div>
                    <div class="wallet-actions">
                        <button class="icon-btn neutral" onclick="toggleWalletTransactions(${id})" title="Show/Hide transactions">
                            <i id="wallet-toggle-icon-${id}" class="bi bi-caret-down"></i>
                        </button>
                        <button class="icon-btn" onclick="app.editWallet(${id})" title="Edit wallet">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="icon-btn danger" onclick="app.deleteWallet(${id})" title="Delete wallet">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div id="wallet-tx-${id}" class="tx-container" style="display:none;">
                    <div class="text-muted small" id="wallet-tx-${id}-loading">Loading transactions...</div>
                    <div id="wallet-tx-${id}-list"></div>
                </div>
            </div>`;
        }).join('');
    }

    // Filter: view transactions for a single wallet
    async loadWalletTransactions(walletId) {
        const resp = await this.apiCall(`/Wallet/Transactions?walletId=${walletId}`, 'GET');
        if (resp.ok && (resp.success !== false)) {
            const tx = resp.data || resp.Data || [];
            return tx;
        }
        throw new Error(resp.message || 'Failed to load wallet transactions');
    }

    async toggleWalletTransactions(walletId) {
        const container = document.getElementById(`wallet-tx-${walletId}`);
        const list = document.getElementById(`wallet-tx-${walletId}-list`);
        const loading = document.getElementById(`wallet-tx-${walletId}-loading`);
        if (!container || !list || !loading) return;

        // Toggle visibility
        const isHidden = container.style.display === 'none';
        if (!isHidden) {
            container.style.display = 'none';
            const icon = document.getElementById(`wallet-toggle-icon-${walletId}`);
            if (icon) { icon.classList.remove('bi-caret-up-square'); icon.classList.add('bi-caret-down-square'); }
            return;
        }
        container.style.display = 'block';
        loading.style.display = 'block';
        list.innerHTML = '';
        const icon = document.getElementById(`wallet-toggle-icon-${walletId}`);
        if (icon) { icon.classList.remove('bi-caret-down-square'); icon.classList.add('bi-caret-up-square'); }

        try {
            // Cache per-wallet transactions to avoid refetching rapidly
            this._walletTxCache = this._walletTxCache || {};
            let tx = this._walletTxCache[walletId];
            if (!tx) {
                tx = await this.loadWalletTransactions(walletId);
                this._walletTxCache[walletId] = tx;
            }
            loading.style.display = 'none';
            if (!tx.length) {
                list.innerHTML = '<div class="text-muted small">No transactions in this wallet yet.</div>';
                return;
            }
            // Render compact list with category names when available
            list.innerHTML = tx.map(t => {
                const amount = t.Amount ?? t.amount ?? 0; // USD
                const sign = amount >= 0 ? '+' : '-';
                const disp = this.formatDisplay(Math.abs(amount));
                const cat = (this.categories || []).find(c => (c.Id || c.id) === (t.CategoryId ?? t.categoryId));
                const catName = cat ? (cat.Name || cat.name) : 'Uncategorized';
                const date = new Date(t.Date ?? t.date).toLocaleDateString();
                return `
                <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <div class="me-2">
                        <div><strong>${t.Name ?? t.name}</strong> <span class="badge bg-light text-dark">${catName}</span></div>
                        <small class="text-muted">${date}${t.Description || t.description ? ' • ' + (t.Description || t.description) : ''}</small>
                    </div>
                    <div class="fw-bold ${amount >= 0 ? 'text-success' : 'text-danger'}" title="${sign}${Math.abs(amount).toFixed(2)} USD">${sign}${disp}</div>
                </div>`;
            }).join('');
        } catch (e) {
            loading.style.display = 'none';
            list.innerHTML = `<div class="text-danger small">${e.message}</div>`;
        }
    }

    // Dropdown population
    populateDropdowns() {
        console.log('Populating dropdowns...'); // Debug log
        console.log('Available wallets:', this.wallets); // Debug log
        console.log('Available categories:', this.categories); // Debug log
        
        const walletSelects = ['quickWallet', 'transactionWallet'];
        const categorySelects = ['quickCategory', 'transactionCategory'];
        
        walletSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Select Wallet</option>';
                if (this.wallets) {
                    this.wallets.forEach(wallet => {
                        const id = wallet.id || wallet.Id;
                        const name = wallet.name || wallet.Name;
                        select.innerHTML += `<option value="${id}">${name}</option>`;
                    });
                }
                console.log(`Populated ${selectId} with ${this.wallets?.length || 0} wallets`);
            }
        });
        
        categorySelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Select Category</option>';
                if (this.categories) {
                    this.categories.forEach(category => {
                        const id = category.id || category.Id;
                        const name = category.name || category.Name;
                        select.innerHTML += `<option value="${id}">${name}</option>`;
                    });
                }
                console.log(`Populated ${selectId} with ${this.categories?.length || 0} categories`);
            }
        });
        // Re-render category filter chips after dropdown refresh
        this.renderCategoryChips?.();
    }

    // Quick Actions
    async handleQuickTransaction(e) {
        e.preventDefault();
        
        const entered = parseFloat(document.getElementById('quickAmount').value);
        const amountUSD = this.convertToUSD(entered, this.displayCurrency);
        const formData = {
            Name: document.getElementById('quickName').value,
            Amount: amountUSD,
            WalletId: parseInt(document.getElementById('quickWallet').value),
            CategoryId: parseInt(document.getElementById('quickCategory').value),
            Date: new Date().toISOString(),
            Description: ''
        };
        
        await this.createTransaction(formData);
        
        // Reset form and refresh data
        document.getElementById('quickTransactionForm').reset();
        this.loadTransactions();
        this.loadWallets(); // Refresh wallets since balance changed
    }

    async handleQuickCategory(e) {
        e.preventDefault();
        
        const name = document.getElementById('quickCategoryName').value;
        await this.createCategory({ Name: name }); // Backend expects 'Name' with capital N
        
        // Reset form
        document.getElementById('quickCategoryForm').reset();
    }

    // Modal Actions
    showAddTransactionModal() {
        new bootstrap.Modal(document.getElementById('addTransactionModal')).show();
    }

    showAddCategoryModal() {
        new bootstrap.Modal(document.getElementById('addCategoryModal')).show();
    }

    showAddWalletModal() {
        new bootstrap.Modal(document.getElementById('addWalletModal')).show();
    }

    async addTransaction() {
        const entered = parseFloat(document.getElementById('transactionAmount').value);
        const amountUSD = this.convertToUSD(entered, this.displayCurrency);
        const formData = {
            Name: document.getElementById('transactionName').value,
            Amount: amountUSD,
            WalletId: parseInt(document.getElementById('transactionWallet').value),
            CategoryId: parseInt(document.getElementById('transactionCategory').value),
            Date: document.getElementById('transactionDate').value,
            Description: document.getElementById('transactionDescription').value
        };
        
        const success = await this.createTransaction(formData);
        if (success) {
            bootstrap.Modal.getInstance(document.getElementById('addTransactionModal')).hide();
            // Clear the form
            document.getElementById('addTransactionForm').reset();
            // Refresh data
            this.loadTransactions();
            this.loadWallets(); // Refresh wallets since balance changed
        }
    }

    async addCategory() {
        const name = document.getElementById('categoryName').value;
        const success = await this.createCategory({ Name: name }); // Backend expects 'Name' with capital N
        if (success) {
            bootstrap.Modal.getInstance(document.getElementById('addCategoryModal')).hide();
        }
    }

    async addWallet() {
        const name = document.getElementById('walletName').value;
        const enteredDisplay = parseFloat(document.getElementById('walletBalance').value);
        const balanceUSD = this.convertToUSD(enteredDisplay, this.displayCurrency);
        const success = await this.createWallet({ Name: name, Balance: balanceUSD });
        if (success) {
            bootstrap.Modal.getInstance(document.getElementById('addWalletModal')).hide();
            document.getElementById('addWalletForm').reset();
        }
    }

    // API Calls
    async createTransaction(data) {
        const resp = await this.apiCall('/Transaction/CreateTransaction', 'POST', data);
        if (resp.ok && (resp.success !== false)) {
            this.showToast(resp.message || 'Transaction created successfully!', 'success');
            await this.loadTransactions();
            await this.loadStats();
            return true;
        }
        this.showToast(resp.message || 'Failed to create transaction', 'error');
        return false;
    }

    async createCategory(data) {
        const resp = await this.apiCall('/Category/AddCategory', 'POST', data);
        if (resp.ok && (resp.success !== false)) {
            this.showToast(resp.message || 'Category created successfully!', 'success');
            await this.loadCategories();
            this.populateDropdowns();
            return true;
        }
        this.showToast(resp.message || 'Failed to create category', 'error');
        return false;
    }

    async createWallet(data) {
        const resp = await this.apiCall('/Wallet', 'POST', data);
        if (resp.ok && (resp.success !== false)) {
            this.showToast(resp.message || 'Wallet created successfully!', 'success');
            await this.loadWallets();
            this.populateDropdowns();
            await this.loadTotalBalance();
            return true;
        }
        this.showToast(resp.message || 'Failed to create wallet', 'error');
        return false;
    }

    // Update methods for edit operations
    async updateTransaction() {
        const id = document.getElementById('editTransactionId').value;
        const entered = parseFloat(document.getElementById('editTransactionAmount').value);
        const amountUSD = this.convertToUSD(entered, this.displayCurrency);
        const formData = {
            Name: document.getElementById('editTransactionName').value,
            Amount: amountUSD,
            WalletId: parseInt(document.getElementById('editTransactionWallet').value),
            CategoryId: parseInt(document.getElementById('editTransactionCategory').value),
            Date: document.getElementById('editTransactionDate').value,
            Description: document.getElementById('editTransactionDescription').value
        };
        // Validate required numeric fields
        if (!id || Number.isNaN(formData.Amount) || Number.isNaN(formData.WalletId) || Number.isNaN(formData.CategoryId)) {
            this.showToast('Please fill all fields correctly before updating.', 'warning');
            return;
        }

        const resp = await this.apiCall(`/Transaction/UpdateTransaction/${id}`, 'PUT', formData);
        if (resp.ok && (resp.success !== false)) {
            this.showToast(resp.message || 'Transaction updated successfully!', 'success');
            await this.loadTransactions();
            await this.loadTotalBalance();
            bootstrap.Modal.getInstance(document.getElementById('editTransactionModal')).hide();
        } else {
            this.showToast(resp.message || 'Failed to update transaction', 'error');
        }
    }

    async updateCategory() {
        const id = document.getElementById('editCategoryId').value;
        const formData = {
            Name: document.getElementById('editCategoryName').value
        };
        const resp = await this.apiCall(`/Category/UpdateCategory/${id}`, 'PUT', formData);
        if (resp.ok && (resp.success !== false)) {
            this.showToast(resp.message || 'Category updated successfully!', 'success');
            await this.loadCategories();
            this.populateDropdowns();
            bootstrap.Modal.getInstance(document.getElementById('editCategoryModal')).hide();
        } else {
            this.showToast(resp.message || 'Failed to update category', 'error');
        }
    }

    async updateWallet() {
        const id = document.getElementById('editWalletId').value;
        const enteredDisplay = parseFloat(document.getElementById('editWalletBalance').value);
        const balanceUSD = this.convertToUSD(enteredDisplay, this.displayCurrency);
        const formData = {
            Name: document.getElementById('editWalletName').value,
            Balance: balanceUSD
        };
        if (Number.isNaN(formData.Balance)) {
            this.showToast('Please enter a valid balance.', 'warning');
            return;
        }
        const resp = await this.apiCall(`/Wallet/UpdateWallet/${id}`, 'PUT', formData);
        if (resp.ok && (resp.success !== false)) {
            this.showToast(resp.message || 'Wallet updated successfully!', 'success');
            await this.loadWallets();
            this.populateDropdowns();
            await this.loadTotalBalance();
            bootstrap.Modal.getInstance(document.getElementById('editWalletModal')).hide();
        } else {
            this.showToast(resp.message || 'Failed to update wallet', 'error');
        }
    }

    // Delete methods (implement these based on your backend endpoints)
    async deleteTransaction(id) {
        if (!(await confirmDialog('Are you sure you want to delete this transaction?', 'Delete', 'danger'))) return;
        const resp = await this.apiCall(`/Transaction/DeleteTransaction/${id}`, 'DELETE');
        if (resp.ok && (resp.success !== false)) {
            this.showToast(resp.message || 'Transaction deleted successfully!', 'success');
            await this.loadTransactions();
            await this.loadStats();
        } else {
            this.showToast(resp.message || 'Failed to delete transaction', 'error');
        }
    }

    async deleteCategory(id) {
        if (!(await confirmDialog('Are you sure you want to delete this category?', 'Delete', 'danger'))) return;
        const resp = await this.apiCall(`/Category/DeleteCategory/${id}`, 'DELETE');
        if (resp.ok && (resp.success !== false)) {
            this.showToast(resp.message || 'Category deleted successfully!', 'success');
            await this.loadCategories();
            this.populateDropdowns();
        } else {
            this.showToast(resp.message || 'Failed to delete category', 'error');
        }
    }

    async deleteWallet(id) {
        if (!(await confirmDialog('Are you sure you want to delete this wallet and all its transactions?', 'Delete', 'danger'))) return;
        const resp = await this.apiCall(`/Wallet/DeleteWallet/${id}`, 'DELETE');
        if (resp.ok && (resp.success !== false)) {
            this.showToast(resp.message || 'Wallet deleted successfully!', 'success');
            await this.loadWallets();
            this.populateDropdowns();
            await this.loadTotalBalance();
        } else {
            this.showToast(resp.message || 'Failed to delete wallet', 'error');
        }
    }

    // Edit methods (implement these based on your backend endpoints)
    editTransaction(id) {
        // Find the transaction in the current transactions list
        const transaction = this.currentTransactions?.find(t => (t.Id || t.id) === id);
        if (!transaction) {
            this.showToast('Transaction not found', 'error');
            return;
        }

        // Populate the edit form
        document.getElementById('editTransactionId').value = id;
        document.getElementById('editTransactionName').value = transaction.Name || transaction.name;
    const baseAmt = transaction.Amount || transaction.amount || 0; // stored in USD
    const dispAmt = this.convertFromUSD(baseAmt, this.displayCurrency);
    document.getElementById('editTransactionAmount').value = (+dispAmt.toFixed(2));
        document.getElementById('editTransactionDescription').value = transaction.Description || transaction.description || '';
        
        // Convert date to datetime-local format
        const dateValue = transaction.Date || transaction.date;
        const date = new Date(dateValue);
        const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('editTransactionDate').value = localDateTime;

        // Populate dropdowns and select current values
        this.populateEditDropdowns();
        
        // Set current values in dropdowns
        setTimeout(() => {
            const walletId = transaction.WalletId || transaction.walletId;
            const categoryId = transaction.CategoryId || transaction.categoryId;
            
            if (walletId) {
                document.getElementById('editTransactionWallet').value = walletId;
            }
            if (categoryId) {
                document.getElementById('editTransactionCategory').value = categoryId;
            }
        }, 100);
        
        // Show the modal
        new bootstrap.Modal(document.getElementById('editTransactionModal')).show();
    }

    editCategory(id) {
        const category = this.categories?.find(c => (c.Id || c.id) === id);
        if (!category) {
            this.showToast('Category not found', 'error');
            return;
        }

        document.getElementById('editCategoryId').value = id;
        document.getElementById('editCategoryName').value = category.Name || category.name;
        
        new bootstrap.Modal(document.getElementById('editCategoryModal')).show();
    }

    editWallet(id) {
        const wallet = this.wallets?.find(w => (w.Id || w.id) === id);
        if (!wallet) {
            this.showToast('Wallet not found', 'error');
            return;
        }

        document.getElementById('editWalletId').value = id;
        document.getElementById('editWalletName').value = wallet.Name || wallet.name;
        const baseBal = wallet.Balance || wallet.balance || 0;
        const dispBal = this.convertFromUSD(baseBal, this.displayCurrency);
        document.getElementById('editWalletBalance').value = (+dispBal.toFixed(2));
        
        new bootstrap.Modal(document.getElementById('editWalletModal')).show();
    }

    populateEditDropdowns() {
        console.log('=== POPULATING EDIT DROPDOWNS ===');
        console.log('Available wallets:', this.wallets);
        console.log('Available categories:', this.categories);
        
        // Populate edit transaction dropdowns
        const walletSelect = document.getElementById('editTransactionWallet');
        const categorySelect = document.getElementById('editTransactionCategory');
        
        // Clear and add placeholder
        walletSelect.innerHTML = '<option value="">Select Wallet</option>';
        if (this.wallets && Array.isArray(this.wallets)) {
            console.log('Processing', this.wallets.length, 'wallets for edit dropdown');
            this.wallets.forEach((wallet, index) => {
                console.log(`Wallet ${index}:`, wallet);
                const walletId = wallet.Id || wallet.id;
                const walletName = wallet.Name || wallet.name;
                console.log(`  - ID: ${walletId}, Name: ${walletName}`);
                
                if (walletId && walletName) {
                    walletSelect.innerHTML += `<option value="${walletId}">${walletName}</option>`;
                    console.log(`  - Added wallet option: ${walletName} (${walletId})`);
                } else {
                    console.warn(`  - Skipped wallet due to missing data:`, wallet);
                }
            });
        } else {
            console.warn('No wallets available or wallets is not an array:', this.wallets);
        }
        
        // Clear and add placeholder
        categorySelect.innerHTML = '<option value="">Select Category</option>';
        if (this.categories && Array.isArray(this.categories)) {
            console.log('Processing', this.categories.length, 'categories for edit dropdown');
            this.categories.forEach((category, index) => {
                console.log(`Category ${index}:`, category);
                const categoryId = category.Id || category.id;
                const categoryName = category.Name || category.name;
                console.log(`  - ID: ${categoryId}, Name: ${categoryName}`);
                
                if (categoryId && categoryName) {
                    categorySelect.innerHTML += `<option value="${categoryId}">${categoryName}</option>`;
                    console.log(`  - Added category option: ${categoryName} (${categoryId})`);
                } else {
                    console.warn(`  - Skipped category due to missing data:`, category);
                }
            });
        } else {
            console.warn('No categories available or categories is not an array:', this.categories);
        }
        
        console.log('Final wallet options count:', walletSelect.children.length);
        console.log('Final category options count:', categorySelect.children.length);
        console.log('=== END EDIT DROPDOWNS DEBUG ===');
    }

    // Utility Methods
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toastId = `toast-${Date.now()}`;
        
        const bgClass = {
            'success': 'bg-success',
            'error': 'bg-danger',
            'warning': 'bg-warning',
            'info': 'bg-primary'
        }[type] || 'bg-primary';
        
        const toastHtml = `
            <div id="${toastId}" class="toast ${bgClass} text-white border-0 shadow" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header ${bgClass} text-white">
                    <strong class="me-auto">TrackIt</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        const toast = new bootstrap.Toast(document.getElementById(toastId));
        toast.show();
        
        // Remove toast element after it's hidden
        document.getElementById(toastId).addEventListener('hidden.bs.toast', () => {
            document.getElementById(toastId).remove();
        });
    }

    async apiCall(path, method = 'GET', body = null) {
        const url = `${this.apiUrl}${path}`;
        const headers = { 'Authorization': `Bearer ${this.token}` };
        if (body) headers['Content-Type'] = 'application/json';
        console.log(`[apiCall] ${method} ${url}`);
        try {
            // Global progress ON
            this._inFlight += 1;
            document.body.classList.add('progress-active');
            const resp = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
            const text = await resp.text();
            let json;
            try { json = text ? JSON.parse(text) : {}; } catch (e) { console.warn('apiCall JSON parse error', e, text); json = {}; }
            // Clear offline banner if request succeeded
            this.setOffline(false);
            // Auto logout on 401
            if (resp.status === 401) {
                this.showToast('Session expired. Please login again.', 'warning');
                this.logout();
            }
            return { status: resp.status, ok: resp.ok, ...json, raw: text };
        } catch (err) {
            console.error('apiCall network error', err);
            this.setOffline(true);
            return { ok: false, error: err.message };
        } finally {
            // Global progress OFF (when no more in-flight)
            this._inFlight = Math.max(0, this._inFlight - 1);
            if (this._inFlight === 0) {
                document.body.classList.remove('progress-active');
            }
        }
    }

    // Connectivity UX helper
    setOffline(isOffline) {
        const banner = document.getElementById('offlineBanner');
        if (!banner) return;
        banner.style.display = isOffline ? 'block' : 'none';
    }

    /* ================= THEME & LOCAL FILTERING ================= */
    toggleTheme() {
        document.body.classList.toggle('theme-dark');
        const dark = document.body.classList.contains('theme-dark');
        localStorage.setItem('trackit:theme', dark ? 'dark' : 'light');
        const icon = document.getElementById('themeToggleIcon');
        if (icon) {
            icon.classList.toggle('bi-moon-stars', !dark);
            icon.classList.toggle('bi-sun', dark);
        }
    }

    ensureBaseTransactions() {
        if (!this._allTransactionsBase && Array.isArray(this.currentTransactions)) {
            this._allTransactionsBase = [...this.currentTransactions];
        }
    }
    setSearchText(v) {
        this._searchText = v;
        this.applyLocalFilters();
    }
    clearLocalFilters() {
        this._searchText = '';
        if (this._activeCategoryIds) this._activeCategoryIds.clear();
        const input = document.getElementById('transactionSearch'); if (input) input.value='';
        this.applyLocalFilters();
        this.renderCategoryChips();
    }
    renderCategoryChips() {
        const container = document.getElementById('categoryFilterChips');
        if (!container) return; container.innerHTML='';
        if (!Array.isArray(this.categories)) return;
        this._activeCategoryIds = this._activeCategoryIds || new Set();
        this.categories.forEach(c => {
            const id = c.Id || c.id; const name = c.Name || c.name;
            const active = this._activeCategoryIds.has(id);
            container.insertAdjacentHTML('beforeend', `<button type="button" class="btn btn-sm ${active ? 'btn-primary':'btn-outline-light'}" onclick="toggleCategoryChip(${id})" data-cid="${id}">${name}</button>`);
        });
        // Toggle clear filters button visibility
        const clearBtn = document.getElementById('clearFiltersBtn');
        if (clearBtn) {
            const s = (this._searchText||'');
            const active = s || (this._activeCategoryIds && this._activeCategoryIds.size);
            clearBtn.classList.toggle('d-none', !active);
        }
    }
    applyLocalFilters() {
        this.ensureBaseTransactions();
        let list = [...(this._allTransactionsBase||[])];
        const s = (this._searchText||'').toLowerCase();
        if (s) list = list.filter(t => ((t.Name||t.name||'').toLowerCase().includes(s)) || ((t.Description||t.description||'').toLowerCase().includes(s)) );
        if (this._activeCategoryIds && this._activeCategoryIds.size) {
            list = list.filter(t => this._activeCategoryIds.has(t.CategoryId || t.categoryId));
        }
        this.currentTransactions = list;
        this.renderTransactions(list);
    }

    /* ================= SERVER FILTERING ================= */
    async fetchFilteredTransactions(overrides={}) {
        const search = (document.getElementById('transactionSearch')?.value || '').trim();
    const start = (overrides.startDate ?? (document.getElementById('filterStartDate')?.value || '').trim()) || null;
    const end = (overrides.endDate ?? (document.getElementById('filterEndDate')?.value || '').trim()) || null;
        const categoryIds = this._activeCategoryIds ? Array.from(this._activeCategoryIds) : [];
        const categoryId = categoryIds.length ? categoryIds[0] : null;
        const walletId = null; // reserved for future
        const qs = new URLSearchParams();
        if (start) qs.set('startDate', start);
        if (end) qs.set('endDate', end);
        if (categoryId) qs.set('categoryId', categoryId);
        if (walletId) qs.set('walletId', walletId);
        if (search) qs.set('search', search);
        try {
            const resp = await this.apiCall(`/Transaction/filter?${qs.toString()}`,'GET');
            if (resp.ok && (resp.success !== false)) {
                const tx = resp.data || resp.Data || [];
                this.currentTransactions = tx;
                this._allTransactionsBase = [...tx];
                this.renderTransactions(tx);
            } else {
                this.applyLocalFilters();
            }
        } catch(err) {
            this.applyLocalFilters();
        }
    }

} // End of TrackItApp class

// Simple confirm modal helper using #confirmModal from index.html
function confirmDialog(message, confirmText = 'Confirm', variant = 'danger') {
    const modalEl = document.getElementById('confirmModal');
    if (!modalEl) return Promise.resolve(confirm(message)); // fallback to native confirm
    const titleEl = document.getElementById('confirmTitle');
    const bodyEl = document.getElementById('confirmBody');
    const yesBtn = document.getElementById('confirmYesBtn');
    titleEl.textContent = 'Confirm';
    bodyEl.textContent = message;
    yesBtn.textContent = confirmText;
    yesBtn.className = `btn btn-${variant}`;
    return new Promise(resolve => {
        const onYes = () => { cleanup(); resolve(true); };
        const onHidden = () => { cleanup(); resolve(false); };
        const cleanup = () => {
            yesBtn.removeEventListener('click', onYes);
            modalEl.removeEventListener('hidden.bs.modal', onHidden);
        };
        yesBtn.addEventListener('click', onYes);
        modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    });
}

// Define global stubs immediately so inline handlers don't throw before app is constructed
window.app = window.app || null;
window.updateTransaction = () => window.app?.updateTransaction?.();
window.updateCategory = () => window.app?.updateCategory?.();
window.updateWallet = () => window.app?.updateWallet?.();
window.deleteTransaction = (id) => window.app?.deleteTransaction?.(id);
window.deleteCategory = (id) => window.app?.deleteCategory?.(id);
window.deleteWallet = (id) => window.app?.deleteWallet?.(id);
window.logout = () => window.app?.logout?.();
window.showLogin = () => window.app?.showLogin?.();
window.showRegister = () => window.app?.showRegister?.();
window.showTab = (tabName, ev) => window.app?.showTab?.(tabName, ev);
window.showAddTransactionModal = () => window.app?.showAddTransactionModal?.();
window.showAddCategoryModal = () => window.app?.showAddCategoryModal?.();
window.showAddWalletModal = () => window.app?.showAddWalletModal?.();
window.addTransaction = () => window.app?.addTransaction?.();
window.addCategory = () => window.app?.addCategory?.();
window.addWallet = () => window.app?.addWallet?.();
window.toggleWalletTransactions = (walletId) => window.app?.toggleWalletTransactions?.(walletId);
window.filterByDate = () => window.app?.filterByDate?.();
window.toggleTheme = () => window.app?.toggleTheme?.();
window.clearLocalFilters = () => { if(!window.app) return; window.app._activeCategoryIds?.clear(); document.getElementById('transactionSearch') && (document.getElementById('transactionSearch').value=''); window.app.renderCategoryChips(); window.app.fetchFilteredTransactions(); };
window.toggleCategoryChip = (cid) => { if(!window.app) return; window.app._activeCategoryIds = window.app._activeCategoryIds || new Set(); if(window.app._activeCategoryIds.has(cid)) window.app._activeCategoryIds.delete(cid); else window.app._activeCategoryIds.add(cid); window.app.renderCategoryChips(); window.app.fetchFilteredTransactions(); };
let _searchTimer=null; window.debouncedSearch = () => { const val = document.getElementById('transactionSearch')?.value || ''; clearTimeout(_searchTimer); _searchTimer=setTimeout(()=> window.app?.fetchFilteredTransactions(), 300); };
window.toggleDateGroup = (key) => { const body = document.getElementById(`dg-body-${key}`); const icon = document.getElementById(`dg-icon-${key}`); if(!body||!icon) return; const hide = body.style.display==='none'; body.style.display = hide? 'block':'none'; icon.classList.toggle('bi-chevron-up', hide); icon.classList.toggle('bi-chevron-down', !hide); };
// Currency change (frontend only)
window.changeDisplayCurrency = (code) => window.app?.changeDisplayCurrency?.(code);

// Construct the app after DOM is ready to ensure elements exist
if (!window.app) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.app = new TrackItApp();
            // If user persisted a non-USD currency, ensure initial re-render in that currency
            if (window.app.displayCurrency !== 'USD') {
                window.app.changeDisplayCurrency(window.app.displayCurrency);
            }
            // Connectivity listeners for offline banner
            window.addEventListener('online', () => app.setOffline(false));
            window.addEventListener('offline', () => app.setOffline(true));
        });
    } else {
        window.app = new TrackItApp();
        if (window.app.displayCurrency !== 'USD') {
            window.app.changeDisplayCurrency(window.app.displayCurrency);
        }
        window.addEventListener('online', () => app.setOffline(false));
        window.addEventListener('offline', () => app.setOffline(true));
    }
}