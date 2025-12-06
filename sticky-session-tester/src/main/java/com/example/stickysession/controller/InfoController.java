package com.example.stickysession.controller;

import com.example.stickysession.model.PodInfo;
import com.example.stickysession.model.SessionInfo;
import com.example.stickysession.service.KubernetesInfoService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class InfoController {

    private final KubernetesInfoService kubernetesInfoService;
    private static final String REQUEST_COUNT_KEY = "requestCount";

    public InfoController(KubernetesInfoService kubernetesInfoService) {
        this.kubernetesInfoService = kubernetesInfoService;
    }

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getInfo(HttpServletRequest request, HttpSession session) {
        incrementRequestCount(session);

        PodInfo podInfo = kubernetesInfoService.getPodInfo();
        SessionInfo sessionInfo = buildSessionInfo(request, session);

        Map<String, Object> response = new HashMap<>();
        response.put("podName", podInfo.getPodName());
        response.put("podIp", podInfo.getPodIp());
        response.put("podNamespace", podInfo.getPodNamespace());
        response.put("containerName", podInfo.getContainerName());
        response.put("serviceName", podInfo.getServiceName());
        response.put("sessionId", sessionInfo.getSessionId());
        response.put("creationTime", sessionInfo.getCreationTime());
        response.put("lastAccessedTime", sessionInfo.getLastAccessedTime());
        response.put("requestCount", sessionInfo.getRequestCount());
        response.put("stickyCookiePresent", sessionInfo.isCookiePresent());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/session")
    public ResponseEntity<SessionInfo> getSessionInfo(HttpServletRequest request, HttpSession session) {
        incrementRequestCount(session);
        return ResponseEntity.ok(buildSessionInfo(request, session));
    }

    @PostMapping("/session/reset")
    public ResponseEntity<Map<String, String>> resetSession(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("message", "Session reset successfully"));
    }

    private SessionInfo buildSessionInfo(HttpServletRequest request, HttpSession session) {
        boolean hasStickySessionCookie = hasStickyCookie(request);
        int requestCount = (Integer) session.getAttribute(REQUEST_COUNT_KEY);

        return new SessionInfo(
                session.getId(),
                Instant.ofEpochMilli(session.getCreationTime()),
                Instant.ofEpochMilli(session.getLastAccessedTime()),
                requestCount,
                hasStickySessionCookie
        );
    }

    private void incrementRequestCount(HttpSession session) {
        Integer count = (Integer) session.getAttribute(REQUEST_COUNT_KEY);
        if (count == null) {
            count = 0;
        }
        session.setAttribute(REQUEST_COUNT_KEY, count + 1);
    }

    private boolean hasStickyCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("sticky-cookie".equals(cookie.getName())) {
                    return true;
                }
            }
        }
        return false;
    }
}
