using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace TrackIt.Models
{
    public class Category
    {
        public int Id { get; set; }
        public required string UserId { get; set; }  // ✅ Changed to string to match IdentityUser
    
        public required string Name { get; set; }
        
        // Navigation property to IdentityUser
        public IdentityUser? User { get; set; }
    }
}