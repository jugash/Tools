Awesome—here’s a vendor-facing template you can hand out that sets clear expectations for running software on your OpenShift platform, with concrete examples for Vault Secrets Operator, observability (Grafana/Loki/Mimir/Alloy), and cert-manager. Feel free to paste this into your doc tool and tweak names where needed.

⸻

Vendor Integration Guide for OpenShift

Audience: Third-party vendors delivering applications to run on our OpenShift clusters.
Goal: Ensure your software is secure, observable, compliant, and upgrade-friendly on day one.

0) What to deliver (TL;DR)
	•	Artifacts: Container images, Kubernetes/Helm manifests or an Operator (OLM bundle).
	•	Security: Non-root containers, least-privilege RBAC, no privileged/host access, NetworkPolicies.
	•	Secrets: Managed only via Vault Secrets Operator (VSO) (no hardcoded or long-lived secrets).
	•	Certs: TLS issued by cert-manager (we provide ClusterIssuers).
	•	Observability:
	•	Metrics: Prometheus format (/metrics) + ServiceMonitor.
	•	Logs: Structured JSON to stdout/stderr; we collect via Alloy → Loki.
	•	Traces (optional but preferred): OTLP over gRPC.
	•	Dashboards & Alerts: Provide Grafana dashboards + alert rules.
	•	Upgrades/Operations: Health probes, resource requests/limits, graceful secret/cert reloads, zero-downtime where possible.

⸻

1) Platform Assumptions (what you can rely on)
	•	OpenShift 4.x with the restricted-v2 SCC as baseline.
	•	HashiCorp Vault Secrets Operator (VSO) installed cluster-wide.
	•	cert-manager installed with ClusterIssuers (e.g., vault-issuer, adcs-issuer).
	•	Grafana, Loki, Mimir, Alloy (Grafana Agent) for observability.
	•	OpenShift Service CA available for service trust bundles.

⸻

2) Security & Compliance Requirements

2.1 Container & Pod Security
	•	Must run non-root; include in your Pod/Chart:

securityContext:
  runAsNonRoot: true
  allowPrivilegeEscalation: false


	•	Must work with restricted-v2 SCC (no privileged, no hostPath, no CAP_SYS_ADMIN).
	•	Define CPU/Memory requests/limits for every container.
	•	Provide an SBOM and sign images (e.g., cosign). Publish provenance and CVE remediation policy.

2.2 RBAC & Scope
	•	Namespace-scoped install by default; cluster-wide permissions only if strictly required.
	•	Provide explicit RBAC manifests showing subjects, verbs, and resources (no * wildcards).

2.3 Network
	•	Publish required egress/ingress. We enforce NetworkPolicies; include examples.
	•	Support mTLS where applicable.

⸻

3) Secrets Management (Vault Secrets Operator)

Do not ship Kubernetes Secrets with static values. Do use VSO CRDs so our platform can source, rotate, and revoke secrets.

3.1 Pattern Overview
	•	We provide a VaultConnection and VaultAuth (Kubernetes auth) per tenant/namespace.
	•	You declare which Vault paths you need, and how they sync to a K8s Secret or projected file.
	•	Your app must reload creds on rotation (watch files or react to Secret updates).

3.2 Example: Static secret synced to a Kubernetes Secret

apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultStaticSecret
metadata:
  name: app-db-credentials
  namespace: <your-namespace>
spec:
  mount: kv            # Vault mount (e.g., kv)
  path: apps/app-a/db  # Vault path provided by us
  type: kv-v2
  refreshAfter: 1h
  destination:
    create: true
    name: app-db        # K8s Secret name
    overwrite: true
  vaultAuthRef: app-auth
  vaultConnectionRef: platform-vault

Mount it as env vars or, preferably, as a file:

env:
  - name: DB_USERNAME
    valueFrom: { secretKeyRef: { name: app-db, key: username } }
  - name: DB_PASSWORD
    valueFrom: { secretKeyRef: { name: app-db, key: password } }

3.3 Example: Dynamic database credentials (short-lived)

apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultDynamicSecret
metadata:
  name: app-db-dynamic
  namespace: <your-namespace>
spec:
  mount: database
  path: roles/app-reader
  ttl: 30m
  destination:
    create: true
    name: app-db-dyn
    overwrite: true
  vaultAuthRef: app-auth
  vaultConnectionRef: platform-vault

