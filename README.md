# Kubernetes Service Deployments

This repository contains Helm chart configurations for deploying multiple services on Kubernetes using the **values overlay** pattern. All configurations are optimized for Docker Desktop Kubernetes clusters.

## Project Structure

```text
.
├── CLAUDE.md           # AI assistant guidance documentation
├── README.md           # This file - project overview
├── traefik/            # Traefik reverse proxy
│   ├── README.md       # Traefik-specific documentation
│   └── values.yaml     # Traefik configuration overlay
└── prometheus/         # Prometheus monitoring stack
    ├── README.md       # Prometheus-specific documentation
    └── values.yaml     # Prometheus configuration overlay
```

## Services

### 🌐 Traefik - Reverse Proxy & Load Balancer

Modern HTTP reverse proxy and load balancer with automatic service discovery.

- **Version**: v3.6.2 (Chart 37.4.0)
- **Namespace**: `traefik`
- **Access**: <http://traefik.localhost/dashboard/>
- **Documentation**: [traefik/README.md](traefik/README.md)

**Key Features**:

- Automatic service discovery via Kubernetes Ingress
- Built-in dashboard and metrics
- Support for HTTP/HTTPS with TLS
- WebSocket support
- Load balancing and circuit breakers

**Quick Deploy**:

```sh
helm repo add traefik https://traefik.github.io/charts
helm upgrade traefik traefik/traefik \
  --install \
  --create-namespace \
  --namespace traefik \
  --rollback-on-failure \
  --version 37.4.0 \
  --values traefik/values.yaml
```

### 📊 Prometheus - Monitoring & Metrics

Open-source monitoring system and time series database.

- **Version**: v3.8.0 (Chart 27.49.0)
- **Namespace**: `prometheus`
- **Access**: <http://prometheus.localhost> or <http://localhost:9090>
- **Documentation**: [prometheus/README.md](prometheus/README.md)

**Key Features**:

- Automatic Kubernetes service discovery
- Time series data collection and storage
- Powerful PromQL query language
- Integration with Grafana for visualization
- 15-day data retention (configurable)

**Quick Deploy**:

```sh
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade prometheus prometheus-community/prometheus \
  --install \
  --create-namespace \
  --namespace prometheus \
  --rollback-on-failure \
  --version 27.49.0 \
  --values prometheus/values.yaml
```

## Prerequisites

### System Requirements

- **Kubernetes**: v1.25+ (Docker Desktop recommended)
- **Helm**: v3.10+
- **kubectl**: Configured to access your cluster
- **Resources**: Minimum 4GB RAM, 2 CPU cores

### Docker Desktop Setup

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Enable Kubernetes in Docker Desktop settings
3. Verify installation:

```sh
kubectl config current-context
# Should output: docker-desktop
```

## Quick Start

### 1. Verify Kubernetes Cluster

```sh
kubectl cluster-info
kubectl get nodes
```

### 2. Add Helm Repositories

```sh
helm repo add traefik https://traefik.github.io/charts
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### 3. Deploy All Services

```sh
# Deploy Traefik (reverse proxy first)
helm upgrade traefik traefik/traefik \
  --install --create-namespace --namespace traefik \
  --rollback-on-failure --version 37.4.0 \
  --values traefik/values.yaml

# Deploy Prometheus (monitoring)
helm upgrade prometheus prometheus-community/prometheus \
  --install --create-namespace --namespace prometheus \
  --rollback-on-failure --version 27.49.0 \
  --values prometheus/values.yaml
```

### 4. Configure Local DNS

Add these entries to `/etc/hosts`:

```sh
echo "127.0.0.1 traefik.localhost" | sudo tee -a /etc/hosts
echo "127.0.0.1 prometheus.localhost" | sudo tee -a /etc/hosts
```

### 5. Access Services

- **Traefik Dashboard**: <http://traefik.localhost/dashboard/>
- **Prometheus UI**: <http://prometheus.localhost>

## Common Operations

### View All Deployments

```sh
helm list -A
kubectl get all -A
```

### Check Service Status

```sh
# Traefik
kubectl get all -n traefik
kubectl logs -n traefik -l app.kubernetes.io/name=traefik -f

