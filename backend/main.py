from fastapi import FastAPI
from backend.database import get_connection

from backend.schemas import SaleCreate, StockUpdate, StockSet, PriceUpdate
from fastapi import HTTPException

from fastapi.staticfiles import StaticFiles
from datetime import date


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
            current_stock,
            supplier_code,
            product_group_code

        FROM products
        WHERE status = 'Active'
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
            "current_stock": row[3],
            "supplier_code": row[4],
            "product_group_code": row[5]
        })

    return products

@app.patch("/products/{product_id}/stock")
def add_stock(product_id: str, stock: StockUpdate):

    conn = get_connection()

    try:
        with conn:
            with conn.cursor() as cursor:

                cursor.execute(
                    """
                    UPDATE products
                    SET current_stock = current_stock + %s
                    WHERE product_id = %s
                    RETURNING
                        product_id,
                        product_name,
                        current_stock;
                    """,
                    (
                        stock.quantity,
                        product_id
                    )
                )

                product = cursor.fetchone()

                if product is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Product not found"
                    )

                return {
                    "message": "Stock updated",
                    "product_id": product[0],
                    "product_name": product[1],
                    "current_stock": product[2]
                }

    finally:
        conn.close()

@app.patch("/products/{product_id}/stock/set")
def set_stock(product_id: str, stock: StockSet):

    conn = get_connection()

    try:
        with conn:
            with conn.cursor() as cursor:

                cursor.execute(
                    """
                    UPDATE products
                    SET current_stock = %s
                    WHERE product_id = %s
                    RETURNING
                        product_id,
                        product_name,
                        current_stock;
                    """,
                    (
                        stock.quantity,
                        product_id
                    )
                )

                product = cursor.fetchone()

                if product is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Product not found"
                    )

                return {
                    "message": "Stock set successfully",
                    "product_id": product[0],
                    "product_name": product[1],
                    "current_stock": product[2]
                }

    finally:
        conn.close()

@app.patch("/products/{product_id}/price")
def update_product_price(
    product_id: str,
    price: PriceUpdate
):

    conn = get_connection()

    try:
        with conn:
            with conn.cursor() as cursor:

                cursor.execute(
                    """
                    UPDATE products
                    SET selling_price = %s
                    WHERE product_id = %s
                    RETURNING
                        product_id,
                        product_name,
                        selling_price;
                    """,
                    (
                        price.selling_price,
                        product_id
                    )
                )

                product = cursor.fetchone()

                if product is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Product not found"
                    )

                return {
                    "message": "Price updated successfully",
                    "product_id": product[0],
                    "product_name": product[1],
                    "selling_price": float(product[2])
                }

    finally:
        conn.close()





