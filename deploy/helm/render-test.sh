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
printf '%s\n' "$gate_out" | grep -q "capacity.acknowledged=true" || fail "capacity acknowledgement instruction missing"

echo "== Galera with one member must be refused =="
set +e
one_out=$(helm template openbtp "${CHART}" ${COMMON} ${ACK} --set mariadb.replicas=1 2>&1)
one_status=$?
set -e
[ "$one_status" -ne 0 ] || fail "Galera with one replica rendered"
printf '%s\n' "$one_out" | grep -q "3-member" || fail "Galera with one replica was not rejected"

echo "== standalone with three members must be refused =="
set +e
many_out=$(helm template openbtp "${CHART}" ${COMMON} ${ACK} --set mariadb.galera.enabled=false --set mariadb.replicas=3 2>&1)
many_status=$?
set -e
[ "$many_status" -ne 0 ] || fail "standalone with three replicas rendered"
printf '%s\n' "$many_out" | grep -q "one member" || fail "standalone replica rule missing"

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

echo "== gateway without a host must be refused =="
set +e
gw_missing=$(helm template openbtp "${CHART}" ${COMMON} ${ACK} --set gateway.enabled=true 2>&1)
gw_status=$?
set -e
[ "$gw_status" -ne 0 ] || fail "gateway without a host rendered"
printf '%s\n' "$gw_missing" | grep -q "gateway.host" || fail "gateway host requirement missing"

echo "== cl01 values select one standalone member and keep the Gateway =="
cl01=$(helm template openbtp "${CHART}" ${COMMON} --values "${CHART}/values-cl01.yaml")
printf '%s\n' "$cl01" | grep -q "ghcr.io/romainlaisne/openbtp:82562f97a5706e5ecb9206aa321edc3c73e7c244@sha256:11e34ef46675a1114938d9558ed4093cae70fe9c4519ea6fa5e700e0773b3fa6" || fail "cl01 image is not the verified digest"
printf '%s\n' "$cl01" | grep -q "name: openbtp-gateway" || fail "cl01 Gateway name drifted"
printf '%s\n' "$cl01" | grep -q "openbtp.cut-api.com" || fail "cl01 host missing"
python3 - "$cl01" << 'PY'
import sys
text = sys.argv[1]
start = text.find("kind: Gateway")
end = text.find("---", start + 1)
block = text[start:end if end != -1 else None]
if "hostname:" in block:
    raise SystemExit("HTTP Gateway listener must not set hostname; the live listener has none")
if "name: http" not in block or "port: 80" not in block:
    raise SystemExit("HTTP listener on port 80 is missing")
print("live HTTP listener shape preserved")
PY
printf '%s\n' "$cl01" | grep -q 'gatewayClassName: "eg"' || fail "cl01 Gateway class is not eg"
printf '%s\n' "$cl01" | grep -q "kind: Issuer" || fail "cl01 namespaced Issuer missing"
printf '%s\n' "$cl01" | grep -q "kind: Certificate" || fail "cl01 Certificate missing"
printf '%s\n' "$cl01" | grep -q "email:" && fail "cl01 Issuer invented an ACME email"
printf '%s\n' "$cl01" | grep -q "RequestRedirect" && fail "HTTP redirects to HTTPS before the certificate exists"
printf '%s\n' "$cl01" | grep -q "protocol: HTTPS" && fail "HTTPS listener is attached before the certificate exists"
printf '%s\n' "$cl01" | grep -q "replicas: 1" || fail "cl01 database is not one member"
printf '%s\n' "$cl01" | grep -q "replicas: 3" && fail "cl01 still renders three database members"
printf '%s\n' "$cl01" | grep -q "sst: mariabackup" && fail "cl01 still renders Galera SST"
printf '%s\n' "$cl01" | grep -q "minAvailable: 2" && fail "cl01 PDB still requires two members"
printf '%s\n' "$cl01" | grep -q "minAvailable: 0" || fail "cl01 PDB minAvailable is not 0"
printf '%s\n' "$cl01" | grep -q "antiAffinityEnabled: true" || fail "cl01 dropped immutable antiAffinityEnabled"
printf '%s\n' "$cl01" | grep -q "antiAffinityEnabled: false" && fail "cl01 sets immutable antiAffinityEnabled to false"
printf '%s\n' "$cl01" | grep -q 'serviceName: "openbtp-mariadb"' || fail "cl01 Connection does not use the base Service"
printf '%s\n' "$cl01" | grep -q "openbtp-mariadb-primary" && fail "cl01 Connection still targets the primary Service"
printf '%s\n' "$cl01" | grep -q 'secretName: "openbtp-db-connection"' || fail "connection Secret name changed"
printf '%s\n' "$cl01" | grep -q "PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK" && fail "standalone migration still disables advisory locks"
python3 - "$cl01" << 'PY'
import sys
text = sys.argv[1]
start = text.find("kind: MariaDB")
end = text.find("---", start + 1)
block = text[start:end if end != -1 else None]
if "enabled: false" not in block:
    raise SystemExit("MariaDB Galera is not explicitly disabled")
if "replicas: 1" not in block:
    raise SystemExit("MariaDB replicas is not 1")
print("standalone MariaDB spec selected")
PY
printf '%s\n' "$cl01" | grep -q "kind: ClusterIssuer" && fail "ClusterIssuer must not be rendered"
printf '%s\n' "$cl01" | grep -q "name: letsencrypt" && fail "existing ClusterIssuer name was reused"
printf '%s\n' "$cl01" | grep -q "cut2d" && fail "cl01 render mentions cut2d"

echo "== gateway-only stage renders without an application image =="
stage=$(helm template openbtp "${CHART}" ${COMMON} --values "${CHART}/values-cl01-gateway.yaml")
printf '%s\n' "$stage" | grep -q "kind: Gateway" || fail "gateway stage has no Gateway"
printf '%s\n' "$stage" | grep -q "kind: MariaDB" && fail "gateway stage created MariaDB"
printf '%s\n' "$stage" | grep -q "kind: Deployment" && fail "gateway stage created the application"
printf '%s\n' "$stage" | grep -q "example.invalid" && fail "gateway stage references a fixture image"
printf '%s\n' "$stage" | grep -q "openbtp.cut-api.com" || fail "gateway stage host missing"
printf '%s\n' "$stage" > /tmp/openbtp-gateway-stage.yaml

echo "== helm lint =="
helm lint "${CHART}" ${COMMON} ${ACK} >/tmp/openbtp-helm-lint.txt
helm lint "${CHART}" ${COMMON} --values "${CHART}/values-cl01-gateway.yaml" >/tmp/openbtp-helm-lint-gateway.txt

echo "render-test passed"
