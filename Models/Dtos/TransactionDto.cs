namespace TrackIt.Models.Dtos
{
    public class TransactionGetDto
    {
        public required int Id { get; set; }
        public required int CategoryId { get; set; }
        public required string Name { get; set; }
        public required decimal Amount { get; set; }

        public DateTime Date { get; set; }
        public string? Description { get; set; }
    }
     public class TransactionDto
    {
        public required int CategoryId { get; set; }
        public required string Name { get; set; } 
        public required int WalletId { get; set; }
        public required decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string? Description { get; set; }
    }
}