using System.ComponentModel.DataAnnotations;

namespace TrackIt.Models.Dtos
{
    public class CategoryGetDto
    {
        public required int Id { get; set; }  // Changed from int? to int
        public required string Name { get; set; }
    }
     public class CategoryDto
    {
        public required string Name { get; set; }
    }
}