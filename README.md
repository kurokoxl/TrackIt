# TrackIt

A lightweight personal finance tracker built with ASP.NET Core (Backend) and vanilla JavaScript + Bootstrap (Frontend). Supports dark mode, date-grouped transactions, category filtering, wallet balances, and frontend multi-currency display (canonical storage in USD).

## Features
- User authentication (JWT) – login / register
- Wallets, Categories, Transactions CRUD
- Date grouping toggle for transactions
- Local + server-side filtering (search, date range, category)
- Dark mode with token-based theming
- Frontend multi-currency display (USD base, selectable EGP / SAR)
- Tooltips show original USD values for transparency
- Responsive layout & accessible focus states

## Currency Handling
All monetary values are stored in the database in USD. The frontend converts amounts to the selected display currency using static placeholder rates defined in `wwwroot/app.js`:
```
this.ratesFromUSD = { USD: 1, EGP: 49.00, SAR: 3.75 };
```
Change them or implement a fetch to a real FX API (cache daily) if needed.

## Project Structure (Simplified)
```
TrackIt/
  Program.cs
  TrackIt.csproj
  Controllers/
  Data/
  Models/
  Migrations/
  wwwroot/
    index.html
    app.js
    styles.css
```

## Running Locally
1. .NET 9 SDK required.
2. Restore & run:
   ```powershell
   dotnet restore
   dotnet run
   ```
3. API base URL (adjust if needed) is configured in `app.js` as `this.apiUrl`.
4. Open `http://localhost:<port>` (check console output) – ensure `wwwroot` is served (Static Files middleware).

## Environment / Configuration
Update `appsettings.json` for database connection (SQL Server expected). Apply migrations:
```powershell
dotnet ef database update
```
(Ensure `Microsoft.EntityFrameworkCore.Tools` installed if not already.)

## Deployment (Testing via GitHub + StackBlitz / Codespaces)
Because this is a server + static frontend, you have options:

### 1. GitHub Repository
- Initialize git and push:
  ```powershell
  git init
  git add .
  git commit -m "Initial TrackIt"
  git branch -M main
  git remote add origin https://github.com/<your-user>/<your-repo>.git
  git push -u origin main
  ```

### 2. StackBlitz (Experimental for full .NET)
StackBlitz supports WebContainers mainly for Node. For .NET APIs you can:
- Use GitHub Codespaces (recommended) or Gitpod for full .NET runtime.
- OR deploy API separately (e.g., Azure App Service / Render) & host only `wwwroot` static assets on a static host, pointing `this.apiUrl` to the remote API.

### 3. Quick Static Frontend Hosting
If you host only the frontend (e.g., GitHub Pages, Netlify):
- Move `index.html`, `styles.css`, `app.js` to a separate `frontend` folder if desired.
- Set `this.apiUrl` in `app.js` to your deployed backend URL.

## Production Hardening Ideas
- Add rate limiting & robust error handling middleware.
- Issue refresh tokens with rotation.
- Add HTTPS redirection + HSTS.
- Implement CORS restrictions.
- Real FX rate ingestion + timestamping.
- Server-side currency formatting preference per user.

## Dark Mode Contrast
Dark mode overrides are appended at the end of `styles.css`. To tweak forms or modal appearance search for comment:
```
/* ===== Dark mode form & modal contrast enhancements ===== */
```

## Adding Dynamic FX Rates (Optional)
Pseudo extension inside `TrackItApp`:
```js
async refreshFxRates() {
  const resp = await fetch('https://open.er-api.com/v6/latest/USD');
  const json = await resp.json();
  this.ratesFromUSD.EGP = json.rates.EGP;
  this.ratesFromUSD.SAR = json.rates.SAR;
  localStorage.setItem('trackit:fxRates', JSON.stringify({ t: Date.now(), rates: this.ratesFromUSD }));
}
```
Call once per day on init if cached value older than 24h.

## Known Limitations
- No pagination or virtual scrolling for large transaction sets.
- Static FX rates (unless extended manually).
- Wallet transaction names currently placeholder if backend doesn’t supply wallet names.

## Contribution / Next Steps
- Add transaction type tagging.
- Add budget alerts per category.
- Add export (CSV / Excel).
- Add unit tests (xUnit) for controllers & services.

## License
Choose a license (e.g., MIT) and add `LICENSE` file.

Enjoy tracking! 🚀
