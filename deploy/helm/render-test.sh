#!/bin/sh
# Render checks for the OpenBTP chart. No cluster access.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
CHART="${ROOT}/deploy/helm/openbtp"
DIGEST="sha256:abababababababababababababababababababababababababababababababab"
COMMON="--namespace openbtp"
ACK="--set capacity.acknowledged=true --set image.repository=example.invalid/openbtp --set image.digest=${DIGEST}"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

echo "== default render must stop on the capacity gate =="
set +e
gate_out=$(helm template openbtp "${CHART}" ${COMMON} 2>&1)
gate_status=$?
set -e
[ "$gate_status" -ne 0 ] || fail "default helm template succeeded"
printf '%s\n' "$gate_out" | grep -q "101%" || fail "capacity message missing"
printf '%s\n' "$gate_out" | grep -q "3 Galera" || fail "capacity message does not keep the 3-member cluster"

echo "== a 1-member database must be refused =="
set +e
one_out=$(helm template openbtp "${CHART}" ${COMMON} ${ACK} --set mariadb.replicas=1 2>&1)
one_status=$?
set -e
[ "$one_status" -ne 0 ] || fail "single replica render succeeded"
printf '%s\n' "$one_out" | grep -q "3-member" || fail "single replica was not rejected as a non-cluster"

echo "== acknowledged render =="
rendered=$(helm template openbtp "${CHART}" ${COMMON} ${ACK})
printf '%s\n' "$rendered" > /tmp/openbtp-rendered.yaml

python3 - "$rendered" << 'PY'
import sys
text = sys.argv[1]
required = [
    "kind: MariaDB",
    "kind: Database",
    "kind: User",
    "kind: Grant",
    "kind: Connection",
    "replicas: 3",
    "enabled: true",
    "sst: mariabackup",
    "antiAffinityEnabled: true",
    "minAvailable: 2",
    "whenDeleted: Retain",
    "whenScaled: Retain",
    "csi-cinder-high-speed-gen2",
    "utf8mb4_unicode_ci",
    "character-set-server=utf8mb4",
    "docker.io/library/mariadb:11.4.13@sha256:d1891ede5a559f1086f55053bb8cc1569b0298338c4d72d71725a7f74f6ba620",
    "PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK",
    "OPENBTP_START_APP",
    "type: ClusterIP",
    "runAsNonRoot: true",
    "runAsUser: 1001",
    "helm.sh/resource-policy: keep",
    "example.invalid/openbtp@sha256:abababababababababababababababababababababababababababababababab",
    "/api/health/live",
    "/api/health/ready",
    "openbtp-db-app",
    "openbtp-db-connection",
    "DATABASE_URL",
    "mysql://{{ .Username }}:{{ .Password }}@{{ .Host }}:{{ .Port }}/{{ .Database }}",
    "cleanupPolicy: Skip",
    "generate: true",
]
for item in required:
    if item not in text:
        raise SystemExit(f"missing rendered content: {item}")
forbidden = [
    "kind: Ingress",
    "kind: Gateway",
    "kind: Secret",
    "kind: ClusterIssuer",
    "stringData:",
    "bootstrapFrom:",
    "cut2d",
    "change_me",
    "NEXTAUTH_SECRET: ",
]
for item in forbidden:
    if item in text:
        raise SystemExit(f"forbidden rendered content: {item}")
if text.count("kind: PersistentVolumeClaim") != 5:
    raise SystemExit("expected 5 application PVCs")
if "replicas: 1" not in text:
    raise SystemExit("application deployment must be a single replica")
print("acknowledged render checks passed")
PY

echo "== gateway render stays namespaced and has no invented host by default =="
set +e
gw_missing=$(helm template openbtp "${CHART}" ${COMMON} ${ACK} --set gateway.enabled=true 2>&1)
gw_status=$?
set -e
[ "$gw_status" -ne 0 ] || fail "gateway without a host rendered"
printf '%s\n' "$gw_missing" | grep -q "gateway.host" || fail "gateway host requirement missing"

gw=$(helm template openbtp "${CHART}" ${COMMON} ${ACK} \
  --set gateway.enabled=true \
  --set gateway.host=openbtp.example.test \
  --set config.publicUrl=https://openbtp.example.test \
  --set gateway.tls.enabled=true \
  --set gateway.tls.email=certs@example.test)
printf '%s\n' "$gw" | grep -q "kind: Gateway" || fail "Gateway missing"
printf '%s\n' "$gw" | grep -q 'gatewayClassName: "eg"' || fail "Gateway class is not eg"
printf '%s\n' "$gw" | grep -q "kind: Issuer" || fail "namespaced Issuer missing"
printf '%s\n' "$gw" | grep -q "kind: HTTPRoute" || fail "HTTPRoute missing"
printf '%s\n' "$gw" | grep -q "kind: ClusterIssuer" && fail "ClusterIssuer must not be rendered"
printf '%s\n' "$gw" | grep -q "kind: Ingress" && fail "Ingress must not be rendered"
printf '%s\n' "$gw" | grep -q "cut2d" && fail "gateway render mentions cut2d"
printf '%s\n' "$gw" | grep -q "name: letsencrypt" && fail "existing ClusterIssuer name was reused"

echo "== helm lint =="
helm lint "${CHART}" ${COMMON} ${ACK} >/tmp/openbtp-helm-lint.txt

echo "render-test passed"
