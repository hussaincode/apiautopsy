package com.apiautopsy.executions;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public")
public class PublicExecutionController {
    private final ExecutionService service;

    public PublicExecutionController(ExecutionService service) {
        this.service = service;
    }

    @PostMapping("/execute")
    ExecutionDtos.ExecutionResponse execute(@Valid @RequestBody ExecutionDtos.PublicExecutionRequest request) {
        return service.executePublic(request);
    }
}
