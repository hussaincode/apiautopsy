package com.apiautopsy.monitoring;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/status")
public class PublicStatusController {
    private final PublicStatusService service;

    public PublicStatusController(PublicStatusService service) {
        this.service = service;
    }

    @GetMapping("/{slug}")
    MonitoringDtos.PublicStatusResponse get(@PathVariable String slug) {
        return service.get(slug);
    }
}
