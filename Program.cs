using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using TrackIt.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
// NOTE: Optional SQLite fallback uses UseSqlite extension which becomes available
// once the Microsoft.EntityFrameworkCore.Sqlite package is added to the csproj.
// No explicit using directive required beyond Microsoft.EntityFrameworkCore.

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
// Endpoints explorer + Swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "TrackIt API",
        Version = "v1",
        Description = "API documentation for TrackIt personal finance manager"
    });

    // JWT Bearer auth header support in Swagger UI
    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "Enter 'Bearer {token}'",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
    };
    c.AddSecurityDefinition("Bearer", securityScheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { securityScheme, new string[] { } }
    });
});
// Optional: keep Scalar for alternative reference UI (already referenced)
builder.Services.AddOpenApi();
builder.Services.ConfigureSwagger(options => { });
builder.Services.AddAuthorization();
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["AppSettings:Issuer"],
        ValidAudience = builder.Configuration["AppSettings:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["AppSettings:Token"]!)
        )
    };
});

builder.Services.AddIdentity<IdentityUser, IdentityRole>()
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();
// NOTE: Removed Cookie authentication registration to avoid 302 redirects to /Account/Login in API scenarios.
// Identity still provides user management; JWT handles auth.
// Database provider selection: default SQL Server, optional SQLite fallback for ephemeral test deployments
var useSqlite = Environment.GetEnvironmentVariable("USE_SQLITE");
if (!string.IsNullOrWhiteSpace(useSqlite) && useSqlite.Equals("true", StringComparison.OrdinalIgnoreCase))
{
    var dbPath = Path.Combine(AppContext.BaseDirectory, "trackit.db");
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite($"Data Source={dbPath}")
    );
    Console.WriteLine($"[Startup] Using SQLite at {dbPath}");
}
else
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlServer(builder.Configuration.GetConnectionString("UserDatabase"))
    );
    Console.WriteLine("[Startup] Using SQL Server (UserDatabase connection string)");
}

// Basic CORS (allow same-origin and simple JS usage). Adjust origins as needed.
builder.Services.AddCors(options =>
{
    options.AddPolicy("Default", policy =>
    {
        policy.AllowAnyHeader().AllowAnyMethod().AllowCredentials().SetIsOriginAllowed(_ => true);
    });
});

var app = builder.Build();

// Validate critical JWT settings early (avoid silent null leading to runtime exception)
string? tokenKey = builder.Configuration["AppSettings:Token"]; // should be long
if (string.IsNullOrWhiteSpace(tokenKey) || tokenKey.Length < 32)
{
    Console.WriteLine("[Startup][WARN] AppSettings:Token is missing or too short. Set a strong secret via environment variables.");
}

// Forwarded headers (Railway / reverse proxy) to ensure https scheme recognized
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

// Apply pending migrations automatically (useful for SQLite / ephemeral envs)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (db.Database.GetPendingMigrations().Any())
        {
            Console.WriteLine("[Startup] Applying pending migrations...");
            db.Database.Migrate();
            Console.WriteLine("[Startup] Migrations applied.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Startup] Migration error: {ex.Message}");
    }
}

// ✅ Enable static file serving
app.UseDefaultFiles();  // Serves index.html as default
app.UseStaticFiles();   // Serves files from wwwroot folder

if (app.Environment.IsDevelopment())
{
    // Swashbuckle
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "TrackIt API v1");
        c.RoutePrefix = "swagger"; // UI at /swagger
    });

    // Scalar (alternative) still available
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// Only enforce HTTPS redirection if request came in as HTTP and platform supports it
app.UseHttpsRedirection();

app.UseCors("Default");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
