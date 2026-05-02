package com.apiautopsy.certificates;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface CertificateRepository extends JpaRepository<CertificateEntity, UUID> {
    List<CertificateEntity> findByWorkspaceId(UUID workspaceId);
}
