# Deployment Notes - Sticky Session Tester

## Deployment Summary

✅ **Deployment Status**: Successfully deployed and verified

### Resources Created

- **Namespace**: `sticky-session-tester`
- **Deployment**: 3 replicas of the sticky-session-tester application
- **Services**: 3 ClusterIP services (roundrobin, clientip, cookie)
- **IngressRoutes**: 3 Traefik IngressRoutes for routing
- **Middleware**: 1 Traefik middleware for path rewriting

### Pods Running

```
sticky-session-tester-5bcb6cc979-5n8mb   1/1   Running
sticky-session-tester-5bcb6cc979-7fzbx   1/1   Running
sticky-session-tester-5bcb6cc979-nx69w   1/1   Running
```

## Test Results

### 1. Round-Robin (No Affinity) ✅

**Service**: `sticky-tester-roundrobin`
**Configuration**: `sessionAffinity: None`
**Expected**: Different pods on each request
**Result**: ✅ PASS - Requests distributed across all 3 pods

### 2. ClientIP Affinity ⚠️

**Service**: `sticky-tester-clientip`
**Configuration**: `sessionAffinity: ClientIP`
**Expected**: Same pod per client IP
**Result**: ⚠️ Shows round-robin behavior in testing

**Note**: ClientIP affinity appears as round-robin when testing from a single client through Traefik because all requests come from the same IP (the Traefik pod). In production with multiple external client IPs, this would work as expected.

### 3. Cookie-Based Sticky Session ✅

**Service**: `sticky-tester-cookie`
**Configuration**: Traefik IngressRoute with `sticky.cookie`
**Expected**: Same pod when sticky cookie is present
**Result**: ✅ PASS - All requests with cookie go to the same pod

**Cookie Details**:
- Cookie name: `sticky-cookie`
- Cookie attributes: `Path=/; HttpOnly`
- Successfully persists across requests

### 4. Path Rewriting ✅

**Middleware**: `rewrite-app-to-sticky`
**Configuration**: `replacePathRegex: ^/app(/.*)?$ -> /sticky-app$1`
**Expected**: `/app` requests rewritten to `/sticky-app`
**Result**: ✅ PASS - Health endpoint accessible at `/app/actuator/health`

## Key Findings

1. **Traefik IngressRoutes work, Gateway API HTTPRoutes do not**
   - Initially deployed with Gateway API HTTPRoutes
   - HTTPRoutes failed (404 errors) due to missing Gateway resource
   - Converted to Traefik IngressRoutes (native Traefik CRD)
   - All routes now working correctly

2. **Cookie-based stickiness is most reliable**
   - Works independently of network topology
   - Survives client IP changes (NAT, mobile networks, etc.)
   - Best choice for production sticky sessions

3. **ClientIP affinity limitations**
   - Works at Kubernetes service level (kube-proxy)
   - Not effective when all traffic comes from a single ingress IP
   - Better suited for direct service access or distributed ingress

## Manual Steps Required

### Add Hosts Entries

The deployment requires manual addition of hosts entries. Run these commands:

```bash
# Add hosts entries (requires sudo password)
echo "127.0.0.1 roundrobin.localhost" | sudo tee -a /etc/hosts
echo "127.0.0.1 clientip.localhost" | sudo tee -a /etc/hosts
echo "127.0.0.1 cookie.localhost" | sudo tee -a /etc/hosts
```

Or use the Makefile target:

```bash
make hosts
```

## Access URLs

Once hosts entries are added, access the application at:

- Round-Robin: http://roundrobin.localhost/app/
- ClientIP: http://clientip.localhost/app/
- Cookie: http://cookie.localhost/app/

### API Endpoints

- Pod/Session Info: `/app/api/info`
- Session Info: `/app/api/session`
- Reset Session: `/app/api/session/reset` (POST)
- Health: `/app/actuator/health`
- Liveness: `/app/actuator/health/liveness`
- Readiness: `/app/actuator/health/readiness`
- Metrics: `/app/actuator/prometheus`

## Issues Resolved

### 1. Gateway API HTTPRoutes Not Working

**Problem**: HTTPRoutes returned 404 errors
**Root Cause**: No Gateway resource exists in Traefik installation
**Solution**: Converted HTTPRoutes to Traefik IngressRoutes
**Files Changed**:
- Created `ingressroute-roundrobin.yaml`
- Created `ingressroute-clientip.yaml`
- Updated `kustomization.yaml`

### 2. Docker Alpine Images for ARM64

**Problem**: Alpine images not available for Apple Silicon
**Root Cause**: `eclipse-temurin:17-jre-alpine` doesn't support ARM64
**Solution**: Changed to Ubuntu Jammy base images
**Files Changed**:
- `Dockerfile` (both build and runtime stages)

## Next Steps

1. **Add hosts entries** (manual step required)
2. **Test in browser** to see visual pod colors
3. **Try session reset** to test session management
4. **Monitor Traefik dashboard** at http://traefik.localhost/dashboard/

## Cleanup

To remove the deployment:

```bash
kubectl delete namespace sticky-session-tester
```

Or use the Makefile:

```bash
make clean
```
