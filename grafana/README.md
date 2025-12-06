# Grafana Deployment

This directory contains the Helm values overlay for deploying Grafana to Docker Desktop with Prometheus pre-configured as a datasource.

## Overview

**Grafana** is a multi-platform open-source analytics and interactive visualization web application. It provides charts, graphs, and alerts when connected to supported data sources.

- **Chart**: `grafana/grafana`
- **Chart Version**: 10.3.0
- **App Version**: 12.3.0
- **Namespace**: `grafana`
- **Chart Repository**: <https://artifacthub.io/packages/helm/grafana/grafana>

## Prerequisites

- Docker Desktop with Kubernetes enabled
- Helm 3.x installed
- Prometheus deployed (see [../prometheus/README.md](../prometheus/README.md))
- Traefik deployed (see [../traefik/README.md](../traefik/README.md))
- `kubectl` configured for `docker-desktop` context

Verify your context:

```sh
kubectl config current-context
# Should output: docker-desktop
```

## Installation

### 1. Add Helm Repository

```sh
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### 2. Deploy Grafana

```sh
helm upgrade grafana grafana/grafana \
  --install \
  --create-namespace \
  --namespace grafana \
  --rollback-on-failure \
  --version 10.3.0 \
  --values grafana/values.yaml
```

### 3. Add hosts entry

```sh
echo "127.0.0.1 grafana.localhost" | sudo tee -a /etc/hosts
```

### 4. Login Credentials

The default admin credentials are configured in [values.yaml](values.yaml):
- **Username**: `admin`
- **Password**: `changeme` (configured in values.yaml)

> **IMPORTANT**: Change the default password immediately after first login.
> Password changes made in the Grafana UI are automatically persisted to the database.

### 5. Access Grafana

Open your browser to: <http://grafana.localhost>

## Access Methods

### Option 1: Browser Access via Traefik (Recommended)

Access via Ingress: <http://grafana.localhost>

**Verification:**

```sh
# Check Ingress status
kubectl get ingress -n grafana

# Test access
curl -sI http://grafana.localhost
```

### Option 2: LoadBalancer Service

Access directly via LoadBalancer:

```sh
# Get the LoadBalancer IP (should be localhost on Docker Desktop)
kubectl get svc -n grafana grafana

# Open browser
open http://localhost
```

### Option 3: Port Forward

```sh
kubectl port-forward -n grafana service/grafana 3000:80
```

Then open: <http://localhost:3000>

## Pre-configured Setup

### Datasources

The deployment automatically configures:

- ✅ **Prometheus** - Set as default datasource
  - URL: `http://prometheus-server.prometheus.svc.cluster.local`
  - Scrape interval: 30s
  - Editable: Yes

### Pre-loaded Dashboards

Four popular dashboards are automatically imported:

1. **Kubernetes Cluster Monitoring** (ID: 7249)
   - Overall cluster health
   - Resource usage by namespace
   - Node metrics

2. **Kubernetes Pod Monitoring** (ID: 6417)
   - Pod CPU and memory usage
   - Network I/O
   - Container metrics

3. **Traefik Dashboard** (ID: 4475)
   - HTTP request rates
   - Response times
   - Status code distribution

4. **Prometheus Stats** (ID: 2)
   - Prometheus performance metrics
   - Scrape duration
   - Time series count

### Installed Plugins

The following plugins are pre-installed:

- `grafana-clock-panel` - Clock panel
- `grafana-simple-json-datasource` - Simple JSON datasource
- `grafana-piechart-panel` - Pie chart panel

## Usage

### First Login

1. Navigate to <http://grafana.localhost>
2. Login with the default credentials from [values.yaml](values.yaml):
   - Username: `admin`
   - Password: `changeme`
3. **Immediately change the password** after first login via User → Profile → Change Password

### Exploring Dashboards

1. Click **Dashboards** → **Browse** in the left sidebar
2. Select any pre-loaded dashboard
3. Use time range picker (top right) to adjust time window
4. Click on panels to drill down

### Creating Your First Dashboard

1. Click **+** → **Dashboard** in the left sidebar
2. Click **Add visualization**
3. Select **Prometheus** datasource
4. Enter a PromQL query (e.g., `up` or `kubelet_running_pods`)
5. Click **Run queries**
6. Customize visualization type and settings
7. Click **Apply** to save the panel
8. Click **Save dashboard** (disk icon, top right)

### Useful Queries to Start With

Try these queries in your dashboards:

```promql
# Cluster health
up

# Running pods
kubelet_running_pods

# Container count by state
sum(kubelet_running_containers) by (container_state)

# Traefik request rate
sum(rate(traefik_service_requests_total[5m])) by (service)

# API server latency
histogram_quantile(0.95, rate(apiserver_request_duration_seconds_bucket[5m]))
```

## Verification

Test the deployment:

```sh
# Check Grafana pods
kubectl get pods -n grafana

# Check service
kubectl get svc -n grafana

# Check ingress
kubectl get ingress -n grafana

# Test connectivity
curl -I http://grafana.localhost

# Get admin password (if using auto-generated)
kubectl get secret -n grafana grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo
```

## Importing Additional Dashboards

### From Grafana.com

