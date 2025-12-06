package com.example.stickysession.model;

import java.time.Instant;

public class SessionInfo {
    private String sessionId;
    private Instant creationTime;
    private Instant lastAccessedTime;
    private int requestCount;
    private boolean cookiePresent;

    public SessionInfo() {
    }

    public SessionInfo(String sessionId, Instant creationTime, Instant lastAccessedTime, int requestCount, boolean cookiePresent) {
        this.sessionId = sessionId;
        this.creationTime = creationTime;
        this.lastAccessedTime = lastAccessedTime;
        this.requestCount = requestCount;
        this.cookiePresent = cookiePresent;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public Instant getCreationTime() {
        return creationTime;
    }

    public void setCreationTime(Instant creationTime) {
        this.creationTime = creationTime;
    }

    public Instant getLastAccessedTime() {
        return lastAccessedTime;
    }

    public void setLastAccessedTime(Instant lastAccessedTime) {
        this.lastAccessedTime = lastAccessedTime;
    }

    public int getRequestCount() {
        return requestCount;
    }

    public void setRequestCount(int requestCount) {
        this.requestCount = requestCount;
    }

    public boolean isCookiePresent() {
        return cookiePresent;
    }

    public void setCookiePresent(boolean cookiePresent) {
        this.cookiePresent = cookiePresent;
    }
}