@app.get("/sales")
def get_sales():

    conn = get_connection()

    try:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT
                    sale_id,
                    invoice_no,
                    sale_datetime,
                    grand_total,
                    payment_method
                FROM sales
                ORDER BY sale_datetime DESC;
            """)

            rows = cursor.fetchall()

            sales = []

            for row in rows:
                sales.append({
                    "sale_id": row[0],
                    "invoice_no": row[1],
                    "sale_datetime": row[2],
                    "grand_total": float(row[3]),
                    "payment_method": row[4]
                })

            return sales

    finally:
        conn.close()

@app.get("/sales/{sale_id}")
def get_sale_detail(sale_id: int):

    conn = get_connection()

    try:
        with conn.cursor() as cursor:

            # Get invoice information
            cursor.execute(
                """
                SELECT
                    sale_id,
                    invoice_no,
                    sale_datetime,
                    subtotal,
                    discount,
                    grand_total,
                    payment_method,
                    amount_paid,
                    change_amount
                FROM sales
                WHERE sale_id = %s;
                """,
                (sale_id,)
            )

            sale = cursor.fetchone()

            if sale is None:
                raise HTTPException(
                    status_code=404,
                    detail="Sale not found"
                )


            # Get products inside the invoice
            cursor.execute(
                """
                SELECT
                    si.product_id,
                    p.product_name,
                    si.quantity,
                    si.unit_price,
                    si.line_total
                FROM sale_items si
                JOIN products p
                    ON si.product_id = p.product_id
                WHERE si.sale_id = %s
                ORDER BY si.sale_item_id;
                """,
                (sale_id,)
            )

            rows = cursor.fetchall()

            items = []

            for row in rows:
                items.append({
                    "product_id": row[0],
                    "product_name": row[1],
                    "quantity": row[2],
                    "unit_price": float(row[3]),
                    "line_total": float(row[4])
                })


            return {
                "sale_id": sale[0],
                "invoice_no": sale[1],
                "sale_datetime": sale[2],
                "subtotal": float(sale[3]),
                "discount": float(sale[4]),
                "grand_total": float(sale[5]),
                "payment_method": sale[6],
                "amount_paid": float(sale[7]),
                "change_amount": float(sale[8]),
                "items": items
            }

    finally:
        conn.close()

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
                        "product_name": product_name,
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

            

                # 4. Save sale
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
                    VALUES (
                         'INV' || LPAD(
                            nextval('invoice_no_seq')::text,
                            6,
                            '0'     
                    ),
                        %s, %s, %s, %s, %s, %s)
                    RETURNING
                        sale_id,
                        invoice_no,
                        sale_datetime
                    """, (
                        subtotal,
                        sale.discount,
                        grand_total,
                        sale.payment_method,
                        sale.amount_paid,
                        change_amount   
                    ))
                sale_id, invoice_no, sale_datetime = cursor.fetchone()


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
                    "sale_datetime": sale_datetime,
                    "items": sale_items,
                    "subtotal": subtotal,
                    "discount": sale.discount,
                    "grand_total": grand_total,
                    "amount_paid": sale.amount_paid,
                    "change_amount": change_amount,
                    "payment_method": sale.payment_method
                }

    finally:
        conn.close()

@app.get("/reports/today")
def get_today_summary():

    conn = get_connection()

    try:
        with conn.cursor() as cursor:

            # ========================================
            # SALES SUMMARY
            # ========================================

            cursor.execute("""
                SELECT
                    CURRENT_DATE,
                    COUNT(*),
                    COALESCE(SUM(grand_total), 0),

                    COALESCE(
                        SUM(grand_total)
                        FILTER (
                            WHERE payment_method = 'Cash'
                        ),
                        0
                    ),

                    COALESCE(
                        SUM(grand_total)
                        FILTER (
                            WHERE payment_method = 'KBZPay'
                        ),
                        0
                    ),

                    COALESCE(
                        SUM(grand_total)
                        FILTER (
                            WHERE payment_method = 'WavePay'
                        ),
                        0
                    )

                FROM sales

                WHERE sale_datetime::date = CURRENT_DATE;
            """)

            summary = cursor.fetchone()


            # ========================================
            # ITEMS SOLD
            # ========================================

            cursor.execute("""
                SELECT
                    COALESCE(SUM(si.quantity), 0)

                FROM sale_items si

                JOIN sales s
                    ON si.sale_id = s.sale_id

                WHERE s.sale_datetime::date = CURRENT_DATE;
            """)

            items_sold = cursor.fetchone()[0]

            # ========================================
            # TOP SELLING PRODUCTS
            # ========================================

            cursor.execute("""
                SELECT
                    p.product_id,
                    p.product_name,
                    SUM(si.quantity) AS quantity_sold,
                    SUM(si.line_total) AS sales_amount

                FROM sale_items si

                JOIN sales s
                    ON si.sale_id = s.sale_id

                JOIN products p
                    ON si.product_id = p.product_id

                WHERE s.sale_datetime::date = CURRENT_DATE

                GROUP BY
                    p.product_id,
                    p.product_name

                ORDER BY
                    quantity_sold DESC,
                    sales_amount DESC

                LIMIT 5;
            """)

            top_product_rows = cursor.fetchall()

            top_products = []

            for row in top_product_rows:

                top_products.append({
                    "product_id": row[0],
                    "product_name": row[1],
                    "quantity_sold": int(row[2]),
                    "sales_amount": float(row[3])
              })


            # ========================================
            # RECENT TRANSACTIONS
            # ========================================

            cursor.execute("""
                SELECT
                    sale_id,
                    invoice_no,
                    sale_datetime,
                    grand_total,
                    payment_method

                FROM sales

                WHERE sale_datetime::date = CURRENT_DATE

                ORDER BY sale_datetime DESC

                LIMIT 5;
            """)

            recent_rows = cursor.fetchall()

            recent_transactions = []

            for row in recent_rows:

                recent_transactions.append({
                    "sale_id": row[0],
                    "invoice_no": row[1],
                    "sale_datetime": row[2],
                    "grand_total": float(row[3]),
                    "payment_method": row[4]
              })


            return {
                "date": summary[0],
                "transactions": summary[1],
                "total_sales": float(summary[2]),
                "cash_sales": float(summary[3]),
                "kbzpay_sales": float(summary[4]),
                "wavepay_sales": float(summary[5]),
                "items_sold": int(items_sold),
                "top_products": top_products,
                "recent_transactions": recent_transactions
            }

    finally:
        conn.close()

