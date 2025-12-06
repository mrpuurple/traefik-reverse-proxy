# Prometheus Monitoring Stack

This directory contains Helm chart configuration for deploying [Prometheus](https://prometheus.io/) monitoring system on [Kubernetes](https://kubernetes.io/) using [Helm](https://helm.sh/).

Prometheus is an open-source systems monitoring and alerting toolkit that collects and stores metrics as time series data.

📚 [Official Helm Chart Documentation](https://artifacthub.io/packages/helm/prometheus-community/prometheus)

## Quick Start

### Prerequisites

- Kubernetes cluster (tested on Docker Desktop)
- Helm 3.x installed
- `kubectl` configured to access your cluster
- (Optional) Traefik installed for Ingress support

### Installation

1. Add the Prometheus Helm repository:

```sh
helm repo add prometheus-community https://prometheus.io/docs/prometheus/latest/installation/
helm repo update
```

2. Install Prometheus:

```sh
helm upgrade prometheus prometheus-community/prometheus \
  --install \
  --create-namespace \
  --namespace prometheus \
  --rollback-on-failure \
  --version 27.49.0 \
  --values prometheus/values.yaml
```

3. Verify the deployment:

```sh
kubectl get all -n prometheus
```

## Configuration

The `values.yaml` file contains configuration optimized for Docker Desktop Kubernetes:

- **LoadBalancer Service**: Exposes port 80 for Prometheus UI
- **Persistent Storage**: 8GB volume for metrics data (15 day retention)
- **Ingress Enabled**: Accessible via `prometheus.localhost` (requires Traefik)
- **Kube State Metrics**: Monitors Kubernetes cluster state
- **Auto-Discovery**: Automatically discovers and scrapes Kubernetes services
- **Resource Limits**: Optimized for local development (512Mi-2Gi memory)

### Key Features

- **Scrape Targets**:
  - Prometheus itself
  - Kubernetes API server
  - Kubernetes nodes
  - Kubernetes pods (with `prometheus.io/scrape: "true"` annotation)
  - Kubernetes services
  - Traefik metrics

- **Data Retention**: 15 days (sufficient for local development)
- **Scrape Interval**: 30 seconds
- **Storage**: 8GB persistent volume

## Accessing Prometheus

### Option 1: Browser Access via IngressRoute (Recommended)

Prometheus is exposed via Traefik IngressRoute at `prometheus.localhost`.

**Setup:**

1. Deploy the IngressRoute (if not already deployed):

```sh
kubectl apply -f prometheus/httproute.yaml
```

1. Add to your hosts file:

```sh
echo "127.0.0.1 prometheus.localhost" | sudo tee -a /etc/hosts
```

1. Open in browser: <http://prometheus.localhost>

The IngressRoute is defined in [`httproute.yaml`](httproute.yaml):

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: prometheus
  namespace: prometheus
spec:
  entryPoints:
    - web
  routes:
    - match: Host(`prometheus.localhost`)
      kind: Rule
      services:
        - name: prometheus-server
          port: 80
```

**Verification:**

```sh
# Check IngressRoute status
kubectl get ingressroute -n prometheus

# Test access
curl -s -H "Host: prometheus.localhost" http://localhost/

# View in Traefik dashboard
# Visit: http://traefik.localhost/dashboard/#/http/routers
```

### Option 2: Browser Access via Ingress

The Helm chart also creates a Kubernetes Ingress resource (alternative to IngressRoute):

```sh
kubectl get ingress -n prometheus
```

Access via: <http://prometheus.localhost> (same URL as IngressRoute)

### Option 3: LoadBalancer Service

Access directly via LoadBalancer:

```sh
# Get the LoadBalancer IP (should be localhost on Docker Desktop)
kubectl get svc -n prometheus

# Open browser
open http://localhost
```

### Option 4: Port Forward

```sh
kubectl port-forward -n prometheus service/prometheus-server 9090:80
```

Then open: <http://localhost:9090>

## Usage Examples

### Query Examples

Once Prometheus is accessible via <http://prometheus.localhost> or port-forward, try these queries in the Prometheus UI (Graph tab):

#### Cluster Health & Overview

```promql
# Check all scrape targets are up
up

# Count healthy targets
count(up == 1)

# Kubernetes nodes health
up{job="kubernetes-nodes"}

# Total running pods across cluster
kubelet_running_pods

# Container count by state (running, exited, created)
sum(kubelet_running_containers) by (container_state)

# Pods per node (if multi-node)
kubelet_running_pods
```

#### Kubernetes Metrics

```promql
# Container start rate (new containers per second)
rate(kubelet_started_containers_total[5m])

# Containers per pod distribution
kubelet_containers_per_pod_count

# API server request rate
rate(apiserver_request_total[5m])

# API server request rate by HTTP status code
sum(rate(apiserver_request_total[5m])) by (code)

# API server latency (95th percentile)
histogram_quantile(0.95, rate(apiserver_request_duration_seconds_bucket[5m]))
```

#### Traefik Metrics

```promql
# Total request rate to all services
sum(rate(traefik_service_requests_total[5m]))

# Request rate per service
sum(rate(traefik_service_requests_total[5m])) by (service)

# Request rate by HTTP status code
sum(rate(traefik_service_requests_total[5m])) by (code)

# Average request duration
rate(traefik_service_request_duration_seconds_sum[5m]) / rate(traefik_service_request_duration_seconds_count[5m])

# Traefik uptime
time() - process_start_time_seconds{job="traefik"}
```

#### Prometheus Self-Monitoring

```promql
# Prometheus scrape duration
prometheus_target_interval_length_seconds

# Number of time series stored
prometheus_tsdb_head_series

# Ingestion rate (samples per second)
rate(prometheus_tsdb_head_samples_appended_total[5m])

# Prometheus memory usage
process_resident_memory_bytes{job="prometheus"}

# Active scrape targets
count(up)
```

#### Useful Aggregations

```promql
# Top 5 services by request rate
topk(5, sum(rate(traefik_service_requests_total[5m])) by (service))

# Error rate percentage (4xx + 5xx)
sum(rate(traefik_service_requests_total{code=~"4..|5.."}[5m])) / sum(rate(traefik_service_requests_total[5m])) * 100

# Success rate percentage (2xx + 3xx)
sum(rate(traefik_service_requests_total{code=~"[23].."}[5m])) / sum(rate(traefik_service_requests_total[5m])) * 100
```

**Note**: Container-level CPU/memory metrics (like `container_cpu_usage_seconds_total`) require cAdvisor to be enabled on kubelet, which provides more granular resource metrics. The current setup provides kubelet-level metrics for monitoring cluster health and Traefik application metrics.

### Scraping Your Application

To make your application discoverable by Prometheus, add these annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"      # Your metrics port
    prometheus.io/path: "/metrics"  # Your metrics path
spec:
  # ... pod spec
```

Or for a Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
spec:
  # ... service spec
```

## Verification

Test the deployment:

```sh
# Check Prometheus pods
kubectl get pods -n prometheus

# Check service
kubectl get svc -n prometheus

# Check targets (via port-forward)
kubectl port-forward -n prometheus service/prometheus-server 9090:80
# Visit: http://localhost:9090/targets

# Check metrics
curl http://localhost:9090/api/v1/query?query=up

# Verify kubelet metrics are being scraped
curl -s 'http://localhost:9090/api/v1/query?query=kubelet_running_pods' | jq .
curl -s 'http://localhost:9090/api/v1/query?query=kubelet_running_containers' | jq .
```

### Kubelet Metrics Integration

The configuration includes TLS verification bypass for kubelet metrics scraping, which is required for Docker Desktop:

```yaml
# In values.yaml
- job_name: kubernetes-nodes
  kubernetes_sd_configs:
    - role: node
  scheme: https
  tls_config:
    ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    insecure_skip_verify: true  # Required for Docker Desktop
```

This allows Prometheus to scrape:
- Kubelet operational metrics (pod count, container stats)
- Node-level metrics
- Basic container metrics

**Verification:**
```sh
# Check kubernetes-nodes target health
kubectl port-forward -n prometheus service/prometheus-server 9090:80
# Visit: http://localhost:9090/targets
# Look for "kubernetes-nodes" target - should show "UP"
```

## Integration with Grafana

To visualize Prometheus metrics with Grafana:

1. Deploy Grafana (see grafana directory if available)
2. Add Prometheus as a data source:
   - URL: `http://prometheus-server.prometheus.svc.cluster.local`
   - Access: Server (default)
3. Import dashboards from [Grafana Dashboards](https://grafana.com/grafana/dashboards/)

### Recommended Dashboards

- **Kubernetes Cluster Monitoring**: Dashboard ID 7249
- **Kubernetes Pod Monitoring**: Dashboard ID 6417
- **Traefik Monitoring**: Dashboard ID 4475
- **Node Exporter Full**: Dashboard ID 1860

## Storage Management

### Check Storage Usage

```sh
# Check PVC status
kubectl get pvc -n prometheus

# Check disk usage in pod
kubectl exec -n prometheus deployment/prometheus-server -- df -h /data
```

### Resize Storage

To increase storage size:

1. Edit values.yaml and increase `server.persistentVolume.size`
2. Upgrade the release
3. Resize the PVC (if supported by storage class)

### Clean Old Data

Prometheus automatically removes data older than the retention period (15 days).

To manually clean data:

```sh
# Delete TSDB blocks (requires admin API enabled)
curl -X POST http://localhost:9090/api/v1/admin/tsdb/delete_series?match[]={job="old-job"}
curl -X POST http://localhost:9090/api/v1/admin/tsdb/clean_tombstones
```

## Configuration Files

### Scrape Configurations

The scrape configs are defined in `values.yaml` under `serverFiles.prometheus.yml.scrape_configs`.

### Recording Rules

Add recording rules in `values.yaml` under `serverFiles.recording_rules.yml`:

```yaml
serverFiles:
  recording_rules.yml:
    groups:
      - name: example
        rules:
          - record: job:http_requests:rate5m
            expr: rate(http_requests_total[5m])
```

### Alerting Rules

Add alerting rules in `values.yaml` under `serverFiles.alerting_rules.yml`:

```yaml
serverFiles:
  alerting_rules.yml:
    groups:
      - name: example_alerts
        rules:
          - alert: HighErrorRate
            expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
            for: 10m
            labels:
              severity: warning
            annotations:
              summary: "High error rate detected"
```

## Troubleshooting

### Pods Not Starting

```sh
# Check pod status
kubectl describe pod -n prometheus -l app.kubernetes.io/name=prometheus

# Check logs
kubectl logs -n prometheus -l app.kubernetes.io/name=prometheus --tail=100
```

### Targets Not Being Scraped

1. Check target status: <http://localhost:9090/targets>
2. Verify pod/service annotations
3. Check RBAC permissions
4. Verify network policies

### Storage Issues

```sh
# Check PVC status
kubectl get pvc -n prometheus

# Check events
kubectl get events -n prometheus --sort-by='.lastTimestamp'
```

## Upgrading

To upgrade to a newer version:

1. Check release notes: <https://github.com/prometheus/prometheus/releases>
2. Update the version in the install command
3. Review any breaking changes
4. Run the upgrade:

```sh
helm upgrade prometheus prometheus-community/prometheus \
  --namespace prometheus \
  --rollback-on-failure \
  --version <NEW_VERSION> \
  --values prometheus/values.yaml
```

## Uninstall

```sh
helm uninstall prometheus -n prometheus

# Optionally delete the namespace and PVC
kubectl delete namespace prometheus
```

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Prometheus Helm Chart](https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)

## License

Prometheus is licensed under the Apache License 2.0.
