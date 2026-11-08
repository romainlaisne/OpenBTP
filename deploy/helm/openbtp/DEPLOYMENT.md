# OpenBTP on cl01

Sanitized deployment guide. No passwords, tokens, or kubeconfig.

Release name `openbtp`, namespace `openbtp`. MariaDB object `openbtp-mariadb`.
These names do not match the namespaces or Helm releases observed on 8 November 2026.
Do not change the `cut2d` database, the operator, or the CRDs. That database was `Ready=False` / `Updating` during discovery and is out of scope.

This environment did not deploy anything.

## Capacity gate

Workers were at about 2008Mi, 1805Mi, and 1603Mi of roughly 1976Mi allocatable (101%, 91%, 81%). Existing memory requests were already 1200Mi, 1406Mi, and 1586Mi. Limits on the third node were over 100%. Pods with no requests do not make that free memory.

A default install asks for about:

| Piece | Requests |
| --- | --- |
| 3 MariaDB members | 3 × 100m CPU, 3 × 256Mi |
| 3 Galera agents | 3 × 50m CPU, 3 × 64Mi |
| OpenBTP | 200m CPU, 512Mi |
| Total | about 650m CPU and 1472Mi |

Limits are higher (1Gi per database member, 1536Mi for the application). Scheduling uses requests, so those limits can still overcommit a node. The database figures are the starting values from discovery. The chart renders only a 3-member Galera cluster; any other shape fails the template.

`capacity.acknowledged` defaults to `false`, and `helm template` / `helm install` stop until it is `true`. Set it only after the capacity decision. A new Gateway is off because its Envoy data plane requests about 544Mi on the current installation.

## Application image

Published and verified on 8 November 2026. GitHub Actions run `42476932656` pushed a public package. An anonymous registry pull returned this digest:

`ghcr.io/romainlaisne/openbtp@sha256:11e34ef46675a1114938d9558ed4093cae70fe9c4519ea6fa5e700e0773b3fa6`

Tag `82562f97a5706e5ecb9206aa321edc3c73e7c244` points at the same manifest. The package visibility is public, so namespace `openbtp` does not need a pull Secret and must not copy one from another namespace. `values-cl01.yaml` pins that digest. The chart still rejects a missing or malformed digest. `example.invalid/openbtp` remains a render fixture only.

The workflow is `.github/workflows/app-image.yml`. It logs in with `GITHUB_TOKEN` and does not receive registry credentials from this environment. Later builds run when the image inputs change. `deploy/docker/build-app-image.sh` still builds locally and does not push.

`NEXT_PUBLIC_APP_URL` is baked into the browser bundle at build time. Server-side links read `APP_PUBLIC_URL`, then `NEXTAUTH_URL`. Leave the build arg empty until a public hostname exists.

## Database compatibility

Prisma ORM 6.14 uses `provider = mysql`. Prisma 6 documents MariaDB 10.0+ and 11.0+. It does not document MariaDB 12. The image is therefore:

`docker.io/library/mariadb:11.4.13@sha256:d1891ede5a559f1086f55053bb8cc1569b0298338c4d72d71725a7f74f6ba620`

11.4.13 is the 11.4 LTS patch whose index digest was read from Docker Hub on 8 November 2026. The operator accepts an official `mariadb` image with a tag and a digest. The compose file in this repo runs 10.11, which is inside the same Prisma matrix and is older. The other database on cl01 runs `mariadb:12.3.3`. That tag was not copied: it is outside the documented Prisma matrix, and 11.4 changes the default utf8mb4 collation to `utf8mb4_uca1400_ai_ci`. The chart forces `utf8mb4` / `utf8mb4_unicode_ci`, which is what `prisma/migrations` creates.

Checked against the schema and migrations:

- `utf8mb4_unicode_ci`, `DATETIME(3)`, MySQL enums, `LongText`, and `Json` are valid on MariaDB 11.4. JSON is a LONGTEXT alias there. Prisma migrations name the charset and collation, so they do not inherit the 11.4 default.
- The application is one process. Point it at the primary Service `openbtp-mariadb-primary`, not the Service that balances every member.
- Galera rejects `GET_LOCK()` (MariaDB MDEV-30473, from 10.11.3 onward). `prisma migrate deploy` uses that lock. The migration init container sets `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1` (supported since Prisma 5.3). Do not run two migrations at once.
- Galera rejects `LOCK TABLES`. The bundled backup already uses `--single-transaction --lock-tables=false`. The chart sets `BACKUP_INCLUDE_ROUTINES=false` because the application user is not granted on the `mysql` schema. Prisma does not create stored routines.
- Session time zone is UTC because Prisma treats `DateTime` as UTC. The application container uses `TZ=Europe/Brussels` for its own clocks. Cron expressions in the process already pass `Europe/Brussels`.
- TLS on the server is enabled with the operator's own self-signed CA. `tls.required` is false, so Prisma can connect without a client certificate. No cert-manager issuer is referenced for the database, and the `mutual` field is not set because it is not in the installed 26.10.2 CRD.
- InnoDB buffer pool is pinned at 128M so a 1Gi memory limit is less likely to be overrun. That is a memory compromise, not a tuning result.
- Do not copy `bootstrapFrom` or any backup object from the existing database.

