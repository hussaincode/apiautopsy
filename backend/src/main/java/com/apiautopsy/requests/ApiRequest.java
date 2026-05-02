package com.apiautopsy.requests;

import com.apiautopsy.certificates.CertificateEntity;
import com.apiautopsy.collections.Collection;
import com.apiautopsy.common.JsonbConverter;
import com.apiautopsy.workspaces.Workspace;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnTransformer;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "api_requests")
public class ApiRequest {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @ManyToOne(optional = false) @JoinColumn(name = "workspace_id")
    public Workspace workspace;
    @ManyToOne @JoinColumn(name = "collection_id")
    public Collection collection;
    @Column(nullable = false)
    public String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    public HttpMethodType method;
    @Column(nullable = false)
    public String url;
    @Convert(converter = JsonbConverter.class) @Column(columnDefinition = "jsonb") @ColumnTransformer(write = "?::jsonb")
    public Map<String, Object> headers = new LinkedHashMap<>();
    @Convert(converter = JsonbConverter.class) @Column(columnDefinition = "jsonb") @ColumnTransformer(write = "?::jsonb")
    public Map<String, Object> queryParams = new LinkedHashMap<>();
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    public BodyType bodyType = BodyType.NONE;
    @Convert(converter = JsonbConverter.class) @Column(columnDefinition = "jsonb") @ColumnTransformer(write = "?::jsonb")
    public Map<String, Object> body = new LinkedHashMap<>();
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    public AuthType authType = AuthType.NONE;
    public String authEncrypted;
    @ManyToOne @JoinColumn(name = "certificate_id")
    public CertificateEntity certificate;
    public Instant createdAt = Instant.now();
    public Instant updatedAt = Instant.now();
}
