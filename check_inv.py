import psycopg
import os

url = "postgresql://postgres:postgres@localhost:5433/agentcart"
with psycopg.connect(url) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT inventory FROM products WHERE id = 'lenovo-loq-15'")
        print(cur.fetchone())