@app.get("/reports/by-date")
def get_report_by_date(report_date: date):

    conn = get_connection()

    try:
        with conn.cursor() as cursor:

            # ========================================
            # SALES SUMMARY
            # ========================================

            cursor.execute(
                """
                SELECT
                    COUNT(*),
                    COALESCE(SUM(grand_total), 0),

                    COALESCE(
                        SUM(grand_total)
                        FILTER (
                            WHERE payment_method = 'Cash'
                        ),
                        0
                    ),

                    COALESCE(
                        SUM(grand_total)
                        FILTER (
                            WHERE payment_method = 'KBZPay'
                        ),
                        0
                    ),

                    COALESCE(
                        SUM(grand_total)
                        FILTER (
                            WHERE payment_method = 'WavePay'
                        ),
                        0
                    )

                FROM sales

                WHERE sale_datetime::date = %s;
                """,
                (report_date,)
            )

            summary = cursor.fetchone()


            # ========================================
            # ITEMS SOLD
            # ========================================

            cursor.execute(
                """
                SELECT
                    COALESCE(SUM(si.quantity), 0)

                FROM sale_items si

                JOIN sales s
                    ON si.sale_id = s.sale_id

                WHERE s.sale_datetime::date = %s;
                """,
                (report_date,)
            )

            items_sold =cursor.fetchone()[0]


            # ========================================
            # TOP SELLING PRODUCTS
            # ========================================

            cursor.execute(
                """
                SELECT
                    p.product_id,
                    p.product_name,
                    SUM(si.quantity) AS quantity_sold,
                    SUM(si.line_total) AS sales_amount

                FROM sale_items si

                JOIN sales s
                    ON si.sale_id = s.sale_id

                JOIN products p
                    ON si.product_id = p.product_id

                WHERE s.sale_datetime::date = %s

                GROUP BY
                    p.product_id,
                    p.product_name

                ORDER BY
                    quantity_sold DESC,
                    sales_amount DESC

                LIMIT 5;
                """,
                (report_date,)
            )

            top_product_rows = cursor.fetchall()

            top_products = []

            for row in top_product_rows:

                top_products.append({
                    "product_id": row[0],
                    "product_name": row[1],
                    "quantity_sold": int(row[2]),
                    "sales_amount": float(row[3])
                })


            # ========================================
            # RECENT TRANSACTIONS
            # ========================================

            cursor.execute(
                """
                SELECT
                    sale_id,
                    invoice_no,
                    sale_datetime,
                    grand_total,
                    payment_method

                FROM sales

                WHERE sale_datetime::date = %s

                ORDER BY sale_datetime DESC

                LIMIT 5;
                """,
                (report_date,)
            )

            recent_rows = cursor.fetchall()

            recent_transactions = []

            for row in recent_rows:

                recent_transactions.append({
                    "sale_id": row[0],
                    "invoice_no": row[1],
                    "sale_datetime": row[2],
                    "grand_total": float(row[3]),
                    "payment_method": row[4]
                })


            return {
                "date": report_date,
                "transactions": summary[0],
                "total_sales": float(summary[1]),
                "cash_sales": float(summary[2]),
                "kbzpay_sales": float(summary[3]),
                "wavepay_sales": float(summary[4]),
                "items_sold": int(items_sold),
                "top_products": top_products,
                "recent_transactions": recent_transactions
            }

    finally:
        conn.close()

