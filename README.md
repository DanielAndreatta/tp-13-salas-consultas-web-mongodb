# Trabajo Práctico 12 - Cambio parcial y eliminación de reservas

## 1. Punto de partida y proyecto
Este proyecto (copia denominada `tp-12-salas-crud-web-mongodb`) es la culminación del ciclo CRUD. El objetivo es añadir una pantalla web para modificar únicamente un campo específico (estado) y otra pantalla para eliminar una reserva previa confirmación del usuario, reutilizando los servicios de actualización parcial (PATCH) y eliminación (DELETE) ya implementados en la API.

## 2. Entorno y Base de Datos
- **Node.js**: >= 22.13.0
- **Base de Datos**: MongoDB Atlas, clúster gratuito Free (M0). Colección: `reservas`. Base: `reservas_salas_u12`.
- **Dependencias**: Express 5.2.1, Mongoose 9.10.3.
- **Configuración**: Copiar `.env.example` a `.env` y configurar la URI de conexión correspondiente. Arrancar con `node --env-file=.env src/index.js`.

## 3. Diferencia entre POST web y PATCH/DELETE en la API
Tanto la aplicación web como la API utilizan exactamente las mismas funciones del servicio (`actualizar` y `eliminar`), pero difieren en su contrato HTTP y respuesta:
- **API (PATCH / DELETE):** La API recibe objetos JSON o peticiones vacías. Procesa la orden silenciosamente y responde con códigos puros (200 con el objeto modificado, o 204 sin contenido tras eliminar).
- **Web (POST de estado / POST de eliminar):** Los navegadores HTML no manejan métodos PATCH o DELETE nativamente en sus formularios. Por ello, la web utiliza formularios POST (`x-www-form-urlencoded`). En caso de éxito, el servidor responde con un código de redirección `303 See Other` hacia otra vista. En caso de validación fallida, responde con un HTML `400` que conserva el contexto.

## 4. Rutas y Campos Admitidos
**Modificación Parcial (Estado):**
- **API (`PATCH /api/reservas/:id`)**: Admite los campos previos permitidos (personas y estado). 
- **Web (`GET / POST /reservas/:id/estado`)**: El formulario HTML exige y envía únicamente el campo `estado` (`pendiente` o `confirmada`). Se rechazan envíos vacíos o campos extra.

**Eliminación:**
- **API (`DELETE /api/reservas/:id`)**: No requiere cuerpo. Elimina directamente.
- **Web (`GET / POST /reservas/:id/eliminar`)**: Muestra una vista de advertencia. El POST exige un campo oculto exacto `confirmar=si`. Caso contrario, se rechaza.

## 5. Matriz de Pruebas y Evidencia Observada
*(Ejecutadas sobre reservas de Ana y Bruno)*

| Caso de Prueba | Acción Realizada | Resultado Observado |
| :--- | :--- | :--- |
| **PATCH válido (API)** | `PATCH` con `estado: confirmada`. | 200 OK. El estado se actualizó. Los otros 6 campos se conservaron intactos en la BD. |
| **PATCH inválido (API)** | `PATCH` vacío o estado inventado. | 400 Bad Request. El documento en la BD no sufrió modificaciones. |
| **Formulario Parcial Web (Éxito)** | `POST` web enviando estado pendiente. | 303 See Other apuntando a `/reservas/:id`. GET posterior demostró cambio efectivo. |
| **Formulario Parcial Web (Fallo)** | `POST` web enviando dato inventado. | 400 HTML. Retornó el formulario con explicación, conservando el id y valor digitado. |
| **Eliminar Web: Cancelar** | Clic en "Cancelar y conservar". | Retornó por GET a la vista anterior. Documento intacto. |
| **Eliminar Web: Fallo de confirmación**| `POST` web sin `confirmar=si` o extra. | 400 HTML. Advirtió falta de confirmación correcta, sin eliminar datos en la BD. |
| **Eliminar Web: Éxito** | `POST` web con `confirmar=si`. | 303 See Other a `/reservas`. El ID eliminado devolvió 404 en consulta API posterior. |
| **Eliminar API** | `DELETE` a un ID de prueba existente. | 204 No Content. La segunda petición devolvió 404, validando el borrado físico. |
| **Persistencia al Reinicio** | Se detuvo y reinició el servidor. | Las modificaciones parciales y eliminaciones persistieron. CRUD previo operativo. |