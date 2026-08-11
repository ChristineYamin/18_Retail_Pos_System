let salesHistory = [];


// Load sales from FastAPI
async function loadSalesHistory() {

    const container =
        document.getElementById("salesHistoryBody");

    try {

        const response = await fetch("/sales");

        if (!response.ok) {
            throw new Error("Failed to load sales.");
        }

        salesHistory = await response.json();

        displaySalesHistory(salesHistory);

    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <tr>
                <td colspan="5">
                    Unable to load sales history.
                </td>
            </tr>
        `;
    }
}


// Display sales
function displaySalesHistory(sales) {

    const container =
        document.getElementById("salesHistoryBody");

    container.innerHTML = "";


    if (sales.length === 0) {

        container.innerHTML = `
            <tr>
                <td colspan="5">
                    No sales found.
                </td>
            </tr>
        `;

        return;
    }


    sales.forEach(sale => {

        const saleDate =
            new Date(sale.sale_datetime);

        const row =
            document.createElement("tr");
        
        row.className = "history-row";
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

        row.addEventListener(
            "click",
            () => openSaleDetail(sale.sale_id)
        );
        
        container.appendChild(row);
    });
}


// Search invoice
document
    .getElementById("historySearch")
    .addEventListener("input", function () {

        const search =
            this.value.trim().toLowerCase();

        const filtered =
            salesHistory.filter(sale =>
                sale.invoice_no
                    .toLowerCase()
                    .includes(search)
            );

        displaySalesHistory(filtered);
    });

// Open Sale Detail

async function openSaleDetail(saleId) {

    try {

        const response =
            await fetch(`/sales/${saleId}`);

        if (!response.ok) {
            throw new Error("Unable to load sale.");
        }

        const sale =
            await response.json();


        const saleDate =
            new Date(sale.sale_datetime);


        document.getElementById("detailInvoice").textContent =
            sale.invoice_no;

        document.getElementById("detailDate").textContent =
            saleDate.toLocaleDateString();

        document.getElementById("detailTime").textContent =
            saleDate.toLocaleTimeString();


        const itemsContainer =
            document.getElementById("detailItems");

        itemsContainer.innerHTML = "";


        sale.items.forEach(item => {

            const element =
                document.createElement("div");

            element.className = "receipt-item";

            element.innerHTML = `
                <div class="receipt-item-name">
                    ${item.product_name}
                </div>

                <div class="receipt-item-details">

                    <span>
                        ${item.quantity}
                        ×
                        ${item.unit_price.toLocaleString()}
                    </span>

                    <span>
                        ${item.line_total.toLocaleString()} MMK
                    </span>

                </div>
            `;

            itemsContainer.appendChild(element);
        });


        document.getElementById("detailSubtotal").textContent =
            sale.subtotal.toLocaleString() + " MMK";

        document.getElementById("detailDiscount").textContent =
            sale.discount.toLocaleString() + " MMK";

        document.getElementById("detailGrandTotal").textContent =
            sale.grand_total.toLocaleString() + " MMK";

        document.getElementById("detailPaid").textContent =
            sale.amount_paid.toLocaleString() + " MMK";

        document.getElementById("detailChange").textContent =
            sale.change_amount.toLocaleString() + " MMK";

        document.getElementById("detailPayment").textContent =
            sale.payment_method;


        document
            .getElementById("saleDetailModal")
            .classList.add("show");

    } catch (error) {

        console.error(error);

        alert("Unable to load sale details.");
    }
}

document
    .getElementById("closeDetailButton")
    .addEventListener("click", function () {

        document
            .getElementById("saleDetailModal")
            .classList.remove("show");
    });


document
    .getElementById("reprintButton")
    .addEventListener("click", function () {

        window.print();

    });


loadSalesHistory();