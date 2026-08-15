// ========================================
// LOAD DAILY SALES SUMMARY
// ========================================

async function loadDailySummary() {

    try {

        const response =
            await fetch("/reports/today");


        if (!response.ok) {
            throw new Error(
                "Unable to load daily sales summary."
            );
        }


        const summary =
            await response.json();


        document
            .getElementById("dashboardDate")
            .textContent =
                summary.date;


        document
            .getElementById("totalSales")
            .textContent =
                summary.total_sales.toLocaleString()
                + " MMK";


        document
            .getElementById("transactionCount")
            .textContent =
                summary.transactions;


        document
            .getElementById("itemsSold")
            .textContent =
                summary.items_sold;


        document
            .getElementById("cashSales")
            .textContent =
                summary.cash_sales.toLocaleString()
                + " MMK";


        document
            .getElementById("kbzpaySales")
            .textContent =
                summary.kbzpay_sales.toLocaleString()
                + " MMK";


        document
            .getElementById("wavepaySales")
            .textContent =
                summary.wavepay_sales.toLocaleString()
                + " MMK";

        const topProductsContainer =
            document.getElementById("topProducts");
        
        topProductsContainer.innerHTML = "";

        if (summary.top_products.length === 0) {
            topProductsContainer.innerHTML =
                "<p>No products sold today.</p>";
        } else {
            summary.top_products.forEach(
                (product, index) => {
                    const row =
                        document.createElement("div");
                    row.className = "top-product-row";
                    row.innerHTML = `
                        <div class="top-product-info">
                            <span class="top-product-rank">
                                ${index + 1}.
                            </span>

                            <div>
                                <strong>${product.product_name}</strong>
                                <small>(${product.product_id})</small>
                            </div>
                        </div>

                        <div class="top-product-sales">
                            <strong>${product.quantity_sold}</strong>
                            <span> 
                                ${product.sales_amount.toLocaleString()} MMK
                            </span>
                        </div>
                    `;
                    topProductsContainer
                    .appendChild(row);
                }
            );
        }
        const recentContainer =
            document.getElementById("recentTransactionsBody");
        
        recentContainer.innerHTML = "";
        if (summary.recent_transactions.length === 0) {
            recentContainer.innerHTML = `
                <tr>
                    <td colspan="5">
                        No sales yet today.
                    </td>
                </tr>
            `;
        } else {
            summary.recent_transactions.forEach(
                (sale) => {
                    const saleDate =
                        new Date(sale.sale_datetime);
                    const row =
                        document.createElement("tr");
                    row.innerHTML = `
                        <td>
                            <strong>${sale.invoice_no}</strong>
                        </td>

                        <td>
                            ${saleDate.toLocaleDateString()}
                        </td>

                        <td>
                            ${saleDate.toLocaleTimeString()}
                        </td>

                        <td>
                            ${sale.payment_method}
                        </td>

                        <td>
                            ${sale.grand_total.toLocaleString()} MMK
                        </td>
                    `;
                    recentContainer.appendChild(row);
                }
            );
                
        }

    } catch (error) {

        console.error(error);

        alert(
            "Unable to load today's sales summary."
        );
    }
}


// Start dashboard
loadDailySummary();