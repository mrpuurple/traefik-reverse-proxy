# Sticky Session Tester - Implementation Plan

## Project Overview

Spring Boot application to test **three levels of session affinity** with path rewrites and visual indicators:
1. **No Affinity**: Pure round-robin load balancing (Kubernetes default)
2. **ClientIP Affinity**: Kubernetes service-level session affinity based on source IP
3. **Cookie Affinity**: Traefik application-level sticky sessions based on HTTP cookies

The application runs with a **custom web context path** (`/sticky-app`) to properly test path rewrite rules.

## Status Tracking

- [ ] 1. Create Spring Boot project structure and dependencies
- [ ] 2. Implement web controller with pod/service info endpoint
- [ ] 3. Create HTML/CSS landing page with Kubernetes info display
- [ ] 4. Add session tracking and sticky session testing features
- [ ] 5. Configure Spring Boot Actuator for health/metrics
- [ ] 6. Create Dockerfile with multi-stage build
- [ ] 7. Create Kubernetes deployment with multiple replicas
- [ ] 8. Create Kubernetes ClusterIP service
- [ ] 9. Create Traefik HTTPRoute with sticky sessions and path rewrite
- [ ] 10. Create README with deployment instructions
- [ ] 11. Build and test application locally
- [ ] 12. Deploy to Kubernetes and verify
- [ ] 13. Test sticky sessions with/without cookie
- [ ] 14. Verify path rewrite functionality

---

## 1. Project Structure

```
sticky-session-tester/
├── IMPLEMENTATION_PLAN.md          # This file
├── README.md                       # User documentation
├── Makefile                        # Build/deploy automation
├── pom.xml                         # Maven dependencies
├── mvnw                            # Maven wrapper (Unix)
├── mvnw.cmd                        # Maven wrapper (Windows)
├── .mvn/                           # Maven wrapper config
│   └── wrapper/
│       ├── maven-wrapper.jar
│       └── maven-wrapper.properties
├── Dockerfile                      # Container image build
├── .dockerignore                   # Docker build exclusions
├── src/
│   └── main/
│       ├── java/com/example/stickysession/
│       │   ├── StickySessionApplication.java
│       │   ├── config/
│       │   │   ├── WebConfig.java              # CORS configuration
│       │   │   └── ActuatorConfig.java         # Health probes config
│       │   ├── controller/
│       │   │   ├── InfoController.java
│       │   │   └── GlobalExceptionHandler.java # Exception handling
│       │   ├── model/
│       │   │   ├── PodInfo.java
│       │   │   └── SessionInfo.java
│       │   └── service/
│       │       └── KubernetesInfoService.java
│       └── resources/
│           ├── application.yml
│           └── static/
│               ├── index.html
│               ├── css/
│               │   └── style.css
│               └── js/
│                   └── app.js
└── kubernetes/
    ├── kustomization.yaml           # Kustomize deployment
    ├── namespace.yaml               # Namespace resource
    ├── middleware.yaml              # Traefik path rewrite middleware
    ├── deployment.yaml
    ├── service-roundrobin.yaml      # No affinity (default)
    ├── service-clientip.yaml        # ClientIP affinity
    ├── service-cookie.yaml          # For cookie affinity
    ├── httproute-roundrobin.yaml    # Routes to roundrobin service
    ├── httproute-clientip.yaml      # Routes to clientip service
    └── httproute-cookie.yaml        # Routes with Traefik sticky sessions
```

---

## 2. Dependencies (pom.xml)

```xml
<dependencies>
    <!-- Spring Boot Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Spring Boot Actuator -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>

    <!-- Prometheus Metrics -->
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-registry-prometheus</artifactId>
    </dependency>

    <!-- NOTE: Spring Session NOT needed for this demo -->
    <!-- Traefik handles sticky sessions via cookies -->
    <!-- Spring Boot's default session management is sufficient -->
</dependencies>
```

**Java Version**: 17+

**Spring Boot Version**: 3.2.x

**Base Images**:

- Build stage: `eclipse-temurin:17-jdk-alpine`
- Runtime stage: `eclipse-temurin:17-jre-alpine`

---

## 3. Application Configuration

### application.yml

```yaml
server:
  port: 8080
  servlet:
    context-path: /sticky-app  # Custom web context for testing path rewrites
    session:
      cookie:
        name: JSESSIONID  # Standard Spring session cookie (not for sticky routing)
        http-only: true
        secure: false
        max-age: 3600

spring:
  application:
    name: sticky-session-tester

management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
  endpoint:
    health:
      probes:
        enabled: true  # Enable liveness/readiness probes
  health:
    livenessState:
      enabled: true
    readinessState:
      enabled: true
  server:
    base-path: /sticky-app  # Actuator under same context
  metrics:
    export:
      prometheus:
        enabled: true
```

