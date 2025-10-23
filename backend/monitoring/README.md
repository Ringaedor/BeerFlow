# BeerFlow Monitoring Stack

Complete monitoring solution for BeerFlow Phase 2 stock operations and business metrics.

## Overview

This monitoring stack includes:

- **Prometheus**: Time-series database for metrics collection
- **Grafana**: Visualization dashboards for operational insights
- **AlertManager**: Alert routing and notification management
- **Node Exporter**: System-level metrics

## Quick Start

### 1. Start the Monitoring Stack

```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Verify Services

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (username: `admin`, password: `admin`)
- **AlertManager**: http://localhost:9093

### 3. Start BeerFlow API

The API must be running for metrics to be collected:

```bash
cd ..
npm run start:prod
```

The API will expose metrics at: http://localhost:3000/metrics

### 4. Access Grafana Dashboard

1. Open http://localhost:3001
2. Login with `admin` / `admin`
3. The "BeerFlow - Stock Operations & Business Metrics" dashboard will be automatically provisioned
4. Navigate to Dashboards → BeerFlow

## Metrics Collected

### Stock Operation Metrics

- `beerflow_stock_movements_total`: Total stock movements (labeled by venue, type, status)
- `beerflow_stock_movement_duration_ms`: Stock movement operation latency
- `beerflow_stock_movement_errors_total`: Stock movement errors (labeled by error type)

### FEFO Algorithm Metrics

- `beerflow_fefo_allocations_total`: Total FEFO allocations
- `beerflow_fefo_allocation_duration_ms`: FEFO allocation latency
- `beerflow_fefo_allocation_errors_total`: FEFO allocation failures

### Product Query Metrics

- `beerflow_product_queries_total`: Total product queries
- `beerflow_product_query_duration_ms`: Product query latency

### Business KPI Metrics

- `beerflow_current_stock_level`: Current stock level per product
- `beerflow_low_stock_products_count`: Number of products below minimum stock
- `beerflow_total_product_value_eur`: Total inventory value in EUR

### Health Check Metrics

- `beerflow_health_check_duration_ms`: Health check operation latency

## Grafana Dashboard

The automatically provisioned dashboard includes:

### Performance Panels

- **Stock Movements Operations/sec**: Real-time throughput
- **Stock Movement Duration (p95, p99)**: Latency percentiles with thresholds
  - WARNING: 100ms
  - CRITICAL: 200ms
- **FEFO Allocation Duration**: FEFO algorithm performance
  - WARNING: 200ms
  - CRITICAL: 500ms
- **Product Query Performance**: Query latency monitoring
  - WARNING: 50ms
  - CRITICAL: 100ms

### Business Metrics Panels

- **Current Stock Levels**: Table view of all products
- **Low Stock Alert Count**: Number of products requiring restock
- **Total Inventory Value**: Current inventory value in EUR
- **Stock Movement Success Rate**: Gauge showing operation reliability

### Error Tracking

- **Stock Movement Errors**: Error rate over time
- **FEFO Allocation Failures**: FEFO-specific error tracking

## Alerting

### Alert Rules

Alerts are defined in `alerts.yml` and cover:

#### Performance Alerts

- **HighStockMovementLatency**: p95 > 200ms for 5 minutes
- **CriticalStockMovementLatency**: p95 > 500ms for 2 minutes
- **HighFEFOAllocationLatency**: p95 > 500ms for 5 minutes
- **CriticalFEFOAllocationLatency**: p95 > 1000ms for 2 minutes
- **HighProductQueryLatency**: p95 > 100ms for 5 minutes

#### Error Rate Alerts

- **HighStockMovementErrorRate**: Error rate > 5% for 5 minutes
- **CriticalStockMovementErrorRate**: Error rate > 10% for 2 minutes
- **FEFOAllocationFailures**: FEFO errors > 0.1/sec for 5 minutes

#### Business Alerts

- **HighLowStockCount**: > 10 products below minimum (info)
- **CriticalLowStockCount**: > 20 products below minimum (warning)

#### System Alerts

- **BeerFlowAPIDown**: API unavailable for 1 minute
- **HealthCheckFailing**: Health check latency > 200ms

### Alert Severity Levels

- **Critical**: Immediate action required, potential business impact
- **Warning**: Action required within hours
- **Info**: Informational, monitor for trends

### Configuring Notifications

Edit `alertmanager.yml` to configure notification channels:

#### Email Notifications

```yaml
email_configs:
  - to: 'ops-team@beerflow.com'
    subject: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
