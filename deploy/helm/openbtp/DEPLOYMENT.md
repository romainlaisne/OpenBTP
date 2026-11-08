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

No application image was built or pushed here. This machine has no container runtime and no registry credentials. Do not reuse the pull secret from another namespace.

The image is built from the git commit that contains this chart:

```sh
IMAGE_REPOSITORY=ghcr.io/romainlaisne/openbtp deploy/docker/build-app-image.sh
```

That script does not push. After an authorized push, take the registry manifest digest (not the local image id) and put it in a private values file:

```yaml
capacity:
  acknowledged: true
image:
  repository: ghcr.io/romainlaisne/openbtp
  digest: sha256:replace-with-the-registry-digest
  existingPullSecret: ""   # set only if a new pull Secret exists in namespace openbtp
```

The chart rejects a missing digest and rejects a digest that is not `sha256:` plus 64 hex characters. `example.invalid/openbtp` is a render fixture, not a deployable image.

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

## Install

From the packaged chart, with a private values file that sets the acknowledgement and the image digest:

```sh
helm upgrade --install openbtp openbtp-0.1.0.tgz \
  --namespace openbtp \
  --create-namespace \
  --values openbtp-values.yaml \
  --timeout 30m
```

`--wait` is optional. Helm waits on the Deployment, and the migration init container waits up to 15 minutes for the primary. Galera bootstrap can use most of that. The Deployment uses `Recreate` because the file volumes are ReadWriteOnce, so an upgrade stops the old pod before the new one starts.

The Service is ClusterIP. Nothing is published on a node port or a load balancer. `config.publicUrl` is empty, so links use:

`http://openbtp.openbtp.svc.cluster.local:3000`

That name is not public. Set `config.publicUrl` to the real origin before sending mail or contract links. Do not invent a hostname.

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

## Gateway, only after a hostname and capacity are chosen

cl01 has no IngressClass. Routing is Gateway API, class `eg`, Envoy Gateway. Existing Gateways allow routes only from their own namespace, so this release cannot attach to them. The chart can create its own Gateway, HTTPRoutes, a namespaced cert-manager Issuer, and a Certificate. It does not create a GatewayClass, a ClusterIssuer, or a reference to the HTTP-01 solver hardcoded for another namespace.

```yaml
gateway:
  enabled: true
  className: eg
  host: name.example
  tls:
    enabled: true
    email: you@example
config:
  publicUrl: https://name.example
```

Leave this off until DNS and the extra Envoy memory are accepted. Re-check that the namespaced Issuer becomes Ready. The cluster Issuer was not copied.

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

- No published application image digest yet.
- Memory headroom was already insufficient for this footprint.
- No public hostname, so links are in-cluster until `config.publicUrl` is set.
- PDF, Ollama, and SMTP are unset. The application runs without them. Add endpoints only when those services are known, and put passwords in an existing Secret.
- NAS document mirror is off unless `nas.existingClaim` names a volume that already exists.
- Database member memory limits of 1Gi with a 128M buffer pool are a capacity compromise. A loaded Galera member can still be OOMKilled.
- In-cluster backup is a logical dump on a PVC, not an off-site copy.