**Important**: With `context-path: /sticky-app`, all endpoints are prefixed:

- Landing page: `/sticky-app/`
- API: `/sticky-app/api/info`
- Health: `/sticky-app/actuator/health`
- Liveness: `/sticky-app/actuator/health/liveness`
- Readiness: `/sticky-app/actuator/health/readiness`
- Static resources: `/sticky-app/css/style.css`

**Session Cookie Note**: Spring Boot's `JSESSIONID` is for internal session tracking only. Traefik's sticky session uses a separate cookie (configured in HTTPRoute/Middleware).

---

## 4. Key Features Implementation

### 4.1 Information Display

**Pod Information (from Kubernetes downward API)**:
- Pod Name: `HOSTNAME` environment variable
- Pod IP: `POD_IP` environment variable
- Container Name: `CONTAINER_NAME` environment variable
- Service Name: `SERVICE_NAME` environment variable
- Namespace: `POD_NAMESPACE` environment variable

**Session Information**:
- Session ID
- Creation time
- Last accessed time
- Request count per session
- Cookie presence indicator

### 4.2 API Endpoints

**All endpoints are under `/sticky-app` context path:**

```
GET /sticky-app/                           - Landing page (HTML)
GET /sticky-app/api/info                   - Pod/Service info (JSON)
GET /sticky-app/api/session                - Session details (JSON)
POST /sticky-app/api/session/reset         - Clear session
GET /sticky-app/actuator/health            - Health check
GET /sticky-app/actuator/metrics           - All metrics
GET /sticky-app/actuator/prometheus        - Prometheus scrape
```

### 4.3 Visual Design

**Color Coding by Pod**:
- Each pod gets assigned one of **three distinct background colors**:
  - **Pod 1**: Red background (`#ffcccc` or `#ff6b6b`)
  - **Pod 2**: Green background (`#ccffcc` or `#51cf66`)
  - **Pod 3**: Blue background (`#cce5ff` or `#4dabf7`)
- Color is assigned based on pod name (last character of hostname)
- Makes it **immediately obvious** which pod you're hitting from browser
- Full-page background color for maximum visibility

**Layout**:
- Centered card-based design
- Large pod name display at top
- Information grid for pod/service details
- Session information panel
- Auto-refresh toggle button
- Manual refresh button

**CSS Features**:
- Full viewport background color per pod (red/green/blue)
- High contrast white/light card overlays for readability
- Responsive design (mobile-friendly)
- Large, bold pod name display
- Modern, clean aesthetic with clear visual separation

**Color Assignment Logic** (Improved Hash-Based):

```javascript
// Hash-based distribution for better color spread across pods
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return hash;
}

const podIndex = Math.abs(hashCode(podName)) % 3;
const colors = ['#ff6b6b', '#51cf66', '#4dabf7']; // Red, Green, Blue
document.body.style.backgroundColor = colors[podIndex];
```

**Why This Approach**:

- Uses full pod name hash instead of just last character
- More reliable distribution across 3 colors
- Consistent color for same pod name across refreshes

**Visual Example**:
```
Pod: sticky-session-tester-6f8b9d-abc → RED background
Pod: sticky-session-tester-6f8b9d-def → GREEN background
Pod: sticky-session-tester-6f8b9d-ghi → BLUE background
```

**Why This Works**:
- Instantly see which pod you're connected to
- No need to read pod names carefully
- Color changes are impossible to miss during round-robin testing
- Makes sticky session behavior immediately obvious

---

## 5. Kubernetes Resources

### 5.1 Deployment Configuration

**Key Settings**:

- **Replicas**: 3 (exactly 3 for red/green/blue color scheme)
- **Image Pull Policy**: IfNotPresent (for local development)
- **Resources** (increased for Spring Boot):
  - Requests: 256Mi memory, 100m CPU
  - Limits: 512Mi memory, 500m CPU
- **Probes**:
  - Startup: `/sticky-app/actuator/health` (30 failures, 10s period = 5min max startup)
  - Liveness: `/sticky-app/actuator/health/liveness`
  - Readiness: `/sticky-app/actuator/health/readiness`

**Environment Variables** (via downward API):
```yaml
env:
- name: POD_NAME
  valueFrom:
    fieldRef:
      fieldPath: metadata.name
- name: POD_IP
  valueFrom:
    fieldRef:
      fieldPath: status.podIP
- name: POD_NAMESPACE
  valueFrom:
    fieldRef:
      fieldPath: metadata.namespace
- name: CONTAINER_NAME
  value: "sticky-session-tester"
- name: SERVICE_NAME
  value: "sticky-session-tester"
```

### 5.2 Service Configurations

We create **THREE separate services** to test different session affinity modes:

