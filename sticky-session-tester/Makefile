.PHONY: build deploy test clean help hosts status logs

IMAGE_NAME := sticky-session-tester
IMAGE_TAG := latest

help:
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
	kubectl apply -f kubernetes/ingressroute-roundrobin.yaml
	kubectl apply -f kubernetes/ingressroute-clientip.yaml
	kubectl apply -f kubernetes/ingressroute-cookie.yaml

hosts: ## Add /etc/hosts entries
	@echo "Adding hosts entries (requires sudo)..."
	@[ -s /etc/hosts ] && [ -z "$$(tail -c1 /etc/hosts)" ] || echo "" | sudo tee -a /etc/hosts > /dev/null
	@grep -q "roundrobin.localhost" /etc/hosts || echo "127.0.0.1 roundrobin.localhost" | sudo tee -a /etc/hosts > /dev/null
	@grep -q "clientip.localhost" /etc/hosts || echo "127.0.0.1 clientip.localhost" | sudo tee -a /etc/hosts > /dev/null
	@grep -q "cookie.localhost" /etc/hosts || echo "127.0.0.1 cookie.localhost" | sudo tee -a /etc/hosts > /dev/null
	@echo "✓ Hosts entries added"
	@echo "Note: clientip.localhost demonstrates the LIMITATION (use port-forward to see it working)"

test: ## Run tests against deployed application
	@echo "Testing Round-Robin..."
	@for i in 1 2 3 4 5; do curl -s http://roundrobin.localhost/app/api/info | jq -r .podName; done
	@echo "\nTesting ClientIP Affinity (via Traefik - shows limitation)..."
	@for i in 1 2 3 4 5; do curl -s http://clientip.localhost/app/api/info | jq -r .podName; done
	@echo "\nTesting ClientIP Affinity (direct via port-forward - shows it works)..."
	@kubectl port-forward -n sticky-session-tester service/sticky-tester-clientip 9090:80 >/dev/null 2>&1 & \
	PF_PID=$$!; \
	sleep 2; \
	for i in 1 2 3 4 5; do curl -s http://localhost:9090/sticky-app/api/info | jq -r .podName; done; \
	kill $$PF_PID 2>/dev/null || true
	@echo "\nTesting Cookie Affinity..."
	@curl -c /tmp/cookies.txt -s http://cookie.localhost/app/api/info | jq -r .podName
	@for i in 2 3 4 5; do curl -b /tmp/cookies.txt -s http://cookie.localhost/app/api/info | jq -r .podName; done

status: ## Check deployment status
	@echo "Pods:"
	@kubectl get pods -n sticky-session-tester
	@echo "\nServices:"
	@kubectl get svc -n sticky-session-tester
	@echo "\nIngressRoutes:"
	@kubectl get ingressroute -n sticky-session-tester
	@echo "\nMiddleware:"
	@kubectl get middleware -n sticky-session-tester

logs: ## Tail logs from all pods
	kubectl logs -n sticky-session-tester -l app=sticky-session-tester --tail=50 -f

clean: ## Delete Kubernetes resources
	kubectl delete namespace sticky-session-tester

rebuild: clean build deploy ## Clean, rebuild, and redeploy

all: build deploy hosts test ## Build, deploy, configure hosts, and test
