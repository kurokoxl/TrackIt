using System.Security.Claims;
using System.Transactions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackIt.Data;
using TrackIt.Models;
using TrackIt.Models.Dtos;
using Transaction = TrackIt.Models.Transaction;

namespace TrackIt.Controllers
{
    [ApiController]
    [Route("[Controller]")]
    [Authorize]
    public class TransactionController : ControllerBase
    {
        private readonly AppDbContext dbContext;
        private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

        public TransactionController(AppDbContext dbContext)
        {
            this.dbContext = dbContext;
        }
        [HttpPost("CreateTransaction")]
        public async Task<IActionResult> CreateTransaction(TransactionDto request)
        {
            if (string.IsNullOrEmpty(UserId))
                return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });
            var wallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.Id == request.WalletId && w.UserId == UserId);
            if (wallet == null)
                return NotFound(new ApiResponse<object> { Success = false, Message = "Wallet doesn't exist" });
            var category = await dbContext.Categories.FirstOrDefaultAsync(c => c.Id == request.CategoryId && c.UserId == UserId);
            if (category == null)
                return NotFound(new ApiResponse<object> { Success = false, Message = "Category doesn't exist" });
            var transaction = new Transaction
            {
                CategoryId = request.CategoryId,
                WalletId = request.WalletId,
                Name = request.Name,
                UserId = UserId,
                Amount = request.Amount,
                Date = request.Date,
                Description = request.Description
            };
            wallet.Balance += request.Amount;
            await dbContext.Transactions.AddAsync(transaction);
            await dbContext.SaveChangesAsync();
            return Ok(new ApiResponse<TransactionGetDto>
            {
                Success = true,
                Message = "Transaction created successfully",
                Data = new TransactionGetDto
                {
                    Id = transaction.Id,
                    Amount = transaction.Amount,
                    CategoryId = transaction.CategoryId,
                    Name = transaction.Name,
                    Date = transaction.Date,
                    Description = transaction.Description
                }
            });
        }
        [HttpGet("GetTransactions")]
        public async Task<IActionResult> GetTransactions()
        {
            if (string.IsNullOrEmpty(UserId))
                return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });
            var transactions = await dbContext.Transactions.Where(t => t.UserId == UserId).Select(t => new TransactionGetDto
            {
                Id = t.Id,
                Amount = t.Amount,
                CategoryId = t.CategoryId,
                Name = t.Name,
                Date = t.Date,
                Description = t.Description
            }).ToListAsync();
            return Ok(new ApiResponse<List<TransactionGetDto>>
            {
                Data = transactions,
                Message = "Transactions retrieved successfully",
                Success = true
            });
        }
        [HttpGet("filter")]
        public async Task<IActionResult> GetFilteredTransactions(
            DateTime? startDate,
            DateTime? endDate,
            int? categoryId,
            int? walletId,
            string? search)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new ApiResponse<object>{ Success=false, Message = "Invalid user token"});

            var query = dbContext.Transactions
                .AsNoTracking()
                .Where(t => t.UserId == userId)
                .AsQueryable();

            if (startDate.HasValue)
                query = query.Where(q => q.Date >= startDate.Value);
            if (endDate.HasValue)
                query = query.Where(t => t.Date <= endDate.Value);

            if (categoryId.HasValue)
                query = query.Where(t => t.CategoryId == categoryId.Value);

            if (walletId.HasValue)
                query = query.Where(t => t.WalletId == walletId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(t => t.Name.Contains(term) || (t.Description != null && t.Description.Contains(term)));
            }
            // Order newest first for consistent UI
            query = query.OrderByDescending(t => t.Date);

            var results = await query.Select(t => new TransactionGetDto
            {
                Id = t.Id,
                Amount = t.Amount,
                CategoryId = t.CategoryId,
                Name = t.Name,
                Date = t.Date,
                Description = t.Description
            }).ToListAsync();
            return Ok(new ApiResponse<List<TransactionGetDto>>
            {
                Success = true,
                Data = results,
                Message ="Data filtered successfully"
            });
        }

        [HttpGet("DateInterval")]
        public async Task<IActionResult> TransactionsWithinDate(
            [FromQuery] string startDate,
            [FromQuery] string endDate)
        {
            if (string.IsNullOrWhiteSpace(startDate) || string.IsNullOrWhiteSpace(endDate))
                return BadRequest(new ApiResponse<object> { Success = false, Message = "startDate and endDate are required (yyyy-MM-dd)." });

            if (!DateOnly.TryParse(startDate, out var startDo) || !DateOnly.TryParse(endDate, out var endDo))
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Dates must be in yyyy-MM-dd format." });

            if (endDo < startDo)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "End date cannot be earlier than start date." });

            var start = startDo.ToDateTime(TimeOnly.MinValue);
            var end = endDo.ToDateTime(TimeOnly.MaxValue);

            var transactions = await dbContext.Transactions
                .Where(t => t.UserId == UserId && t.Date >= start && t.Date <= end)
                .OrderByDescending(t => t.Date)
                .Select(t => new TransactionGetDto
                {
                    Id = t.Id,
                    Amount = t.Amount,
                    CategoryId = t.CategoryId,
                    Name = t.Name,
                    Date = t.Date,
                    Description = t.Description
                })
                .ToListAsync();

            return Ok(new ApiResponse<List<TransactionGetDto>>
            {
                Success = true,
                Message = "Transactions retrieved successfully",
                Data = transactions
            });
        }
        [HttpPut("UpdateTransaction/{id}")]
        public async Task<IActionResult> UpdateTransaction(int id, TransactionDto request)
        {
            if (string.IsNullOrEmpty(UserId))
                return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });
            var transaction = await dbContext.Transactions.FirstOrDefaultAsync(t => t.Id == id && t.UserId == UserId);
            if (transaction == null)
                return NotFound(new ApiResponse<object> { Success = false, Message = "Transaction doesnt exist" });
            var oldWalletId = transaction.WalletId;
            var oldAmount = transaction.Amount;
            var oldWallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.Id == oldWalletId && w.UserId == UserId);
            if (oldWallet == null)
                return NotFound(new ApiResponse<object> { Success = false, Message = "Transaction doesnt exist" });

            oldWallet.Balance -= oldAmount;
            if (request.WalletId != oldWalletId)
            {
                var newWallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.Id == request.WalletId && w.UserId == UserId);
                if (newWallet == null)
                    return NotFound(new ApiResponse<object> { Success = false, Message = "Transaction doesnt exist" });
                newWallet.Balance += request.Amount;
            }
            else
            {
                oldWallet.Balance += request.Amount;
            }
            transaction.Amount = request.Amount;
            transaction.CategoryId = request.CategoryId;
            transaction.Date = request.Date;
            transaction.Description = request.Description;
            transaction.Name = request.Name;
            transaction.WalletId = request.WalletId;
            await dbContext.SaveChangesAsync();
            return Ok(new ApiResponse<TransactionGetDto>
            {
                Success = true,
                Message = "Transaction updated successfully",
                Data = new TransactionGetDto
                {
                    Id = transaction.Id,
                    Amount = transaction.Amount,
                    CategoryId = transaction.CategoryId,
                    Name = transaction.Name,
                    Date = transaction.Date,
                    Description = transaction.Description
                }
            });
            
        }
        [HttpDelete("DeleteTransaction/{id}")]
        public async Task<IActionResult> DeleteTransaction(int id)
        {
            if (string.IsNullOrEmpty(UserId))
                return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });

            var transaction = await dbContext.Transactions
                .Include(t => t.Wallet)  // ✅ Include wallet
                .FirstOrDefaultAsync(t => t.UserId == UserId && t.Id == id);

            if (transaction == null)
                return NotFound(new ApiResponse<object> { Success = false, Message = "Transaction doesn't exist" });

            // ✅ Reverse the transaction's effect on wallet balance
            transaction.Wallet!.Balance -= transaction.Amount;

            dbContext.Remove(transaction);
            await dbContext.SaveChangesAsync();  // ✅ Both changes are atomic

            return Ok(new ApiResponse<object>
            {
                Message = "Transaction deleted successfully",
                Success = true
            });
        }
    }
}