#### **Service 1: Round-Robin (No Affinity)**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: sticky-tester-roundrobin
spec:
  type: ClusterIP
  sessionAffinity: None  # Default - pure round-robin
  selector:
    app: sticky-session-tester
  ports:
  - port: 80
    targetPort: 8080
```

#### **Service 2: ClientIP Affinity**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: sticky-tester-clientip
spec:
  type: ClusterIP
  sessionAffinity: ClientIP  # IP-based session affinity
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600  # 1 hour timeout
  selector:
    app: sticky-session-tester
  ports:
  - port: 80
    targetPort: 8080
```

#### **Service 3: For Cookie Affinity**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: sticky-tester-cookie
spec:
  type: ClusterIP
  sessionAffinity: None  # Let Traefik handle cookie affinity
  selector:
    app: sticky-session-tester
  ports:
  - port: 80
    targetPort: 8080
```

### 5.3 Traefik Middleware for Path Rewriting

**IMPORTANT**: Gateway API's `URLRewrite` filter may not work reliably with all Traefik versions. Use Traefik's native Middleware instead.

#### **Middleware Resource** (kubernetes/middleware.yaml)

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: strip-app-prefix
  namespace: sticky-session-tester
spec:
  stripPrefix:
    prefixes:
      - /app
```

This middleware strips the `/app` prefix, allowing requests to reach Spring Boot's `/sticky-app` context path.

### 5.4 Traefik HTTPRoute Configurations

We create **THREE HTTPRoutes** for testing different scenarios. All use the same path rewrite middleware:

#### **HTTPRoute 1: Round-Robin (Scenario 1)**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: sticky-tester-roundrobin
  namespace: sticky-session-tester
spec:
  parentRefs:
  - name: traefik-gateway
    namespace: traefik
  hostnames:
  - "roundrobin.localhost"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /app
    filters:
    - type: ExtensionRef
      extensionRef:
        group: traefik.io
        kind: Middleware
        name: strip-app-prefix
    backendRefs:
    - name: sticky-tester-roundrobin
      port: 80
```

**Test URL**: `http://roundrobin.localhost/app/`

**Expected**: Different pod on each refresh (round-robin)

#### **HTTPRoute 2: ClientIP Affinity (Scenario 2)**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: sticky-tester-clientip
  namespace: sticky-session-tester
spec:
  parentRefs:
  - name: traefik-gateway
    namespace: traefik
  hostnames:
  - "clientip.localhost"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /app
    filters:
    - type: ExtensionRef
      extensionRef:
        group: traefik.io
        kind: Middleware
        name: strip-app-prefix
    backendRefs:
    - name: sticky-tester-clientip
      port: 80
```

**Test URL**: `http://clientip.localhost/app/`

**Expected**: Same pod on each refresh (IP-based affinity via K8s service)

#### **HTTPRoute 3: Cookie Affinity (Scenario 3)**

##### Option A: Using Traefik Middleware (Recommended)

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: sticky-cookie
  namespace: sticky-session-tester
spec:
  plugin:
    stickyCookie:
      name: sticky-cookie
      secure: false
      httpOnly: true
      sameSite: lax
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: sticky-tester-cookie
  namespace: sticky-session-tester
spec:
  parentRefs:
  - name: traefik-gateway
    namespace: traefik
  hostnames:
  - "cookie.localhost"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /app
    filters:
    - type: ExtensionRef
      extensionRef:
        group: traefik.io
        kind: Middleware
        name: strip-app-prefix
    - type: ExtensionRef
      extensionRef:
        group: traefik.io
        kind: Middleware
        name: sticky-cookie
    backendRefs:
    - name: sticky-tester-cookie
      port: 80
```

##### Option B: Using IngressRoute (Alternative - more stable)

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: sticky-tester-cookie
  namespace: sticky-session-tester
spec:
  entryPoints:
    - web
  routes:
  - match: Host(`cookie.localhost`) && PathPrefix(`/app`)
    kind: Rule
    middlewares:
    - name: strip-app-prefix
    services:
    - name: sticky-tester-cookie
      port: 80
      sticky:
        cookie:
          name: sticky-cookie
          httpOnly: true
          secure: false
```

**Test URL**: `http://cookie.localhost/app/`

**Expected**: Same pod on each refresh (cookie-based affinity via Traefik)

### Path Rewrite Summary

All three routes rewrite paths using Traefik Middleware:

- **External**: `/app/` → **Middleware strips `/app`** → **Internal**: `/sticky-app/` (via Spring context path)
- **External**: `/app/api/info` → **Internal**: `/sticky-app/api/info`
- **External**: `/app/actuator/health` → **Internal**: `/sticky-app/actuator/health`

**How it works**:

