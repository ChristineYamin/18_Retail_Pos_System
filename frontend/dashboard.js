// ========================================
// DASHBOARD ELEMENTS
// ========================================

const reportDateInput =
    document.getElementById("reportDate");

const viewReportButton =
    document.getElementById("viewReportButton");

const todayReportButton =
    document.getElementById("todayReportButton");

const weekReportButton =
    document.getElementById("weekReportButton");

const monthReportButton =
    document.getElementById("monthReportButton");


// ========================================
// DATE HELPERS
// ========================================

function formatDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function getLocalDateString() {

    return formatDate(
        new Date()
    );
}


// ========================================
// DISPLAY REPORT
// ========================================

function displayReport(
    summary,
    reportLabel
) {

    // ========================================
    // REPORT DATE / RANGE
    // ========================================

    document
        .getElementById("dashboardDate")
        .textContent =
            reportLabel;


    // ========================================
    // SALES SUMMARY
    // ========================================

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


    // ========================================
    // PAYMENT SUMMARY
    // ========================================

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


    // ========================================
    // TOP PRODUCTS
    // ========================================

    const topProductsContainer =
        document.getElementById(
            "topProducts"
        );

    topProductsContainer.innerHTML = "";


    if (
        summary.top_products.length === 0
    ) {

        topProductsContainer.innerHTML =
            "<p>No products sold during this period.</p>";

    } else {

        summary.top_products.forEach(
            (product, index) => {

                const row =
                    document.createElement(
                        "div"
                    );

                row.className =
                    "top-product-row";


                row.innerHTML = `
                    <div class="top-product-info">

                        <span class="top-product-rank">
                            ${index + 1}.
                        </span>

                        <div>

                            <strong>
                                ${product.product_name}
                            </strong>

                            <small>
                                ${product.product_id}
                            </small>

                        </div>

                    </div>


                    <div class="top-product-sales">

                        <strong>
                            ${product.quantity_sold} sold
                        </strong>

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


    // ========================================
    // RECENT TRANSACTIONS
    // ========================================

    const recentContainer =
        document.getElementById(
            "recentTransactionsBody"
        );

    recentContainer.innerHTML = "";


    if (
        summary.recent_transactions.length === 0
    ) {

        recentContainer.innerHTML = `
            <tr>

                <td colspan="5">
                    No transactions during this period.
                </td>

            </tr>
        `;

    } else {

        summary.recent_transactions.forEach(
            sale => {

                const saleDate =
                    new Date(
                        sale.sale_datetime
                    );


                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `
                    <td>

                        <strong>
                            ${sale.invoice_no}
                        </strong>

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


                recentContainer
                    .appendChild(row);
            }
        );
    }
}


// ========================================
// LOAD SINGLE DATE
// ========================================

async function loadSingleDateReport(
    reportDate
) {

    try {

        const response =
            await fetch(
                `/reports/by-date?report_date=${reportDate}`
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load report."
            );
        }


        const summary =
            await response.json();


        displayReport(
            summary,
            reportDate
        );


    } catch (error) {

        console.error(error);

        alert(
            "Unable to load sales report."
        );
    }
}


// ========================================
// LOAD DATE RANGE
// ========================================

async function loadRangeReport(
    startDate,
    endDate,
    label
) {

    try {

        const response =
            await fetch(
                `/reports/range?start_date=${startDate}&end_date=${endDate}`
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load range report."
            );
        }


        const summary =
            await response.json();


        displayReport(
            summary,
            label
        );


    } catch (error) {

        console.error(error);

        alert(
            "Unable to load sales report."
        );
    }
}


// ========================================
// VIEW SELECTED DATE
// ========================================

viewReportButton.addEventListener(
    "click",
    () => {

        const selectedDate =
            reportDateInput.value;


        if (!selectedDate) {

            alert(
                "Please select a date."
            );

            return;
        }


        loadSingleDateReport(
            selectedDate
        );
    }
);


// ========================================
// TODAY
// ========================================

todayReportButton.addEventListener(
    "click",
    () => {

        const today =
            getLocalDateString();


        reportDateInput.value =
            today;


        loadSingleDateReport(
            today
        );
    }
);


// ========================================
// THIS WEEK
// ========================================

weekReportButton.addEventListener(
    "click",
    () => {

        const today =
            new Date();


        const startOfWeek =
            new Date(today);


        const day =
            today.getDay();


        const difference =
            day === 0
                ? -6
                : 1 - day;


        startOfWeek.setDate(
            today.getDate()
            + difference
        );


        const startDate =
            formatDate(
                startOfWeek
            );


        const endDate =
            formatDate(
                today
            );


        loadRangeReport(
            startDate,
            endDate,
            `This Week: ${startDate} → ${endDate}`
        );
    }
);


// ========================================
// THIS MONTH
// ========================================

monthReportButton.addEventListener(
    "click",
    () => {

        const today =
            new Date();


        const startOfMonth =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );


        const startDate =
            formatDate(
                startOfMonth
            );


        const endDate =
            formatDate(
                today
            );


        loadRangeReport(
            startDate,
            endDate,
            `This Month: ${startDate} → ${endDate}`
        );
    }
);


// ========================================
// INITIAL LOAD
// ========================================

const today =
    getLocalDateString();


reportDateInput.value =
    today;


loadSingleDateReport(
    today
);