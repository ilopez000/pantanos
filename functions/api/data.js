export async function onRequestGet(context) {
  const db = context.env.DB;
  const url = new URL(context.request.url);

  const name = url.searchParams.get("name");
  if (!name) {
    return Response.json(
      { error: "El parámetro 'name' es obligatorio." },
      { status: 400 }
    );
  }

  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  let sql = "SELECT date, level, volume, percent FROM pantanos WHERE name = ?";
  const params = [name];

  if (start) {
    sql += " AND date >= ?";
    params.push(start);
  }
  if (end) {
    sql += " AND date <= ?";
    params.push(end);
  }

  sql += " ORDER BY date ASC";

  try {
    const stmt = db.prepare(sql);
    const { results } = await stmt.bind(...params).all();

    return Response.json(results, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
