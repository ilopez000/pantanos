export async function onRequestGet(context) {
  const db = context.env.DB;

  try {
    const { results } = await db
      .prepare("SELECT DISTINCT name FROM pantanos ORDER BY name")
      .all();

    const names = results.map((r) => r.name);

    return Response.json(names, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
