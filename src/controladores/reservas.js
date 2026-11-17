function crearControladorReservas(servicioReservas) {
  const salasPermitidas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
  const turnosPermitidos = ["Mañana", "Tarde", "Noche"];

  async function estado(req, res) {
    res.json({
      servicio: "activo",
      reservas: await servicioReservas.contar(),
      solicitudId: res.locals.solicitudId,
    });
  }

  // Controladores HTML (Sitio Web)
  async function listar(req, res) {
    const reservas = await servicioReservas.listar();
    res.render("reservas/lista", { titulo: "Salas reservadas", reservas });
  }

  function mostrarFormulario(req, res) {
    res.render("reservas/nueva", {
      titulo: "Nueva Reserva",
      error: null,
      valores: {},
      salasPermitidas,
      turnosPermitidos,
    });
  }

  async function mostrarEdicion(req, res) {
    const reserva = await servicioReservas.obtenerPorId(req.params.id);

    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "No existe la reserva que querés editar.",
      });
    }

    res.render("reservas/editar", {
      titulo: "Editar reserva",
      error: null,
      id: reserva.id,
      valores: reserva, // Pasamos todos los datos actuales
    });
  }

  async function guardarEdicion(req, res) {
    // 1. Verificamos que la reserva aún exista
    const reserva = await servicioReservas.obtenerPorId(req.params.id);
    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "La reserva ya no existe. No se guardaron cambios.",
      });
    }

    const datos = req.body ?? {};

    // 2. Extraemos todos como texto
    const valores = {
      estudiante: typeof datos.estudiante === "string" ? datos.estudiante : "",
      email: typeof datos.email === "string" ? datos.email : "",
      sala: typeof datos.sala === "string" ? datos.sala : "",
      fecha: typeof datos.fecha === "string" ? datos.fecha : "",
      turno: typeof datos.turno === "string" ? datos.turno : "",
      personas: typeof datos.personas === "string" ? datos.personas : "",
      estado: typeof datos.estado === "string" ? datos.estado : "",
    };

    const permitidos = ["estudiante", "email", "sala", "fecha", "turno", "personas", "estado"];
    let hayCamposExtra = false;

    for (const campo of Object.keys(datos)) {
      if (!permitidos.includes(campo)) hayCamposExtra = true;
    }

    // 3. Convertimos 'personas' a número validando que no esté vacío
    const personasParseado = valores.personas.trim() === "" ? NaN : Number(valores.personas);

    // 4. Validación estricta del formulario
    if (
      hayCamposExtra ||
      !valores.estudiante.trim() ||
      !valores.email.trim() ||
      !valores.sala.trim() ||
      !valores.fecha.trim() ||
      !valores.turno.trim() ||
      !valores.estado.trim() ||
      !Number.isFinite(personasParseado) ||
      !Number.isInteger(personasParseado) ||
      personasParseado < 1 ||
      personasParseado > 6
    ) {
      // Si algo falla, devolvemos el HTML 400 con los valores conservados
      return res.status(400).render("reservas/editar", {
        titulo: "Editar reserva",
        error: "Completá todos los textos correctamente, asegurate de no enviar campos extra, y que personas sea un número entre 1 y 6.",
        id: reserva.id,
        valores: valores,
      });
    }

    // 5. Preparamos el reemplazo recortando espacios
    const reemplazo = {
      estudiante: valores.estudiante.trim(),
      email: valores.email.trim(),
      sala: valores.sala.trim(),
      fecha: valores.fecha.trim(),
      turno: valores.turno.trim(),
      personas: personasParseado,
      estado: valores.estado.trim()
    };

    // Guardamos el contexto para el manejador de errores
    res.locals.formularioEdicion = { id: reserva.id, valores };

    // 6. Usamos el MISMO servicio que usa el PUT de la API
    const actualizado = await servicioReservas.reemplazar(reserva.id, reemplazo);

    if (!actualizado) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "La reserva ya no existe. No se guardaron cambios.",
      });
    }

    // 7. Redirigimos al detalle con código 303 (See Other)
    res.redirect(303, `/reservas/${actualizado.id}`);
  }

  async function mostrarCambioEstado(req, res) {
    const reserva = await servicioReservas.obtenerPorId(req.params.id);
    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "No existe la reserva solicitada. No se guardaron cambios.",
      });
    }

    res.render("reservas/estado", {
      titulo: "Cambiar estado",
      error: null,
      id: reserva.id,
      valores: { estado: reserva.estado },
    });
  }

  async function guardarCambioEstado(req, res) {
    const reserva = await servicioReservas.obtenerPorId(req.params.id);
    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "No existe la reserva solicitada. No se guardaron cambios.",
      });
    }

    const datos = req.body ?? {};
    const valores = {
      estado: typeof datos.estado === "string" ? datos.estado : "",
    };

    const campoValido = valores.estado === "pendiente" || valores.estado === "confirmada";

    // Rechazar vacío, opciones inventadas, campos extra y repetidos
    if (Object.keys(datos).length !== 1 || !campoValido) {
      return res.status(400).render("reservas/estado", {
        titulo: "Cambiar estado",
        error: "Enviá únicamente el estado con una de las opciones indicadas.",
        id: reserva.id,
        valores,
      });
    }

    // Guardamos contexto para el manejador de errores de Mongoose
    res.locals.formularioParcial = { id: reserva.id, valores };

    // Construimos el parche SÓLO con el estado
    const cambios = { estado: valores.estado };

    // Usamos ACTUALIZAR (no reemplazar)
    const actualizado = await servicioReservas.actualizar(reserva.id, cambios);

    if (!actualizado) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "No existe la reserva solicitada. No se guardaron cambios.",
      });
    }

    res.redirect(303, `/reservas/${actualizado.id}`);
  }

  async function mostrarDetalle(req, res) {
    const reserva = await servicioReservas.obtenerPorId(req.params.id);
    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "No existe una reserva con ese identificador.",
      });
    }
    res.render("reservas/detalle", {
      titulo: `Reserva #${reserva.id}`,
      reserva,
    });
  }

  async function crear(req, res) {
    await servicioReservas.crear(req.reservaValidada);
    res.redirect("/reservas");
  }

  // Controladores JSON (API)
  async function listarApi(req, res) {
    const permitidos = ["sala", "orden", "pagina", "limite"]; // <-- Ampliado

    for (const campo of Object.keys(req.query)) {
      if (!permitidos.includes(campo)) {
        return res.status(400).json({ error: "Parámetro no permitido." });
      }
    }

    const sala = req.query.sala;
    if (sala !== undefined) {
      if (typeof sala !== "string" || sala.trim() === "") {
        return res.status(400).json({
          error: "El filtro de sala debe ser un texto válido y no vacío.",
        });
      }
    }

    let orden = "estudiante";
    if (req.query.orden !== undefined) {
      orden = req.query.orden;
      if (
        orden !== "estudiante" &&
        orden !== "personas-asc" &&
        orden !== "personas-desc"
      ) {
        return res.status(400).json({ error: "Orden no permitido." });
      }
    }

    // Paginación: Valores por defecto
    let pagina = 1;
    let limite = 2;

    if (req.query.pagina !== undefined) {
      // Validamos que no llegue repetido como arreglo
      if (typeof req.query.pagina !== "string") {
        return res
          .status(400)
          .json({ error: "La página debe ser un único valor textual." });
      }
      const p = Number(req.query.pagina);
      if (!Number.isInteger(p) || p < 1 || p > 1000) {
        return res.status(400).json({
          error: "La página debe ser un número entero entre 1 y 1000.",
        });
      }
      pagina = p;
    }

    if (req.query.limite !== undefined) {
      if (typeof req.query.limite !== "string") {
        return res
          .status(400)
          .json({ error: "El límite debe ser un único valor textual." });
      }
      const l = Number(req.query.limite);
      if (!Number.isInteger(l) || l < 1 || l > 20) {
        return res
          .status(400)
          .json({ error: "El límite debe ser un número entero entre 1 y 20." });
      }
      limite = l;
    }

    // Enviamos los 4 argumentos al servicio
    const resultado = await servicioReservas.consultar(
      sala,
      orden,
      pagina,
      limite,
    );
    res.json(resultado);
  }

  async function obtenerApi(req, res) {
    const reserva = await servicioReservas.obtenerPorId(req.params.id);
    if (!reserva) {
      return res.status(404).json({ error: "Reserva no encontrada." });
    }
    res.json(reserva);
  }

  async function crearApi(req, res) {
    const reserva = await servicioReservas.crear(req.reservaValidada);
    // Retornamos 201 Created y la cabecera Location con la ruta de la nueva reserva
    res.location(`/api/reservas/${reserva.id}`).status(201).json(reserva);
  }

  // NUEVOS CONTROLADORES TP09

  async function eliminarApi(req, res) {
    const eliminado = await servicioReservas.eliminar(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ error: "Recurso no encontrado." });
    }
    res.status(204).end();
  }

  async function reemplazarApi(req, res) {
    const reserva = await servicioReservas.reemplazar(
      req.params.id,
      req.cambiosValidos,
    );
    if (!reserva) {
      return res.status(404).json({ error: "Recurso no encontrado." });
    }
    res.json(reserva);
  }

  async function actualizarApi(req, res) {
    const reserva = await servicioReservas.actualizar(
      req.params.id,
      req.cambiosValidos,
    );
    if (!reserva) {
      return res.status(404).json({ error: "Recurso no encontrado." });
    }
    res.json(reserva);
  }

  async function mostrarEliminacion(req, res) {
    const reserva = await servicioReservas.obtenerPorId(req.params.id);
    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Recurso no encontrado",
        mensaje: "No existe la reserva solicitada. No se guardaron cambios.",
      });
    }

    res.render("reservas/eliminar", {
      titulo: "Confirmar eliminación",
      error: null,
      reserva,
    });
  }

  async function eliminarWeb(req, res) {
    const reserva = await servicioReservas.obtenerPorId(req.params.id);
    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Recurso no encontrado",
        mensaje: "No existe la reserva solicitada. No se guardaron cambios.",
      });
    }

    const datos = req.body ?? {};

    // Validación estricta: SOLO debe llegar "confirmar=si"
    if (Object.keys(datos).length !== 1 || datos.confirmar !== "si") {
      return res.status(400).render("reservas/eliminar", {
        titulo: "Confirmar eliminación",
        error: "La eliminación requiere confirmar desde este formulario.",
        reserva,
      });
    }

    // Ejecutamos el borrado físico en la BD
    const eliminado = await servicioReservas.eliminar(reserva.id);
    if (!eliminado) {
      return res.status(404).render("no-encontrado", {
        titulo: "Recurso no encontrado",
        mensaje: "No existe la reserva solicitada. No se guardaron cambios.",
      });
    }

    // Redirigimos al catálogo general (el detalle ya no existe)
    res.redirect(303, "/reservas");
  }

  return {
    estado,
    listar,
    mostrarFormulario,
    mostrarEdicion,
    guardarEdicion,
    mostrarCambioEstado,
    guardarCambioEstado,
    mostrarDetalle,
    crear,
    listarApi,
    obtenerApi,
    crearApi,
    eliminarApi,
    reemplazarApi,
    actualizarApi,
    mostrarEliminacion,
    eliminarWeb,
  };
}

module.exports = { crearControladorReservas };
