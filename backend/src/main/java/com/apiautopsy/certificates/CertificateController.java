package com.apiautopsy.certificates;

import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.security.CryptoService;
import com.apiautopsy.security.SecurityUtils;
import com.apiautopsy.workspaces.WorkspaceRepository;
import com.apiautopsy.workspaces.WorkspaceService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/certificates")
public class CertificateController {
    private final CertificateRepository certificates;
    private final WorkspaceRepository workspaces;
    private final WorkspaceService workspaceService;
    private final CryptoService crypto;

    public CertificateController(CertificateRepository certificates, WorkspaceRepository workspaces, WorkspaceService workspaceService, CryptoService crypto) {
        this.certificates = certificates;
        this.workspaces = workspaces;
        this.workspaceService = workspaceService;
        this.crypto = crypto;
    }

    @GetMapping
    List<CertificateDtos.CertificateResponse> list(@PathVariable UUID workspaceId) {
        workspaceService.requireMember(workspaceId, SecurityUtils.currentUser().id());
        return certificates.findByWorkspaceId(workspaceId).stream().map(c -> new CertificateDtos.CertificateResponse(c.id, c.name)).toList();
    }

    @PostMapping
    CertificateDtos.CertificateResponse create(@PathVariable UUID workspaceId, @Valid @RequestBody CertificateDtos.CertificateRequest request) {
        workspaceService.requireMember(workspaceId, SecurityUtils.currentUser().id());
        CertificateEntity cert = new CertificateEntity();
        cert.workspace = workspaces.findById(workspaceId).orElseThrow(() -> new NotFoundException("Workspace not found"));
        cert.name = request.name();
        cert.certificatePemEncrypted = crypto.encrypt(request.certificatePem());
        cert.privateKeyPemEncrypted = crypto.encrypt(request.privateKeyPem());
        certificates.save(cert);
        return new CertificateDtos.CertificateResponse(cert.id, cert.name);
    }
}