```

#### Slack Notifications

```yaml
slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    channel: '#alerts-critical'
    title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
```

#### PagerDuty Integration

```yaml
pagerduty_configs:
  - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
    description: '{{ .GroupLabels.alertname }}: {{ .Annotations.summary }}'
```

## Production Deployment

### 1. Update Prometheus Configuration

Edit `prometheus.yml` to point to production endpoints:

```yaml
scrape_configs:
  - job_name: 'beerflow-api'
    static_configs:
      - targets:
          - 'production-api.beerflow.com:3000'
```

### 2. Configure AlertManager

Update `alertmanager.yml` with production notification channels (email, Slack, PagerDuty).

### 3. Secure Grafana

```yaml
environment:
  - GF_SECURITY_ADMIN_PASSWORD=<strong-password>
  - GF_SERVER_ROOT_URL=https://monitoring.beerflow.com
```

### 4. Enable TLS/HTTPS

Use a reverse proxy (nginx, Traefik) to add TLS:

```nginx
server {
    listen 443 ssl;
    server_name monitoring.beerflow.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
    }
}
```

### 5. Data Retention

Configure in `prometheus.yml`:

```yaml
command:
  - '--storage.tsdb.retention.time=30d'  # Keep metrics for 30 days
  - '--storage.tsdb.retention.size=10GB' # Maximum 10GB storage
```

## Kubernetes Deployment

For Kubernetes, use the Prometheus Operator and Grafana Operator:

```bash
# Install Prometheus Operator
helm install prometheus prometheus-community/kube-prometheus-stack

# Deploy BeerFlow ServiceMonitor
kubectl apply -f k8s/service-monitor.yml
```

## Troubleshooting

### Metrics Not Appearing

1. Verify API is running: `curl http://localhost:3000/metrics`
2. Check Prometheus targets: http://localhost:9090/targets
3. Verify docker network connectivity

### Grafana Dashboard Not Loading

1. Check datasource: Grafana → Configuration → Data Sources
2. Verify Prometheus URL: http://prometheus:9090
3. Test connection

### Alerts Not Firing

1. Check AlertManager status: http://localhost:9093
2. Verify alert rules: http://localhost:9090/alerts
3. Check AlertManager logs: `docker logs beerflow-alertmanager`

### High Memory Usage

Reduce Prometheus retention or increase container limits:

```yaml
deploy:
  resources:
    limits:
      memory: 2Gi
```

## Maintenance

### Backup Grafana Dashboards

```bash
docker exec beerflow-grafana grafana-cli admin export-dashboard > backup.json
```

### View Logs

```bash
docker logs beerflow-prometheus
docker logs beerflow-grafana
docker logs beerflow-alertmanager
```

### Reload Prometheus Configuration

```bash
curl -X POST http://localhost:9090/-/reload
```

## Performance Tuning

### Scrape Interval

Adjust based on load:

```yaml
global:
  scrape_interval: 15s  # Default
  # scrape_interval: 30s  # For high-load scenarios
```

### Query Optimization

Use recording rules for expensive queries:

```yaml
groups:
  - name: beerflow_recording_rules
    interval: 30s
    rules:
      - record: job:beerflow_stock_movements:rate5m
        expr: rate(beerflow_stock_movements_total[5m])
```

## Support

For issues or questions:

- Documentation: [BeerFlow Docs](https://docs.beerflow.com)
- GitHub Issues: https://github.com/beerflow/beerflow/issues
- Email: support@beerflow.com

## License

MIT License - see LICENSE file for details
