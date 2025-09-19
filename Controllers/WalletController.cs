using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Any;
using TrackIt.Data;
using TrackIt.Models;
using TrackIt.Models.Dtos;

namespace TrackIt.Controllers
{
    [ApiController]
    [Route("[controller]")]
    // [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [Authorize]


    public class WalletController : Controller
    {
        private readonly AppDbContext dbContext;
        private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);
        public WalletController(AppDbContext dbContext)
        {
            this.dbContext = dbContext;
        }
        [HttpPost]
        public async Task<IActionResult> CreateWallet(WalletDto request)
        {
            if (string.IsNullOrEmpty(UserId))
                return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });
            var Wallet = new Wallet
            {
                Name = request.Name,
                Balance = request.Balance,
                UserId = UserId
            };
            await dbContext.Wallets.AddAsync(Wallet);
            await dbContext.SaveChangesAsync();

            return Ok(new ApiResponse<WalletGetDto>
            {
                Success = true,
                Message = "Wallet created successfully",
                Data = new WalletGetDto { Id = Wallet.Id, Name = Wallet.Name, Balance = Wallet.Balance }
            });
        }
        [HttpGet("GetWallets")]
        public async Task<IActionResult> GetWallets()
        {
            if (string.IsNullOrEmpty(UserId))
                return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });
            var Wallets = await dbContext.Wallets.Where(w => w.UserId == UserId).OrderBy(w => w.Balance).Select(w => new WalletGetDto
            {
                Id = w.Id,
                Name = w.Name,
                Balance = w.Balance
            }).ToListAsync();
        
            return Ok(new ApiResponse<List<WalletGetDto>>
            {
                Success = true,
                Message = Wallets.Any() ? "Wallets retrieved successfully" : "No wallets found",
                Data = Wallets
            });
        }
        [HttpGet("GetTotalBalance")]
        public async Task<IActionResult> GetTotalBalance()
        {
            if (string.IsNullOrEmpty(UserId))
                return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });
                
            var totalBalance = await dbContext.Wallets
                .Where(w => w.UserId == UserId)
                .SumAsync(w => w.Balance);
                
            return Ok(new ApiResponse<decimal>
            {
                Success = true,
                Data = totalBalance,
                Message = "Total balance retrieved successfully"
            });
        }
        [HttpGet("Transactions")]
        public async Task<IActionResult> TransactionInWallet(int walletId)
        {
            if (string.IsNullOrEmpty(UserId))
                return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });
            var TransactionInWallet = await  dbContext.Transactions.Where(t => t.WalletId == walletId && t.UserId == UserId).OrderBy(t=>t.Date).Select(t=>new TransactionGetDto
            {
                Id = t.Id,
                Amount = t.Amount,
                Date = t.Date,
                CategoryId = t.CategoryId,
                Name = t.Name,
                Description = t.Description

            }).ToListAsync();
            
            return Ok(new ApiResponse<List<TransactionGetDto>>
            {
                Success = true,
                Data = TransactionInWallet,
                Message = "Transaction retrived successfully"
            });
        }

        [HttpPut("UpdateWallet/{id}")]
        public async Task<IActionResult> UpdateWallet(int id, WalletDto request)
        {
            if (string.IsNullOrEmpty(UserId))
                return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });
            var wallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == UserId && w.Id == id);
            if (wallet == null)
                return NotFound(new ApiResponse<object> { Success = false, Message = "Wallet doesn't exist" });
            wallet.Name = request.Name;
            wallet.Balance = request.Balance;
            await dbContext.SaveChangesAsync();
            return Ok(new ApiResponse<WalletGetDto>
            {
                Success = true,
                Message = "Wallet updated successfully",
                Data = new WalletGetDto { Id = wallet.Id, Name = wallet.Name, Balance = wallet.Balance }
            });
        }
        [HttpDelete("DeleteWallet/{id}")]
        public async Task<IActionResult> DeleteWallet(int id)
        {
            if (string.IsNullOrEmpty(UserId))
                return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });
            var wallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == UserId && w.Id == id);
            if (wallet == null)
                return NotFound(new ApiResponse<object> { Success = false, Message = "Wallet doesn't exist" });
            dbContext.Wallets.Remove(wallet);
            await dbContext.SaveChangesAsync();
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = $"Wallet {wallet.Name} deleted successfully"
            });
        }
    
    }
}