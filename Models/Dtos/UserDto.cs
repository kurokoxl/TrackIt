namespace TrackIt.Models.Dtos
{
    public class UserDto
    {
        public required string Username { get; set; }
        public string ? Email { get; set; }
        public required string Password { get; set; }
    }
}