1. Request comes to Traefik: `http://roundrobin.localhost/app/api/info`
2. Middleware strips `/app` prefix: `/api/info`
3. Traefik forwards to Spring Boot service
4. Spring Boot context path `/sticky-app` expects: `/sticky-app/api/info`
5. **Problem**: We have `/api/info` but need `/sticky-app/api/info`

**CORRECTION NEEDED**: The middleware should rewrite, not strip. Let me fix this:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rewrite-app-to-sticky
  namespace: sticky-session-tester
spec:
  replacePathRegex:
    regex: "^/app(/.*)?$"
    replacement: "/sticky-app$1"
```

This replaces `/app` with `/sticky-app` while preserving the rest of the path.

---

## 6. Dockerfile Strategy

**Multi-stage build**:

1. **Build stage**: Use Maven to compile and package
2. **Runtime stage**: Minimal JRE image with only JAR

**Dockerfile Template**:

```dockerfile
# Build stage
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
# Download dependencies (cached layer)
RUN ./mvnw dependency:go-offline
# Copy source and build
COPY src src
RUN ./mvnw package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
# Create non-root user
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring
# Copy JAR from build stage
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Optimization**:

- Layer caching for dependencies (speeds up rebuilds)
- Alpine-based images for smaller size (~150MB total)
- Non-root user for security
- Health check compatible with Kubernetes probes

**.dockerignore**:

```text
target/
.git/
.idea/
*.iml
.DS_Store
```

---

## 7. Testing Scenarios

### 7.1 Scenario 1: Round-Robin Load Balancing (No Affinity)

**URL**: `http://roundrobin.localhost/app/`
**Service**: `sticky-tester-roundrobin` (sessionAffinity: None)
**Expected Behavior**: Kubernetes round-robin load balancing

**Test Steps**:
1. Open browser to `http://roundrobin.localhost/app/`
2. Refresh page 10-20 times rapidly
3. **Expected**: **Background color changes** between red/green/blue on each refresh
4. **Verify**: No sticky behavior - requests distributed across all 3 pods
5. Check browser DevTools → Cookies: No `sticky-cookie` present
6. Monitor with: `kubectl logs -l app=sticky-session-tester -f --tail=1`

**Success Criteria**:
- ✅ See all 3 background colors (red/green/blue) over multiple refreshes
- ✅ Color/pod changes are frequent and unpredictable
- ✅ Pod name displayed matches the background color
- ✅ Session ID may change with each pod switch
- ✅ Request counter resets when switching pods

---

### 7.2 Scenario 2: ClientIP Session Affinity

**URL**: `http://clientip.localhost/app/`
**Service**: `sticky-tester-clientip` (sessionAffinity: ClientIP)
**Expected Behavior**: IP-based sticky sessions at Kubernetes service level

**Test Steps**:
1. Open browser to `http://clientip.localhost/app/`
2. Note the **background color** (red, green, or blue)
3. Refresh page 10-20 times
4. **Expected**: **Same background color consistently** - no color changes
5. **Verify**: Sticky behavior without cookies (IP-based)
6. Check browser DevTools → Cookies: No `sticky-cookie` present (Traefik not involved)
7. Note the pod name, then test from different source:
   ```bash
   # From another machine or use curl
   curl http://clientip.localhost/app/api/info
   ```
8. May hit different pod/color (different source IP)

**Success Criteria**:
- ✅ **Same background color** (and pod) for all requests from same source IP
- ✅ Session ID persists across refreshes
- ✅ Request counter increments consistently
- ✅ No cookie needed - affinity based on IP
- ✅ Different source IPs may hit different pods/colors

**Testing Timeout**:
```bash
# Wait 3600 seconds (1 hour) or restart browser
# New session should eventually time out and allow re-balancing
```

---

### 7.3 Scenario 3: Cookie-Based Sticky Sessions (Traefik)

**URL**: `http://cookie.localhost/app/`
**Service**: `sticky-tester-cookie` (sessionAffinity: None)
**Expected Behavior**: Cookie-based sticky sessions at Traefik level

**Test Steps**:
1. Open browser to `http://cookie.localhost/app/`
2. Note the **background color** (red, green, or blue)
3. Check browser DevTools → Application → Cookies
4. **Expected**: See `sticky-cookie` cookie set by Traefik
5. Refresh page 10-20 times
6. **Expected**: **Same background color consistently** - no color changes
7. **Verify**: Cookie value matches pod assignment
8. Delete `sticky-cookie` from browser
9. Refresh page
10. **Expected**: May hit different pod/color, new cookie set

**Success Criteria**:
- ✅ `sticky-cookie` appears in browser immediately
- ✅ **Same background color** (and pod) for all requests while cookie present
- ✅ Session ID persists across refreshes
- ✅ Request counter increments consistently
- ✅ Deleting cookie allows re-balancing to different pod/color
- ✅ New cookie set after deletion