// if (string.IsNullOrEmpty(UserId))
            //     return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });
            // var transaction = await dbContext.Transactions.FirstOrDefaultAsync(t => t.Id == id && t.UserId == UserId);
            // if (transaction == null)
            //     return NotFound(new ApiResponse<object> { Success = false, Message = "Transaction doesn't exist" });

            // // Track original values for balance adjustment
            // var originalAmount = transaction.Amount;
            // var originalWalletId = transaction.WalletId;

            // // Validate new wallet
            // var newWallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == UserId && w.Id == request.WalletId);
            // if (newWallet == null)
            //     return NotFound(new ApiResponse<object> { Success = false, Message = "Wallet doesn't exist" });

            // if (originalWalletId != request.WalletId)
            // {
            //     var oldWallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.Id == originalWalletId && w.UserId == UserId);
            //     if (oldWallet != null)
            //     {
            //         oldWallet.Balance -= originalAmount; // remove original effect
            //     }
            //     newWallet.Balance += request.Amount; // apply new effect
            // }
            // else
            // {
            //     // Same wallet: adjust difference
            //     var diff = request.Amount - originalAmount;
            //     newWallet.Balance += diff;
            // }

            // transaction.Amount = request.Amount;
            // transaction.CategoryId = request.CategoryId;
            // transaction.Date = request.Date;
            // transaction.Description = request.Description;
            // transaction.Name = request.Name;
            // transaction.WalletId = request.WalletId;

            // await dbContext.SaveChangesAsync();
            // return Ok(new ApiResponse<TransactionGetDto>
            // {
            //     Success = true,
            //     Message = "Transaction updated successfully",
            //     Data = new TransactionGetDto
            //     {
            //         Id = transaction.Id,
            //         Amount = transaction.Amount,
            //         CategoryId = transaction.CategoryId,
            //         Name = transaction.Name,
            //         Date = transaction.Date,
            //         Description = transaction.Description
            //     }
            // });