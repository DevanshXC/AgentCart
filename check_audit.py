import psycopg

url = "postgresql://postgres:postgres@localhost:5433/agentcart"
with psycopg.connect(url) as conn:
    with conn.cursor() as cur:
        # Get the latest order ID
        cur.execute("SELECT id, status, provider_order_id, session_id FROM orders WHERE status='PAID' ORDER BY created_at DESC LIMIT 1")
        latest_order = cur.fetchone()
        print("Latest Order:", latest_order)
        
        if latest_order:
            order_id = latest_order[0]
            session_id = latest_order[3]
            # Get audit events for this session/order
            cur.execute("SELECT timestamp, actor, event_type, action, result FROM audit_events WHERE order_id = %s ORDER BY timestamp ASC", (order_id,))
            events = cur.fetchall()
            print("\nAudit Events for Order:", order_id)
            for e in events:
                print(f"[{e[0]}] {e[1]} - {e[2]} - {e[3]} - {e[4]}")
                
            # Check for any webhooks received at all today
            print("\nAll WEBHOOK_RECEIVED events:")
            cur.execute("SELECT timestamp, actor, event_type, action, result, order_id FROM audit_events WHERE event_type = 'WEBHOOK_RECEIVED' ORDER BY timestamp DESC LIMIT 5")
            hooks = cur.fetchall()
            for h in hooks:
                print(f"[{h[0]}] {h[1]} - {h[2]} - {h[3]} - {h[4]} - Order: {h[5]}")