**Advanced Test - Multiple Browsers**:
```bash
# Browser 1: Opens and gets Red background (Pod 1) + Cookie 1
# Browser 2: Opens and gets Green background (Pod 2) + Cookie 2
# Browser 3: Opens and gets Blue background (Pod 3) + Cookie 3
# Each browser consistently maintains its color
```

---

### 7.4 Path Rewrite Verification

**All three hostnames** should properly rewrite paths:

**Test Matrix**:
| External URL | Internal URL | Expected Result |
|--------------|--------------|-----------------|
| `http://*.localhost/app/` | `/sticky-app/` | Landing page |
| `http://*.localhost/app/api/info` | `/sticky-app/api/info` | JSON response |
| `http://*.localhost/app/actuator/health` | `/sticky-app/actuator/health` | Health JSON |
| `http://*.localhost/app/css/style.css` | `/sticky-app/css/style.css` | CSS file |

**Test Commands**:

```bash
# Test all three routes
for host in roundrobin clientip cookie; do
  echo "Testing $host.localhost..."
  curl -s http://$host.localhost/app/api/info | jq .podName
done

# Test cookie persistence (for cookie.localhost)
echo "Testing cookie persistence..."
curl -c cookies.txt -s http://cookie.localhost/app/api/info | jq .podName
echo "Second request with cookie:"
curl -b cookies.txt -s http://cookie.localhost/app/api/info | jq .podName
echo "Third request with cookie:"
curl -b cookies.txt -s http://cookie.localhost/app/api/info | jq .podName

# Verify sticky cookie is set
echo "Cookie contents:"
cat cookies.txt | grep sticky-cookie
```

---

### 7.5 Pod Failover Testing

**Test with each scenario**:

1. **Identify active pod**: Note which pod is serving requests
2. **Kill the pod**:
   ```bash
   kubectl delete pod <pod-name>
   ```
3. **Refresh browser immediately**
4. **Observe behavior**:
   - **Round-robin**: Hits one of remaining 2 pods
   - **ClientIP**: Waits for new pod, then sticks to it
   - **Cookie**: If cookie had dead pod, gets new pod & new cookie

**Success Criteria**:
- ✅ Application remains available during pod deletion
- ✅ New pod is automatically selected
- ✅ Readiness probes prevent traffic to starting pods
- ✅ Session data may be lost (expected for stateless app)

---

### 7.6 Comparison Test

**Side-by-side comparison**:
1. Open 3 browser windows side-by-side:
   - Window 1: `http://roundrobin.localhost/app/`
   - Window 2: `http://clientip.localhost/app/`
   - Window 3: `http://cookie.localhost/app/`

2. Refresh all three windows simultaneously (Ctrl+R)

3. **Observe background colors**:
   - **Window 1**: Background color changes each time (red→green→blue→red...)
   - **Window 2**: Background color stays consistent (e.g., always green)
   - **Window 3**: Background color stays consistent (e.g., always blue)

4. **Clear cookies** in Window 3, refresh again

5. **Observe**:
   - **Window 3**: Background may change to different color (new pod assignment)

---

## 8. Deployment Workflow

### 8.1 Makefile for Automation

Create a `Makefile` in the project root:

**Note**: Makefiles require hard tabs (not spaces) for recipe indentation. The code block below uses tabs.