1. Browse <https://grafana.com/grafana/dashboards/>
2. Find a dashboard you like
3. Note the dashboard ID
4. In Grafana UI:
   - Click **+** → **Import**
   - Enter dashboard ID
   - Click **Load**
   - Select **Prometheus** datasource
   - Click **Import**

### Recommended Dashboards

- **Node Exporter Full** (ID: 1860) - Detailed node metrics
- **Kubernetes Deployment Statefulset Daemonset** (ID: 8588)
- **Kubernetes Cluster** (ID: 15172) - Modern cluster overview
- **Docker and System Monitoring** (ID: 893)

### From JSON

1. Export dashboard JSON from another Grafana instance
2. In Grafana UI:
   - Click **+** → **Import**
   - Paste JSON or upload file
   - Select datasources
   - Click **Import**

## Configuration

### Changing Admin Password

Option 1 - Update values.yaml:

```yaml
adminPassword: "your-secure-password"
```

Then upgrade:

```sh
helm upgrade grafana grafana/grafana \
  --namespace grafana \
  --version 10.3.0 \
  --values grafana/values.yaml
```

Option 2 - In Grafana UI:
- Click user icon (bottom left)
- **Preferences** → **Change Password**

### Adding Datasources

Edit [values.yaml](values.yaml) and add to `datasources` section:

```yaml
datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        url: http://prometheus-server.prometheus.svc.cluster.local
        isDefault: true
      # Add more datasources here
      - name: Loki
        type: loki
        url: http://loki.loki.svc.cluster.local:3100
```

### Customizing Grafana Settings

Edit the `grafana.ini` section in [values.yaml](values.yaml):

```yaml
grafana.ini:
  server:
    root_url: "http://grafana.localhost"
  auth:
    disable_login_form: false
  smtp:
    enabled: false
```

## Storage Management

### Check Storage Usage

```sh
# Check PVC status
kubectl get pvc -n grafana

# Check disk usage in pod
kubectl exec -n grafana deployment/grafana -- df -h /var/lib/grafana
```

### Increase Storage

Edit [values.yaml](values.yaml):

```yaml
persistence:
  size: 5Gi  # Increase from 2Gi
```

Then upgrade the deployment.

## Troubleshooting

### Dashboard Not Loading

```sh
# Check pod logs
kubectl logs -n grafana -l app.kubernetes.io/name=grafana --tail=100

# Check pod status
kubectl describe pod -n grafana -l app.kubernetes.io/name=grafana
```

### Datasource Connection Issues

```sh
# Test Prometheus connectivity from Grafana pod
kubectl exec -n grafana deployment/grafana -- wget -O- http://prometheus-server.prometheus.svc.cluster.local/-/healthy

# Check Prometheus service
kubectl get svc -n prometheus prometheus-server
```

### Can't Access via grafana.localhost

```sh
# Verify hosts entry
cat /etc/hosts | grep grafana

# Check Ingress
kubectl get ingress -n grafana

# Check Traefik routes
kubectl get ingressroute -A
```

### Reset Admin Password

```sh
# Method 1: Via kubectl
kubectl exec -n grafana deployment/grafana -- grafana-cli admin reset-admin-password newpassword

# Method 2: Update values.yaml and upgrade
helm upgrade grafana grafana/grafana \
  --namespace grafana \
  --version 10.3.0 \
  --set adminPassword=newpassword \
  --values grafana/values.yaml
```

## Backup and Restore

### Backup Dashboards

```sh
# Export all dashboards via API
curl -u admin:admin http://grafana.localhost/api/search | \
  jq -r '.[] | select(.type == "dash-db") | .uid' | \
  while read uid; do
    curl -u admin:admin "http://grafana.localhost/api/dashboards/uid/$uid" | \
      jq -r . > "dashboard-$uid.json"
  done
```

### Backup Persistent Volume

```sh
# Get PVC name
kubectl get pvc -n grafana

# Create backup
kubectl exec -n grafana deployment/grafana -- tar czf /tmp/grafana-backup.tar.gz /var/lib/grafana
kubectl cp grafana/deployment/grafana:/tmp/grafana-backup.tar.gz ./grafana-backup.tar.gz
```

## Uninstallation

```sh
# Uninstall Grafana
helm uninstall grafana -n grafana

# Remove namespace
kubectl delete namespace grafana

# Remove hosts entry
sudo sed -i '' '/grafana.localhost/d' /etc/hosts
```

## Additional Resources

- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [Dashboard Gallery](https://grafana.com/grafana/dashboards/)
- [Prometheus Integration](https://grafana.com/docs/grafana/latest/datasources/prometheus/)
- [Helm Chart Documentation](https://artifacthub.io/packages/helm/grafana/grafana)

## Quick Reference

```sh
# Install/Upgrade
helm upgrade grafana grafana/grafana \
  --install \
  --create-namespace \
  --namespace grafana \
  --rollback-on-failure \
  --version 10.3.0 \
  --values grafana/values.yaml

# Status
kubectl get all -n grafana

# Access UI
open http://grafana.localhost

# Logs
kubectl logs -n grafana -l app.kubernetes.io/name=grafana -f

# Get admin password
kubectl get secret -n grafana grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo
```
