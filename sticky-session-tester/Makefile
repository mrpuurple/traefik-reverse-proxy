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