```makefile
.PHONY: build deploy test clean help

# Docker image name
IMAGE_NAME := sticky-session-tester
IMAGE_TAG := latest

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*##"; printf ""} /^[a-zA-Z_-]+:.*?##/ { printf "  %-15s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

build: ## Build Maven artifact and Docker image
	./mvnw clean package
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .

deploy: ## Deploy to Kubernetes using Kustomize
	kubectl apply -k kubernetes/

deploy-manual: ## Deploy to Kubernetes manually (without Kustomize)
	kubectl apply -f kubernetes/namespace.yaml
	kubectl apply -f kubernetes/middleware.yaml
	kubectl apply -f kubernetes/deployment.yaml
	kubectl apply -f kubernetes/service-roundrobin.yaml
	kubectl apply -f kubernetes/service-clientip.yaml
	kubectl apply -f kubernetes/service-cookie.yaml
	kubectl apply -f kubernetes/httproute-roundrobin.yaml
	kubectl apply -f kubernetes/httproute-clientip.yaml
	kubectl apply -f kubernetes/httproute-cookie.yaml

hosts: ## Add /etc/hosts entries
	@echo "Adding hosts entries (requires sudo)..."
	@grep -q "roundrobin.localhost" /etc/hosts || echo "127.0.0.1 roundrobin.localhost" | sudo tee -a /etc/hosts
	@grep -q "clientip.localhost" /etc/hosts || echo "127.0.0.1 clientip.localhost" | sudo tee -a /etc/hosts
	@grep -q "cookie.localhost" /etc/hosts || echo "127.0.0.1 cookie.localhost" | sudo tee -a /etc/hosts

test: ## Run tests against deployed application
	@echo "Testing Round-Robin..."
	@for i in 1 2 3 4 5; do curl -s http://roundrobin.localhost/app/api/info | jq -r .podName; done
	@echo "\nTesting ClientIP Affinity..."
	@for i in 1 2 3 4 5; do curl -s http://clientip.localhost/app/api/info | jq -r .podName; done
	@echo "\nTesting Cookie Affinity..."
	@curl -c /tmp/cookies.txt -s http://cookie.localhost/app/api/info | jq -r .podName
	@for i in 2 3 4 5; do curl -b /tmp/cookies.txt -s http://cookie.localhost/app/api/info | jq -r .podName; done

status: ## Check deployment status
	@echo "Pods:"
	@kubectl get pods -n sticky-session-tester
	@echo "\nServices:"
	@kubectl get svc -n sticky-session-tester
	@echo "\nHTTPRoutes:"
	@kubectl get httproute -n sticky-session-tester
	@echo "\nMiddleware:"
	@kubectl get middleware -n sticky-session-tester

logs: ## Tail logs from all pods
	kubectl logs -n sticky-session-tester -l app=sticky-session-tester --tail=50 -f

clean: ## Delete Kubernetes resources
	kubectl delete namespace sticky-session-tester

rebuild: clean build deploy ## Clean, rebuild, and redeploy

all: build deploy hosts test ## Build, deploy, configure hosts, and test
```

### 8.2 Local Development

```bash
# Build application
./mvnw clean package

# Run locally
./mvnw spring-boot:run

# Test locally (note: context path is /sticky-app)
curl http://localhost:8080/sticky-app/api/info
open http://localhost:8080/sticky-app/
```

### 8.3 Docker Build

```bash
# Build image
docker build -t sticky-session-tester:latest .

# Test container locally
docker run -p 8080:8080 \
  -e POD_NAME=local-pod \
  -e POD_IP=127.0.0.1 \
  -e POD_NAMESPACE=default \
  -e CONTAINER_NAME=sticky-session-tester \
  -e SERVICE_NAME=local-service \
  sticky-session-tester:latest

# Verify (note: context path is /sticky-app)
curl http://localhost:8080/sticky-app/api/info
```

### 8.4 Kubernetes Deployment (Using Makefile)

```bash
# Verify context
kubectl config current-context  # Should be: docker-desktop

# Complete setup (build, deploy, configure hosts, test)
make all

# Or step by step:
make build     # Build Docker image
make deploy    # Deploy to Kubernetes
make hosts     # Add /etc/hosts entries
make test      # Run tests
make status    # Check status

# View logs
make logs
```

### 8.5 Kubernetes Deployment (Manual)

```bash
# Verify context
kubectl config current-context  # Should be: docker-desktop

# Create namespace
kubectl apply -f kubernetes/namespace.yaml

# Deploy middleware for path rewriting
kubectl apply -f kubernetes/middleware.yaml

# Deploy application
kubectl apply -f kubernetes/deployment.yaml

# Deploy all three services
kubectl apply -f kubernetes/service-roundrobin.yaml
kubectl apply -f kubernetes/service-clientip.yaml
kubectl apply -f kubernetes/service-cookie.yaml

# Deploy all three HTTPRoutes
kubectl apply -f kubernetes/httproute-roundrobin.yaml
kubectl apply -f kubernetes/httproute-clientip.yaml
kubectl apply -f kubernetes/httproute-cookie.yaml

# Add hosts entries
echo "127.0.0.1 roundrobin.localhost" | sudo tee -a /etc/hosts
echo "127.0.0.1 clientip.localhost" | sudo tee -a /etc/hosts
echo "127.0.0.1 cookie.localhost" | sudo tee -a /etc/hosts

# Verify deployment
kubectl get pods -n sticky-session-tester
kubectl get svc -n sticky-session-tester
kubectl get httproute -n sticky-session-tester
kubectl get middleware -n sticky-session-tester

# Check pod logs
kubectl logs -n sticky-session-tester -l app=sticky-session-tester --tail=50

# Test all three scenarios
echo "Testing Round-Robin..."
curl -s http://roundrobin.localhost/app/api/info | jq .podName

echo "Testing ClientIP..."
curl -s http://clientip.localhost/app/api/info | jq .podName

echo "Testing Cookie..."
curl -s http://cookie.localhost/app/api/info | jq .podName

# Open in browser
open http://roundrobin.localhost/app/
open http://clientip.localhost/app/
open http://cookie.localhost/app/
```

