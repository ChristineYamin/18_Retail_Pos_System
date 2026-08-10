from fastapi import FastAPI
from backend.database import get_connection

from backend.schemas import SaleCreate
from fastapi import HTTPException

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

@app.post("/sales")
def create_sale(sale: SaleCreate):

    conn = get_connection()

    try:
        with conn:
            with conn.cursor() as cursor:

                subtotal = 0
                sale_items = []

                # 1. Check every product
                for item in sale.items:

                    cursor.execute(
                        """
                        SELECT product_name, selling_price, current_stock
                        FROM products
                        WHERE product_id = %s
                        """,
                        (item.product_id,)
                    )

                    product = cursor.fetchone()

                    if product is None:
                        raise HTTPException(
                            status_code=404,
                            detail=f"Product {item.product_id} not found"
                        )

                    product_name = product[0]
                    unit_price = float(product[1])
                    current_stock = product[2]

                    if current_stock < item.quantity:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Not enough stock for {product_name}"
                        )

                    line_total = unit_price * item.quantity
                    subtotal += line_total

                    sale_items.append({
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "unit_price": unit_price,
                        "line_total": line_total
                    })

                # 2. Calculate total
                grand_total = subtotal - sale.discount

                if grand_total < 0:
                    raise HTTPException(
                        status_code=400,
                        detail="Discount cannot be greater than subtotal"
                    )

                # 3. Calculate change
                if sale.amount_paid < grand_total:
                    raise HTTPException(
                        status_code=400,
                        detail="Amount paid is less than total"
                    )

                change_amount = sale.amount_paid - grand_total

                # 4. Create invoice number
                cursor.execute(
                    "SELECT COALESCE(MAX(sale_id), 0) + 1 FROM sales"
                )

                next_sale_id = cursor.fetchone()[0]

                invoice_no = f"INV{next_sale_id:06d}"

                # 5. Save sale
                cursor.execute(
                    """
                    INSERT INTO sales (
                        invoice_no,
                        subtotal,
                        discount,
                        grand_total,
                        payment_method,
                        amount_paid,
                        change_amount
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING sale_id
                    """,
                    (
                        invoice_no,
                        subtotal,
                        sale.discount,
                        grand_total,
                        sale.payment_method,
                        sale.amount_paid,
                        change_amount
                    )
                )

                sale_id = cursor.fetchone()[0]

                # 6. Save each item + reduce stock
                for item in sale_items:

                    cursor.execute(
                        """
                        INSERT INTO sale_items (
                            sale_id,
                            product_id,
                            quantity,
                            unit_price,
                            line_total
                        )
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (
                            sale_id,
                            item["product_id"],
                            item["quantity"],
                            item["unit_price"],
                            item["line_total"]
                        )
                    )

                    cursor.execute(
                        """
                        UPDATE products
                        SET current_stock = current_stock - %s
                        WHERE product_id = %s
                        """,
                        (
                            item["quantity"],
                            item["product_id"]
                        )
                    )

                return {
                    "message": "Sale completed",
                    "invoice_no": invoice_no,
                    "subtotal": subtotal,
                    "discount": sale.discount,
                    "grand_total": grand_total,
                    "amount_paid": sale.amount_paid,
                    "change_amount": change_amount,
                    "payment_method": sale.payment_method
                }

    finally:
        conn.close()