The SQL user `openbtp` is created by a `User` resource and granted only on database `openbtp`, table `*`, host `%`, `grantOption: false`. `MariaDB.spec.username` is unset so the operator does not also create an initial user with all privileges. `cleanupPolicy: Skip` so deleting the custom resources does not drop the database or the user. Root credentials are generated by the operator into Secret `openbtp-mariadb-root` when that Secret is absent. Never point that reference at another application's Secret.

The application password Secret must already exist. The operator inserts the password into `DATABASE_URL` without URL encoding, so the password must be hex.

## Secrets to create first

Run this in the target namespace. It does not print the values.

```sh
kubectl create namespace openbtp
umask 077
db_pass="$(openssl rand -hex 32)"
kubectl -n openbtp create secret generic openbtp-db-app \
  --from-literal=password="$db_pass"
unset db_pass
kubectl -n openbtp create secret generic openbtp-app \
  --from-literal=NEXTAUTH_SECRET="$(openssl rand -base64 32)"
```

`NEXTAUTH_SECRET` must be at least 32 characters. Optional mail and agent values belong in another existing Secret named from `secrets.extraEnvFrom`. Do not add them to this chart.

Label `openbtp-db-app` with `k8s.mariadb.com/watch=true` only when rotating the password, so the operator reloads it. Do not commit the Secret.

## Gateway first, then the application

The public host is `openbtp.cut-api.com`. Capacity for this release, including the Envoy data plane, was accepted. The application Service stays ClusterIP. The Gateway class is `eg`.

Gateway `openbtp/openbtp-gateway` is already Accepted and Programmed. Its load balancer address is `57.129.58.97`. The DNS record is an A record from `openbtp.cut-api.com` to that address. Helm must adopt this object. The release name and namespace are both `openbtp`, which matches the annotations already on it. The chart names the Gateway `openbtp-gateway` and leaves the HTTP listener without a hostname, matching the programmed listener so HTTP-01 can use it. Do not delete the Gateway and do not change its name. That would allocate a new address.

HTTP can become ready before DNS. The HTTPS listener is left off until the certificate exists, because a missing certificate would keep that listener unprogrammed. The namespaced Issuer and Certificate are still created. The Issuer does not set an email: none was verified, and cert-manager 1.21 does not require one. It does not use the ClusterIssuer whose HTTP-01 solver is pinned to another namespace.

Stage 1, no application image and no MariaDB:

```sh
kubectl apply -f openbtp-gateway-bootstrap.yaml
kubectl -n openbtp get gateway openbtp-gateway
```

The address to use for the DNS A/AAAA record is `status.addresses[0].value`. That address is not known until the Gateway is applied on cl01. This repository does not contact the cluster.

After `openbtp.cut-api.com` points at that address, the Certificate can finish HTTP-01. Then set `gateway.tls.httpsListener: true` and `gateway.tls.redirect: true` in `values-cl01.yaml` and upgrade. Until then, HTTP forwards to the Service.

Stage 2 is the full release. `values-cl01.yaml` already pins the verified image digest. Create the two Secrets first. The chart still refuses a blank digest.

```sh
helm upgrade --install openbtp openbtp-0.1.1.tgz \
  --namespace openbtp \
  --create-namespace \
  --values values-cl01.yaml \
  --timeout 30m
```

Helm adopts the Gateway objects from stage 1 when their `meta.helm.sh/release-name` and `meta.helm.sh/release-namespace` annotations match this release. `--wait` waits on the Deployment. The migration init container waits up to 15 minutes for the primary. The Deployment uses `Recreate` because the file volumes are ReadWriteOnce.

Server-side links use `https://openbtp.cut-api.com`. `NEXT_PUBLIC_APP_URL` is still baked at image build; the server reads `APP_PUBLIC_URL` at runtime.

## What the release creates

