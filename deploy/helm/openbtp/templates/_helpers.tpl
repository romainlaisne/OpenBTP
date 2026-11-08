{{- define "openbtp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "openbtp.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "openbtp.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "openbtp.labels" -}}
helm.sh/chart: {{ include "openbtp.chart" . }}
app.kubernetes.io/name: {{ include "openbtp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: openbtp
{{- end -}}

{{- define "openbtp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "openbtp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: web
{{- end -}}

{{- define "openbtp.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "openbtp.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{- define "openbtp.mariadbName" -}}
{{- printf "%s-mariadb" (include "openbtp.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "openbtp.mariadbPrimaryService" -}}
{{- printf "%s-primary" (include "openbtp.mariadbName" .) -}}
{{- end -}}

{{- define "openbtp.publicUrl" -}}
{{- if .Values.config.publicUrl -}}
{{- .Values.config.publicUrl -}}
{{- else -}}
{{- printf "http://%s.%s.svc.cluster.local:%v" (include "openbtp.fullname" .) .Release.Namespace .Values.service.port -}}
{{- end -}}
{{- end -}}

{{- define "openbtp.image" -}}
{{- if .Values.image.tag -}}
{{- printf "%s:%s@%s" .Values.image.repository .Values.image.tag .Values.image.digest -}}
{{- else -}}
{{- printf "%s@%s" .Values.image.repository .Values.image.digest -}}
{{- end -}}
{{- end -}}

{{- define "openbtp.validate" -}}
{{- if not .Values.capacity.acknowledged -}}
{{- fail "Refusing to render. cl01 nodes were at about 101%, 91%, and 81% of allocatable memory (~1976Mi). This release keeps 3 Galera members and does not fall back to one. Set capacity.acknowledged=true only after that capacity risk is accepted." -}}
{{- end -}}
{{- if or (not .Values.image.repository) (not .Values.image.digest) -}}
{{- fail "image.repository and image.digest are required. Build and push the application image, then set the registry digest. A floating tag is not accepted." -}}
{{- end -}}
{{- if not (regexMatch "^sha256:[a-f0-9]{64}$" .Values.image.digest) -}}
{{- fail "image.digest must look like sha256: followed by 64 hex characters." -}}
{{- end -}}
{{- if ne (int .Values.app.replicaCount) 1 -}}
{{- fail "app.replicaCount must stay 1. The process runs in-process schedulers and the file volumes are ReadWriteOnce." -}}
{{- end -}}
{{- if ne .Values.service.type "ClusterIP" -}}
{{- fail "service.type must stay ClusterIP. Public exposure is a Gateway, and it is off until a hostname is set." -}}
{{- end -}}
{{- if not .Values.persistence.enabled -}}
{{- fail "persistence.enabled must stay true. Uploaded files are stored on local volumes." -}}
{{- end -}}
{{- if not .Values.persistence.storageClassName -}}
{{- fail "persistence.storageClassName must be set explicitly. The cl01 class is csi-cinder-high-speed-gen2." -}}
{{- end -}}
{{- if or (ne (int .Values.mariadb.replicas) 3) (not .Values.mariadb.galera.enabled) -}}
{{- fail "Refusing to render a database that is not a 3-member Galera cluster." -}}
{{- end -}}
{{- if not .Values.mariadb.storage.storageClassName -}}
{{- fail "mariadb.storage.storageClassName must be set explicitly." -}}
{{- end -}}
{{- if or (eq .Values.mariadb.grant.database "*") (eq .Values.mariadb.grant.database "") -}}
{{- fail "mariadb.grant.database must name the application database. A global grant is refused." -}}
{{- end -}}
{{- if ne .Values.mariadb.database.characterSet "utf8mb4" -}}
{{- fail "mariadb.database.characterSet must be utf8mb4. Prisma migrations are utf8mb4_unicode_ci." -}}
{{- end -}}
{{- if or (not .Values.mariadb.user.passwordSecretName) (not .Values.secrets.nextauth.name) -}}
{{- fail "Database and NextAuth Secret names are required. This chart does not create Secret data." -}}
{{- end -}}
{{- if .Values.nas.enabled -}}
{{- if not .Values.nas.existingClaim -}}
{{- fail "nas.enabled requires nas.existingClaim. This chart does not create a NAS volume." -}}
{{- end -}}
{{- end -}}
{{- if .Values.gateway.enabled -}}
{{- if or (not .Values.gateway.host) (not .Values.config.publicUrl) -}}
{{- fail "gateway.enabled requires gateway.host and config.publicUrl. No hostname is invented." -}}
{{- end -}}
{{- if not (contains .Values.gateway.host .Values.config.publicUrl) -}}
{{- fail "config.publicUrl must contain gateway.host." -}}
{{- end -}}
{{- if .Values.gateway.tls.enabled -}}
{{- if not .Values.gateway.tls.email -}}
{{- fail "gateway.tls.enabled requires gateway.tls.email for the namespaced ACME Issuer. The existing ClusterIssuer is not reused." -}}
{{- end -}}
{{- end -}}
{{- end -}}
{{- end -}}
