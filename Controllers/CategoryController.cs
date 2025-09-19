using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackIt.Data;
using TrackIt.Models;
using TrackIt.Models.Dtos;
namespace TrackIt.Controllers
{
    [ApiController]
    [Route("[controller]")]
    // [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [Authorize]
    public class CategoryController : ControllerBase
    {
        private readonly AppDbContext dbContext;
        private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

        public CategoryController(AppDbContext dbContext)
        {
            this.dbContext = dbContext;
        }
        [HttpPost("AddCategory")]
        public async Task<IActionResult> CreateCategory(CategoryDto request)
        {
            try
            {
                if (string.IsNullOrEmpty(UserId))
                    return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });

                // Check for duplicate category names
                var existingCategory = await dbContext.Categories
                    .FirstOrDefaultAsync(c => c.Name.ToLower() == request.Name.ToLower() && c.UserId == UserId);

                if (existingCategory != null)
                {
                    return BadRequest(new ApiResponse<object> { Success = false, Message = "Category with this name already exists" });
                }

                var category = new Category { Name = request.Name, UserId = UserId };
                dbContext.Categories.Add(category);
                await dbContext.SaveChangesAsync();

                return Ok(new ApiResponse<CategoryGetDto>
                {
                    Success = true,
                    Message = "Category created successfully",
                    Data = new CategoryGetDto { Id = category.Id, Name = category.Name }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object> { Success = false, Message = $"An error occurred: {ex.Message}" });
            }
        }
        [HttpGet("GetCategory")]
        public async Task<IActionResult> GetCategories()
        {
            if (string.IsNullOrEmpty(UserId))
                return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });
            var categories = await dbContext.Categories.Where(c => c.UserId == UserId).Select(c => new CategoryGetDto
            {
                Id = c.Id,
                Name = c.Name
            })
            .OrderBy(c => c.Name)
            .ToListAsync();
            return Ok(new ApiResponse<List<CategoryGetDto>>
            {
                Success = true,
                Message = categories.Any() ? "Categories retrieved successfully" : "No categories found",
                Data = categories
            });
        }
         [HttpPut("UpdateCategory/{id}")]
        public async Task<IActionResult> UpdateCategorty(int id, CategoryDto request)
        {
            if (string.IsNullOrEmpty(UserId))
                return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });
            var category = await dbContext.Categories.FirstOrDefaultAsync(c => c.Id == id && c.UserId == UserId);
            if (category == null)
                return NotFound(new ApiResponse<object> { Success = false, Message = "Category doesn't exist" });
            category.Name = request.Name;
            await dbContext.SaveChangesAsync();
            return Ok(new ApiResponse<CategoryGetDto>
            {
                Success = true,
                Message = "Category updated successfully",
                Data = new CategoryGetDto { Id = category.Id, Name = category.Name }
            });
        }
        [HttpDelete("DeleteCategory/{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            if (string.IsNullOrEmpty(UserId))
                return Unauthorized(new ApiResponse<object> { Success = false, Message = "Invalid user token" });
            var category = await dbContext.Categories.FirstOrDefaultAsync(c => c.Id == id && c.UserId == UserId);
            if (category == null)
                return NotFound(new ApiResponse<object> { Success = false, Message = "Category doesn't exist" });
            dbContext.Categories.Remove(category);
            await dbContext.SaveChangesAsync();
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = $"Category {category.Name} was deleted successfully"
            });
        }
       
    }
}