@app.get("/reports/range")
def get_report_range(
    start_date: date,
    end_date: date
):

    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date"
        )

    conn = get_connection()

    try:
        with conn.cursor() as cursor:

            # ========================================
            # SALES SUMMARY
            # ========================================

            cursor.execute(
                """
                SELECT
                    COUNT(*),

                    COALESCE(
                        SUM(grand_total),
                        0
                    ),

                    COALESCE(
                        SUM(grand_total)
                        FILTER (
                            WHERE payment_method = 'Cash'
                        ),
                        0
                    ),

                    COALESCE(
                        SUM(grand_total)
                        FILTER (
                            WHERE payment_method = 'KBZPay'
                        ),
                        0
                    ),

                    COALESCE(
                        SUM(grand_total)
                        FILTER (
                            WHERE payment_method = 'WavePay'
                        ),
                        0
                    )

                FROM sales

                WHERE sale_datetime::date
                    BETWEEN %s AND %s;
                """,
                (
                    start_date,
                    end_date
                )
            )

            summary = cursor.fetchone()


            # ========================================
            # ITEMS SOLD
            # ========================================

            cursor.execute(
                """
                SELECT
                    COALESCE(
                        SUM(si.quantity),
                        0
                    )

                FROM sale_items si

                JOIN sales s
                    ON si.sale_id = s.sale_id

                WHERE s.sale_datetime::date
                    BETWEEN %s AND %s;
                """,
                (
                    start_date,
                    end_date
                )
            )

            items_sold = cursor.fetchone()[0]


            # ========================================
            # TOP SELLING PRODUCTS
            # ========================================

            cursor.execute(
                """
                SELECT
                    p.product_id,
                    p.product_name,
                    SUM(si.quantity) AS quantity_sold,
                    SUM(si.line_total) AS sales_amount

                FROM sale_items si

                JOIN sales s
                    ON si.sale_id = s.sale_id

                JOIN products p
                    ON si.product_id = p.product_id

                WHERE s.sale_datetime::date
                    BETWEEN %s AND %s

                GROUP BY
                    p.product_id,
                    p.product_name

                ORDER BY
                    quantity_sold DESC,
                    sales_amount DESC

                LIMIT 5;
                """,
                (
                    start_date,
                    end_date
                )
            )

            top_product_rows = cursor.fetchall()

            top_products = []

            for row in top_product_rows:

                top_products.append({
                    "product_id": row[0],
                    "product_name": row[1],
                    "quantity_sold": int(row[2]),
                    "sales_amount": float(row[3])
                })


            # ========================================
            # RECENT TRANSACTIONS
            # ========================================

            cursor.execute(
                """
                SELECT
                    sale_id,
                    invoice_no,
                    sale_datetime,
                    grand_total,
                    payment_method

                FROM sales

                WHERE sale_datetime::date
                    BETWEEN %s AND %s

                ORDER BY sale_datetime DESC

                LIMIT 5;
                """,
                (
                    start_date,
                    end_date
                )
            )

            recent_rows = cursor.fetchall()

            recent_transactions = []

            for row in recent_rows:

                recent_transactions.append({
                    "sale_id": row[0],
                    "invoice_no": row[1],
                    "sale_datetime": row[2],
                    "grand_total": float(row[3]),
                    "payment_method": row[4]
                })


            return {
                "start_date": start_date,
                "end_date": end_date,
                "transactions": summary[0],
                "total_sales": float(summary[1]),
                "cash_sales": float(summary[2]),
                "kbzpay_sales": float(summary[3]),
                "wavepay_sales": float(summary[4]),
                "items_sold": int(items_sold),
                "top_products": top_products,
                "recent_transactions": recent_transactions
            }

    finally:
        conn.close()

app.mount(
    "/pos",
    StaticFiles(directory="frontend", html=True),
    name="pos"
)
