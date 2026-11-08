# OpenBTP Helm chart

Chart for the OpenBTP web process and a new 3-member MariaDB Galera cluster.
It targets the mariadb-operator 26.10.2 already installed on cl01 (`k8s.mariadb.com/v1alpha1`).
It does not install the operator or any CRD.

Read [DEPLOYMENT.md](DEPLOYMENT.md) before installing. `values-cl01.yaml` turns on the Gateway for `openbtp.cut-api.com` and accepts the capacity risk. Default `helm template` still fails until that flag is set. The application also requires a real image digest. `values-cl01-gateway.yaml` renders only the Gateway stage and does not need an image.

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
