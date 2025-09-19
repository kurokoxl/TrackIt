namespace TrackIt.Models.Dtos
{
    public class WalletGetDto
    {
        public required int Id { get; set; }
        public required string Name { get; set; }
        public required decimal Balance { get; set; }
    }
    
    public class WalletDto
    {
        public required string Name { get; set; }
        public required decimal Balance { get; set; }
    }
}