package com.apiautopsy.requests;

import com.apiautopsy.certificates.CertificateRepository;
import com.apiautopsy.collections.CollectionRepository;
import com.apiautopsy.common.NotFoundException;
import com.apiautopsy.security.CryptoService;
import com.apiautopsy.workspaces.WorkspaceRepository;
import com.apiautopsy.workspaces.WorkspaceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;

@Service
public class ApiRequestService {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private final ApiRequestRepository requests;
    private final WorkspaceRepository workspaces;
    private final CollectionRepository collections;
    private final CertificateRepository certificates;
    private final WorkspaceService workspaceService;
    private final CryptoService crypto;

    public ApiRequestService(ApiRequestRepository requests, WorkspaceRepository workspaces, CollectionRepository collections, CertificateRepository certificates, WorkspaceService workspaceService, CryptoService crypto) {
        this.requests = requests;
        this.workspaces = workspaces;
        this.collections = collections;
        this.certificates = certificates;
        this.workspaceService = workspaceService;
        this.crypto = crypto;
    }

    public List<ApiRequestDtos.ApiRequestResponse> list(UUID userId, UUID workspaceId) {
        workspaceService.requireMember(workspaceId, userId);
        return requests.findByWorkspaceId(workspaceId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public ApiRequestDtos.ApiRequestResponse create(UUID userId, UUID workspaceId, ApiRequestDtos.UpsertRequest dto) {
        workspaceService.requireMember(workspaceId, userId);
        ApiRequest entity = new ApiRequest();
        entity.workspace = workspaces.findById(workspaceId).orElseThrow(() -> new NotFoundException("Workspace not found"));
        apply(entity, dto);
        requests.save(entity);
        return toResponse(entity);
    }

    @Transactional
    public ApiRequestDtos.ApiRequestResponse update(UUID userId, UUID workspaceId, UUID requestId, ApiRequestDtos.UpsertRequest dto) {
        workspaceService.requireMember(workspaceId, userId);
        ApiRequest entity = requests.findByIdAndWorkspaceId(requestId, workspaceId).orElseThrow(() -> new NotFoundException("API request not found"));
        apply(entity, dto);
        entity.updatedAt = Instant.now();
        return toResponse(entity);
    }

    private void apply(ApiRequest entity, ApiRequestDtos.UpsertRequest dto) {
        entity.name = dto.name();
        entity.method = dto.method();
        entity.url = dto.url();
        entity.headers = dto.headers() == null ? new LinkedHashMap<>() : dto.headers();
        entity.queryParams = dto.queryParams() == null ? new LinkedHashMap<>() : dto.queryParams();
        entity.bodyType = dto.bodyType() == null ? BodyType.NONE : dto.bodyType();
        entity.body = dto.body() == null ? new LinkedHashMap<>() : dto.body();
        entity.authType = dto.authType() == null ? AuthType.NONE : dto.authType();
        entity.authEncrypted = dto.auth() == null || entity.authType == AuthType.NONE ? null : crypto.encrypt(writeJson(dto.auth()));
        if (dto.collectionId() == null) {
            entity.collection = null;
        } else {
            var collection = collections.findById(dto.collectionId()).orElseThrow(() -> new NotFoundException("Collection not found"));
            if (!collection.workspace.id.equals(entity.workspace.id)) throw new NotFoundException("Collection not found");
            entity.collection = collection;
        }
        if (dto.certificateId() == null) {
            entity.certificate = null;
        } else {
            var certificate = certificates.findById(dto.certificateId()).orElseThrow(() -> new NotFoundException("Certificate not found"));
            if (!certificate.workspace.id.equals(entity.workspace.id)) throw new NotFoundException("Certificate not found");
            entity.certificate = certificate;
        }
    }

    private String writeJson(Object object) {
        try { return MAPPER.writeValueAsString(object); } catch (Exception e) { throw new IllegalArgumentException("Invalid auth JSON"); }
    }

    private ApiRequestDtos.ApiRequestResponse toResponse(ApiRequest r) {
        return new ApiRequestDtos.ApiRequestResponse(r.id, r.collection == null ? null : r.collection.id, r.name, r.method, r.url, r.headers, r.queryParams, r.bodyType, r.body, r.authType, r.certificate == null ? null : r.certificate.id);
    }
}
