package com.apiautopsy.certificates;

import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.security.CryptoService;
import com.apiautopsy.security.SecurityUtils;
import com.apiautopsy.workspaces.WorkspaceRepository;
import com.apiautopsy.workspaces.WorkspaceService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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
        return createCertificate(workspaceId, request.name(), request.certificatePem(), request.privateKeyPem());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    CertificateDtos.CertificateResponse createMultipart(
            @PathVariable UUID workspaceId,
            @RequestParam String name,
            @RequestPart("certificate") MultipartFile certificate,
            @RequestPart(value = "privateKey", required = false) MultipartFile privateKey
    ) throws IOException {
        workspaceService.requireMember(workspaceId, SecurityUtils.currentUser().id());
        String certificatePem = new String(certificate.getBytes());
        String privateKeyPem = privateKey == null || privateKey.isEmpty() ? null : new String(privateKey.getBytes());
        return createCertificate(workspaceId, name, certificatePem, privateKeyPem);
    }

    private CertificateDtos.CertificateResponse createCertificate(UUID workspaceId, String name, String certificatePem, String privateKeyPem) {
        CertificateEntity cert = new CertificateEntity();
        cert.workspace = workspaces.findById(workspaceId).orElseThrow(() -> new NotFoundException("Workspace not found"));
        cert.name = name;
        cert.certificatePemEncrypted = crypto.encrypt(certificatePem);
        cert.privateKeyPemEncrypted = crypto.encrypt(privateKeyPem);
        certificates.save(cert);
        return new CertificateDtos.CertificateResponse(cert.id, cert.name);
    }
}
