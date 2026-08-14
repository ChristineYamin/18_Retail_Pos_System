let stockProducts = [];
let selectedProduct = null;
let stockAction = "restock";
let selectedPriceProduct = null;

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
                <td colspan="7">
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

        let supplierName = "-";
let groupName = "-";

if (product.supplier_code === "YM") {
    supplierName = "ရတနာမွန်";
} else if (product.supplier_code === "LN") {
    supplierName = "လောကနတ်";
}

if (product.product_group_code === "RH") {
    groupName = "ရဟန်းဒွိစုံ";
} else if (product.product_group_code === "SH") {
    groupName = "ရှင်ဆောင်ဒွိစုံ";
} else if (product.product_group_code === "DK") {
    groupName = "ဒုကုဋ်";
}


        row.innerHTML = `
    <td>
        <strong>${product.product_id}</strong>
    </td>

    <td>
        ${product.product_name}
    </td>

    <td>
        ${supplierName}
    </td>

    <td>
        ${groupName}
    </td>

    <td>
        ${product.selling_price.toLocaleString()} MMK
    </td>

    <td>
        ${product.current_stock}
    </td>

    <td>
        <div class="stock-actions">

            <button class="restock-button">
                Restock
            </button>

            <button class="set-stock-button">
                Set Stock
            </button>

            <button class="edit-price-button">
                Edit Price
            </button>

        </div>
    </td>
`;
           


        row
            .querySelector(".restock-button")
            .addEventListener(
                "click",
                () => openRestockModal(product)
            );
        row
            .querySelector(".set-stock-button")
            .addEventListener(
                 "click",
                () => openSetStockModal(product)
            );
        row
            .querySelector(".edit-price-button")
            .addEventListener(
                "click",
                 () => openPriceModal(product)
            );
        


        container.appendChild(row);
    })
    ;
}


// ========================================
// OPEN RESTOCK MODAL
// ========================================

function openRestockModal(product) {

    selectedProduct = product;
    stockAction = "restock";

    document.getElementById("restockModalTitle").textContent =
        "Restock Product";

    document.getElementById("restockQuantityLabel").textContent =
        "Quantity to Add";

    document.getElementById("restockProductName").textContent =
        product.product_name;

    document.getElementById("restockCurrentStock").textContent =
        product.current_stock;

    document.getElementById("restockQuantity").value = "";

    document.getElementById("confirmRestockButton").textContent =
        "UPDATE";


    document
        .getElementById("restockModal")
        .classList.add("show");
}

function openSetStockModal(product) {

    selectedProduct = product;
    stockAction = "set";

    document.getElementById("restockModalTitle").textContent =
        "Set Stock";

    document.getElementById("restockQuantityLabel").textContent =
        "Actual Stock Quantity";

    document.getElementById("restockProductName").textContent =
        product.product_name;

    document.getElementById("restockCurrentStock").textContent =
        product.current_stock;

    document.getElementById("restockQuantity").value = "";

    document.getElementById("confirmRestockButton").textContent =
        "SET STOCK";


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

    const rawQuantity =
        document
            .getElementById("restockQuantity")
            .value
            .trim();

    if (rawQuantity === "") {
        alert("Please enter a quantity.");
        return;
    }

    const quantity = Number(rawQuantity);

    if (
        !Number.isInteger(quantity) ||
        quantity < 0 ||
        (stockAction === "restock" && quantity === 0)
    ) {
        alert("Please enter a valid quantity.");
        return;
    }

    const button =
        document.getElementById("confirmRestockButton");

    try {

        button.disabled = true;
        button.textContent = "Updating...";

        let endpoint;

        if (stockAction === "restock") {

            endpoint =
                "/products/" +
                selectedProduct.product_id +
                "/stock";

        } else {

            endpoint =
                "/products/" +
                selectedProduct.product_id +
                "/stock/set";
        }

        const response = await fetch(
            endpoint,
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

        const result = await response.json();

        if (!response.ok) {

            alert(
                result.detail ||
                "Unable to update stock."
            );

            return;
        }

        alert(
            result.product_name +
            "\n\nCurrent Stock: " +
            result.current_stock
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
// Add the price functions
// ========================================
function openPriceModal(product) {

    selectedPriceProduct = product;

    document.getElementById("priceProductName").textContent =
        product.product_name;

    document.getElementById("currentPrice").textContent =
        product.selling_price.toLocaleString() + " MMK";

    document.getElementById("newPrice").value =
        product.selling_price;

    document
        .getElementById("priceModal")
        .classList.add("show");
}


function closePriceModal() {

    selectedPriceProduct = null;

    document
        .getElementById("priceModal")
        .classList.remove("show");
}

async function updatePrice() {

    if (!selectedPriceProduct) {
        return;
    }

    const newPrice =
        Number(
            document.getElementById("newPrice").value
        );

    if (
        !Number.isInteger(newPrice) ||
        newPrice <= 0
    ) {

        alert("Please enter a valid price.");

        return;
    }

    const button =
        document.getElementById("savePriceButton");

    try {

        button.disabled = true;
        button.textContent = "Saving...";

        const endpoint =
            "/products/" +
            selectedPriceProduct.product_id +
            "/price";

        const response = await fetch(
            endpoint,
            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    selling_price: newPrice
                })
            }
        );

        const result =
            await response.json();

        if (!response.ok) {

            alert(
                result.detail ||
                "Unable to update price."
            );

            return;
        }

        alert(
            result.product_name +
            "\n\nNew Price: " +
            result.selling_price.toLocaleString() +
            " MMK"
        );

        closePriceModal();

        await loadStockProducts();

    } catch (error) {

        console.error(error);

        alert("Unable to update price.");

    } finally {

        button.disabled = false;
        button.textContent = "SAVE PRICE";
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

document
    .getElementById("savePriceButton")
    .addEventListener("click", updatePrice);

document
    .getElementById("cancelPriceButton")
    .addEventListener("click", closePriceModal);

// ========================================
// START
// ========================================

loadStockProducts();