function crearManejadorErrores({ vistaFormulario, tituloFormulario }) {
  return function manejarErrores(error, req, res, next) {
    if (res.headersSent) {
      return next(error);
    }

    const esValidacion = error.name === "ValidationError";
    const esEntrada =
      esValidacion ||
      error.name === "CastError" ||
      error.codigo === "ENTRADA_INVALIDA" ||
      error.codigo === "ID_INVALIDO" ||
      error.codigo === "FILTRO_INVALIDO" ||
      error.type === "entity.parse.failed";
    const estado = esEntrada ? 400 : 500;

    let mensaje = esEntrada
      ? "Revisa los datos enviados."
      : "No se pudo completar la operación.";

    if (error.codigo === "ID_INVALIDO") {
      mensaje = "El identificador debe tener 24 caracteres hexadecimales.";
    }

    console.error("Solicitud fallida:", res.locals.solicitudId, error.name);

    // Respuesta para la API JSON
    if (req.path.startsWith("/api/")) {
      return res.status(estado).json({
        error: mensaje,
        campos: esValidacion ? Object.keys(error.errors) : undefined,
      });
    }

    // Rama de formulario parcial
    if (esValidacion && req.method === "POST" && res.locals.formularioParcial) {
      return res.status(400).render("reservas/estado", {
        titulo: "Cambiar estado",
        error: mensaje,
        id: res.locals.formularioParcial.id,
        valores: res.locals.formularioParcial.valores,
      });
    }

    // Rama específica para errores durante la EDICIÓN web
    if (esValidacion && req.method === "POST" && res.locals.formularioEdicion) {
      return res.status(400).render("reservas/editar", {
        titulo: "Editar reserva",
        error: mensaje,
        id: res.locals.formularioEdicion.id,
        valores: res.locals.formularioEdicion.valores,
      });
    }

    // Respuesta para el sitio HTML (Formulario)
    if (esValidacion && req.method === "POST") {
      return res.status(400).render(vistaFormulario, {
        titulo: tituloFormulario,
        error: mensaje,
        valores: req.body ?? {},
        salasPermitidas: ["Sala Norte", "Sala Sur", "Sala Multimedia"],
        turnosPermitidos: ["Mañana", "Tarde", "Noche"],
      });
    }

    // Respuesta HTML genérica de error
    return res.status(estado).render("no-encontrado", {
      titulo: esEntrada ? "Solicitud inválida" : "Error del servicio",
      mensaje,
    });
  };
}

module.exports = { crearManejadorErrores };
