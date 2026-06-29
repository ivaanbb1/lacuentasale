import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:3000/api";
const POWERBI_REPORT_URL = import.meta.env.VITE_POWERBI_REPORT_URL || "";

const ingredienteInicial = {
  nombre: "",
  unidad: "",
  stock: "",
  stock_minimo: "",
};

const lineaVentaInicial = {
  ingrediente_id: "",
  cantidad: "",
};

async function pedirJson(ruta, opciones) {
  const response = await fetch(API_URL + ruta, opciones);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "No se pudo completar la operación");
  }

  return data;
}

function formatearDinero(valor) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(valor || 0));
}

function formatearNumero(valor) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function obtenerProductoMasVendido(ventas) {
  const acumulado = ventas.reduce((productos, venta) => {
    if (!venta.ingrediente) return productos;

    const actual = productos[venta.ingrediente] || {
      nombre: venta.ingrediente,
      cantidad: 0,
      unidad: venta.unidad || "",
    };

    actual.cantidad += Number(venta.cantidad || 0);
    productos[venta.ingrediente] = actual;
    return productos;
  }, {});

  return Object.values(acumulado).sort((a, b) => b.cantidad - a.cantidad)[0];
}

function App() {
  const [resumen, setResumen] = useState(null);
  const [ingredientes, setIngredientes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [nuevoIngrediente, setNuevoIngrediente] = useState(ingredienteInicial);
  const [edicionesStock, setEdicionesStock] = useState({});
  const [lineaVenta, setLineaVenta] = useState(lineaVentaInicial);
  const [lineasVenta, setLineasVenta] = useState([]);
  const [totalVenta, setTotalVenta] = useState("");

  const ingredientesStockBajo = resumen?.ingredientes_stock_bajo || [];
  const totalStock = ingredientes.reduce(
    (total, ingrediente) => total + Number(ingrediente.stock || 0),
    0,
  );
  const ticketMedio = resumen?.total_ventas
    ? Number(resumen.total_vendido || 0) / Number(resumen.total_ventas)
    : 0;
  const productoMasVendido = useMemo(() => obtenerProductoMasVendido(ventas), [ventas]);
  const saludInventario = ingredientes.length
    ? Math.round(((ingredientes.length - ingredientesStockBajo.length) / ingredientes.length) * 100)
    : 100;

  const ingredienteSeleccionado = useMemo(
    () =>
      ingredientes.find(
        (ingrediente) => String(ingrediente.id) === lineaVenta.ingrediente_id,
      ),
    [ingredientes, lineaVenta.ingrediente_id],
  );

  async function cargarDatos() {
    setCargando(true);
    setError("");

    try {
      const [resumenData, ingredientesData, ventasData] = await Promise.all([
        pedirJson("/resumen"),
        pedirJson("/ingredientes"),
        pedirJson("/ventas"),
      ]);

      setResumen(resumenData);
      setIngredientes(ingredientesData);
      setVentas(ventasData);
      setEdicionesStock(
        ingredientesData.reduce((ediciones, ingrediente) => {
          ediciones[ingrediente.id] = {
            stock: ingrediente.stock,
            stock_minimo: ingrediente.stock_minimo,
          };
          return ediciones;
        }, {}),
      );
    } catch (errorActual) {
      setError(errorActual.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  function limpiarAvisos() {
    setMensaje("");
    setError("");
  }

  function manejarCambioIngrediente(event) {
    const { name, value } = event.target;
    setNuevoIngrediente((ingrediente) => ({ ...ingrediente, [name]: value }));
  }

  function manejarCambioLineaVenta(event) {
    const { name, value } = event.target;
    setLineaVenta((linea) => ({ ...linea, [name]: value }));
  }

  function manejarCambioEdicion(id, campo, valor) {
    setEdicionesStock((ediciones) => ({
      ...ediciones,
      [id]: {
        ...ediciones[id],
        [campo]: valor,
      },
    }));
  }

  async function crearIngrediente(event) {
    event.preventDefault();
    limpiarAvisos();

    if (
      !nuevoIngrediente.nombre.trim() ||
      !nuevoIngrediente.unidad.trim() ||
      nuevoIngrediente.stock === "" ||
      nuevoIngrediente.stock_minimo === ""
    ) {
      setError("Rellena todos los campos del ingrediente.");
      return;
    }

    setGuardando(true);

    try {
      await pedirJson("/ingredientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoIngrediente.nombre.trim(),
          unidad: nuevoIngrediente.unidad.trim(),
          stock: Number(nuevoIngrediente.stock),
          stock_minimo: Number(nuevoIngrediente.stock_minimo),
        }),
      });

      setNuevoIngrediente(ingredienteInicial);
      setMensaje("Ingrediente añadido correctamente.");
      await cargarDatos();
    } catch (errorActual) {
      setError(errorActual.message);
    } finally {
      setGuardando(false);
    }
  }

  async function actualizarIngrediente(ingrediente) {
    limpiarAvisos();
    const edicion = edicionesStock[ingrediente.id];

    if (!edicion || edicion.stock === "" || edicion.stock_minimo === "") {
      setError("El stock y el mínimo no pueden quedar vacíos.");
      return;
    }

    setGuardando(true);

    try {
      await pedirJson("/ingredientes/" + ingrediente.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock: Number(edicion.stock),
          stock_minimo: Number(edicion.stock_minimo),
        }),
      });

      setMensaje("Ingrediente actualizado.");
      await cargarDatos();
    } catch (errorActual) {
      setError(errorActual.message);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarIngrediente(ingrediente) {
    limpiarAvisos();

    if (!window.confirm("¿Eliminar " + ingrediente.nombre + " del inventario?")) {
      return;
    }

    setGuardando(true);

    try {
      await pedirJson("/ingredientes/" + ingrediente.id, { method: "DELETE" });
      setLineasVenta((lineas) =>
        lineas.filter((linea) => linea.ingrediente_id !== ingrediente.id),
      );
      setMensaje("Ingrediente eliminado.");
      await cargarDatos();
    } catch (errorActual) {
      setError(errorActual.message);
    } finally {
      setGuardando(false);
    }
  }

  function añadirLineaVenta(event) {
    event.preventDefault();
    limpiarAvisos();

    if (!lineaVenta.ingrediente_id || !lineaVenta.cantidad) {
      setError("Selecciona un ingrediente e indica la cantidad.");
      return;
    }

    const cantidad = Number(lineaVenta.cantidad);

    if (cantidad <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }

    if (ingredienteSeleccionado && cantidad > Number(ingredienteSeleccionado.stock)) {
      setError("No hay stock suficiente para " + ingredienteSeleccionado.nombre + ".");
      return;
    }

    const ingredienteId = Number(lineaVenta.ingrediente_id);
    setLineasVenta((lineas) => {
      const existe = lineas.find((linea) => linea.ingrediente_id === ingredienteId);

      if (existe) {
        return lineas.map((linea) =>
          linea.ingrediente_id === ingredienteId
            ? { ...linea, cantidad: linea.cantidad + cantidad }
            : linea,
        );
      }

      return [
        ...lineas,
        {
          ingrediente_id: ingredienteId,
          nombre: ingredienteSeleccionado?.nombre || "Ingrediente",
          unidad: ingredienteSeleccionado?.unidad || "",
          cantidad,
        },
      ];
    });
    setLineaVenta(lineaVentaInicial);
  }

  function quitarLineaVenta(ingredienteId) {
    setLineasVenta((lineas) =>
      lineas.filter((linea) => linea.ingrediente_id !== ingredienteId),
    );
  }

  async function registrarVenta(event) {
    event.preventDefault();
    limpiarAvisos();

    if (lineasVenta.length === 0) {
      setError("Añade al menos un ingrediente a la venta.");
      return;
    }

    setGuardando(true);

    try {
      await pedirJson("/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total: Number(totalVenta || 0),
          ingredientes: lineasVenta.map((linea) => ({
            ingrediente_id: linea.ingrediente_id,
            cantidad: linea.cantidad,
          })),
        }),
      });

      setLineaVenta(lineaVentaInicial);
      setLineasVenta([]);
      setTotalVenta("");
      setMensaje("Venta registrada y stock actualizado.");
      await cargarDatos();
    } catch (errorActual) {
      setError(errorActual.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="marca">
          <span className="logo-mark">L</span>
          <div>
            <p className="eyebrow">Operaciones</p>
            <h1>LaCuentaSale</h1>
          </div>
        </div>
        <button className="ghost-button" onClick={cargarDatos} type="button">
          Actualizar datos
        </button>
      </header>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Resumen del negocio</p>
          <h2>Inventario y ventas bajo control</h2>
          <p>
            Gestiona ingredientes, registra ventas compuestas y corrige stock desde
            un panel preparado para el trabajo diario.
          </p>
        </div>
        <div className="hero-status">
          <span className={error ? "status-dot error" : "status-dot"}></span>
          {error ? "Revisa la conexión" : "Sistema conectado"}
        </div>
      </section>

      {mensaje && <p className="notice success">{mensaje}</p>}
      {error && <p className="notice danger">{error}</p>}

      {cargando ? (
        <section className="loading-panel">
          <span className="loader"></span>
          Cargando datos del negocio...
        </section>
      ) : (
        <>
          <section className="metrics-grid" aria-label="Resumen del negocio">
            <article className="metric-card">
              <span>Ventas</span>
              <strong>{resumen?.total_ventas || 0}</strong>
              <small>Operaciones registradas</small>
            </article>
            <article className="metric-card featured">
              <span>Facturación</span>
              <strong>{formatearDinero(resumen?.total_vendido)}</strong>
              <small>Total acumulado</small>
            </article>
            <article className="metric-card">
              <span>Inventario</span>
              <strong>{formatearNumero(totalStock)}</strong>
              <small>Unidades en stock</small>
            </article>
            <article className="metric-card warning">
              <span>Alertas</span>
              <strong>{ingredientesStockBajo.length}</strong>
              <small>Ingredientes en mínimo</small>
            </article>
          </section>

          <section className="bi-section surface">
            <div className="bi-copy">
              <p className="eyebrow">Business Intelligence</p>
              <h2>Analítica conectable a Power BI</h2>
              <p>
                La app recoge ventas e inventario para alimentar dashboards de
                beneficios, productos más vendidos, rotación de stock y decisiones
                de reposición.
              </p>
              <div className="bi-insights">
                <article>
                  <span>Ticket medio</span>
                  <strong>{formatearDinero(ticketMedio)}</strong>
                </article>
                <article>
                  <span>Producto más movido</span>
                  <strong>
                    {productoMasVendido
                      ? productoMasVendido.nombre
                      : "Sin ventas"}
                  </strong>
                  <small>
                    {productoMasVendido
                      ? formatearNumero(productoMasVendido.cantidad) + " " + productoMasVendido.unidad
                      : "Registra ventas para calcularlo"}
                  </small>
                </article>
                <article>
                  <span>Salud del stock</span>
                  <strong>{saludInventario}%</strong>
                </article>
              </div>
            </div>

            <div className="powerbi-panel">
              {POWERBI_REPORT_URL ? (
                <iframe
                  src={POWERBI_REPORT_URL}
                  title="Informe Power BI LaCuentaSale"
                />
              ) : (
                <div className="powerbi-placeholder">
                  <span>Power BI</span>
                  <strong>Panel Power BI preparado</strong>
                  <p>
                    Espacio reservado para conectar el informe de beneficios,
                    productos más vendidos y evolución de ventas.
                  </p>
                </div>
              )}
            </div>
          </section>


          <section className="work-grid">
            <article className="surface action-panel">
              <div className="section-title">
                <div>
                  <p className="eyebrow">Inventario</p>
                  <h2>Añadir ingrediente</h2>
                </div>
                <span className="chip">Nuevo</span>
              </div>

              <form className="form-grid" onSubmit={crearIngrediente}>
                <label>
                  Nombre
                  <input
                    name="nombre"
                    onChange={manejarCambioIngrediente}
                    placeholder="Harina"
                    type="text"
                    value={nuevoIngrediente.nombre}
                  />
                </label>
                <label>
                  Unidad
                  <input
                    name="unidad"
                    onChange={manejarCambioIngrediente}
                    placeholder="kg, uds, litros..."
                    type="text"
                    value={nuevoIngrediente.unidad}
                  />
                </label>
                <label>
                  Stock actual
                  <input
                    min="0"
                    name="stock"
                    onChange={manejarCambioIngrediente}
                    placeholder="0"
                    step="0.01"
                    type="number"
                    value={nuevoIngrediente.stock}
                  />
                </label>
                <label>
                  Stock mínimo
                  <input
                    min="0"
                    name="stock_minimo"
                    onChange={manejarCambioIngrediente}
                    placeholder="0"
                    step="0.01"
                    type="number"
                    value={nuevoIngrediente.stock_minimo}
                  />
                </label>
                <button disabled={guardando} type="submit">
                  Añadir ingrediente
                </button>
              </form>
            </article>

            <article className="surface action-panel accent-panel">
              <div className="section-title">
                <div>
                  <p className="eyebrow">Ventas</p>
                  <h2>Venta con varios ingredientes</h2>
                </div>
                <span className="chip dark">Stock auto</span>
              </div>

              <form className="form-grid" onSubmit={añadirLineaVenta}>
                <label>
                  Ingrediente
                  <select
                    name="ingrediente_id"
                    onChange={manejarCambioLineaVenta}
                    value={lineaVenta.ingrediente_id}
                  >
                    <option value="">Selecciona uno</option>
                    {ingredientes.map((ingrediente) => (
                      <option key={ingrediente.id} value={ingrediente.id}>
                        {ingrediente.nombre} ({ingrediente.stock} {ingrediente.unidad})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cantidad
                  <input
                    max={ingredienteSeleccionado?.stock || undefined}
                    min="0"
                    name="cantidad"
                    onChange={manejarCambioLineaVenta}
                    placeholder="0"
                    step="0.01"
                    type="number"
                    value={lineaVenta.cantidad}
                  />
                </label>
                <button className="secondary-action" type="submit">
                  Añadir a la venta
                </button>
              </form>

              <form className="sale-summary" onSubmit={registrarVenta}>
                <div className="sale-lines">
                  {lineasVenta.length === 0 ? (
                    <p className="muted">Todavía no hay ingredientes en esta venta.</p>
                  ) : (
                    lineasVenta.map((linea) => (
                      <article className="sale-line" key={linea.ingrediente_id}>
                        <div>
                          <strong>{linea.nombre}</strong>
                          <span>
                            {formatearNumero(linea.cantidad)} {linea.unidad}
                          </span>
                        </div>
                        <button
                          aria-label={"Quitar " + linea.nombre}
                          onClick={() => quitarLineaVenta(linea.ingrediente_id)}
                          type="button"
                        >
                          Quitar
                        </button>
                      </article>
                    ))
                  )}
                </div>
                <label>
                  Total cobrado
                  <input
                    min="0"
                    onChange={(event) => setTotalVenta(event.target.value)}
                    placeholder="0,00"
                    step="0.01"
                    type="number"
                    value={totalVenta}
                  />
                </label>
                <button disabled={guardando || lineasVenta.length === 0} type="submit">
                  Registrar venta
                </button>
              </form>
            </article>
          </section>

          <section className="surface alert-strip">
            <div className="section-title compact">
              <div>
                <p className="eyebrow">Reposición</p>
                <h2>Stock bajo</h2>
              </div>
              <span className="alert-count">{ingredientesStockBajo.length}</span>
            </div>

            {ingredientesStockBajo.length === 0 ? (
              <p className="empty-state">Todo el inventario está por encima del mínimo.</p>
            ) : (
              <div className="stock-list">
                {ingredientesStockBajo.map((ingrediente) => (
                  <article className="stock-pill" key={ingrediente.id}>
                    <strong>{ingrediente.nombre}</strong>
                    <span>
                      {formatearNumero(ingrediente.stock)} / {formatearNumero(ingrediente.stock_minimo)} {ingrediente.unidad}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="tables-grid inventory-layout">
            <article className="surface table-panel wide-panel">
              <div className="section-title">
                <div>
                  <p className="eyebrow">Base de datos</p>
                  <h2>Inventario editable</h2>
                </div>
                <span className="chip">{ingredientes.length} items</span>
              </div>
              <div className="table-scroll">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Unidad</th>
                      <th>Stock</th>
                      <th>Mínimo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredientes.map((ingrediente) => {
                      const estaBajo = Number(ingrediente.stock) <= Number(ingrediente.stock_minimo);
                      return (
                        <tr key={ingrediente.id}>
                          <td><strong>{ingrediente.nombre}</strong></td>
                          <td>{ingrediente.unidad}</td>
                          <td>
                            <input
                              className="table-input"
                              min="0"
                              onChange={(event) =>
                                manejarCambioEdicion(ingrediente.id, "stock", event.target.value)
                              }
                              step="0.01"
                              type="number"
                              value={edicionesStock[ingrediente.id]?.stock ?? ""}
                            />
                          </td>
                          <td>
                            <input
                              className="table-input"
                              min="0"
                              onChange={(event) =>
                                manejarCambioEdicion(ingrediente.id, "stock_minimo", event.target.value)
                              }
                              step="0.01"
                              type="number"
                              value={edicionesStock[ingrediente.id]?.stock_minimo ?? ""}
                            />
                          </td>
                          <td>
                            <span className={estaBajo ? "status-badge bad" : "status-badge good"}>
                              {estaBajo ? "Reponer" : "Correcto"}
                            </span>
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                disabled={guardando}
                                onClick={() => actualizarIngrediente(ingrediente)}
                                type="button"
                              >
                                Guardar
                              </button>
                              <button
                                className="danger-button"
                                disabled={guardando}
                                onClick={() => eliminarIngrediente(ingrediente)}
                                type="button"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="surface table-panel wide-panel">
              <div className="section-title">
                <div>
                  <p className="eyebrow">Actividad</p>
                  <h2>Ventas recientes</h2>
                </div>
                <span className="chip">Últimos movimientos</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Venta</th>
                      <th>Fecha</th>
                      <th>Ingrediente</th>
                      <th>Cantidad</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((venta, index) => (
                      <tr key={[venta.venta_id, venta.ingrediente_id, index].join("-")}>
                        <td><strong>#{venta.venta_id}</strong></td>
                        <td>{new Date(venta.fecha).toLocaleString("es-ES")}</td>
                        <td>{venta.ingrediente || "Sin ingrediente"}</td>
                        <td>
                          {formatearNumero(venta.cantidad)} {venta.unidad || ""}
                        </td>
                        <td>{formatearDinero(venta.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </>
      )}
    </main>
  );
}

export default App;
