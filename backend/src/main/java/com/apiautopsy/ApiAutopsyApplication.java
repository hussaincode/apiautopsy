package com.apiautopsy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class ApiAutopsyApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiAutopsyApplication.class, args);
    }
}
