# Language Glossary App

A beautiful, interactive language learning application built with React. Students can test their language skills by translating words from English to Spanish, with instant feedback and a comprehensive results summary.

## Features

- 🌍 Interactive word translation testing (10 words per session)
- ✨ Beautiful gradient UI with smooth animations
- ✓ Instant feedback on answers with visual indicators
- 📊 Comprehensive summary page with scoring and grading
- ⏱️ Time tracking for completion
- 📱 Fully responsive design
- 🎨 Cool CSS styling with glassmorphism effects

## Architecture

This application follows the repository's values overlay pattern:

- **React Frontend**: Built with React 18 and modern CSS
- **Nginx Server**: Serves the static build with optimized configuration
- **Docker**: Multi-stage build for minimal image size
- **Kubernetes**: Deployed to default namespace with Traefik IngressRoute
- **Local Development**: Uses `imagePullPolicy: Never` for local Docker images

## Prerequisites

- Docker Desktop with Kubernetes enabled
- Traefik reverse proxy deployed (see [../traefik/README.md](../traefik/README.md))
- kubectl configured for docker-desktop context
- Node.js 18+ (for local development)

## Quick Start

### 1. Build the Docker Image

```sh
cd language-glossary

# Build the Docker image locally
docker build -t language-glossary:latest .

# Verify the image was created
docker images | grep language-glossary
```

### 2. Deploy to Kubernetes

```sh
# Deploy the application
kubectl apply -f deployment.yaml

# Deploy the IngressRoute for Traefik access
kubectl apply -f ingressroute.yaml

# Check deployment status
kubectl get pods -l app=language-glossary
kubectl get svc language-glossary
kubectl get ingressroute language-glossary
```

### 3. Add Hosts Entry

```sh
# Add glossary.localhost to /etc/hosts
echo "127.0.0.1 glossary.localhost" | sudo tee -a /etc/hosts
```

### 4. Access the Application

Open your browser and navigate to:

```
http://glossary.localhost
```

## Development

### Local Development (without Docker)

```sh
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm start

# Build for production
npm run build
```

### Testing the Docker Build Locally

```sh
# Build the image
docker build -t language-glossary:latest .

# Run locally on port 8080
docker run -p 8080:80 language-glossary:latest

# Test in browser
open http://localhost:8080
```

## Project Structure

```text
language-glossary/
├── public/
│   └── index.html              # HTML template
├── src/
│   ├── components/
│   │   ├── WordTest.js         # Word testing component
│   │   ├── WordTest.css        # Word test styles
│   │   ├── Summary.js          # Results summary component
│   │   └── Summary.css         # Summary styles
│   ├── App.js                  # Main application component
│   ├── App.css                 # Main app styles
│   ├── index.js                # React entry point
│   └── index.css               # Global styles
├── deployment.yaml             # Kubernetes Deployment and Service
├── ingressroute.yaml           # Traefik IngressRoute configuration
├── Dockerfile                  # Multi-stage Docker build
├── nginx.conf                  # Nginx server configuration
├── .dockerignore               # Docker ignore rules
├── package.json                # NPM dependencies
└── README.md                   # This file
```

## How It Works

### Application Flow

1. **Start**: User sees the first word in English (e.g., "hello")
2. **Input**: User types the Spanish translation in the input field
3. **Check**: User submits their answer
4. **Feedback**: Instant visual feedback (correct ✓ or incorrect ✗)
5. **Progress**: Continue through all 10 words
6. **Summary**: View comprehensive results with:
   - Grade (A+ to F) with emoji
   - Score (correct/total)
   - Percentage
   - Time taken
   - Detailed review of all answers

### Word Validation

The app normalizes both user input and correct answers:
- Converts to lowercase
- Trims whitespace
- Removes accents (for comparison only)

This allows flexible matching (e.g., "adiós" matches "adios").

## Kubernetes Configuration

### Deployment

- **Namespace**: default
- **Replicas**: 1
- **Image Pull Policy**: Never (uses local Docker image)
- **Resources**:
  - Requests: 100m CPU, 128Mi memory
  - Limits: 200m CPU, 256Mi memory
- **Health Checks**:
  - Liveness probe on `/health` endpoint
  - Readiness probe on `/health` endpoint

### Service

- **Type**: ClusterIP
- **Port**: 80
- **Target Port**: 80

### IngressRoute

- **Host**: `glossary.localhost`
- **Entry Point**: web (HTTP)
- **Backend**: language-glossary service on port 80

