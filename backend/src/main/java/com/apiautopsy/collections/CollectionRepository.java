package com.apiautopsy.collections;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface CollectionRepository extends JpaRepository<Collection, UUID> {
    List<Collection> findByWorkspaceId(UUID workspaceId);
}