### 8.6 Using Kustomize

```bash
# Preview what will be deployed
kubectl kustomize kubernetes/

# Deploy using Kustomize
kubectl apply -k kubernetes/

# Delete using Kustomize
kubectl delete -k kubernetes/
```

### 8.7 Troubleshooting Commands

```bash
# Check pod status
kubectl describe pod -l app=sticky-session-tester

# Check service endpoints
kubectl get endpoints sticky-session-tester

# Check HTTPRoute status
kubectl describe httproute sticky-session-tester

# Port forward for direct access
kubectl port-forward svc/sticky-session-tester 8080:80

# Check Traefik logs
kubectl logs -n traefik -l app.kubernetes.io/name=traefik --tail=50

# View Traefik dashboard
open http://traefik.localhost/dashboard/
```

---

## 9. Verification Checklist

### Application Level
- [ ] Application builds successfully
- [ ] All endpoints respond correctly
- [ ] Health check returns UP status
- [ ] Prometheus metrics exposed
- [ ] Session tracking works
- [ ] Pod information displayed correctly

### Container Level
- [ ] Docker image builds successfully
- [ ] Image size is reasonable (<200MB)
- [ ] Container runs without errors
- [ ] Environment variables injected correctly

### Kubernetes Level
- [ ] All 3 pods are running
- [ ] Service has correct endpoints
- [ ] HTTPRoute is accepted
- [ ] Pods pass liveness/readiness probes
- [ ] Pods can access each other

### Traefik Level
- [ ] HTTPRoute appears in Traefik dashboard
- [ ] Requests route to service
- [ ] Path rewrite works correctly
- [ ] Sticky session cookie is set
- [ ] Requests stick to same pod

### User Experience
- [ ] Landing page loads and displays correctly
- [ ] Pod-specific colors show
- [ ] Session information updates
- [ ] Auto-refresh works (if implemented)
- [ ] Visual indicators are clear
- [ ] Responsive design works on mobile

---

## 10. Success Criteria

### Functional Requirements
✅ Application displays Kubernetes pod information
✅ Application displays service information
✅ Session tracking works across requests
✅ Multiple replicas deploy successfully
✅ Actuator endpoints are accessible
✅ Prometheus metrics are exposed

### Traefik Requirements
✅ HTTPRoute routes traffic correctly
✅ Path rewrite strips `/app` prefix
✅ Sticky sessions persist across requests
✅ Cookie-based session affinity works
✅ Load balances across pods when no cookie

### User Experience Requirements
✅ Easy to identify which pod is serving
✅ Visual distinction between pods
✅ Session state is clearly indicated
✅ Information is accurate and up-to-date
✅ Interface is clean and responsive

---

## 11. Next Steps After Completion

1. **Performance Testing**: Test with load testing tools (Apache Bench, k6)
2. **Metrics Dashboard**: Create Grafana dashboard for application metrics
3. **Advanced Features**: Add WebSocket support for real-time updates
4. **Documentation**: Add architecture diagrams and screenshots
5. **CI/CD**: Create GitHub Actions workflow for automated builds

---

## Notes

- **Docker Desktop**: All testing assumes Docker Desktop Kubernetes
- **Java Version**: Requires Java 17 or higher
- **Maven Version**: Requires Maven 3.8+
- **Kubectl Version**: Compatible with Kubernetes 1.24+

---

## 11. Session Affinity Comparison

### Summary Table

| Feature | Round-Robin | ClientIP Affinity | Cookie Affinity |
|---------|-------------|-------------------|-----------------|
| **URL** | `roundrobin.localhost` | `clientip.localhost` | `cookie.localhost` |
| **Affinity Level** | None | Kubernetes Service | Traefik HTTPRoute |
| **Sticky Method** | None | Source IP | HTTP Cookie |
| **Cookie Required** | No | No | Yes (`sticky-cookie`) |
| **Behavior** | Random pod each request | Same pod per source IP | Same pod per cookie |
| **Cross-Browser** | Different pods | Same pod (same IP) | Different pods |
| **Timeout** | N/A | 3600s (1 hour) | 3600s (1 hour) |
| **Failover** | Immediate | Automatic | Automatic |
| **Use Case** | Stateless apps | IP-based routing | Stateful web apps |

### When to Use Each Mode

**Round-Robin (No Affinity)**:
- ✅ Pure stateless applications
- ✅ Testing load distribution
- ✅ Maximum distribution across pods
- ❌ Not suitable for stateful sessions

**ClientIP Affinity**:
- ✅ API clients with fixed IPs
- ✅ Mobile apps (single device)
- ✅ Simple session persistence
- ❌ Shared NAT/proxy environments
- ❌ Mobile users switching networks

