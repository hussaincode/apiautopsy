package com.apiautopsy.certificates;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public class CertificateDtos {
    public record CertificateRequest(@NotBlank String name, @NotBlank String certificatePem, String privateKeyPem) {}
    public record CertificateResponse(UUID id, String name) {}
}
