using System;
using Microsoft.AspNetCore.Identity;

namespace TrackIt.Models
{
    public class Transaction
    {
        public int Id { get; set; }
        public required string Name { get; set; }        // Transaction title/name
        public required string UserId { get; set; }      // ✅ Changed to string to match IdentityUser
        public required int CategoryId { get; set; }
        public required int WalletId { get; set; }   // ✅ Add this

        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string? Description { get; set; }         // Optional longer description

        // Navigation properties
        public IdentityUser? User { get; set; }
        public Wallet? Wallet { get; set; }          // ✅ Add this
        public Category? Category { get; set; }
    }
}