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
builder.Services.AddAuthentication("Cookies")
    .AddCookie("Cookies", options =>
    {
        // How long the cookie lives
        options.ExpireTimeSpan = TimeSpan.FromMinutes(60);

        // Should the cookie refresh its lifetime with each request?
        options.SlidingExpiration = true;

        // Where to redirect if unauthorized (for MVC apps)
        options.LoginPath = "/Account/Login";
        options.AccessDeniedPath = "/Account/AccessDenied";
    });
// Note: We're using JWT for API authentication, so we don't need cookie configuration
// The Identity services are still needed for UserManager and user storage
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

var app = builder.Build();

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

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
