# Traefik Reverse Proxy

This repository contains Helm chart configuration for deploying [Traefik](https://traefik.io/) reverse proxy on [Kubernetes](https://kubernetes.io/) using [Helm](https://helm.sh/).

Traefik is a modern HTTP reverse proxy and load balancer that automatically discovers services and routes traffic based on rules.

📚 [Official Helm Chart Documentation](https://artifacthub.io/packages/helm/traefik/traefik)

## Quick Start

### Prerequisites

- Kubernetes cluster (tested on Docker Desktop)
- Helm 3.x installed
- `kubectl` configured to access your cluster

### Installation

1. Add the Traefik Helm repository:

```sh
helm repo add traefik https://traefik.github.io/charts
helm repo update
```

2. Install Traefik:

```sh
helm upgrade traefik traefik/traefik \
  --install \
  --create-namespace \
  --namespace traefik \
  --rollback-on-failure \
  --version 37.4.0 \
  --values values.yaml
```

3. Verify the deployment:

```sh
kubectl get all -n traefik
```

## Configuration

The `values.yaml` file contains configuration optimized for Docker Desktop Kubernetes:

- **LoadBalancer Service**: Exposes ports 80 (HTTP), 443 (HTTPS), and 8080 (Dashboard)
- **Dashboard Enabled**: Accessible via `traefik.localhost`
- **Default IngressClass**: Automatically handles all Ingress resources
- **Providers**: Supports both Kubernetes Ingress and Traefik IngressRoute CRDs
- **Observability**: Prometheus metrics and JSON access logs enabled

## Accessing the Dashboard

The Traefik dashboard provides real-time view of routes, services, and middleware.

### Option 1: Browser Access (Recommended)

Add `traefik.localhost` to your hosts file:

```sh
echo "127.0.0.1 traefik.localhost" | sudo tee -a /etc/hosts
```

Then open: <http://traefik.localhost/dashboard/>

### Option 2: Command Line

```sh
curl -H "Host: traefik.localhost" http://localhost/dashboard/
```

### Option 3: Port Forward

```sh
kubectl port-forward -n traefik service/traefik 8080:8080
```

Health check: <http://localhost:8080/ping>

## Usage Examples

### Create an Ingress for Your Application

Using standard Kubernetes Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: default
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

Using Traefik IngressRoute CRD:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: my-app
  namespace: default
spec:
  entryPoints:
    - web
  routes:
  - match: Host(`myapp.localhost`)
    kind: Rule
    services:
    - name: my-service
      port: 80
```

## Verification

Test the deployment:

```sh
# Health check
curl http://localhost:8080/ping

# Dashboard
curl -sI -H "Host: traefik.localhost" http://localhost/dashboard/

# View logs
kubectl logs -n traefik -l app.kubernetes.io/name=traefik -f
```

## Upgrading

To upgrade to a newer version:

1. Update the version in the install command
2. Review the changelog: <https://github.com/traefik/traefik/releases>
3. Run the upgrade:

```sh
helm upgrade traefik traefik/traefik \
  --namespace traefik \
  --rollback-on-failure \
  --version <NEW_VERSION> \
  --values values.yaml
```

## Uninstall

```sh
helm uninstall traefik -n traefik
```

## Resources

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Traefik Helm Chart](https://github.com/traefik/traefik-helm-chart)
- [Traefik Community Forum](https://community.traefik.io/)

## License

This configuration uses Traefik under the MIT License.
