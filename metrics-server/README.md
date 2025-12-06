# Metrics Server Deployment

This directory contains the Helm values overlay for deploying the official Kubernetes Metrics Server to Docker Desktop.

## Overview

**Metrics Server** collects resource metrics from Kubelets and exposes them via the Kubernetes Metrics API for use by horizontal pod autoscaling (HPA), vertical pod autoscaling (VPA), and the `kubectl top` command.

- **Chart**: `metrics-server/metrics-server`
- **Chart Version**: 3.12.2
- **App Version**: 0.7.2
- **Namespace**: `kube-system`
- **Chart Repository**: <https://artifacthub.io/packages/helm/metrics-server/metrics-server>

## Prerequisites

- Docker Desktop with Kubernetes enabled
- Helm 3.x installed
- `kubectl` configured for `docker-desktop` context

Verify your context:

```sh
kubectl config current-context
# Should output: docker-desktop
```

## Installation

### 1. Add Helm Repository

```sh
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm repo update
```

### 2. Deploy Metrics Server

```sh
helm upgrade metrics-server metrics-server/metrics-server \
  --install \
  --namespace kube-system \
  --rollback-on-failure \
  --version 3.12.2 \
  --values metrics-server/values.yaml
```

### 3. Verify Deployment

```sh
# Check deployment status
kubectl get deployment -n kube-system metrics-server

# Check if pod is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=metrics-server

# Check logs
kubectl logs -n kube-system -l app.kubernetes.io/name=metrics-server --tail=50
```

## Usage

### View Node Metrics

```sh
kubectl top nodes
```

Expected output:

```text
NAME             CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
docker-desktop   500m         6%     2048Mi          25%
```

### View Pod Metrics

```sh
# All pods
kubectl top pods -A

# Specific namespace
kubectl top pods -n traefik
```

### API Metrics Endpoint

The Metrics Server exposes metrics via the Kubernetes API:

```sh
# Node metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes | jq .

# Pod metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods | jq .
```

## Configuration Details

### Docker Desktop Specific Settings

The [values.yaml](values.yaml) file includes Docker Desktop optimizations:

```yaml
# Required: Docker Desktop uses self-signed certificates
args:
  - --kubelet-insecure-tls

# Prometheus integration
metrics:
  enabled: true

service:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "10250"
    prometheus.io/scheme: "https"
```

### Key Features

- ✅ Resource metrics collection (CPU, memory)
- ✅ Kubernetes Metrics API (`kubectl top`)
- ✅ Prometheus metrics integration
- ✅ HPA/VPA support
- ✅ Low resource footprint (100m CPU, 128Mi memory)

## Prometheus Integration

Metrics Server exposes its own operational metrics on port 10250 that Prometheus can scrape.

### Verify Prometheus is Scraping

```sh
# Port-forward to Prometheus
kubectl port-forward -n prometheus service/prometheus-server 9090:80 &

# Check if metrics-server target is up
curl -s 'http://localhost:9090/api/v1/targets' | \
  jq '.data.activeTargets[] | select(.labels.job=="kubernetes-pods") | select(.labels.kubernetes_pod_name | contains("metrics-server"))'

# Query metrics-server metrics
curl -s 'http://localhost:9090/api/v1/query?query=up{job=~".*metrics.*"}' | jq .
```

### Available Metrics

Metrics Server exposes these metrics for monitoring:

- `metrics_server_kubelet_request_duration_seconds` - Latency of kubelet requests
- `metrics_server_kubelet_request_total` - Total kubelet requests
- `process_cpu_seconds_total` - CPU usage of metrics-server
- `process_resident_memory_bytes` - Memory usage

## Troubleshooting

### Metrics Not Available

If `kubectl top nodes` returns an error:

```sh
# Wait for metrics to be collected (takes ~15-60 seconds after deployment)
sleep 60

# Check API service status
kubectl get apiservice v1beta1.metrics.k8s.io

# Should show:
# NAME                     SERVICE                      AVAILABLE
# v1beta1.metrics.k8s.io   kube-system/metrics-server   True
```

### Certificate Issues

If you see TLS verification errors:

```sh
# Verify the --kubelet-insecure-tls flag is set
kubectl get deployment -n kube-system metrics-server -o yaml | grep kubelet-insecure-tls

# Should show:
# - --kubelet-insecure-tls
```

### Check Logs for Errors

```sh
kubectl logs -n kube-system -l app.kubernetes.io/name=metrics-server --tail=100
```

Common issues:

- **"cannot validate certificate"** → Ensure `--kubelet-insecure-tls` is set
- **"no metrics known"** → Wait 15-60 seconds for initial metrics collection
- **"connection refused"** → Check kubelet is running on nodes

## Uninstallation

```sh
helm uninstall metrics-server -n kube-system
```

## Additional Resources

- [Metrics Server GitHub](https://github.com/kubernetes-sigs/metrics-server)
- [Kubernetes Metrics API](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)
- [Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Helm Chart Documentation](https://artifacthub.io/packages/helm/metrics-server/metrics-server)

## Quick Reference

```sh
# Install/Upgrade
helm upgrade metrics-server metrics-server/metrics-server \
  --install \
  --namespace kube-system \
  --rollback-on-failure \
  --version 3.12.2 \
  --values metrics-server/values.yaml

# Status
kubectl get all -n kube-system -l app.kubernetes.io/name=metrics-server

# View node metrics
kubectl top nodes

# View pod metrics
kubectl top pods -A

# Logs
kubectl logs -n kube-system -l app.kubernetes.io/name=metrics-server -f
```
