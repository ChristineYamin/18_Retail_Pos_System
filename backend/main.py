from fastapi import FastAPI
from backend.database import get_connection

app = FastAPI()


@app.get("/")
def home():
    return {"message": "Retail POS System is running"}


@app.get("/products")
def get_products():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            product_id,
            product_name,
            selling_price,
            current_stock
        FROM products
        ORDER BY product_id;
    """)

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    products = []

    for row in rows:
        products.append({
            "product_id": row[0],
            "product_name": row[1],
            "selling_price": float(row[2]),
            "current_stock": row[3]
        })

    return products