**Cookie Affinity (Traefik)**:
- ✅ Web applications with sessions
- ✅ Shopping carts, user dashboards
- ✅ Works across NAT/proxies
- ✅ Works across network changes
- ❌ Requires cookie support

### Technical Details

**Kubernetes ClientIP Affinity**:
- Implemented by `kube-proxy` at the service level
- Uses source IP from packet headers
- No application awareness
- Works for any protocol (HTTP, TCP, UDP)
- Timeout: Configurable per service

**Traefik Cookie Affinity**:
- Implemented by Traefik at HTTPRoute level
- Uses HTTP cookies set by Traefik
- Application-layer awareness
- HTTP/HTTPS only
- Cookie name: `sticky-cookie` (configurable)
- Cookie contains hashed pod identifier

---

## Reference Links

- [Spring Boot Actuator](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [Traefik Gateway API](https://doc.traefik.io/traefik/routing/providers/kubernetes-gateway/)
- [Kubernetes Service Session Affinity](https://kubernetes.io/docs/reference/networking/virtual-ips/#session-affinity)
- [Kubernetes Downward API](https://kubernetes.io/docs/concepts/workloads/pods/downward-api/)
- [Gateway API HTTPRoute](https://gateway-api.sigs.k8s.io/api-types/httproute/)
- [Gateway API Session Persistence](https://gateway-api.sigs.k8s.io/geps/gep-1619/)

---

## 12. Additional Java Configuration Classes

### 12.1 WebConfig.java (CORS Configuration)

```java
package com.example.stickysession.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "POST")
                .allowedHeaders("*")
                .maxAge(3600);
    }
}
```

### 12.2 GlobalExceptionHandler.java

```java
package com.example.stickysession.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception e) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                    "error", e.getMessage(),
                    "type", e.getClass().getSimpleName()
                ));
    }
}
```

---

## 13. Summary of Critical Changes from Original Plan

### Fixed Issues

1. **✅ Traefik Path Rewriting**: Changed from Gateway API `URLRewrite` to Traefik Middleware `replacePathRegex` for reliable path rewriting
2. **✅ Session Persistence**: Documented both HTTPRoute and IngressRoute approaches for Traefik sticky sessions
3. **✅ Health Probes**: Added proper Spring Boot Actuator configuration for liveness/readiness endpoints
4. **✅ Resource Limits**: Increased memory from 128Mi/256Mi to 256Mi/512Mi for Spring Boot
5. **✅ Startup Probe**: Added startup probe to handle slow Spring Boot initialization
6. **✅ Color Distribution**: Improved hash algorithm for better pod color distribution
7. **✅ Spring Session**: Removed unnecessary `spring-session-core` dependency
8. **✅ Namespace**: Added dedicated namespace resource
9. **✅ Middleware**: Added Traefik Middleware resource for path rewriting
10. **✅ Kustomization**: Added Kustomize support for easier deployment

### New Additions

1. **✅ Makefile**: Automation for build, deploy, test workflows
2. **✅ CORS Configuration**: WebConfig.java for API cross-origin support
3. **✅ Exception Handling**: GlobalExceptionHandler.java for consistent error responses
4. **✅ Maven Wrapper**: Added mvnw for reproducible builds
5. **✅ Docker Optimization**: Multi-stage build with proper base images
6. **✅ Kustomize Support**: kubernetes/kustomization.yaml for declarative deployment

### Implementation Strategy Updates

**Path Rewriting**:

- **Before**: Gateway API `URLRewrite` filter
- **After**: Traefik Middleware with `replacePathRegex`
- **Reason**: More reliable across Traefik versions

**Sticky Sessions**:

- **Before**: Gateway API `sessionPersistence` (experimental)
- **After**: Two options documented:
  - Option A: Traefik Middleware with plugin
  - Option B: IngressRoute with native sticky config (recommended)
- **Reason**: Better Traefik compatibility

**Deployment**:

- **Before**: Manual kubectl apply for each file
- **After**: Three options:
  1. `make all` (recommended)
  2. `kubectl apply -k kubernetes/` (Kustomize)
  3. Manual kubectl (still supported)
- **Reason**: Better developer experience

---

## 14. Pre-Implementation Checklist

Before starting implementation, ensure:

- [ ] Docker Desktop Kubernetes is running
- [ ] Traefik is deployed and accessible
- [ ] Java 17+ is installed
- [ ] Maven 3.8+ is installed (or use Maven wrapper)
- [ ] `kubectl` is configured for docker-desktop context
- [ ] Port 8080 is available locally
- [ ] Sufficient disk space for Docker images (~500MB)

---

**Last Updated**: 2025-12-06

**Status**: Planning Phase - Updated with production-ready corrections

**Next Step**: Begin implementation with [sticky-session-tester/pom.xml](sticky-session-tester/pom.xml)