- Deployment `openbtp`, one replica, uid/gid 1001, dropped capabilities, no ServiceAccount token.
- Probes: startup and liveness `GET /api/health/live` (no database), readiness `GET /api/health/ready` (`SELECT 1`, no error text).
- Five PVCs on `csi-cinder-high-speed-gen2`: uploads 20Gi, chantiers 10Gi, documents 10Gi, fiches 10Gi, backups 10Gi. They are mounted directly (not with `subPath`) so `fsGroup` can make them writable. Annotation `helm.sh/resource-policy: keep` leaves them in place on `helm uninstall`. The storage class reclaim policy is `Delete`, so a later `kubectl delete pvc` destroys the volume.
- MariaDB, Database, User, Grant, and Connection in the release namespace. Storage is 10Gi RWO per member, `pvcRetentionPolicy` Retain/Retain. `antiAffinityEnabled` places one member on each node; a member stays Pending when a node cannot take it. PDB `minAvailable: 2`. Update strategy `ReplicasFirstPrimaryLast`, one unavailable at a time. Galera SST is `mariabackup`.
- Connection Secret `openbtp-db-connection`, written by the operator, key `DATABASE_URL`, host `openbtp-mariadb-primary`.

Helm applies custom resources in kind-name order. The operator waits (`waitForIt: true`). An early User or Grant error that clears after MariaDB is Ready is expected.

Init container `migrate` runs `prisma migrate deploy`, then the seed. The seed only upserts feature modules and is non-fatal, matching the container entrypoint. The application container does not migrate again. On a database that already has tables and no Prisma history (`P3005`), the entrypoint baselines only if `bon_preparation` exists. Otherwise it stops.

An empty database with a pre-created ConfigMap of one `.sql` file can be imported by setting `initSql.existingConfigMap`. Do not use a dump from another product. Large imports can exceed Galera's write-set size (default 2Gi).

The process also runs, inside the single replica: Friday report, database backup at 20:00 Europe/Brussels into `/app/backups`, Checkinatwork reminders, and contract renewal. Those jobs are why the replica count is fixed at 1. Backup files are on the backups PVC. There is no off-cluster backup target.

## Gateway and certificates

cl01 has no IngressClass. Routing is Gateway API, class `eg`. Existing Gateways allow routes only from their own namespace, so this release creates `openbtp-gateway` in namespace `openbtp`. It does not create a GatewayClass or a ClusterIssuer.

`values-cl01.yaml` sets:

```yaml
config:
  publicUrl: https://openbtp.cut-api.com
gateway:
  enabled: true
  className: eg
  host: openbtp.cut-api.com
  tls:
    enabled: true
    email: ""
    httpsListener: false
    redirect: false
```

The certificate DNS name is `openbtp.cut-api.com`. HTTP-01 uses the HTTP listener in this namespace. The certificate remains pending until public DNS reaches the Gateway address.

## Rollback

```sh
helm history --namespace openbtp openbtp
helm rollback openbtp <revision> --namespace openbtp --timeout 30m
```

Rollback restores the previous manifests, including the previous image digest and the MariaDB spec. It does not reverse a Prisma migration that already committed. If the new revision added a migration, confirm the previous application still tolerates that schema before rolling the image back, or restore a SQL backup onto the primary first.

Do not delete the MariaDB object as a rollback. Retain keeps the member PVCs, but deleting the cluster is a recovery event, not an application rollback.

`helm uninstall` removes the application and the custom resources. Application PVCs stay because of the keep annotation. Database member PVCs follow the operator retention policy (Retain). Data is still destroyed if those PVCs are deleted by hand.

## Checks before calling the release ready

```sh
kubectl -n openbtp get mariadb,database,user,grant,connection,pods,pvc
kubectl -n openbtp rollout status deployment/openbtp
```

Expect MariaDB `Ready=True` and the application pod passing readiness. Do not repair another database while watching this.

## Known gaps

- The published image is public and pinned in `values-cl01.yaml`. Do not add a pull Secret copied from another namespace.
- Memory headroom was already short. The capacity flag is set in `values-cl01.yaml` because that risk was accepted for this release.
- HTTPS is pending until DNS for `openbtp.cut-api.com` exists. HTTP is the listener that can become ready before that record.
- PDF, Ollama, and SMTP are unset. The application runs without them. Add endpoints only when those services are known, and put passwords in an existing Secret.
- NAS document mirror is off unless `nas.existingClaim` names a volume that already exists.
- Database member memory limits of 1Gi with a 128M buffer pool are a capacity compromise. A loaded Galera member can still be OOMKilled.
- In-cluster backup is a logical dump on a PVC, not an off-site copy.
