# OpenBTP Helm chart

Chart for the OpenBTP web process and a new 3-member MariaDB Galera cluster.
It targets the mariadb-operator 26.10.2 already installed on cl01 (`k8s.mariadb.com/v1alpha1`).
It does not install the operator or any CRD.

Read [DEPLOYMENT.md](DEPLOYMENT.md) before installing. Default `helm template` fails until `capacity.acknowledged` is true and an immutable application image digest is set. That is intentional.

```sh
helm lint deploy/helm/openbtp \
  --namespace openbtp \
  --set capacity.acknowledged=true \
  --set image.repository=example.invalid/openbtp \
  --set image.digest=sha256:abababababababababababababababababababababababababababababababab

deploy/helm/render-test.sh
node --test scripts/write-mariadb-client-cnf.test.mjs
```

The `example.invalid` image is only for rendering. Do not install it.