Your app must:
	•	Handle rotation (close old connections, re-dial using new creds).
	•	Expose a /reload endpoint or react to file/Secret changes (SIGHUP or inotify).

⸻

4) Certificates & TLS (cert-manager + OpenShift specifics)

4.1 Service-to-Service TLS (in-cluster)

Request certs via cert-manager; we provide a ClusterIssuer (replace vault-issuer if we assign another).

apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-internal-tls
  namespace: <your-namespace>
spec:
  secretName: app-internal-tls
  duration: 90d
  renewBefore: 30d
  dnsNames:
    - app.<your-namespace>.svc
    - app.<your-namespace>.svc.cluster.local
  issuerRef:
    kind: ClusterIssuer
    name: vault-issuer

Mount into your pod and enable mTLS where supported.

4.2 External Access via OpenShift Route

Prefer reencrypt termination so the router validates your service cert:

apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: app
  namespace: <your-namespace>
spec:
  host: app.example.com
  to: { kind: Service, name: app }
  port: { targetPort: https }
  tls:
    termination: reencrypt
    insecureEdgeTerminationPolicy: Redirect

4.3 Trust bundles via OpenShift Service CA

If your app needs the cluster trust injected:

apiVersion: v1
kind: ConfigMap
metadata:
  name: ca-bundle
  annotations:
    service.beta.openshift.io/inject-cabundle: "true"

Mount this ConfigMap and point your app to the CA path for outbound TLS validation.

⸻

5) Observability Requirements

5.1 Logs (Loki via Alloy)
	•	Write structured JSON to stdout/stderr; one event per line.
	•	Include keys like level, msg, service, env, and—if using tracing—trace_id, span_id.
	•	No PII in logs by default; make sensitive fields maskable via config.

We collect automatically. If you add labels, do so sparingly using pod/namespace labels—avoid high-cardinality values.

5.2 Metrics (Prometheus/Mimir)
	•	Expose Prometheus metrics at :PORT/metrics.
	•	Include standard process/go/runtime metrics if applicable.
	•	Provide a ServiceMonitor:

apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: app
  namespace: <your-namespace>
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: app
  endpoints:
    - port: http-metrics
      interval: 30s
      scheme: http

5.3 Traces (Optional but encouraged)
	•	Support OpenTelemetry OTLP/gRPC export (we provide an in-cluster endpoint).
	•	Propagate W3C trace context (and log trace_id/span_id).

5.4 Dashboards & Alerts
	•	Dashboards: Ship as ConfigMaps (JSON) with labels so our Grafana-sync operator picks them up:

apiVersion: v1
kind: ConfigMap
metadata:
  name: app-dashboard
  labels:
    dashboards.grafana.io/provider: "true"
    app.kubernetes.io/name: app
data:
  app-dashboard.json: |
    { ...Grafana JSON... }


	•	Alerts: Provide PrometheusRule or Grafana Alert JSON with:
	•	SLO/SLA-aligned thresholds
	•	Severity labels (warning, critical)
	•	Runbooks/links in annotations

Example (PrometheusRule):

apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: app-alerts
  namespace: <your-namespace>
spec:
  groups:
    - name: app.slo
      rules:
        - alert: AppHighErrorRate
          expr: rate(http_requests_total{app="app",status=~"5.."}[5m]) / rate(http_requests_total{app="app"}[5m]) > 0.05
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High 5xx error rate"
            runbook_url: "https://vendor.example.com/runbooks/app-high-5xx"


⸻

6) Configuration & Updates

6.1 Liveness/Readiness/Startup Probes

Provide realistic probes:

livenessProbe:  { httpGet: { path: /healthz, port: 8080 }, initialDelaySeconds: 30, periodSeconds: 10 }
readinessProbe: { httpGet: { path: /readyz,  port: 8080 }, initialDelaySeconds: 10, periodSeconds: 5 }

6.2 Rolling Updates & Zero-Downtime
	•	Support rolling upgrades and HPA (expose CPU/memory or custom metrics).
	•	Ensure config/secret hot-reload without restarts where possible (SIGHUP or file watcher).

6.3 Storage
	•	Declare PVCs with access modes and performance expectations (RWO/RWX; IOPS/throughput).
	•	Support graceful startup if PVC not instantly bound; perform schema migrations safely.

