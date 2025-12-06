# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains Helm chart configurations for deploying multiple services on Kubernetes using the **values overlay** pattern. Each service uses official Helm charts from Artifact Hub with custom values overlays optimized for Docker Desktop.

## Project Structure

```text
.
├── CLAUDE.md           # This file - guidance for Claude Code
├── traefik/            # Traefik reverse proxy deployment
│   ├── README.md       # User documentation
│   └── values.yaml     # Custom configuration overlay
├── prometheus/         # Prometheus monitoring stack
│   ├── README.md       # User documentation
│   ├── values.yaml     # Custom configuration overlay
│   └── httproute.yaml  # Traefik IngressRoute for web access
├── metrics-server/     # Kubernetes Metrics Server
│   ├── README.md       # User documentation
│   └── values.yaml     # Custom configuration overlay
└── grafana/            # Grafana visualization and dashboards
    ├── README.md       # User documentation
    └── values.yaml     # Custom configuration overlay
```

## Architecture

This is a **values overlay** repository pattern:

- Each service has its own directory
- Each directory contains:
  - `values.yaml`: Custom configuration values that override upstream chart defaults
  - `README.md`: Installation and usage instructions specific to that service
- Uses upstream charts from Artifact Hub (not full Helm charts)
- Optimized for local Docker Desktop Kubernetes

## Deployment Model

For each service:

1. Add the upstream Helm repository
2. Install/upgrade using the upstream chart with local `values.yaml` as overrides
3. Deploy to dedicated namespace (typically same name as service)

## Services

### Traefik (Reverse Proxy)

**Chart**: `traefik/traefik` version 37.4.0
**Namespace**: `traefik`
**Documentation**: [traefik/README.md](traefik/README.md)

#### Quick Commands

```sh
# Add repo
helm repo add traefik https://traefik.github.io/charts

# Install/Upgrade
helm upgrade traefik traefik/traefik \
  --install \
  --create-namespace \
  --namespace traefik \
  --rollback-on-failure \
  --version 37.4.0 \
  --values traefik/values.yaml

# Check status
kubectl get all -n traefik

# Access dashboard
echo "127.0.0.1 traefik.localhost" | sudo tee -a /etc/hosts
# Visit: http://traefik.localhost/dashboard/
```

**Key Features**:

- LoadBalancer service on localhost (Docker Desktop)
- Dashboard at `traefik.localhost`
- Default IngressClass for all ingresses
- Prometheus metrics enabled
- JSON access logs

#### Traefik Verification

```sh
# Health check
curl http://localhost:8080/ping

# Dashboard
curl -sI -H "Host: traefik.localhost" http://localhost/dashboard/
```

### Prometheus (Monitoring)

**Chart**: `prometheus-community/prometheus` version 27.49.0
**Namespace**: `prometheus`
**Documentation**: [prometheus/README.md](prometheus/README.md)

#### Quick Commands

```sh
# Add repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Install/Upgrade
helm upgrade prometheus prometheus-community/prometheus \
  --install \
  --create-namespace \
  --namespace prometheus \
  --rollback-on-failure \
  --version 27.49.0 \
  --values prometheus/values.yaml

# Check status
kubectl get all -n prometheus

# Deploy IngressRoute for Traefik
kubectl apply -f prometheus/httproute.yaml

# Access UI
echo "127.0.0.1 prometheus.localhost" | sudo tee -a /etc/hosts
# Visit: http://prometheus.localhost
```

**Key Features**:

- LoadBalancer service on localhost (Docker Desktop)
- IngressRoute at `prometheus.localhost` (via Traefik CRD)
- Kubernetes Ingress also available (alternative access method)
- 8GB persistent storage with 15-day retention
- Auto-discovery of Kubernetes pods and services
- Explicit Traefik metrics scraping configured
- Kube-state-metrics enabled

#### Prometheus Verification

```sh
# Check IngressRoute
kubectl get ingressroute -n prometheus

# Test HTTP access via Traefik
curl -s -H "Host: prometheus.localhost" http://localhost/

# Health check (via port-forward)
kubectl port-forward -n prometheus service/prometheus-server 9090:80 &
curl http://localhost:9090/-/healthy

# Check Traefik metrics are being scraped
curl -s 'http://localhost:9090/api/v1/query?query=up' | jq '.data.result[] | select(.metric.job=="traefik")'

# View in Traefik dashboard
# Visit: http://traefik.localhost/dashboard/#/http/routers
```

**Integration Status**:
- ✅ Traefik metrics successfully scraped and available in Prometheus
- ✅ Kubelet metrics successfully scraped (TLS verification disabled for Docker Desktop)
- ✅ Kubernetes node and container metrics available

**Access Method**: ✅ IngressRoute deployed at `prometheus.localhost`

### Metrics Server (Resource Metrics)

**Chart**: `metrics-server/metrics-server` version 3.12.2
**Namespace**: `kube-system`
**Documentation**: [metrics-server/README.md](metrics-server/README.md)

#### Quick Commands

```sh
# Add repo
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/

# Install/Upgrade
helm upgrade metrics-server metrics-server/metrics-server \
  --install \
  --namespace kube-system \
  --rollback-on-failure \
  --version 3.12.2 \
  --values metrics-server/values.yaml

# Check status
kubectl get deployment -n kube-system metrics-server

# View node metrics
kubectl top nodes

# View pod metrics
kubectl top pods -A
```

**Key Features**:

