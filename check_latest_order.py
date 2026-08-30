import psycopg

url = "postgresql://postgres:postgres@localhost:5433/agentcart"
with psycopg.connect(url) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT id, status, provider_order_id FROM orders ORDER BY created_at DESC LIMIT 1")
        print(cur.fetchone())