# Prometheus
kubectl get all -n prometheus
kubectl logs -n prometheus -l app.kubernetes.io/name=prometheus -f
```

### Upgrade Services

```sh
# Update Helm repositories
helm repo update

# Upgrade specific service
helm upgrade <release-name> <repo>/<chart-name> \
  --namespace <namespace> \
  --rollback-on-failure \
  --version <new-version> \
  --values <service>/values.yaml
```

### Uninstall Services

```sh
# Remove specific service
helm uninstall <release-name> -n <namespace>

# Remove all services
helm uninstall traefik -n traefik
helm uninstall prometheus -n prometheus

# Delete namespaces (optional)
kubectl delete namespace traefik
kubectl delete namespace prometheus
```

## Architecture

This project follows the **values overlay pattern**:

```text
┌─────────────────────────────────────┐
│   Artifact Hub (Official Charts)   │
│  - Maintained by project teams     │
│  - Regular security updates        │
│  - Community tested               │
└──────────────┬──────────────────────┘
               │
               ├─> Local values.yaml overlay
               │   - Docker Desktop optimizations
               │   - Resource limits for local dev
               │   - LoadBalancer services
               │   - Ingress configurations
               │
               v
        ┌─────────────────┐
        │  Kubernetes     │
        │  (docker-desktop)│
        └─────────────────┘
```

**Benefits**:

- ✅ Always use official, maintained charts
- ✅ Minimal configuration (only what differs from defaults)
- ✅ Easy to upgrade (just change version number)
- ✅ Reproducible deployments
- ✅ Security updates from upstream

## Service Discovery

Traefik automatically discovers services via Kubernetes Ingress. Example:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
spec:
  ingressClassName: traefik
  rules:
    - host: myapp.localhost
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 80
```

Prometheus automatically scrapes pods/services with annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
```

## Troubleshooting

### Services Not Accessible

1. Verify pods are running: `kubectl get pods -A`
2. Check service endpoints: `kubectl get svc -A`
3. Verify LoadBalancer IP: Should be `localhost` on Docker Desktop
4. Check `/etc/hosts` for DNS entries

### Helm Deployment Fails

1. Check Helm status: `helm status <release> -n <namespace>`
2. View pod events: `kubectl describe pod -n <namespace>`
3. Check logs: `kubectl logs -n <namespace> -l app=<label>`
4. Validate values: `helm template <release> <chart> --values <values.yaml>`

### Resource Issues

```sh
# Check node resources
kubectl top nodes

# Check pod resources
kubectl top pods -A

# View resource quotas
kubectl describe resourcequota -A
```

## Best Practices

1. **Pin Chart Versions**: Always specify exact versions for reproducibility
2. **Use Namespaces**: Keep services isolated in dedicated namespaces
3. **Resource Limits**: Set appropriate requests/limits for local development
4. **Enable Monitoring**: Use Prometheus for all services
5. **Regular Updates**: Keep charts updated for security patches
6. **Backup Configs**: Commit values.yaml files to version control
7. **Test First**: Use `helm template` and `--dry-run` before deploying

## Resources

### Documentation

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Artifact Hub](https://artifacthub.io/)
- [Docker Desktop Kubernetes](https://docs.docker.com/desktop/kubernetes/)

### Charts Used

- [Traefik Helm Chart](https://github.com/traefik/traefik-helm-chart)
- [Prometheus Helm Chart](https://github.com/prometheus-community/helm-charts)

### Community

- [Traefik Community](https://community.traefik.io/)
- [Prometheus Community](https://prometheus.io/community/)
- [Kubernetes Slack](https://kubernetes.slack.com/)

## Contributing

When adding new services:

1. Create a new directory with the service name
2. Add `values.yaml` with Docker Desktop optimizations
3. Create `README.md` with installation instructions
4. Update this README and [CLAUDE.md](CLAUDE.md)
5. Test deployment on clean Docker Desktop cluster
6. Document any prerequisites or dependencies

## License

This repository contains configuration files only. Each service maintains its own license:

- **Traefik**: MIT License
- **Prometheus**: Apache License 2.0

See individual service documentation for details.
