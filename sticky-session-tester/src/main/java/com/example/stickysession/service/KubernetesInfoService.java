package com.example.stickysession.service;

import com.example.stickysession.model.PodInfo;
import org.springframework.stereotype.Service;

@Service
public class KubernetesInfoService {

    public PodInfo getPodInfo() {
        return new PodInfo(
                getEnvOrDefault("POD_NAME", "unknown-pod"),
                getEnvOrDefault("POD_IP", "unknown-ip"),
                getEnvOrDefault("POD_NAMESPACE", "default"),
                getEnvOrDefault("CONTAINER_NAME", "sticky-session-tester"),
                getEnvOrDefault("SERVICE_NAME", "sticky-session-tester")
        );
    }

    private String getEnvOrDefault(String key, String defaultValue) {
        String value = System.getenv(key);
        return (value != null && !value.isEmpty()) ? value : defaultValue;
    }
}
