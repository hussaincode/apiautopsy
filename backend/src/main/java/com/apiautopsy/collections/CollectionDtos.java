package com.apiautopsy.collections;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public class CollectionDtos {
    public record CollectionRequest(@NotBlank String name, String description, UUID parentId) {}
    public record CollectionResponse(UUID id, UUID parentId, String name, String description) {}
}
