#!/usr/bin/env bash
# Prueba esquema.sql + reglas.sql en un PostgreSQL local descartable.
# Uso: bash docs/supabase/pruebas/ejecutar.sh   (requiere initdb/pg_ctl/psql)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="$(mktemp -d /tmp/hotel-pg.XXXX)"
RUN=()
if [ "$(id -u)" = "0" ]; then
  grep -q '^pgt:' /etc/passwd || { echo 'pgt:x:65534:65534::/tmp:/bin/sh' >> /etc/passwd; echo 'pgt:x:65534:' >> /etc/group; }
  chown 65534:65534 "$DIR"; RUN=(setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/tmp)
fi
"${RUN[@]}" initdb -D "$DIR/data" -U postgres >/dev/null
"${RUN[@]}" pg_ctl -D "$DIR/data" -o "-k $DIR -p 5499 -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
trap '"${RUN[@]}" pg_ctl -D "$DIR/data" stop -m fast >/dev/null; rm -rf "$DIR"' EXIT
P=(psql -h "$DIR" -p 5499 -U postgres -v ON_ERROR_STOP=1 -q -X)
"${P[@]}" -c "create database t"
"${P[@]}" -d t -f "$HERE/stub.sql"
"${P[@]}" -d t -f "$HERE/../esquema.sql"
"${P[@]}" -d t -f "$HERE/reglas.sql" 2>&1 | grep -E 'PASS|OK error|ERROR|FAIL' | sed 's/^.*NOTICE:  //'
echo "TODAS LAS PRUEBAS PASARON"
