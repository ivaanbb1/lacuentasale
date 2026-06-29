const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ mensaje: "Servidor LaCuentaSale funcionando correctamente 🚀" });
});

app.get("/api/ingredientes", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM ingredientes");
    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo ingredientes:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/api/ingredientes/stock-bajo", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM ingredientes WHERE stock <= stock_minimo"
    );

    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo ingredientes con stock bajo:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/api/ingredientes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM ingredientes WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Ingrediente no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error obteniendo ingrediente:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/api/ventas/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [ventaRows] = await db.query(
      "SELECT * FROM ventas WHERE id = ?",
      [id]
    );

    if (ventaRows.length === 0) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    const [ingredientesRows] = await db.query(
      `SELECT 
        vi.ingrediente_id,
        i.nombre AS ingrediente,
        vi.cantidad,
        i.unidad
      FROM ventas_ingredientes vi
      INNER JOIN ingredientes i ON vi.ingrediente_id = i.id
      WHERE vi.venta_id = ?`,
      [id]
    );

    res.json({
      ...ventaRows[0],
      ingredientes: ingredientesRows
    });
  } catch (error) {
    console.error("Error obteniendo venta:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post("/api/ingredientes", async (req, res) => {
  try {
    const { nombre, unidad, stock = 0, stock_minimo = 0 } = req.body;

    if (!nombre || !unidad) {
      return res.status(400).json({ error: "nombre y unidad son obligatorios" });
    }

    if (typeof stock !== "number" || typeof stock_minimo !== "number") {
      return res.status(400).json({ error: "stock y stock_minimo deben ser números" });
    }

    if (stock < 0 || stock_minimo < 0) {
      return res.status(400).json({ error: "stock y stock_minimo no pueden ser negativos" });
    }

    const [result] = await db.query(
      "INSERT INTO ingredientes (nombre, unidad, stock, stock_minimo) VALUES (?, ?, ?, ?)",
      [nombre, unidad, stock, stock_minimo]
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      unidad,
      stock,
      stock_minimo
    });
  } catch (error) {
    console.error("Error creando ingrediente:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.put("/api/ingredientes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { stock, stock_minimo } = req.body;

    if (stock === undefined && stock_minimo === undefined) {
      return res.status(400).json({ error: "Envía stock o stock_minimo" });
    }

    const [result] = await db.query(
      `UPDATE ingredientes
       SET stock = COALESCE(?, stock),
           stock_minimo = COALESCE(?, stock_minimo)
       WHERE id = ?`,
      [stock ?? null, stock_minimo ?? null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ingrediente no encontrado" });
    }

    res.json({ mensaje: "Ingrediente actualizado correctamente", id });
  } catch (error) {
    console.error("Error actualizando ingrediente:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.delete("/api/ingredientes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM ingredientes WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ingrediente no encontrado" });
    }

    res.json({ mensaje: "Ingrediente eliminado correctamente", id });
  } catch (error) {
    console.error("Error eliminando ingrediente:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/api/resumen", async (req, res) => {
  try {
    const [ventasRows] = await db.query(`
      SELECT 
        COUNT(*) AS total_ventas,
        COALESCE(SUM(total), 0) AS total_vendido
      FROM ventas
    `);

    const [stockBajoRows] = await db.query(`
      SELECT *
      FROM ingredientes
      WHERE stock <= stock_minimo
    `);

    res.json({
      total_ventas: ventasRows[0].total_ventas,
      total_vendido: ventasRows[0].total_vendido,
      ingredientes_stock_bajo: stockBajoRows
    });
  } catch (error) {
    console.error("Error obteniendo resumen:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/api/ventas", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        v.id AS venta_id,
        v.fecha,
        v.total,
        vi.ingrediente_id,
        i.nombre AS ingrediente,
        vi.cantidad,
        i.unidad
      FROM ventas v
      LEFT JOIN ventas_ingredientes vi ON v.id = vi.venta_id
      LEFT JOIN ingredientes i ON vi.ingrediente_id = i.id
      ORDER BY v.id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo ventas:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post("/api/ventas", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { total = 0, ingredientes } = req.body;

    if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
      return res.status(400).json({ error: "Debes enviar al menos un ingrediente" });
    }

    await connection.beginTransaction();

    const [ventaResult] = await connection.query(
      "INSERT INTO ventas (total) VALUES (?)",
      [total]
    );

    const ventaId = ventaResult.insertId;

    for (const item of ingredientes) {
      const { ingrediente_id, cantidad } = item;

      if (!ingrediente_id || !cantidad || cantidad <= 0) {
        await connection.rollback();
        return res.status(400).json({ error: "ingrediente_id y cantidad son obligatorios" });
      }

      const [ingredienteRows] = await connection.query(
        "SELECT stock FROM ingredientes WHERE id = ?",
        [ingrediente_id]
      );

      if (ingredienteRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: `Ingrediente ${ingrediente_id} no encontrado` });
      }

      const stockActual = Number(ingredienteRows[0].stock);

      if (stockActual < cantidad) {
        await connection.rollback();
        return res.status(400).json({
          error: `Stock insuficiente para el ingrediente ${ingrediente_id}`
        });
      }

      await connection.query(
        "INSERT INTO ventas_ingredientes (venta_id, ingrediente_id, cantidad) VALUES (?, ?, ?)",
        [ventaId, ingrediente_id, cantidad]
      );

      await connection.query(
        "UPDATE ingredientes SET stock = stock - ? WHERE id = ?",
        [cantidad, ingrediente_id]
      );
    }

    await connection.commit();

    res.status(201).json({
      mensaje: "Venta registrada correctamente",
      venta_id: ventaId,
      total
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error registrando venta:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    connection.release();
  }
});

async function testDatabaseConnection() {
  try {
    const connection = await db.getConnection();
    console.log("Conexión a MySQL exitosa ✅");
    connection.release();
  } catch (error) {
    console.error("Error conectando a MySQL ❌", error.message);
  }
}

const PORT = 3000;
testDatabaseConnection();

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});