⸻

7) Delivery Options

Option A: Helm Chart (preferred for apps)
	•	Values for all endpoints (DB, cache, external APIs) must be sourced via VSO or config referencing VSO-synced Secrets.
	•	Provide values.yaml with sane defaults and a values-platform.yaml example.

Option B: Operator (for complex lifecycles)
	•	Provide an OLM bundle (CSV, CRDs) with namespace scope by default.
	•	No cluster-admin requirements unless justified; document finalizers & upgrade strategy.

⸻

8) Non-Functional Requirements & SLIs/SLOs
	•	Availability targets and expected RTO/RPO.
	•	Performance baselines (QPS, p95 latency, memory footprint).
	•	Data handling (PII, retention, encryption at rest/in transit).
	•	Backup/restore procedures (what needs backup; how to rehydrate).

⸻

9) Acceptance Checklist (vendor must confirm)

Security
	•	Runs as non-root, passes restricted-v2.
	•	Least-privilege RBAC; NetworkPolicies provided.
	•	Images signed; SBOM available.

Secrets
	•	All secrets declared via VSO (Static/Dynamic/PKI as applicable).
	•	Application reloads creds on rotation (documented).

TLS
	•	Certificates requested via cert-manager; Route uses edge/reencrypt as specified.
	•	Trust bundle injection handled if needed.

Observability
	•	/metrics exposed; ServiceMonitor included.
	•	JSON logs with level and (if tracing) trace_id/span_id.
	•	OTLP traces supported (optional).
	•	Grafana dashboards + alert rules delivered with runbooks.

Operations
	•	Probes defined; resource requests/limits set.
	•	Rolling updates validated; HPA optional config provided.
	•	PVC/storage documented; migrations safe & idempotent.

Docs
	•	Install/upgrade/rollback guide.
	•	Configuration matrix (all tunables, defaults, security implications).
	•	Support boundaries and contact/escalation paths.

⸻

10) Values & Endpoints (fill-in template)
	•	Namespace: __________
	•	Service Ports: HTTP ____, Metrics ____, gRPC ____
	•	External Route hostnames: __________
	•	Vault paths required:
	•	kv/apps/____/db
	•	database/roles/____
	•	pki/issue/____
	•	OTLP endpoint used: otel-collector.observability.svc:4317
	•	Dashboards included: app-overview.json, app-latency.json
	•	Alerts included: AppHighErrorRate, AppLatencySLOBurn

⸻

11) Example Deployment (putting it together)

apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  labels: { app.kubernetes.io/name: app }
spec:
  replicas: 3
  selector: { matchLabels: { app.kubernetes.io/name: app } }
  template:
    metadata:
      labels: { app.kubernetes.io/name: app }
    spec:
      containers:
        - name: app
          image: vendor/app:1.0.0
          ports:
            - name: http
              containerPort: 8080
            - name: http-metrics
              containerPort: 9090
          env:
            - name: DB_USERNAME
              valueFrom: { secretKeyRef: { name: app-db-dyn, key: username } }
            - name: DB_PASSWORD
              valueFrom: { secretKeyRef: { name: app-db-dyn, key: password } }
          volumeMounts:
            - name: tls
              mountPath: /etc/tls
              readOnly: true
          livenessProbe:  { httpGet: { path: /healthz, port: 8080 }, initialDelaySeconds: 30 }
          readinessProbe: { httpGet: { path: /readyz,  port: 8080 }, initialDelaySeconds: 10 }
          resources:
            requests: { cpu: "200m", memory: "256Mi" }
            limits:   { cpu: "1",    memory: "512Mi" }
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
      volumes:
        - name: tls
          secret:
            secretName: app-internal-tls


⸻

12) What we need from you (before we onboard)
	1.	Completed Acceptance Checklist.
	2.	Final Helm chart/Operator bundle with versioned images.
	3.	Dashboards + alert rules and runbooks.
	4.	Security artifacts: SBOM, image signatures, CVE disclosure notes.
	5.	A 1-page operational summary (failure modes, scaling guidance, tuning knobs).

⸻

If you’d like, I can drop this into a Word/Google Docs layout and tailor the defaults (issuer names, OTLP endpoint, Vault paths, labels) to your exact cluster conventions.
