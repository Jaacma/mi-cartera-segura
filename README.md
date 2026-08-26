# Mi Cartera Segura

Dashboard personal estático con datos cifrados AES-256-GCM. GitHub Actions actualiza diariamente los valores liquidativos mediante EODHD, conserva el último valor verificado si una fuente falla y envía el informe de los viernes mediante Brevo.

El repositorio no contiene posiciones ni importes en texto legible. La clave del enlace se guarda únicamente en `DASHBOARD_KEY` y en el fragmento local del navegador.
