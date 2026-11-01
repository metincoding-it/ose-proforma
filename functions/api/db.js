export async function onRequestGet(context) {
  try {
    if (!context.env.OSE_DB) {
      return new Response(JSON.stringify({ error: 'KV_NOT_BOUND' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await context.env.OSE_DB.get('ose_products_data');
    if (!data) {
      return new Response(JSON.stringify({ empty: true }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'READ_ERROR' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context) {
  try {
    if (!context.env.OSE_DB) {
      return new Response(JSON.stringify({ error: 'KV_NOT_BOUND' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.text();
    await context.env.OSE_DB.put('ose_products_data', body);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'WRITE_ERROR' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}