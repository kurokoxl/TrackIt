using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TrackIt.Data;
using TrackIt.Models.Dtos;

namespace TrackIt.Controllers
{
    [ApiController]
    [Route("[controller]")]
    
    public class UserController : ControllerBase
    {
        private readonly UserManager<IdentityUser> userManager;
        private readonly AppDbContext dbContext;
        private readonly SignInManager<IdentityUser> signInManager;
        private readonly IConfiguration configuration;
        public UserController(AppDbContext dbContext, UserManager<IdentityUser> userManager, SignInManager<IdentityUser> signInManager, IConfiguration configuration)
        {
            this.userManager = userManager;
            this.dbContext = dbContext;
            this.signInManager = signInManager;
            this.configuration = configuration;
        }
        [HttpPost("Register")]
        public async Task<IActionResult> Register(UserDto request)
        {
            var user = new IdentityUser
            {
                UserName = request.Username,
                Email = request.Email
            };
            var result = await userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Registration failed",
                    Data = result.Errors.Select(e => new { e.Code, e.Description }).ToList()
                });
            }
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = $"User {request.Username} created successfully"
            });
        }
        [HttpPost("Login")]
        public async Task<IActionResult> Login(UserDto request)
        {
            var result = await signInManager.PasswordSignInAsync(request.Username, request.Password, isPersistent: true, lockoutOnFailure: false);
            if (!result.Succeeded)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid username or password"
                });
            }
            var user = await userManager.FindByNameAsync(request.Username);
            if (user == null)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "User not found"
                });
            }
            
            var token = CreateToken(user);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = $"Welcome {request.Username}",
                Data = new { Token = token, UserId = user.Id, Username = user.UserName }
            });
        }
        private string CreateToken(IdentityUser user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),  // ✅ Use NameIdentifier with User ID
                new Claim(ClaimTypes.Name, user.UserName ?? ""),
                new Claim(ClaimTypes.Email, user.Email ?? "")
            };
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["AppSettings:Token"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: configuration["AppSettings:Issuer"],
                audience: configuration["AppSettings:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(1),
                signingCredentials: creds
            );
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}