## Verification

### Check Deployment Status

```sh
# Check all resources
kubectl get all -l app=language-glossary

# Check pod logs
kubectl logs -l app=language-glossary --tail=50

# Describe pod for detailed info
kubectl describe pod -l app=language-glossary
```

### Test Connectivity

```sh
# Test service endpoint (via port-forward)
kubectl port-forward service/language-glossary 8080:80 &
curl http://localhost:8080/health

# Test via Traefik
curl -I http://glossary.localhost

# View in Traefik dashboard
# Visit: http://traefik.localhost/dashboard/#/http/routers
```

### Test in Browser

1. Navigate to: http://glossary.localhost
2. Should see the Language Glossary welcome screen
3. Translate the first word and click "Check Answer"
4. Complete all 10 words to see the summary page

## Troubleshooting

### Pod Not Starting

```sh
# Check pod status
kubectl get pods -l app=language-glossary

# View pod logs
kubectl logs -l app=language-glossary --tail=100

# Describe pod for events
kubectl describe pod -l app=language-glossary
```

**Common Issues**:
- Image not found: Ensure Docker image is built locally (`docker images`)
- ImagePullBackOff: Verify `imagePullPolicy: Never` in deployment.yaml
- CrashLoopBackOff: Check application logs

### Cannot Access via Browser

```sh
# Verify hosts entry
cat /etc/hosts | grep glossary.localhost

# Check IngressRoute
kubectl get ingressroute language-glossary -o yaml

# Check Traefik is running
kubectl get pods -n traefik

# Test service directly
kubectl port-forward service/language-glossary 8080:80
curl http://localhost:8080
```

### Rebuilding After Code Changes

```sh
# Rebuild Docker image
docker build -t language-glossary:latest .

# Delete existing pod to force recreation
kubectl delete pod -l app=language-glossary

# Wait for new pod to start
kubectl get pods -l app=language-glossary -w
```

## Updating the Application

### Change Word List

Edit [src/App.js](src/App.js) and modify the `WORD_LIST` constant:

```javascript
const WORD_LIST = [
  { english: 'new word', spanish: 'nueva palabra' },
  // ... add 9 more words
];
```

### Modify Styling

- Main app styles: [src/App.css](src/App.css)
- Word test styles: [src/components/WordTest.css](src/components/WordTest.css)
- Summary styles: [src/components/Summary.css](src/components/Summary.css)

After changes, rebuild and redeploy:

```sh
# Rebuild
docker build -t language-glossary:latest .

# Restart deployment
kubectl rollout restart deployment/language-glossary

# Watch rollout status
kubectl rollout status deployment/language-glossary
```

## Uninstalling

```sh
# Delete Kubernetes resources
kubectl delete -f ingressroute.yaml
kubectl delete -f deployment.yaml

# Remove hosts entry
sudo sed -i '' '/glossary.localhost/d' /etc/hosts

# (Optional) Remove Docker image
docker rmi language-glossary:latest
```

## Integration with Monitoring

The application is automatically discoverable by Prometheus (if deployed):

- Nginx exposes basic metrics
- Kubernetes service discovery will detect the pod
- Health endpoint available at `/health`

To view in Grafana (if deployed):
1. Visit: http://grafana.localhost
2. Navigate to Kubernetes dashboards
3. Filter by namespace: default
4. View language-glossary pod metrics

## Performance

- **Build Size**: ~50MB (nginx:alpine + static files)
- **Memory Usage**: ~30-50MB runtime
- **Startup Time**: ~2-3 seconds
- **Response Time**: <100ms for static assets

## Security

- SPA routing configured in nginx
- Security headers enabled (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- Gzip compression enabled
- Static asset caching (1 year)
- Health check endpoint exposed
- No sensitive data stored

## Future Enhancements

- [ ] Add multiple language pairs (French, German, Italian)
- [ ] User authentication and progress tracking
- [ ] Backend API for dynamic word lists
- [ ] Leaderboard and scoring system
- [ ] Audio pronunciation support
- [ ] Difficulty levels (beginner, intermediate, advanced)
- [ ] Spaced repetition algorithm
- [ ] Mobile app version

## Resources

- React Documentation: https://react.dev/
- Traefik IngressRoute: https://doc.traefik.io/traefik/routing/providers/kubernetes-crd/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Docker Multi-stage Builds: https://docs.docker.com/build/building/multi-stage/

## License

This is a demonstration application for educational purposes.
