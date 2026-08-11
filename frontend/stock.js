let stockProducts = [];
let selectedProduct = null;


// ========================================
// LOAD PRODUCTS
// ========================================

async function loadStockProducts() {

    try {

        const response = await fetch("/products");

        if (!response.ok) {
            throw new Error("Unable to load products.");
        }

        stockProducts = await response.json();

        displayStockProducts(stockProducts);

    } catch (error) {

        console.error(error);

        document.getElementById("stockTableBody").innerHTML = `
            <tr>
                <td colspan="4">
                    Unable to load products.
                </td>
            </tr>
        `;
    }
}


// ========================================
// DISPLAY PRODUCTS
// ========================================

function displayStockProducts(products) {

    const container =
        document.getElementById("stockTableBody");

    container.innerHTML = "";


    products.forEach(product => {

        const row =
            document.createElement("tr");


        row.innerHTML = `
            <td>
                <strong>
                    ${product.product_name}
                </strong>
            </td>

            <td>
                ${product.selling_price.toLocaleString()} MMK
            </td>

            <td>
                ${product.current_stock}
            </td>

            <td>
                <button
                    class="restock-button"
                    data-id="${product.product_id}"
                >
                    Restock
                </button>
            </td>
        `;


        row
            .querySelector(".restock-button")
            .addEventListener(
                "click",
                () => openRestockModal(product)
            );


        container.appendChild(row);
    });
}


// ========================================
// OPEN RESTOCK MODAL
// ========================================

function openRestockModal(product) {

    selectedProduct = product;

    document.getElementById("restockProductName").textContent =
        product.product_name;

    document.getElementById("restockCurrentStock").textContent =
        product.current_stock;

    document.getElementById("restockQuantity").value = "";


    document
        .getElementById("restockModal")
        .classList.add("show");
}


// ========================================
// CLOSE MODAL
// ========================================

function closeRestockModal() {

    selectedProduct = null;

    document
        .getElementById("restockModal")
        .classList.remove("show");
}


// ========================================
// UPDATE STOCK
// ========================================

async function updateStock() {

    if (!selectedProduct) {
        return;
    }


    const quantity =
        Number(
            document.getElementById("restockQuantity").value
        );


    if (!quantity || quantity <= 0) {

        alert("Please enter a valid quantity.");

        return;
    }


    const button =
        document.getElementById("confirmRestockButton");


    try {

        button.disabled = true;
        button.textContent = "Updating...";


        const response = await fetch(
            `/products/${selectedProduct.product_id}/stock`,
            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    quantity: quantity
                })
            }
        );


        const result =
            await response.json();


        if (!response.ok) {

            alert(
                result.detail ||
                "Unable to update stock."
            );

            return;
        }


        alert(
            `${result.product_name}\n\n` +
            `New Stock: ${result.current_stock}`
        );


        closeRestockModal();

        await loadStockProducts();


    } catch (error) {

        console.error(error);

        alert("Unable to update stock.");

    } finally {

        button.disabled = false;
        button.textContent = "UPDATE";
    }
}


// ========================================
// SEARCH
// ========================================

document
    .getElementById("stockSearch")
    .addEventListener("input", function () {

        const search =
            this.value
                .trim()
                .toLowerCase();


        const filtered =
            stockProducts.filter(product =>
                product.product_name
                    .toLowerCase()
                    .includes(search)
            );


        displayStockProducts(filtered);
    });


// ========================================
// BUTTONS
// ========================================

document
    .getElementById("confirmRestockButton")
    .addEventListener("click", updateStock);


document
    .getElementById("cancelRestockButton")
    .addEventListener("click", closeRestockModal);


// Start
loadStockProducts();