- Kubernetes Metrics API (`kubectl top`)
- Resource metrics collection (CPU, memory)
- HPA/VPA support
- Low resource footprint (100m CPU, 128Mi memory)
- TLS verification disabled for Docker Desktop

#### Metrics Server Verification

```sh
# Check API service
kubectl get apiservice v1beta1.metrics.k8s.io

# View node metrics
kubectl top nodes

# View pod metrics in specific namespace
kubectl top pods -n traefik

# Query metrics API directly
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes | jq .
kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods | jq .
```

**Integration Status**: ✅ Metrics Server deployed and Metrics API functional
**Features Enabled**: ✅ `kubectl top` commands working for nodes and pods

### Grafana (Visualization & Dashboards)

**Chart**: `grafana/grafana` version 10.3.0
**Namespace**: `grafana`
**Documentation**: [grafana/README.md](grafana/README.md)

#### Quick Commands

```sh
# Add repo
helm repo add grafana https://grafana.github.io/helm-charts

# Install/Upgrade
helm upgrade grafana grafana/grafana \
  --install \
  --create-namespace \
  --namespace grafana \
  --rollback-on-failure \
  --version 10.3.0 \
  --values grafana/values.yaml

# Add hosts entry
echo "127.0.0.1 grafana.localhost" | sudo tee -a /etc/hosts

# Check status
kubectl get all -n grafana

# Access UI
# Visit: http://grafana.localhost
# Username: admin
# Password: changeme (change after first login)
```

**Key Features**:

- Pre-configured Prometheus datasource
- 4 pre-loaded dashboards (Kubernetes, Traefik, Prometheus)
- Ingress at `grafana.localhost` (via Traefik)
- Persistent storage (2GB)
- LoadBalancer service on localhost

#### Grafana Verification

```sh
# Check deployment
kubectl get pods -n grafana

# Check ingress
kubectl get ingress -n grafana

# Test connectivity
curl -I http://grafana.localhost

# Test Prometheus datasource connectivity
kubectl exec -n grafana deployment/grafana -- wget -qO- http://prometheus-server.prometheus.svc.cluster.local/-/healthy

# View loaded dashboards
kubectl exec -n grafana deployment/grafana -- ls /var/lib/grafana/dashboards/default/
```

**Integration Status**:
- ✅ Grafana deployed and accessible at `grafana.localhost`
- ✅ Prometheus datasource pre-configured and working
- ✅ 4 dashboards auto-loaded (Kubernetes Cluster, Pods, Traefik, Prometheus Stats)
- ✅ Persistent storage enabled for dashboard saves

**Access Method**: ✅ Ingress deployed at `grafana.localhost`

## Service Management Patterns

### Adding a New Service

1. Create a directory: `mkdir service-name`
2. Research chart on Artifact Hub: <https://artifacthub.io/>
3. Get default values: `helm show values repo/chart-name --version X.Y.Z > service-name/values.yaml`
4. Edit values.yaml for Docker Desktop optimization
5. Create service-name/README.md with installation instructions
6. Update this CLAUDE.md with service details

### Values Overlay Best Practices

- Only include values that differ from defaults
- Add comments explaining customizations
- Pin chart versions explicitly
- Optimize resource requests/limits for local development
- Use LoadBalancer service type (Docker Desktop provides localhost)
- Enable observability features (metrics, logs, dashboards)

### Testing Deployments

```sh
# Validate before deploy
helm template release-name repo/chart-name --values service-name/values.yaml --namespace namespace-name

# Dry-run
helm upgrade release-name repo/chart-name \
  --install \
  --namespace namespace-name \
  --values service-name/values.yaml \
  --dry-run

# Deploy with rollback
helm upgrade release-name repo/chart-name \
  --install \
  --create-namespace \
  --namespace namespace-name \
  --rollback-on-failure \
  --values service-name/values.yaml
```

## Kubernetes Context

Target cluster: **docker-desktop**

Verify context before deployments:

```sh
kubectl config current-context
# Should output: docker-desktop
```

## Common Commands

### Helm Operations

```sh
# List all releases
helm list -A

# Get release values
helm get values release-name -n namespace

# View release history
helm history release-name -n namespace

# Rollback to previous version
helm rollback release-name -n namespace

# Uninstall release
helm uninstall release-name -n namespace
```

### Kubernetes Operations

```sh
# View all resources in namespace
kubectl get all -n namespace

# Describe resource
kubectl describe pod/name -n namespace

# View logs
kubectl logs -n namespace -l app=label --tail=50 -f

# Port forward for local access
kubectl port-forward -n namespace service/name local-port:service-port

# Execute command in pod
kubectl exec -it -n namespace pod/name -- /bin/sh
```

## Troubleshooting

### Helm Issues

- If deployment fails, check: `helm status release-name -n namespace`
- View detailed error: `kubectl describe pod -n namespace -l app=label`
- Check logs: `kubectl logs -n namespace -l app=label --tail=100`

### Schema Validation Errors

If you get "additional properties not allowed" errors:

1. Check upstream chart documentation
2. Verify field names and structure
3. Use `helm show values` to see current schema
4. Some fields may have changed between versions

### Network/Service Issues

- Verify LoadBalancer got external IP: `kubectl get svc -n namespace`
- For Docker Desktop, external IP should be `localhost`
- Test connectivity: `curl -v http://localhost:port`
- Check Traefik dashboard for routing issues

## Resources

- Artifact Hub: <https://artifacthub.io/>
- Helm Documentation: <https://helm.sh/docs/>
- Kubernetes Documentation: <https://kubernetes.io/docs/>
