function countTotalRecords(obj) {
  if (!obj || typeof obj !== 'object') return 0;
  return (
    (Array.isArray(obj.inverters) ? obj.inverters.length : 0) +
    (Array.isArray(obj.pvs) ? obj.pvs.length : 0) +
    (Array.isArray(obj.batteries) ? obj.batteries.length : 0) +
    (Array.isArray(obj.infrastructure) ? obj.infrastructure.length : 0) +
    (Array.isArray(obj.extras) ? obj.extras.length : 0) +
    (Array.isArray(obj.customCategories) ? obj.customCategories.length : 0) +
    (Array.isArray(obj.customProducts) ? obj.customProducts.length : 0)
  );
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export async function onRequestGet(context) {
  try {
    if (!context.env.OSE_DB) {
      return new Response(JSON.stringify({ error: 'KV_NOT_BOUND' }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }

    const data = await context.env.OSE_DB.get('ose_products_data');
    if (!data) {
      return new Response(JSON.stringify({ empty: true }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    return new Response(data, {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch {
    return new Response(JSON.stringify({ error: 'READ_ERROR' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

export async function onRequestPost(context) {
  try {
    if (!context.env.OSE_DB) {
      return new Response(JSON.stringify({ error: 'KV_NOT_BOUND' }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }

    const body = await context.request.text();
    let incomingData;
    try {
      incomingData = JSON.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: 'INVALID_JSON' }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    const incomingTotal = countTotalRecords(incomingData);
    const existingRaw = await context.env.OSE_DB.get('ose_products_data');

    if (existingRaw) {
      try {
        const existingData = JSON.parse(existingRaw);
        const existingTotal = countTotalRecords(existingData);

        // Koruma: Bulutta 2 veya daha fazla kayıt varken tek seferde tamamen boş paket yazılıp DB'nin sıfırlanmasını engeller
        if (existingTotal > 1 && incomingTotal === 0) {
          return new Response(JSON.stringify({ error: 'BULK_WIPE_BLOCKED' }), {
            status: 409,
            headers: JSON_HEADERS,
          });
        }

        // Her güncellemeden önce mevcut dolu veriyi otomatik yedekle
        if (existingTotal > 0) {
          await context.env.OSE_DB.put('ose_products_data_backup', existingRaw);
        }
      } catch {
        // Mevcut veri bozuksa üzerine yazmaya devam et
      }
    }

    await context.env.OSE_DB.put('ose_products_data', body);

    return new Response(JSON.stringify({ ok: true, count: incomingTotal }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch {
    return new Response(JSON.stringify({ error: 'WRITE_ERROR' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}
