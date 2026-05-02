package com.apiautopsy.executions;

import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;

@Component
public class SsrfGuard {
    public URI validateExternalHttpUrl(String rawUrl) {
        try {
            URI uri = URI.create(rawUrl);
            if (!"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme())) {
                throw new IllegalArgumentException("Only http and https URLs are allowed");
            }
            if (uri.getHost() == null) throw new IllegalArgumentException("URL host is required");
            for (InetAddress address : InetAddress.getAllByName(uri.getHost())) {
                if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress() || address.isSiteLocalAddress() || address.isMulticastAddress()) {
                    throw new IllegalArgumentException("Internal network targets are blocked");
                }
            }
            return uri;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("URL cannot be resolved safely");
        }
    }
}
